"""Servidor local IW39: solo ejecuta un VBS preconfigurado, con token temporal."""
import json, os, secrets, subprocess, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST='127.0.0.1'; PORT=8765
ORIGIN='https://jorgehinojosa999.github.io'
TOKEN=secrets.token_urlsafe(24)
VBS=Path(os.environ.get('IW39_VBS','')).expanduser() if os.environ.get('IW39_VBS') else None
state={'state':'idle','error':'','started':None,'finished':None}
lock=threading.Lock()

def run_job():
    try:
        with lock:state.update(state='running',error='',started=time.time(),finished=None)
        proc=subprocess.run(['cscript.exe','//nologo',str(VBS)],cwd=str(VBS.parent),timeout=3*60*60,check=False)
        with lock:state.update(state='success' if proc.returncode==0 else 'error',error='' if proc.returncode==0 else f'El VBS terminó con código {proc.returncode}. Verifica la publicación en GitHub.',finished=time.time())
    except Exception as e:
        with lock:state.update(state='error',error=str(e),finished=time.time())

class Handler(BaseHTTPRequestHandler):
    def log_message(self,format,*args):print('[IW39]',format%args)
    def headers_json(self,code):
        self.send_response(code)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.send_header('Access-Control-Allow-Origin',ORIGIN)
        self.send_header('Vary','Origin')
        self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers','X-IW39-Token, Content-Type')
        self.end_headers()
    def send_json(self,code,obj):self.headers_json(code);self.wfile.write(json.dumps(obj).encode('utf-8'))
    def allowed(self):return self.headers.get('Origin')==ORIGIN
    def auth(self):return secrets.compare_digest(self.headers.get('X-IW39-Token',''),TOKEN)
    def do_OPTIONS(self):
        if not self.allowed():self.send_json(403,{'error':'Origen no permitido'});return
        self.headers_json(204)
    def do_GET(self):
        if not self.allowed():self.send_json(403,{'error':'Origen no permitido'});return
        if not self.auth():self.send_json(401,{'error':'Falta autorización'});return
        if self.path=='/health':self.send_json(200,{'ok':True,'ready':bool(VBS and VBS.is_file())});return
        if self.path=='/status':
            with lock:s=state.copy()
            self.send_json(200,s);return
        self.send_json(404,{'error':'Ruta no encontrada'})
    def do_POST(self):
        if not self.allowed():self.send_json(403,{'error':'Origen no permitido'});return
        if not self.auth():self.send_json(401,{'error':'Falta autorización'});return
        if self.path!='/run':self.send_json(404,{'error':'Ruta no encontrada'});return
        if not VBS or not VBS.is_file():self.send_json(400,{'error':'Configura IW39_VBS con la ruta del ejecutador VBS'});return
        with lock:
            if state['state']=='running':self.send_json(409,{'error':'Ya hay una actualización IW39 en curso'});return
            state['state']='running'
        threading.Thread(target=run_job,daemon=True).start()
        self.send_json(202,{'state':'running'})

if __name__=='__main__':
    print('Servicio local IW39:',f'http://{HOST}:{PORT}')
    print('Ruta VBS:',VBS or '(NO CONFIGURADA)')
    print('CODIGO DE AUTORIZACION:',TOKEN)
    print('Deja esta ventana abierta. Cierra con Ctrl+C.')
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
