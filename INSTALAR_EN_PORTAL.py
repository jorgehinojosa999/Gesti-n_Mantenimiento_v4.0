# -*- coding: utf-8 -*-
"""Integra el módulo 2025/2026 en un portal GitHub Pages existente.
Coloca este archivo y la carpeta informance_3d_2025_2026 al lado de index.html.
No modifica JS ni CSS del portal y crea respaldo previo.
"""
from pathlib import Path
import re
import shutil

root = Path(__file__).resolve().parent
index = root / 'index.html'
module = root / 'informance_3d_2025_2026' / 'index.html'
if not index.is_file():
    raise SystemExit('ERROR: ejecuta este script en la carpeta del portal, junto a index.html.')
if not module.is_file():
    raise SystemExit('ERROR: falta la carpeta informance_3d_2025_2026 con index.html.')
html = index.read_text(encoding='utf-8-sig')
if 'informance_3d_2025_2026/' in html:
    print('El portal ya tiene un enlace al módulo. No se hicieron modificaciones.')
    raise SystemExit(0)
backup = root / 'index_ANTES_DE_INFORMANCE_3D.html'
if not backup.exists():
    shutil.copy2(index, backup)
link = ('\n<a href="./informance_3d_2025_2026/" '
        'style="display:inline-flex;align-items:center;gap:8px;margin:8px;padding:11px 15px;'
        'border-radius:9px;background:#0b75c5;color:#fff;text-decoration:none;font-weight:700;'
        'font-family:Arial,sans-serif" '
        'title="Comparativo de paros por máquina 2025 vs 2026">'
        '◈ Análisis 3D · Paros 2025–2026</a>\n')
if re.search(r'</nav\s*>', html, flags=re.I):
    new = re.sub(r'</nav\s*>', lambda m:link+m.group(0), html, count=1, flags=re.I)
elif re.search(r'</body\s*>', html, flags=re.I):
    # Si no existe NAV no se modifican scripts; añade un enlace flotante accesible.
    fallback = ('<div style="position:fixed;right:18px;bottom:18px;z-index:99999">'
                +link+'</div>\n')
    new = re.sub(r'</body\s*>',lambda m:fallback+m.group(0),html,count=1,flags=re.I)
else:
    print('No se encontró </nav> ni </body>. Se preservó index.html; añade el enlace manualmente.')
    raise SystemExit(1)
index.write_text(new, encoding='utf-8')
print('Integración realizada. Respaldo:', backup.name)
print('Módulo local: informance_3d_2025_2026/index.html')
print('Antes de publicar, revisa el cambio en index.html.')
