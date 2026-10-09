"use strict";
// Fuente existente del portal. No modifica el JSON ni los scripts SAP.
const FUENTE = "../data/ordenes_sap.json";
const $ = id => document.getElementById(id);
let registros = [], version = "";
const fmt = n => new Intl.NumberFormat("es-EC").format(n);
const money = n => new Intl.NumberFormat("es-EC",{style:"currency",currency:"USD"}).format(n);
const num = v => {const n=Number(v);return Number.isFinite(n)?n:0};
const text = v => String(v ?? "");
const cell = (tr,value) => {const td=document.createElement("td");td.textContent=text(value);tr.appendChild(td)};
function render(){
 const estado=$("estado").value, buscar=$("buscar").value.trim().toLowerCase();
 const datos=registros.filter(x=>(!estado||x.estado_orden===estado)&&(!buscar||text(x.orden).toLowerCase().includes(buscar)));
 const cerradas=datos.filter(x=>text(x.estado_orden).toUpperCase().includes("CERRADA")).length;
 const abiertas=datos.filter(x=>text(x.estado_orden).toUpperCase().includes("ABIERTA")).length;
 $("total").textContent=fmt(datos.length);$("cerradas").textContent=fmt(cerradas);$("abiertas").textContent=fmt(abiertas);
 $("cierre").textContent=datos.length?(100*cerradas/datos.length).toFixed(1)+"%":"—";
 $("plan").textContent=money(datos.reduce((s,x)=>s+num(x.total_costes_plan),0));
 $("real").textContent=money(datos.reduce((s,x)=>s+num(x.costes_totales_reales),0));
 const counts=new Map();datos.forEach(x=>counts.set(x.estado_orden||"Sin estado",(counts.get(x.estado_orden||"Sin estado")||0)+1));
 const barras=$("barras");barras.replaceChildren();[...counts].sort((a,b)=>b[1]-a[1]).forEach(([name,n])=>{
 const row=document.createElement("div");row.className="bar";const label=document.createElement("label");label.textContent=name;
 const track=document.createElement("div");track.className="track";const fill=document.createElement("div");fill.className="fill";fill.style.width=(datos.length?100*n/datos.length:0)+"%";track.append(fill);
 const count=document.createElement("b");count.textContent=fmt(n);row.append(label,track,count);barras.append(row)});
 const body=$("filas");body.replaceChildren();const fragment=document.createDocumentFragment();datos.slice(0,250).forEach(x=>{
 const tr=document.createElement("tr");[x.orden,x.estado_orden,x.estatus_sap,money(num(x.total_costes_plan)),money(num(x.costes_totales_reales)),x.fecha_iw47,x.texto_notificacion].forEach(v=>cell(tr,v));fragment.append(tr)});body.append(fragment);
 $("cantidad").textContent=fmt(datos.length)+" órdenes";
}
async function cargar(force=false){try{
 const r=await fetch(FUENTE+"?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);
 const d=await r.json();if(!Array.isArray(d.data))throw Error("Formato JSON inesperado");
 const next=JSON.stringify([d.ultima_actualizacion,d.cantidad_ordenes,d.data.length,d.data[0]?.orden,d.data[d.data.length-1]?.orden]);
 if(force||next!==version){version=next;registros=d.data;const old=$("estado").value;const options=[...new Set(registros.map(x=>x.estado_orden).filter(Boolean))].sort();$("estado").replaceChildren(new Option("Todos",""),...options.map(x=>new Option(x,x)));$("estado").value=options.includes(old)?old:"";render()}
 $("status").textContent="Datos conectados · Actualización de origen: "+(d.ultima_actualizacion||"no informada")+" · Verificado: "+new Date().toLocaleTimeString("es-EC");
 }catch(e){$("status").textContent="No se pudo leer "+FUENTE+": "+e.message+". Verifica el nombre y que el portal esté publicado en un servidor web.";console.error(e)}}
$("estado").addEventListener("change",render);$("buscar").addEventListener("input",render);$("actualizar").addEventListener("click",()=>cargar(true));
cargar(true);setInterval(()=>cargar(),15000);
