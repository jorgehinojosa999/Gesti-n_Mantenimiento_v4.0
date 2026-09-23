(() => {
    const $ = id => document.getElementById(id);
    const fmt = new Intl.NumberFormat("es-EC");

    const state = {
        charts: {},
        sap: new Map(),
        programacion: [],
        detalle: [],
        detalleFiltrado: [],
        paginaDetalle: 1,
        tamanoPagina: 500,
        ultimaActualizacion: "--"
    };

    const MESES = [
        "Enero","Febrero","Marzo","Abril","Mayo","Junio",
        "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];

    function esc(v){
        return String(v ?? "")
            .replaceAll("&","&amp;")
            .replaceAll("<","&lt;")
            .replaceAll(">","&gt;")
            .replaceAll('"',"&quot;")
            .replaceAll("'","&#039;");
    }

    function normalizarTexto(v){
        return String(v ?? "").trim().replace(/\s+/g," ");
    }

    function normalizarOrden(v){
        let s = normalizarTexto(v);
        if(!s) return "";
        if(/^\d+\.0+$/.test(s)) s = s.split(".")[0];
        return s;
    }

    function claveCabecera(v){
        return normalizarTexto(v)
            .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g,"");
    }

    function excelFecha(v){
        if(v === null || v === undefined || v === "") return null;

        if(v instanceof Date && !isNaN(v)){
            return new Date(v.getFullYear(), v.getMonth(), v.getDate());
        }

        if(typeof v === "number" && window.XLSX){
            const p = XLSX.SSF.parse_date_code(v);
            if(p) return new Date(p.y, p.m - 1, p.d);
        }

        const s = normalizarTexto(v);
        let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
        if(m){
            const a = Number(m[1]), b = Number(m[2]), y = Number(m[3]);
            // Planilla corporativa puede venir dd/mm/yyyy o mm/dd/yyyy.
            // Si uno de los dos supera 12, la interpretación es inequívoca.
            // En fechas ambiguas se prioriza dd/mm/yyyy.
            const d = a > 12 ? a : (b > 12 ? b : a);
            const mo = a > 12 ? b : (b > 12 ? a : b);
            return new Date(y, mo - 1, d);
        }

        const d = new Date(s);
        return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function fechaDMY(d){
        if(!d || isNaN(d)) return "";
        return [
            String(d.getDate()).padStart(2,"0"),
            String(d.getMonth()+1).padStart(2,"0"),
            d.getFullYear()
        ].join("/");
    }

    function fechaDesdeDMY(s){
        const m = normalizarTexto(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if(!m) return null;
        return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
    }

    function badge(v, tipo){
        let cls = "gray-b";
        if(tipo === "orden"){
            if(v === "ORDEN CERRADA") cls = "green-b";
            else if(v === "ORDEN ABIERTA") cls = "blue-b";
            else cls = "orange-b";
        }else{
            if(v === "DENTRO DE TIEMPO") cls = "green-b";
            else if(v === "FUERA DE TIEMPO") cls = "red-b";
            else if(v === "POR NOTIFICAR") cls = "orange-b";
        }
        return `<span class="badge ${cls}">${esc(v)}</span>`;
    }

    function destroy(name){
        if(state.charts[name]){
            state.charts[name].destroy();
            state.charts[name] = null;
        }
    }

    async function cargarSAP(){
        const r = await fetch(`../data/ordenes_sap.json?t=${Date.now()}`, {cache:"no-store"});
        if(!r.ok) throw new Error(`No se pudo cargar ordenes_sap.json (HTTP ${r.status}).`);
        const d = await r.json();
        const rows = Array.isArray(d) ? d : (d.data || []);
        state.sap = new Map();
        rows.forEach(x => {
            const orden = normalizarOrden(x.orden);
            if(orden) state.sap.set(orden, x);
        });
        state.ultimaActualizacion = d.ultima_actualizacion || "--";
        $("ultimaActualizacion").textContent = state.ultimaActualizacion;
        setFuente("statusIW39","IW39",true);
        setFuente("statusIW47","IW47",true);
        setFuente("statusMapa","Mapa",true);
    }

    async function cargarProgramacionPublicada(){
        const r = await fetch(
            `../data/programacion.json?t=${Date.now()}`,
            {cache:"no-store"}
        );

        if(!r.ok){
            if(r.status === 404){
                state.programacion = [];
                return {cantidad:0, ultima_actualizacion:"--"};
            }
            throw new Error(
                `No se pudo cargar programacion.json (HTTP ${r.status}).`
            );
        }

        const d = await r.json();
        const rows = Array.isArray(d) ? d : (d.data || []);

        state.programacion = rows.map((x,i)=>{
            const fechaObj = fechaDesdeDMY(x.fecha);
            const orden = normalizarOrden(x.orden);
            if(!fechaObj || !orden) return null;

            return {
                id: x.id ?? i,
                fecha: x.fecha || fechaDMY(fechaObj),
                fecha_obj: fechaObj,
                orden,
                tipo: normalizarTexto(x.tipo),
                ope: normalizarTexto(x.ope),
                codigo_area: normalizarTexto(x.codigo_area),
                nombre_area: normalizarTexto(x.nombre_area),
                equipo: normalizarTexto(x.equipo),
                actividad: normalizarTexto(x.actividad),
                ejecutante: normalizarTexto(x.ejecutante),
                hora_programada: normalizarTexto(x.hora_programada),
                tiempo_real_asignado: normalizarTexto(x.tiempo_real_asignado),
                ocho: normalizarTexto(x.ocho),
                hora_fin: normalizarTexto(x.hora_fin),
                dia: normalizarTexto(x.dia),
                turno: normalizarTexto(x.turno)
            };
        }).filter(Boolean);

        return {
            cantidad: state.programacion.length,
            ultima_actualizacion: d.ultima_actualizacion || "--"
        };
    }

    function setFuente(id,nombre,ok){
        const el = $(id);
        if(!el) return;
        el.textContent = `${nombre}: ${ok ? "OK" : "NO DISPONIBLE"}`;
        el.classList.remove("ok","bad");
        el.classList.add(ok ? "ok" : "bad");
    }

    function localizarTabla(workbook){
        // La planilla corporativa real usa la hoja PLANILLA DIARIA
        // y los encabezados están en la primera fila.
        const nombrePlanilla = workbook.SheetNames.find(
            n => claveCabecera(n) === "PLANILLADIARIA"
        );

        if(nombrePlanilla){
            const ws = workbook.Sheets[nombrePlanilla];
            const matriz = XLSX.utils.sheet_to_json(ws,{
                header:1,
                defval:"",
                raw:true,
                blankrows:false
            });

            if(matriz.length){
                const keys = (matriz[0] || []).map(claveCabecera);
                const tieneFecha = keys.includes("FECHA");
                const tieneOrden = keys.includes("NOORDENDETRABAJO");

                console.log("PLANILLA DIARIA - ENCABEZADOS:", matriz[0]);
                console.log("PLANILLA DIARIA - CLAVES:", keys);

                if(tieneFecha && tieneOrden){
                    return {
                        nombre:nombrePlanilla,
                        matriz,
                        headerIndex:0
                    };
                }
            }
        }

        // Respaldo para otras versiones de la planilla.
        for(const nombre of workbook.SheetNames){
            const ws = workbook.Sheets[nombre];
            const matriz = XLSX.utils.sheet_to_json(ws,{
                header:1,
                defval:"",
                raw:true,
                blankrows:false
            });

            for(let i=0;i<Math.min(matriz.length,60);i++){
                const keys = (matriz[i] || []).map(claveCabecera).filter(Boolean);
                const tieneFecha = keys.some(k => k === "FECHA" || k.startsWith("FECHA"));
                const tieneOrden = keys.some(k =>
                    k === "ORDEN" ||
                    k === "NOORDENDETRABAJO" ||
                    k.includes("ORDENDETRABAJO") ||
                    k.includes("NUMEROORDEN")
                );

                if(tieneFecha && tieneOrden){
                    return {nombre, matriz, headerIndex:i};
                }
            }
        }

        throw new Error(
            "No se pudo localizar FECHA y NO. ORDEN DE TRABAJO en la planilla."
        );
    }

    function indice(headers, aliases){
        const keys = headers.map(claveCabecera);
        const buscadas = aliases.map(claveCabecera);

        for(const a of buscadas){
            const i = keys.indexOf(a);
            if(i >= 0) return i;
        }

        // Segundo intento tolerante para encabezados con texto adicional.
        for(let i=0;i<keys.length;i++){
            const k = keys[i];
            if(!k) continue;
            if(buscadas.some(a =>
                a && (
                    k.startsWith(a) ||
                    k.endsWith(a) ||
                    (a.length >= 5 && k.includes(a))
                )
            )){
                return i;
            }
        }
        return -1;
    }

    function leerProgramacion(workbook){
        const {nombre, matriz, headerIndex} = localizarTabla(workbook);
        const headers = matriz[headerIndex];

        const cols = {
            fecha: indice(headers,["FECHA","FECHA PLANILLA","FECHA PROGRAMADA"]),
            orden: indice(headers,[
                "NO. ORDEN DE TRABAJO",
                "NO ORDEN DE TRABAJO",
                "N° ORDEN DE TRABAJO",
                "ORDEN DE TRABAJO",
                "ORDEN",
                "ORDEN #",
                "N ORDEN",
                "NUMERO ORDEN"
            ]),
            tipo: indice(headers,["TIPO"]),
            ope: indice(headers,["OPE","OPERACION"]),
            codigo_area: indice(headers,["CODIGO AREA","CÓDIGO ÁREA"]),
            nombre_area: indice(headers,["NOMBRE AREA","NOMBRE ÁREA"]),
            equipo: indice(headers,["DESCRIPCION EQUIPO","DESCRIPCIÓN EQUIPO","EQUIPO"]),
            actividad: indice(headers,["DESCRIPCION ACTIVIDAD","DESCRIPCIÓN ACTIVIDAD","ACTIVIDAD"]),
            ejecutante: indice(headers,["EJECUTANTE","RESPONSABLE"]),
            hora_programada: indice(headers,["HORA PROGRAMADA 1","HORA PROGRAMADA"]),
            tiempo_real_asignado: indice(headers,["TIEMPO REAL ASIGNADO"]),
            ocho: indice(headers,["HORA INICIO","OCHO"]),
            hora_fin: indice(headers,["HORA FIN"]),
            dia: indice(headers,["DIA","DÍA"]),
            turno: indice(headers,["TURNO"])
        };

        if(cols.fecha < 0){
            throw new Error("Se encontró la hoja, pero no se encontró la columna FECHA.");
        }
        if(cols.orden < 0){
            throw new Error(
                "Se encontró la hoja, pero no se encontró la columna NO. ORDEN DE TRABAJO."
            );
        }

        const valor = (row,key) => cols[key] >= 0 ? row[cols[key]] : "";

        console.log("COLUMNAS PLANILLA DETECTADAS:", cols);

        const rows = [];
        for(let i=headerIndex+1;i<matriz.length;i++){
            const row = matriz[i] || [];
            const orden = normalizarOrden(valor(row,"orden"));
            if(!orden) continue;

            const fechaObj = excelFecha(valor(row,"fecha"));
            if(!fechaObj) continue;

            rows.push({
                id: i,
                fecha: fechaDMY(fechaObj),
                fecha_obj: fechaObj,
                orden,
                tipo: normalizarTexto(valor(row,"tipo")),
                ope: normalizarTexto(valor(row,"ope")),
                codigo_area: normalizarTexto(valor(row,"codigo_area")),
                nombre_area: normalizarTexto(valor(row,"nombre_area")),
                equipo: normalizarTexto(valor(row,"equipo")),
                actividad: normalizarTexto(valor(row,"actividad")),
                ejecutante: normalizarTexto(valor(row,"ejecutante")),
                hora_programada: normalizarTexto(valor(row,"hora_programada")),
                tiempo_real_asignado: normalizarTexto(valor(row,"tiempo_real_asignado")),
                ocho: normalizarTexto(valor(row,"ocho")),
                hora_fin: normalizarTexto(valor(row,"hora_fin")),
                dia: normalizarTexto(valor(row,"dia")),
                turno: normalizarTexto(valor(row,"turno"))
            });
        }

        return {nombre, rows};
    }

    function cruzarProgramacion(){
        return state.programacion
            .filter(p => state.sap.has(p.orden))
            .map(p => {
                const s = state.sap.get(p.orden) || {};
                const fechaIw = fechaDesdeDMY(s.fecha_iw47);
                let dias = null;
                let estadoTiempo = "POR NOTIFICAR";

                if(fechaIw){
                    const diff = Math.floor((fechaIw - p.fecha_obj) / 86400000);
                    if(diff >= 0){
                        dias = diff;
                        estadoTiempo = diff <= 3 ? "DENTRO DE TIEMPO" : "FUERA DE TIEMPO";
                    }else{
                        estadoTiempo = "REVISAR";
                    }
                }

                return {
                    ...p,
                    estado_orden: s.estado_orden || "REVISAR",
                    estado_tiempo: estadoTiempo,
                    estatus_sap: s.estatus_sap || "",
                    total_costes_plan: s.total_costes_plan ?? null,
                    costes_totales_reales: s.costes_totales_reales ?? null,
                    fecha_iw47: s.fecha_iw47 || "",
                    texto_notificacion: s.texto_notificacion || "",
                    dias_desfase: dias
                };
            });
    }

    function claveDia(f){
        return f ? `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}-${String(f.getDate()).padStart(2,"0")}` : "";
    }

    function reconstruirFiltroDias(){
        const sel = $("filtroDia");
        if(!sel) return;

        const actualDia = sel.value;
        const mes = $("filtroMes").value;
        const diasMap = new Map();

        cruzarProgramacion().forEach(r => {
            const f = r.fecha_obj;
            if(!f) return;
            const mesVal = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}`;
            if(mes && mesVal !== mes) return;
            diasMap.set(claveDia(f), fechaDMY(f));
        });

        sel.innerHTML = '<option value="">Todos los días</option>';
        [...diasMap.entries()].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([value,label])=>{
            const o=document.createElement("option"); o.value=value; o.textContent=label; sel.appendChild(o);
        });

        if([...sel.options].some(o=>o.value===actualDia)) sel.value=actualDia;
    }

    function filasFiltradas(){
        const mes = $("filtroMes").value;
        const dia = $("filtroDia").value;
        const estado = $("filtroEstado").value;
        const tiempo = $("filtroTiempo").value;
        const resp = $("filtroResponsable").value;

        return cruzarProgramacion().filter(r => {
            const f = r.fecha_obj;
            const mesVal = f ? `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}` : "";
            const diaVal = claveDia(f);
            return (!mes || mesVal === mes) &&
                   (!dia || diaVal === dia) &&
                   (!estado || r.estado_orden === estado) &&
                   (!tiempo || r.estado_tiempo === tiempo) &&
                   (!resp || r.ejecutante === resp);
        });
    }

    function reconstruirFiltros(){
        const actualMes = $("filtroMes").value;
        const actualResp = $("filtroResponsable").value;
        const base = cruzarProgramacion();

        const mesesMap = new Map();
        base.forEach(r => {
            const f = r.fecha_obj;
            if(!f) return;
            const value = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}`;
            mesesMap.set(value, `${MESES[f.getMonth()]} ${f.getFullYear()}`);
        });

        $("filtroMes").innerHTML = '<option value="">Todos</option>';
        [...mesesMap.entries()].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([value,label])=>{
            const o=document.createElement("option"); o.value=value; o.textContent=label; $("filtroMes").appendChild(o);
        });

        const responsables = [...new Set(base.map(r=>r.ejecutante).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
        $("filtroResponsable").innerHTML = '<option value="">Todos</option>';
        responsables.forEach(v=>{
            const o=document.createElement("option"); o.value=v; o.textContent=v; $("filtroResponsable").appendChild(o);
        });

        if([...$("filtroMes").options].some(o=>o.value===actualMes)) $("filtroMes").value=actualMes;
        if([...$("filtroResponsable").options].some(o=>o.value===actualResp)) $("filtroResponsable").value=actualResp;
        reconstruirFiltroDias();
    }

    function renderKPIs(rows){
        const total = rows.length;
        const cerradas = rows.filter(r=>r.estado_orden==="ORDEN CERRADA").length;
        const abiertas = rows.filter(r=>r.estado_orden==="ORDEN ABIERTA").length;
        const dias = rows.map(r=>r.dias_desfase).filter(v=>Number.isFinite(v));
        $("kpiTotal").textContent = fmt.format(total);
        $("kpiCerradas").textContent = fmt.format(cerradas);
        $("kpiAbiertas").textContent = fmt.format(abiertas);
        $("kpiCierre").textContent = `${total ? (cerradas/total*100).toFixed(1) : "0.0"}%`;
        $("kpiPromedio").textContent = dias.length ? (dias.reduce((a,b)=>a+b,0)/dias.length).toFixed(1) : "0.0";
    }

    function donut(name, canvas, rows, colors){
        destroy(name);
        state.charts[name] = new Chart($(canvas),{
            type:"doughnut",
            data:{labels:rows.map(x=>x.label),datasets:[{data:rows.map(x=>x.value),backgroundColor:colors,borderWidth:0}]},
            options:{responsive:true,maintainAspectRatio:false,cutout:"63%",plugins:{legend:{position:"right",labels:{usePointStyle:true,pointStyle:"circle",boxWidth:8,padding:16,font:{size:11,weight:600}}}}}
        });
    }

    function renderGraficos(rows){
        if(typeof Chart === "undefined") return;

        donut("estadoOrden","chartEstadoOrden",[
            {label:"Orden cerrada",value:rows.filter(r=>r.estado_orden==="ORDEN CERRADA").length},
            {label:"Orden abierta",value:rows.filter(r=>r.estado_orden==="ORDEN ABIERTA").length},
            {label:"Revisar",value:rows.filter(r=>!["ORDEN CERRADA","ORDEN ABIERTA"].includes(r.estado_orden)).length}
        ],["#2196f3","#1e40af","#f97316"]);

        donut("estadoTiempo","chartEstadoTiempo",[
            {label:"Dentro de tiempo",value:rows.filter(r=>r.estado_tiempo==="DENTRO DE TIEMPO").length},
            {label:"Fuera de tiempo",value:rows.filter(r=>r.estado_tiempo==="FUERA DE TIEMPO").length},
            {label:"Por notificar / revisar",value:rows.filter(r=>!["DENTRO DE TIEMPO","FUERA DE TIEMPO"].includes(r.estado_tiempo)).length}
        ],["#22a35a","#ef4444","#f97316"]);

        const resp = new Map();
        rows.forEach(r=>{
            const k=r.ejecutante || "SIN RESPONSABLE";
            if(!resp.has(k)) resp.set(k,{responsable:k,abiertas:0,cerradas:0,revisar:0,dias:[]});
            const x=resp.get(k);
            if(r.estado_orden==="ORDEN ABIERTA") x.abiertas++;
            else if(r.estado_orden==="ORDEN CERRADA") x.cerradas++;
            else x.revisar++;
            if(Number.isFinite(r.dias_desfase)) x.dias.push(r.dias_desfase);
        });
        const rr=[...resp.values()].sort((a,b)=>(b.abiertas+b.cerradas+b.revisar)-(a.abiertas+a.cerradas+a.revisar));

        destroy("responsable");
        const inner=$("innerChartResponsable");
        if(inner) inner.style.height=`${Math.max(280,rr.length*30+55)}px`;
        state.charts.responsable=new Chart($("chartResponsable"),{
            type:"bar",data:{labels:rr.map(x=>x.responsable),datasets:[
                {label:"Orden abierta",data:rr.map(x=>x.abiertas),backgroundColor:"#1e40af"},
                {label:"Orden cerrada",data:rr.map(x=>x.cerradas),backgroundColor:"#2196f3"},
                {label:"Revisar",data:rr.map(x=>x.revisar),backgroundColor:"#f97316"}]},
            options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,scales:{x:{stacked:true,beginAtZero:true,ticks:{precision:0}},y:{stacked:true}}}
        });

        destroy("promResp");
        const inner2=$("innerChartPromedioResponsable");
        if(inner2) inner2.style.height=`${Math.max(280,rr.length*30+45)}px`;
        state.charts.promResp=new Chart($("chartPromedioResponsable"),{
            type:"bar",data:{labels:rr.map(x=>x.responsable),datasets:[{label:"Promedio días",data:rr.map(x=>x.dias.length?x.dias.reduce((a,b)=>a+b,0)/x.dias.length:0),backgroundColor:"#2196f3"}]},
            options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}
        });

        const meses=new Map();
        rows.forEach(r=>{
            const f=r.fecha_obj; if(!f)return;
            const key=`${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}`;
            if(!meses.has(key)) meses.set(key,{mes:`${MESES[f.getMonth()]} ${f.getFullYear()}`,cantidad:0,dias:[]});
            const x=meses.get(key); x.cantidad++; if(Number.isFinite(r.dias_desfase))x.dias.push(r.dias_desfase);
        });
        const mm=[...meses.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([,x])=>x);

        destroy("mes");
        state.charts.mes=new Chart($("chartOrdenesMes"),{
            type:"line",data:{labels:mm.map(x=>x.mes),datasets:[{label:"Órdenes",data:mm.map(x=>x.cantidad),borderColor:"#2196f3",backgroundColor:"rgba(33,150,243,.12)",fill:true,tension:.25,pointRadius:4}]},
            options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}
        });

        destroy("promMes");
        state.charts.promMes=new Chart($("chartPromedioMes"),{
            type:"line",data:{labels:mm.map(x=>x.mes),datasets:[{label:"Promedio días",data:mm.map(x=>x.dias.length?x.dias.reduce((a,b)=>a+b,0)/x.dias.length:0),borderColor:"#7c3aed",backgroundColor:"rgba(124,58,237,.10)",fill:true,tension:.25,pointRadius:4}]},
            options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}
        });
    }

    function renderDetalle(rows){
        state.detalle=rows;
        state.paginaDetalle=1;
        buscarDetalle();
    }

    function buscarDetalle(){
        const q=normalizarTexto($("buscar")?.value).toLowerCase();
        let rows=state.detalle;
        if(q){
            rows=rows.filter(r=>[
                r.fecha,r.estado_orden,r.estado_tiempo,r.orden,r.tipo,r.ope,r.codigo_area,r.nombre_area,
                r.equipo,r.actividad,r.ejecutante,r.estatus_sap,r.total_costes_plan,r.costes_totales_reales,
                r.fecha_iw47,r.texto_notificacion
            ].join(" ").toLowerCase().includes(q));
        }
        state.detalleFiltrado=rows;

        const total=rows.length;
        const paginas=Math.max(1,Math.ceil(total/state.tamanoPagina));
        state.paginaDetalle=Math.min(Math.max(1,state.paginaDetalle),paginas);
        const inicio=(state.paginaDetalle-1)*state.tamanoPagina;
        const fin=Math.min(inicio+state.tamanoPagina,total);

        const fragment=document.createDocumentFragment();
        rows.slice(inicio,fin).forEach(r=>{
            const tr=document.createElement("tr");
            tr.innerHTML=`
                <td>${esc(r.fecha)}</td>
                <td>${badge(r.estado_orden,"orden")}</td>
                <td>${badge(r.estado_tiempo,"tiempo")}</td>
                <td><strong>${esc(r.orden)}</strong></td>
                <td class="text-wrap">${esc(r.estatus_sap)}</td>
                <td>${r.total_costes_plan ?? ""}</td>
                <td>${r.costes_totales_reales ?? ""}</td>
                <td>${esc(r.fecha_iw47)}</td>
                <td class="text-wrap">${esc(r.texto_notificacion)}</td>
                <td>${r.dias_desfase ?? ""}</td>`;
            fragment.appendChild(tr);
        });
        $("tablaDetalle").replaceChildren(fragment);
        $("contador").textContent=total?`${fmt.format(total)} registros | ${fmt.format(inicio+1)}-${fmt.format(fin)}`:"0 registros";
        $("paginaDetalleInfo").textContent=`Página ${state.paginaDetalle} de ${paginas}`;
        $("btnAnteriorDetalle").disabled=state.paginaDetalle<=1;
        $("btnSiguienteDetalle").disabled=state.paginaDetalle>=paginas;
    }

    function actualizarDashboard(reconstruir=false){
        if(reconstruir) reconstruirFiltros();
        const rows=filasFiltradas();
        renderKPIs(rows);
        renderGraficos(rows);
        renderDetalle(rows);
    }

    function descargarDetalle(){
        const filas=state.detalleFiltrado||[];
        if(!filas.length){alert("No hay registros para descargar.");return;}
        const columnas=[
            ["Fecha Planilla","fecha"],["Estado Orden","estado_orden"],["Estado Tiempo","estado_tiempo"],
            ["Orden","orden"],["Tipo","tipo"],["Ope.","ope"],["Código Área","codigo_area"],
            ["Nombre Área","nombre_area"],["Equipo","equipo"],["Actividad","actividad"],
            ["Ejecutante","ejecutante"],["Hora Programada","hora_programada"],
            ["Tiempo Real Asignado","tiempo_real_asignado"],["Hora Inicio","ocho"],["Hora Fin","hora_fin"],
            ["Día","dia"],["Turno","turno"],["Status sistema IW39","estatus_sap"],
            ["Total Costes Plan IW39","total_costes_plan"],["Costes Totales Reales IW39","costes_totales_reales"],
            ["Fecha Contab. IW47","fecha_iw47"],["Texto Notificación IW47","texto_notificacion"],["Días","dias_desfase"]
        ];
        const e=v=>`"${String(v??"").replace(/"/g,'""')}"`;
        const lineas=[columnas.map(([t])=>e(t)).join(";")];
        filas.forEach(f=>lineas.push(columnas.map(([,c])=>e(f[c])).join(";")));
        const blob=new Blob(["\ufeff"+lineas.join("\r\n")],{type:"text/csv;charset=utf-8;"});
        const url=URL.createObjectURL(blob),a=document.createElement("a");
        a.href=url;a.download=`Detalle_Ordenes_SAP_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    }

    $("archivoExcel").addEventListener("change",async e=>{
        const file=e.target.files[0];
        if(!file)return;
        try{
            if(typeof XLSX==="undefined") throw new Error("No se pudo cargar el lector de Excel (SheetJS).");
            $("archivoCargado").textContent="Leyendo planilla...";
            const data=await file.arrayBuffer();
            const wb=XLSX.read(data,{type:"array",cellDates:true});
            const resultado=leerProgramacion(wb);
            state.programacion=resultado.rows;
            reconstruirFiltros();
            actualizarDashboard(false);
            const cruzadas=cruzarProgramacion().length;
            $("archivoCargado").textContent=
                `${file.name} · Hoja: ${resultado.nombre} · ` +
                `${fmt.format(state.programacion.length)} filas válidas · ` +
                `${fmt.format(cruzadas)} OT encontradas en SAP · Vista temporal`;
        }catch(err){
            console.error(err);
            $("archivoCargado").textContent="No se pudo cargar la planilla.";
            alert("No se pudo importar el Excel.\n\n"+err.message);
        }finally{
            e.target.value="";
        }
    });

    $("btnActualizar").addEventListener("click",async()=>{
        const btn=$("btnActualizar");
        btn.disabled=true;btn.textContent="Actualizando...";
        try{
            await cargarSAP();
            const prog = await cargarProgramacionPublicada();

            if(state.programacion.length){
                reconstruirFiltros();
                actualizarDashboard(false);
                const cruzadas = cruzarProgramacion().length;
                $("archivoCargado").textContent =
                    `Última programación publicada · ${fmt.format(state.programacion.length)} filas · ` +
                    `${fmt.format(cruzadas)} OT encontradas en SAP`;
            }else{
                $("archivoCargado").textContent =
                    "No existe programación publicada todavía.";
            }
        }catch(err){
            console.error(err);alert(err.message);
            setFuente("statusIW39","IW39",false);setFuente("statusIW47","IW47",false);setFuente("statusMapa","Mapa",false);
        }finally{
            btn.disabled=false;btn.textContent="↻ Actualizar ahora";
        }
    });

    $("btnLimpiar").addEventListener("click",()=>{
        $("filtroMes").value="";$("filtroDia").value="";$("filtroEstado").value="";$("filtroTiempo").value="";
        $("filtroResponsable").value="";$("buscar").value="";
        reconstruirFiltroDias();
        if(state.programacion.length) actualizarDashboard(false);
    });

    $("filtroMes")?.addEventListener("change",()=>{
        reconstruirFiltroDias();
        if(state.programacion.length) actualizarDashboard(false);
    });

    ["filtroDia","filtroEstado","filtroTiempo","filtroResponsable"].forEach(id=>{
        $(id)?.addEventListener("change",()=>state.programacion.length&&actualizarDashboard(false));
    });
    $("buscar").addEventListener("input",()=>{state.paginaDetalle=1;buscarDetalle();});
    $("btnDescargarDetalle").addEventListener("click",descargarDetalle);
    $("btnAnteriorDetalle").addEventListener("click",()=>{if(state.paginaDetalle>1){state.paginaDetalle--;buscarDetalle();}});
    $("btnSiguienteDetalle").addEventListener("click",()=>{
        const paginas=Math.max(1,Math.ceil(state.detalleFiltrado.length/state.tamanoPagina));
        if(state.paginaDetalle<paginas){state.paginaDetalle++;buscarDetalle();}
    });

    (async()=>{
        try{
            await cargarSAP();
            const prog = await cargarProgramacionPublicada();

            if(state.programacion.length){
                reconstruirFiltros();
                actualizarDashboard(false);
                const cruzadas = cruzarProgramacion().length;
                $("archivoCargado").textContent =
                    `Última programación publicada · ${fmt.format(state.programacion.length)} filas · ` +
                    `${fmt.format(cruzadas)} OT encontradas en SAP`;
            }else{
                $("archivoCargado").textContent =
                    "Datos SAP listos. Aún no existe programacion.json publicado.";
            }
        }catch(err){
            console.error(err);
            $("archivoCargado").textContent="No se pudieron cargar los datos SAP.";
            setFuente("statusIW39","IW39",false);setFuente("statusIW47","IW47",false);setFuente("statusMapa","Mapa",false);
        }
    })();
})();
