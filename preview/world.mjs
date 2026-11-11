import * as T from './vendor/three.module.min.mjs';

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const material = (color, options = {}) => new T.MeshStandardMaterial({color, roughness: .83, ...options});
const wall = material(0xdfd6c3);
const trim = material(0xece5d6);
const wood = material(0x71503b);
const dark = material(0x242d30);
const concrete = material(0x8e9292);
const steel = material(0x525d61, {metalness:.5});
const pane = material(0x7299a7, {transparent:true, opacity:.37, roughness:.22});
const brick = material(0x9b5846);

function texture(base, kind) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  let seed = 31;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 4200; i++) {
    ctx.fillStyle = random() > .5 ? '#ffffff18' : '#00000020';
    ctx.fillRect(random()*256, random()*256, 1+random()*4, 1+random()*2);
  }
  if (kind === 'wood') {
    for (let y = 0; y < 256; y += 32) {
      ctx.fillStyle = '#281a146a';
      ctx.fillRect(0,y,256,1);
      ctx.fillRect((y*13)%256,y,1,32);
    }
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(kind === 'grass' ? 55 : 4, kind === 'grass' ? 55 : 4);
  map.anisotropy = 4;
  const surface=material(0xffffff,{map});
  surface.userData.canvasColor=new T.Color(base);
  return surface;
}

export function createWorld(scene) {
  const obstacles = [], surfaces = [], doors = [];
  function mesh(geometry, mat, x,y,z,parent = scene) {
    const object = new T.Mesh(geometry, mat);
    object.position.set(x,y,z);
    parent.add(object);
    return object;
  }
  function box(w,h,d,x,y,z,mat,parent) {
    return mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,parent);
  }
  function solid(w,h,d,x,y,z,mat) {
    const object = box(w,h,d,x,y,z,mat);
    obstacles.push({w,h,d,x,y,z});
    surfaces.push(object);
    return object;
  }
  function floor(w,d,x,y,z,mat) {
    return solid(w,.14,d,x,y-.07,z,mat);
  }
  function door(label,x,z,y,angle,width=1.25) {
    const frame = new T.Group();
    frame.position.set(x,y,z);
    frame.rotation.y = angle;
    scene.add(frame);
    const hinge = new T.Group();
    frame.add(hinge);
    const leaf = box(width,2.13,.075,width/2,1.065,0,wood,hinge);
    surfaces.push(leaf);
    for (const side of [-1,1]) {
      box(width-.18,.68,.024,width/2,1.57,side*.045,trim,hinge);
      box(width-.18,.59,.024,width/2,.48,side*.045,wood,hinge);
      box(.16,.035,.1,width-.16,1.02,side*.07,steel,hinge);
    }
    for (const end of [0,width]) box(.075,2.24,.24,end,1.12,0,trim,frame);
    box(width+.08,.09,.24,width/2,2.19,0,trim,frame);
    doors.push({label,x,z,y,angle,width,hinge,open:false});
  }
  const parquet = texture('#a78b6e','wood');
  const cellar = texture('#777b78','stone');
  floor(11,3,0,0,-1.5,parquet);
  floor(4.4,9,-3.3,0,-7.5,parquet);
  floor(4.4,9,3.3,0,-7.5,parquet);
  floor(2.2,3.7,0,0,-10.15,parquet);
  floor(11,12,0,-2.8,-6,cellar);
  // Exterior terrain surrounds the cellar footprint and leaves the stairs clear.
  const grass = texture('#58734a','grass');
  for (const [w,d,x,z] of [[96,37,0,18.5],[96,32,0,-28],[42.5,12,-26.75,-6],[42.5,12,26.75,-6]]) {
    box(w,.18,d,x,-.12,z,grass).renderOrder=-3;
  }
  const pavers=[material(0xa4a098),material(0x97958d),material(0xb4afa4),material(0xaaa79e)];
  for(let row=0;row<22;row++){
    for(let col=0;col<6;col++){
      box(.488,.045,.488,(col-2.5)*.5,-.033,(row+.5)*.5,pavers[(row*7+col*5+row*col)%4]).renderOrder=-2;
    }
  }
  for(const side of [-1,1]) box(.1,.07,11,side*1.54,-.018,5.5,concrete).renderOrder=-2;
  box(96,.055,6,0,-.055,15,dark).renderOrder=-2;
  box(96,.09,1.18,0,-.024,11.65,concrete).renderOrder=-2;
  box(3.7,.03,9.7,6.55,-.024,6.35,pavers[1]).renderOrder=-2;
  for(const x of [-3.12,3.12]){
    box(2.46,.21,.74,x,.085,.69,brick);
    box(2.52,.056,.79,x,.19,.69,wood);
    for(let i=0;i<7;i++){
      const shrub=mesh(new T.IcosahedronGeometry(.26+(i%2)*.04,1),material(i%2?0x4a6741:0x617942),x+(i-3)*.33,.29,.69);
      shrub.scale.y=.77;
    }
  }
  const canopyRoof=box(2.07,.14,.94,0,2.39,.36,trim);
  canopyRoof.rotation.x=.10;
  for(const x of [-.91,.91]){
    box(.065,.35,.11,x,2.18,.22,steel);
    box(.08,.18,.17,x,1.87,.19,dark);
  }
  for (let x=-42;x<43;x+=6) box(2.5,.018,.1,x,-.018,15,trim);
  for (const x of [-5.5,5.5]) {
    solid(.22,3,12,x,1.5,-6,wall);
    solid(.22,2.8,12,x,-1.4,-6,concrete);
  }
  for (const z of [0,-12]) solid(11,2.8,.22,0,-1.4,z,concrete);
  solid(11,3,.22,0,1.5,-12,wall);
  for (const side of [-1,1]) {
    const x = side*3.0875;
    solid(4.825,.98,.24,x,.49,0,wall);
    solid(4.825,.82,.24,x,2.59,0,wall);
    solid(1.3,1.2,.24,side*1.325,1.58,0,wall);
    solid(1.625,1.2,.24,side*4.6875,1.58,0,wall);
    solid(1.9,1.2,.10,side*2.925,1.58,0,pane);
    box(2.03,.09,.35,side*2.925,.97,.04,trim);
    box(2.03,.07,.25,side*2.925,2.18,.03,trim);
    for (const offset of [-.95,0,.95]) box(.07,1.22,.22,side*2.925+offset,1.58,.02,trim);
    box(4.72,.11,.08,side*3.1,.12,.145,brick);
  }
  solid(1.35,.8,.24,0,2.6,0,wall);
  door('Haustür',-.675,0,0,0,1.35);
  // Two rooms branch off the entrance hall. Continuous walls flank the stair opening.
  for (const x of [-1.14,1.14]) {
    solid(.16,3,1.65,x,1.5,-.825,wall);
    solid(.16,3,5.42,x,1.5,-5.61,wall);
    if(x<0) solid(.16,3,3.68,x,1.5,-10.16,wall);
    solid(.16,.8,1.25,x,2.6,-2.275,wall);
    door(x<0?'Wohnzimmer':'Küche',x,-1.65,0,Math.PI/2);
    solid(.16,2.8,5.3,x,-1.4,-5.65,concrete);
  }
  solid(2.2,3,.16,0,1.5,-8.36,wall);
  solid(2.2,2.8,.15,0,-1.4,-2.98,concrete);
  for(let i=0;i<16;i++){
    const z=-3-(i+.5)*5.3/16, top=-(i+1)*2.8/16;
    surfaces.push(box(2.12,.14,5.3/16,0,top-.07,z,wood));
    box(2.12,.043,.032,0,top+.008,z+5.3/32,steel);
  }
  const rail = mesh(new T.CylinderGeometry(.032,.032,5.99,10),steel,-.98,-.42,-5.65);
  rail.rotation.x=Math.atan2(5.3,2.8);
  // Basement rooms open off the landing, with side access behind the stair walls.
  for(const x of [-1.14,1.14]){
    solid(.17,2.8,.57,x,-1.4,-8.585,concrete);
    solid(.17,2.8,1.85,x,-1.4,-11.075,concrete);
    solid(.17,.62,1.28,x,-.31,-9.51,concrete);
    door(x<0?'Technikraum':'Lager',x,-8.87,-2.8,Math.PI/2,1.28);
  }
  // Keep the side basement spaces accessible only through their doors.
  for (const x of [-1.14,1.14]) solid(.16,2.8,3,x,-1.4,-1.5,concrete);
  box(11,.15,12,0,3.06,-6,trim);
  const roof = material(0x704134);
  for (const side of [-1,1]) {
    const slab=box(6.15,.17,13,side*2.86,4.13,-6,roof);
    slab.rotation.z=-side*.352;
    for(let i=0;i<18;i++){
      const x=.18+i*.31;
      const batten=mesh(new T.CylinderGeometry(.036,.052,13,7),roof,side*x,5.24-x*.367,-6);
      batten.rotation.x=Math.PI/2;
    }
  }
  for(const z of [.03,-12.03]){
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute([-5.5,3,z,5.5,3,z,0,5.18,z],3));
    geo.computeVertexNormals();
    mesh(geo,material(0xdfd6c3,{side:T.DoubleSide}),0,0,0);
  }
  solid(.62,1.6,.62,3,4.7,-8,brick);
  box(.76,.12,.76,3,5.51,-8,dark);
  const sofa=material(0x53727a);
  solid(2.35,.53,.92,-3.5,.265,-4,sofa);
  box(2.35,.5,.19,-3.5,.65,-4.38,sofa);
  for(const x of [-4.55,-2.45]) box(.22,.24,.91,x,.59,-4,sofa);
  for(const x of [-4.07,-3.5,-2.93]) box(.55,.1,.63,x,.58,-3.94,material(0x69878d));
  solid(1.7,.43,.79,-3.55,.215,-5.7,wood);
  solid(3.15,.9,.64,3.5,.45,-11.32,trim);
  box(3.2,.08,.7,3.5,.93,-11.31,dark);
  for(const x of [2.3,3,3.7,4.4]) box(.18,.035,.045,x,.73,-10.98,steel);
  solid(1.3,.76,1.55,3.3,.38,-6.5,wood);
  solid(1.65,1.86,.55,4,-1.87,-11.45,steel);
  for(const y of [-2.42,-1.9,-1.38]) {
    box(1.63,.04,.57,4,y,-11.16,steel);
    box(.37,.33,.33,4.42,y+.19,-11.11,wood);
  }
  solid(1.05,1.52,.75,-4.55,-2.04,-10.65,steel);
  box(.62,.29,.055,-4.55,-1.72,-10.24,dark);
  for(const x of [-4.74,-4.52,-4.3]){
    mesh(new T.CylinderGeometry(.045,.045,.94,12),steel,x,-.59,-10.7);
  }
  solid(.95,.38,.7,-3.23,-2.61,-10.34,wood);
  for(const [x,y,z] of [[0,2.72,-1.5],[-3.5,2.7,-5],[3.5,2.7,-6],[0,-.24,-9.8],[-3.7,-.24,-9],[3.7,-.24,-9]]){
    const light=new T.PointLight(0xffe4bf, y<0?7:12,8,2);
    light.position.set(x,y,z);
    scene.add(light);
    box(.58,.055,.18,x,y+.07,z,new T.MeshBasicMaterial({color:0xffedc9}));
  }
  const leafMaterials=[material(0x405b36),material(0x59794a),material(0x6f884d)];
  const canopy = new T.IcosahedronGeometry(1,2);
  for(const [x,z,s] of [[-9,7,1.25],[10,8,1.1],[-9,-7,.95],[10,-8,1.23],[-15,13,1.15],[17,13,1]]){
    mesh(new T.CylinderGeometry(.12*s,.23*s,3.5*s,11),wood,x,1.65*s,z);
    for(let i=0;i<8;i++){
      const crown=mesh(canopy,leafMaterials[i%3],x+Math.cos(i*2.4)*s*.86,(3.3+i%3*.53)*s,z+Math.sin(i*2.4)*s*.86);
      crown.scale.set(1.12*s,1.38*s,s);
    }
  }
  // Parked apparatus at the curb.
  const red=material(0xb13029,{roughness:.38});
  const vehicle=new T.Group();
  vehicle.position.set(6.3,0,12.7);
  vehicle.rotation.y=Math.PI/2;
  scene.add(vehicle);
  box(2.25,.28,5.65,0,.62,0,dark,vehicle);
  box(2.24,1.42,1.72,0,1.42,-1.86,red,vehicle);
  box(2.09,.62,.06,0,1.77,-2.74,dark,vehicle);
  box(2.28,1.81,3.6,0,1.65,.9,red,vehicle);
  for(const side of [-1,1]){
    for(const z of [-1.75,1.76]){
      const wheel=mesh(new T.CylinderGeometry(.48,.48,.25,22),dark,side*1.15,.48,z,vehicle);
      wheel.rotation.z=Math.PI/2;
      const hub=mesh(new T.CylinderGeometry(.21,.21,.05,16),steel,side*1.29,.48,z,vehicle);
      hub.rotation.z=Math.PI/2;
    }
    for(let i=0;i<19;i++) box(.025,.034,3.15,side*1.145,1.08+i*.06,.92,steel,vehicle);
    box(.04,.095,5.4,side*1.15,.82,0,trim,vehicle);
    box(.045,.18,.2,side*1.15,2.25,-2.24,new T.MeshBasicMaterial({color:0x427fff}),vehicle);
    box(.36,.15,.04,side*.81,.86,-2.74,trim,vehicle);
  }
  obstacles.push({x:6.3,z:12.7,y:1.2,w:5.65,d:2.56,h:2.4});
  scene.updateMatrixWorld(true);
  return {doors, obstacles, surfaces, box, mesh};
}

export function floorAt(x,z,current) {
  const stair = Math.abs(x)<1.09 && z < -3.25 && z > -8.3;
  if(stair) return -2.8*clamp((-z-3.25)/5.05,0,1);
  if(current<-.15) return Math.abs(x)<5.39 && z<-.11 && z> -11.89 ? -2.8 : null;
  return Math.abs(x)<45 && z> -41 && z<34 ? 0 : null;
}

export function leafDistance(door,x,z,angle=door.hinge.rotation.y) {
  const dx=Math.cos(door.angle+angle), dz=-Math.sin(door.angle+angle);
  const along=clamp((x-door.x)*dx+(z-door.z)*dz,0,door.width);
  return Math.hypot(x-door.x-along*dx,z-door.z-along*dz);
}

export function canStand(world,x,z,y,eye) {
  if(y===null) return false;
  const r=.24;
  for(const b of world.obstacles){
    if(y+eye+.14<=b.y-b.h/2 || y+.025>=b.y+b.h/2) continue;
    const dx=Math.max(0,Math.abs(x-b.x)-b.w/2);
    const dz=Math.max(0,Math.abs(z-b.z)-b.d/2);
    if(dx*dx+dz*dz<r*r) return false;
  }
  return world.doors.every(d=>Math.abs(d.y-y)>.8 || leafDistance(d,x,z)>r+.05);
}
