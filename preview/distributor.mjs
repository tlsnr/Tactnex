import * as T from './vendor/three.module.min.mjs';
import {material} from './world.mjs';

export const distributorPosition={x:1.18,z:4.55};

export function createDistributor(world,scene){
  const {x,z}=distributorPosition;
  const {mesh,box}=world;
  const red=material(0xb02c21,{roughness:.44,metalness:.24});
  const aluminum=material(0x9aa2a6,{roughness:.38,metalness:.57});
  const rubber=material(0x252729);
  const body=new T.Group();
  body.position.set(x,0,z);
  scene.add(body);
  function pipe(parent,a,b,r,mat,segments=16){
    const start=new T.Vector3(...a),end=new T.Vector3(...b);
    const direction=end.clone().sub(start);
    const middle=start.addScaledVector(direction,.5);
    const part=mesh(new T.CylinderGeometry(r,r,direction.length(),segments),mat,middle.x,middle.y,middle.z,parent);
    part.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
    return part;
  }
  pipe(body,[0,.15,-.22],[0,.15,.26],.086,red);
  pipe(body,[-.26,.15,0],[.26,.15,0],.074,red);
  const valves=[];
  for(const [ox,oz] of [[-.29,-.13],[0,-.26],[.29,-.13]]){
    pipe(body,[ox*.68,.15,0],[ox,.15,oz],.059,red);
    const tip=[ox*1.12,.15,oz-.067];
    pipe(body,[ox,.15,oz],tip,.077,aluminum);
    pipe(body,tip,[tip[0]*1.02,.15,tip[2]-.026],.07,ox===0?aluminum:rubber);
    pipe(body,[ox*.78,.16,oz*.52],[ox*.78,.265,oz*.52],.029,aluminum);
    const valve=new T.Group();
    valve.position.set(ox*.78,.272,oz*.52);
    body.add(valve);
    box(.147,.03,.048,.044,0,0,ox===0?red:rubber,valve);
    valves.push(valve);
  }
  pipe(body,[0,.15,.21],[0,.15,.33],.097,aluminum);
  for(const sx of [-1,1]){
    pipe(body,[sx*.13,.12,.04],[sx*.24,.023,.16],.027,support);
    box(.119,.034,.143,sx*.24,.016,.16,rubber,body);
  }
  const hose=material(0xc49a4d,{roughness:.92});
  const supply=material(0xb7a06b,{roughness:.9});
  function line(points,r,mat){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    return mesh(new T.TubeGeometry(curve,Math.max(22,points.length*5),r,7,false),mat,0,0,0);
  }
  line([[x,.15,z+.32],[x,.034,z+.6],[1.7,.035,6.3],[2.7,.035,7.5],[4.8,.037,9],[6.3,.037,10.7],[6.55,.38,11.54]],.044,supply);
  const sections=[
    [[x,.15,z-.35],[x,.034,4],[.92,.034,3],[.58,.034,1.3],[.37,.035,.25],[.33,.036,-.32],[.55,.036,-1.45],[.69,.036,-2.82]],
    Array.from({length:17},(_,i)=>[.7,i===0?.035:-i*2.8/16+.042,-2.98-i*5.3/16]),
    [[.7,-2.758,-8.28],[.65,-2.758,-8.8],[.43,-2.758,-9.18],[.28,-2.758,-9.52],[-.59,-2.758,-9.53]]
  ];
  for(const section of sections) line(section,.028,hose);
  const placard=document.createElement('canvas');
  placard.width=512;
  placard.height=144;
  const ctx=placard.getContext('2d');
  ctx.fillStyle='#15252e';
  ctx.fillRect(0,0,512,144);
  ctx.fillStyle='#f8ba62';
  ctx.fillRect(0,0,14,144);
  ctx.fillStyle='#f7f3e8';
  ctx.font='bold 61px system-ui';
  ctx.fillText('VERTEILER',39,94);
  const map=new T.CanvasTexture(placard);
  map.colorSpace=T.SRGBColorSpace;
  const label=new T.Sprite(new T.SpriteMaterial({map,depthWrite:false}));
  label.scale.set(1.09,.307,1);
  label.position.set(x,.54,z);
  scene.add(label);
  function setCharged(charged){
    valves[1].rotation.y=charged?-Math.PI/2:0;
    hose.color.setHex(charged?0xe0b55f:0xc49a4d);
  }
  return {setCharged};
}

const support=material(0x414b50,{metalness:.42});
