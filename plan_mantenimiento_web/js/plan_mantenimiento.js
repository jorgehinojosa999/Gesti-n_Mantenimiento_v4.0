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

/* ======================================================
   BASE LOCAL PERSISTENTE (INDEXEDDB)
   ====================================================== */

const DB_NAME = "PlanMantenimientoDB";
const DB_VERSION = 1;
const STORE_NAME = "datasets";
const DATASET_KEY = "current";

function openDataDb(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME,DB_VERSION);

    req.onupgradeneeded = event => {
      const db = event.target.result;
      if(!db.objectStoreNames.contains(STORE_NAME)){
        db.createObjectStore(STORE_NAME,{keyPath:"id"});
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveLocalDataset(rows,fileName){
  const db = await openDataDb();

  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE_NAME,"readwrite");
    tx.objectStore(STORE_NAME).put({
      id:DATASET_KEY,
      rows,
      fileName:fileName || "Excel cargado",
      updatedAt:new Date().toISOString()
    });

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function loadLocalDataset(){
  const db = await openDataDb();

  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE_NAME,"readonly");
    const req = tx.objectStore(STORE_NAME).get(DATASET_KEY);

    req.onsuccess = () => {
      const value = req.result || null;
      db.close();
      resolve(value);
    };

    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

function updateDataSourceStatus(source){
  const el = document.getElementById("dataSourceStatus");
  if(!el) return;

  if(!source){
    el.textContent = "Base inicial del portal";
    return;
  }

  const date = source.updatedAt
    ? new Date(source.updatedAt).toLocaleString("es-EC")
    : "";

  el.textContent =
    `${source.fileName || "Excel cargado"}${date ? " · última carga: " + date : ""}`;
}

function normalizeExcelHeader(value){
  const base = String(value ?? "")
    .replace(/\n/g," ")
    .replace(/\s+/g," ")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toUpperCase();

  const aliases = {
    "CODIGO SAP":"CODIGO_SAP",
    "CODIGO_SAP":"CODIGO_SAP",
    "DENOMINACION":"DENOMINACION",
    "CANTIDAD":"CANTIDAD",
    "UNIDAD":"UNIDAD",
    "SISTEMA":"SISTEMA",
    "EQUIPO":"EQUIPO",
    "LINEA":"LINEA",
    "PLAN S4":"PLAN_S4",
    "PLAN_S4":"PLAN_S4",
    "PLAN DE MANTEMIENTO":"PLAN_DE_MANTEMIENTO",
    "PLAN_DE_MANTEMIENTO":"PLAN_DE_MANTEMIENTO",
    "PLAN DE MANTENIMIENTO":"PLAN_DE_MANTENIMIENTO",
    "PLAN_DE_MANTENIMIENTO":"PLAN_DE_MANTENIMIENTO",
    "HOJA DE RUTA":"HOJA_DE_RUTA",
    "HOJA_DE_RUTA":"HOJA_DE_RUTA",
    "FRECUENCIA":"FRECUENCIA",
    "MES DE INICIO":"MES_DE_INICIO",
    "MES_DE_INICIO":"MES_DE_INICIO",
    "MES DE INTERVENCION 2":"MES_DE_INTERVENCION_2",
    "MES_DE_INTERVENCION_2":"MES_DE_INTERVENCION_2",
    "MES DE INTERVENCION 3":"MES_DE_INTERVENCION_3",
    "MES_DE_INTERVENCION_3":"MES_DE_INTERVENCION_3",
    "MES DE INTERVENCION 4":"MES_DE_INTERVENCION_4",
    "MES_DE_INTERVENCION_4":"MES_DE_INTERVENCION_4",
    "VALOR UNITARIO":"VALOR_UNITARIO",
    "VALOR_UNITARIO":"VALOR_UNITARIO",
    "VALOR TOTAL":"VALOR_TOTAL",
    "VALOR_TOTAL":"VALOR_TOTAL",
    "CRITICIDAD":"CRITICIDAD",
    "JUSTIFICACION":"JUSTIFICACION",
    "DISPONIBLE EN ALMACEN":"DISPONIBLE_EN_ALMACEN",
    "DISPONIBLE_EN ALMACEN":"DISPONIBLE_EN_ALMACEN",
    "DISPONIBLE_EN_ALMACEN":"DISPONIBLE_EN_ALMACEN",
    "VALOR $ DEL PLAN":"VALOR_USD_DEL_PLAN",
    "VALOR_$_DEL_PLAN":"VALOR_USD_DEL_PLAN",
    "ESTATUS":"ESTATUS",
    "OBSERVACIONES":"OBSERVACIONES"
  };

  if(aliases[base]){
    return aliases[base];
  }

  return base
    .replace(/\$/g,"USD")
    .replace(/[^A-Z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");
}

function parseExcelWorkbook(arrayBuffer){
  if(typeof XLSX === "undefined"){
    throw new Error("No se pudo cargar el lector de Excel.");
  }

  const workbook = XLSX.read(arrayBuffer,{
    type:"array",
    cellDates:false,
    raw:true
  });

  if(!workbook.SheetNames.length){
    throw new Error("El archivo Excel no contiene hojas.");
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const matrix = XLSX.utils.sheet_to_json(sheet,{
    header:1,
    defval:null,
    raw:true
  });

  if(matrix.length < 2){
    throw new Error("La hoja no contiene información suficiente.");
  }

  const headers = [];
  const counts = {};

  matrix[0].forEach((h,index)=>{
    let key = normalizeExcelHeader(h);

    if(!key){
      key = `COLUMNA_${index+1}`;
    }

    counts[key] = (counts[key] || 0) + 1;

    if(counts[key] > 1){
      key = `${key}_${counts[key]}`;
    }

    headers.push(key);
  });

  const rows = matrix
    .slice(1)
    .filter(row =>
      row.some(v =>
        v !== null &&
        v !== undefined &&
        v !== "" &&
        v !== 0
      )
    )
    .map(row => {
      const obj = {};
      headers.forEach((h,i)=>{
        obj[h] = row[i] ?? null;
      });
      return obj;
    });

  const required = [
    "CODIGO_SAP",
    "DENOMINACION",
    "SISTEMA",
    "EQUIPO",
    "LINEA",
    "FRECUENCIA",
    "MES_DE_INICIO",
    "VALOR_TOTAL"
  ];

  const missing = required.filter(
    col => !headers.includes(col)
  );

  if(missing.length){
    throw new Error(
      "Faltan columnas requeridas: " + missing.join(", ")
    );
  }

  return rows;
}

function clearFilterContainers(){
  [
    "filterMonth",
    "filterLine",
    "filterEquipment",
    "filterSystem",
    "filterJustification",
    "filterCriticality",
    "filterFrequency"
  ].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.innerHTML = "";
  });

  if($("#searchLine")) $("#searchLine").value = "";
  if($("#searchEquipment")) $("#searchEquipment").value = "";
  if($("#searchSystem")) $("#searchSystem").value = "";
}

async function handleExcelUpload(file){
  if(!file) return;

  try{
    const btn = $("#btnUploadExcel");

    if(btn){
      btn.disabled = true;
      btn.textContent = "Procesando...";
    }

    const rows = parseExcelWorkbook(
      await file.arrayBuffer()
    );

    await saveLocalDataset(
      rows,
      file.name
    );

    rawData = rows;
    page = 1;
    onlyMissing = false;

    clearFilterContainers();
    initializeFilters();
    renderDashboard();

    updateDataSourceStatus({
      fileName:file.name,
      updatedAt:new Date().toISOString()
    });

    alert(
      `Archivo cargado correctamente.\n\nRegistros: ${rows.length.toLocaleString("es-EC")}\n\nLa información permanecerá guardada en este navegador hasta que cargues otro Excel.`
    );

  }catch(error){

    console.error(error);

    alert(
      "No se pudo cargar el Excel.\n\n" +
      (error.message || error)
    );

  }finally{

    const btn = $("#btnUploadExcel");

    if(btn){
      btn.disabled = false;
      btn.textContent = "Cargar Excel";
    }

    const input = $("#excelFile");

    if(input){
      input.value = "";
    }
  }
}


function txt(v){
  if(v === null || v === undefined) return "";
  const s = String(v).trim();

  if([
    "0","0.0","#REF!","#N/A","N/A","NULL","UNDEFINED"
  ].includes(s.toUpperCase())){
    return "";
  }

  return s;
}

function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeSpaces(v){
  return txt(v)
    .replace(/\s+/g," ")
    .trim();
}

function normKey(v){
  return normalizeSpaces(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[._-]+/g," ")
    .replace(/\s+/g," ")
    .trim()
    .toUpperCase();
}

function field(r,...keys){
  for(const k of keys){
    if(Object.prototype.hasOwnProperty.call(r,k)){
      return r[k];
    }
  }

  return null;
}


/* ======================================================
   NOMBRES NORMALIZADOS
   ====================================================== */

function lineOf(r){

  let k = normKey(field(r,"LINEA"));

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


function equipOf(r){
  return normKey(field(r,"EQUIPO"));
}


function systemOf(r){
  return normKey(field(r,"SISTEMA"));
}


function justOf(r){

  let k = normKey(
    field(r,"JUSTIFICACION")
  );

  if(
    k === "SERVICIO" ||
    k === "SERVICIOS"
  ){
    return "SERVICIOS";
  }

  return k;
}


function critOf(r){

  let k = normKey(
    field(r,"CRITICIDAD")
  );

  if(k === "ALTA"){
    return "ALTO";
  }

  if(k === "MEDIA"){
    return "MEDIO";
  }

  if(k === "BAJA"){
    return "BAJO";
  }

  return k;
}


function freqOf(r){

  let k = normKey(
    field(r,"FRECUENCIA")
  );

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


/* ======================================================
   OTROS CAMPOS
   ====================================================== */

function getMonths(r){

  const values = [

    field(r,"MES_DE_INICIO"),

    field(
      r,
      "MES_DE_INTERVENCION_2"
    ),

    field(
      r,
      "MES_DE_INTERVENCION_3"
    ),

    field(
      r,
      "MES_DE_INTERVENCION_4"
    )

  ]
  .map(normKey)
  .filter(
    m => MONTHS.includes(m)
  );

  return [...new Set(values)];
}


function codeOf(r){
  return txt(
    field(r,"CODIGO_SAP")
  );
}

function qtyOf(r){
  return num(
    field(r,"CANTIDAD")
  );
}

function unitOf(r){
  return num(
    field(r,"VALOR_UNITARIO")
  );
}

function totalOf(r){
  return num(
    field(r,"VALOR_TOTAL")
  );
}

function stockOf(r){

  return num(
    field(
      r,

      "DISPONIBLE_EN__ALMACÉN",

      "DISPONIBLE_EN_ALMACÉN",

      "DISPONIBLE_EN_ _ALMACÉN",

      "DISPONIBLE_EN_ALMACEN"
    )
  );

}


/* ======================================================
   FORMATOS
   ====================================================== */

function money(v){

  return new Intl.NumberFormat(
    "es-EC",
    {
      style:"currency",
      currency:"USD",
      minimumFractionDigits:0,
      maximumFractionDigits:2
    }
  ).format(
    num(v)
  );

}


function quantity(v){

  return new Intl.NumberFormat(
    "es-EC",
    {
      minimumFractionDigits:0,
      maximumFractionDigits:2
    }
  ).format(
    num(v)
  );

}


function escapeHtml(s){

  return String(
    s ?? ""
  ).replace(
    /[&<>"']/g,
    m => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#039;"
    }[m])
  );

}


/* ======================================================
   FILTROS POWER BI
   ====================================================== */

const FILTERS = {

  month:{
    container:"filterMonth",
    get:r => getMonths(r)
  },

  line:{
    container:"filterLine",
    get:r => lineOf(r)
  },

  equipment:{
    container:"filterEquipment",
    get:r => equipOf(r)
  },

  system:{
    container:"filterSystem",
    get:r => systemOf(r)
  },

  justification:{
    container:"filterJustification",
    get:r => justOf(r)
  },

  criticality:{
    container:"filterCriticality",
    get:r => critOf(r)
  },

  frequency:{
    container:"filterFrequency",
    get:r => freqOf(r)
  }

};


function selectedValues(
  filterName
){

  const id =
    FILTERS[
      filterName
    ].container;

  return [
    ...document.querySelectorAll(
      `#${id} input:checked`
    )
  ].map(
    x => x.value
  );

}


function allSelections(){

  const result = {};

  Object.keys(
    FILTERS
  ).forEach(
    name => {

      result[name] =
        selectedValues(
          name
        );

    }
  );

  return result;

}


function matchesFilter(
  row,
  filterName,
  selected
){

  if(
    !selected.length
  ){
    return true;
  }

  const value =
    FILTERS[
      filterName
    ].get(
      row
    );

  if(
    filterName === "month"
  ){

    return selected.some(
      x =>
        value.includes(x)
    );

  }

  return selected.includes(
    value
  );

}


function matchesAll(
  row,
  selections,
  ignore = null
){

  for(
    const name
    of Object.keys(
      FILTERS
    )
  ){

    if(
      name === ignore
    ){
      continue;
    }

    if(
      !matchesFilter(
        row,
        name,
        selections[name]
      )
    ){
      return false;
    }

  }

  return true;

}


/*
  Segmentadores encadenados:
  cada filtro se recalcula según
  todos los otros filtros.
*/
function availableValues(
  filterName,
  selections
){

  const validRows =
    rawData.filter(
      row =>
        matchesAll(
          row,
          selections,
          filterName
        )
    );


  if(
    filterName === "month"
  ){

    const set =
      new Set();

    validRows.forEach(
      row => {

        getMonths(
          row
        ).forEach(
          m =>
            set.add(m)
        );

      }
    );

    return MONTHS.filter(
      m =>
        set.has(m)
    );

  }


  const set =
    new Set();


  validRows.forEach(
    row => {

      const value =
        FILTERS[
          filterName
        ].get(
          row
        );

      if(value){
        set.add(value);
      }

    }
  );


  return [
    ...set
  ].sort(
    (a,b) =>
      a.localeCompare(
        b,
        "es"
      )
  );

}


/* ======================================================
   CREAR SEGMENTADORES
   ====================================================== */

function renderFilter(
  filterName,
  values,
  selected = []
){

  const container =
    document.getElementById(
      FILTERS[
        filterName
      ].container
    );

  const selectedSet =
    new Set(
      selected
    );


  container.innerHTML =
    values.map(
      v => `

      <label class="check-row">

        <input
          type="checkbox"
          value="${escapeHtml(v)}"
          ${selectedSet.has(v) ? "checked" : ""}
        >

        <span title="${escapeHtml(v)}">
          ${escapeHtml(v)}
        </span>

      </label>

      `
    ).join("");


  container
    .querySelectorAll(
      'input[type="checkbox"]'
    )
    .forEach(
      input => {

        input.addEventListener(
          "change",
          onFilterChanged
        );

      }
    );

}


function refreshAllFilters(){

  const selections =
    allSelections();


  Object.keys(
    FILTERS
  ).forEach(
    filterName => {

      const available =
        availableValues(
          filterName,
          selections
        );

      const selected =
        selections[
          filterName
        ];


      let values;


      if(
        filterName === "month"
      ){

        values =
          MONTHS.filter(
            m =>
              available.includes(m)
              ||
              selected.includes(m)
          );

      }else{

        values =
          [
            ...new Set(
              [
                ...selected,
                ...available
              ]
            )
          ].sort(
            (a,b) =>
              a.localeCompare(
                b,
                "es"
              )
          );

      }


      renderFilter(
        filterName,
        values,
        selected
      );

    }
  );


  applySearchBoxes();

}


function initializeFilters(){

  const empty = {

    month:[],
    line:[],
    equipment:[],
    system:[],
    justification:[],
    criticality:[],
    frequency:[]

  };


  Object.keys(
    FILTERS
  ).forEach(
    name => {

      renderFilter(

        name,

        availableValues(
          name,
          empty
        ),

        []

      );

    }
  );

}


function onFilterChanged(){

  page = 1;

  refreshAllFilters();

  renderDashboard();

}


/* ======================================================
   FILTRADO
   ====================================================== */

function occurrenceCount(
  row,
  selectedMonths
){

  const months =
    getMonths(
      row
    );


  if(
    selectedMonths.length
  ){

    return months.filter(
      m =>
        selectedMonths.includes(m)
    ).length;

  }


  return months.length;

}


function filteredRows(){

  const selections =
    allSelections();


  return rawData

    .filter(
      row =>
        matchesAll(
          row,
          selections
        )
    )

    .map(
      row => ({
        r:row,
        occ:
          occurrenceCount(
            row,
            selections.month
          )
      })
    )

    .filter(
      x =>
        x.occ > 0
    )

    .filter(
      x => {

        if(
          !onlyMissing
        ){
          return true;
        }

        return (
          stockOf(
            x.r
          )
          <
          qtyOf(
            x.r
          ) * x.occ
        );

      }
    );

}


/* ======================================================
   KPI - SOLO 2
   ====================================================== */

function updateKpis(
  filtered
){

  const selections =
    allSelections();


  const filteredValue =
    filtered.reduce(

      (sum,x) =>
        sum
        +
        totalOf(
          x.r
        ) * x.occ,

      0

    );


  const withoutMonth = {
    ...selections,
    month:[]
  };


  const annualValue =
    rawData

      .filter(
        row =>
          matchesAll(
            row,
            withoutMonth
          )
      )

      .reduce(
        (sum,row) =>
          sum
          +
          totalOf(
            row
          )
          *
          getMonths(
            row
          ).length,

        0
      );


  $("#kpiFilteredValue")
    .textContent =
      money(
        filteredValue
      );


  $("#kpiSelectedMonths")
    .textContent =

      selections.month.length

        ? selections.month
            .map(
              m =>
                MONTH_LABEL[m]
            )
            .join(" · ")

        : "Todos los meses";


  $("#kpiAnnualValue")
    .textContent =
      money(
        annualValue
      );


  $("#kpiRecords")
    .textContent =
      `${filtered.length.toLocaleString("es-EC")} registros filtrados`;

}


/* ======================================================
   TABLA
   ====================================================== */

function statusFor(
  r,
  occ
){

  const demand =
    qtyOf(r) * occ;

  const stock =
    stockOf(r);


  if(
    demand <= 0
  ){

    return {
      label:"N/A",
      class:"badge-gray"
    };

  }


  if(
    stock >= demand
  ){

    return {
      label:"DISPONIBLE",
      class:"badge-green"
    };

  }


  if(
    stock > 0
  ){

    return {
      label:"PARCIAL",
      class:"badge-amber"
    };

  }


  return {
    label:"SIN STOCK",
    class:"badge-red"
  };

}


function critBadge(v){

  if(
    v === "ALTO"
  ){
    return "crit-high";
  }

  if(
    v === "MEDIO"
  ){
    return "crit-medium";
  }

  if(
    v === "BAJO"
  ){
    return "crit-low";
  }

  return "badge-gray";

}


function renderTable(
  filtered
){

  pageSize =
    Number(
      $("#pageSize").value
    );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filtered.length
        /
        pageSize
      )
    );


  if(
    page > totalPages
  ){
    page =
      totalPages;
  }


  const start =
    (page - 1)
    *
    pageSize;


  const rows =
    filtered.slice(
      start,
      start + pageSize
    );


  const tbody =
    $("#demandTable tbody");


  if(
    !rows.length
  ){

    tbody.innerHTML = `

      <tr>

        <td
          colspan="14"
          class="empty">

          No existen registros para los filtros seleccionados.

        </td>

      </tr>

    `;

  }else{


    tbody.innerHTML =
      rows.map(
        ({r,occ}) => {


          const st =
            statusFor(
              r,
              occ
            );


          const months =
            getMonths(
              r
            )
            .map(
              m =>
                MONTH_LABEL[m]
            )
            .join(" · ");


          const crit =
            critOf(r);


          return `

            <tr>

              <td>
                ${escapeHtml(codeOf(r))}
              </td>

              <td
                title="${escapeHtml(txt(field(r,"DENOMINACION")))}">

                ${escapeHtml(txt(field(r,"DENOMINACION")))}

              </td>

              <td class="num">
                ${quantity(qtyOf(r)*occ)}
              </td>

              <td class="num">
                ${money(unitOf(r))}
              </td>

              <td class="num">
                <strong>
                  ${money(totalOf(r)*occ)}
                </strong>
              </td>

              <td>
                ${escapeHtml(lineOf(r))}
              </td>

              <td>
                ${escapeHtml(equipOf(r))}
              </td>

              <td>
                ${escapeHtml(systemOf(r))}
              </td>

              <td>
                ${escapeHtml(freqOf(r))}
              </td>

              <td>
                ${escapeHtml(months)}
              </td>

              <td>

                <span
                  class="badge ${critBadge(crit)}">

                  ${escapeHtml(crit || "N/A")}

                </span>

              </td>

              <td>
                ${escapeHtml(justOf(r))}
              </td>

              <td class="num">
                ${quantity(stockOf(r))}
              </td>

              <td>

                <span
                  class="badge ${st.class}">

                  ${st.label}

                </span>

              </td>

            </tr>

          `;

        }
      ).join("");

  }


  $("#resultSummary")
    .textContent =
      `Mostrando ${filtered.length.toLocaleString("es-EC")} registros filtrados`;


  $("#pageInfo")
    .textContent =
      `Página ${page} de ${totalPages}`;


  $("#prevPage")
    .disabled =
      page <= 1;


  $("#nextPage")
    .disabled =
      page >= totalPages;

}


/* ======================================================
   GRÁFICOS
   ====================================================== */

function monthlyData(){

  const selections =
    allSelections();


  const withoutMonth = {
    ...selections,
    month:[]
  };


  const base =
    rawData.filter(
      row =>
        matchesAll(
          row,
          withoutMonth
        )
    );


  return MONTHS.map(
    month =>

      base.reduce(

        (sum,row) =>
          sum
          +
          (
            getMonths(row)
              .includes(month)

              ? totalOf(row)

              : 0
          ),

        0

      )

  );

}


function renderCharts(
  filtered
){

  if(
    typeof Chart === "undefined"
  ){
    return;
  }


  if(
    monthlyChart
  ){
    monthlyChart.destroy();
  }


  monthlyChart =
    new Chart(

      $("#monthlyChart"),

      {

        type:"bar",

        data:{

          labels:
            MONTHS.map(
              m =>
                MONTH_LABEL[m]
            ),

          datasets:[{

            label:"Demanda",

            data:
              monthlyData(),

            backgroundColor:
              "#2696e5",

            borderRadius:
              5

          }]

        },

        options:{

          responsive:true,

          maintainAspectRatio:false,

          plugins:{

            legend:{
              display:false
            },

            tooltip:{

              callbacks:{

                label:
                  c =>
                    money(
                      c.raw
                    )

              }

            }

          },

          scales:{

            x:{
              grid:{
                display:false
              }
            },

            y:{
              beginAtZero:true
            }

          }

        }

      }

    );


  const justification =
    {};


  filtered.forEach(
    x => {

      const k =
        justOf(
          x.r
        )
        ||
        "SIN CLASIFICAR";


      justification[k] =
        (
          justification[k]
          ||
          0
        )
        +
        totalOf(
          x.r
        )
        *
        x.occ;

    }
  );


  if(
    justificationChart
  ){
    justificationChart.destroy();
  }


  justificationChart =
    new Chart(

      $("#justificationChart"),

      {

        type:"doughnut",

        data:{

          labels:
            Object.keys(
              justification
            ),

          datasets:[{

            data:
              Object.values(
                justification
              ),

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
                font:{
                  size:10
                }
              }

            },

            tooltip:{

              callbacks:{

                label:
                  c =>
                    `${c.label}: ${money(c.raw)}`

              }

            }

          }

        }

      }

    );

}


/* ======================================================
   BUSCADORES
   ====================================================== */

function filterVisible(
  containerId,
  inputId
){

  const input =
    $(inputId);


  if(
    !input
  ){
    return;
  }


  const search =
    normKey(
      input.value
    );


  $$(
    `#${containerId} .check-row`
  ).forEach(
    row => {

      row.style.display =

        normKey(
          row.innerText
        ).includes(
          search
        )

        ? ""

        : "none";

    }
  );

}


function applySearchBoxes(){

  filterVisible(
    "filterLine",
    "#searchLine"
  );

  filterVisible(
    "filterEquipment",
    "#searchEquipment"
  );

  filterVisible(
    "filterSystem",
    "#searchSystem"
  );

}


/* ======================================================
   EXPORTAR
   ====================================================== */

function exportCsv(){

  const filtered =
    filteredRows();


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


  filtered.forEach(
    ({r,occ}) => {


      lines.push([

        codeOf(r),

        txt(
          field(
            r,
            "DENOMINACION"
          )
        ),

        qtyOf(r) * occ,

        unitOf(r),

        totalOf(r) * occ,

        lineOf(r),

        equipOf(r),

        systemOf(r),

        freqOf(r),

        getMonths(r)
          .join(" / "),

        critOf(r),

        justOf(r),

        stockOf(r),

        statusFor(
          r,
          occ
        ).label

      ]);

    }
  );


  const quote =
    v =>
      `"${String(v ?? "").replaceAll('"','""')}"`;


  const csv =

    "\ufeff"

    +

    lines
      .map(
        row =>
          row
            .map(quote)
            .join(";")
      )
      .join("\n");


  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8"
      }
    );


  const a =
    document.createElement(
      "a"
    );


  a.href =
    URL.createObjectURL(
      blob
    );


  a.download =
    "demanda_plan_mantenimiento.csv";


  a.click();


  URL.revokeObjectURL(
    a.href
  );

}


/* ======================================================
   LIMPIAR
   ====================================================== */

function clearFilters(){

  $$(
    ".filters-card input[type=checkbox]"
  ).forEach(
    x =>
      x.checked = false
  );


  $("#searchLine").value = "";

  $("#searchEquipment").value = "";

  $("#searchSystem").value = "";


  onlyMissing = false;


  $("#btnOnlyMissing")
    .textContent =
      "Ver faltantes";


  page = 1;


  refreshAllFilters();

  renderDashboard();

}


/* ======================================================
   RENDER GENERAL
   ====================================================== */

function renderDashboard(){

  const filtered =
    filteredRows();


  updateKpis(
    filtered
  );


  renderTable(
    filtered
  );


  renderCharts(
    filtered
  );

}


/* ======================================================
   INICIO
   ====================================================== */

async function init(){

  try{

    const savedDataset =
      await loadLocalDataset()
        .catch(() => null);

    if(
      savedDataset &&
      Array.isArray(savedDataset.rows) &&
      savedDataset.rows.length
    ){

      rawData =
        savedDataset.rows;

      updateDataSourceStatus(
        savedDataset
      );

    }else{

      const response =
        await fetch(
          DATA_URL + "?t=" + Date.now(),
          {
            cache:"no-store"
          }
        );

      if(
        !response.ok
      ){
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      rawData =
        await response.json();

      updateDataSourceStatus(
        null
      );

    }


    initializeFilters();


    $("#btnUploadExcel")
      .addEventListener(
        "click",
        () => {
          $("#excelFile").click();
        }
      );


    $("#excelFile")
      .addEventListener(
        "change",
        event => {
          const file =
            event.target.files &&
            event.target.files[0];

          if(file){
            handleExcelUpload(file);
          }
        }
      );


    $("#searchLine")
      .addEventListener(
        "input",
        () =>
          filterVisible(
            "filterLine",
            "#searchLine"
          )
      );


    $("#searchEquipment")
      .addEventListener(
        "input",
        () =>
          filterVisible(
            "filterEquipment",
            "#searchEquipment"
          )
      );


    $("#searchSystem")
      .addEventListener(
        "input",
        () =>
          filterVisible(
            "filterSystem",
            "#searchSystem"
          )
      );


    $("#pageSize")
      .addEventListener(
        "change",
        () => {

          page = 1;

          renderDashboard();

        }
      );


    $("#prevPage")
      .addEventListener(
        "click",
        () => {

          if(
            page > 1
          ){

            page--;

            renderDashboard();

          }

        }
      );


    $("#nextPage")
      .addEventListener(
        "click",
        () => {

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
        () => {

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

    console.error(
      error
    );


    $("#resultSummary")
      .textContent =
        "No se pudo cargar la base del plan.";


    $("#demandTable tbody")
      .innerHTML = `

        <tr>

          <td
            colspan="14"
            class="empty">

            Error cargando
            data/plan_mantenimiento.json

          </td>

        </tr>

      `;

  }

}


document.addEventListener(
  "DOMContentLoaded",
  init
);
