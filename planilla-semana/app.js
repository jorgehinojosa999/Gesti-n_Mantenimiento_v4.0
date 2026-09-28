const A="../data/avisos.json";
const O="../data/ordenes_sap.json";
const M="../data/maestro_equipos.json";

const SUPABASE_URL="https://tscvnimoivnoxvelssvz.supabase.co";
const SUPABASE_KEY="sb_publishable_hW0tHMY5z_s-0fREs1YzXQ_rdK8OjE2";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const KEY="Ingenieria2026";

let av=[],ot=[],maestro=[],sel=null,base=new Date(),did=null;
let items=[];

const $=x=>document.getElementById(x);
const v=(o,...k)=>{for(const x of k){if(o?.[x]!=null&&String(o[x]).trim())return String(o[x]).trim()}return""};
const cleanParts=(...p)=>p.map(x=>String(x||"").trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(" | ");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function mon(d){let x=new Date(d),n=x.getDay()||7;x.setDate(x.getDate()-n+1);x.setHours(0,0,0,0);return x}
function fmt(d){return d.toLocaleDateString("es-EC")}
function parse(s){let p=String(s||"").split("-");return new Date(+p[0],+p[1]-1,+p[2])}
function rng(){let a=mon(base),b=new Date(a);b.setDate(a.getDate()+6);return[a,b]}

async function cargarPlanilla(){
  const {data,error}=await db
    .from("planilla_semana")
    .select("*")
    .order("fecha_ejecucion",{ascending:true})
    .order("id",{ascending:true});

  if(error) throw error;

  items=(data||[]).map(x=>({
    id:x.id,
    tipo:x.tipo||"",
    numero:x.numero||"—",
    fechaAviso:x.fecha_aviso||"",
    descripcionUbicacion:x.descripcion_ubicacion||"",
    ubicTecnica:x.ubic_tecnica||"",
    descripcionEquipo:x.descripcion_equipo||"",
    equipo:x.equipo||"",
    descripcionTrabajo:x.descripcion_trabajo||"",
    descripcion:x.tipo==="MANUAL"
      ? cleanParts(x.descripcion_ubicacion,x.descripcion_equipo,x.descripcion_trabajo)
      : (x.descripcion_trabajo||""),
    fechaEjecucion:x.fecha_ejecucion||"",
    estado:x.estado_sap||""
  }));
}

async function load(){
  $("msg").textContent="Cargando datos...";
  try{
    let [a,o,m]=await Promise.all([
      fetch(A+"?t="+Date.now(),{cache:"no-store"}),
      fetch(O+"?t="+Date.now(),{cache:"no-store"}),
      fetch(M+"?t="+Date.now(),{cache:"no-store"})
    ]);

    av=(await a.json()).data||[];
    let j=await o.json(); ot=j.data||j.ordenes||[];
    let jm=await m.json();
    maestro=Array.isArray(jm)?jm:(jm.data||[]);
    cargarUbicaciones();

    await cargarPlanilla();
    $("msg").textContent="Datos SAP y planilla compartida cargados.";
  }catch(e){
    console.error(e);
    $("msg").textContent="Error al cargar datos. Revise conexión, Supabase o archivos JSON.";
  }
  render();
}

function cargarUbicaciones(){
  const select=$("manualUbicacion");
  const mapa=new Map();

  maestro.forEach(x=>{
    const desc=v(x,"DescripcionUbicacion","descripcionUbicacion");
    const ubic=v(x,"UbicTecnica","ubicTecnica");
    if(desc&&!mapa.has(desc))mapa.set(desc,ubic);
  });

  const lineas=[...mapa.entries()].sort((a,b)=>a[0].localeCompare(b[0],"es",{numeric:true,sensitivity:"base"}));

  select.innerHTML='<option value="">Seleccione línea / ubicación</option>'+
    lineas.map(([desc,ubic])=>`<option value="${esc(desc)}" data-ubic="${esc(ubic)}">${esc(desc)}</option>`).join("");

  cargarEquipos();
}

function cargarEquipos(){
  const linea=$("manualUbicacion").value;
  const select=$("manualEquipo");

  select.innerHTML='<option value="">Seleccione equipo</option>';
  if(!linea){select.disabled=true;return}

  const equipos=maestro.filter(x=>v(x,"DescripcionUbicacion","descripcionUbicacion")===linea);
  const vistos=new Set();

  const lista=equipos.filter(x=>{
    const codigo=v(x,"Equipo","equipo");
    const desc=v(x,"DescripcionEquipo","descripcionEquipo");
    const key=codigo+"|"+desc;
    if(!desc||vistos.has(key))return false;
    vistos.add(key);
    return true;
  }).sort((a,b)=>v(a,"DescripcionEquipo","descripcionEquipo").localeCompare(v(b,"DescripcionEquipo","descripcionEquipo"),"es",{numeric:true,sensitivity:"base"}));

  select.innerHTML+=lista.map(x=>{
    const codigo=v(x,"Equipo","equipo");
    const desc=v(x,"DescripcionEquipo","descripcionEquipo");
    const ubic=v(x,"UbicTecnica","ubicTecnica");
    return `<option value="${esc(codigo)}" data-desc="${esc(desc)}" data-ubic="${esc(ubic)}">${esc(desc)}</option>`;
  }).join("");

  select.disabled=false;
}

function descA(a){
  return cleanParts(
    v(a,"descripcion","Descripcion"),
    v(a,"descripcion1","Descripcion1"),
    v(a,"descripcion2","Descripcion2")
  )
}

function avisoPorOrden(n){
  return av.find(x=>v(x,"orden","Orden")===n)
}

function descO(o,n){
  let d=cleanParts(
    v(o,"descripcion","Descripcion"),
    v(o,"descripcion1","Descripcion1"),
    v(o,"descripcion2","Descripcion2"),
    v(o,"texto_breve","textoBreve","Texto breve","TextoBreve")
  );
  if(!d){
    const a=avisoPorOrden(n);
    if(a)d=descA(a)
  }
  return d
}

function search(){
  let n=$("numero").value.trim();
  let o=ot.find(x=>v(x,"orden","Orden","numeroOrden")===n);
  let a=av.find(x=>v(x,"notificacion","Notificacion","aviso","Aviso")===n);

  sel=o?{
    tipo:"ORDEN",
    numero:n,
    fechaAviso:"",
    descripcion:descO(o,n),
    estado:v(o,"estado_orden","estadoOT","estadoSAPOrden","estatus_sap","estado","Estado")||"REVISAR"
  }:a?{
    tipo:"AVISO",
    numero:n,
    fechaAviso:v(a,"fechaAviso","FechaAviso"),
    descripcion:descA(a),
    estado:v(a,"estadoAviso","estadoFinal","estado","Estado")||"REVISAR"
  }:null;

  $("msg").textContent=sel?"Registro encontrado.":"No encontrado en IW28/IW39.";
  paint()
}

function paint(){
  let s=sel;
  $("badge").textContent=s?s.tipo:"SIN SELECCIÓN";
  $("sapN").textContent=s?s.numero:"—";
  $("sapF").textContent=s&&s.tipo==="AVISO"?(s.fechaAviso||"—"):"—";
  $("sapD").textContent=s?(s.descripcion||"Sin descripción disponible en el JSON"):"—";
  $("sapE").textContent=s?s.estado:"—";
  $("tipo").value=s?s.tipo:"";
  $("nro").value=s?s.numero:"";
  $("desc").value=s?s.descripcion:""
}

async function add(){
  if(!sel)return alert("Primero busque un aviso u orden.");

  const fecha=$("fecha").value;
  if(!fecha)return alert("Seleccione fecha de ejecución.");

  $("agregar").disabled=true;

  try{
    const {error}=await db.from("planilla_semana").insert({
      tipo:sel.tipo,
      numero:sel.numero||null,
      fecha_aviso:sel.tipo==="AVISO" && sel.fechaAviso ? sel.fechaAviso : null,
      descripcion_ubicacion:null,
      ubic_tecnica:null,
      descripcion_equipo:null,
      equipo:null,
      descripcion_trabajo:sel.descripcion||"Sin descripción",
      fecha_ejecucion:fecha,
      estado_sap:sel.estado||null
    });

    if(error)throw error;

    base=parse(fecha);
    await cargarPlanilla();
    render();
    alert("Trabajo guardado correctamente en la planilla compartida.");
  }catch(e){
    console.error(e);
    alert("No se pudo guardar en Supabase: "+(e.message||e));
  }finally{
    $("agregar").disabled=false;
  }
}

async function addManual(){
  const linea=$("manualUbicacion").value;
  const eq=$("manualEquipo");
  const equipoCodigo=eq.value;
  const op=eq.options[eq.selectedIndex];
  const equipoDesc=op?.dataset?.desc||"";
  const ubicTecnica=op?.dataset?.ubic||$("manualUbicacion").options[$("manualUbicacion").selectedIndex]?.dataset?.ubic||"";
  const trabajo=$("manualDesc").value.trim();
  const fecha=$("manualFecha").value;

  if(!linea)return alert("Seleccione la línea / ubicación.");
  if(!equipoCodigo)return alert("Seleccione el equipo.");
  if(!trabajo)return alert("Ingrese la descripción del trabajo manual.");
  if(!fecha)return alert("Seleccione la fecha de ejecución.");

  $("manualAgregar").disabled=true;

  try{
    const {error}=await db.from("planilla_semana").insert({
      tipo:"MANUAL",
      numero:null,
      fecha_aviso:null,
      descripcion_ubicacion:linea,
      ubic_tecnica:ubicTecnica,
      descripcion_equipo:equipoDesc,
      equipo:equipoCodigo,
      descripcion_trabajo:trabajo,
      fecha_ejecucion:fecha,
      estado_sap:"MANUAL"
    });

    if(error)throw error;

    base=parse(fecha);
    $("manualUbicacion").value="";
    cargarEquipos();
    $("manualDesc").value="";
    $("manualFecha").value="";

    await cargarPlanilla();
    render();
    alert("Trabajo manual guardado correctamente en la planilla compartida.");
  }catch(e){
    console.error(e);
    alert("No se pudo guardar en Supabase: "+(e.message||e));
  }finally{
    $("manualAgregar").disabled=false;
  }
}

function render(){
  let[a,b]=rng(),q=$("q").value.toLowerCase();

  $("week").textContent=$("week2").textContent=fmt(a)+" - "+fmt(b);

  let r=items.filter(x=>{
    let d=parse(x.fechaEjecucion);
    return d>=a&&d<=b&&(!q||JSON.stringify(x).toLowerCase().includes(q))
  });

  $("tb").innerHTML=r.map(x=>`<tr>
    <td><span class="tag ${esc(x.tipo)}">${esc(x.tipo)}</span></td>
    <td>${esc(x.numero||"—")}</td>
    <td>${x.tipo==="AVISO"?esc(x.fechaAviso||"—"):"—"}</td>
    <td>${esc(x.descripcion||"—")}</td>
    <td>${fmt(parse(x.fechaEjecucion))}</td>
    <td>${x.tipo==="MANUAL"?"—":esc(x.estado||"—")}</td>
    <td><button class="trash" onclick="ask(${Number(x.id)})">🗑</button></td>
  </tr>`).join("")||'<tr><td colspan="7">Sin trabajos programados esta semana.</td></tr>';

  $("kt").textContent=r.length;
  $("ka").textContent=r.filter(x=>x.tipo==="AVISO").length;
  $("ko").textContent=r.filter(x=>x.tipo==="ORDEN").length;
  $("km").textContent=r.filter(x=>x.tipo==="MANUAL").length;
  $("kab").textContent=r.filter(x=>x.tipo!=="MANUAL"&&String(x.estado).toUpperCase().includes("ABIER")).length
}

window.ask=id=>{
  did=id;
  $("clave").value="";
  $("modal").classList.remove("hide")
};

$("del").onclick=async()=>{
  if($("clave").value!==KEY)return alert("Clave incorrecta.");

  $("del").disabled=true;

  try{
    const {error}=await db.from("planilla_semana").delete().eq("id",did);
    if(error)throw error;

    $("modal").classList.add("hide");
    await cargarPlanilla();
    render();
  }catch(e){
    console.error(e);
    alert("No se pudo eliminar el registro: "+(e.message||e));
  }finally{
    $("del").disabled=false;
  }
};

$("cancel").onclick=()=>$("modal").classList.add("hide");
$("buscar").onclick=search;
$("numero").onkeydown=e=>{if(e.key==="Enter")search()};
$("agregar").onclick=add;
$("manualUbicacion").onchange=cargarEquipos;
$("manualAgregar").onclick=addManual;
$("prev").onclick=()=>{base.setDate(base.getDate()-7);render()};
$("next").onclick=()=>{base.setDate(base.getDate()+7);render()};
$("q").oninput=render;

load();
