import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {FollowCamera} from '../src/camera';
import {Ride} from '../src/riding';
import {vehicles} from '../src/vehicles';
import {createBike,disposeBike} from '../src/vehicle-models';
import {applyBikePose} from '../src/bike-pose';

test('wheelie rider shifts beside the tank smoothly, retaining both hands on the grips',()=>{
 for(const spec of vehicles){const b=createBike(spec.id),rig=b.riderRig;
  rig.update(8,0,0,true,0,0,false,0);const original=rig.eye.x;
  const hands=rig.limbs.map(l=>l.hand.position.clone());
  rig.update(8,0,1/60,true,0,1,false,.9);assert.ok(rig.eye.x>original&&rig.eye.x<original+.1);
  for(let i=0;i<120;i++)rig.update(8,0,1/60,true,0,1,false,.9);
  assert.ok(rig.eye.x>original+.3,spec.id);
  rig.limbs.forEach((limb,i)=>assert.ok(limb.hand.position.distanceTo(hands[i])<1e-6));
  assert.ok(rig.limbs.find(l=>l.side===-1)!.hand.rotation.x<-.8);
  assert.equal(rig.limbs.find(l=>l.side===1)!.hand.rotation.x,0);
  for(let i=0;i<180;i++)rig.update(8,0,1/60,true,0,0,false,0);
  assert.ok(Math.abs(rig.eye.x-original)<.001);disposeBike(b);
 }
});
test('first person gaze stays on the road at different wheelie angles and follows lateral eyes',()=>{
 for(const spec of vehicles){const b=createBike(spec.id),r=new Ride(),c=new FollowCamera();r.spec=spec;r.heading=.7;r.pitch=.1;r.speed=8;c.toggle();
  b.root.position.set(r.x,r.y,r.z);b.root.rotation.y=r.heading;
  for(const angle of [.4,.8,1.2]){r.wheelie=angle;
   for(let i=0;i<120;i++){b.riderRig.update(8,0,1/60,true,0,1,false,angle);applyBikePose(b,r.pitch,0,angle);c.update(r,1/60,spec.eyeHeight,b.body,b.riderRig.eye)}
   const direction=c.camera.getWorldDirection(new T.Vector3());
   assert.ok(Math.abs(Math.asin(direction.y)-r.pitch)<.2,`${spec.id}: camera points skyward`);
   const eye=b.body.localToWorld(b.riderRig.eye.clone().add(new T.Vector3(0,0,.06)));
   assert.ok(c.camera.position.distanceTo(eye)<1e-5);
  }
  disposeBike(b);
 }
});
