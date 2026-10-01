const DATA_URL = "data/plan_mantenimiento.json";

const MONTHS = [
  "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
];

const MONTH_LABEL = {
  ENERO:"Ene", FEBRERO:"Feb", MARZO:"Mar", ABRIL:"Abr",
  MAYO:"May", JUNIO:"Jun", JULIO:"Jul", AGOSTO:"Ago",
  SEPTIEMBRE:"Sep", OCTUBRE:"Oct", NOVIEMBRE:"Nov", DICIEMBRE:"Dic"
};

let rawData = [];
let page = 1;
let pageSize = 20;
let onlyMissing = false;
let monthlyChart = null;
let justificationChart = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* =========================================================
   1. LIMPIEZA Y NORMALIZACIÓN
   ========================================================= */

function txt(v){
  if(v === null || v === undefined) return "";
  let s = String(v).trim();
  if(["0","0.0","#REF!","#N/A","N/A","NULL","UNDEFINED"].includes(s.toUpperCase())) return "";
  return s;
}

function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeSpaces(v){
  return txt(v).replace(/\s+/g, " ").trim();
}

/* clave para comparar: quita acentos, espacios dobles, signos extra */
function normKey(v){
  return normalizeSpaces(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[._-]+/g," ")
    .replace(/\s+/g," ")
    .trim()
    .toUpperCase();
}

/* texto visible unificado */
function upperDisplay(v){
  return normalizeSpaces(v).toUpperCase();
}

/* -------- LINEA -------- */
function lineOf(r){
  const original = field(r,"LINEA");
  let k = normKey(original);

  const aliases = {
    "SIPA16":"SIPA 16",
    "SIPA 16":"SIPA 16",
    "SIPA20":"SIPA 20",
    "SIPA 20":"SIPA 20",
    "EVO20":"EVO 20",
    "EVO 20":"EVO 20",
    "KOMPAS":"KOMPASS",
    "KOMPASS":"KOMPASS",
    "BIDON":"BIDON",
    "GALON":"GALON",
    "SOPLADORA SFR16":"SOPLADORA SFR 16",
    "SOPLADORA SFR 16":"SOPLADORA SFR 16",
    "SOPLADORA SIAPI20":"SOPLADORA SIAPI 20",
    "SOPLADORA SIAPI 20":"SOPLADORA SIAPI 20",
    "SOPLADORA SBO 12":"SOPLADORA SBO12",
    "SOPLADORA SBO12":"SOPLADORA SBO12",
    "XTRA12":"XTRA 12",
    "XTRA 12":"XTRA 12"
  };

  return aliases[k] || k;
}

/* -------- EQUIPO -------- */
function equipOf(r){
  return normKey(field(r,"EQUIPO"));
}

/* -------- SISTEMA -------- */
function systemOf(r){
  return normKey(field(r,"SISTEMA"));
}

/* -------- JUSTIFICACION -------- */
function justOf(r){
  let k = normKey(field(r,"JUSTIFICACION"));

  if(k === "SERVICIO" || k === "SERVICIOS"){
    return "SERVICIOS";
  }

  return k;
}

/* -------- CRITICIDAD -------- */
function critOf(r){
  let k = normKey(field(r,"CRITICIDAD"));

  if(k === "ALTA") return "ALTO";
  if(k === "MEDIA") return "MEDIO";
  if(k === "BAJA") return "BAJO";

  return k;
}

/* -------- FRECUENCIA -------- */
function freqOf(r){
  let k = normKey(field(r,"FRECUENCIA"));

  const aliases = {
    "BI MENSUAL":"BI-MENSUAL",
    "BIMENSUAL":"BI-MENSUAL",
    "BI ANUAL":"BI-ANUAL",
    "BIANUAL":"BI-ANUAL",
    "TRI ANUAL":"TRI-ANUAL",
    "TRIANUAL":"TRI-ANUAL",
    "CUATRI ANUAL":"CUATRI-ANUAL",
    "CUATRIANUAL":"CUATRI-ANUAL"
  };

  return aliases[k] || k;
}

/* =========================================================
   2. CAMPOS
   ========================================================= */

function field(r,...keys){
  for(const k of keys){
    if(Object.prototype.hasOwnProperty.call(r,k)) return r[k];
  }
  return null;
}

function getMonths(r){
  const values = [
    field(r,"MES_DE_INICIO"),
    field(r,"MES_DE_INTERVENCION_2"),
    field(r,"MES_DE_INTERVENCION_3"),
    field(r,"MES_DE_INTERVENCION_4")
  ]
  .map(normKey)
  .filter(m => MONTHS.includes(m));

  return [...new Set(values)];
}

function codeOf(r){ return txt(field(r,"CODIGO_SAP")); }
function qtyOf(r){ return num(field(r,"CANTIDAD")); }
function unitOf(r){ return num(field(r,"VALOR_UNITARIO")); }
function totalOf(r){ return num(field(r,"VALOR_TOTAL")); }

function planOf(r){
  return txt(field(r,"PLAN_DE_MANTEMIENTO","PLAN_DE_MANTENIMIENTO"));
}

function stockOf(r){
  return num(field(
    r,
    "DISPONIBLE_EN__ALMACÉN",
    "DISPONIBLE_EN_ALMACÉN",
    "DISPONIBLE_EN_ _ALMACÉN"
  ));
}

/* =========================================================
   3. FORMATOS
   ========================================================= */

function money(v){
  return new Intl.NumberFormat("es-EC",{
    style:"currency",
    currency:"USD",
    minimumFractionDigits:0,
    maximumFractionDigits:2
  }).format(num(v));
}

function quantity(v){
  return new Intl.NumberFormat("es-EC",{
    minimumFractionDigits:0,
    maximumFractionDigits:2
  }).format(num(v));
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g,m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#039;"
  }[m]));
}

/* =========================================================
   4. CONFIGURACIÓN DE FILTROS
   ========================================================= */

const FILTERS = {
  month: {
    container:"filterMonth",
    get:r => getMonths(r)
  },
  line: {
    container:"filterLine",
    get:r => lineOf(r)
  },
  equipment: {
    container:"filterEquipment",
    get:r => equipOf(r)
  },
  justification: {
    container:"filterJustification",
    get:r => justOf(r)
  },
  criticality: {
    container:"filterCriticality",
    get:r => critOf(r)
  },
  frequency: {
    container:"filterFrequency",
    get:r => freqOf(r)
  }
};

function selectedValues(filterName){
  const id = FILTERS[filterName].container;
  return [...document.querySelectorAll(`#${id} input:checked`)]
    .map(x => x.value);
}

function allSelections(){
  const result = {};
  Object.keys(FILTERS).forEach(name => {
    result[name] = selectedValues(name);
  });
  return result;
}

/* =========================================================
   5. MOTOR DE FILTROS TIPO POWER BI
   ========================================================= */

function matchesFilter(row, filterName, selected){
  if(!selected.length) return true;

  const value = FILTERS[filterName].get(row);

  if(filterName === "month"){
    return selected.some(x => value.includes(x));
  }

  return selected.includes(value);
}

/*
  Comprueba una fila contra todos los filtros.
  ignore = filtro que estamos recalculando.
*/
function matchesAll(row, selections, ignore = null){
  for(const name of Object.keys(FILTERS)){
    if(name === ignore) continue;

    if(!matchesFilter(row,name,selections[name])){
      return false;
    }
  }

  return true;
}

/*
  Esta es la parte Power BI:
  para cada segmentador, calcula qué valores siguen disponibles
  considerando TODOS los demás segmentadores.
*/
function availableValues(filterName, selections){
  const validRows = rawData.filter(row =>
    matchesAll(row,selections,filterName)
  );

  if(filterName === "month"){
    const set = new Set();

    validRows.forEach(row => {
      getMonths(row).forEach(m => set.add(m));
    });

    return MONTHS.filter(m => set.has(m));
  }

  const set = new Set();

  validRows.forEach(row => {
    const value = FILTERS[filterName].get(row);
    if(value) set.add(value);
  });

  return [...set].sort((a,b)=>a.localeCompare(b,"es"));
}

/* =========================================================
   6. CREACIÓN DE SEGMENTADORES
   ========================================================= */

function renderFilter(filterName, values, selected = []){
  const container = document.getElementById(FILTERS[filterName].container);
  const selectedSet = new Set(selected);

  container.innerHTML = values.map(v => `
    <label class="check-row">
      <input
        type="checkbox"
        value="${escapeHtml(v)}"
        ${selectedSet.has(v) ? "checked" : ""}
      >
      <span title="${escapeHtml(v)}">${escapeHtml(v)}</span>
    </label>
  `).join("");

  container.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener("change", onFilterChanged);
  });
}

function refreshAllFilters(){
  const selections = allSelections();

  Object.keys(FILTERS).forEach(filterName => {
    const available = availableValues(filterName,selections);
    const selected = selections[filterName];

    /*
      Mantiene visibles los seleccionados para que el usuario
      pueda desmarcarlos aunque otro filtro los deje sin coincidencias.
    */
    let values;

    if(filterName === "month"){
      values = MONTHS.filter(m =>
        available.includes(m) || selected.includes(m)
      );
    }else{
      values = [...new Set([...selected,...available])]
        .sort((a,b)=>a.localeCompare(b,"es"));
    }

    renderFilter(filterName,values,selected);
  });

  applySearchBoxes();
}

function initializeFilters(){
  const empty = {
    month:[],
    line:[],
    equipment:[],
    justification:[],
    criticality:[],
    frequency:[]
  };

  Object.keys(FILTERS).forEach(name => {
    renderFilter(
      name,
      availableValues(name,empty),
      []
    );
  });
}

function onFilterChanged(){
  page = 1;

  /* primero recalcular los demás segmentadores */
  refreshAllFilters();

  /* luego actualizar tabla, KPI y gráficos */
  renderDashboard();
}

/* =========================================================
   7. FILTRADO DE DATOS
   ========================================================= */

function occurrenceCount(row, selectedMonths){
  const months = getMonths(row);

  if(selectedMonths.length){
    return months.filter(m => selectedMonths.includes(m)).length;
  }

  return months.length;
}

function filteredRows(){
  const selections = allSelections();

  return rawData
    .filter(row => matchesAll(row,selections))
    .map(row => ({
      r:row,
      occ:occurrenceCount(row,selections.month)
    }))
    .filter(x => x.occ > 0)
    .filter(x => {
      if(!onlyMissing) return true;
      return stockOf(x.r) < qtyOf(x.r) * x.occ;
    });
}

/* =========================================================
   8. KPI
   ========================================================= */

function consolidateByCode(filtered){
  const map = new Map();

  filtered.forEach(({r,occ}) => {
    const code = codeOf(r);
    if(!code) return;

    if(!map.has(code)){
      map.set(code,{
        qty:0,
        stock:0,
        unit:unitOf(r)
      });
    }

    const g = map.get(code);

    g.qty += qtyOf(r) * occ;
    g.stock = Math.max(g.stock,stockOf(r));

    if(unitOf(r) > 0){
      g.unit = unitOf(r);
    }
  });

  return map;
}

function updateKpis(filtered){
  const selections = allSelections();

  const filteredValue = filtered.reduce(
    (sum,x) => sum + totalOf(x.r) * x.occ,
    0
  );

  const withoutMonth = {
    ...selections,
    month:[]
  };

  const annualValue = rawData
    .filter(row => matchesAll(row,withoutMonth))
    .reduce(
      (sum,row) =>
        sum + totalOf(row) * getMonths(row).length,
      0
    );

  $("#kpiFilteredValue").textContent = money(filteredValue);

  $("#kpiSelectedMonths").textContent =
    selections.month.length
      ? selections.month.map(m => MONTH_LABEL[m]).join(" · ")
      : "Todos los meses";

  $("#kpiAnnualValue").textContent = money(annualValue);

  $("#kpiRecords").textContent =
    `${rawData.length.toLocaleString("es-EC")} registros`;

  const materials = new Set(
    filtered.map(x => codeOf(x.r)).filter(Boolean)
  );

  const plans = new Set(
    filtered.map(x => planOf(x.r)).filter(Boolean)
  );

  $("#kpiMaterials").textContent =
    materials.size.toLocaleString("es-EC");

  $("#kpiPlans").textContent =
    `${plans.size.toLocaleString("es-EC")} planes`;

  const consolidated = consolidateByCode(filtered);

  let covered = 0;
  let shortageValue = 0;

  consolidated.forEach(g => {
    if(g.stock >= g.qty){
      covered++;
    }

    shortageValue +=
      Math.max(g.qty-g.stock,0) * g.unit;
  });

  const coverage =
    consolidated.size
      ? covered / consolidated.size * 100
      : 0;

  $("#kpiStockCoverage").textContent =
    `${coverage.toFixed(0)}%`;

  $("#kpiStockCovered").textContent =
    `${covered.toLocaleString("es-EC")} materiales cubiertos`;

  $("#kpiShortage").textContent =
    money(shortageValue);
}

/* =========================================================
   9. TABLA
   ========================================================= */

function statusFor(r,occ){
  const demand = qtyOf(r) * occ;
  const stock = stockOf(r);

  if(demand <= 0){
    return {label:"N/A",class:"badge-gray"};
  }

  if(stock >= demand){
    return {label:"DISPONIBLE",class:"badge-green"};
  }

  if(stock > 0){
    return {label:"PARCIAL",class:"badge-amber"};
  }

  return {label:"SIN STOCK",class:"badge-red"};
}

function critBadge(v){
  if(v === "ALTO") return "crit-high";
  if(v === "MEDIO") return "crit-medium";
  if(v === "BAJO") return "crit-low";
  return "badge-gray";
}

function renderTable(filtered){
  pageSize = Number($("#pageSize").value);

  const totalPages =
    Math.max(1,Math.ceil(filtered.length/pageSize));

  if(page > totalPages){
    page = totalPages;
  }

  const start = (page-1) * pageSize;
  const rows = filtered.slice(start,start+pageSize);

  const tbody = $("#demandTable tbody");

  if(!rows.length){
    tbody.innerHTML = `
      <tr>
        <td colspan="13" class="empty">
          No existen registros para los filtros seleccionados.
        </td>
      </tr>
    `;
  }else{
    tbody.innerHTML = rows.map(({r,occ}) => {

      const st = statusFor(r,occ);

      const months = getMonths(r)
        .map(m => MONTH_LABEL[m])
        .join(" · ");

      const crit = critOf(r);

      return `
        <tr>
          <td>${escapeHtml(codeOf(r))}</td>

          <td title="${escapeHtml(txt(field(r,"DENOMINACION")))}">
            ${escapeHtml(txt(field(r,"DENOMINACION")))}
          </td>

          <td class="num">
            ${quantity(qtyOf(r)*occ)}
          </td>

          <td class="num">
            ${money(unitOf(r))}
          </td>

          <td class="num">
            <strong>${money(totalOf(r)*occ)}</strong>
          </td>

          <td>${escapeHtml(lineOf(r))}</td>

          <td>${escapeHtml(equipOf(r))}</td>

          <td>${escapeHtml(freqOf(r))}</td>

          <td>${escapeHtml(months)}</td>

          <td>
            <span class="badge ${critBadge(crit)}">
              ${escapeHtml(crit || "N/A")}
            </span>
          </td>

          <td>${escapeHtml(justOf(r))}</td>

          <td class="num">
            ${quantity(stockOf(r))}
          </td>

          <td>
            <span class="badge ${st.class}">
              ${st.label}
            </span>
          </td>

        </tr>
      `;
    }).join("");
  }

  $("#resultSummary").textContent =
    `Mostrando ${filtered.length.toLocaleString("es-EC")} registros filtrados`;

  $("#pageInfo").textContent =
    `Página ${page} de ${totalPages}`;

  $("#prevPage").disabled = page <= 1;
  $("#nextPage").disabled = page >= totalPages;
}

/* =========================================================
   10. GRÁFICOS
   ========================================================= */

function monthlyData(){
  const selections = allSelections();

  const withoutMonth = {
    ...selections,
    month:[]
  };

  const base = rawData.filter(row =>
    matchesAll(row,withoutMonth)
  );

  return MONTHS.map(month =>
    base.reduce(
      (sum,row) =>
        sum + (
          getMonths(row).includes(month)
            ? totalOf(row)
            : 0
        ),
      0
    )
  );
}

function renderCharts(filtered){
  if(typeof Chart === "undefined") return;

  if(monthlyChart){
    monthlyChart.destroy();
  }

  monthlyChart = new Chart(
    $("#monthlyChart"),
    {
      type:"bar",
      data:{
        labels:MONTHS.map(m => MONTH_LABEL[m]),
        datasets:[{
          label:"Demanda",
          data:monthlyData(),
          backgroundColor:"#2696e5",
          borderRadius:5
        }]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{
            callbacks:{
              label:c => money(c.raw)
            }
          }
        },
        scales:{
          x:{grid:{display:false}},
          y:{beginAtZero:true}
        }
      }
    }
  );

  const justification = {};

  filtered.forEach(x => {
    const k = justOf(x.r) || "SIN CLASIFICAR";

    justification[k] =
      (justification[k] || 0) +
      totalOf(x.r) * x.occ;
  });

  if(justificationChart){
    justificationChart.destroy();
  }

  justificationChart = new Chart(
    $("#justificationChart"),
    {
      type:"doughnut",
      data:{
        labels:Object.keys(justification),
        datasets:[{
          data:Object.values(justification),
          backgroundColor:[
            "#0b5cb8",
            "#57a6ea",
            "#a9c9e8",
            "#8aa2b8",
            "#d4e3ef"
          ],
          borderWidth:2,
          borderColor:"#fff"
        }]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        cutout:"62%",
        plugins:{
          legend:{
            position:"right",
            labels:{
              boxWidth:10,
              font:{size:10}
            }
          },
          tooltip:{
            callbacks:{
              label:c =>
                `${c.label}: ${money(c.raw)}`
            }
          }
        }
      }
    }
  );
}

/* =========================================================
   11. BUSCADORES
   ========================================================= */

function filterVisible(containerId,inputId){
  const input = $(inputId);
  if(!input) return;

  const search = normKey(input.value);

  $$(`#${containerId} .check-row`).forEach(row => {
    row.style.display =
      normKey(row.innerText).includes(search)
        ? ""
        : "none";
  });
}

function applySearchBoxes(){
  filterVisible("filterLine","#searchLine");
  filterVisible("filterEquipment","#searchEquipment");
}

/* =========================================================
   12. EXPORTAR
   ========================================================= */

function exportCsv(){
  const filtered = filteredRows();

  const lines = [[
    "CODIGO_SAP",
    "DENOMINACION",
    "CANTIDAD_DEMANDA",
    "VALOR_UNITARIO",
    "VALOR_DEMANDA",
    "LINEA",
    "EQUIPO",
    "SISTEMA",
    "FRECUENCIA",
    "MESES_PROGRAMADOS",
    "CRITICIDAD",
    "JUSTIFICACION",
    "STOCK",
    "ESTADO"
  ]];

  filtered.forEach(({r,occ}) => {

    lines.push([
      codeOf(r),
      txt(field(r,"DENOMINACION")),
      qtyOf(r)*occ,
      unitOf(r),
      totalOf(r)*occ,
      lineOf(r),
      equipOf(r),
      systemOf(r),
      freqOf(r),
      getMonths(r).join(" / "),
      critOf(r),
      justOf(r),
      stockOf(r),
      statusFor(r,occ).label
    ]);

  });

  const quote = v =>
    `"${String(v ?? "").replaceAll('"','""')}"`;

  const csv =
    "\ufeff" +
    lines
      .map(row => row.map(quote).join(";"))
      .join("\n");

  const blob =
    new Blob([csv],{
      type:"text/csv;charset=utf-8"
    });

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    "demanda_plan_mantenimiento.csv";

  a.click();

  URL.revokeObjectURL(a.href);
}

/* =========================================================
   13. LIMPIAR
   ========================================================= */

function clearFilters(){
  $$(".filters-card input[type=checkbox]")
    .forEach(x => x.checked = false);

  $("#searchLine").value = "";
  $("#searchEquipment").value = "";

  onlyMissing = false;

  $("#btnOnlyMissing").textContent =
    "Ver faltantes";

  page = 1;

  refreshAllFilters();
  renderDashboard();
}

/* =========================================================
   14. RENDER GENERAL
   ========================================================= */

function renderDashboard(){
  const filtered = filteredRows();

  updateKpis(filtered);
  renderTable(filtered);
  renderCharts(filtered);
}

/* =========================================================
   15. INICIO
   ========================================================= */

async function init(){

  try{

    const response =
      await fetch(DATA_URL,{
        cache:"no-store"
      });

    if(!response.ok){
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    rawData =
      await response.json();

    initializeFilters();

    $("#searchLine")
      .addEventListener(
        "input",
        ()=>filterVisible(
          "filterLine",
          "#searchLine"
        )
      );

    $("#searchEquipment")
      .addEventListener(
        "input",
        ()=>filterVisible(
          "filterEquipment",
          "#searchEquipment"
        )
      );

    $("#pageSize")
      .addEventListener(
        "change",
        ()=>{
          page = 1;
          renderDashboard();
        }
      );

    $("#prevPage")
      .addEventListener(
        "click",
        ()=>{
          if(page > 1){
            page--;
            renderDashboard();
          }
        }
      );

    $("#nextPage")
      .addEventListener(
        "click",
        ()=>{
          page++;
          renderDashboard();
        }
      );

    $("#btnClear")
      .addEventListener(
        "click",
        clearFilters
      );

    $("#btnExport")
      .addEventListener(
        "click",
        exportCsv
      );

    $("#btnOnlyMissing")
      .addEventListener(
        "click",
        ()=>{
          onlyMissing =
            !onlyMissing;

          page = 1;

          $("#btnOnlyMissing")
            .textContent =
              onlyMissing
                ? "Ver todos"
                : "Ver faltantes";

          renderDashboard();
        }
      );

    renderDashboard();

  }catch(error){

    console.error(error);

    $("#resultSummary").textContent =
      "No se pudo cargar la base del plan.";

    $("#demandTable tbody").innerHTML = `
      <tr>
        <td colspan="13" class="empty">
          Error cargando data/plan_mantenimiento.json
        </td>
      </tr>
    `;
  }
}

document.addEventListener(
  "DOMContentLoaded",
  init
);
