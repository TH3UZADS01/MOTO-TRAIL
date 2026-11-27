import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Ride,steeringAngle} from '../src/riding';
import {getVehicle} from '../src/vehicles';
import {SimcadeHandling} from '../src/simcade';
import {createBike,disposeBike} from '../src/vehicle-models';

test('GS lamps light the upper rear lens and front glass, leaving the plate unlit',()=>{
 const bike=createBike('r1200gs');
 bike.headlight.update(1);bike.brakeLight.update(1,1);
 const head=bike.headlight.lens.geometry.boundingBox!,tail=bike.brakeLight.lens.geometry.boundingBox!;
 assert.ok(head.min.y>.94&&head.max.z<.72);
 assert.ok(bike.headlight.lens.geometry.getAttribute('position').count>0);
 assert.ok(bike.brakeLight.lens.geometry.getAttribute('position').count>0);
 assert.ok(tail.min.y>.90);
 const plate=bike.body.getObjectByName('Body_object_6') as any;
 assert.equal(plate.material.emissiveIntensity,1);
 assert.equal(plate.material.emissive.getHex(),0);
 disposeBike(bike);
});
test('steering stays controllable above 180 km/h and bank still builds gradually',()=>{
 for(const mode of ['arcade','simcade'] as const){
  const ride=new Ride();ride.spec=getVehicle('r1200gs');ride.setHandlingMode(mode);
  ride.contact=()=>{ride.pitch=0;ride.y=0};
  for(let i=0;i<60;i++){ride.speed=55;ride.step(1/60,0,0,.6,[])}
  assert.ok(ride.steer>.4&&ride.steer<=.6,mode);
 }
 const h=new SimcadeHandling(),spec=getVehicle('r1200gs');
 h.steer(1/60,0,.6,40,spec,1);
 const bank=h.bank(1/60,0,8,40,.6,spec);
 assert.ok(Math.abs(bank)<.02);
 assert.ok(steeringAngle(40,1)>.014);
});
