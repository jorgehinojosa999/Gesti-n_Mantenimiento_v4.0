"""Ejecutar una única vez desde CMD: py INSTALAR_DESDE_CMD.py"""
import json, os, subprocess, sys
from pathlib import Path

base=Path(__file__).resolve().parent
print('INSTALADOR DE ACTUALIZACION AUTOMATICA IW39 POR CAMBIOS')
print('Se requiere estar en la computadora con OneDrive y el repositorio Git local.\n')

def preguntar(candidatos,mensaje,condicion):
    for p in candidatos:
        if condicion(p):
            print('Detectado:',p)
            if input('¿Usar esta ruta? [S/n]: ').strip().lower() not in ('n','no'): return p
    while True:
        p=Path(input(mensaje).strip().strip('"'))
        if condicion(p): return p
        print('No existe o no contiene los archivos esperados:',p)

od=[Path(x) for x in (os.getenv('OneDriveCommercial'),os.getenv('OneDrive')) if x]
folders=[r/'04. ORDENES'/'HISTORICO' for r in od]+[r/'04. ORDENES'/'HISTORICOS' for r in od]
historico=preguntar(folders,'Pega la ruta completa de HISTORICO: ',lambda x:x.is_dir())
repo_candidates=[base.parent,Path.home()/'Documents'/'PORTAL_MANTENIMIENTO_UNIFICADO'/'github'/'Gesti-n_Mantenimiento_v4.0']
repo=preguntar(repo_candidates,'Pega la ruta completa del repositorio Gesti-n_Mantenimiento_v4.0: ',lambda x:(x/'dashboard_sap'/'actualizar_dashboard_sap.py').is_file() and (x/'.git').is_dir())
subprocess.run([sys.executable,'-m','pip','install','--user','watchdog','openpyxl'],check=True)
subprocess.run(['git','--version'],check=True)
config=base/'config_iw39_eventos.json'
config.write_text(json.dumps({'historico':str(historico.resolve()),'repo':str(repo.resolve())},ensure_ascii=False,indent=2),encoding='utf-8')
# Utilizar un .cmd de arranque generado en carpeta de usuario, sin depender de --tr comillas complejas.
launcher=base/'ARRANQUE_AUTOMATICO_IW39.cmd'
pythonw=Path(sys.executable).with_name('pythonw.exe')
exe=pythonw if pythonw.exists() else Path(sys.executable)
launcher.write_text('@echo off\ncd /d "'+str(base)+'"\n"'+str(exe)+'" "'+str(base/'vigilar_historico.py')+'"\n',encoding='utf-8')
name='TESALIA_IW39_POR_CAMBIOS'
# La tarea a inicio de sesión permanece viva y espera notificaciones de la carpeta.
cmd=['schtasks','/Create','/F','/SC','ONLOGON','/TN',name,'/TR',f'cmd.exe /c ""{launcher}""']
res=subprocess.run(cmd,text=True,capture_output=True)
if res.returncode:
    print('Windows no permitió crear la tarea:',res.stderr.strip() or res.stdout.strip())
    print('Puedes agregar el acceso directo al .cmd en shell:startup. El monitor NO debe abrirse cada día manualmente.')
    sys.exit(1)
print('\nTarea instalada:',name)
print('Inicia al entrar a Windows. No revisa cada 5 minutos: escucha cambios de carpeta.')
print('Registro:',base/'iw39_eventos.log')
print('Para iniciar en este momento ejecuta:')
print('schtasks /Run /TN '+name)
print('Para eliminar la tarea: schtasks /Delete /F /TN '+name)
print('IMPORTANTE: deshabilita la antigua tarea TESALIA_IW39_DASHBOARD_AUTOMATICO para evitar procesos duplicados.')
