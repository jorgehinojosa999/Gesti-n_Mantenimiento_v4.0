#!/usr/bin/env python3
"""Ejecución puntual para Programador de tareas: leer cambios IW39 y publicar.
No requiere proceso residente ni archivos BAT. Reintenta si Excel/OneDrive está ocupado.
"""
import argparse
import json
import logging
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

PAT = re.compile(r'^IW39_OT_(\d{4})-(\d{2})(?:\(\d+\))?\.xlsx$', re.I)


def firma(ruta):
    """Incluir también tamaño/mtime por archivo para detectar reemplazos mensuales."""
    salida = []
    for f in ruta.iterdir():
        if f.is_file() and PAT.match(f.name):
            st = f.stat()
            salida.append([f.name, st.st_size, st.st_mtime_ns])
    return sorted(salida)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', required=True)
    args = ap.parse_args()
    cfg = Path(args.config).resolve()
    with cfg.open(encoding='utf-8-sig') as fh:
        conf = json.load(fh)
    repo = Path(conf['repo']).expanduser()
    historico = Path(conf['historico']).expanduser()
    zona = Path(conf.get('estado_dir') or cfg.parent)
    zona.mkdir(parents=True, exist_ok=True)
    log = zona / 'iw39_automatico.log'
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s', handlers=[logging.FileHandler(log, encoding='utf-8'),logging.StreamHandler(sys.stdout)])
    marcador = zona / 'iw39_ultima_publicacion.json'
    bloqueo = zona / 'iw39_procesando.lock'
    if not repo.is_dir() or not (repo/'dashboard_sap'/'app.js').is_file():
        raise RuntimeError('No existe el repositorio con dashboard_sap/app.js: ' + str(repo))
    if not historico.is_dir():
        raise RuntimeError('No existe HISTORICO: ' + str(historico))
    try:
        # Evita doble ejecución; recupera bloqueo obsoleto (p. ej. apagón).
        fd = os.open(str(bloqueo), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
    except FileExistsError:
        if time.time() - bloqueo.stat().st_mtime > 30 * 60:
            logging.warning('Se recupera bloqueo de más de 30 minutos')
            bloqueo.unlink(missing_ok=True)
            return main()
        logging.info('Otra actualización en curso; omitiendo esta ejecución')
        return 0
    try:
        ahora = firma(historico)
        if not ahora:
            logging.warning('HISTORICO no tiene archivos IW39_OT_YYYY-MM.xlsx')
            return 1
        if any(x[1] == 0 for x in ahora):
            logging.warning('Existe un Excel con tamaño cero. Se reintentará en la próxima revisión')
            return 1
        anterior = None
        if marcador.exists():
            try:
                anterior = json.loads(marcador.read_text(encoding='utf-8'))['firma']
            except (KeyError, ValueError):
                pass
        if ahora == anterior:
            logging.info('Sin cambios en %s archivos. Publicación vigente.', len(ahora))
            return 0
        # Breve estabilidad: verificar que OneDrive terminó de escribir.
        time.sleep(8)
        despues = firma(historico)
        if ahora != despues:
            logging.info('OneDrive aún cambia archivos; reintento en la próxima ejecución')
            return 0
        logging.info('Cambio detectado en HISTORICO (%s archivos): ejecutando actualización + publicación',len(ahora))
        script = repo/'dashboard_sap'/'actualizar_dashboard_sap.py'
        cmd = [sys.executable, str(script), '--historico', str(historico), '--repo', str(repo), '--publicar']
        res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600)
        if res.stdout:
            logging.info(res.stdout[-14000:])
        if res.stderr:
            logging.warning(res.stderr[-8000:])
        if res.returncode != 0:
            logging.error('Falló la actualización o GitHub (código %s), reintentaremos', res.returncode)
            return res.returncode
        tmp=marcador.with_suffix('.tmp')
        tmp.write_text(json.dumps({'firma': ahora, 'actualizado': datetime.now(timezone.utc).isoformat()}, ensure_ascii=False),encoding='utf-8')
        tmp.replace(marcador)
        logging.info('Datos IW39 publicados. Si GitHub Pages está desplegado, los cambios estarán disponibles en el portal.')
        return 0
    finally:
        bloqueo.unlink(missing_ok=True)


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        sys.exit(1)
