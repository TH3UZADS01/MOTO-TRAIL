import * as T from 'three';
import {vehicles,type VehicleId} from './vehicles';

const metresToFull={asfalto:12000,grama:1200,terra:650};
export function nextDirt(level:number,surface:keyof typeof metresToFull,metres:number,washSeconds:number){
 return T.MathUtils.clamp(level+metres/metresToFull[surface]-washSeconds/5,0,1);
}
export function loadDirt(){
 const levels=Object.fromEntries(vehicles.map(v=>[v.id,0])) as Record<VehicleId,number>;
 try{
  const saved=JSON.parse(localStorage.getItem('bike-dirt-v2')||'{}');
  for(const {id} of vehicles)if(Number.isFinite(saved?.[id]))levels[id]=T.MathUtils.clamp(saved[id],0,1);
 }catch{}
 return levels;
}
export function saveDirt(levels:Record<VehicleId,number>){
 try{localStorage.setItem('bike-dirt-v2',JSON.stringify(levels))}catch{}
}

export function inWashBay(bay:{x:number;z:number;angle:number},x:number,z:number){
 const dx=x-bay.x,dz=z-bay.z,c=Math.cos(bay.angle),s=Math.sin(bay.angle);
 return Math.abs(c*dx-s*dz)<2.9&&Math.abs(s*dx+c*dz)<3.9;
}

// Object-space splashes stay on each moving part and blend over its current paint and maps.
export function bindDirt(body:T.Group,excluded:T.Object3D[]){
 const level={value:0},materials=new Set<T.MeshStandardMaterial>();
 function visit(object:T.Object3D){
  if(excluded.includes(object))return;
  if(object instanceof T.Mesh && object.material instanceof T.MeshStandardMaterial && !object.material.transparent){
   materials.add(object.material);
  }
  object.children.forEach(visit);
 }
 visit(body);
 for(const material of materials){
  material.onBeforeCompile=shader=>{
   shader.uniforms.bikeDirt=level;
   shader.vertexShader='varying vec3 dirtPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndirtPosition=position;');
   shader.fragmentShader=`uniform float bikeDirt;
varying vec3 dirtPosition;
float soilHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float soilNoise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(soilHash(i),soilHash(i+vec2(1,0)),f.x),mix(soilHash(i+vec2(0,1)),soilHash(i+1.0),f.x),f.y);
}
`+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
if(bikeDirt>0.0){
 vec2 p=dirtPosition.zy+dirtPosition.x*vec2(.72,.43);
 float mud=.65*soilNoise(p*18.0)+.35*soilNoise(p*85.0);
 float cover=bikeDirt*smoothstep(.76-bikeDirt*.50,.92-bikeDirt*.42,mud);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.18,.095,.042)*(.65+.65*mud),cover*.9);
}`);
  };
 }
 return level;
}
