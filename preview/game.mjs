import * as T from './vendor/three.module.min.mjs';
import {createWorld, floorAt, canStand, leafDistance, material, clamp} from './world.mjs';
import {createFire, origin} from './fire.mjs';
import {createSoftwareRenderer} from './software-renderer.mjs';

const ui=id=>document.getElementById(id);
const scene=new T.Scene();
scene.background=new T.Color(0xa5bac3);
scene.fog=new T.FogExp2(0xa5bac3,.015);
const camera=new T.PerspectiveCamera(68,innerWidth/innerHeight,.045,100);
camera.rotation.order='YXZ';
let renderer;
try {
  renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
} catch (error) {
  try {
    renderer=createSoftwareRenderer();
    ui('location').title='Vereinfachte 3D-Darstellung ohne WebGL';
  } catch {
    ui('error').textContent='Die 3D-Darstellung konnte in diesem Browser nicht gestartet werden.';
    throw error;
  }
}
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.17;
document.body.prepend(renderer.domElement);
function resize(){
  const w=innerWidth,h=innerHeight;
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.35,Math.sqrt(1550000/(w*h))));
  renderer.setSize(w,h);
}
addEventListener('resize',resize);
resize();
scene.add(new T.HemisphereLight(0xe9f3ff,0x747566,1.65));
const sun=new T.DirectionalLight(0xffe1ac,2.25);
sun.position.set(-9,13,12);
scene.add(sun);
const world=createWorld(scene);
const fire=createFire(scene,world.surfaces);
const {state}=fire;
scene.add(camera);
const hand=new T.Group();
hand.position.set(.39,-.33,-.63);
camera.add(hand);
const grip=material(0x202b30);
const alloy=material(0x9ca4a6,{metalness:.55});
const caseMat=material(0x2e3e43);
const display=new T.MeshBasicMaterial({color:0x85bba8});
const devices=['Hände','Strahlrohr','Wärmebild','Messgerät','Funkgerät','Lampe'];
const models=devices.map(()=>new T.Group());
for(const m of models) hand.add(m);
const box=(i,w,h,d,x,y,z,mat)=>world.box(w,h,d,x,y,z,mat,models[i]);
box(1,.13,.15,.23,0,-.062,.07,grip);
for(const [r1,r2,length,z,mat] of [[.052,.06,.37,-.13,alloy],[.081,.07,.105,-.32,grip],[.062,.062,.08,.035,grip]]){
  const part=world.mesh(new T.CylinderGeometry(r1,r2,length,18),mat,0,0,z,models[1]);
  part.rotation.x=Math.PI/2;
}
box(1,.16,.028,.15,0,.077,-.04,material(0xd84f2b));
for(const i of [2,3,4]){
  box(i,i===2?.24:.15,.19,.12,0,0,0,caseMat);
  box(i,i===2?.19:.11,.083,.014,0,.031,.066,display);
  box(i,.045,.026,.014,0,-.045,.067,alloy);
}
box(4,.027,.18,.027,.052,.168,0,grip);
const lampBody=world.mesh(new T.CylinderGeometry(.06,.045,.24,16),alloy,0,0,0,models[5]);
lampBody.rotation.x=Math.PI/2;
const lamp=new T.SpotLight(0xffeed8,0,15,.37,.62,1.35);
lamp.position.set(0,.015,-.1);
lamp.target.position.set(0,0,-6);
camera.add(lamp,lamp.target);
const smokeScreen=document.createElement('div');
smokeScreen.style.cssText='position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse,#645f56,#292826);opacity:0';
document.body.append(smokeScreen);
const thermalCanvas=document.createElement('canvas');
thermalCanvas.width=256;thermalCanvas.height=144;
thermalCanvas.style.cssText='position:fixed;width:min(52vw,340px);height:auto;top:50%;left:50%;transform:translate(-50%,-50%);border:5px solid #283638;border-radius:9px;pointer-events:none';
thermalCanvas.hidden=true;
document.body.append(thermalCanvas);
const thermalContext=thermalCanvas.getContext('2d');
const thermalRay=new T.Raycaster(), heatProjection=new T.Vector3(), thermalDirection=new T.Vector3();
function drawThermal(){
  const ctx=thermalContext,w=256,h=144;
  ctx.fillStyle='#17172e';
  ctx.fillRect(0,0,w,h);
  // Each sample maps a visible surface to a relative temperature palette.
  for(let j=0;j<14;j++){
    for(let i=0;i<24;i++){
      thermalRay.setFromCamera({x:(i+.5)/12-1,y:1-(j+.5)/7},camera);
      thermalRay.far=15;
      const point=thermalRay.intersectObjects(world.surfaces,false)[0]?.point;
      const value=point ? Math.max(.12,state.heat*Math.exp(-point.distanceTo(origin)*.86)) : .04;
      ctx.fillStyle='hsl('+Math.round(260+130*value)+' 68% '+Math.round(12+64*value)+'%)';
      ctx.fillRect(i*w/24,j*h/14,Math.ceil(w/24),Math.ceil(h/14));
    }
  }
  thermalDirection.copy(origin).sub(camera.position);
  thermalRay.set(camera.position,thermalDirection.clone().normalize());
  thermalRay.far=thermalDirection.length()-.11;
  heatProjection.copy(origin).project(camera);
  if(state.heat>.02 && heatProjection.z<1 && Math.abs(heatProjection.x)<1 && Math.abs(heatProjection.y)<1 &&
     !thermalRay.intersectObjects(world.surfaces,false).length){
    const x=(heatProjection.x+1)*w/2,y=(1-heatProjection.y)*h/2,r=11+state.heat*16;
    const glow=ctx.createRadialGradient(x,y,1,x,y,r);
    glow.addColorStop(0,'#ffffcc');glow.addColorStop(.45,'#ff9e36');glow.addColorStop(1,'#ff320000');
    ctx.fillStyle=glow;
    ctx.fillRect(x-r,y-r,2*r,2*r);
  }
  ctx.strokeStyle='#fff9';
  ctx.beginPath();ctx.moveTo(w/2-5,h/2);ctx.lineTo(w/2+5,h/2);ctx.moveTo(w/2,h/2-5);ctx.lineTo(w/2,h/2+5);ctx.stroke();
  ctx.fillStyle='#efe6d6';ctx.font='10px system-ui';ctx.fillText('WÄRMEBILD · RELATIV',8,15);
}

let running=false, selected=0, thermal=false, measuring=false, flashlight=false;
let yaw=0,pitch=0,feet=0,eye=1.65,crouched=false,notification='',until=0;
const keys=new Set();
const move={x:0,y:0};
function say(message){
  notification=message;
  until=performance.now()+3600;
}
function toggleCrouch(){
  if(!running) return;
  if(crouched && !canStand(world,camera.position.x,camera.position.z,feet,1.65)) return;
  crouched=!crouched;
  ui('crouch').setAttribute('aria-pressed',String(crouched));
}
function equip(i){
  selected=i;
  state.flow=false;
  thermal=false;
  measuring=false;
  thermalCanvas.hidden=true;
  for(const [n,model] of models.entries()) model.visible=n===i;
  for(const [n,button] of [...ui('equipment').children].entries()) button.setAttribute('aria-pressed',String(n===i));
}
for(const [i,name] of devices.entries()){
  const b=document.createElement('button');
  b.textContent=name;
  b.onclick=()=>equip(i);
  ui('equipment').append(b);
}
function room(){
  const {x,z}=camera.position;
  if(z>=0 || z<=-12 || Math.abs(x)>=5.5) return ['Vorplatz',-1];
  if(feet<-.15 && z<-8.3 && x<-1.14) return ['Technikraum',0];
  if(feet<-.15 && z<-8.3 && x>1.14) return ['Lager',3];
  if(feet<-.15 && Math.abs(x)>1.14) return [x<0?'Technikraum':'Lager',x<0?0:3];
  if(feet<-.15 && z>-8.3) return ['Kellertreppe',feet<-1.5?1:2];
  if(feet<-.15) return ['Kellerflur',1];
  if(x<-1.14) return ['Wohnzimmer',-1];
  if(x>1.14) return ['Küche',-1];
  return ['Erdgeschoss',2];
}
const doorRay=new T.Raycaster(), towardDoor=new T.Vector3(), forward=new T.Vector3();
function nearestDoor(){
  camera.getWorldDirection(forward);
  let closest=null,best=2.05;
  for(const door of world.doors){
    if(Math.abs(door.y-feet)>1.05) continue;
    towardDoor.set(door.x+Math.cos(door.angle)*door.width/2-camera.position.x,0,door.z-Math.sin(door.angle)*door.width/2-camera.position.z);
    const d=towardDoor.length();
    if(d>=best || (d>.65 && towardDoor.dot(forward)<d*.26)) continue;
    // Check the path to the frame at handle height, excluding its swinging leaf.
    const start=camera.position.clone();
    start.y=door.y+1.05;
    doorRay.set(start,towardDoor.normalize());
    doorRay.far=d-.13;
    const barrier=doorRay.intersectObjects(world.surfaces,false)[0];
    if(barrier && barrier.object.parent!==door.hinge) continue;
    best=d;closest=door;
  }
  return closest;
}
function interact(){
  if(!running) return;
  const door=nearestDoor();
  if(!door){say('Auf eine Tür in Reichweite ausrichten.');return;}
  door.open=!door.open;
  say(door.label+(door.open?' geöffnet.':' geschlossen.'));
}
function use(){
  if(!running) return;
  if(selected===1){
    if(state.tank<=0){say('Tank leer. Am Vorplatz nachfüllen.');return;}
    state.flow=!state.flow;
  } else if(selected===2){
    thermal=!thermal;
    thermalCanvas.hidden=!thermal;
  } else if(selected===3){
    measuring=!measuring;
  } else if(selected===4){
    if(state.heat===0 && camera.position.z>1.3 && Math.abs(camera.position.x)<7){
      state.reported=true;
      say('Leitstelle bestätigt. Einsatz abgeschlossen.');
    } else if(state.heat===0) say('Übungsleitung: Rückmeldung am Vorplatz abgeben.');
    else say('Leitstelle: Kellerbrand bestätigt. Rückmeldung nach dem Löschen.');
  } else if(selected===5){
    flashlight=!flashlight;
    lamp.intensity=flashlight?31:0;
  } else if(camera.position.z>1.3 && Math.abs(camera.position.x)<7){
    state.tank=420;
    say('Wassertank am Vorplatz aufgefüllt.');
  } else interact();
}
ui('use').onclick=use;
ui('interact').onclick=interact;
ui('crouch').onclick=toggleCrouch;
const patternButton=document.createElement('button');
patternButton.textContent='Vollstrahl';
patternButton.onclick=()=>{state.pattern=1-state.pattern;updateHud(performance.now());};
ui('actions').append(patternButton);
function reset(){
  fire.reset();
  feet=yaw=pitch=0;
  eye=1.65;
  crouched=flashlight=false;
  lamp.intensity=0;
  notification='';
  ui('crouch').setAttribute('aria-pressed','false');
  camera.position.set(0,eye,7.3);
  for(const door of world.doors){door.open=false;door.hinge.rotation.y=0;}
  equip(0);
  releaseInput();
}
ui('reset').onclick=reset;

const stick=ui('stick'), thumb=ui('thumb'), canvas=renderer.domElement;
let stickId=null,lookId=null,lastX=0,lastY=0;
function stickMove(e){
  const r=stick.getBoundingClientRect();
  const dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
  const scale=Math.max(r.width*.31,Math.hypot(dx,dy));
  move.x=dx/scale;move.y=dy/scale;
  thumb.style.transform='translate('+move.x*36+'px,'+move.y*36+'px)';
}
function releaseInput(){
  keys.clear();
  if(stickId!==null && stick.hasPointerCapture(stickId)) stick.releasePointerCapture(stickId);
  if(lookId!==null && canvas.hasPointerCapture(lookId)) canvas.releasePointerCapture(lookId);
  lookId=stickId=null;
  move.x=move.y=0;
  thumb.style.transform='';
}
stick.addEventListener('pointerdown',e=>{
  if(!running || stickId!==null) return;
  stickId=e.pointerId;
  stick.setPointerCapture(e.pointerId);
  stickMove(e);
});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId) stickMove(e);});
canvas.addEventListener('pointerdown',e=>{
  if(!running || lookId!==null || e.button!==0) return;
  lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==lookId) return;
  yaw-=(e.clientX-lastX)*.0047;
  pitch=clamp(pitch-(e.clientY-lastY)*.0047,-1.36,1.36);
  lastX=e.clientX;lastY=e.clientY;
});
for(const type of ['pointerup','pointercancel','lostpointercapture']){
  stick.addEventListener(type,e=>{
    if(e.pointerId!==stickId) return;
    stickId=null;move.x=move.y=0;thumb.style.transform='';
  });
  canvas.addEventListener(type,e=>{if(e.pointerId===lookId) lookId=null;});
}
addEventListener('blur',releaseInput);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){releaseInput();state.flow=false;}
});
addEventListener('keydown',e=>{
  if(!running || e.ctrlKey || e.altKey || e.metaKey) return;
  const k=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright','e','f','c','1','2','3','4','5','6'].includes(k)) e.preventDefault();
  keys.add(k);
  if(e.repeat) return;
  if(k==='e') interact();
  if(k==='f') use();
  if(k==='c') toggleCrouch();
  if(/^[1-6]$/.test(k)) equip(Number(k)-1);
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('contextmenu',e=>e.preventDefault());
function movePlayer(dt){
  const speed=crouched?1.45:3.2;
  const f=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'))-move.y;
  const s=Number(keys.has('d'))-Number(keys.has('a'))+move.x;
  yaw+=(Number(keys.has('arrowleft'))-Number(keys.has('arrowright')))*dt*1.9;
  const ratio=speed*dt/Math.max(1,Math.hypot(f,s));
  const dx=(Math.cos(yaw)*s-Math.sin(yaw)*f)*ratio;
  const dz=(-Math.sin(yaw)*s-Math.cos(yaw)*f)*ratio;
  const p=camera.position;
  const targetEye=crouched?1.03:1.65;
  for(const [x,z] of [[p.x+dx,p.z],[null,p.z+dz]]){
    const nextX=x??p.x;
    const y=floorAt(nextX,z,feet);
    if(canStand(world,nextX,z,y,targetEye)){p.x=nextX;p.z=z;feet=y;}
  }
  eye+=(targetEye-eye)*Math.min(1,dt*12);
  p.y=feet+eye;
  camera.rotation.set(pitch,yaw,0,'YXZ');
}
function updateHud(now){
  const [label,index]=room();
  ui('location').textContent=label;
  const goal=state.reported?'Einsatz abgeschlossen':state.heat===0?'Feuer aus · am Vorplatz funken':'Brand im Technikraum löschen';
  ui('objective').textContent=goal;
  ui('feedback').textContent=now<until?notification:state.jetHit?'Wasser trifft den Brandherd.':'';
  let gauges='';
  if(selected===1) gauges='Wasser '+Math.ceil(state.tank)+' / 420 L';
  if(measuring){
    const smoke=index<0?0:state.smoke[index];
    const temp=19+(index===0?state.heat*150:smoke*26);
    gauges='Modellwerte · '+Math.round(temp)+' °C · Rauchindex '+Math.round(smoke*100)+' / 100';
  }
  ui('gauges').textContent=gauges;
  const door=nearestDoor();
  ui('interact').textContent=door?door.label+(door.open?' schließen':' öffnen'):'Tür';
  ui('interact').disabled=!door;
  const outside=camera.position.z>1.3&&Math.abs(camera.position.x)<7;
  ui('use').textContent=[
    outside?'Tank füllen':'Interagieren',
    state.flow?'Wasser stoppen':'Wasser abgeben',
    thermal?'Wärmebild aus':'Wärmebild an',
    measuring?'Messung aus':'Messen',
    'Funken',
    flashlight?'Lampe aus':'Lampe an'
  ][selected];
  ui('use').disabled=selected===0&&!outside&&!door;
  patternButton.hidden=selected!==1;
  patternButton.textContent=state.pattern?'Sprühstrahl':'Vollstrahl';
}
let previous=0,hudAt=0,thermalAt=0;
function frame(now){
  const dt=Math.min(.045,(now-(previous||now))/1000);
  previous=now;
  if(running){
    movePlayer(dt);
    for(const door of world.doors){
      const angle=door.hinge.rotation.y;
      const direction=door.angle===0?1:door.x<0?1:-1;
      const target=door.open?direction*1.68:0;
      const next=angle+clamp(target-angle,-dt*2.8,dt*2.8);
      const clearance=leafDistance(door,camera.position.x,camera.position.z,next);
      if(Math.abs(feet-door.y)>.8 || clearance>.29 || clearance>leafDistance(door,camera.position.x,camera.position.z,angle)) door.hinge.rotation.y=next;
    }
    scene.updateMatrixWorld(true);
    fire.step(dt,now,camera,world.doors);
    const [,index]=room();
    const smoke=index<0?0:state.smoke[index]+(index===0?state.steam*.18:0);
    const haze=smoke*(crouched?.59:1);
    smokeScreen.style.opacity=thermal?'0':String(Math.min(.68,haze*.75));
    scene.fog.density=.015+haze*.083;
    scene.fog.color.setHex(index<0?0xa5bac3:0x57554d);
    if(now>=hudAt){updateHud(now);hudAt=now+100;}
    if(thermal&&now>=thermalAt){drawThermal();thermalAt=now+155;}
  }
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
reset();
updateHud(performance.now());
ui('start').disabled=false;
ui('start').textContent='Einsatz beginnen';
ui('start').onclick=()=>{ui('briefing').close();running=true;};
requestAnimationFrame(frame);
