import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBike,disposeBike} from '../src/vehicle-models';
import {Ride} from '../src/riding';
import {getVehicle} from '../src/vehicles';

test('imported Twister and GS animate, emit light and accelerate with finite physics',()=>{
 for(const id of ['twister','r1200gs'] as const){
  const bike=createBike(id),r=new Ride();r.spec=getVehicle(id);r.setHandlingMode('simcade');
  assert.ok(bike.body.children.length>3);assert.ok(bike.wheels.every(w=>w.children.length>0));
  assert.ok(bike.paintMaterials.length>0);
  bike.setSteering(.25);bike.roll(1,false);bike.setSuspension(.02,-.01);bike.headlight.update(1);bike.brakeLight.update(1,1);
  assert.ok(bike.headlight.lens.material.emissiveIntensity>0);
  for(let i=0;i<600;i++)r.step(1/60,1,0,0,[],false,0,true,true);
  assert.ok(r.speed>8,id+' acceleration');
  assert.ok(Number.isFinite(r.engine.rpm+r.lean+r.pitch+r.instability.angle),id);
  disposeBike(bike);
 }
});
