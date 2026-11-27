import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBike,disposeBike} from '../src/vehicle-models';

test('GS keeps tank cap and dashboard fixed while the complete wheels rotate',()=>{
 const b=createBike('r1200gs');
 const panel=b.body.getObjectByName('Body_object_18') as T.Mesh;
 assert.ok(panel,'instrument glass belongs to body');
 const capPoints:{mesh:T.Mesh,index:number,world:T.Vector3}[]=[];
 b.root.updateMatrixWorld(true);
 b.root.traverse(o=>{
  if(!(o instanceof T.Mesh)||!['object_0','object_12'].includes(o.material.name))return;
  const p=o.geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){
   const v=o.localToWorld(new T.Vector3().fromBufferAttribute(p,i));
   if(Math.abs(v.x)<.055&&v.y>1.12&&v.y<1.15&&v.z>.075&&v.z<.185)capPoints.push({mesh:o,index:i,world:v});
  }
 });
 assert.ok(capPoints.length>30,'tank cap sampled');
 const panelBefore=panel.matrixWorld.clone();
 const samples=b.wheels.flatMap(w=>['object_16','object_9'].map(material=>{
  const mesh=w.children.find(o=>(o as T.Mesh).material?.name===material) as T.Mesh;
  assert.ok(mesh,`${w.name} contains ${material}`);
  const p=mesh.geometry.getAttribute('position');
  let index=0;
  for(let i=1;i<p.count;i++)if(Math.hypot(p.getY(i),p.getZ(i))>Math.hypot(p.getY(index),p.getZ(index)))index=i;
  return {mesh,index,before:mesh.localToWorld(new T.Vector3().fromBufferAttribute(p,index))};
 }));
 b.setSteering(.4);b.roll(.3,false);b.setSuspension(.03,.02);b.root.updateMatrixWorld(true);
 assert.ok(panel.matrixWorld.equals(panelBefore),'panel stays on fairing');
 for(const {mesh,index,world} of capPoints)assert.ok(mesh.localToWorld(new T.Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'),index)).distanceTo(world)<1e-6,'tank cap stays intact');
 for(const {mesh,index,before} of samples)assert.ok(mesh.localToWorld(new T.Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'),index)).distanceTo(before)>.03,'metal wheel parts animate');
 assert.equal(b.body.getObjectByName('Body_object_16'),undefined);
 assert.equal(b.steering.getObjectByName('FrontSuspension_object_16'),undefined);
 disposeBike(b);
});
