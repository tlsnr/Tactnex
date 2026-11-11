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

export function createFire(scene, surfaces) {
  const fireMap = plumeTexture([[0,'#fff4aa'],[.24,'#ffcf56'],[.58,'#fc651dcb'],[1,'#d4310c00']]);
  const smokeMap = plumeTexture([[0,'#363532d8'],[.37,'#383734a0'],[.7,'#44403c66'],[1,'#4b474000']]);
  function sprites(count,map,blending) {
    return Array.from({length:count},()=>{
      const sprite=new T.Sprite(new T.SpriteMaterial({map, transparent:true, depthWrite:false, blending}));
      scene.add(sprite);
      return sprite;
    });
  }
  const flame=sprites(24,fireMap,T.AdditiveBlending);
  const smoke=sprites(48,smokeMap,T.NormalBlending);
  const light=new T.PointLight(0xff591b,9,7,2);
  light.position.copy(origin).y+=.52;
  scene.add(light);
  const count=115, positions=new Float32Array(count*3);
  const geometry=new T.BufferGeometry();
  const attribute=new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('position',attribute);
  const water=new T.Points(geometry,new T.PointsMaterial({color:0x9ee2ff,size:.059,transparent:true,opacity:.77,depthWrite:false}));
  water.frustumCulled=false;
  water.visible=false;
  scene.add(water);
  const ray=new T.Raycaster(), start=new T.Vector3(), end=new T.Vector3(), segment=new T.Vector3();
  const direction=new T.Vector3(), source=new T.Vector3();
  const path=Array.from({length:25},()=>new T.Vector3());
  const state={heat:.74,fuel:1,wet:0,smoke:[.25,.035,.012,0],tank:420,steam:0,flow:false,jetHit:false,reported:false,pattern:0};
  function reset(){
    Object.assign(state,{heat:.74,fuel:1,wet:0,smoke:[.25,.035,.012,0],tank:420,steam:0,flow:false,jetHit:false,reported:false,pattern:0});
    water.visible=false;
  }
  function trajectory(camera,now){
    camera.getWorldDirection(direction);
    source.copy(camera.position).addScaledVector(direction,.12);
    path[0].copy(source);
    const range=state.pattern===0?9:5.6;
    let last=24, hit=false;
    for(let i=1;i<=24;i++){
      const d=range*i/24;
      start.copy(path[i-1]);
      end.copy(source).addScaledVector(direction,d);
      end.y-=.027*d*d;
      segment.copy(end).sub(start);
      ray.set(start,segment.clone().normalize());
      ray.far=segment.length();
      const obstacle=ray.intersectObjects(surfaces,false)[0];
      if(obstacle) end.copy(obstacle.point);
      path[i].copy(end);
      const delta=segment.copy(end).sub(start);
      const t=clamp(origin.clone().sub(start).dot(delta)/Math.max(.000001,delta.lengthSq()),0,1);
      const near=start.addScaledVector(delta,t).distanceTo(origin);
      if(near<(state.pattern===0?.44:.65)){
        hit=true;
        last=i;
        break;
      }
      if(obstacle){
        last=i;
        break;
      }
    }
    for(let i=0;i<count;i++){
      const progress=((now*.005+i*.618)%1)*last;
      const lower=Math.floor(progress), t=progress-lower;
      const p=start.copy(path[lower]).lerp(path[Math.min(last,lower+1)],t);
      const spread=(state.pattern===0?.036:.24)*(progress/24);
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
    state.steam=clamp(state.steam+dt*(hit&&state.heat>.15?.37:-.15),0,1);
    if(state.heat>.015){
      const air=doors[3].open ? 1 : .59;
      state.heat=clamp(state.heat+dt*(.072*air*(1-state.heat)-state.wet*.09-(hit?.20:0)),0,state.fuel);
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
    light.intensity=state.heat*(14+Math.sin(now*.018)*3);
    for(let i=0;i<flame.length;i++){
      const age=(now*.0015+i*.217)%1, f=flame[i];
      f.visible=state.heat>.02;
      if(!f.visible) continue;
      const swirl=i*2.4+age*1.8;
      f.position.copy(origin).add(new T.Vector3(Math.sin(swirl)*.36*state.heat,age*1.4*state.heat-.18,Math.cos(swirl)*.32*state.heat));
      f.scale.set((.57-age*.36)*state.heat,(1.08-age*.45)*state.heat,1);
      f.material.rotation=Math.sin(swirl)*.38;
      f.material.opacity=(1-age)*.79;
    }
    const rooms=[[-3.22,-10.25,1.5,1.12,-.23],[0,-9.9,.56,1.38,-.25],[0,-4.5,.57,1.5,1.72],[3,-10,1.15,1.23,-.23]];
    for(let i=0;i<smoke.length;i++){
      const room=Math.floor(i/12), puff=smoke[i], [x,z,rx,rz,top]=rooms[room];
      const density=smokeLevels[room]+(room===0?state.steam*.35:0);
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
