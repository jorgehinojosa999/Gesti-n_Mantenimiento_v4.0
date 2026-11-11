# -*- coding: utf-8 -*-
"""Vigila Excel de Informance, consolida cambios y sirve portal SOLO en 127.0.0.1.
No publica archivos ni hace llamadas a GitHub. Python 3.9+; solo bibliotecas estándar.
"""
import argparse, collections, datetime as dt, hashlib, io, json, logging, os, re, sys, threading, time, zipfile, subprocess, secrets, calendar
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

BASE=Path(__file__).resolve().parent
ROOT=BASE/'portal'
CACHE=BASE/'cache_privada'; CACHE.mkdir(exist_ok=True)
OUT=CACHE/'resumen_actual.json'
ORIGEN=Path(os.environ.get('INFORMANCE_HISTORICOS',r'C:\Users\jhinojosa\OneDrive - Embotelladora la Mariposa,S.A\0000. Paquete_Informance\HISTORICOS'))
NS='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
# Valores aceptados: máquina física de Reason Lvl1, no sistemas de transporte ni uptime.
MAP={
'sopladora':'Sopladora','soplado':'Sopladora','sopladora-khs':'Sopladora','sopladora-kompass':'Sopladora',
'llenadora':'Llenadora','llenadora monoblock':'Llenadora','llenadora/carbonatador':'Llenadora',
'capper (tapadora)':'Tapadora','capper':'Tapadora','tapadora':'Tapadora','taponadora':'Tapadora',
'mezcladora':'Mezcladora','mezclador':'Mezcladora','mixer':'Mezcladora',
'etiquetadora':'Etiquetadora','termofijadora':'Termofijadora',
'paletizador':'Paletizador','paletizadora':'Paletizador',
'robopack':'Envolvedor','envolvedor':'Envolvedor','envolvedora':'Envolvedor',
'empaquetador':'Empaquetador','empaquetadora':'Empaquetador','empacadora':'Empaquetador',
'lavadora':'Lavadora','rinser':'Rinser','codificador':'Codificador',
'inspector/ codigo':'Inspector / codificador','inspector / codigo':'Inspector / codificador','inspector / codificador':'Inspector / codificador',
'encajonadora':'Encajonadora','desencajonadora':'Desencajonadora',
'elevador de tapas':'Elevador de tapas',
'rinse interno':'Rinser interno','rinse externo':'Rinser externo','rinser interno':'Rinser interno','rinser externo':'Rinser externo',
'visores vacias':'Visor de vacías','visor llenas':'Visor de llenas',
}
# 'Termo' deliberadamente pendiente de confirmar. No se asigna automáticamente.
import unicodedata
def normal(s): return ' '.join(''.join(c for c in unicodedata.normalize('NFD',str(s)) if not unicodedata.combining(c)).lower().split())

def strings(z):
    if 'xl/sharedStrings.xml' not in z.namelist():return []
    root=ET.fromstring(z.read('xl/sharedStrings.xml'))
    return [''.join(n.itertext()) for n in root.findall(NS+'si')]

def cell_value(c,st):
    v=c.find(NS+'v')
    if c.get('t')=='inlineStr':return ''.join(c.itertext())
    if v is None:return ''
    if c.get('t')=='s':
        try:return st[int(v.text)]
        except:return ''
    return v.text or ''

def col_index(cell):
    word=re.match(r'[A-Z]+',cell)
    if not word:return -1
    i=0
    for c in word.group():i=i*26+ord(c)-64
    return i-1

def parse_xlsx(path):
    result=collections.defaultdict(lambda:[0.0,0]);count=0;unmapped=collections.Counter()
    m=re.search(r'(202[56])[-_](0[1-9]|1[0-2])',path.stem)
    if not m:raise ValueError('El nombre debe contener AAAA-MM: '+path.name)
    period=m.group(1)+'-'+m.group(2)
    with zipfile.ZipFile(path) as z:
        st=strings(z)
        # Informance usa la hoja Data como segunda pestaña.
        target='xl/worksheets/sheet2.xml'
        if target not in z.namelist():raise ValueError('No se encontró la segunda hoja de eventos')
        with z.open(target) as f:
            context=ET.iterparse(f,events=('end',))
            header=None
            for event,elem in context:
                if elem.tag!=NS+'row':continue
                nr=int(elem.get('r','0'))
                if nr<3:elem.clear();continue
                vals={}
                for c in elem.findall(NS+'c'):
                    ind=col_index(c.get('r',''))
                    if ind>=0:vals[ind]=cell_value(c,st)
                if nr==3:
                    header={str(v):k for k,v in vals.items()}
                    missing={'Asset','Hours','Super Reason','Reason Lvl1'}-set(header)
                    if missing:raise ValueError('Columnas no encontradas: '+', '.join(sorted(missing)))
                elif header:
                    count+=1
                    super_reason=normal(vals.get(header['Super Reason'],''))
                    if super_reason!='paradas electromecanicas':elem.clear();continue
                    reason=str(vals.get(header['Reason Lvl1'],''))
                    equipo=MAP.get(normal(reason))
                    if not equipo:
                        unmapped[reason]+=1;elem.clear();continue
                    asset=str(vals.get(header['Asset'],'')).strip()
                    try:hours=float(vals.get(header['Hours'],0) or 0)
                    except (ValueError,TypeError):elem.clear();continue
                    if not asset or not 0<=hours<100000:elem.clear();continue
                    agg=result[(asset,equipo,period)];agg[0]+=hours;agg[1]+=1
                elem.clear()
    return {'rows':[{'Asset':a,'Equipo':e,'Periodo':p,'Horas':round(h,5),'Eventos':ev} for (a,e,p),(h,ev) in sorted(result.items())], 'total':count,'unmapped':dict(unmapped)}

lock=threading.Lock()
scan_lock=threading.Lock()
JOB_LOCK=threading.Lock()
JOB={'state':'idle','start':None,'finish':None,'range':None,'log':'','error':None}
CSRF_TOKEN=secrets.token_urlsafe(32)
AUTOMATIZADOR=Path(os.environ.get('INFORMANCE_SCRIPT_V14',str(ORIGEN.parent/'Informance_Todo_En_Uno_v14.py')))
CURRENT={'status':'iniciando','last_success':None,'files':0,'error':None,'version':1 if OUT.exists() else 0}

def atom_write(path,value):
    temp=path.with_suffix(path.suffix+'.tmp')
    temp.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    os.replace(temp,path)

def load_json(path):
    try:return json.loads(path.read_text(encoding='utf-8'))
    except:return None

def scan_once():
    with scan_lock:
        return scan_locked()

def scan_locked():
    if not ORIGEN.is_dir():raise FileNotFoundError('No existe HISTORICOS: '+str(ORIGEN))
    files=sorted(p for p in ORIGEN.glob('*.xlsx') if not p.name.startswith('~$'))
    if not files:raise FileNotFoundError('No hay Excel .xlsx en HISTORICOS')
    catalog={};totals=0;allrows=[];missing={};errors=[]
    for file in files:
        st=file.stat();sig=f'{file.resolve()}|{st.st_size}|{st.st_mtime_ns}'
        tag=hashlib.sha256(str(file.resolve()).encode()).hexdigest()[:20]
        cached=CACHE/(tag+'.json')
        prior=load_json(cached)
        if not prior or prior.get('signature')!=sig:
            # Copias de OneDrive pueden estar incompletas mientras se descargan.
            try:
                got=parse_xlsx(file)
                prior={'signature':sig,'data':got}
                atom_write(cached,prior)
                print('Actualizado:',file.name, 'registros:',got['total'],flush=True)
            except Exception as ex:
                errors.append(file.name+': '+str(ex))
                if not prior:continue
                print('Archivo no legible, conservando último resumen:',file.name,flush=True)
        got=prior['data'];totals+=got.get('total',0)
        allrows.extend(got['rows'])
        missing.update({file.name:got.get('unmapped',{})})
    # Idempotencia: archivos con el MISMO período son duplicados/versiones; elegir el más recientemente modificado.
    periods={}
    for file in files:
        m=re.search(r'(202[56])[-_](0[1-9]|1[0-2])',file.stem)
        if m:
            period=m.group(1)+'-'+m.group(2)
            if period not in periods or file.stat().st_mtime_ns>periods[period].stat().st_mtime_ns:periods[period]=file
    if len(periods)<len(files):
        allowed=set(periods)
        # La selección requiere reconstruir desde los archivos activos, evitando doble conteo de meses.
        allrows=[];totals=0
        for file in periods.values():
            tag=hashlib.sha256(str(file.resolve()).encode()).hexdigest()[:20]
            got=load_json(CACHE/(tag+'.json'))
            if got:
                allrows.extend(got['data']['rows']);totals+=got['data']['total']
    if not allrows:raise ValueError('No se extrajeron registros; se conserva la versión anterior')
    merged=collections.defaultdict(lambda:[0.0,0])
    for r in allrows:
        agg=merged[(r['Asset'],r['Equipo'],r['Periodo'])];agg[0]+=r['Horas'];agg[1]+=r['Eventos']
    data={'format':'informance_aggregate_v4','source_files':len(periods),'total_source_rows':totals,
          'rows':[{'Asset':a,'Equipo':e,'Periodo':p,'Horas':round(h,4),'Eventos':ev} for (a,e,p),(h,ev) in sorted(merged.items())],
          'available_periods':sorted(periods),'updated_at':dt.datetime.now(dt.timezone.utc).isoformat(),
          'warning':'Solo uso local. No publicar este archivo ni copiarlo al repositorio público.'}
    # Sólo escribir al cambiar el contenido significativo.
    earlier=load_json(OUT)
    if not earlier or earlier.get('rows')!=data['rows'] or earlier.get('source_files')!=data['source_files']:
        atom_write(OUT,data)
        with lock:CURRENT.update(version=CURRENT['version']+1,last_success=data['updated_at'])
        print('✓ Dashboard actualizado:',len(data['rows']),'grupos,',len(periods),'meses.',flush=True)
    with lock:CURRENT.update(status='activo',files=len(periods),error='; '.join(errors) if errors else None)

def watcher(seconds):
    while True:
        try:scan_once()
        except Exception as ex:
            with lock:CURRENT.update(status='error',error=str(ex))
            print('⚠',ex,flush=True)
        time.sleep(seconds)


def job_snapshot():
    with JOB_LOCK:
        return dict(JOB)

def ejecutar_descarga(desde, hasta, repetir):
    try:
        command=[sys.executable,'-u',str(AUTOMATIZADOR),'--desde',desde,'--hasta',hasta]
        if repetir: command.append('--repetir')
        with JOB_LOCK: JOB.update(state='running',start=dt.datetime.now(dt.timezone.utc).isoformat(),finish=None,range=f'{desde} a {hasta}',log='Ejecutando Informance V14...',error=None)
        # Proceso lanzado por el usuario desde su propio PC. Chrome puede pedir MFA.
        env=os.environ.copy();env['PYTHONUNBUFFERED']='1'
        flags=getattr(subprocess,'CREATE_NO_WINDOW',0) if os.name=='nt' else 0
        proc=subprocess.Popen(command,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace',bufsize=1,env=env,creationflags=flags)
        collected=[]
        for line in proc.stdout:
            # Mostrar estado técnico sin exponer mensajes de autenticación completos.
            line=line.rstrip()
            if len(line)>400:line=line[:400]+'...'
            # Nunca devolver volcados o contenidos de credenciales al navegador.
            if any(w in line.lower() for w in ('password','contraseña','token=','authorization:','cookie:')):line='[Mensaje de autenticación omitido]'
            collected.append(line)
            collected=collected[-25:]
            with JOB_LOCK: JOB['log']='\n'.join(collected)[-5000:]
        exit_code=proc.wait()
        # Independientemente del resultado, verificar archivos nuevos válidos.
        try: scan_once()
        except Exception as exc:
            with JOB_LOCK: JOB['error']='Actualización del resumen: '+str(exc)[:250]
        with JOB_LOCK:
            JOB['state']='done' if exit_code==0 else 'error'
            JOB['finish']=dt.datetime.now(dt.timezone.utc).isoformat()
            if exit_code!=0: JOB['error']='La descarga V14 terminó con código '+str(exit_code)+'. Revisa el mensaje de estado.'
    except Exception as exc:
        with JOB_LOCK: JOB.update(state='error',error=str(exc)[:500],finish=dt.datetime.now(dt.timezone.utc).isoformat())

def valid_month(s):
    if not re.fullmatch(r'202[56]-(0[1-9]|1[0-2])',s or ''):return False
    return True

class Handler(SimpleHTTPRequestHandler):
    def valid_host(self):
        return self.headers.get('Host','').split(':')[0].lower() in ('127.0.0.1','localhost')
    def valid_origin(self):
        origin=self.headers.get('Origin','')
        return origin in ('http://127.0.0.1:'+str(self.server.server_port),'http://localhost:'+str(self.server.server_port))
    def do_POST(self):
        if not self.valid_host():return self.json_response({'error':'Host no autorizado'},403)
        if urlparse(self.path).path!='/api/descargar':return self.json_response({'error':'Ruta no permitida'},404)
        if not self.valid_origin():return self.json_response({'error':'Solo se permite ejecutar desde el portal local'},403)
        if self.headers.get('X-Informance-CSRF')!=CSRF_TOKEN:return self.json_response({'error':'Sesión inválida'},403)
        if 'application/json' not in self.headers.get('Content-Type',''):return self.json_response({'error':'Se necesita JSON'},415)
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<2 or length>1500:raise ValueError('Petición demasiado grande')
            req=json.loads(self.rfile.read(length).decode('utf-8'))
            desde=req.get('desde','');hasta=req.get('hasta','')
            if not valid_month(desde) or not valid_month(hasta) or desde>hasta:raise ValueError('Rango de meses inválido')
            if (int(hasta[:4])-int(desde[:4]))*12+int(hasta[-2:])-int(desde[-2:])>23:raise ValueError('Máximo 24 meses por ejecución')
            repetir=req.get('repetir',False)
            if not isinstance(repetir,bool):raise ValueError('Parámetro repetir incorrecto')
            if not AUTOMATIZADOR.is_file():return self.json_response({'error':'No se encuentra V14 en '+str(AUTOMATIZADOR)},409)
            with JOB_LOCK:
                if JOB['state']=='running':return self.json_response({'error':'Ya hay una descarga en ejecución'},409)
                JOB['state']='running'
            threading.Thread(target=ejecutar_descarga,args=(desde,hasta,repetir),daemon=True).start()
            return self.json_response({'accepted':True,'message':'Descarga de Informance iniciada'},202)
        except (ValueError,UnicodeError,json.JSONDecodeError) as exc:return self.json_response({'error':str(exc)},400)
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_GET(self):
        if not self.valid_host():return self.json_response({'error':'Host no autorizado'},403)
        path=urlparse(self.path).path
        if path=='/api/token':return self.json_response({'token':CSRF_TOKEN})
        if path=='/api/descarga_estado':return self.json_response(job_snapshot())
        if path=='/api/resumen':
            if not OUT.exists():return self.json_response({'error':'Aún no hay datos válidos'},503)
            body=OUT.read_bytes();return self.send_body(body,'application/json; charset=utf-8')
        if path=='/api/estado':
            with lock:data=dict(CURRENT)
            return self.json_response(data)
        return super().do_GET()
    def json_response(self,data,status=200):
        body=json.dumps(data,ensure_ascii=False).encode();return self.send_body(body,'application/json; charset=utf-8',status)
    def send_body(self,data,content_type,status=200):
        self.send_response(status);self.send_header('Content-Type',content_type)
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer');self.send_header('Content-Security-Policy',"frame-ancestors 'none'")
        self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def end_headers(self):
        self.send_header('X-Frame-Options','DENY');super().end_headers()

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--port',type=int,default=8765);a.add_argument('--intervalo',type=int,default=20);a.add_argument('--una-vez',action='store_true');args=a.parse_args()
    if args.una_vez:scan_once();print('Generado:',OUT);sys.exit(0)
    thread=threading.Thread(target=watcher,args=(max(10,args.intervalo),),daemon=True);thread.start()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print('Informance AUTO: http://127.0.0.1:%s/informance_3d_2025_2026/'%args.port,flush=True)
    print('Leyendo HISTORICOS:',ORIGEN,flush=True)
    print('Script V14:',AUTOMATIZADOR,flush=True)
    print('Privado: solo accesible desde este PC. Deja abierta esta ventana.',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:print('\nFinalizado.')
