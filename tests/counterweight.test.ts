import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {vehicles} from '../src/vehicles';
import {Ride,steeringAngle} from '../src/riding';
import {createBike,disposeBike} from '../src/vehicle-models';
import {applyBikePose} from '../src/bike-pose';

test('steering turns about a raked axis and returns each front assembly to its rest pose',()=>{
 for(const {id} of vehicles){
  const bike=createBike(id),rest=bike.steering.position.clone();
  for(const turn of [-.55,.55]){
   bike.setSteering(turn);
   const q=bike.steering.quaternion;
   assert.ok(q.y*turn>0&&q.z*turn<0,id);
   assert.equal(bike.wheels[1].parent,bike.steering);
   const crown=id==='urban'||id==='caloi'?new T.Vector3(0,.92,-.13):new T.Vector3();
   const fixed=crown.clone().add(rest);
   assert.ok(crown.applyQuaternion(q).add(bike.steering.position).distanceTo(fixed)<1e-8,id);
  }
  bike.setSteering(0);
  assert.ok(bike.steering.position.distanceTo(rest)<1e-8,id);
  disposeBike(bike);
 }
});

test('tight slow turns bank the chassis in and the torso out in both directions',()=>{
 const bike=createBike('sahara'),ride=new Ride();
 ride.spec=vehicles.find(v=>v.id==='sahara')!;
 for(const side of [-1,1]){
  for(let i=0;i<150;i++){
   ride.speed=2.5;ride.step(1/60,0,0,side,[]);
   bike.setSteering(steeringAngle(ride.speed,ride.steer));
   bike.riderRig.update(ride.speed,ride.steer,1/60);
  }
  applyBikePose(bike,0,ride.lean,0);
  assert.ok(ride.lean*side<0);
  const up=new T.Vector3(0,1,0).applyQuaternion(bike.riderRig.torso.getWorldQuaternion(new T.Quaternion()));
  assert.ok(up.x*side<0);
 }
 assert.ok(steeringAngle(2.5,1)>.56/(1+(2.5/5.8)**2));
 for(let i=0;i<150;i++)bike.riderRig.update(14,1,1/60);
 assert.ok(bike.riderRig.lean<0);
 for(let i=0;i<150;i++)bike.riderRig.update(0,1,1/60);
 assert.ok(Math.abs(bike.riderRig.lean)<1e-6);
 disposeBike(bike);
});

test('rider transitions into the deeper bank between 25 and 30 km/h',()=>{
 const bike=createBike('sahara'),ride=new Ride();
 ride.spec=vehicles.find(v=>v.id==='sahara')!;
 const start={x:ride.x,z:ride.z};
 for(const side of [-1,1]){
  for(const kmh of [24,25,28,30,40]){
   for(let i=0;i<120;i++){
    ride.x=start.x;ride.z=start.z;ride.speed=kmh/3.6;ride.step(1/60,0,0,side,[]);
    bike.riderRig.update(kmh/3.6,side,1/60,false,0,0,false,0,ride.lean);
   }
   applyBikePose(bike,0,ride.lean,0);
   const up=new T.Vector3(0,1,0).applyQuaternion(bike.riderRig.torso.getWorldQuaternion(new T.Quaternion()));
   assert.ok((kmh<=25?-1:1)*up.x*side>0,`torso at ${kmh} km/h`);
   if(kmh>=30){
    assert.ok(bike.riderRig.lean*side<0);
    assert.ok(-ride.lean*side>.45);
   }
  }
 }
 disposeBike(bike);
});
