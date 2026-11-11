import * as T from './vendor/three.module.min.mjs';
import {material} from './world.mjs';

const fabric=material(0x292e32);
const palm=material(0x3f4548);
const leather=material(0x202427);
const reflective=material(0xb3a45c);
const sphere=new T.SphereGeometry(1,12,8);
const sleeveGeometry=new T.CylinderGeometry(.075,.094,.37,18);

export function createGlove(parent,side,gripping){
  const glove=new T.Group();
  parent.add(glove);
  function rounded(mat,x,y,z,sx,sy,sz,parent=glove){
    const piece=new T.Mesh(sphere,mat);
    piece.position.set(x,y,z);
    piece.scale.set(sx,sy,sz);
    parent.add(piece);
    return piece;
  }
  const sleeve=new T.Mesh(sleeveGeometry,fabric);
  sleeve.rotation.x=Math.PI/2;
  sleeve.position.set(0,-.025,.28);
  glove.add(sleeve);
  rounded(reflective,0,-.025,.18,.083,.079,.038);
  rounded(leather,0,-.016,.139,.075,.067,.035);
  rounded(fabric,0,0,.04,.081,.055,.103);
  rounded(palm,0,.029,.026,.071,.032,.079);
  const fingers=[];
  for(let i=0;i<4;i++){
    const joint=new T.Group();
    joint.position.set(side*(i-1.5)*.034,-.004,-.031);
    glove.add(joint);
    const length=[.075,.089,.083,.062][i];
    rounded(fabric,0,0,-length*.36,.019,.022,length*.51,joint);
    rounded(palm,0,.014,-.018,.015,.012,.023,joint);
    const tip=new T.Group();
    tip.position.z=-length*.68;
    rounded(leather,0,0,-length*.27,.016,.018,length*.43,tip);
    joint.add(tip);
    fingers.push({joint,tip});
  }
  const thumb=rounded(leather,-side*.072,-.018,-.008,.026,.029,.057);
  thumb.rotation.y=-side*.55;
  thumb.rotation.x=.43;
  function pose(curl){
    for(const [i,{joint,tip}] of fingers.entries()){
      joint.rotation.x=gripping ? .83+curl:.12+i*.07+curl;
      tip.rotation.x=gripping ? .67:.21+curl*.5;
    }
  }
  pose(0);
  return {glove,pose};
}
