import * as T from 'three';
import {ground} from './terrain';
import type {Navigation} from './navigation';

// Only the next ~450 m need geometry. Reuse one ribbon and buffer as the rider advances.
export function routeRibbon(scene:T.Scene){
 const capacity=128,positions=new T.BufferAttribute(new Float32Array(capacity*6),3).setUsage(T.DynamicDrawUsage);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',positions);
 const indices:number[]=[];for(let i=1;i<capacity;i++){const a=i*2;indices.push(a-2,a-1,a,a,a-1,a+1)}
 geometry.setIndex(indices);geometry.setDrawRange(0,0);
 const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({color:0x57dcec,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));
 mesh.renderOrder=1;scene.add(mesh);
 let previous:Navigation['path']=null,last=-1;
 return (gps:Navigation)=>{
  mesh.visible=!!gps.path;if(!gps.path||previous===gps.path&&last===gps.index)return;
  previous=gps.path;last=gps.index;const p=gps.path.points;
  let count=0,metres=0;
  for(let i=last;i<p.length-1&&count<capacity&&metres<450;i++){
   const a=p[i],b=p[i+1],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
   if(d<.01)continue;
   const rx=dz/d*.18,rz=-dx/d*.18;
   positions.setXYZ(count*2,a.x-rx,ground(a.x-rx,a.z-rz)+.14,a.z-rz);
   positions.setXYZ(count*2+1,a.x+rx,ground(a.x+rx,a.z+rz)+.14,a.z+rz);
   count++;metres+=d;
  }
  positions.needsUpdate=true;geometry.setDrawRange(0,Math.max(0,count-1)*6);mesh.frustumCulled=false;
 };
}
