import * as T from './vendor/three.module.min.mjs';

// Canvas fallback for browsers that cannot create a WebGL context.
// Uses a lower internal resolution and flat shading with depth-sorted faces.
export function createSoftwareRenderer() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d',{alpha:false});
  if(!ctx) throw new Error('Kein Canvas-Kontext verfügbar.');
  const geometryCache = new WeakMap();
  const frustum = new T.Frustum(), viewProjection = new T.Matrix4();
  const worldPosition = new T.Vector3(), scale = new T.Vector3(), view = new T.Matrix4();
  const center = new T.Vector3(), bounds = new T.Sphere();
  const color = new T.Color();
  const near = .06;
  let width=1,height=1,focal=1;
  function project(p){
    return [width/2+p[0]*focal/-p[2],height/2-p[1]*focal/-p[2]];
  }
  function clip(points){
    if(points.every(p=>p[2]<=-near)) return points;
    const result=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      const inside=a[2]<=-near,nextInside=b[2]<=-near;
      if(inside) result.push(a);
      if(inside!==nextInside){
        const t=(-near-a[2])/(b[2]-a[2]);
        result.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),-near]);
      }
    }
    return result;
  }
  function faces(geometry){
    if(geometryCache.has(geometry)) return geometryCache.get(geometry);
    const attr=geometry.attributes.position,index=geometry.index;
    const result=[];
    for(let i=0;i<(index?.count??attr.count);i+=3){
      const points=[];
      for(let j=0;j<3;j++){
        const n=index?index.getX(i+j):i+j;
        points.push(new T.Vector3().fromBufferAttribute(attr,n));
      }
      const n=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
      result.push({points,n});
    }
    geometryCache.set(geometry,result);
    return result;
  }
  const clipMatrix = new T.Matrix4(), normalMatrix = new T.Matrix3();
  const vertices=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
  const normal=new T.Vector3(), sun=new T.Vector3(-.4,.8,.46).normalize();
  let queue=[];
  function mesh(object,scene){
    const geometry=object.geometry,mat=object.material;
    if(Array.isArray(mat)) return;
    if(!geometry.boundingSphere) geometry.computeBoundingSphere();
    bounds.copy(geometry.boundingSphere).applyMatrix4(object.matrixWorld);
    if(!frustum.intersectsSphere(bounds)) return;
    clipMatrix.multiplyMatrices(view,object.matrixWorld);
    normalMatrix.getNormalMatrix(object.matrixWorld);
    const base=mat.userData.canvasColor??mat.color;
    const tint=scene.fog.color;
    for(const face of faces(geometry)){
      for(let i=0;i<3;i++) vertices[i].copy(face.points[i]).applyMatrix4(clipMatrix);
      const [a,b,c]=vertices;
      if(a.z>-near&&b.z>-near&&c.z>-near) continue;
      const winding=(b.y-a.y)*(c.z-a.z)-(b.z-a.z)*(c.y-a.y);
      const wy=(b.z-a.z)*(c.x-a.x)-(b.x-a.x)*(c.z-a.z);
      const wz=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
      if(mat.side!==T.DoubleSide&&winding*a.x+wy*a.y+wz*a.z>=0) continue;
      const depth=-(a.z+b.z+c.z)/3;
      const points=clip(vertices.map(p=>[p.x,p.y,p.z])).map(project);
      if(points.length<3 || points.every(p=>p[0]<0) || points.every(p=>p[0]>width) ||
         points.every(p=>p[1]<0) || points.every(p=>p[1]>height)) continue;
      normal.copy(face.n).applyNormalMatrix(normalMatrix);
      const shade=mat.isMeshBasicMaterial?1:.68+Math.max(0,normal.dot(sun))*.46;
      const fog=1-Math.exp(-Math.pow(scene.fog.density*Math.max(0,depth),2));
      const fill=color.copy(base).multiplyScalar(shade).lerp(tint,fog).getStyle();
      queue.push({depth,points,fill,opacity:mat.opacity,layer:object.renderOrder});
    }
  }
  function sprite(object){
    worldPosition.setFromMatrixPosition(object.matrixWorld).applyMatrix4(view);
    const depth=-worldPosition.z;
    if(depth<near) return;
    const [x,y]=project(worldPosition.toArray());
    scale.setFromMatrixScale(object.matrixWorld).multiplyScalar(focal/depth);
    if(x+scale.x<0||x-scale.x>width||y+scale.y<0||y-scale.y>height) return;
    queue.push({depth,image:object.material.map.image,x,y,w:scale.x,h:scale.y,opacity:object.material.opacity,
      blend:object.material.blending===T.AdditiveBlending});
  }
  function particles(object){
    const attr=object.geometry.attributes.position;
    for(let i=0;i<attr.count;i++){
      center.fromBufferAttribute(attr,i).applyMatrix4(view);
      const depth=-center.z;
      if(depth<near) continue;
      const [x,y]=project(center.toArray()),size=Math.min(10,.043*focal/depth);
      queue.push({depth,x,y,size,opacity:.78});
    }
  }
  return {
    domElement:canvas,
    setPixelRatio(){},
    setSize(w,h){
      const factor=Math.min(1,640/w,430/h);
      canvas.width=width=Math.max(1,Math.round(w*factor));
      canvas.height=height=Math.max(1,Math.round(h*factor));
    },
    render(scene,camera){
      camera.updateMatrixWorld();
      scene.updateMatrixWorld(true);
      view.copy(camera.matrixWorldInverse);
      viewProjection.multiplyMatrices(camera.projectionMatrix,view);
      frustum.setFromProjectionMatrix(viewProjection);
      focal=height*camera.projectionMatrix.elements[5]/2;
      queue=[];
      ctx.fillStyle=scene.background.getStyle();
      ctx.fillRect(0,0,width,height);
      scene.traverseVisible(object=>{
        if(object.isMesh) mesh(object,scene);
        else if(object.isSprite) sprite(object);
        else if(object.isPoints) particles(object);
      });
      queue.sort((a,b)=>(a.layer??0)-(b.layer??0)||b.depth-a.depth);
      for(const item of queue){
        ctx.globalAlpha=item.opacity;
        if(item.points){
          const [first,...rest]=item.points;
          ctx.fillStyle=item.fill;
          ctx.beginPath();
          ctx.moveTo(...first);
          for(const point of rest) ctx.lineTo(...point);
          ctx.closePath();
          ctx.fill();
        } else if(item.image){
          ctx.globalCompositeOperation=item.blend?'lighter':'source-over';
          ctx.drawImage(item.image,item.x-item.w/2,item.y-item.h/2,item.w,item.h);
          ctx.globalCompositeOperation='source-over';
        } else {
          ctx.fillStyle='#9ee2ff';
          ctx.fillRect(item.x,item.y,item.size,item.size);
        }
      }
      ctx.globalAlpha=1;
    }
  };
}
