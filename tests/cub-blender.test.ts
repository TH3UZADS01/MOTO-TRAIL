import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBike,disposeBike} from '../src/vehicle-models';
import model from '../src/assets/cub-model.json';

test('Cub Blender geometry retains steering and wheel pivots and separate suspension',()=>{
 const bike=createBike('cub');
 assert.equal(bike.root.name,'Cub-Blender');
 assert.equal(bike.wheels[0].parent,bike.body);
 assert.equal(bike.wheels[1].parent,bike.steering);
 assert.equal(bike.body.getObjectByName('FrontSuspension')?.parent,bike.steering);
 assert.equal(bike.body.getObjectByName('RearSuspension')?.parent,bike.body);
 assert.ok(Math.abs(bike.wheels[0].position.z+.61)<1e-6);
 bike.root.updateMatrixWorld(true);
 assert.ok(Math.abs(bike.wheels[1].getWorldPosition(new T.Vector3()).z-.61)<1e-5);
 assert.equal(bike.brakeLight.lens,bike.body.getObjectByName('Body_TailLens'));
 const bounds=new T.Box3();let triangles=0;
 bike.root.updateMatrixWorld(true);
 bike.body.traverse(o=>{if(o instanceof T.Mesh&&o.name.startsWith(o.parent!.name+'_')){
  assert.ok(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite));
  const uv=o.geometry.getAttribute('uv');assert.equal(uv.count,o.geometry.getAttribute('position').count);assert.ok(Array.from(uv.array).every(Number.isFinite));
  triangles+=o.geometry.index!.count/3;
  bounds.union(o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld));
 }});
 const size=bounds.getSize(new T.Vector3());
 assert.ok(size.z>1.8&&size.z<2.3);assert.ok(size.y>1.0&&size.y<1.3);assert.ok(size.x<1.0);
 assert.equal(triangles,model.triangles);assert.ok(triangles>5000&&triangles<65000);
 disposeBike(bike);
});

test('separate Cub instances do not share disposable resources',()=>{
 const a=createBike('cub'),b=createBike('cub');
 const ma=a.body.getObjectByName('Body_Paint') as T.Mesh,mb=b.body.getObjectByName('Body_Paint') as T.Mesh;
 assert.notEqual(ma.geometry,mb.geometry);assert.notEqual(a.paintMaterials[0],b.paintMaterials[0]);
 let disposed=false;mb.geometry.addEventListener('dispose',()=>disposed=true);
 disposeBike(a);assert.equal(disposed,false);disposeBike(b);assert.equal(disposed,true);
});
