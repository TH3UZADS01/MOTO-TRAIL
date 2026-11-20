import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBike,disposeBike} from '../src/vehicle-models';

test('Sahara Blender geometry retains steering and wheel pivots and separate suspension',()=>{
 const bike=createBike('sahara');
 assert.equal(bike.root.name,'Sahara-Blender');
 assert.equal(bike.wheels[0].parent,bike.body);
 assert.equal(bike.wheels[1].parent,bike.steering);
 assert.equal(bike.body.getObjectByName('FrontSuspension')?.parent,bike.steering);
 assert.equal(bike.body.getObjectByName('RearSuspension')?.parent,bike.body);
 assert.ok(Math.abs(bike.wheels[0].position.z+.7125)<1e-6);
 assert.ok(Math.abs(bike.wheels[1].getWorldPosition(new T.Vector3()).z-.7125)<1e-6);
 assert.equal(bike.brakeLight.lens,bike.body.getObjectByName('Body_TailLens'));
 const bounds=new T.Box3();let triangles=0;
 bike.root.updateMatrixWorld(true);
 bike.body.traverse(o=>{if(o instanceof T.Mesh&&o.name.startsWith(o.parent!.name+'_')){
  assert.ok(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite));
  triangles+=o.geometry.index!.count/3;
  bounds.union(o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld));
 }});
 const size=bounds.getSize(new T.Vector3());
 assert.ok(size.z>1.9&&size.z<2.3);assert.ok(size.y>1.19&&size.y<1.6);assert.ok(size.x<1.0);
 assert.ok(triangles>5000&&triangles<65000);
 disposeBike(bike);
});

test('separate Sahara instances do not share disposable resources',()=>{
 const a=createBike('sahara'),b=createBike('sahara');
 const ma=a.body.getObjectByName('Body_Paint') as T.Mesh,mb=b.body.getObjectByName('Body_Paint') as T.Mesh;
 assert.notEqual(ma.geometry,mb.geometry);assert.notEqual(a.paintMaterials[0],b.paintMaterials[0]);
 let disposed=false;mb.geometry.addEventListener('dispose',()=>disposed=true);
 disposeBike(a);assert.equal(disposed,false);disposeBike(b);assert.equal(disposed,true);
});
