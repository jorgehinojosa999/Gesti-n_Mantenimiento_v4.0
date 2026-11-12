/* Conexión HTTPS al backend privado; no colocar claves ni credenciales de Epicor en este archivo. */
(() => {
 'use strict';
 // Sustituye esta URL cuando publiques el backend privado.
 const API = String(window.INFORMANCE_API_URL || '').replace(/\/$/, '');
 const valid = /^https:\/\/[^\s/]+/.test(API) && !API.includes('REEMPLAZAR');
 const el = id => document.getElementById(id);
 const panel=document.createElement('section'); panel.className='panel';panel.style.cssText='margin:12px 0;padding:15px;border:2px solid #2c83cc';
 panel.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:7px">Descarga remota desde la página web 3D</div>
 <div id="remoteHint" style="font-size:12px;margin-bottom:8px">${valid?'Para controlar las descargas, inicia sesión con tu contraseña de operador.':'Para activar las descargas, configura la URL HTTPS de la API privada en remote-config.js. No ingreses la contraseña Microsoft aquí.'}</div>
 <div id="remoteLogin" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><input id="remotePassword" type="password" autocomplete="off" placeholder="Contraseña del portal" style="min-height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:8px;flex:1;min-width:150px"/><button id="remoteConnect" class="primary-btn" type="button">Conectar</button></div>
 <div id="remoteState" role="status" aria-live="polite" style="font-size:12px;white-space:pre-wrap">Sin conexión</div>`;
 const anchor=el('downloadInformance');const top=anchor?.closest('.action-row');
 if(top)top.insertAdjacentElement('afterend',panel);
 if(anchor){anchor.onclick=null;anchor.textContent='⬇ Descargar mes actual y reemplazar Excel';anchor.disabled=!valid;}
 let accessToken=null,latestSummaryVersion=null,previousDone=null, busy=false;
 async function req(path,opts={}){
  const h={'Content-Type':'application/json',...opts.headers};if(accessToken)h.Authorization='Bearer '+accessToken;
  const r=await fetch(API+path,{...opts,headers:h,cache:'no-store'});
  let data;try{data=await r.json()}catch{data={detail:'Respuesta no válida'};}
  if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:'Error HTTP '+r.status);
  return data;
 }
 function say(s){el('remoteState').textContent=s;}
 async function connect(){
  if(!valid)return;
  try{
   const pw=el('remotePassword').value;
   if(!pw)throw Error('Introduce la contraseña de operador');
   const result=await req('/api/login',{method:'POST',body:JSON.stringify({password:pw})});
   accessToken=result.token;el('remotePassword').value='';el('remoteLogin').style.display='none';
   say('Conectado al controlador remoto. El agente Windows debe permanecer abierto.');
   await refresh();
  }catch(e){say('⚠ '+e.message);}
 }
 async function refresh(){
  if(!accessToken||busy)return;busy=true;
  try{
   const job=await req('/api/jobs/latest');
   if(job.status==='queued')say('⏳ Trabajo en cola: '+job.month+' · Esperando al agente Windows.');
   if(job.status==='running')say('⏳ Descargando '+job.month+' en Windows. Completa MFA en Chrome si es necesario.');
   if(job.status==='error')say('⚠ La descarga falló: '+job.message);
   if(job.status==='done')say('✓ '+job.message+' · '+job.month+' · Datos disponibles');
   if(job.status==='idle')say('Conectado. Pulsa el botón para descargar el mes actual.');
   if(anchor)anchor.disabled=job.status==='queued'||job.status==='running';
   if(job.status==='done' && previousDone!==job.id){previousDone=job.id;latestSummaryVersion=null;}
   if(job.status!=='running'&&job.status!=='queued'){
     const summary=await req('/api/summary');
     const signature=String(summary.updated_at||'')+'|'+(summary.rows?.length||0)+'|'+(summary.source_files||'');
     if(signature!==latestSummaryVersion && typeof uploadPrivateSummary==='function'){
       await uploadPrivateSummary(summary,true);latestSummaryVersion=signature;
     }
   }
  }catch(e){if(!/Todavía no hay resumen|Error HTTP 404/.test(e.message))say('⚠ '+e.message);if(/401|caducada/i.test(e.message)){accessToken=null;el('remoteLogin').style.display='flex';}}
  finally{busy=false;}
 }
 async function start(){
  if(!accessToken){say('Primero inicia sesión como operador.');el('remotePassword').focus();return;}
  if(!confirm('¿Descargar de nuevo el mes actual, validar y reemplazar el Excel existente?'))return;
  try{anchor.disabled=true;const x=await req('/api/jobs',{method:'POST',body:'{}'});say((x.already_active?'Ya existe una actualización en curso: ':'Solicitud registrada para ')+x.month);await refresh();}
  catch(e){say('⚠ '+e.message);anchor.disabled=false;}
 }
 el('remoteConnect').addEventListener('click',connect);
 el('remotePassword').addEventListener('keydown',e=>{if(e.key==='Enter')connect()});
 if(anchor)anchor.addEventListener('click',start);
 if(valid)setInterval(refresh,10000);
})();
