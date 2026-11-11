'use strict';
/* Módulo Informance 2025–2026. Procesamiento local: los archivos no se transmiten. */
const FIELDS = ['Asset','Logical Date','Shift','Start Time','End Time','Seconds','Minutes','Hours','Start Cycles','Start Unit','End Cycles','End Unit','Actual Start/End Ratio','Listed Start/End Ratio','Super Reason','Reason Lvl1','Reason Lvl2'];
const MONTHS = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MACHINES = [
 {id:'sopladora',name:'Sopladora',desc:'Horno de preformas y módulo de soplado PET',img:'sopladora.webp',icon:'♧',h25:112,h26:86,e25:72,e26:60,aliases:['sopladora','soplado','blow molding','blowmolder','blow molder','blower','preforma','sbo','sfr']},
 {id:'mezcladora',name:'Mezcladora',desc:'Bombas, depósitos y preparación de bebida',img:'mezcladora.webp',icon:'♧',h25:72,h26:67,e25:25,e26:23,aliases:['mezcladora','mezclador','mezcla','mixer','mixing','jarabe','dosificador','blending']},
 {id:'llenadora',name:'Llenadora',desc:'Carrusel, válvulas de llenado y sensores',img:'llenadora.webp',icon:'◈',h25:206,h26:230,e25:103,e26:120,aliases:['llenadora','llenado','filler','filling']},
 {id:'tapadora',name:'Tapadora',desc:'Orientación y colocación de tapas',img:'tapadora.webp',icon:'▥',h25:56,h26:45,e25:46,e26:35,aliases:['tapadora','tapado','taponadora','capper','capping','tapas']},
 {id:'secador',name:'Secador de botellas',desc:'Aire de secado y tratamiento exterior',img:'secador.webp',icon:'≋',h25:38,h26:32,e25:18,e26:16,aliases:['secador','secado','air knife','drying','dryer']},
 {id:'etiquetadora',name:'Etiquetadora',desc:'Aplicación, rodillos y alimentación de etiquetas',img:'etiquetadora.webp',icon:'◇',h25:92,h26:61,e25:65,e26:44,aliases:['etiquetadora','etiquetado','labeler','labeller','labeling','etiqueta']},
 {id:'termofijadora',name:'Termofijadora',desc:'Túnel térmico de empaques',img:'termofijadora.webp',icon:'♨',h25:72,h26:62,e25:42,e26:34,aliases:['termofijadora','termo fijadora','termocontraible','termoencogible','shrink tunnel','horno retraccion','tunel calor','tunel termico']},
 {id:'divisor',name:'Divisor de paquetes',desc:'Guías de agrupación y transferencia',img:'divisor.webp',icon:'▧',h25:18,h26:14,e25:11,e26:8,aliases:['divisor','division paquetes','dividing','package divider','separador de paquetes','agrupador']},
 {id:'paletizador',name:'Paletizador',desc:'Manipulación, formación y apilado de pallets',img:'paletizador.webp',icon:'▤',h25:235,h26:13,e25:75,e26:10,aliases:['paletizador','paletizado','palletizer','palletiser','palletizing','paletizadora']},
 {id:'envolvedor',name:'Envolvedor',desc:'Aplicación de película de stretch',img:'envolvedor.webp',icon:'▣',h25:54,h26:48,e25:29,e26:24,aliases:['envolvedor','envoltura','enfardador','envolvedora','stretchwrapper','stretch wrapper','wrapping','fardos']},
 {id:'empaquetador',name:'Empaquetador',desc:'Formación y empaque de unidades',img:'empaquetador.svg',icon:'▧',h25:28,h26:18,e25:23,e26:16,aliases:[]},
 {id:'lavadora',name:'Lavadora',desc:'Lavado y enjuague de botellas',img:'lavadora.svg',icon:'◉',h25:24,h26:14,e25:18,e26:12,aliases:[]},
 {id:'rinser',name:'Rinser',desc:'Enjuague rotativo de botellas',img:'rinser.svg',icon:'◉',h25:19,h26:13,e25:13,e26:11,aliases:[]},
 {id:'codificador',name:'Codificador',desc:'Impresión de lote y fecha en los envases',img:'codificador.svg',icon:'⌗',h25:11,h26:8,e25:10,e26:8,aliases:[]},
 {id:'inspector',name:'Inspector / codificador',desc:'Inspección de calidad y codificación',img:'inspector.svg',icon:'◎',h25:13,h26:9,e25:11,e26:9,aliases:[]},
 {id:'encajonadora',name:'Encajonadora',desc:'Carga automática de envases en cajas',img:'encajonadora.svg',icon:'▤',h25:13,h26:9,e25:9,e26:7,aliases:[]},
 {id:'visorllenas',name:'Visor de llenas',desc:'Inspección de botellas llenas',img:'visorllenas.svg',icon:'◎',h25:6,h26:3,e25:8,e26:5,aliases:[]},
 {id:'visorvacias',name:'Visor de vacías',desc:'Inspección de botellas vacías',img:'visorvacias.svg',icon:'◎',h25:5,h26:3,e25:7,e26:4,aliases:[]},
 {id:'desencajonadora',name:'Desencajonadora',desc:'Retira botellas de cajas retornables',img:'desencajonadora.svg',icon:'▤',h25:0,h26:0,e25:0,e26:0,aliases:[]},
 {id:'elevadortapas',name:'Elevador de tapas',desc:'Alimentación de tapas al sistema de tapado',img:'elevadortapas.svg',icon:'▤',h25:0,h26:0,e25:0,e26:0,aliases:[]},
 {id:'rinserinterno',name:'Rinser interno',desc:'Enjuague interno de botellones',img:'rinser.svg',icon:'◉',h25:0,h26:0,e25:0,e26:0,aliases:[]},
 {id:'rinserexterno',name:'Rinser externo',desc:'Enjuague exterior de botellones',img:'rinser.svg',icon:'◉',h25:0,h26:0,e25:0,e26:0,aliases:[]},

];
const $ = id => document.getElementById(id);
const fmt = (n,dec=1) => Number(n).toLocaleString('es-EC',{minimumFractionDigits:0,maximumFractionDigits:dec});
const clean = v => String(v??'').trim();
const normalize = s => clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const safe = s => String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

// Inventario por línea: únicamente equipos físicos identificados mediante Reason Lvl1.
// No inferir equipos por Reason Lvl2 ni por el nombre de Asset.
const REASON_EQUIPOS = Object.freeze({
 'sopladora':'sopladora','sopladora-khs':'sopladora','sopladora-kompass':'sopladora','soplado':'sopladora',
 'llenadora':'llenadora','llenadora monoblock':'llenadora','llenadora/carbonatador':'llenadora',
 'mezclador':'mezcladora','mezcladora':'mezcladora','mixer':'mezcladora',
 'tapadora':'tapadora','taponadora':'tapadora','capper':'tapadora','capper (tapadora)':'tapadora',
 'secador de botellas':'secador','secador':'secador',
 'etiquetadora':'etiquetadora','termofijadora':'termofijadora',
 'divisor de paquetes':'divisor','paletizador':'paletizador','paletizadora':'paletizador',
 'envolvedor':'envolvedor','envolvedora':'envolvedor',
 'empaquetador':'empaquetador','empaquetadora':'empaquetador',
 'lavadora':'lavadora','rinser':'rinser','codificador':'codificador',
 'inspector/ codigo':'inspector','inspector / codigo':'inspector',
 'encajonadora':'encajonadora','desencajonadora':'desencajonadora','elevador de tapas':'elevadortapas',
 'rinse interno':'rinserinterno','rinse externo':'rinserexterno','rinser interno':'rinserinterno','rinser externo':'rinserexterno',
 'inspector de botellas llenas':'visorllenas','inspector de botellas vacias':'visorvacias','visor llenas':'visorllenas','visores vacias':'visorvacias',
 'inspector/ codigo':'inspector','inspector / codificador':'inspector','empaquetadora':'empaquetador', 'envolvedora':'envolvedor'
});
const FLOW_ORDER=['sopladora','desencajonadora','lavadora','visorvacias','rinser','rinserinterno','rinserexterno','mezcladora','llenadora','elevadortapas','tapadora','secador','visorllenas','inspector','codificador','etiquetadora','termofijadora','empaquetador','encajonadora','divisor','paletizador','envolvedor'];
function readCatalog(){try{const val=JSON.parse(localStorage.getItem('informance_catalog_v3')||'{}');return typeof val==='object'&&val&&!Array.isArray(val)?val:{};}catch{return {};}}
function catalogKey(asset){return normalize(asset||'');}
function getVisibleMachines(){
 const asset=$('assetFilter')?.value||'';
 const detected=new Set();
 for(const r of state.rows){if(asset&&clean(r.raw.Asset)!==asset)continue;const id=machineId(r);if(id)detected.add(id);}
 const overrides=asset?state.catalogOverrides[catalogKey(asset)]||{}:{};
 for(const [id,enabled] of Object.entries(overrides)){if(enabled)detected.add(id);else detected.delete(id);}
 return FLOW_ORDER.map(id=>MACHINES.find(m=>m.id===id)).filter(m=>m&&detected.has(m.id));
}
function keepSelection(visible){if(!visible.some(m=>m.id===state.selected))state.selected=visible[0]?.id||'';}
function updateMachineSelect(visible){const select=$('machineSelect');select.replaceChildren();for(const m of visible)select.add(new Option(m.name,m.id));if(visible.length)select.value=state.selected;else select.add(new Option('Sin equipos identificados',''));}
function updateCatalogPanel(){
 const asset=$('assetFilter').value,btn=$('catalogButton');btn.disabled=!asset;
 $('catalogNotice').textContent=asset?'La línea '+asset+' muestra equipos detectados en los históricos de 2025–2026. Puedes añadir o esconder equipos físicamente instalados. La configuración queda en este navegador.':'Selecciona un Asset concreto para ajustar su inventario.';
 const area=$('catalogList');area.replaceChildren();if(!asset)return;
 const found=new Set(state.rows.filter(r=>clean(r.raw.Asset)===asset).map(machineId).filter(Boolean)),override=state.catalogOverrides[catalogKey(asset)]||{};
 for(const m of FLOW_ORDER.map(id=>MACHINES.find(x=>x.id===id)).filter(Boolean)){
  const label=document.createElement('label');label.className='catalog-choice';const c=document.createElement('input');c.type='checkbox';c.checked=override[m.id]===undefined?found.has(m.id):override[m.id];
  const span=document.createElement('span');span.textContent=m.name;const hint=document.createElement('small');hint.textContent=found.has(m.id)?'Identificado en Reason Lvl1':'Sin eventos identificados';
  c.addEventListener('change',()=>{const key=catalogKey(asset);state.catalogOverrides[key]??={};state.catalogOverrides[key][m.id]=c.checked;localStorage.setItem('informance_catalog_v3',JSON.stringify(state.catalogOverrides));render();});
  label.append(c,span,hint);area.append(label);
 }
}

const state={rows:[],keys:new Set(),demo:true,summaryMode:false,selected:'llenadora',mode:'hours',files:0,manual:new Map(),filtered:[],hasBoth:false,rawHasBoth:false,monthsCommon:[],unassigned:0,view3d:true,catalogOverrides:readCatalog()};
function number(v){if(typeof v==='number')return Number.isFinite(v)?v:null;let s=clean(v).replace(/\s/g,'');if(!s)return null;if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else if(s.includes(','))s=s.replace(',','.');let n=Number(s);return Number.isFinite(n)?n:null;}
function dateParts(v){
 if(v instanceof Date && !isNaN(v)){return [v.getFullYear(),v.getMonth()+1,v.getDate()];}
 if(typeof v==='number' && window.XLSX){let x=XLSX.SSF.parse_date_code(v);if(x)return [x.y,x.m,x.d];}
 const s=clean(v);if(!s)return null;
 let m=s.match(/^(20\d{2})[-/]([01]?\d)[-/]([0-3]?\d)/);if(m)return [+m[1],+m[2],+m[3]];
 m=s.match(/^([0-3]?\d)[/.-]([0-3]?\d)[/.-](20\d{2})/);
 if(m){let a=+m[1],b=+m[2],format=$('dateFormat').value,mon,day;if(a>12){day=a;mon=b;}else if(b>12){mon=a;day=b;}else if(format==='dmy'){day=a;mon=b;}else{mon=a;day=b;}return [+m[3],mon,day];}
 if(/^\d{5}(?:\.\d+)?$/.test(s)&&window.XLSX){let x=XLSX.SSF.parse_date_code(Number(s));if(x)return [x.y,x.m,x.d];}return null;
}
function timeMinutes(v){if(v instanceof Date&&!isNaN(v))return v.getHours()*60+v.getMinutes();if(typeof v==='number'){if(v>=0&&v<1)return Math.round(v*1440)%1440;return null;}let m=clean(v).match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);if(!m)return null;let h=+m[1];if(m[3])h=(h%12)+(m[3].toUpperCase()==='PM'?12:0);return h*60 + +m[2];}
function demoRows(){
 const demoLines=[
  {asset:'SIPA 16 · PET (ejemplo)',machines:['sopladora','mezcladora','llenadora','tapadora','secador','etiquetadora','termofijadora','divisor','paletizador','envolvedor']},
  {asset:'Carvallo · Vidrio (ejemplo)',machines:['lavadora','rinser','llenadora','tapadora','visorvacias','visorllenas','etiquetadora','encajonadora','paletizador']},
  {asset:'Botellón (ejemplo)',machines:['lavadora','rinser','llenadora','tapadora','codificador','etiquetadora','paletizador']}
 ];
 const rows=[],weights=[1,.8,1.15,.95,1.1,1.25,.91,1.2,1.05,.9,.8,.68],sumW=weights.reduce((a,b)=>a+b,0);
 for(const line of demoLines)for(const year of [2025,2026])for(const id of line.machines){
  const m=MACHINES.find(x=>x.id===id);let h=year===2025?m.h25:m.h26;let ev=year===2025?m.e25:m.e26;
  if(line.asset.startsWith('Carvallo')){h*=.71;ev=Math.max(8,Math.round(ev*.65));}
  if(line.asset.startsWith('Botellón')){h*=.41;ev=Math.max(6,Math.round(ev*.43));}
  for(let i=0;i<12;i++){
   const n=Math.floor(ev/12)+(i<ev%12?1:0);if(!n)continue;
   for(let k=0;k<n;k++){
    const hours=h*weights[i]/sumW/n,raw=Object.fromEntries(FIELDS.map(c=>[c,'']));
    Object.assign(raw,{'Asset':line.asset,'Logical Date':`${year}-${String(i+1).padStart(2,'0')}-${String(3+(k*3)%24).padStart(2,'0')}`,
     'Shift':String(1+(k+i)%3),'Start Time':'09:00','End Time':'10:00','Hours':String(hours),
     'Seconds':String(hours*3600),'Minutes':String(hours*60),'Start Cycles':String(140+k*13),'Start Unit':'Ciclos',
     'End Cycles':String(165+k*13),'End Unit':'Ciclos','Actual Start/End Ratio':'0.98','Listed Start/End Ratio':'1',
     'Super Reason':'Paradas Electromecánicas','Reason Lvl1':m.name,'Reason Lvl2':['Sensores','Transmisión','Mecánico'][(k+i)%3]});
    const r=convert(raw,'Modo demostración',true);if(r)rows.push(r);
   }
  }
 }
 return rows;
}
function convert(raw,source,isDemo=false){let d=dateParts(raw['Logical Date']);if(!d||![2025,2026].includes(d[0])||d[1]<1||d[1]>12||d[2]<1||d[2]>31)return null;let hours=number(raw.Hours);if(hours===null){let mins=number(raw.Minutes),sec=number(raw.Seconds);hours=mins!==null?mins/60:sec!==null?sec/3600:0;}if(hours<0||!Number.isFinite(hours))return null;let nums={};for(let k of ['Seconds','Minutes','Hours','Start Cycles','End Cycles','Actual Start/End Ratio','Listed Start/End Ratio'])nums[k]=number(raw[k]);return{raw,year:d[0],month:d[1],day:d[2],hours,nums,source,isDemo,start:timeMinutes(raw['Start Time']),end:timeMinutes(raw['End Time'])};}
function matrixToRows(matrix,filename){let ix=matrix.findIndex(r=>Array.isArray(r)&&r.map(x=>normalize(x)).includes('asset')&&r.map(x=>normalize(x)).includes('logical date'));if(ix===-1)throw new Error(filename+': no aparecen las columnas Asset y Logical Date.');let headers=matrix[ix].map(x=>clean(x));let map=new Map(headers.map((h,i)=>[normalize(h),i]));let missing=FIELDS.filter(f=>!map.has(normalize(f)));if(missing.length>6)throw new Error(filename+': faltan demasiadas columnas de Informance ('+missing.slice(0,4).join(', ')+').');let records=[];for(let i=ix+1;i<matrix.length;i++){let line=matrix[i];if(!line||!line.length)continue;let raw={};for(let f of FIELDS)raw[f]=line[map.get(normalize(f))]??'';let r=convert(raw,filename);if(r)records.push(r);}return records;}
function csvRows(text){let first=(text.split(/\r?\n/)[0]||'').replace(/^\ufeff/,'');let sep=first.split(';').length>first.split(',').length?';':',';let rows=[],r=[],value='',quote=false;for(let i=0;i<text.length;i++){let ch=text[i];if(quote){if(ch==='"'&&text[i+1]==='"'){value+='"';i++;}else if(ch==='"')quote=false;else value+=ch;}else if(ch==='"'){quote=true;}else if(ch===sep){r.push(value);value='';}else if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;r.push(value);if(r.some(x=>clean(x)!==''))rows.push(r);r=[];value='';}else value+=ch;}r.push(value);if(r.some(x=>clean(x)!==''))rows.push(r);return rows;}
let sheetJSLoader = null;
function loadSheetJS(){
  if(window.XLSX) return Promise.resolve();
  if(sheetJSLoader) return sheetJSLoader;
  sheetJSLoader = new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.async=true;
    const timeout=setTimeout(()=>{script.remove();reject(new Error('No se pudo cargar la biblioteca Excel. Revisa tu conexión o utiliza CSV.'));},15000);
    script.onload=()=>{clearTimeout(timeout);window.XLSX?resolve():reject(new Error('Biblioteca Excel no disponible.'));};
    script.onerror=()=>{clearTimeout(timeout);reject(new Error('No se pudo cargar Excel SheetJS; exporta CSV o revisa internet.'));};
    document.head.appendChild(script);
  }).catch(err=>{sheetJSLoader=null;throw err;});
  return sheetJSLoader;
}
async function parseFile(file){if(/\.csv$/i.test(file.name))return matrixToRows(csvRows((await file.text()).replace(/^\ufeff/,'')),file.name);if(/\.xlsx?$/.test(file.name)){await loadSheetJS();let wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});let matrix=null;for(let name of [wb.SheetNames.find(x=>normalize(x)==='data'),...wb.SheetNames]){if(!name)continue;let current=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:''});if(current.some(r=>Array.isArray(r)&&r.map(v=>normalize(v)).includes('asset')&&r.map(v=>normalize(v)).includes('logical date'))){matrix=current;break;}}if(!matrix)throw Error(file.name+': no se encontró una hoja con los encabezados Asset / Logical Date.');return matrixToRows(matrix,file.name);}throw Error(file.name+': solo se admiten Excel y CSV.');}
function signature(r){return `${r.year}\u001e`+FIELDS.map(c=>clean(r.raw[c])).join('\u001f');}
function setDemo(){
 state.rows=demoRows();state.keys=new Set();state.files=0;state.demo=true;state.summaryMode=false;state.manual.clear();
 state.selected='llenadora';state.view3d=true;$('filesInput').value='';$('modeTag').textContent='MODO DEMOSTRACIÓN';
 if($('clearButton'))$('clearButton').hidden=true;
 $('importStatus').innerHTML='<span class="notice-dot">ⓘ</span><span><strong>Datos simulados:</strong> las líneas y sus equipos en este ejemplo son ilustrativos. En la carga real, el inventario se detecta por Asset + Reason Lvl1.</span>';
 updateOptions();$('assetFilter').value='SIPA 16 · PET (ejemplo)';render();
}
function updateOptions(){const fields={assetFilter:'Asset',shiftFilter:'Shift',superFilter:'Super Reason',r1Filter:'Reason Lvl1',r2Filter:'Reason Lvl2',startUnitFilter:'Start Unit',endUnitFilter:'End Unit'};for(let [id,col] of Object.entries(fields)){let sel=$(id),value=sel.value,first=sel.options[0]?.textContent||'Todos',values=[...new Set(state.rows.map(r=>clean(r.raw[col])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));sel.replaceChildren();sel.add(new Option(first,''));for(let v of values)sel.add(new Option(v,v));if(values.includes(value))sel.value=value;}}
function dateBound(id){let s=$(id).value.trim();if(!s)return null;let m=s.match(/^(\d{1,2})\/(\d{1,2})$/);if(!m)return null;let d=+m[1],mon=+m[2];return d>0&&d<=31&&mon>0&&mon<=12?mon*100+d:null;}
function betweenValue(r,name){const from=$(`${name}Min`).value,to=$(`${name}Max`).value;let v=name==='hours'?r.hours:r.nums[({seconds:'Seconds',minutes:'Minutes',startCycles:'Start Cycles',endCycles:'End Cycles',actual:'Actual Start/End Ratio',listed:'Listed Start/End Ratio'})[name]];if(from&&!(v!==null&&v>=+from))return false;if(to&&!(v!==null&&v<=+to))return false;return true;}
function timeFits(value,from,to){let f=$(from).value,t=$(to).value;if(!f&&!t)return true;if(value===null)return false;let a=f?timeMinutes(f):0,b=t?timeMinutes(t):1439;return a<=b?value>=a&&value<=b:value>=a||value<=b;}
function eligible(r){for(const [id,col] of [['assetFilter','Asset'],['shiftFilter','Shift'],['superFilter','Super Reason'],['r1Filter','Reason Lvl1'],['r2Filter','Reason Lvl2'],['startUnitFilter','Start Unit'],['endUnitFilter','End Unit']]){let s=$(id).value;if(s&&clean(r.raw[col])!==s)return false;}
 if($('monthFilter').value&&r.month!==Number($('monthFilter').value))return false;
 let a=dateBound('dateFrom'),b=dateBound('dateTo'),md=r.month*100+r.day;if(a&&b&&a>b){if(md<a&&md>b)return false;}else{if(a&&md<a||b&&md>b)return false;}
 if(!timeFits(r.start,'startFrom','startTo')||!timeFits(r.end,'endFrom','endTo'))return false;
 return ['seconds','minutes','hours','startCycles','endCycles','actual','listed'].every(n=>betweenValue(r,n));
}
function currentRows(){
 // El dashboard es SOLO de máquinas; Uptime, paros programados, transporte y causas externas no entran en las cifras.
 let eligibleRows=state.rows.filter(r=>eligible(r)&&machineId(r));
 let a=new Set(eligibleRows.filter(x=>x.year===2025).map(x=>x.month)),b=new Set(eligibleRows.filter(x=>x.year===2026).map(x=>x.month));
 state.monthsCommon=[...a].filter(m=>b.has(m)).sort((x,y)=>x-y);
 state.rawHasBoth=eligibleRows.some(x=>x.year===2025)&&eligibleRows.some(x=>x.year===2026);
 let useCommon=$('coverageFilter').value==='matched'&&state.monthsCommon.length>0;
 const rows=useCommon?eligibleRows.filter(x=>state.monthsCommon.includes(x.month)):eligibleRows;
 state.hasBoth=rows.some(x=>x.year===2025)&&rows.some(x=>x.year===2026);state.filtered=rows;
 return rows;
}
function mappingKey(r){return catalogKey(r.raw.Asset)+'||'+normalize(r.raw['Reason Lvl1'])+'||'+normalize(r.raw['Reason Lvl2']);}
function machineId(r){
 const manual=state.manual.get(mappingKey(r));if(manual!==undefined)return manual||null;
 // Solo Reason Lvl1 determina qué máquina existe en la línea; excluye categorías y transportes.
 return REASON_EQUIPOS[normalize(r.raw['Reason Lvl1'])]||null;
}
function accum(rows){const result={a:0,b:0,e25:0,e26:0};for(let r of rows){if(r.year===2025){result.a+=r.hours;result.e25+=(r.eventCount||1);}else if(r.year===2026){result.b+=r.hours;result.e26+=(r.eventCount||1);}}return result;}
function compare(a,b,valid){if(!valid)return {text:'Sin comparación',className:'neutral',delta:null,percent:null};if(a<=0){return b<=0?{text:'Sin variación',className:'neutral',delta:0,percent:0}:{text:'Nuevo en 2026',className:'bad',delta:b,percent:null};}const pct=(b-a)/a*100;return {text:pct<-.04?`▼ ${fmt(Math.abs(pct))}% reducción`:pct>.04?`▲ +${fmt(pct)}% incremento`:'Sin variación',className:pct<-.04?'good':pct>.04?'bad':'neutral',delta:b-a,percent:pct};}
function machineSummary(rows){let map=new Map(MACHINES.map(m=>[m.id,{...m,...accum([])}]));let unknown=[];for(let r of rows){let id=machineId(r);if(!id){unknown.push(r);continue;}let item=map.get(id);if(r.year===2025){item.a+=r.hours;item.e25+=(r.eventCount||1);}else{item.b+=r.hours;item.e26+=(r.eventCount||1);}}return{map,unknown};}
function renderMachines(summary,visible){
 const upper=visible.filter(m=>FLOW_ORDER.indexOf(m.id)<=FLOW_ORDER.indexOf('secador'));
 const lower=visible.filter(m=>!upper.includes(m));
 for(const [parent,items] of [['machinesTop',upper],['machinesBottom',lower]]){
  const box=$(parent);box.replaceChildren();
  if(items.length===0){if(parent==='machinesTop'&&!visible.length){box.innerHTML='<div class="empty-machine">No se identificaron máquinas físicas para esta línea en los históricos cargados. Puedes añadir equipos desde «Configurar equipos».</div>';}continue;}
  for(const m of items){
   const item=summary.map.get(m.id),com=compare(item.a,item.b,state.hasBoth),cur=state.mode==='hours'?[item.a,item.b]:[item.e25,item.e26];
   const vmax=Math.max(1,...cur),unit=state.mode==='hours'?' h':' ev';
   let card=document.createElement('button');card.type='button';card.className='machine-card'+(state.selected===m.id?' selected':'');card.dataset.machine=m.id;
   card.title='Ver diagnóstico de '+m.name;card.setAttribute('aria-pressed',String(state.selected===m.id));
   card.innerHTML=`<div class="badge-area"><div class="machine-name"><span>${safe(m.icon)}</span>${safe(m.name)}</div>
   <div class="machine-comparison"><span class="yearpair"><strong>2025:</strong> ${fmt(cur[0])}${unit}<br><strong>2026:</strong> ${fmt(cur[1])}${unit}</span>
   <div class="mini-bars"><span style="height:${Math.max(2,17*cur[0]/vmax)}px"></span><span style="height:${Math.max(2,17*cur[1]/vmax)}px"></span></div></div>
   <div class="change-pill ${com.className}">${safe(com.text)}</div></div><div class="machine-photo"><img alt="Modelo industrial ilustrativo: ${safe(m.name)}" src="assets/${m.img}" loading="lazy"></div>
   <div class="machine-foot"><span>2025 → 2026</span><strong>Ver diagnóstico ↗</strong></div>`;
   card.addEventListener('click',()=>selectMachine(m.id));box.append(card);
  }
 }
}
function reasonForMachine(rows,id){let map=new Map();for(let r of rows){if(machineId(r)!==id)continue;let reason=clean(r.raw['Reason Lvl2'])||clean(r.raw['Reason Lvl1'])||'Sin clasificar';let t=map.get(reason)||{hours:0,events:0};t.hours+=r.hours;t.events+=(r.eventCount||1);map.set(reason,t);}return[...map].sort((a,b)=>b[1].hours-a[1].hours).slice(0,5);}
function renderSelection(summary){
 const item=summary.map.get(state.selected),m=MACHINES.find(m=>m.id===state.selected);
 if(!item||!m){$('selectedName').textContent='Sin equipos';$('selectedDesc').textContent='No se identificaron máquinas para este Asset';
  $('detail25').textContent=$('detail26').textContent=$('detailEvents').textContent='—';$('detailChange').textContent='Sin datos';
  $('reasonsList').textContent='Selecciona una línea con equipos identificados.';return;}
 const com=compare(item.a,item.b,state.hasBoth);
 $('selectedName').textContent=m.name;$('selectedDesc').textContent=m.desc;$('machineSelect').value=m.id;
 $('detail25').textContent=fmt(item.a)+' h';$('detail26').textContent=fmt(item.b)+' h';
 $('detailEvents').textContent=`${fmt(item.e25,0)} / ${fmt(item.e26,0)}`;
 const ch=$('detailChange');ch.textContent=com.text;ch.className='detail-change '+(com.className==='bad'?'bad':com.className==='neutral'?'neutral':'');
 const mx=Math.max(item.a,item.b,1);$('bar25').style.width=(item.a/mx*100)+'%';$('bar26').style.width=(item.b/mx*100)+'%';
 $('compare25').textContent=fmt(item.a)+' h';$('compare26').textContent=fmt(item.b)+' h';
 const reasons=reasonForMachine(state.filtered,item.id),parent=$('reasonsList');parent.replaceChildren();
 if(!reasons.length){parent.innerHTML='<div class="empty-small">Sin paros registrados para el equipo con los filtros actuales.</div>';}
 else{const mx2=Math.max(...reasons.map(x=>x[1].hours),1);for(const [key,n] of reasons){
  const row=document.createElement('div');row.className='reason-row';const top=document.createElement('div');
  const name=document.createElement('span');name.textContent=key;const amount=document.createElement('strong');amount.textContent=fmt(n.hours)+' h';top.append(name,amount);
  const track=document.createElement('div');track.className='reason-track';const fill=document.createElement('span');fill.style.width=(100*n.hours/mx2)+'%';track.append(fill);row.append(top,track);parent.append(row);
 }}
}
function renderRanking(summary,visible){
 let rows=visible.map(m=>summary.map.get(m.id)).sort((a,b)=>b.b-a.b);const body=$('rankingBody');body.replaceChildren();
 rows.forEach((item,i)=>{const change=compare(item.a,item.b,state.hasBoth),tr=document.createElement('tr');if(item.id===state.selected)tr.className='selected-row';
 const vals=[i+1,item.name,fmt(item.a),fmt(item.b),change.delta===null?'—':(change.delta>0?'+':'')+fmt(change.delta),change.percent===null?'—':(change.percent>0?'+':'')+fmt(change.percent)+' %'];
 vals.forEach((v,j)=>{const td=document.createElement('td');td.textContent=v;if(j>=2)td.classList.add('num');if(j===5)td.classList.add(change.className);tr.append(td);});
 tr.addEventListener('click',()=>selectMachine(item.id));body.append(tr);
 });
 if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='Sin equipos identificados en esta línea';tr.append(td);body.append(tr);}
 const sum=accum(state.filtered);const tr=document.createElement('tr');tr.className='total-row';const delta=compare(sum.a,sum.b,state.hasBoth);
 for(const v of ['','TOTAL EQUIPOS',fmt(sum.a),fmt(sum.b),delta.delta===null?'—':fmt(delta.delta),delta.percent===null?'—':fmt(delta.percent)+' %']){const td=document.createElement('td');td.textContent=v;tr.append(td);}body.append(tr);
 const unassigned=state.rows.filter(r=>(!$('assetFilter').value||r.raw.Asset===$('assetFilter').value)&&!machineId(r)).length;
 state.unassigned=unassigned;
 $('mappingCoverage').textContent=`${fmt(state.filtered.reduce((a,r)=>a+(r.eventCount||1),0),0)} eventos de máquinas · ${fmt(unassigned,0)} registros no asociados a máquinas en los históricos cargados.`;
}
function renderChart(rows){const svg=$('monthlyChart');svg.replaceChildren();const ns='http://www.w3.org/2000/svg';const el=(tag,attrs,txt)=>{let node=document.createElementNS(ns,tag);for(let k in attrs)node.setAttribute(k,attrs[k]);if(txt!==undefined)node.textContent=txt;svg.append(node);return node;};let x0=47,y0=222,w=525,h=178;let vals=[2025,2026].map(y=>Array.from({length:12},(_,i)=>rows.filter(r=>r.year===y&&r.month===i+1).reduce((a,r)=>a+r.hours,0)));let max=Math.max(1,...vals.flat());for(let i=0;i<=4;i++){let y=y0-i*h/4;el('line',{x1:x0,y1:y,x2:x0+w,y2:y,stroke:'#dce8f1','stroke-width':1});el('text',{x:x0-8,y:y+4,'text-anchor':'end',fill:'#718ba0','font-size':11},fmt(i*max/4,0));}for(let i=0;i<12;i++){let x=x0+i*w/11;el('text',{x,y:y0+21,'text-anchor':'middle',fill:'#67839b','font-size':11},MONTHS[i+1]);}
 vals.forEach((list,series)=>{let exists=rows.some(r=>r.year===(series?2026:2025));if(!exists)return;let coords=list.map((v,i)=>rows.some(r=>r.year===(series?2026:2025)&&r.month===i+1)?[x0+i*w/11,y0-v/max*h]:null);let path='',open=false;coords.forEach(point=>{if(point){path+=(open?' L ':' M ')+`${point[0].toFixed(1)} ${point[1].toFixed(1)}`;open=true;}else{open=false;}});el('path',{d:path.trim(),fill:'none',stroke:series?'#16b8c6':'#2b80d5','stroke-width':3.2,'stroke-linecap':'round','stroke-linejoin':'round'});coords.forEach((point,i)=>{if(!point)return;const [x,y]=point;let circ=el('circle',{cx:x,cy:y,r:4.1,stroke:series?'#16b8c6':'#2b80d5','stroke-width':2,fill:'white'});let t=document.createElementNS(ns,'title');t.textContent=`${MONTHS[i+1]} ${series?2026:2025}: ${fmt(list[i])} h`;circ.append(t);});});}
function renderDetails(rows){let thead=$('detailHead');thead.replaceChildren();for(let c of ['Año','Máquina asignada',...FIELDS]){let th=document.createElement('th');th.textContent=c;thead.append(th);}let body=$('detailBody');body.replaceChildren();for(let r of rows.slice(0,80)){let tr=document.createElement('tr');let m=MACHINES.find(x=>x.id===machineId(r));for(let v of [r.year,m?m.name:'Sin asignar',...FIELDS.map(c=>r.raw[c])]){let td=document.createElement('td');td.textContent=clean(v);tr.append(td);}body.append(tr);}if(!rows.length){let tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=19;td.className='empty-row';td.textContent='No hay registros para los filtros seleccionados';tr.append(td);body.append(tr);}$('rowCount').textContent=state.summaryMode?fmt(rows.reduce((a,r)=>a+(r.eventCount||1),0),0)+' eventos agregados':' '+fmt(rows.length,0)+' registros';$('exportButton').disabled=!rows.length;}
function renderTotals(rows){
 const sums=accum(rows),c=compare(sums.a,sums.b,state.hasBoth);
 $('total25').textContent=state.rows.some(r=>r.year===2025)?fmt(sums.a)+' h':'Sin datos';
 $('total26').textContent=state.rows.some(r=>r.year===2026)?fmt(sums.b)+' h':'Sin datos';
 $('events25').textContent=fmt(sums.e25,0)+' eventos de equipos';$('events26').textContent=fmt(sums.e26,0)+' eventos de equipos';
 $('totalDelta').textContent=c.percent!==null?(c.percent>0?'+':'')+fmt(c.percent)+' %':'N/D';
 $('deltaLabel').textContent=c.className==='good'?'REDUCCIÓN DE HORAS':c.className==='bad'?'INCREMENTO DE HORAS':'VARIACIÓN DE HORAS';
 $('deltaAbsolute').textContent=c.delta===null?'Se necesitan ambos años':`${c.delta>0?'+':''}${fmt(c.delta)} h frente a 2025`;
 $('deltaIcon').textContent=c.className==='good'?'↓':c.className==='bad'?'↑':'–';
 $('deltaCard').className='headline-kpi kpi-delta'+(c.className==='bad'?' bad':c.className==='neutral'?' unknown':'');
 const mo=state.monthsCommon;
 if($('coverageFilter').value==='matched'&&mo.length)$('coverageText').textContent='Meses equivalentes: '+mo.map(i=>MONTHS[i]).join(', ');
 else if($('coverageFilter').value==='matched'&&!mo.length)$('coverageText').textContent='Sin meses coincidentes · datos disponibles';
 else $('coverageText').textContent='Todos los meses disponibles';
}
function selectMachine(id){state.selected=id;render();}
function render(){
 const rows=currentRows(),summary=machineSummary(rows),visible=getVisibleMachines();
 keepSelection(visible);updateMachineSelect(visible);renderTotals(rows);renderMachines(summary,visible);renderSelection(summary);
 renderRanking(summary,visible);renderChart(rows);renderDetails(rows);
 $('visibleCount').textContent=`${visible.length} equipos representados · ${$('assetFilter').value||'todas las líneas'}`;
 $('lineSceneLabel').textContent=($('assetFilter').value||'Todas las líneas')+' · '+visible.length+' equipos';
 $('sceneHeading').textContent='Mapa 3D · '+($('assetFilter').value||'Todas las líneas');
 $('machineView3d').hidden=!state.view3d;$('machineCardView').hidden=state.view3d;
 $('view3D').classList.toggle('active-view',state.view3d);$('viewCards').classList.toggle('active-view',!state.view3d);
 if(window.Informance3D?.setMachines)window.Informance3D.setMachines(visible.map(m=>({...m,stats:summary.map.get(m.id)})),state.selected,state.hasBoth,state.mode);
 if(!$('mappingPanel').hidden)renderMapping();
 if(!$('catalogPanel').hidden)updateCatalogPanel();
}
function renderMapping(){
 const body=$('mappingBody');body.replaceChildren();let grouping=new Map();
 for(let r of state.rows){let key=mappingKey(r),group=grouping.get(key)||{asset:clean(r.raw.Asset),r1:clean(r.raw['Reason Lvl1']),r2:clean(r.raw['Reason Lvl2']),count:0};group.count++;grouping.set(key,group);}
 let entries=[...grouping].sort((a,b)=>b[1].count-a[1].count).slice(0,100);
 if(!entries.length){let tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;td.textContent='Aún no hay eventos cargados.';tr.append(td);body.append(tr);return;}
 for(let [key,g] of entries){let tr=document.createElement('tr'),td1=document.createElement('td'),td2=document.createElement('td'),td3=document.createElement('td');td1.textContent=(g.asset||'Sin Asset')+' · '+(g.r1||'Sin Reason Lvl1')+' / '+(g.r2||'Sin Reason Lvl2');td2.textContent=fmt(g.count,0);let sel=document.createElement('select');sel.setAttribute('aria-label','Asignar máquina para '+(g.r1||g.r2));sel.add(new Option('Detectar automáticamente','auto'));sel.add(new Option('Forzar: sin asignar','_none'));for(let m of MACHINES)sel.add(new Option(m.name,m.id));sel.value=state.manual.has(key)?(state.manual.get(key)||'_none'):'auto';sel.addEventListener('change',()=>{if(sel.value==='auto')state.manual.delete(key);else state.manual.set(key,sel.value==='_none'?'':sel.value);render();});td3.append(sel);tr.append(td1,td2,td3);body.append(tr);}
}
function csvCell(v){let s=clean(v);if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function exportRows(){let fields=['Año','Máquina asignada',...FIELDS],lines=[fields.map(csvCell).join(',')];for(let r of state.filtered){let m=MACHINES.find(x=>x.id===machineId(r));let vals=[r.year,m?m.name:'Sin asignar',...FIELDS.map(c=>r.raw[c])];lines.push(vals.map(csvCell).join(','));}let blob=new Blob(['\ufeff',lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});let link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download='Informance_Comparativo_2025_2026_Filtrado.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function uploadFiles(files){if(!files.length)return;let successful=[],errors=[],duplicate=0,skipped=0;let button=$('uploadButton');button.disabled=true;let notice=$('importStatus');notice.textContent='Importando históricos en tu navegador...';for(let file of files){try{let rows=await parseFile(file);successful.push({name:file.name,rows});}catch(e){errors.push(clean(e.message||e));}}
 if(successful.length){if(state.demo){state.rows=[];state.keys=new Set();state.demo=false;state.summaryMode=false;state.manual.clear();state.files=0;for(let x of $('sidebar').querySelectorAll('.side-filters input'))x.value='';for(let x of $('sidebar').querySelectorAll('.side-filters select'))if(x.id!=='dateFormat')x.selectedIndex=0;}for(let entry of successful){state.files++;for(let r of entry.rows){let sig=signature(r);if(state.keys.has(sig)){duplicate++;continue;}state.keys.add(sig);state.rows.push(r);}if(!entry.rows.length)skipped++;}state.selected='';$('modeTag').textContent='DATOS IMPORTADOS';updateOptions();$('assetFilter').selectedIndex=1;render();}
 notice.replaceChildren();let dot=document.createElement('span');dot.className='notice-dot';dot.textContent=errors.length?'⚠':'✓';let text=document.createElement('span');text.textContent=`${state.demo?'Sigue el modo demostración.':'Datos cargados: '+fmt(state.rows.length,0)+' registros únicos · '+state.files+' archivos · '+duplicate+' duplicados omitidos.'}${errors.length?' Errores: '+errors.join(' | '):''}${skipped?' · '+skipped+' archivos sin eventos válidos de 2025–2026.':''}`;notice.append(dot,text);if(!state.demo){let clear=document.createElement('button');clear.className='linklike';clear.textContent='Eliminar carga';clear.addEventListener('click',setDemo);notice.append(clear);}button.disabled=false;}
function showMobileFilters(visible){
 const side=$('sidebar'),shade=$('mobileShade');
 side.classList.toggle('open',visible);
 shade.hidden=!visible;
 document.body.style.overflow=visible?'hidden':'';
}

async function uploadPrivateSummary(file, silently=false){
 if(!file)return;
 try{
  const parsed=typeof file.text==='function'?JSON.parse(await file.text()):file;
  if(parsed.format!=='informance_aggregate_v4'||!Array.isArray(parsed.rows))throw Error('No es un resumen V4 válido.');
  const out=[];
  for(const x of parsed.rows){
    const period=String(x.Periodo||'');
    if(!/^202[56]-(0[1-9]|1[0-2])$/.test(period)||!x.Asset||!x.Equipo)continue;
    const hrs=Number(x.Horas),ev=Number(x.Eventos);
    if(!Number.isFinite(hrs)||hrs<0||!Number.isFinite(ev)||ev<0)continue;
    const raw=Object.fromEntries(FIELDS.map(k=>[k,'']));
    Object.assign(raw,{'Asset':String(x.Asset),'Logical Date':period+'-15','Hours':hrs,'Minutes':hrs*60,'Seconds':hrs*3600,'Super Reason':'Paradas Electromecanicas','Reason Lvl1':String(x.Equipo),'Reason Lvl2':'Resumen mensual · sin detalle de fallas'});
    const row=convert(raw,file.name);if(row){row.eventCount=ev;out.push(row);}
  }
  if(!out.length)throw Error('El archivo no contiene períodos válidos.');
  const savedAsset=silently?$('assetFilter').value:'';
  state.rows=out;state.keys=new Set();state.demo=false;state.summaryMode=true;state.files=parsed.source_files||0;state.manual.clear();
  $('modeTag').textContent='HISTÓRICOS REALES · RESUMEN';
  if(!silently){
    for(const x of $('sidebar').querySelectorAll('.side-filters input'))x.value='';
    for(const x of $('sidebar').querySelectorAll('.side-filters select'))x.selectedIndex=0;
    $('coverageFilter').value='matched';
  }
  updateOptions();
  $('assetFilter').value=savedAsset&&[...$('assetFilter').options].some(o=>o.value===savedAsset)?savedAsset:'Sipa 16';
  if(!silently)state.selected='';render();
  $('importStatus').textContent='✓ SINCRONIZACIÓN AUTOMÁTICA · '+fmt(parsed.total_source_rows||0,0)+' registros de origen · '+out.length+' grupos mensuales · último cambio: '+(parsed.updated_at||'actualizado')+'. La comparación se limita a meses equivalentes. No hay detalle de fallas en este resumen.';
  $('detailTable').closest('section').querySelector('h2').textContent='Resumen mensual de equipos · Para detalle importa los Excel originales';
 }catch(error){$('importStatus').textContent='⚠ No fue posible abrir el resumen privado: '+error.message;}
}

function wire(){$('machineSelect').addEventListener('change',e=>{selectMachine(e.target.value);});$('uploadButton').addEventListener('click',()=>$('filesInput').click());$('summaryButton').addEventListener('click',()=>$('summaryInput').click());$('summaryInput').addEventListener('change',e=>uploadPrivateSummary(e.target.files[0]));$('filesInput').addEventListener('change',e=>uploadFiles([...e.target.files]));$('demoButton').addEventListener('click',setDemo);$('clearButton').addEventListener('click',setDemo);$('exportButton').addEventListener('click',exportRows);$('applyFilters').addEventListener('click',()=>{render();if(window.innerWidth<=900)showMobileFilters(false);});$('resetFilters').addEventListener('click',()=>{for(let x of $('sidebar').querySelectorAll('.side-filters input'))x.value='';for(let x of $('sidebar').querySelectorAll('.side-filters select'))x.selectedIndex=0;$('coverageFilter').value='matched';render();});$('toggleSidebar').addEventListener('click',()=>showMobileFilters(!$('sidebar').classList.contains('open')));$('mobileFilterButton').addEventListener('click',()=>showMobileFilters(true));$('mobileShade').addEventListener('click',()=>showMobileFilters(false));document.addEventListener('keydown',e=>{if(e.key==='Escape')showMobileFilters(false);});$('sidebar').querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>showMobileFilters(false)));$('toggleValues').addEventListener('click',()=>{state.mode=state.mode==='hours'?'events':'hours';render();$('toggleValues').title=state.mode==='hours'?'Mostrando horas':'Mostrando eventos';});$('mappingButton').addEventListener('click',()=>{$('mappingPanel').hidden=!$('mappingPanel').hidden;if(!$('mappingPanel').hidden){renderMapping();$('mappingPanel').scrollIntoView({behavior:'smooth',block:'start'});}});$('hideMapping').addEventListener('click',()=>$('mappingPanel').hidden=true);
 for(let e of $('sidebar').querySelectorAll('.side-filters input,.side-filters select'))e.addEventListener(e.tagName==='SELECT'?'change':'change',()=>{if(e.id!=='dateFormat')render();});
 $('view3D').addEventListener('click',()=>{state.view3d=true;render();});
 $('viewCards').addEventListener('click',()=>{state.view3d=false;render();});
 $('catalogButton').addEventListener('click',()=>{$('catalogPanel').hidden=!$('catalogPanel').hidden;updateCatalogPanel();});
 $('closeCatalog').addEventListener('click',()=>{$('catalogPanel').hidden=true;});
 window.addEventListener('informance-3d-ready',()=>render());
 window.selectInformanceMachine=selectMachine;
 // Si la empresa bloquea el CDN de Three.js, mostrar tarjetas funcionales automáticamente.
 setTimeout(()=>{if(!window.Informance3D&&state.view3d){state.view3d=false;render();$('webglMessage').textContent='Vista 3D no disponible en este navegador. Se muestra la vista Tarjetas.';}},5500);
 setDemo();}
wire();


// Se conecta al servidor privado solo cuando el dashboard abre en localhost.
// GitHub Pages no puede acceder a los archivos del ordenador, ni a esta API local.
let autoVersion=null;
async function actualizarAutomaticamente(){
  if(!['127.0.0.1','localhost'].includes(location.hostname))return;
  try{
    const r=await fetch('/api/estado',{cache:'no-store'});
    if(!r.ok)throw Error('Servidor local no responde');
    const stateAuto=await r.json();
    if(stateAuto.version>0 && stateAuto.version!==autoVersion){
      const response=await fetch('/api/resumen',{cache:'no-store'});
      if(!response.ok)throw Error('Resumen aún no está disponible');
      await uploadPrivateSummary(await response.json(),autoVersion!==null);
      autoVersion=stateAuto.version;
    }
    if(stateAuto.error && stateAuto.status==='error')$('importStatus').textContent='⚠ SINCRONIZADOR: '+stateAuto.error;
  }catch(e){$('importStatus').textContent='⚠ Sin conexión con el sincronizador: '+e.message;}
}
if(['127.0.0.1','localhost'].includes(location.hostname)){
  actualizarAutomaticamente();
  setInterval(actualizarAutomaticamente,12000);
}


// Botón V6: únicamente disponible cuando la página se sirve desde el agente local.
const IS_LOCAL_AGENT=['127.0.0.1','localhost'].includes(location.hostname);
let downloadToken=null;
let previousJobState='idle';
function setDownloadMessage(text){const element=document.getElementById('downloadStatus');if(element)element.textContent=text;}
function configureDownload(){
  const button=document.getElementById('downloadInformance');
  const panel=document.getElementById('downloadPanel');
  const start=document.getElementById('startDownload');
  if(!button||!panel||!start)return;
  const month=new Date().toISOString().slice(0,7);
  document.getElementById('downloadDesde').value=month;
  document.getElementById('downloadHasta').value=month;
  if(!IS_LOCAL_AGENT){
    button.textContent='⬇ Abrir controlador de Informance';
    button.onclick=()=>{
      const ok=window.confirm('Para ejecutar Python necesitas tener el sincronizador V6 abierto en tu computadora. ¿Abrir el controlador local en otra pestaña?');
      if(ok)window.open('http://127.0.0.1:8765/informance_3d_2025_2026/','_blank','noopener');
    };
    return;
  }
  button.onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)panel.scrollIntoView({behavior:'smooth',block:'nearest'});};
  start.onclick=async()=>{
    const desde=document.getElementById('downloadDesde').value;
    const hasta=document.getElementById('downloadHasta').value;
    const repetir=document.getElementById('downloadRepetir').checked;
    if(!desde||!hasta||desde>hasta){setDownloadMessage('Selecciona un rango válido.');return;}
    start.disabled=true;setDownloadMessage('Solicitando descarga...');
    try{
      if(!downloadToken){let t=await fetch('/api/token',{cache:'no-store'});if(!t.ok)throw Error('No se pudo verificar el controlador');downloadToken=(await t.json()).token;}
      let r=await fetch('/api/descargar',{method:'POST',headers:{'Content-Type':'application/json','X-Informance-CSRF':downloadToken},body:JSON.stringify({desde,hasta,repetir})});
      let data=await r.json();if(!r.ok)throw Error(data.error||'La descarga no pudo iniciarse');
      setDownloadMessage('Descarga iniciada. Revisa Chrome para completar cualquier inicio de sesión corporativo.');
    }catch(e){setDownloadMessage('⚠ '+e.message);start.disabled=false;}
  };
  pollDownload();setInterval(pollDownload,2500);
}
async function pollDownload(){
  if(!IS_LOCAL_AGENT)return;
  try{
    let r=await fetch('/api/descarga_estado',{cache:'no-store'});if(!r.ok)return;
    let job=await r.json();
    const start=document.getElementById('startDownload');const log=document.getElementById('downloadLog');
    if(start)start.disabled=job.state==='running';
    if(log)log.textContent=job.log||'';
    if(job.state==='running')setDownloadMessage('⏳ Descargando '+(job.range||'')+' · Deja Chrome abierto; la página se actualizará al terminar.');
    if(job.state==='done')setDownloadMessage('✓ Descarga finalizada. El dashboard se actualiza con los nuevos Excel válidos.');
    if(job.state==='error')setDownloadMessage('⚠ '+(job.error||'La descarga no finalizó correctamente')+'. Verifica los mensajes de la consola.');
    if(job.state!==previousJobState&&job.state==='done'){
      // El watcher regular también detecta los cambios, pero forzamos consulta al completar.
      if(typeof actualizarAutomaticamente==='function')await actualizarAutomaticamente();
    }
    previousJobState=job.state;
  }catch(e){setDownloadMessage('⚠ No se pudo consultar el estado de la descarga: '+e.message);}
}
configureDownload();
