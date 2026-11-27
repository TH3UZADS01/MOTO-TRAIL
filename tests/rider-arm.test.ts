import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBike,disposeBike} from '../src/vehicle-models';
import {vehicles} from '../src/vehicles';
import {RIDER_TUNING} from '../src/rider';
import {ergonomics} from '../src/rider-posture';

const end=(mesh:T.Mesh,y:number)=>new T.Vector3(0,y,0).multiply(mesh.scale).applyQuaternion(mesh.quaternion).add(mesh.position);
test('standing elbows stay outboard through turns and follow the moving grips',()=>{
 for(const spec of vehicles){
  const bike=createBike(spec.id),rig=bike.riderRig;
  for(const speed of [3,14]){
   let previous:T.Vector3[]=[];
   for(let i=0;i<=180;i++){
    const steer=Math.sin(i*Math.PI/90);
    bike.setSteering(.5*steer);
    rig.update(speed,steer,1/60,false,0,(1+steer)/2,false,0,-.35*steer,false,
     {stand:1,rise:ergonomics[spec.id].rise,sideLean:.3*steer,brace:.35*steer,absorption:0});
    const elbows=rig.limbs.map((limb,index)=>{
     const elbow=end(limb.upperArm,.5),shoulder=end(limb.upperArm,-.5);
     const outward=new T.Vector3(limb.side,0,0).applyQuaternion(rig.torso.quaternion);
     assert.ok(elbow.clone().sub(shoulder).dot(outward)>.025,spec.id+' outboard elbow');
     assert.ok(elbow.distanceTo(end(limb.forearm,-.5))<1e-8);
     const wrist=new T.Vector3(0,0,-RIDER_TUNING.wristOffset).applyQuaternion(limb.hand.quaternion).add(limb.hand.position);
     assert.ok(wrist.distanceTo(end(limb.forearm,.5))<1e-8);
     if(previous.length)assert.ok(elbow.distanceTo(previous[index])<.025,spec.id+' continuous turn');
     return elbow;
    });
    previous=elbows;
   }
  }
  disposeBike(bike);
 }
});
test('throttle keeps rigid arms connected at elbow and rotating wrist on every motorcycle',()=>{
 for(const spec of vehicles){
  const b=createBike(spec.id);
  for(const body of [-1,0,1])for(const steer of [-.45,0,.45]){
   b.setSteering(steer);
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
  b.setSteering(0);
  for(let i=0;i<120;i++)b.riderRig.update(12,0,1/60,false,0,1);
  assert.ok(Math.abs(b.riderRig.limbs.find(l=>l.side===-1)!.hand.rotation.x+RIDER_TUNING.throttleWrist)<1e-6,'full wrist intensity retained');
  disposeBike(b);
 }
});

test('smaller riders keep the neck embedded in torso and helmet, with the stopped foot on ground',()=>{
 for(const spec of vehicles){
  const b=createBike(spec.id),rig=b.riderRig;
  for(const body of [-1,0,1])for(const wheelie of [0,.7]){
   for(let i=0;i<120;i++)rig.update(12,.4,1/60,false,body,1,false,wheelie);
   const base=end(rig.neck,-.5).sub(rig.torso.position).applyQuaternion(rig.torso.quaternion.clone().invert());
   assert.ok(Math.abs(base.y)<rig.torso.scale.y,'neck base stays inside chest');
   const top=end(rig.neck,.5).sub(rig.head.position).applyQuaternion(rig.head.quaternion.clone().invert());
   assert.ok(Math.abs(top.y)<.156*RIDER_TUNING.bodyScale,'neck reaches helmet');
   const attached=rig.head.position.clone().sub(rig.torso.position).applyQuaternion(rig.torso.quaternion.clone().invert());
   assert.ok(Math.abs(attached.y-.35*RIDER_TUNING.bodyScale)<1e-8,'head follows chest');
  }
  for(let i=0;i<300;i++)rig.update(0,0,1/60,false);
  const foot=rig.limbs.find(l=>l.side===1)!.foot;
  assert.ok(Math.abs(rig.root.position.y+foot.position.y-foot.scale.y)<1e-7,'support foot reaches ground in bike space');
  assert.equal(rig.root.scale.x,1,'contact targets are not scaled with anatomy');
  disposeBike(b);
 }
});

test('neutral seated riders sit back with bent elbows and connected shoulders on all six bikes',()=>{
 for(const spec of vehicles){
  const bike=createBike(spec.id),rig=bike.riderRig;
  assert.ok(Math.abs(rig.hips.position.z+.36)<1e-8,spec.id);
  for(const limb of rig.limbs){
   const shoulder=new T.Vector3(limb.side*.16,.14,.05).multiplyScalar(RIDER_TUNING.bodyScale).applyQuaternion(rig.torso.quaternion).add(rig.torso.position);
   assert.ok(end(limb.upperArm,-.5).distanceTo(shoulder)<1e-8,spec.id);
   const joint=end(limb.upperArm,.5);
   const angle=shoulder.sub(joint).angleTo(end(limb.forearm,.5).sub(joint));
   assert.ok(angle>Math.PI*.46&&angle<Math.PI*.91,spec.id+' elbow angle '+angle);
  }
  disposeBike(bike);
 }
});
