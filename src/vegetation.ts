import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {plantAt,type Plant} from './biomes';
// Shared low-poly meshes; each chunk only owns instance buffers, never these geometries.
export function vegetationFactory(){
 const joined=(parts:T.BufferGeometry[])=>{const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g};
 const ell=(x:number,y:number,z:number,sx:number,sy:number,sz:number)=>new T.IcosahedronGeometry(1,0).scale(sx,sy,sz).translate(x,y,z);
 const cylinder=(x:number,y:number,z:number,r:number,h:number)=>new T.CylinderGeometry(r,r*1.15,h,6).translate(x,y,z);
 const geometries:Record<Plant,T.BufferGeometry>={
  broadleaf:joined([ell(0,6,0,3.5,3.2,3),ell(1.8,5.5,.6,2.2,2.4,2.3)]),
  pine:joined([new T.ConeGeometry(3.1,6,7).translate(0,5,0),new T.ConeGeometry(2.1,4,7).translate(0,8,0)]),
  palm:joined(Array.from({length:7},(_,i)=>new T.SphereGeometry(1,6,4).scale(.45,.2,3.4).rotateX(.2).translate(0,8,2.2).rotateY(i*Math.PI*2/7))),
  cactus:joined([cylinder(0,1.8,0,.32,3.6),cylinder(.85,2,0,.22,1.7),cylinder(-.7,1.5,0,.2,1.4),new T.CylinderGeometry(.2,.2,1.6,6).rotateZ(Math.PI/2).translate(.1,1.4,0)]),
  shrub:joined([ell(0,.65,0,1.5,.8,1.1),ell(.8,.5,.4,.8,.6,.8)]),
  grass:joined(Array.from({length:3},(_,i)=>new T.ConeGeometry(.35,.9,3).translate((i-1)*.3,.45,0).rotateY(i*1.3)))
 };
 const bark=new T.MeshStandardMaterial({color:0x6b5944,roughness:1}),foliage=new T.MeshStandardMaterial({color:0xffffff,roughness:1});
 const trunkGeometry=new T.CylinderGeometry(.24,.4,1,6),dummy=new T.Object3D();
 return function makeVegetation(samples:{x:number;y:number;z:number;s:number;r:number;rotation:number;tint:number}[]){
  const group=new T.Group(),details=new T.Group(),hits:{x:number;z:number;r:number}[]=[];group.add(details);
  const meshes=Object.fromEntries(Object.entries(geometries).map(([key,g])=>{const m=new T.InstancedMesh(g,foliage,samples.length);m.count=0;(key==='grass'||key==='shrub'?details:group).add(m);return [key,m]})) as unknown as Record<Plant,T.InstancedMesh>;
  const trunks=new T.InstancedMesh(trunkGeometry,bark,samples.length);trunks.count=0;group.add(trunks);
  for(const p of samples){const kind=plantAt(p.x,p.z,p.r),m=meshes[kind];dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rotation,0);dummy.scale.set(p.s,p.s*(.85+p.tint*.3),p.s);dummy.updateMatrix();m.setMatrixAt(m.count,dummy.matrix);const dry=kind==='cactus'||kind==='shrub';m.setColorAt(m.count++,new T.Color().setHSL(dry?.19:.25+p.tint*.05,dry?.24:.31,.25+p.tint*.13));
   if(['broadleaf','pine','palm'].includes(kind)){const h=(kind==='palm'?8:4)*(.85+p.tint*.3);dummy.position.y=p.y+h*p.s/2;dummy.scale.set(p.s,h*p.s,p.s);dummy.updateMatrix();trunks.setMatrixAt(trunks.count++,dummy.matrix);hits.push({x:p.x,z:p.z,r:.45*p.s})}else if(kind==='cactus')hits.push({x:p.x,z:p.z,r:.45*p.s});
  }
  group.traverse(o=>{if(o instanceof T.InstancedMesh){o.castShadow=true;o.receiveShadow=true;o.computeBoundingBox();o.computeBoundingSphere()}});
  return {group,details,hits};
 };
}

