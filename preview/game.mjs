import {createIncident} from './incident.mjs';
import * as T from './vendor/three.module.min.mjs';
import {createWorld, floorAt, canStand, leafDistance, material, clamp} from './world.mjs';
import {createFire, origin} from './fire.mjs';
import {createSoftwareRenderer} from './software-renderer.mjs';
import {createDevicePanel, createAlarm, meterValues} from './devices.mjs';
import {createGlove} from './gloves.mjs';

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
const incident=createIncident();
const squad=incident.state;
const airLine=document.createElement('div');
airLine.id='air-line';
ui('gauges').after(airLine);
scene.add(camera);
const hand=new T.Group();
hand.position.set(.39,-.33,-.63);
camera.add(hand);
const grip=material(0x202b30);
const alloy=material(0x9ca4a6,{metalness:.55});
const devicesPanel=createDevicePanel(closeDevice);
const alarm=createAlarm();
const devices=['Hände','Strahlrohr','Wärmebild','Messgerät','Funkgerät','Lampe'];
const models=devices.map(()=>new T.Group());
for(const m of models) hand.add(m);
const right=createGlove(models[0],1,false);
right.glove.position.set(.02,-.10,-.27);
right.glove.rotation.set(-.28,-.26,-.17);
const left=createGlove(models[0],-1,false);
left.glove.position.set(-.77,-.11,-.28);
left.glove.rotation.set(-.29,.27,.18);
const nozzleGrip=createGlove(models[1],1,true);
nozzleGrip.glove.position.set(.053,-.10,.048);
nozzleGrip.glove.rotation.set(.17,-.19,-.62);
const lampGrip=createGlove(models[5],1,true);
lampGrip.glove.position.set(.04,-.078,.06);
lampGrip.glove.rotation.z=-.68;
const box=(i,w,h,d,x,y,z,mat)=>world.box(w,h,d,x,y,z,mat,models[i]);
box(1,.13,.15,.23,0,-.062,.07,grip);
for(const [r1,r2,length,z,mat] of [[.052,.06,.37,-.13,alloy],[.081,.07,.105,-.32,grip],[.062,.062,.08,.035,grip]]){
  const part=world.mesh(new T.CylinderGeometry(r1,r2,length,18),mat,0,0,z,models[1]);
  part.rotation.x=Math.PI/2;
}
box(1,.16,.028,.15,0,.077,-.04,material(0xd84f2b));
const lampBody=world.mesh(new T.CylinderGeometry(.06,.045,.24,16),alloy,0,0,0,models[5]);
lampBody.rotation.x=Math.PI/2;
hand.traverse(object=>{if(object.isMesh) object.renderOrder=10;});
const lamp=new T.SpotLight(0xffeed8,0,15,.37,.62,1.35);
lamp.position.set(0,.015,-.1);
lamp.target.position.set(0,0,-6);
camera.add(lamp,lamp.target);
const smokeScreen=document.createElement('div');
smokeScreen.style.cssText='position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse,#645f56,#292826);opacity:0';
document.body.append(smokeScreen);
const thermalContext=devicesPanel.thermal.getContext('2d');
const thermalRay=new T.Raycaster(), heatProjection=new T.Vector3(), thermalDirection=new T.Vector3();
const thermalSample=document.createElement('canvas');
thermalSample.width=48;
thermalSample.height=30;
const sampleContext=thermalSample.getContext('2d');
const pixels=sampleContext.createImageData(thermalSample.width,thermalSample.height);
const rayHits=[];
function drawThermal(){
  const ctx=thermalContext,w=devicesPanel.thermal.width,h=devicesPanel.thermal.height;
  const cols=thermalSample.width,rows=thermalSample.height;
  for(let j=0;j<rows;j++){
    for(let i=0;i<cols;i++){
      thermalRay.setFromCamera({x:(i+.5)*2/cols-1,y:1-(j+.5)*2/rows},camera);
      thermalRay.far=15;
      rayHits.length=0;
      thermalRay.intersectObjects(world.surfaces,false,rayHits);
      const hit=rayHits[0];
      const warmth=hit?state.heat*Math.exp(-hit.point.distanceTo(origin)*.92):0;
      const gray=hit?Math.round(37+145*Math.exp(-hit.distance*.19)):22;
      const hot=clamp((warmth-.13)*2.2,0,1);
      const offset=(j*cols+i)*4;
      pixels.data[offset]=gray+(255-gray)*hot;
      pixels.data[offset+1]=gray+(180-gray)*hot;
      pixels.data[offset+2]=gray*(1-.84*hot);
      pixels.data[offset+3]=255;
    }
  }
  sampleContext.putImageData(pixels,0,0);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(thermalSample,0,0,w,h);
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

}

let running=false, selected=0, thermal=false, measuring=false, flashlight=false;
let yaw=0,pitch=0,feet=0,eye=1.65,crouched=false,notification='',until=0,radioUntil=0;
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
function closeDevice(){
  devicesPanel.show(null);
  thermal=false;
  measuring=false;
  alarm.update(false);
}
function openDevice(device){
  if(devicesPanel.current()===device) return;
  closeDevice();
  devicesPanel.show(device);
  thermal=device==='thermal';
  measuring=device==='meter';
  if(thermal) thermalAt=0;
  if(measuring) alarm.unlock();
}
function equip(i){
  selected=i;
  state.flow=false;
  const device=({2:'thermal',3:'meter',4:'radio'})[i];
  if(device) openDevice(device);
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
  alarm.unlock();
  if(selected===1){
    if(squad.phase!=='attack'||squad.reserveReached){say('Strahlrohr im Angriff nach der Zielmeldung benutzen.');return;}
    if(state.tank<=0){say('Tank leer. Am Vorplatz nachfüllen.');return;}
    state.flow=!state.flow;
  } else if(selected===2){
    openDevice('thermal');
  } else if(selected===3){
    const wasOpen=devicesPanel.current()==='meter';
    openDevice('meter');
    if(wasOpen) measuring=!measuring;
    if(!measuring){devicesPanel.updateMeter(null);alarm.update(false);}
  } else if(selected===4){
    openDevice('radio');
    radioUntil=performance.now()+850;
    devicesPanel.setRadio(true);
    alarm.radio();
    say(incident.radio({outside:atAssembly(),atGoal:atTarget(),extinguished:state.heat===0}));
    state.reported=squad.phase==='complete'&&!squad.aborted;
  } else if(selected===5){
    flashlight=!flashlight;
    lamp.intensity=flashlight?31:0;
  } else if(camera.position.z>1.3 && Math.abs(camera.position.x)<7){
    if(squad.phase==='check') say(incident.check());
    else {state.tank=420;say('Wassertank am Vorplatz aufgefüllt.');}
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
  incident.reset();
  closeDevice();
  radioUntil=0;
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
  if(document.hidden){releaseInput();state.flow=false;alarm.update(false);}
});
addEventListener('keydown',e=>{
  if(!running || e.ctrlKey || e.altKey || e.metaKey) return;
  const k=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright','e','f','c','1','2','3','4','5','6'].includes(k)) e.preventDefault();
  keys.add(k);
  if(e.repeat) return;
  if(k==='escape') closeDevice();
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
    const entering=p.z>=0&&z<0&&Math.abs(nextX)<5.5;
    if(entering&&['check','register','failed','complete'].includes(squad.phase)) continue;
    if(canStand(world,nextX,z,y,targetEye)){p.x=nextX;p.z=z;feet=y;}
  }
  eye+=(targetEye-eye)*Math.min(1,dt*12);
  p.y=feet+eye;
  camera.rotation.set(pitch,yaw,0,'YXZ');
}
function atAssembly(){
  return camera.position.z>1.3&&Math.abs(camera.position.x)<7;
}
function atTarget(){
  const {x,z}=camera.position;
  return feet<-2.6 && z<-8.85 && z>-11.8 && x<1.04;
}
function updateHud(now){
  const [label,index]=room();
  ui('location').textContent=label;
  const goals={
    check:'Am Vorplatz · Hände → Truppkontrolle',
    register:'Atemschutzüberwachung per Funk anmelden',
    advance:'Zum Technikraum vorgehen und Einsatzziel melden',
    attack:state.heat===0?'Feuer aus · Rückweg per Funk melden':'Brandbekämpfung · Rückwegreserve beachten',
    return:'Zum Vorplatz zurück und per Funk abmelden',
    complete:squad.aborted?'Trupp abgemeldet · Einsatz abgebrochen':'Trupp abgemeldet · Einsatz abgeschlossen',
    failed:'Übung abgebrochen · Atemluft erschöpft'
  };
  const goal=squad.reserveReached&&['advance','attack'].includes(squad.phase)?'Rückwegreserve erreicht · Rückweg melden':goals[squad.phase];
  airLine.textContent=squad.phase==='check'?'Angriffstrupp · 2 Personen':
    'Truppführer '+Math.ceil(squad.air[0])+' bar · Truppmann '+Math.ceil(squad.air[1])+' bar'+
    (squad.inbound>0?' · Rückwegreserve '+Math.ceil(2*squad.inbound)+' bar':'');
  ui('objective').textContent=goal;
  ui('feedback').textContent=now<until?notification:state.jetHit?'Wasser trifft den Brandherd · Brand kühlt ab.':'';
  let gauges='';
  if(selected===1) gauges='Wasser '+Math.ceil(state.tank)+' / 420 L';
  if(measuring){
    const values=meterValues(index<0?0:state.smoke[index],index===0?state.heat:0);
    devicesPanel.updateMeter(values);
    alarm.update(values.alarm&&!document.hidden);
    if(values.alarm) gauges=[gauges,'Gasalarm'].filter(Boolean).join(' · ');
  }
  if(radioUntil && now>=radioUntil){devicesPanel.setRadio(false);radioUntil=0;}
  ui('gauges').textContent=gauges;
  const door=nearestDoor();
  ui('interact').textContent=door?door.label+(door.open?' schließen':' öffnen'):'Tür';
  ui('interact').disabled=!door;
  const outside=camera.position.z>1.3&&Math.abs(camera.position.x)<7;
  ui('use').textContent=[
    outside?(squad.phase==='check'?'Truppkontrolle':'Tank füllen'):'Interagieren',
    state.flow?'Wasser stoppen':'Wasser abgeben',
    'Wärmebild anzeigen',
    measuring?'Messung aus':'Messen',
    'Funken',
    flashlight?'Lampe aus':'Lampe an'
  ][selected];
  ui('use').disabled=(selected===0&&!outside&&!door)||(selected===2&&thermal);
  patternButton.hidden=selected!==1;
  patternButton.textContent=state.pattern?'Sprühstrahl':'Vollstrahl';
}
let previous=0,hudAt=0,thermalAt=0;
function frame(now){
  const dt=Math.min(.045,(now-(previous||now))/1000);
  previous=now;
  if(running){
    const previousX=camera.position.x, previousZ=camera.position.z;
    movePlayer(dt);
    const message=incident.step(dt,{outside:atAssembly(),
      moving:Math.hypot(camera.position.x-previousX,camera.position.z-previousZ)>.001,working:state.flow});
    if(message) say(message);
    if(squad.reserveReached||squad.phase==='failed') state.flow=false;
    const sway=Math.sin(now*.004)*.016;
    hand.position.y=-.33+sway;
    right.pose(Math.max(0,sway)*3);
    left.pose(Math.max(0,-sway)*3);
    nozzleGrip.pose(state.flow ? .18 : 0);
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
    smokeScreen.style.opacity=String(Math.min(.68,haze*.75));
    scene.fog.density=.015+haze*.083;
    scene.fog.color.setHex(index<0?0xa5bac3:0x57554d);
    if(now>=hudAt){updateHud(now);hudAt=now+100;}
    if(thermal&&now>=thermalAt){drawThermal();thermalAt=now+200;}
  }
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
reset();
updateHud(performance.now());
ui('start').disabled=false;
ui('start').textContent='Einsatz beginnen';
ui('start').onclick=()=>{alarm.unlock();ui('briefing').close();running=true;};
requestAnimationFrame(frame);
