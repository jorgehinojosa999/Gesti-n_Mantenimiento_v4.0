const A="../data/avisos.json";
const O="../data/ordenes_sap.json";
const KEY="Ingenieria2026";
const S="planilla_semana_v2";

let av=[],ot=[],sel=null,base=new Date(),did=null;
let items=JSON.parse(localStorage.getItem(S)||localStorage.getItem("planilla_semana_v1")||"[]");

const $=x=>document.getElementById(x);
const v=(o,...k)=>{for(const x of k){if(o?.[x]!=null&&String(o[x]).trim())return String(o[x]).trim()}return""};
const cleanParts=(...p)=>p.map(x=>String(x||"").trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(" | ");

function mon(d){let x=new Date(d),n=x.getDay()||7;x.setDate(x.getDate()-n+1);x.setHours(0,0,0,0);return x}
function fmt(d){return d.toLocaleDateString("es-EC")}
function parse(s){let p=s.split("-");return new Date(+p[0],+p[1]-1,+p[2])}
function rng(){let a=mon(base),b=new Date(a);b.setDate(a.getDate()+6);return[a,b]}
function save(){localStorage.setItem(S,JSON.stringify(items))}

async function load(){
  try{
    let [a,o]=await Promise.all([fetch(A+"?t="+Date.now(),{cache:"no-store"}),fetch(O+"?t="+Date.now(),{cache:"no-store"})]);
    av=(await a.json()).data||[];
    let j=await o.json(); ot=j.data||j.ordenes||[];
    $("msg").textContent="Datos SAP cargados.";
  }catch(e){$("msg").textContent="Revise avisos.json / ordenes_sap.json"}
  render()
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
  // Primero usa descripciones publicadas directamente desde IW39.
  let d=cleanParts(
    v(o,"descripcion","Descripcion"),
    v(o,"descripcion1","Descripcion1"),
    v(o,"descripcion2","Descripcion2"),
    v(o,"texto_breve","textoBreve","Texto breve","TextoBreve")
  );
  // Si la OT nació de un aviso, completa con las 3 descripciones de IW28.
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
    tipo:"ORDEN",numero:n,fechaAviso:"",
    descripcion:descO(o,n),
    estado:v(o,"estado_orden","estadoOT","estadoSAPOrden","estatus_sap","estado","Estado")||"REVISAR"
  }:a?{
    tipo:"AVISO",numero:n,fechaAviso:v(a,"fechaAviso","FechaAviso"),
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

function add(){
  if(!sel)return alert("Primero busque un aviso u orden.");
  if(!$("fecha").value)return alert("Seleccione fecha de ejecución.");
  items.push({...sel,fechaEjecucion:$("fecha").value,id:Date.now()});
  save();
  base=parse($("fecha").value); // cambia automáticamente a la semana programada
  render();
}

function addManual(){
  const descripcion=$("manualDesc").value.trim();
  const fecha=$("manualFecha").value;
  if(!descripcion)return alert("Ingrese la descripción del trabajo manual.");
  if(!fecha)return alert("Seleccione la fecha de ejecución.");
  items.push({
    tipo:"MANUAL",
    numero:$("manualNro").value.trim()||"—",
    fechaAviso:"",
    descripcion,
    estado:"MANUAL",
    fechaEjecucion:fecha,
    id:Date.now()
  });
  save();
  base=parse(fecha);
  $("manualNro").value="";
  $("manualDesc").value="";
  $("manualFecha").value="";
  render();
}

function render(){
  let[a,b]=rng(),q=$("q").value.toLowerCase();
  $("week").textContent=$("week2").textContent=fmt(a)+" - "+fmt(b);

  let r=items.filter(x=>{
    let d=parse(x.fechaEjecucion);
    return d>=a&&d<=b&&(!q||JSON.stringify(x).toLowerCase().includes(q))
  });

  $("tb").innerHTML=r.map(x=>`<tr>
    <td><span class="tag ${x.tipo}">${x.tipo}</span></td>
    <td>${x.numero||"—"}</td>
    <td>${x.tipo==="AVISO"?(x.fechaAviso||"—"):"—"}</td>
    <td>${x.descripcion||"—"}</td>
    <td>${fmt(parse(x.fechaEjecucion))}</td>
    <td>${x.tipo==="MANUAL"?"—":(x.estado||"—")}</td>
    <td><button class="trash" onclick="ask(${x.id})">🗑</button></td>
  </tr>`).join("")||'<tr><td colspan="7">Sin trabajos programados esta semana.</td></tr>';

  $("kt").textContent=r.length;
  $("ka").textContent=r.filter(x=>x.tipo==="AVISO").length;
  $("ko").textContent=r.filter(x=>x.tipo==="ORDEN").length;
  $("km").textContent=r.filter(x=>x.tipo==="MANUAL").length;
  $("kab").textContent=r.filter(x=>x.tipo!=="MANUAL"&&String(x.estado).toUpperCase().includes("ABIER")).length
}

window.ask=id=>{did=id;$("clave").value="";$("modal").classList.remove("hide")};
$("del").onclick=()=>{
  if($("clave").value!==KEY)return alert("Clave incorrecta.");
  items=items.filter(x=>x.id!==did);save();$("modal").classList.add("hide");render()
};
$("cancel").onclick=()=>$("modal").classList.add("hide");
$("buscar").onclick=search;
$("numero").onkeydown=e=>{if(e.key==="Enter")search()};
$("agregar").onclick=add;
$("manualAgregar").onclick=addManual;
$("prev").onclick=()=>{base.setDate(base.getDate()-7);render()};
$("next").onclick=()=>{base.setDate(base.getDate()+7);render()};
$("q").oninput=render;
load();