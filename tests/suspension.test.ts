import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {Suspension} from '../src/suspension';
import {vehicles} from '../src/vehicles';
import {createBike,disposeBike} from '../src/vehicle-models';
import {applyBikePose} from '../src/bike-pose';

test('braking loads the fork, acceleration loads the rear and both settle',()=>{
 for(const spec of vehicles){
  const suspension=new Suspension();
  const run=(acceleration:number)=>{for(let i=0;i<180;i++)suspension.step(1/60,spec,10,10,acceleration,0,0)};
  run(-7);
  assert.ok(suspension.front.compression>.02&&suspension.rear.compression<0,spec.id);
  run(4);
  assert.ok(suspension.front.compression<0&&suspension.rear.compression>.005,spec.id);
  run(0);
  assert.ok(Math.abs(suspension.front.compression)+Math.abs(suspension.rear.compression)<1e-5);
 }
});

test('an isolated bump compresses only the wheel crossing it and a teleport resets the travel',()=>{
 const s=new Suspension(),spec=vehicles[0];
 s.step(1/60,spec,0,0,0,0,0);
 s.step(1/60,spec,.07,0,0,0,0);
 assert.ok(s.front.compression>.02&&s.front.compression<.07);assert.equal(s.rear.compression,0);
 s.step(1/60,spec,20,20,0,0,0);
 assert.equal(s.front.compression,0);assert.equal(s.rear.compression,0);
});

test('chassis dives while both axle heights remain grounded on all six models',()=>{
 for(const spec of vehicles){
  const bike=createBike(spec.id);
  const heights=()=>bike.wheels.map(w=>w.getWorldPosition(new Vector3()).y);
  const rest=heights();
  applyBikePose(bike,0,0,0,0,.045,-.018,spec.wheelbase);
  assert.ok(bike.body.rotation.x>0,spec.id);
  heights().forEach((y,i)=>assert.ok(Math.abs(y-rest[i])<.006,spec.id));
  applyBikePose(bike,0,0,0);
  heights().forEach((y,i)=>assert.ok(Math.abs(y-rest[i])<1e-8));
  disposeBike(bike);
 }
});
