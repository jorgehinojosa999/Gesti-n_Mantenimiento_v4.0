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

            input.checked =
                true;

            input.value =
                value;

            input.id =
                `${prefix}_${index}`;

            input.addEventListener(
                "change",
                renderDashboard
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
// CONFIGURAR FILTROS
// =========================================================

function configureFilters() {

    configureMonths();


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

}


// =========================================================
// FILTRAR DATOS
// =========================================================

function getFilteredData() {

    const mes =
        monthFilter.value;

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

    const avisosMes =
        Object.entries(
            countBy(
                data,
                "mes"
            )
        );


    drawHorizontalBars(
        month,
        avisosMes,
        COLORS.purple
    );


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


    drawHorizontalBars(
        avgMonth,
        promedioMes,
        COLORS.green
    );

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

        "Costo real"

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