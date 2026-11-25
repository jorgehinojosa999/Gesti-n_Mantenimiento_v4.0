"""Monitor persistente del directorio HISTORICO, actualiza JSON y publica GitHub al detectar cambios.
Instalar con INSTALAR_DESDE_CMD.py; requiere watchdog, openpyxl y Git configurado.
"""
import json, logging, os, re, subprocess, sys, time
from datetime import datetime
from pathlib import Path
from threading import Event
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

PATRON = re.compile(r'^IW39_OT_\d{4}-(?:0[1-9]|1[0-2])(?:\(\d+\))?\.xlsx$', re.I)

def firma(carpeta):
    encontrados=[]
    for p in carpeta.iterdir():
        if p.is_file() and PATRON.fullmatch(p.name):
            try:
                st=p.stat()
                encontrados.append((p.name,st.st_size,st.st_mtime_ns))
            except OSError:
                pass
    return tuple(sorted(encontrados))

class Eventos(FileSystemEventHandler):
    def __init__(self, señal): self.señal=señal
    def on_any_event(self, evento):
        if evento.is_directory: return
        rutas=[getattr(evento,'src_path',''),getattr(evento,'dest_path','')]
        if any(PATRON.fullmatch(Path(p).name) for p in rutas if p): self.señal.set()

def main():
    config=Path(__file__).with_name('config_iw39_eventos.json')
    cfg=json.loads(config.read_text(encoding='utf-8-sig'))
    repo=Path(cfg['repo']); historico=Path(cfg['historico']); carpeta=Path(__file__).parent
    logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(message)s', handlers=[logging.FileHandler(carpeta/'iw39_eventos.log',encoding='utf-8'),logging.StreamHandler(sys.stdout)])
    if not historico.is_dir(): raise RuntimeError(f'No existe HISTORICO: {historico}')
    script=repo/'dashboard_sap'/'actualizar_dashboard_sap.py'
    if not script.is_file(): raise RuntimeError(f'No existe el actualizador: {script}')
    marcador=carpeta/'ultima_firma_publicada.json'
    def ultima():
        try: return tuple(tuple(x) for x in json.loads(marcador.read_text(encoding='utf-8'))['firma'])
        except (OSError,ValueError,KeyError): return ()
    señal=Event(); handler=Eventos(señal)
    observador=Observer(); observador.schedule(handler,str(historico),recursive=False); observador.start()
    logging.info('Vigilando cambios en %s; repositorio %s',historico,repo)
    señal.set() # comprobar pendientes de la última sesión sin esperar un cambio
    try:
        while True:
            señal.wait(timeout=60) # respaldo para cambios OneDrive que no emiten eventos
            señal.clear()
            actual=firma(historico)
            if not actual or actual==ultima(): continue
            # Espera de estabilización: ningún tamaño o fecha cambia durante 12 segundos
            estable=False
            for _ in range(12):
                time.sleep(2)
                nuevo=firma(historico)
                if nuevo and nuevo==actual and all(x[1]>0 for x in nuevo):
                    if _>=5:
                        estable=True; break
                else:
                    actual=nuevo
            if not estable:
                logging.info('Archivos aún cambiando o incompletos. Se comprobarán otra vez.')
                señal.set(); time.sleep(5); continue
            if actual==ultima(): continue
            logging.info('Cambios IW39 detectados. Generando JSON y publicando en GitHub...')
            try:
                res=subprocess.run([sys.executable,str(script),'--historico',str(historico),'--repo',str(repo),'--publicar'],cwd=str(repo),capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=900)
                logging.info('Salida del actualizador:\n%s',res.stdout[-10000:])
                if res.returncode:
                    logging.error('No se publicó: código %s; %s',res.returncode,res.stderr[-4000:]); time.sleep(30); señal.set(); continue
                # No registrar como publicado si se modificó durante procesamiento
                if actual != firma(historico):
                    logging.warning('Cambió un Excel durante la actualización; se repetirá.'); señal.set(); continue
                temporal=marcador.with_suffix('.tmp')
                temporal.write_text(json.dumps({'firma':actual,'fecha':datetime.now().isoformat()}),encoding='utf-8')
                os.replace(temporal,marcador)
                logging.info('Actualización publicada correctamente.')
            except (subprocess.TimeoutExpired,OSError) as exc:
                logging.error('Actualización fallida: %s',exc);time.sleep(30);señal.set()
    finally:
        observador.stop();observador.join()

if __name__=='__main__':
    try: main()
    except Exception as exc:
        logging.exception('Error de monitor: %s',exc);sys.exit(1)
