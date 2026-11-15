import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBike,disposeBike} from '../src/vehicle-models';
import model from '../src/assets/pop110-model.json';
import {existsSync} from 'node:fs';

test('Blender Pop preserves wheel and steering pivots and has bounded geometry',()=>{
 const b=createBike('pop');b.rider.visible=false;
 assert.equal(b.wheels[0].parent,b.body);assert.equal(b.wheels[1].parent,b.steering);
 assert.equal(b.root.getObjectByName('FrontSuspension')?.parent,b.steering);
 assert.equal(b.root.getObjectByName('RearSuspension')?.parent,b.body);
 b.root.updateMatrixWorld(true);
 assert.ok(Math.abs(b.wheels[1].getWorldPosition(new T.Vector3()).z-.619)<.001);
 assert.ok(Math.abs(b.wheels[0].position.z+.619)<.001);
 let triangles=0;
 b.body.traverse(o=>{if(o instanceof T.Mesh&&o.name.startsWith(o.parent!.name+'_')){
  const p=o.geometry.getAttribute('position');assert.ok(Array.from(p.array).every(Number.isFinite));
  const uv=o.geometry.getAttribute('uv');assert.equal(uv.count,p.count);
  assert.ok(Array.from(uv.array).every(Number.isFinite));
  triangles+=o.geometry.index!.count/3;
 }});
 assert.equal(triangles,model.triangles);
 assert.ok(triangles>60000&&triangles<80000);
 for(const maps of Object.values(model.textures))for(const path of Object.values(maps))assert.ok(existsSync(`public${path}`));
 assert.equal(b.brakeLight.lens,b.body.getObjectByName('Body_TailLens'));
 disposeBike(b);
});

test('online Pop instances own their materials and geometry independently',()=>{
 const a=createBike('pop'),b=createBike('pop');
 assert.notEqual(a.paintMaterials[0],b.paintMaterials[0]);
 const ma=a.body.getObjectByName('Body_Paint') as T.Mesh,mb=b.body.getObjectByName('Body_Paint') as T.Mesh;
 assert.notEqual(ma.geometry,mb.geometry);
 let disposed=false;mb.geometry.addEventListener('dispose',()=>{disposed=true});
 disposeBike(a);assert.equal(disposed,false);disposeBike(b);assert.equal(disposed,true);
});
