#!/usr/bin/env python3
"""Vigila exportaciones IW39 y publica JSON en GitHub al detectar cambios estables."""
import argparse, logging, re, subprocess, sys, time
from pathlib import Path
PATTERN = re.compile(r"^IW39_OT_\d{4}-\d{2}(?:\(\d+\))?\.xlsx$", re.I)

def snapshot(folder):
    result = []
    for p in folder.iterdir():
        if p.is_file() and PATTERN.match(p.name):
            try:
                st = p.stat()
                result.append((p.name, st.st_size, st.st_mtime_ns))
            except OSError:
                pass
    return tuple(sorted(result))

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--historico',required=True)
    parser.add_argument('--repo',required=True)
    parser.add_argument('--intervalo',type=int,default=20,help='Segundos entre revisiones')
    parser.add_argument('--espera',type=int,default=30,help='Segundos sin cambios antes de procesar')
    parser.add_argument('--sin-publicar',action='store_true',help='Prueba local, no ejecuta git push')
    args=parser.parse_args()
    folder=Path(args.historico); repo=Path(args.repo)
    if not folder.is_dir() or not (repo/'dashboard_sap'/'app.js').is_file():
        parser.error('Revisa --historico y --repo: las rutas no existen o el repositorio no tiene dashboard_sap/app.js')
    logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(message)s',handlers=[logging.StreamHandler(sys.stdout),logging.FileHandler(repo/'monitor_iw39.log',encoding='utf-8')])
    logging.info('Vigilando %s',folder)
    last=None; stable_since=time.monotonic(); processed=None; last_attempt=0
    while True:
        try:
            current=snapshot(folder)
            now=time.monotonic()
            if current!=last:
                last=current;stable_since=now
                logging.info('Cambio detectado: %s archivo(s); esperando escritura completa',len(current))
            if current and current!=processed and now-stable_since>=args.espera and now-last_attempt>=60:
                last_attempt=now
                cmd=[sys.executable,str(Path(__file__).with_name('actualizar_dashboard_sap.py')),'--historico',str(folder),'--repo',str(repo)]
                if not args.sin_publicar:cmd.append('--publicar')
                logging.info('Procesando IW39 y %s...', 'publicando GitHub' if not args.sin_publicar else 'generando JSON local')
                result=subprocess.run(cmd,capture_output=True,text=True,encoding='utf-8',errors='replace')
                if result.stdout:logging.info(result.stdout.strip())
                if result.returncode==0:
                    processed=current
                    logging.info('Actualización completada')
                else:
                    logging.error('Falló actualización (código %s): %s',result.returncode,result.stderr.strip())
            time.sleep(max(5,args.intervalo))
        except KeyboardInterrupt:
            logging.info('Monitor detenido');return
        except Exception:
            logging.exception('Error temporal del monitor; reintentando')
            time.sleep(30)
if __name__=='__main__':main()
