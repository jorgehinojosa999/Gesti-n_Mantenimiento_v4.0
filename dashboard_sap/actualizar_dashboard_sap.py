#!/usr/bin/env python3
"""Actualiza los JSON IW39 del dashboard a partir de los Excel HISTORICO.
No conecta a SAP ni publica en GitHub salvo --publicar (requiere git configurado).
Requiere: pip install openpyxl
"""
import argparse
import json
import re
import subprocess
import sys
import time
from zipfile import BadZipFile
from datetime import datetime, date, timezone
from pathlib import Path
from openpyxl import load_workbook

NOMBRE_ARCHIVO = re.compile(r'^IW39_OT_(\d{4})-(\d{2})(?:\(\d+\))?\.xlsx$', re.I)
COLUMNAS = {'Orden', 'Status sistema', 'Cl.actividad PM', 'Clase de orden'}

def valor(v):
    if isinstance(v, (datetime, date)):
        return v.strftime('%Y-%m-%d')
    return v

def texto(v):
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()

def estado(status):
    s = texto(status).upper()
    return 'ORDEN CERRADA' if ('CTEC' in s.split() or 'CERRAD' in s) else 'ORDEN ABIERTA'

def main():
    ap = argparse.ArgumentParser(description='Excel IW39 HISTORICO → JSON del Dashboard SAP')
    ap.add_argument('--historico', required=True, help='Ruta de la carpeta HISTORICO de OneDrive')
    ap.add_argument('--repo', required=True, help='Ruta local de Gesti-n_Mantenimiento_v4.0')
    ap.add_argument('--publicar', action='store_true', help='Realizar git add/commit/push (requiere repositorio y permisos configurados)')
    ap.add_argument('--sin-publicar', action='store_true', help='Generar JSON solo localmente (opción para pruebas)')
    ap.add_argument('--exigir-mes', default='', help='Exige un mes YYYY-MM con órdenes válidas antes de reemplazar los JSON')
    args = ap.parse_args()
    if args.publicar and args.sin_publicar:
        ap.error('No puedes usar --publicar y --sin-publicar juntos')
    historico, repo = Path(args.historico).expanduser(), Path(args.repo).expanduser()
    if not historico.is_dir():
        sys.exit(f'ERROR: No existe la carpeta HISTORICO: {historico}')
    if not (repo / 'dashboard_sap' / 'app.js').is_file():
        sys.exit(f'ERROR: No se encontró dashboard_sap/app.js en {repo}')
    archivos = sorted((p for p in historico.iterdir() if p.is_file() and NOMBRE_ARCHIVO.match(p.name)), key=lambda p: p.name)
    if not archivos:
        sys.exit('ERROR: No se encontraron IW39_OT_YYYY-MM.xlsx en HISTORICO')
    # Priorizar el número de versión (8) frente a (3), no solo la fecha de modificación.
    por_mes = {}
    for p in archivos:
        m = NOMBRE_ARCHIVO.match(p.name)
        k = (m.group(1), m.group(2))
        version = int(re.search(r'\((\d+)\)\.xlsx$', p.name, re.I).group(1)) if re.search(r'\((\d+)\)\.xlsx$', p.name, re.I) else 0
        anterior = por_mes.get(k)
        version_anterior = (int(re.search(r'\((\d+)\)\.xlsx$', anterior.name, re.I).group(1)) if re.search(r'\((\d+)\)\.xlsx$', anterior.name, re.I) else 0) if anterior else -1
        if anterior is None or (version, p.stat().st_mtime) > (version_anterior, anterior.stat().st_mtime):
            por_mes[k] = p
    ordenes = {}
    lineas = {}
    total_filas = 0
    detalle_meses = []
    for periodo, ruta in sorted(por_mes.items()):
        print(f'Leyendo {ruta.name} ...', flush=True)
        libro = None
        # OneDrive, Excel o SAP pueden bloquear el archivo brevemente mientras se sincroniza.
        # Reintentamos sin alterar los archivos originales ni publicar datos incompletos.
        for intento in range(1, 7):
            try:
                libro = load_workbook(ruta, read_only=True, data_only=True)
                break
            except (PermissionError, OSError, BadZipFile, EOFError) as exc:
                if intento == 6:
                    sys.exit(f'ERROR: no se pudo leer {ruta.name} tras {intento} intentos: {exc}. No se modificaron los JSON. Cierra Excel y comprueba OneDrive.')
                print(f'  Archivo temporalmente inaccesible ({type(exc).__name__}); reintento {intento}/6 ...', flush=True)
                time.sleep(3)
        filas_mes = 0
        ordenes_mes = 0
        hoja = libro.active
        it = hoja.iter_rows(values_only=True)
        cab = next(it, None)
        if not cab:
            libro.close()
            continue
        headers = [texto(c) for c in cab]
        faltantes = COLUMNAS - set(headers)
        if faltantes:
            libro.close()
            sys.exit(f'ERROR en {ruta.name}: faltan columnas {sorted(faltantes)}')
        # La exportación tiene dos columnas llamadas Descripción; la primera es área y la segunda equipo.
        for fila in it:
            total_filas += 1
            filas_mes += 1
            raw = {h: valor(fila[i]) if i < len(fila) else None for i, h in enumerate(headers) if h and h != 'Descripción'}
            desc_indices = [i for i, h in enumerate(headers) if h == 'Descripción']
            area = texto(fila[desc_indices[0]]) if len(desc_indices) > 0 and desc_indices[0] < len(fila) else ''
            equipo_desc = texto(fila[desc_indices[1]]) if len(desc_indices) > 1 and desc_indices[1] < len(fila) else ''
            orden = texto(raw.get('Orden'))
            if not orden or not orden.replace('.', '', 1).isdigit():
                continue
            orden = orden.removesuffix('.0').lstrip('0') or '0'
            ordenes_mes += 1
            status = texto(raw.get('Status sistema'))
            reg = {
                'orden': orden,
                'descripcion_linea': area,
                'descripcion_equipo': equipo_desc,
                'descripcion_ubicacion': area,
                'ubicacion_tecnica': texto(raw.get('Ubicac.técnica')),
                'equipo': texto(raw.get('Equipo')),
                'texto_breve': texto(raw.get('Texto breve')),
                'Status sistema PLANNER': status,
                'estado_orden': estado(status),
                'Fecha ref.': raw.get('Fecha ref.'),
                'Clase de orden': texto(raw.get('Clase de orden')),
                'cl_actividad_pm': texto(raw.get('Cl.actividad PM')),
                'plan_mant_prev': texto(raw.get('Plan mant.prev.')),
                'total_costes_plan': raw.get('TotalCostesPlan'),
                'costes_totales_reales': raw.get('Cst.tot.reales'),
                'centro_coste': texto(raw.get('Centro coste')),
            }
            # Si una orden se repite entre meses, la última exportación prevalece.
            ordenes[orden] = reg
            if area:
                lineas[orden] = area
        libro.close()
        detalle_meses.append({'periodo': '-'.join(periodo), 'archivo': ruta.name, 'filas': filas_mes, 'ordenes_validas': ordenes_mes})
        print(f'  {periodo[0]}-{periodo[1]}: {ordenes_mes} órdenes válidas de {filas_mes} filas', flush=True)
    if args.exigir_mes:
        ok = any(m['periodo'] == args.exigir_mes and m['ordenes_validas'] > 0 for m in detalle_meses)
        if not ok:
            sys.exit(f'ERROR: Falta {args.exigir_mes} o no contiene órdenes válidas. NO se modificaron los JSON. Revisa HISTORICO.')
    if not ordenes:
        sys.exit('ERROR: No se encontraron órdenes válidas. No se modificaron los JSON.')
    data_dir = repo / 'data'
    data_dir.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')
    outputs = {
        'iw39_actividad_pm_planes.json': {'ultima_actualizacion': stamp, 'cantidad': len(ordenes), 'data': list(ordenes.values())},
        'iw39_lineas.json': {'ultima_actualizacion': stamp, 'cantidad': len(lineas), 'data': lineas},
    }
    for name, content in outputs.items():
        target = data_dir / name
        temp = target.with_name(target.name + '.tmp')
        with temp.open('w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, separators=(',', ':'), default=str)
        temp.replace(target)
        print(f'Generado: {target} ({content["cantidad"]} registros)')
    print(f'OK: {len(por_mes)} meses; {total_filas} filas; {len(ordenes)} órdenes únicas. Fecha: {stamp}')
    print('MESES PROCESADOS: ' + ', '.join(m['periodo'] for m in detalle_meses))
    print('NOTA: la gráfica se agrupa por Fecha ref. de cada orden, no por mes del archivo.')
    if args.publicar:
        if not (repo / '.git').exists():
            sys.exit('ERROR: --publicar requiere un repositorio Git local (.git). JSON ya generados.')
        subprocess.run(['git', '-C', str(repo), 'add', 'data/iw39_actividad_pm_planes.json', 'data/iw39_lineas.json'], check=True)
        changes = subprocess.run(['git', '-C', str(repo), 'diff', '--cached', '--quiet', '--', 'data/iw39_actividad_pm_planes.json', 'data/iw39_lineas.json'])
        if changes.returncode == 0:
            print('Sin cambios para publicar.')
        elif changes.returncode == 1:
            subprocess.run(['git', '-C', str(repo), 'commit', '-m', 'Actualizar IW39 Dashboard SAP', '--', 'data/iw39_actividad_pm_planes.json', 'data/iw39_lineas.json'], check=True)
            subprocess.run(['git', '-C', str(repo), 'push'], check=True)
            print('Publicado en GitHub. Espera el despliegue de GitHub Pages y pulsa Actualizar.')
        else:
            sys.exit('ERROR comprobando los cambios de Git.')

if __name__ == '__main__':
    main()
