import * as T from './vendor/three.module.min.mjs';
import {clamp} from './world.mjs';

export const origin = new T.Vector3(-3.23,-2.2,-10.34);

function plumeTexture(colors) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(48,49,2,48,49,45);
  for (const [offset,color] of colors) gradient.addColorStop(offset,color);
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,96,96);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  return texture;
}

function flameTexture(phase){
  const canvas=document.createElement('canvas');
  const w=80,h=128;
  canvas.width=w;
  canvas.height=h;
  const ctx=canvas.getContext('2d');
  const image=ctx.createImageData(w,h);
  for(let y=0;y<h;y++){
    const rise=1-y/(h-1);
    const center=Math.sin(rise*7+phase)*.15*rise+Math.sin(rise*17-phase)*.07*rise;
    const width=.81*Math.pow(1-rise,.68);
    for(let x=0;x<w;x++){
      const edge=Math.abs((x+.5)*2/w-1-center)/Math.max(.012,width);
      const noise=.15*Math.sin(x*.29+y*.25+phase)*Math.sin(y*.41-phase);
      const opacity=clamp((1-edge+noise)*2.15,0,1)*clamp(rise*18,0,1)*clamp((1-rise)*13,0,1);
      const hot=clamp((1-edge)*.81+(1-rise)*.37,0,1);
      const n=(y*w+x)*4;
      image.data[n]=255;
      image.data[n+1]=38+215*hot;
      image.data[n+2]=8+180*Math.pow(hot,3.4);
      image.data[n+3]=Math.round(255*opacity);
    }
  }
  ctx.putImageData(image,0,0);
  const map=new T.CanvasTexture(canvas);
  map.colorSpace=T.SRGBColorSpace;
  return map;
}

export function createFire(scene, surfaces) {
  const fireMaps=Array.from({length:8},(_,i)=>flameTexture(i*Math.PI/4));
  const smokeMap = plumeTexture([[0,'#363532d8'],[.37,'#383734a0'],[.7,'#44403c66'],[1,'#4b474000']]);
  function sprites(count,map,blending) {
    return Array.from({length:count},()=>{
      const sprite=new T.Sprite(new T.SpriteMaterial({map, transparent:true, depthWrite:false, blending}));
      scene.add(sprite);
      return sprite;
    });
  }
  const flame=sprites(19,fireMaps[0],T.NormalBlending);
  const steam=sprites(14,plumeTexture([[0,'#fff9e5c0'],[.4,'#d2dcd8a0'],[1,'#cbd6d500']]),T.NormalBlending);
  const splash=sprites(11,plumeTexture([[0,'#dff6fff0'],[.25,'#b6dfedac'],[1,'#a6e0fa00']]),T.NormalBlending);
  const embers=sprites(12,plumeTexture([[0,'#fff4bd'],[.42,'#ff861db0'],[1,'#c82c0700']]),T.AdditiveBlending);
  const smoke=sprites(48,smokeMap,T.NormalBlending);
  const light=new T.PointLight(0xff591b,9,7,2);
  light.position.copy(origin).y+=.52;
  scene.add(light);
  const count=220, positions=new Float32Array(count*3);
  const geometry=new T.BufferGeometry();
  const attribute=new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('position',attribute);
  const water=new T.Points(geometry,new T.PointsMaterial({color:0xc8eeff,size:.045,transparent:true,opacity:.87,depthWrite:false}));
  water.frustumCulled=false;
  water.visible=false;
  scene.add(water);
  const ray=new T.Raycaster(), start=new T.Vector3(), end=new T.Vector3(), segment=new T.Vector3();
  const direction=new T.Vector3(), source=new T.Vector3(), contact=new T.Vector3();
  const closest=new T.Vector3(), sight=new T.Vector3(), rayHits=[];
  let impact=false;
  const path=Array.from({length:25},()=>new T.Vector3());
  const state={heat:.74,fuel:1,wet:0,smoke:[.25,.035,.012,0],tank:420,steam:0,flow:false,jetHit:false,reported:false,pattern:0};
  function reset(){
    Object.assign(state,{heat:.74,fuel:1,wet:0,smoke:[.25,.035,.012,0],tank:420,steam:0,flow:false,jetHit:false,reported:false,pattern:0});
    water.visible=false;
    impact=false;
  }
  function trajectory(camera,now){
    camera.getWorldDirection(direction);
    source.copy(camera.position).addScaledVector(direction,.12);
    path[0].copy(source);
    const range=state.pattern===0?9:5.6;
    let last=24, hit=false;
    impact=false;
    for(let i=1;i<=24;i++){
      const d=range*i/24;
      start.copy(path[i-1]);
      end.copy(source).addScaledVector(direction,d);
      end.y-=.027*d*d;
      segment.copy(end).sub(start);
      ray.far=segment.length();
      ray.set(start,sight.copy(segment).normalize());
      rayHits.length=0;
      ray.intersectObjects(surfaces,false,rayHits);
      const obstacle=rayHits[0];
      if(obstacle) end.copy(obstacle.point);
      path[i].copy(end);
      segment.copy(end).sub(start);
      const t=clamp(sight.copy(origin).sub(start).dot(segment)/Math.max(.000001,segment.lengthSq()),0,1);
      closest.copy(start).addScaledVector(segment,t);
      const distance=sight.copy(origin).sub(closest).length();
      if(distance<(state.pattern===0?.43:.62)){
        ray.far=Math.max(0,distance-.04);
        ray.set(closest,sight.normalize());
        rayHits.length=0;
        ray.intersectObjects(surfaces,false,rayHits);
        if(!rayHits.length){
          hit=true;
          impact=true;
          contact.copy(closest);
          end.copy(closest);
          path[i].copy(end);
          last=i;
          break;
        }
      }
      if(obstacle){
        impact=true;
        contact.copy(obstacle.point).addScaledVector(direction,-.034);
        last=i;
        break;
      }
    }
    for(let i=0;i<count;i++){
      const progress=((now*.005+i*.618)%1)*last;
      const lower=Math.floor(progress), t=progress-lower;
      const p=start.copy(path[lower]).lerp(path[Math.min(last,lower+1)],t);
      const spread=.013+(state.pattern===0?.047:.47)*(progress/24);
      attribute.setXYZ(i,p.x+Math.sin(i*29)*spread,p.y+Math.cos(i*17)*spread,p.z);
    }
    attribute.needsUpdate=true;
    return hit;
  }
  function step(dt,now,camera,doors){
    water.visible=state.flow && state.tank>0;
    const hit=water.visible && trajectory(camera,now);
    state.jetHit=hit;
    if(water.visible) state.tank=Math.max(0,state.tank-dt*(state.pattern===0?5:6));
    if(!state.tank) state.flow=false;
    state.wet=clamp(state.wet+dt*(hit?.62:-.065),0,1);
    state.steam=clamp(state.steam+dt*(hit&&state.heat>.08?.53:-.20),0,1);
    if(state.heat>.015){
      const air=doors[3].open ? 1 : .59;
      state.heat=clamp(state.heat+dt*(.072*air*(1-state.heat)-state.wet*.09-(hit?(state.pattern===0?.20:.17):0)),0,state.fuel);
      state.fuel=Math.max(0,state.fuel-state.heat*dt*.00085);
      if(state.heat<.025) state.heat=0;
    }
    const smokeLevels=state.smoke;
    smokeLevels[0]=clamp(smokeLevels[0]+dt*(state.heat*.10-smokeLevels[0]*.043),0,1);
    function exchange(a,b,amount){
      const flow=(smokeLevels[a]-smokeLevels[b])*amount*dt;
      smokeLevels[a]-=flow;
      smokeLevels[b]+=flow;
    }
    exchange(0,1,doors[3].open?.20:.009);
    exchange(1,2,.10);
    exchange(1,3,doors[4].open?.12:.005);
    smokeLevels[2]*=1-dt*(doors[0].open?.18:.025);
    smokeLevels[3]*=1-dt*.027;
    const flameHeight=Math.sqrt(state.heat)*(1-state.wet*.32);
    light.intensity=state.heat*(19+Math.sin(now*.019)*3+Math.sin(now*.041)*1.8);
    for(let i=0;i<flame.length;i++){
      const f=flame[i], age=(now*(.0012+i%3*.00028)+i*.173)%1;
      f.visible=state.heat>.02;
      if(!f.visible) continue;
      const phase=i*2.399+age*2.4, base=(i%5-2)*.135;
      const width=(.37+i%4*.075)*(1-age*.4)*flameHeight;
      const height=(.62+i%6*.14)*(1-age*.36)*flameHeight;
      f.position.set(origin.x+base+Math.sin(phase)*age*.24,origin.y-.21+height*.48+age*.53*flameHeight,origin.z+Math.cos(i*2.39)*.23);
      f.scale.set(width,height,1);
      f.material.map=fireMaps[(Math.floor(now/62)+i)%fireMaps.length];
      f.material.rotation=Math.sin(phase)*.31*age;
      f.material.opacity=(.9-age*.69)*(1-state.wet*.21);
    }
    for(let i=0;i<embers.length;i++){
      const ember=embers[i], age=(now*.001+i*.237)%1, angle=i*2.4;
      ember.visible=state.heat>.02||(state.fuel<.997&&state.wet>.08&&i<4);
      const lift=state.heat>.02?age*flameHeight:0;
      ember.position.set(origin.x+Math.cos(angle)*(.22+lift*.3),origin.y-.2+lift*1.42,origin.z+Math.sin(angle)*(.18+lift*.16));
      ember.scale.setScalar(.034+(1-age)*.046);
      ember.material.opacity=(1-age)*(.25+state.heat*.48);
    }
    for(let i=0;i<steam.length;i++){
      const puff=steam[i], age=(now*.00059+i*.237)%1, a=i*2.399;
      puff.visible=state.steam>.015;
      puff.position.set(origin.x+Math.cos(a)*age*.79,Math.min(-.43,origin.y+.11+age*1.64),origin.z+Math.sin(a)*age*.71);
      puff.scale.set(.22+age*.94,.22+age*.78,1);
      puff.material.rotation=a;
      puff.material.opacity=state.steam*(1-age)*.49;
    }
    for(let i=0;i<splash.length;i++){
      const drop=splash[i], age=(now*.0036+i*.163)%1, a=i*2.399;
      drop.visible=water.visible&&impact;
      drop.position.copy(contact);
      drop.position.x+=Math.cos(a)*age*.29;
      drop.position.y+=Math.sin(a)*age*.22-age*age*.19;
      drop.position.z+=Math.sin(a)*age*.22;
      drop.scale.setScalar(.055+age*.19);
      drop.material.opacity=(1-age)*.76;
    }
    const rooms=[[-3.22,-10.25,1.5,1.12,-.23],[0,-9.9,.56,1.38,-.25],[0,-4.5,.57,1.5,1.72],[3,-10,1.15,1.23,-.23]];
    for(let i=0;i<smoke.length;i++){
      const room=Math.floor(i/12), puff=smoke[i], [x,z,rx,rz,top]=rooms[room];
      const density=smokeLevels[room];
      puff.visible=density>.02;
      if(!puff.visible) continue;
      const age=(now*.00016+i*.137)%1, a=i*2.399+age*1.13;
      puff.position.set(x+Math.sin(a)*rx*age,top-.22-(1-age)*(room===2?1.45:1.9),z+Math.cos(a)*rz*age);
      puff.scale.setScalar(.45+age*1.75);
      puff.material.opacity=Math.min(.65,density*.47)*(1-age*.67);
      puff.material.rotation=a*.15;
    }
  }
  return {state,step,reset};
}
