/* Visualización 3D industrial por Asset. Maquinaria procedimental y esquemática, no CAD real. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const holder=document.getElementById('webglCanvas');
const notice=document.getElementById('webglMessage');
const scene=new THREE.Scene(); scene.background=new THREE.Color('#e2edf7'); scene.fog=new THREE.Fog('#e2edf7',19,38);
const camera=new THREE.PerspectiveCamera(36,1,.1,120);camera.position.set(7,10,16);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
const canvas=renderer.domElement;holder.insertBefore(canvas,holder.firstChild);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=5;controls.maxDistance=36;controls.maxPolarAngle=1.46;controls.target.set(0,0.9,0);
const material=(color,metalness=.08,roughness=.65,transparent=false,opacity=1)=>new THREE.MeshStandardMaterial({color,metalness,roughness,transparent,opacity});
const steel=material('#b6c9d2',.72,.25),white=material('#f4fafc',.42,.35),blue=material('#1b6aa5',.34,.35),dark=material('#263b4f',.33,.55),glass=material('#b1e2f1',.25,.25,true,.38),silver=material('#91aab8',.7,.28),yellow=material('#f2b83a',.2,.42),red=material('#c75236',.24,.45),plastic=material('#e4f3f5',.04,.22,true,.67),palletMat=material('#b58b54',.05,.9),glow=material('#f4a23f',.1,.55);
scene.add(new THREE.HemisphereLight('#ffffff','#9ab3c8',2.3));
const sun=new THREE.DirectionalLight('#ffffff',2.7);sun.position.set(-8,16,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;sun.shadow.normalBias=.03;scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(110,110),material('#d6e2e9',.1,.92));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.08;scene.add(floor);
const grid=new THREE.GridHelper(80,50,'#b1cadb','#d6e2ea');grid.position.y=-.068;scene.add(grid);
let machinesGroup=new THREE.Group();scene.add(machinesGroup);const pickables=[];const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let layoutSize=5,lastItems=[],lastMode='hours';
function mesh(geo,mat,parent,x,y,z){const obj=new THREE.Mesh(geo,mat);obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj;}
function box(p,x,y,z,w,h,d,mat=steel){return mesh(new THREE.BoxGeometry(w,h,d),mat,p,x,y,z);}
function cylinder(p,x,y,z,rTop,rBottom,height,mat=steel,n=28){return mesh(new THREE.CylinderGeometry(rTop,rBottom,height,n),mat,p,x,y,z);}
function rod(p,x,y,z,ax,ay,az,rad=.026,mat=silver){let a=new THREE.Vector3(x,y,z),b=new THREE.Vector3(ax,ay,az),d=b.clone().sub(a);let o=mesh(new THREE.CylinderGeometry(rad,rad,d.length(),8),mat,p,(x+ax)/2,(y+ay)/2,(z+az)/2);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
function casing(g,w=1.8,h=1.45,d=1.2){box(g,0,.33,0,w,.35,d,steel);box(g,0,.98,0,w,1.1,d,white);box(g,0,1.03,d/2+.012,w*.80,.76,.026,glass);box(g,0,1.53,0,w+.09,.10,d+.09,blue);for(let x of [-w/2+.1,w/2-.1])for(let z of [-d/2+.1,d/2-.1])box(g,x,.10,z,.05,.17,.06,dark);}
function conveyor(g,from=-1.3,to=1.3,z=.75){box(g,(to+from)/2,.47,z,to-from,.17,.36,dark);for(let x=from+.15;x<to;x+=.24)cylinder(g,x,.58,z,.037,.037,.14,silver,8).rotation.x=Math.PI/2;for(let x=from+.2;x<to;x+=.4){rod(g,x,.23,z-.15,x,.39,z-.15,.033);rod(g,x,.23,z+.15,x,.39,z+.15,.033);}}
function bottle(g,x,y,z,scale=.08){cylinder(g,x,y+.24*scale,z,.09*scale,.10*scale,.34*scale,plastic,12);cylinder(g,x,y+.44*scale,z,.05*scale,.06*scale,.09*scale,plastic,12);cylinder(g,x,y+.50*scale,z,.055*scale,.055*scale,.06*scale,blue,12);}
function bottles(g,start,end,z=.75){for(let x=start;x<end;x+=.26)bottle(g,x,.56,z,1.5);}
function panel(g,x=1.02,z=.35){box(g,x,1.05,z,.28,.47,.11,blue);box(g,x,1.10,z+.06,.20,.27,.025,material('#80caed',.05,.15));}
function lamp(g,x=.75,z=0){rod(g,x,1.62,z,x,2.05,z,.028,dark);cylinder(g,x,2.13,z,.073,.073,.23,blue,12);cylinder(g,x,2.16,z,.073,.073,.07,material('#5eca89'),12);cylinder(g,x,2.09,z,.073,.073,.07,glow,12);cylinder(g,x,2.02,z,.073,.073,.07,red,12);}
function guard(g,w=1.9){for(const x of [-w/2,w/2])for(const z of [-.77,.77])rod(g,x,.65,z,x,1.6,z,.024,silver);for(let z of [-.77,.77])rod(g,-w/2,1.6,z,w/2,1.6,z,.022,silver);}
function generic(g){casing(g);conveyor(g,-1.33,1.33);bottles(g,-1.25,1.3);panel(g);lamp(g);}
function buildMachine(kind){
 const g=new THREE.Group();
 switch(kind){
 case 'sopladora':{
  casing(g,2.0,1.4,1.25);box(g,-.43,1.05,.65,.7,.63,.08,glow);
  for(let i=0;i<5;i++)box(g,-.80+i*.2,1.05,.71,.11,.57,.03,yellow);
  const hopper=cylinder(g,-1.21,1.55,0,.45,.17,.57,steel,18);hopper.rotation.z=Math.PI;
  box(g,-1.21,1.96,0,.63,.12,.55,steel);conveyor(g,-1.4,1.35);bottles(g,.15,1.3);panel(g);lamp(g);break;
 }
 case 'mezcladora':{
  box(g,0,.16,0,2.05,.25,1.4,dark);
  for(let x of [-.58,.58]){
   cylinder(g,x,.91,0,.42,.42,1.22,steel,32);cylinder(g,x,1.53,0,.42,.42,.12,silver,32);
   cylinder(g,x,1.75,0,.10,.10,.22,blue,12);rod(g,x,.21,.43,x,.21,.70,.05);
  }
  rod(g,-.58,1.18,.0,.57,1.18,.0,.075,blue);rod(g,.57,1.18,0,1.37,1.18,0,.06,blue);
  panel(g,1.07,.38);lamp(g);break;
 }
 case 'llenadora':{
  cylinder(g,0,.35,0,1.00,1.00,.37,steel);cylinder(g,0,.95,0,.91,.91,.85,glass,40);
  cylinder(g,0,1.45,0,1.05,1.05,.23,steel,40);cylinder(g,0,1.72,0,.22,.22,.28,blue,24);
  for(let a=0;a<24;a++){let theta=2*Math.PI*a/24;let x=.72*Math.cos(theta),z=.72*Math.sin(theta);bottle(g,x,.43,z,2.5);rod(g,x,1.11,z,x,1.35,z,.035,silver);}
  conveyor(g,-1.4,1.4,1);panel(g,1.3,-.17);lamp(g,1.13,-.2);break;
 }
 case 'tapadora':{
  casing(g,1.5,1.4,1.2);cylinder(g,0,1.14,0,.45,.4,.46,glass);
  rod(g,0,1.37,0,0,.64,0,.10,dark);cylinder(g,0,.71,0,.2,.2,.13,blue,18);
  const chute=box(g,.79,1.88,0,.19,.85,.32,silver);chute.rotation.z=-.37;
  cylinder(g,.6,2.35,0,.36,.19,.22,blue);conveyor(g,-1.25,1.3);bottles(g,-1.25,1.3);panel(g,.9,.4);break;
 }
 case 'secador':{
  casing(g,2.0,1.2,1.25);for(let x=-.7;x<=.7;x+=.35){rod(g,x,1.42,.0,x,.68,.0,.085,blue);}
  for(let x of [-.5,.5])cylinder(g,x,1.58,0,.19,.19,.2,silver,20);
  conveyor(g,-1.3,1.3);bottles(g,-1.2,1.3);lamp(g);break;
 }
 case 'etiquetadora':{
  casing(g,1.9,1.25,1.25);for(let x of [-.55,.38]){
   let sp=cylinder(g,x,1.15,.7,.3,.3,.10,white,28);sp.rotation.x=Math.PI/2;cylinder(g,x,1.15,.75,.077,.077,.15,blue,20).rotation.x=Math.PI/2;
  }conveyor(g,-1.4,1.4);bottles(g,-1.28,1.3);panel(g,1.04,.4);break;
 }
 case 'termofijadora':{
  casing(g,2.15,1.2,1.15);box(g,0,.96,.65,1.75,.6,.055,glow);
  for(let x of [-.8,.8])box(g,x,.94,.72,.10,.88,.035,steel);
  box(g,0,1.71,0,.25,.33,.27,dark);conveyor(g,-1.45,1.43);bottles(g,-1.1,1.1);lamp(g);break;
 }
 case 'divisor':{
  box(g,0,.3,0,2.06,.35,1.45,steel);for(let z of [-.4,0,.4]){
   box(g,0,.58,z,1.9,.11,.30,dark);for(let x=-.7;x<.85;x+=.3)bottle(g,x,.67,z,1.25);
   rod(g,-.87,.95,z-.17,.87,.95,z-.17,.035,silver);
  }panel(g,1.01,.5);break;
 }
 case 'paletizador':{
  box(g,0,.21,0,2.30,.22,1.55,dark);for(let x of [-1,1])for(let z of [-.67,.67])rod(g,x,.26,z,x,2.75,z,.085,blue);
  for(let z of [-.67,.67])rod(g,-1,2.70,z,1,2.70,z,.09,blue);
  box(g,0,2.54,0,1.72,.2,1.12,silver);
  for(let x=-.48;x<.55;x+=.34)for(let z=-.36;z<.4;z+=.36){box(g,x,.85,z,.31,.47,.33,plastic);box(g,x,1.30,z,.31,.42,.33,plastic);}
  box(g,0,.51,0,1.6,.15,1.15,palletMat);panel(g,1.25,.3);lamp(g,1.05,-.5);break;
 }
 case 'envolvedor':{
  cylinder(g,0,.20,0,1.05,1.05,.22,dark,40);box(g,0,.4,0,1.35,.17,1.1,palletMat);
  for(let y of [.7,1.05,1.40])box(g,0,y,0,1.18,.27,.99,glass);
  box(g,-1.13,1.28,0,.16,2.22,.33,blue);cylinder(g,-1.13,1.15,.25,.16,.16,.83,plastic,24);
  rod(g,-1.13,2.35,0,.8,2.35,0,.08,blue);panel(g,1.25,.3);break;
 }
 case 'lavadora':{
  casing(g,2.25,1.3,1.4);for(let x=-.75;x<=.75;x+=.36)cylinder(g,x,1.11,-.15,.14,.14,.53,silver,14);
  box(g,-.80,1.75,0,.38,.21,.34,blue);box(g,.6,1.70,0,.44,.14,.45,steel);conveyor(g,-1.4,1.4);panel(g,1.08,.3);break;
 }
 case 'rinser':{
  cylinder(g,0,.49,0,.73,.73,.3,steel);cylinder(g,0,1.07,0,.71,.71,.8,glass);
  cylinder(g,0,1.55,0,.76,.76,.11,steel);for(let i=0;i<12;i++){let a=2*Math.PI*i/12;rod(g,.52*Math.cos(a),.9,.52*Math.sin(a),.52*Math.cos(a),1.43,.52*Math.sin(a),.032,blue);}
  conveyor(g,-1.4,1.4);panel(g,1.02,.3);break;
 }
 case 'codificador':case 'inspector':case 'visorllenas':case 'visorvacias':{
  box(g,0,.33,0,2,.19,.78,dark);box(g,0,.61,0,1.90,.25,.7,silver);
  for(let x=-.7;x<=.7;x+=.32)bottle(g,x,.65,0,1.8);
  for(let x of [-.55,.55])box(g,x,1.30,0,.10,1.10,.65,blue);
  box(g,0,1.84,0,1.35,.18,.64,steel);box(g,0,1.29,.4,.5,.58,.13,glass);
  if(kind==='codificador')box(g,.41,1.24,.43,.35,.32,.1,dark);
  panel(g,1.06,.2);break;
 }
 case 'empaquetador':case 'encajonadora':{
  casing(g,2.0,1.35,1.35);for(let x=-.55;x<=.55;x+=.4)box(g,x,.63,.6,.32,.23,.25,plastic);
  box(g,-.65,1.75,0,.45,.18,.4,blue);box(g,.55,1.77,0,.45,.18,.4,dark);
  conveyor(g,-1.4,1.4);panel(g,1.02,.32);break;
 }
 default:generic(g);
 }
 return g;
}
function makeLabel(name,a,b,valid,mode,selected){
 const c=document.createElement('canvas');c.width=440;c.height=152;const ctx=c.getContext('2d');
 ctx.clearRect(0,0,440,152);
 ctx.fillStyle=selected?'#0d446e':'#ffffff';ctx.strokeStyle=selected?'#0b6097':'#99bbd0';ctx.lineWidth=4;
 ctx.beginPath();ctx.roundRect(3,3,434,146,16);ctx.fill();ctx.stroke();
 ctx.textAlign='center';ctx.fillStyle=selected?'#ffffff':'#173b59';ctx.font='bold 29px Arial';ctx.fillText(name.slice(0,24),220,37);
 ctx.font='bold 23px Arial';ctx.fillStyle=selected?'#b7d9f1':'#2372b3';ctx.fillText('2025   '+a.toFixed(1)+(mode==='hours'?' h':' ev'),112,82);
 ctx.fillStyle=selected?'#9be5e4':'#118f9a';ctx.fillText('2026   '+b.toFixed(1)+(mode==='hours'?' h':' ev'),330,82);
 let diff=valid&&a>0?(b-a)/a*100:null,txt=diff==null?'Sin comparación':diff<0?'▼ '+Math.abs(diff).toFixed(1)+'% reducción':diff>0?'▲ +'+diff.toFixed(1)+'% aumento':'Sin cambio';
 ctx.fillStyle=diff==null?(selected?'#ecf6ff':'#657d91'):diff<0?'#10c28e':diff>0?'#ee6048':'#657d91';ctx.font='bold 26px Arial';ctx.fillText(txt,220,124);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.scale.set(2.2,.76,1);sprite.renderOrder=9;return sprite;
}
function setMachines(items,selected,valid,mode){
 lastItems=items||[];lastMode=mode;
 scene.remove(machinesGroup);machinesGroup.traverse(o=>{if(o.material?.map?.isCanvasTexture)o.material.map.dispose();});
 machinesGroup=new THREE.Group();scene.add(machinesGroup);pickables.length=0;
 const count=items.length,cols=count<=5?count:Math.ceil(count/2),rows=count>5?2:1,spaceX=3.15,spaceZ=rows===1?0:4.0;
 layoutSize=Math.max(6,cols*3.15);
 items.forEach((m,i)=>{
  const row=Math.floor(i/cols),index=i%cols,rowCount=Math.min(cols,count-row*cols);
  const x=(index-(rowCount-1)/2)*spaceX,z=(row-(rows-1)/2)*spaceZ;
  const group=buildMachine(m.id);group.position.set(x,0,z);group.userData.machineId=m.id;
  machinesGroup.add(group);group.traverse(obj=>{if(obj.isMesh){obj.userData.machineId=m.id;pickables.push(obj);}});
  const display=mode==='hours'?[m.stats?.a||0,m.stats?.b||0]:[m.stats?.e25||0,m.stats?.e26||0];
  const label=makeLabel(m.name,display[0],display[1],valid,mode,m.id===selected);label.position.set(x,3.5,z);machinesGroup.add(label);
  if(i<items.length-1){const nextIndex=i+1;if(nextIndex<items.length&&(row===Math.floor(nextIndex/cols))){const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(x+1.35,.08,z),.45,0x2581cb,.35,.16);machinesGroup.add(arrow);}}
 });
 const width=(cols-1)*spaceX+5.3,depth=rows===1?5:8;
 const distance=Math.max(11,width*.88);camera.position.set(Math.max(6,width*.34),Math.max(8,depth*.9),distance);
 camera.far=150;camera.updateProjectionMatrix();controls.target.set(0,1.1,0);controls.update();
 if(notice)notice.textContent=count?`Vista 3D · ${count} equipos para la línea filtrada. Toca una máquina para ver el detalle.`:'Sin equipos físicos detectados para la línea. Usa «Configurar equipos» para añadir los existentes.';
 resize();
}
function resize(){const w=Math.max(1,holder.clientWidth),h=Math.max(1,holder.clientHeight);if(w<20||h<20)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
const observer=new ResizeObserver(resize);observer.observe(holder);window.addEventListener('resize',resize);
canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(pickables,false);const id=hits[0]?.object?.userData?.machineId;if(id&&window.selectInformanceMachine)window.selectInformanceMachine(id);});
let running=true;function draw(){if(!running)return;requestAnimationFrame(draw);controls.update();if(holder.clientWidth>20&&holder.clientHeight>20)renderer.render(scene,camera);}
resize();draw();window.Informance3D={setMachines};window.dispatchEvent(new Event('informance-3d-ready'));
