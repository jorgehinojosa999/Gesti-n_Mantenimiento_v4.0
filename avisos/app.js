// =========================================================
// CONTROL AVISOS SAP
// VERSIÓN ESTÁTICA PARA GITHUB PAGES
// =========================================================


// =========================================================
// CONFIGURACIÓN
// =========================================================

const DATA_URL = "../data/avisos.json";


// =========================================================
// VARIABLES GLOBALES
// =========================================================

let DATA = [];
let VERSION_ACTUAL = "";
let ULTIMA_ACTUALIZACION = "";


// =========================================================
// ELEMENTOS HTML
// =========================================================

const monthFilter =
    document.getElementById("monthFilter");

const dayFilter =
    document.getElementById("dayFilter");

const classFilter =
    document.getElementById("classFilter");

const statusChecks =
    document.getElementById("statusChecks");

const timeChecks =
    document.getElementById("timeChecks");

const responsibleChecks =
    document.getElementById("responsibleChecks");

const btnRefresh =
    document.getElementById("btnRefresh");

const btnDownload =
    document.getElementById("btnDownload");

const lastUpdate =
    document.getElementById("lastUpdate");

const tbody =
    document.getElementById("tbody");


// =========================================================
// KPIs
// =========================================================

const kpiTotal =
    document.getElementById("kpiTotal");

const kpiClosed =
    document.getElementById("kpiClosed");

const kpiOpen =
    document.getElementById("kpiOpen");

const kpiPct =
    document.getElementById("kpiPct");

const kpiAvg =
    document.getElementById("kpiAvg");


// =========================================================
// CANVAS
// =========================================================

const pie =
    document.getElementById("pie");

const pieTiempo =
    document.getElementById("pieTiempo");

const resp =
    document.getElementById("resp");

const avgResp =
    document.getElementById("avgResp");

const month =
    document.getElementById("month");

const avgMonth =
    document.getElementById("avgMonth");


// =========================================================
// COLORES
// =========================================================

const COLORS = {

    blue: "#1496ef",

    green: "#20a464",

    red: "#e5484d",

    orange: "#f58220",

    purple: "#7655c7",

    gray: "#98a2b3",

    yellow: "#f4c542",

    dark: "#344054"
};


// =========================================================
// UTILIDADES
// =========================================================

function safeText(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value);
}


// =========================================================
// CONVERTIR A NÚMERO VÁLIDO
// IMPORTANTE:
// null, undefined y "" NO se convierten en cero.
// =========================================================

function validNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {

        return null;

    }

    return number;
}


function numberValue(value) {

    const number =
        validNumber(value);

    return number === null
        ? 0
        : number;
}


function uniqueValues(
    data,
    field
) {

    return [
        ...new Set(
            data
                .map(
                    item =>
                        safeText(
                            item[field]
                        ).trim()
                )
                .filter(Boolean)
        )
    ].sort(
        (a, b) =>
            a.localeCompare(
                b,
                "es"
            )
    );
}


// =========================================================
// CHECKBOXES
// =========================================================

function createCheckboxes(
    container,
    values,
    prefix
) {

    const previous = Array.from(container.querySelectorAll('input[type="checkbox"]')).map(input => ({ value: input.value, checked: input.checked }));
    const previousMap = new Map(previous.map(item => [item.value, item.checked]));
    container.innerHTML = "";

    values.forEach(
        (value, index) => {

            const label =
                document.createElement(
                    "label"
                );

            const input =
                document.createElement(
                    "input"
                );

            input.type =
                "checkbox";

            input.checked = previousMap.has(value) ? previousMap.get(value) : true;

            input.value =
                value;

            input.id =
                `${prefix}_${index}`;

            input.addEventListener(
                "change",
                () => { updateFilterCounts(); renderDashboard(); }
            );


            const span =
                document.createElement(
                    "span"
                );

            span.textContent =
                value;


            label.appendChild(
                input
            );

            label.appendChild(
                span
            );

            container.appendChild(
                label
            );

        }
    );
}


function updateFilterCounts() {
    [[statusChecks, "statusCount"], [timeChecks, "timeCount"], [responsibleChecks, "responsibleCount"]].forEach(([container, id]) => {
        const count = container.querySelectorAll('input[type="checkbox"]:checked').length;
        const element = document.getElementById(id);
        if (element) element.textContent = `${count} seleccionado${count === 1 ? "" : "s"}`;
    });
}

function resetFilters() {
    monthFilter.value = "Todas";
    configureDays();
    dayFilter.value = "Todas";
    classFilter.value = "Todas";
    [statusChecks, timeChecks, responsibleChecks].forEach(container => {
        container.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = true; });
    });
    updateFilterCounts();
    renderDashboard();
}

function selectedValues(
    container
) {

    return Array.from(
        container.querySelectorAll(
            'input[type="checkbox"]:checked'
        )
    ).map(
        input =>
            input.value
    );
}


// =========================================================
// MESES
// =========================================================

function configureMonths() {

    const currentValue =
        monthFilter.value;

    const months =
        uniqueValues(
            DATA,
            "mes"
        );


    monthFilter.innerHTML = `
        <option value="Todas">
            Todas
        </option>
    `;


    months.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                value;

            option.textContent =
                value;

            monthFilter.appendChild(
                option
            );

        }
    );


    if (
        months.includes(
            currentValue
        )
    ) {

        monthFilter.value =
            currentValue;

    } else {

        monthFilter.value =
            "Todas";

    }

}


// =========================================================
// DÍAS / FECHA DE AVISO
// =========================================================

function configureDays() {

    const currentValue = dayFilter.value;
    const selectedMonth = monthFilter.value;

    const dates = [...new Set(
        DATA
            .filter(item =>
                selectedMonth === "Todas" ||
                safeText(item.mes) === selectedMonth
            )
            .map(item => safeText(item.fechaAviso).trim())
            .filter(Boolean)
    )].sort((a, b) => {
        const parse = value => {
            const m = value.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
            return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime() : 0;
        };
        return parse(a) - parse(b);
    });

    dayFilter.innerHTML = '<option value="Todas">Todos los días</option>';

    dates.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        dayFilter.appendChild(option);
    });

    dayFilter.value = dates.includes(currentValue) ? currentValue : "Todas";
}


// =========================================================
// CONFIGURAR FILTROS
// =========================================================

function configureFilters() {

    configureMonths();
    configureDays();


    const estados =
        uniqueValues(
            DATA,
            "estadoFinal"
        );


    const tiempos =
        uniqueValues(
            DATA,
            "estadoTiempo"
        );


    const responsables =
        uniqueValues(
            DATA,
            "responsable"
        );


    createCheckboxes(
        statusChecks,
        estados,
        "estado"
    );


    createCheckboxes(
        timeChecks,
        tiempos,
        "tiempo"
    );


    createCheckboxes(
        responsibleChecks,
        responsables,
        "responsable"
    );
    updateFilterCounts();

}


// =========================================================
// FILTRAR DATOS
// =========================================================

function getFilteredData() {

    const mes =
        monthFilter.value;

    const dia =
        dayFilter.value;

    const clasificacion =
        classFilter.value;


    const estados =
        selectedValues(
            statusChecks
        );


    const tiempos =
        selectedValues(
            timeChecks
        );


    const responsables =
        selectedValues(
            responsibleChecks
        );


    return DATA.filter(
        item => {

            const cumpleMes =
                mes === "Todas" ||
                safeText(
                    item.mes
                ) === mes;


            const cumpleDia =
                dia === "Todas" ||
                safeText(item.fechaAviso).trim() === dia;


            const cumpleClasificacion =
                clasificacion === "Todas" ||
                safeText(
                    item.clasificacion
                ) === clasificacion;


            const cumpleEstado =
                estados.includes(
                    safeText(
                        item.estadoFinal
                    )
                );


            const cumpleTiempo =
                tiempos.includes(
                    safeText(
                        item.estadoTiempo
                    )
                );


            const cumpleResponsable =
                responsables.includes(
                    safeText(
                        item.responsable
                    )
                );


            return (
                cumpleMes &&
                cumpleDia &&
                cumpleClasificacion &&
                cumpleEstado &&
                cumpleTiempo &&
                cumpleResponsable
            );

        }
    );

}


// =========================================================
// KPIs
// =========================================================

function renderKPIs(
    data
) {

    const total =
        data.length;


    const cerrados =
        data.filter(
            item =>
                safeText(
                    item.estadoFinal
                )
                    .toUpperCase()
                    .includes(
                        "CERRAD"
                    )
        ).length;


    const abiertos =
        total -
        cerrados;


    const porcentaje =
        total > 0
            ? (
                cerrados /
                total *
                100
            )
            : 0;


    // =====================================================
    // PROMEDIO DÍAS NOTIFICACIÓN
    //
    // Python envía:
    // "dias": 5
    //
    // Los valores null corresponden a registros que
    // todavía no tienen días calculados y NO deben
    // considerarse como cero.
    // =====================================================

    const diasValidos =
        data
            .map(
                item =>
                    validNumber(
                        item.dias
                    )
            )
            .filter(
                value =>
                    value !== null
            );


    const promedio =
        diasValidos.length > 0
            ? (
                diasValidos.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) /
                diasValidos.length
            )
            : 0;


    kpiTotal.textContent =
        total.toLocaleString(
            "es-EC"
        );


    kpiClosed.textContent =
        cerrados.toLocaleString(
            "es-EC"
        );


    kpiOpen.textContent =
        abiertos.toLocaleString(
            "es-EC"
        );


    kpiPct.textContent =
        porcentaje.toFixed(1) +
        "%";


    kpiAvg.textContent =
        promedio.toFixed(1);

}


// =========================================================
// CANVAS
// =========================================================

function prepareCanvas(
    canvas
) {

    const rect =
        canvas.getBoundingClientRect();


    const dpr =
        window.devicePixelRatio ||
        1;


    canvas.width =
        Math.max(
            1,
            Math.floor(
                rect.width *
                dpr
            )
        );


    canvas.height =
        Math.max(
            1,
            Math.floor(
                rect.height *
                dpr
            )
        );


    const ctx =
        canvas.getContext(
            "2d"
        );


    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    ctx.clearRect(
        0,
        0,
        rect.width,
        rect.height
    );


    return {
        ctx,
        width: rect.width,
        height: rect.height
    };

}


// =========================================================
// CONTAR POR CAMPO
// =========================================================

function countBy(
    data,
    field
) {

    const result = {};


    data.forEach(
        item => {

            const key =
                safeText(
                    item[field]
                ).trim() ||
                "Sin dato";


            result[key] =
                (
                    result[key] ||
                    0
                ) + 1;

        }
    );


    return result;
}


// =========================================================
// GRÁFICO DONA
// =========================================================

function drawDonut(
    canvas,
    values,
    title
) {

    const {
        ctx,
        width,
        height
    } =
        prepareCanvas(
            canvas
        );


    const entries =
        Object.entries(
            values
        );


    if (
        entries.length === 0
    ) {

        ctx.fillStyle =
            COLORS.gray;

        ctx.font =
            "12px Segoe UI";

        ctx.textAlign =
            "center";

        ctx.fillText(
            "Sin datos",
            width / 2,
            height / 2
        );

        return;

    }


    const total =
        entries.reduce(
            (sum, [, value]) =>
                sum + value,
            0
        );


    const palette = [
        COLORS.green,
        COLORS.red,
        COLORS.blue,
        COLORS.orange,
        COLORS.purple,
        COLORS.yellow,
        COLORS.gray
    ];


    const centerX =
        width * 0.33;

    const centerY =
        height * 0.50;


    const radius =
        Math.min(
            width,
            height
        ) * 0.27;


    const innerRadius =
        radius * 0.58;


    let start =
        -Math.PI / 2;


    entries.forEach(
        (
            [label, value],
            index
        ) => {

            const angle =
                total > 0
                    ? (
                        value /
                        total
                    ) *
                    Math.PI *
                    2
                    : 0;


            ctx.beginPath();

            ctx.arc(
                centerX,
                centerY,
                radius,
                start,
                start + angle
            );

            ctx.arc(
                centerX,
                centerY,
                innerRadius,
                start + angle,
                start,
                true
            );

            ctx.closePath();


            ctx.fillStyle =
                palette[
                    index %
                    palette.length
                ];


            ctx.fill();


            start +=
                angle;

        }
    );


    ctx.fillStyle =
        COLORS.dark;

    ctx.textAlign =
        "center";

    ctx.font =
        "700 18px Segoe UI";

    ctx.fillText(
        total.toLocaleString(
            "es-EC"
        ),
        centerX,
        centerY
    );


    ctx.font =
        "10px Segoe UI";

    ctx.fillStyle =
        COLORS.gray;

    ctx.fillText(
        title,
        centerX,
        centerY + 18
    );


    const legendX =
        width * 0.62;

    let legendY =
        40;


    ctx.textAlign =
        "left";


    entries.forEach(
        (
            [label, value],
            index
        ) => {

            const percentage =
                total > 0
                    ? (
                        value /
                        total *
                        100
                    )
                    : 0;


            ctx.fillStyle =
                palette[
                    index %
                    palette.length
                ];


            ctx.fillRect(
                legendX,
                legendY - 8,
                9,
                9
            );


            ctx.fillStyle =
                COLORS.dark;

            ctx.font =
                "10px Segoe UI";


            ctx.fillText(
                `${label}: ${value} (${percentage.toFixed(1)}%)`,
                legendX + 15,
                legendY
            );


            legendY +=
                22;

        }
    );

}


// =========================================================
// BARRAS HORIZONTALES
// =========================================================

function drawHorizontalBars(
    canvas,
    entries,
    color
) {

    const {
        ctx,
        width,
        height
    } =
        prepareCanvas(
            canvas
        );


    if (
        entries.length === 0
    ) {

        ctx.fillStyle =
            COLORS.gray;

        ctx.font =
            "12px Segoe UI";

        ctx.textAlign =
            "center";

        ctx.fillText(
            "Sin datos",
            width / 2,
            height / 2
        );

        return;

    }


    const max =
        Math.max(
            ...entries.map(
                item =>
                    item[1]
            ),
            1
        );


    const left =
        Math.min(
            150,
            width * 0.35
        );


    const right =
        45;


    const top =
        15;


    const rowHeight =
        Math.max(
            20,
            (
                height -
                top -
                15
            ) /
            entries.length
        );


    entries.forEach(
        (
            [label, value],
            index
        ) => {

            const y =
                top +
                index *
                rowHeight;


            ctx.fillStyle =
                COLORS.dark;

            ctx.font =
                "9px Segoe UI";

            ctx.textAlign =
                "right";


            ctx.fillText(
                label.length > 22
                    ? label.substring(
                        0,
                        22
                    ) + "..."
                    : label,
                left - 8,
                y + 12
            );


            const barWidth =
                (
                    width -
                    left -
                    right
                ) *
                (
                    value /
                    max
                );


            ctx.fillStyle =
                color;


            ctx.fillRect(
                left,
                y + 2,
                barWidth,
                Math.max(
                    10,
                    rowHeight - 8
                )
            );


            ctx.fillStyle =
                COLORS.dark;

            ctx.textAlign =
                "left";


            ctx.fillText(
                Number.isInteger(
                    value
                )
                    ? value
                    : value.toFixed(1),
                left +
                barWidth +
                6,
                y + 12
            );

        }
    );

}


// =========================================================
// PROMEDIO POR CAMPO
// =========================================================

function averageBy(
    data,
    groupField,
    valueField
) {

    const groups = {};


    data.forEach(
        item => {

            const group =
                safeText(
                    item[groupField]
                ).trim() ||
                "Sin dato";


            const value =
                validNumber(
                    item[valueField]
                );


            // No considerar registros sin días
            if (
                value === null
            ) {

                return;

            }


            if (
                !groups[group]
            ) {

                groups[group] = {
                    sum: 0,
                    count: 0
                };

            }


            groups[group].sum +=
                value;


            groups[group].count +=
                1;

        }
    );


    return Object.entries(
        groups
    ).map(
        (
            [key, value]
        ) => [

            key,

            value.count > 0
                ? (
                    value.sum /
                    value.count
                )
                : 0

        ]
    );

}


// =========================================================
// GRÁFICOS
// =========================================================

function renderCharts(
    data
) {

    // -----------------------------------------------------
    // ESTADO FINAL
    // -----------------------------------------------------

    drawDonut(
        pie,
        countBy(
            data,
            "estadoFinal"
        ),
        "Avisos"
    );


    // -----------------------------------------------------
    // ESTADO TIEMPO
    // -----------------------------------------------------

    drawDonut(
        pieTiempo,
        countBy(
            data,
            "estadoTiempo"
        ),
        "Avisos"
    );


    // -----------------------------------------------------
    // RESPONSABLE
    // -----------------------------------------------------

    const responsables =
        Object.entries(
            countBy(
                data,
                "responsable"
            )
        )
        .sort(
            (a, b) =>
                b[1] -
                a[1]
        )
        .slice(
            0,
            12
        );


    drawHorizontalBars(
        resp,
        responsables,
        COLORS.blue
    );


    // -----------------------------------------------------
    // PROMEDIO POR RESPONSABLE
    // CORREGIDO: dias
    // -----------------------------------------------------

    const promedioResponsable =
        averageBy(
            data,
            "responsable",
            "dias"
        )
        .sort(
            (a, b) =>
                b[1] -
                a[1]
        )
        .slice(
            0,
            12
        );


    drawHorizontalBars(
        avgResp,
        promedioResponsable,
        COLORS.orange
    );


    // -----------------------------------------------------
    // AVISOS POR MES
    // -----------------------------------------------------

    drawMonthlyStatusTrend(month, data);


    // -----------------------------------------------------
    // PROMEDIO POR MES
    // CORREGIDO: dias
    // -----------------------------------------------------

    const promedioMes =
        averageBy(
            data,
            "mes",
            "dias"
        );


    drawMonthlyAverageColumns(avgMonth, promedioMes);

}




// =========================================================
// AVISOS POR MES Y ESTADO FINAL: COLUMNAS APILADAS + TENDENCIA
// Los totales provienen exclusivamente de avisos.json filtrado.
// =========================================================
function drawMonthlyStatusTrend(canvas, data) {
    const {ctx,width:w,height:h}=prepareCanvas(canvas);
    const names=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const alias={ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,set:8,oct:9,nov:10,dic:11};
    const norm=v=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    const groups=new Map();
    for(const item of data){
        const date=String(item.fechaAviso??'').trim();
        const dm=date.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
        const iso=date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        let mi=dm?Number(dm[2])-1:iso?Number(iso[2])-1:-1;
        const year=dm?Number(dm[3]):iso?Number(iso[1]):null;
        if(mi<0||mi>11){const token=norm(item.mes).split(/[\s\/-]+/)[0];mi=names.indexOf(token);if(mi<0)mi=alias[token.slice(0,3)]??-1;}
        if(mi<0||mi>11)continue;
        const key=`${year??'sin-anio'}-${mi}`;
        if(!groups.has(key))groups.set(key,{year,mi,abierto:0,cerrado:0,revisar:0,total:0});
        const g=groups.get(key), status=norm(item.estadoFinal);
        if(status.includes('cerrad'))g.cerrado++;
        else if(status.includes('revis'))g.revisar++;
        else g.abierto++;
        g.total++;
    }
    const all=[...groups.values()];
    if(!all.length){ctx.fillStyle='#64748b';ctx.font='13px Segoe UI';ctx.textAlign='center';ctx.fillText('No hay avisos para los filtros seleccionados',w/2,h/2);return;}
    // Mantener enero y los meses intermedios incluso si no tienen avisos.
    // Cuando hay varios años sin filtrar, mostrar el año más reciente para no mezclar años.
    const years=all.filter(g=>g.year!=null).map(g=>g.year);
    const selectedYear=years.length?Math.max(...years):null;
    const current=all.filter(g=>g.year===selectedYear);
    const lastMonth=Math.max(...current.map(g=>g.mi));
    const months=Array.from({length:lastMonth+1},(_,mi)=>current.find(g=>g.mi===mi)||{year:selectedYear,mi,abierto:0,cerrado:0,revisar:0,total:0});
    const color={abierto:'#1680ea',cerrado:'#20a464',revisar:'#f97316'};
    const compact=w<540,left=compact?33:43,right=12,top=43,bottom=39;
    const pw=Math.max(50,w-left-right),ph=Math.max(70,h-top-bottom);
    const maxTotal=Math.max(1,...months.map(m=>m.total));
    const ymax=Math.max(5,Math.ceil(maxTotal*1.15/5)*5);
    const yy=v=>top+ph-v/ymax*ph,xx=i=>left+pw*(i+.5)/months.length;
    const legend=[['Abiertos',color.abierto],['Cerrados',color.cerrado],['Revisar',color.revisar]];
    ctx.font=compact?'9px Segoe UI':'11px Segoe UI';ctx.textAlign='left';
    const step=compact?Math.min(86,pw/3):96;
    legend.forEach(([label,c],i)=>{const x=left+i*step;ctx.fillStyle=c;ctx.fillRect(x,10,9,9);ctx.fillStyle='#34516e';ctx.fillText(label,x+13,19);});
    for(let i=0;i<=4;i++){
        const v=ymax*i/4,y=yy(v);
        ctx.strokeStyle='#e5edf6';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+pw,y);ctx.stroke();
        ctx.fillStyle='#667e99';ctx.font='10px Segoe UI';ctx.textAlign='right';ctx.fillText(String(Math.round(v)),left-7,y+3);
    }
    const bw=Math.max(5,Math.min(54,pw/months.length*.57));
    months.forEach((m,i)=>{
        const x=xx(i)-bw/2;let base=0;
        for(const [field,c] of [['abierto',color.abierto],['cerrado',color.cerrado],['revisar',color.revisar]]){
            const val=m[field];if(!val)continue;
            const y=yy(base+val),bh=yy(base)-y;ctx.fillStyle=c;ctx.fillRect(x,y,bw,bh);
            if(bh>=17&&bw>=24){ctx.fillStyle='#fff';ctx.font='bold 10px Segoe UI';ctx.textAlign='center';ctx.fillText(String(val),xx(i),y+bh/2+3);}
            base+=val;
        }
        if(m.total){ctx.fillStyle='#102d53';ctx.font='bold 11px Segoe UI';ctx.textAlign='center';ctx.fillText(String(m.total),xx(i),Math.max(top+7,yy(m.total)-7));}
        ctx.fillStyle='#536c88';ctx.font=compact?'9px Segoe UI':'10px Segoe UI';ctx.textAlign='center';ctx.fillText(compact?names[m.mi].slice(0,3):names[m.mi].slice(0,3),xx(i),h-15);
    });
}

// Gráfico mensual de columnas: utiliza el promedio REAL de dias calculado por averageBy.
function drawMonthlyAverageColumns(canvas, entries) {
    const {ctx,width,height}=prepareCanvas(canvas);
    if (!entries.length) {
        ctx.fillStyle="#64748b";ctx.textAlign="center";ctx.font="13px Segoe UI";
        ctx.fillText("Sin notificaciones con días registrados",width/2,height/2);return;
    }
    const months={ene:0,enero:0,feb:1,febrero:1,mar:2,marzo:2,abr:3,abril:3,may:4,mayo:4,jun:5,junio:5,jul:6,julio:6,ago:7,agosto:7,sep:8,septiembre:8,setiembre:8,oct:9,octubre:9,nov:10,noviembre:10,dic:11,diciembre:11};
    const monthIndex=label=>{const t=String(label).toLowerCase().trim();const k=t.replace(/[áéíóú]/g,x=>({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[x])).split(/[ \/-]/)[0];return months[k]??months[k.slice(0,3)]??99;};
    const sorted=[...entries].sort((a,b)=>monthIndex(a[0])-monthIndex(b[0]));
    const L=38,R=15,T=26,B=46, plotW=Math.max(20,width-L-R),plotH=Math.max(20,height-T-B);
    const max=Math.max(3,...sorted.map(x=>Number(x[1])||0))*1.2;
    ctx.textAlign="right";ctx.font="11px Segoe UI";
    for(let i=0;i<=4;i++){let val=max*i/4,y=T+plotH*(1-i/4);ctx.strokeStyle="#e5edf6";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(width-R,y);ctx.stroke();ctx.fillStyle="#64748b";ctx.fillText(val.toFixed(1),L-7,y+4);}
    const y3=T+plotH*(1-3/max);ctx.save();ctx.setLineDash([5,4]);ctx.strokeStyle="#ef4444";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(L,y3);ctx.lineTo(width-R,y3);ctx.stroke();ctx.restore();
    ctx.textAlign="right";ctx.fillStyle="#dc2626";ctx.font="10px Segoe UI";ctx.fillText("Meta 3 días",width-R,y3-5);
    const step=plotW/sorted.length,bw=Math.min(42,step*.65);
    sorted.forEach(([label,raw],i)=>{const value=Number(raw)||0;const bh=plotH*value/max;const x=L+step*i+(step-bw)/2,y=T+plotH-bh;
      ctx.fillStyle=value>3?"#f59e0b":(i===sorted.length-1?"#0755ad":"#2389f7");ctx.fillRect(x,y,bw,bh);
      ctx.fillStyle="#163b65";ctx.textAlign="center";ctx.font="bold 11px Segoe UI";ctx.fillText(value.toLocaleString('es-EC',{minimumFractionDigits:1,maximumFractionDigits:1}),x+bw/2,Math.max(13,y-6));
      ctx.fillStyle="#526982";ctx.font="10px Segoe UI";ctx.fillText(String(label).slice(0,9),x+bw/2,height-19);
    });
}

// =========================================================
// TABLA
// =========================================================

function renderTable(
    data
) {

    tbody.innerHTML = "";


    const fragment =
        document.createDocumentFragment();


    data.forEach(
        item => {

            const tr =
                document.createElement(
                    "tr"
                );


            const columns = [

                item.responsable,

                item.notificacion,

                item.orden,

                item.estadoSAPOrden,

                item.descripcion,

                item.descripcion1,

                item.descripcion2,

                item.fechaAviso,

                item.fechaContab,

                // CORREGIDO
                item.dias,

                item.estadoTiempo,

                item.textoNotificacion,

                item.costoReal

            ];


            columns.forEach(
                value => {

                    const td =
                        document.createElement(
                            "td"
                        );


                    td.textContent =
                        safeText(
                            value
                        );


                    tr.appendChild(
                        td
                    );

                }
            );

            // Acción OT: solo permite crear cuando el aviso no tiene orden.
            const actionTd = document.createElement("td");
            const ordenActual = String(item.orden ?? "").trim();

            if (ordenActual && ordenActual !== "0" && ordenActual !== "-") {
                const existing = document.createElement("span");
                existing.className = "ot-existing";
                existing.textContent = "✓ OT " + ordenActual;
                actionTd.appendChild(existing);
            } else {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "btn-create-ot";
                btn.textContent = "+ Crear OT";
                btn.addEventListener("click", () => openOtModal(item));
                actionTd.appendChild(btn);
            }

            tr.appendChild(actionTd);

            fragment.appendChild(
                tr
            );

        }
    );


    tbody.appendChild(
        fragment
    );

}



// =========================================================
// CREAR OT DESDE AVISO - POWER AUTOMATE / SAP
// =========================================================

const otModal = document.getElementById("otModal");
const otClose = document.getElementById("otClose");
const otCancel = document.getElementById("otCancel");
const otPrepare = document.getElementById("otPrepare");
const otAviso = document.getElementById("otAviso");
const otTipo = document.getElementById("otTipo");
const otDescripcion = document.getElementById("otDescripcion");
const otFechaInicio = document.getElementById("otFechaInicio");
const otFechaFin = document.getElementById("otFechaFin");
const otPtoTrabajo = document.getElementById("otPtoTrabajo");
const otMessage = document.getElementById("otMessage");

// IMPORTANTE: pega aquí la URL ACTUAL del disparador HTTP de Power Automate.
// No publiques este archivo con la URL firmada en un repositorio público.
const POWER_AUTOMATE_OT_URL = "https://defaulte9193073ba8b4e388647ba66872708.21.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/29/workflows/f530429f74e74a41aaee5520872e0076/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=jRyMSocJgrbdj3deoxKMOu9pnk9WD-R6J_Nn-GEcBpg";

// Persistencia por navegador y origen (GitHub Pages).
// No sincroniza entre computadoras; para eso se necesita almacenamiento central.
const OT_STORAGE_KEY = "control_avisos_sap_ot_v1";
let otGuardadas = cargarOtGuardadas();
const otEnProceso = new Set();

function cargarOtGuardadas() {
    try {
        const data = JSON.parse(localStorage.getItem(OT_STORAGE_KEY) || "{}");
        return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch (error) {
        console.warn("No se pudo leer el historial local de OT", error);
        return {};
    }
}

function numeroOtValido(value) {
    const valueText = String(value ?? "").trim();
    return /^\d{6,15}$/.test(valueText) ? valueText : "";
}

function aplicarOtGuardadas() {
    DATA.forEach(item => {
        const aviso = String(item.notificacion ?? "").trim();
        const ordenSAP = numeroOtValido(item.orden);
        const ordenLocal = numeroOtValido(otGuardadas[aviso]?.orden);
        // El JSON de SAP prevalece sobre el registro local si ya contiene una OT.
        if (ordenSAP) {
            if (aviso && ordenLocal !== ordenSAP) {
                otGuardadas[aviso] = {orden: ordenSAP, origen: "SAP"};
            }
        } else if (aviso && ordenLocal) {
            item.orden = ordenLocal;
        }
    });
    try { localStorage.setItem(OT_STORAGE_KEY, JSON.stringify(otGuardadas)); }
    catch (error) { console.warn("No se pudo sincronizar el historial local", error); }
}

function guardarOtLocal(aviso, numeroOT) {
    otGuardadas[aviso] = {
        orden: numeroOT,
        origen: "Power Automate",
        fechaRegistro: new Date().toISOString()
    };
    try {
        localStorage.setItem(OT_STORAGE_KEY, JSON.stringify(otGuardadas));
        return true;
    } catch (error) {
        console.error("No se pudo guardar la OT en este navegador", error);
        return false;
    }
}

let otSelectedItem = null;

function fechaParaSap(fecha) {
    return String(fecha ?? "").trim().replaceAll("/", ".");
}

function openOtModal(item) {
    const avisoActual = String(item.notificacion ?? "").trim();
    if (numeroOtValido(item.orden) || numeroOtValido(otGuardadas[avisoActual]?.orden)) {
        alert("Este aviso ya tiene una OT registrada: " + (numeroOtValido(item.orden) || otGuardadas[avisoActual].orden));
        return;
    }
    otSelectedItem = item;

    const aviso = String(item.notificacion ?? "").trim();
    const descripcion =
        String(item.descripcion2 ?? "").trim() ||
        String(item.descripcion1 ?? "").trim() ||
        String(item.descripcion ?? "").trim();
    const fecha = String(item.fechaAviso ?? "").trim();
    const ptoTrabajo = String(item.ptoTrabajo ?? "").trim().toUpperCase();

    otAviso.value = aviso;
    otTipo.value = "ZM02";
    otDescripcion.value = descripcion;
    otFechaInicio.value = fecha;
    otFechaFin.value = fecha;
    otPtoTrabajo.value = ptoTrabajo;
    otMessage.style.color = "#d14343";
    otMessage.textContent = "";

    otModal.classList.remove("ot-hidden");
    otModal.setAttribute("aria-hidden", "false");
}

function closeOtModal() {
    otModal.classList.add("ot-hidden");
    otModal.setAttribute("aria-hidden", "true");
    otSelectedItem = null;
}

async function prepareOtRequest() {
    if (!otSelectedItem) {
        otMessage.style.color = "#d14343";
        otMessage.textContent = "No se encontró el aviso seleccionado.";
        return;
    }

    const aviso = otAviso.value.trim();
    if (numeroOtValido(otSelectedItem.orden) || numeroOtValido(otGuardadas[aviso]?.orden) || otEnProceso.has(aviso)) {
        otMessage.style.color = "#d14343";
        otMessage.textContent = "Este aviso ya tiene una OT o una solicitud en proceso.";
        return;
    }
    const ptoTrabajo = otPtoTrabajo.value.trim().toUpperCase();
    const fechaInicio = fechaParaSap(otFechaInicio.value);
    const horaInicio = String(otSelectedItem.horaAviso ?? "").trim();

    if (!aviso) {
        otMessage.style.color = "#d14343";
        otMessage.textContent = "El aviso no tiene número de notificación.";
        return;
    }

    if (!ptoTrabajo) {
        otMessage.style.color = "#d14343";
        otMessage.textContent = "El aviso no tiene Pto. trabajo responsable.";
        return;
    }

    if (!fechaInicio) {
        otMessage.style.color = "#d14343";
        otMessage.textContent = "El aviso no tiene fecha de inicio.";
        return;
    }

    if (!horaInicio) {
        otMessage.style.color = "#d14343";
        otMessage.textContent = "El aviso no tiene hora de creación en IW28.";
        return;
    }

    if (POWER_AUTOMATE_OT_URL.includes("PEGA_AQUI")) {
        otMessage.style.color = "#d14343";
        otMessage.textContent = "Falta configurar la URL de Power Automate en app.js.";
        return;
    }

    const payload = {
        aviso: aviso,
        ptoTrabajo: ptoTrabajo,
        fechaInicio: fechaInicio,
        horaInicio: horaInicio
    };

    otEnProceso.add(aviso);
    const textoBotonOriginal = otPrepare.textContent;
    otPrepare.disabled = true;
    otPrepare.textContent = "Creando OT...";
    otMessage.style.color = "#1f5f99";
    otMessage.textContent = "Enviando solicitud a Power Automate y SAP...";

    try {
        const response = await fetch(POWER_AUTOMATE_OT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const detalle = await response.text().catch(() => "");
            throw new Error(`HTTP ${response.status}${detalle ? " - " + detalle : ""}`);
        }

        let respuesta = null;
        try {
            respuesta = await response.json();
        } catch (_) {
            // El flujo puede responder 200 sin cuerpo JSON.
        }

        const numeroOT = String(respuesta?.numeroOT ?? "").trim();

        if (!numeroOT) {
            throw new Error("Power Automate respondió correctamente, pero no devolvió el número de OT.");
        }

        // Guarda antes de redibujar. Permanece tras recargar o actualizar el JSON.
        const guardado = guardarOtLocal(aviso, numeroOT);
        otSelectedItem.orden = numeroOT;

        otMessage.style.color = "#177245";
        otMessage.textContent = guardado
            ? `✓ OT ${numeroOT} creada correctamente en SAP y guardada en este navegador`
            : `✓ OT ${numeroOT} creada en SAP, pero no se pudo guardar localmente`;

        // Redibuja la tabla: el botón + Crear OT cambia a ✓ OT 8005...
        renderDashboard();

    } catch (error) {
        console.error("ERROR CREANDO OT EN SAP:", error);
        otMessage.style.color = "#d14343";
        otMessage.textContent =
            "No se pudo ejecutar Power Automate. " +
            (error?.message || "Error desconocido.");
    } finally {
        otEnProceso.delete(aviso);
        otPrepare.disabled = false;
        otPrepare.textContent = textoBotonOriginal;
    }
}

if (otClose) otClose.addEventListener("click", closeOtModal);
if (otCancel) otCancel.addEventListener("click", closeOtModal);
if (otPrepare) otPrepare.addEventListener("click", prepareOtRequest);

if (otFechaInicio) {
    otFechaInicio.addEventListener("input", () => {
        otFechaFin.value = otFechaInicio.value;
    });
}

if (otModal) {
    otModal.addEventListener("click", event => {
        if (event.target === otModal) closeOtModal();
    });
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && otModal && !otModal.classList.contains("ot-hidden")) {
        closeOtModal();
    }
});


// =========================================================
// RENDER COMPLETO
// =========================================================

function renderDashboard() {

    const filteredData =
        getFilteredData();


    renderKPIs(
        filteredData
    );


    renderCharts(
        filteredData
    );


    renderTable(
        filteredData
    );

}


// =========================================================
// CARGAR JSON
// =========================================================

async function loadData(
    forceRender = true
) {

    try {

        const response =
            await fetch(
                DATA_URL +
                "?t=" +
                Date.now(),
                {
                    cache:
                        "no-store"
                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const json =
            await response.json();


        if (
            json.ok === false
        ) {

            throw new Error(
                json.error ||
                "El archivo avisos.json reportó un error."
            );

        }


        DATA =
            Array.isArray(
                json.data
            )
                ? json.data
                : [];

        aplicarOtGuardadas();


        VERSION_ACTUAL =
            safeText(
                json.version
            );


        ULTIMA_ACTUALIZACION =
            safeText(
                json.lastUpdate
            );


        lastUpdate.textContent =
            ULTIMA_ACTUALIZACION ||
            "Sin información";


        configureFilters();


        if (
            forceRender
        ) {

            renderDashboard();

        }


        console.log(
            "Datos cargados:",
            DATA.length
        );


        console.log(
            "Versión:",
            VERSION_ACTUAL
        );


        // Verificación adicional
        const registrosConDias =
            DATA.filter(
                item =>
                    validNumber(
                        item.dias
                    ) !== null
            ).length;


        console.log(
            "Registros con días válidos:",
            registrosConDias
        );


    } catch (
        error
    ) {

        console.error(
            "ERROR CARGANDO avisos.json:",
            error
        );


        lastUpdate.textContent =
            "Error al cargar datos";

    }

}


// =========================================================
// COMPROBAR ACTUALIZACIÓN
// =========================================================

async function checkVersion() {

    try {

        const response =
            await fetch(
                DATA_URL +
                "?t=" +
                Date.now(),
                {
                    cache:
                        "no-store"
                }
            );


        if (
            !response.ok
        ) {

            return;

        }


        const json =
            await response.json();


        if (
            json.ok === false
        ) {

            return;

        }


        const nuevaVersion =
            safeText(
                json.version
            );


        if (
            nuevaVersion &&
            nuevaVersion !==
            VERSION_ACTUAL
        ) {

            console.log(
                "Nueva versión detectada:",
                nuevaVersion
            );


            await loadData(
                true
            );

        }


    } catch (
        error
    ) {

        console.warn(
            "No se pudo comprobar actualización:",
            error
        );

    }

}


// =========================================================
// DESCARGAR CSV
// =========================================================

function downloadCSV() {

    const data =
        getFilteredData();


    const headers = [

        "Responsable",

        "Notificación",

        "Orden",

        "Status sistema",

        "Descripción",

        "Descripción_1",

        "Descripción_2",

        "Fecha de aviso",

        "Fecha contab.",

        "Días Notificación",

        "Estado Tiempo",

        "Texto de notificación",

        "Costo real",

        "Acción OT"

    ];


    const rows =
        data.map(
            item => [

                item.responsable,

                item.notificacion,

                item.orden,

                item.estadoSAPOrden,

                item.descripcion,

                item.descripcion1,

                item.descripcion2,

                item.fechaAviso,

                item.fechaContab,

                // CORREGIDO
                item.dias,

                item.estadoTiempo,

                item.textoNotificacion,

                item.costoReal

            ]
        );


    const escapeCSV =
        value => {

            const text =
                safeText(
                    value
                )
                .replace(
                    /"/g,
                    '""'
                );


            return `"${text}"`;

        };


    const csv = [

        headers
            .map(
                escapeCSV
            )
            .join(
                ";"
            ),

        ...rows.map(
            row =>
                row
                    .map(
                        escapeCSV
                    )
                    .join(
                        ";"
                    )
        )

    ].join(
        "\n"
    );


    const blob =
        new Blob(
            [
                "\uFEFF" +
                csv
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        "detalle_avisos_sap.csv";


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );

}


// =========================================================
// EVENTOS
// =========================================================

monthFilter.addEventListener(
    "change",
    () => {
        configureDays();
        renderDashboard();
    }
);


dayFilter.addEventListener(
    "change",
    renderDashboard
);


classFilter.addEventListener(
    "change",
    renderDashboard
);


btnRefresh.addEventListener(
    "click",
    async () => {

        await loadData(
            true
        );

    }
);


const btnReset = document.getElementById("btnReset");
if (btnReset) btnReset.addEventListener("click", resetFilters);

btnDownload.addEventListener(
    "click",
    downloadCSV
);


// =========================================================
// REDIBUJAR AL CAMBIAR TAMAÑO
// =========================================================

let resizeTimer = null;


window.addEventListener(
    "resize",
    () => {

        clearTimeout(
            resizeTimer
        );


        resizeTimer =
            setTimeout(
                () => {

                    renderDashboard();

                },
                200
            );

    }
);


// =========================================================
// INICIO
// =========================================================

async function iniciar() {

    console.log(
        "=========================================="
    );

    console.log(
        "CONTROL AVISOS SAP - GITHUB PAGES"
    );

    console.log(
        "Fuente:",
        DATA_URL
    );

    console.log(
        "=========================================="
    );


    await loadData(
        true
    );


    // Revisar cada 10 segundos si GitHub publicó
    // una nueva versión del JSON.

    setInterval(
        checkVersion,
        10000
    );

}


iniciar();