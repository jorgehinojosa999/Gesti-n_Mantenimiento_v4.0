import json,zipfile,xml.etree.ElementTree as ET,glob,os,re,datetime,collections
ROOT='/mnt/data';NS={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
source=os.path.join(ROOT,'ordenes_sap(4).json')
with open(source,encoding='utf-8') as f: base=json.load(f)
original={str(r['orden']).strip():r for r in base['data']}
updated=dict(original); stats=[]
def read_xlsx(path):
 with zipfile.ZipFile(path) as z:
  ss=ET.fromstring(z.read('xl/sharedStrings.xml'))
  strings=[''.join(el.itertext()) for el in ss]
  xml=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
  for row in xml.findall('.//x:sheetData/x:row',NS):
   cells={}
   for c in row:
    m=re.match(r'[A-Z]+',c.get('r',''))
    if not m:continue
    v=c.find('x:v',NS)
    if v is None: continue
    value=v.text or ''
    if c.get('t')=='s':value=strings[int(value)]
    cells[m.group()]=value
   yield cells
def iso(v):
 if not v:return ''
 try:return (datetime.datetime(1899,12,30)+datetime.timedelta(days=float(v))).strftime('%Y-%m-%d')
 except:return str(v)
def num(v):
 try:return float(v)
 except:return 0.0
files=[]
for month in range(1,11):
 candidates=glob.glob(os.path.join(ROOT,f'IW39_OT_2026-{month:02d}(*).xlsx'))
 # latest uploaded suffix by month
 candidates=[p for p in candidates if re.search(r'\(\d+\)\.xlsx$',p)]
 files.append(max(candidates,key=lambda p:int(re.search(r'\((\d+)\)\.xlsx$',p).group(1))))
for path in files:
 count=0;new=0;changed=0
 for idx,c in enumerate(read_xlsx(path)):
  if idx==0:continue
  order=str(c.get('A','')).strip()
  if not order or not order.isdigit():continue
  status=c.get('H','').strip(); old=updated.get(order)
  item=dict(old) if old else {'orden':order,'fecha_iw47':'','texto_notificacion':''}
  closed=bool(re.search(r'\b(CTEC|CERR|LIQD)\b',status))
  open_=bool(re.search(r'\b(ABIE|LIBR|LIB\.)\b',status))
  state='ORDEN CERRADA' if closed else ('ORDEN ABIERTA' if open_ else 'REVISAR')
  item.update({'estado_orden':state,'estatus_sap':status,'status_sistema_planner':status,
   'total_costes_plan':num(c.get('W','')),'costes_totales_reales':num(c.get('AD','')),
   'fecha_ref':iso(c.get('K','')),'cl_actividad_pm':c.get('Z',''),
   'texto_breve':c.get('F',''),'clase_orden':c.get('Y','')})
  if old is None:new+=1
  elif any(old.get(k)!=item.get(k) for k in ('estado_orden','estatus_sap','total_costes_plan','costes_totales_reales','fecha_ref')):changed+=1
  updated[order]=item;count+=1
 stats.append((os.path.basename(path),count,new,changed))
base['data']=list(updated.values());base['cantidad_ordenes']=len(updated)
base['ultima_actualizacion']='26/10/2026 (consolidado IW39 enero-octubre)'
out=os.path.join(ROOT,'ordenes_sap_ACTUALIZADO_2026-10-26.json')
with open(out,'w',encoding='utf-8') as f:json.dump(base,f,ensure_ascii=False,separators=(',',':'))
print('ORIGINALES',len(original),'FINAL',len(updated),'NUEVAS',len(updated)-len(original));print(*stats,sep='\n');print('OUTPUT',out,os.path.getsize(out))
