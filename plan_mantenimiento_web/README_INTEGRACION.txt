PLAN DE MANTENIMIENTO - INTEGRACIÓN EN GITHUB PAGES

ARCHIVOS:
- plan_mantenimiento.html
- css/plan_mantenimiento.css
- js/plan_mantenimiento.js
- data/plan_mantenimiento.json

PASOS:
1. Copia la carpeta/archivos al repositorio:
   Gestion_Mantenimiento_v4.0/

2. Sube todo a GitHub y haz commit/push.

3. Abre:
   https://jorgehinojosa999.github.io/Gestion_Mantenimiento_v4.0/plan_mantenimiento.html

4. En tu portal principal, cambia el enlace "Plan de Mantenimiento" por:
   href="plan_mantenimiento.html"

IMPORTANTE:
GitHub Pages es estático y NO ejecuta PHP/MySQL.
Esta versión trabaja con un JSON generado desde tu Excel.

LÓGICA DE MESES:
El filtro MES revisa estas cuatro columnas:
- MES_DE_INICIO
- MES_DE_INTERVENCION_2
- MES_DE_INTERVENCION_3
- MES_DE_INTERVENCION_4

Si un plan está en MAYO y NOVIEMBRE:
- filtrando MAYO aparece una ocurrencia;
- filtrando NOVIEMBRE aparece una ocurrencia;
- sin filtro mensual, el valor y la cantidad del plan se contabilizan 2 veces para la demanda anual.

FALTANTE:
El KPI "Faltante estimado" consolida demanda por CODIGO_SAP para no descontar el mismo stock varias veces por cada fila.

PARA ACTUALIZAR DATOS:
Reemplaza data/plan_mantenimiento.json por una versión nueva generada desde tu Excel.
Después se puede automatizar esta conversión.
