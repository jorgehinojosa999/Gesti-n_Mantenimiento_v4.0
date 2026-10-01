const DATA_URL = "data/plan_mantenimiento.json";
const MONTHS = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const MONTH_LABEL = {ENERO:"Ene",FEBRERO:"Feb",MARZO:"Mar",ABRIL:"Abr",MAYO:"May",JUNIO:"Jun",JULIO:"Jul",AGOSTO:"Ago",SEPTIEMBRE:"Sep",OCTUBRE:"Oct",NOVIEMBRE:"Nov",DICIEMBRE:"Dic"};

let rawData = [];
let page = 1;
let pageSize = 20;
let onlyMissing = false;
let monthlyChart = null;
let justificationChart = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function txt(v){
  if(v === null || v === undefined) return "";
  const s = String(v).trim();
  if(s === "0" || s === "0.0" || s === "#REF!" || s === "#N/A") return "";
  return s;
}
function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function money(v){
  return new Intl.NumberFormat("es-EC",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:2}).format(num(v));
}
function quantity(v){
  return new Intl.NumberFormat("es-EC",{minimumFractionDigits:0,maximumFractionDigits:2}).format(num(v));
}
function normalized(v){ return txt(v).toUpperCase(); }

function field(r, ...keys){
  for(const k of keys){
    if(Object.prototype.hasOwnProperty.call(r,k)) return r[k];
  }
  return null;
}

function getMonths(r){
  const vals = [
    field(r,"MES_DE_INICIO"),
    field(r,"MES_DE_INTERVENCION_2"),
    field(r,"MES_DE_INTERVENCION_3"),
    field(r,"MES_DE_INTERVENCION_4")
  ].map(normalized).filter(m => MONTHS.includes(m));
  return [...new Set(vals)];
}

function codeOf(r){ return txt(field(r,"CODIGO_SAP")); }
function lineOf(r){ return txt(field(r,"LINEA")); }
function equipOf(r){ return txt(field(r,"EQUIPO")); }
function freqOf(r){ return txt(field(r,"FRECUENCIA")); }
function critOf(r){ return txt(field(r,"CRITICIDAD")); }
function justOf(r){ return txt(field(r,"JUSTIFICACION")); }
function qtyOf(r){ return num(field(r,"CANTIDAD")); }
function unitOf(r){ return num(field(r,"VALOR_UNITARIO")); }
function totalOf(r){ return num(field(r,"VALOR_TOTAL")); }
function stockOf(r){ return num(field(r,"DISPONIBLE_EN__ALMACÉN","DISPONIBLE_EN_ALMACÉN","DISPONIBLE_EN_ _ALMACÉN")); }
function planOf(r){ return txt(field(r,"PLAN_DE_MANTEMIENTO","PLAN_DE_MANTENIMIENTO")); }

function checkedValues(containerId){
  return [...document.querySelectorAll(`#${containerId} input:checked`)].map(x => x.value);
}

function createCheck(container, values, name){
  container.innerHTML = values.map(v => `
    <label class="check-row">
      <input type="checkbox" name="${name}" value="${escapeHtml(v)}">
      <span title="${escapeHtml(v)}">${escapeHtml(v)}</span>
    </label>`).join("");
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g,m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
}

function uniqueValues(fn){
  return [...new Set(rawData.map(fn).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
}

function initializeFilters(){
  createCheck($("#filterMonth"), MONTHS, "month");
  createCheck($("#filterLine"), uniqueValues(lineOf), "line");
  createCheck($("#filterEquipment"), uniqueValues(equipOf), "equipment");
  createCheck($("#filterJustification"), uniqueValues(justOf), "justification");
  createCheck($("#filterCriticality"), uniqueValues(critOf), "criticality");
  createCheck($("#filterFrequency"), uniqueValues(freqOf), "frequency");

  $$(".filters-card input[type=checkbox]").forEach(el => el.addEventListener("change", () => {
    page = 1; render();
  }));
}

function rowMatchesNonMonthFilters(r){
  const selections = {
    line: checkedValues("filterLine"),
    equipment: checkedValues("filterEquipment"),
    justification: checkedValues("filterJustification"),
    criticality: checkedValues("filterCriticality"),
    frequency: checkedValues("filterFrequency")
  };
  if(selections.line.length && !selections.line.includes(lineOf(r))) return false;
  if(selections.equipment.length && !selections.equipment.includes(equipOf(r))) return false;
  if(selections.justification.length && !selections.justification.includes(justOf(r))) return false;
  if(selections.criticality.length && !selections.criticality.includes(critOf(r))) return false;
  if(selections.frequency.length && !selections.frequency.includes(freqOf(r))) return false;
  return true;
}

function occurrenceCount(r, selectedMonths){
  const ms = getMonths(r);
  if(selectedMonths.length) return ms.filter(m => selectedMonths.includes(m)).length;
  return ms.length; // sin filtro de mes = demanda anual explícita
}

function getFilteredRows(){
  const selectedMonths = checkedValues("filterMonth");
  return rawData
    .filter(rowMatchesNonMonthFilters)
    .map(r => ({r,occ:occurrenceCount(r,selectedMonths)}))
    .filter(x => x.occ > 0)
    .filter(x => {
      if(!onlyMissing) return true;
      const demandQty = qtyOf(x.r) * x.occ;
      return stockOf(x.r) < demandQty;
    });
}

function buildCodeConsolidation(filtered){
  const byCode = new Map();
  for(const x of filtered){
    const r = x.r;
    const code = codeOf(r);
    if(!code) continue;
    if(!byCode.has(code)){
      byCode.set(code,{qty:0,stock:0,unit:unitOf(r),coveredRows:0});
    }
    const g = byCode.get(code);
    g.qty += qtyOf(r) * x.occ;
    g.stock = Math.max(g.stock, stockOf(r));
    if(unitOf(r) > 0) g.unit = unitOf(r);
  }
  return byCode;
}

function updateKpis(filtered){
  const value = filtered.reduce((s,x)=>s + totalOf(x.r)*x.occ,0);
  const annualBase = rawData.filter(rowMatchesNonMonthFilters).reduce((s,r)=>s + totalOf(r)*getMonths(r).length,0);

  const selectedMonths = checkedValues("filterMonth");
  $("#kpiFilteredValue").textContent = money(value);
  $("#kpiSelectedMonths").textContent = selectedMonths.length ? selectedMonths.map(m=>MONTH_LABEL[m]).join(" · ") : "Todos los meses";

  $("#kpiAnnualValue").textContent = money(annualBase);
  $("#kpiRecords").textContent = `${rawData.length.toLocaleString("es-EC")} registros`;

  const materials = new Set(filtered.map(x=>codeOf(x.r)).filter(Boolean));
  const plans = new Set(filtered.map(x=>planOf(x.r)).filter(Boolean));
  $("#kpiMaterials").textContent = materials.size.toLocaleString("es-EC");
  $("#kpiPlans").textContent = `${plans.size.toLocaleString("es-EC")} planes`;

  const consolidated = buildCodeConsolidation(filtered);
  let covered=0, shortageValue=0;
  consolidated.forEach(g=>{
    if(g.stock >= g.qty) covered++;
    shortageValue += Math.max(g.qty-g.stock,0)*g.unit;
  });
  const coverage = consolidated.size ? covered/consolidated.size*100 : 0;
  $("#kpiStockCoverage").textContent = `${coverage.toFixed(0)}%`;
  $("#kpiStockCovered").textContent = `${covered.toLocaleString("es-EC")} materiales cubiertos`;
  $("#kpiShortage").textContent = money(shortageValue);
}

function statusFor(r, occ){
  const q = qtyOf(r)*occ, s = stockOf(r);
  if(q <= 0) return {label:"N/A",class:"badge-gray"};
  if(s >= q) return {label:"DISPONIBLE",class:"badge-green"};
  if(s > 0) return {label:"PARCIAL",class:"badge-amber"};
  return {label:"SIN STOCK",class:"badge-red"};
}
function critBadge(v){
  const u=normalized(v);
  if(u==="ALTO") return "crit-high";
  if(u==="MEDIO") return "crit-medium";
  if(u==="BAJO") return "crit-low";
  return "badge-gray";
}

function renderTable(filtered){
  pageSize = Number($("#pageSize").value);
  const totalPages = Math.max(1, Math.ceil(filtered.length/pageSize));
  if(page > totalPages) page = totalPages;
  const start=(page-1)*pageSize;
  const slice=filtered.slice(start,start+pageSize);
  const tbody=$("#demandTable tbody");

  if(!slice.length){
    tbody.innerHTML = `<tr><td colspan="13" class="empty">No hay registros para los filtros seleccionados.</td></tr>`;
  }else{
    tbody.innerHTML = slice.map(({r,occ})=>{
      const st=statusFor(r,occ);
      const months=getMonths(r).map(m=>MONTH_LABEL[m]).join(" · ");
      const c=critOf(r);
      return `<tr>
        <td>${escapeHtml(codeOf(r))}</td>
        <td title="${escapeHtml(txt(field(r,"DENOMINACION")))}">${escapeHtml(txt(field(r,"DENOMINACION")))}</td>
        <td class="num">${quantity(qtyOf(r)*occ)}</td>
        <td class="num">${money(unitOf(r))}</td>
        <td class="num"><strong>${money(totalOf(r)*occ)}</strong></td>
        <td>${escapeHtml(lineOf(r))}</td>
        <td>${escapeHtml(equipOf(r))}</td>
        <td>${escapeHtml(freqOf(r))}</td>
        <td>${escapeHtml(months)}</td>
        <td><span class="badge ${critBadge(c)}">${escapeHtml(c || "N/A")}</span></td>
        <td>${escapeHtml(justOf(r))}</td>
        <td class="num">${quantity(stockOf(r))}</td>
        <td><span class="badge ${st.class}">${st.label}</span></td>
      </tr>`;
    }).join("");
  }

  $("#resultSummary").textContent = `Mostrando ${filtered.length.toLocaleString("es-EC")} registros filtrados`;
  $("#pageInfo").textContent = `Página ${page} de ${totalPages}`;
  $("#prevPage").disabled = page<=1;
  $("#nextPage").disabled = page>=totalPages;
}

function monthlyData(){
  const base = rawData.filter(rowMatchesNonMonthFilters);
  return MONTHS.map(m => base.reduce((s,r)=>s + (getMonths(r).includes(m) ? totalOf(r) : 0),0));
}

function renderCharts(filtered){
  if(typeof Chart === "undefined") return;

  const monthly=monthlyData();
  const ctx1=$("#monthlyChart");
  if(monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx1,{
    type:"bar",
    data:{labels:MONTHS.map(m=>MONTH_LABEL[m]),datasets:[{label:"Demanda",data:monthly,backgroundColor:"#2696e5",borderRadius:5}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>money(c.raw)}}},
      scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{callback:v=>"$"+Intl.NumberFormat("es-EC",{notation:"compact"}).format(v)}}}
    }
  });

  const just = {};
  filtered.forEach(x=>{
    const k=justOf(x.r)||"SIN CLASIFICAR";
    just[k]=(just[k]||0)+totalOf(x.r)*x.occ;
  });
  const labels=Object.keys(just), values=Object.values(just);
  const ctx2=$("#justificationChart");
  if(justificationChart) justificationChart.destroy();
  justificationChart = new Chart(ctx2,{
    type:"doughnut",
    data:{labels,datasets:[{data:values,backgroundColor:["#0b5cb8","#57a6ea","#a9c9e8","#8aa2b8","#d4e3ef"],borderWidth:2,borderColor:"#fff"}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:"62%",plugins:{legend:{position:"right",labels:{boxWidth:10,font:{size:10}}},tooltip:{callbacks:{label:c=>`${c.label}: ${money(c.raw)}`}}}}
  });
}

function render(){
  const filtered=getFilteredRows();
  updateKpis(filtered);
  renderTable(filtered);
  renderCharts(filtered);
}

function filterVisible(containerId, searchId){
  const q=normalized($(searchId).value);
  $$(`#${containerId} .check-row`).forEach(el=>{
    el.style.display = normalized(el.innerText).includes(q) ? "" : "none";
  });
}

function exportCsv(){
  const filtered=getFilteredRows();
  const lines=[["CODIGO_SAP","DENOMINACION","CANTIDAD_DEMANDA","VALOR_UNITARIO","VALOR_DEMANDA","LINEA","EQUIPO","FRECUENCIA","MESES_PROGRAMADOS","CRITICIDAD","JUSTIFICACION","STOCK","ESTADO"]];
  filtered.forEach(({r,occ})=>{
    const st=statusFor(r,occ);
    lines.push([
      codeOf(r),txt(field(r,"DENOMINACION")),qtyOf(r)*occ,unitOf(r),totalOf(r)*occ,lineOf(r),equipOf(r),freqOf(r),
      getMonths(r).join(" / "),critOf(r),justOf(r),stockOf(r),st.label
    ]);
  });
  const esc=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const csv="\ufeff"+lines.map(row=>row.map(esc).join(";")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="demanda_plan_mantenimiento.csv";a.click();URL.revokeObjectURL(a.href);
}

function clearFilters(){
  $$(".filters-card input[type=checkbox]").forEach(x=>x.checked=false);
  $("#searchLine").value=""; $("#searchEquipment").value="";
  onlyMissing=false; $("#btnOnlyMissing").textContent="Ver faltantes";
  page=1; filterVisible("filterLine","#searchLine"); filterVisible("filterEquipment","#searchEquipment"); render();
}

async function init(){
  try{
    const res=await fetch(DATA_URL);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    rawData=await res.json();

    initializeFilters();

    $("#searchLine").addEventListener("input",()=>filterVisible("filterLine","#searchLine"));
    $("#searchEquipment").addEventListener("input",()=>filterVisible("filterEquipment","#searchEquipment"));
    $("#pageSize").addEventListener("change",()=>{page=1;render()});
    $("#prevPage").addEventListener("click",()=>{if(page>1){page--;render()}});
    $("#nextPage").addEventListener("click",()=>{page++;render()});
    $("#btnClear").addEventListener("click",clearFilters);
    $("#btnExport").addEventListener("click",exportCsv);
    $("#btnOnlyMissing").addEventListener("click",()=>{
      onlyMissing=!onlyMissing; page=1;
      $("#btnOnlyMissing").textContent=onlyMissing?"Ver todos":"Ver faltantes";
      render();
    });

    render();
  }catch(err){
    console.error(err);
    $("#resultSummary").textContent="No se pudo cargar data/plan_mantenimiento.json";
    $("#demandTable tbody").innerHTML=`<tr><td colspan="13" class="empty">Error cargando los datos. Publícalo mediante GitHub Pages; no abras el HTML directamente con file://.</td></tr>`;
  }
}
document.addEventListener("DOMContentLoaded",init);
