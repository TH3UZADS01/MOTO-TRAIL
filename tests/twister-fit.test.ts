import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBike,disposeBike} from '../src/vehicle-models';
import {applyBikePose} from '../src/bike-pose';

test('Twister saddle, tyre contacts, optical cover and beam share the corrected pose',()=>{
 const b=createBike('twister');
 try{
  applyBikePose(b,0,0,0);
  b.root.updateMatrixWorld(true);
  for(const wheel of b.wheels)assert.ok(Math.abs(new T.Box3().setFromObject(wheel,true).min.y)<.001);
  const ray=new T.Raycaster(new T.Vector3(0,2,-.36),new T.Vector3(0,-1,0));
  const seat=ray.intersectObjects(b.body.children.filter(o=>o instanceof T.Mesh),false)[0];
  assert.ok(Math.abs(seat.point.y-.789)<.001);
  ray.set(new T.Vector3(0,.78,2),new T.Vector3(0,0,-1));
  const hits=ray.intersectObject(b.steering);
  const cover=hits[0].object as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;
  assert.ok(cover.material.transparent&&cover.material.opacity<.25);
  assert.equal(hits[1].object.uuid,b.headlight.lens.uuid);
  for(const level of [0,.5,1,0]){
   b.headlight.update(level);
   assert.equal(b.headlight.lens.material.emissiveIntensity,2*level);
   assert.equal(b.headlight.light.intensity,70*level);
   assert.equal(cover.material.emissiveIntensity*cover.material.emissive.getHex(),0);
  }
  b.setSteering(.2);
  applyBikePose(b,.06,.18,0,0,.02,-.01,1.39);
  const origin=b.headlight.light.getWorldPosition(new T.Vector3());
  const target=b.headlight.light.target.getWorldPosition(new T.Vector3());
  const lens=new T.Box3().setFromObject(b.headlight.lens,true);
  assert.ok(lens.distanceToPoint(origin)<.09&&target.z>origin.z);
 }finally{disposeBike(b)}
});
