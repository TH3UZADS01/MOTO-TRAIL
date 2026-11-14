import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBike,disposeBike} from '../src/vehicle-models';
import {vehicles} from '../src/vehicles';
import {RIDER_TUNING} from '../src/rider';

const end=(mesh:T.Mesh,y:number)=>new T.Vector3(0,y,0).multiply(mesh.scale).applyQuaternion(mesh.quaternion).add(mesh.position);
test('throttle keeps rigid arms connected at elbow and rotating wrist on every motorcycle',()=>{
 for(const spec of vehicles){
  const b=createBike(spec.id);
  for(const body of [-1,0,1])for(const steer of [-.45,0,.45]){
   b.steering.rotation.y=steer;
   for(let frame=0;frame<150;frame++){
    const throttle=frame<75?1:0;
    b.riderRig.update(12,steer,1/60,true,body,throttle,false,.5);
    for(const limb of b.riderRig.limbs){
     assert.ok(Math.abs(limb.upperArm.scale.y-RIDER_TUNING.upperArmLength)<1e-9,spec.id+' upper arm length');
     assert.ok(Math.abs(limb.forearm.scale.y-RIDER_TUNING.forearmLength)<1e-9,spec.id+' forearm length');
     assert.ok(end(limb.upperArm,.5).distanceTo(end(limb.forearm,-.5))<1e-9,'elbow connected');
     const wrist=new T.Vector3(0,0,-RIDER_TUNING.wristOffset).applyQuaternion(limb.hand.quaternion).add(limb.hand.position);
     assert.ok(end(limb.forearm,.5).distanceTo(wrist)<1e-9,'wrist connected');
    }
   }
  }
  b.steering.rotation.set(0,0,0);
  for(let i=0;i<120;i++)b.riderRig.update(12,0,1/60,false,0,1);
  assert.ok(Math.abs(b.riderRig.limbs.find(l=>l.side===-1)!.hand.rotation.x+RIDER_TUNING.throttleWrist)<1e-6,'full wrist intensity retained');
  disposeBike(b);
 }
});
