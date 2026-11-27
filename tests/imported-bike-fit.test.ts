import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBike,disposeBike} from '../src/vehicle-models';

test('imported lights use model lenses and Twister tyres stay circular through rotation',()=>{
 for(const id of ['twister','r1200gs'] as const){
  const b=createBike(id);
  assert.notEqual(b.headlight.lens.geometry.type,'SphereGeometry');
  assert.notEqual(b.brakeLight.lens.geometry.type,'SphereGeometry');
  b.headlight.lens.geometry.computeBoundingBox();
  const size=b.headlight.lens.geometry.boundingBox!.getSize(new T.Vector3());
  assert.ok(size.y<.25&&size.z<.25,id+' lens is isolated from fairing');
  if(id==='twister')for(const w of b.wheels){
   const tyre=w.children.find(o=>o.name.includes('pneu_borracha')) as T.Mesh;
   tyre.geometry.computeBoundingBox();
   const box=tyre.geometry.boundingBox!,s=box.getSize(new T.Vector3()),c=box.getCenter(new T.Vector3());
   assert.ok(Math.abs(s.y/s.z-1)<.02,'circular tyre');
   assert.ok(Math.abs(c.y)<.01&&Math.abs(c.z)<.01,'axle at tyre centre');
  }
  disposeBike(b);
 }
});
