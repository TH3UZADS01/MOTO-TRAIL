import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {CrashBody,CrashState} from '../src/crash';
import {Ride} from '../src/riding';
import {createBike,disposeBike} from '../src/vehicle-models';
import {CrashView} from '../src/crash-view';
import {OnFoot} from '../src/on-foot';
import {ground} from '../src/terrain';

for(const speed of [3,65])test(`loop-out preserves momentum at ${speed} m/s`,()=>{
 const r=new Ride();r.speed=speed;r.wheelie=1.7;(r as any).wheelieAngularVelocity=2;
 r.beginCrash('loop-out');const c=r.crash!;
 assert.ok(Math.abs(Math.hypot(c.incoming.x,c.incoming.z)-speed)<1e-8);
 assert.ok(c.bike.angular.length()>1.99);
 const p=c.bike.position.clone(),q=c.bike.orientation.clone();r.step(1/60,0,0,0,[]);
 assert.ok(c.bike.position.distanceTo(p)>.01);assert.ok(q.angleTo(c.bike.orientation)>.001);
});
for(const [name,floor] of [['flat',()=>0],['downhill',(x:number,z:number)=>-.15*z],['cross slope',(x:number,z:number)=>.2*x],['chunk seam',(x:number,z:number)=>.1*Math.abs(z-16)]] as const){
 for(const fps of [30,60,144])test(`crash terrain support ${name} at ${fps} FPS`,()=>{
  const b=new CrashBody(new T.Vector3(.4,.85,.4));b.position.set(0,2,15);b.velocity.set(8,0,45);b.angular.set(2,.3,1);
  for(let i=0;i<fps*30;i++){b.step(1/fps,[],floor,()=>.45);assert.ok(b.clearance(floor)>-1e-6)}
  assert.ok(b.velocity.length()<1,`speed ${b.velocity.length()}`);assert.ok(Number.isFinite(b.position.y));
 });
}
test('distance depends on speed and surface, with consistent FPS',()=>{
 function slide(speed:number,mu:number,fps=60){const b=new CrashBody();b.position.y=.65;b.velocity.z=speed;for(let i=0;i<fps*20;i++)b.step(1/fps,[],()=>0,()=>mu);assert.ok(b.sleeping);return b.position.z}
 assert.ok(slide(30,.45)>slide(10,.45)*5);assert.ok(slide(20,.25)>slide(20,.5)*1.8);
 assert.ok(Math.abs(slide(20,.45,30)-slide(20,.45,144))<.2);
});
test('a tipped or inverted bike settles on the side that hit the ground',()=>{
 for(const pitch of [0,Math.PI/2,Math.PI])for(const side of [-1,1])for(const slope of [0,.12]){
  const floor=(x:number)=>slope*x,normal=new T.Vector3(-slope,1,0).normalize();
  const b=new CrashBody();b.position.y=2;
  b.orientation.setFromEuler(new T.Euler(pitch,0,side*.45,'ZXY'));
  const right=()=>new T.Vector3(1,0,0).applyQuaternion(b.orientation);
  const initialSide=Math.sign(right().dot(normal));
  for(let i=0;i<600&&!b.sleeping;i++)b.step(1/60,[],floor,()=>.48);
  assert.ok(b.sleeping);
  assert.ok(initialSide*right().dot(normal)>.999);
  assert.ok(Math.abs(b.clearance(floor))<.001);
 }
});
test('frontal and lateral obstacles resolve without tunnelling',()=>{
 for(const o of [{x:0,z:2,r:.1},{x:0,z:2,r:3,halfX:3,halfZ:.05,angle:.4}]){
  const b=new CrashBody();b.position.set(0,1,0);b.velocity.set(0,0,70);b.step(.1,[o],()=>0);
  assert.ok(b.position.z<2);assert.ok(b.velocity.z<70);
 }
 const c=new CrashState('collision',new T.Vector3(),new T.Quaternion(),new T.Vector3(0,0,30),new T.Vector3());
 c.bike.velocity.set(0,0,0);const p=c.detach(new T.Vector3(0,1,0),new T.Quaternion(),new T.Vector3(),new T.Vector3(.4,.8,.4));
 assert.equal(p.velocity.z,30);
});
test('detached rider sheds momentum quickly on contact across surfaces and frame rates',()=>{
 for(const speed of [8,20])for(const mu of [.24,.48])for(const fps of [30,120]){
  const crash=new CrashState('slide',new T.Vector3(),new T.Quaternion(),new T.Vector3(0,0,speed),new T.Vector3());
  const rider=crash.detach(new T.Vector3(),new T.Quaternion(),crash.bike.center.clone(),crash.bike.half.clone());
  for(const body of [rider,crash.bike])for(let i=0;i<fps*12;i++)body.step(1/fps,[],()=>0,()=>mu);
  assert.ok(rider.sleeping&&rider.position.z>0);
  const previousBikeDistance=speed**2/(2*mu*9.81);
  assert.ok(rider.position.z<previousBikeDistance*.45);
  assert.ok(crash.bike.sleeping&&crash.bike.position.z<previousBikeDistance*.55);
 }
});
test('visible rider touches terrain while sliding after impact',()=>{
 const r=new Ride(),bike=createBike('pop'),scene=new T.Scene(),view=new CrashView(),foot=new OnFoot();
 scene.add(bike.root);bike.root.position.set(r.x,r.y,r.z);bike.root.rotation.z=.8;
 r.speed=14;r.beginCrash('collision');view.update(bike,r,scene,foot,0);
 let contacts=0;
 for(let i=0;i<180;i++){
  r.step(1/60,0,0,0,[]);view.update(bike,r,scene,foot,1/60);
  const pilot=r.crash!.rider!;
  if(!pilot.grounded||pilot.velocity.length()<1||i%5!==0)continue;
  let gap=Infinity;const point=new T.Vector3();
  bike.rider.updateWorldMatrix(true,true);
  bike.rider.traverseVisible(o=>{
   if(!(o instanceof T.Mesh))return;
   const vertices=o.geometry.getAttribute('position');
   for(let j=0;j<vertices.count;j++){
    point.fromBufferAttribute(vertices,j).applyMatrix4(o.matrixWorld);
    gap=Math.min(gap,point.y-ground(point.x,point.z));
   }
  });
  assert.ok(gap>=0&&gap<.007);contacts++;
 }
 assert.ok(contacts>1);view.reset();disposeBike(bike);
});
test('visual detach preserves world transform and recovery restores walking and riding',()=>{
 const r=new Ride(),b=createBike('pop'),scene=new T.Scene(),view=new CrashView(),foot=new OnFoot();scene.add(b.root);
 b.root.position.set(r.x,r.y,r.z);b.root.rotation.y=r.heading;scene.updateMatrixWorld(true);
 const p=b.rider.getWorldPosition(new T.Vector3()),q=b.rider.getWorldQuaternion(new T.Quaternion());r.speed=12;r.beginCrash('collision');
 view.update(b,r,scene,foot,0);
 assert.equal(b.rider.parent,scene);assert.ok(b.rider.position.distanceTo(p)<1e-6);assert.ok(b.rider.quaternion.angleTo(q)<1e-6);
 for(let i=0;i<1800&&foot.riding;i++){r.step(1/60,0,0,0,[]);view.update(b,r,scene,foot,1/60)}
 assert.equal(foot.mode,'WALKING');assert.ok(foot.y>=ground(foot.x,foot.z));assert.equal(b.rider.parent,b.body);
 const end={x:r.x,z:r.z};view.reset();r.liftHere();assert.equal(r.fallen,false);assert.deepEqual({x:r.x,z:r.z},end);
 foot.reset();r.step(1/60,1,0,0,[]);assert.ok(Number.isFinite(r.speed));disposeBike(b);
});

test('walking after a loop-out keeps shoulders, hips and helmet upright',()=>{
 const r=new Ride(),bike=createBike('pop'),scene=new T.Scene(),view=new CrashView(),foot=new OnFoot();
 const rig=bike.riderRig;
 scene.add(bike.root);bike.root.position.set(r.x,r.y,r.z);
 r.speed=5;r.wheelie=1.7;r.lean=.3;r.bodyLean=-1;
 bike.body.rotation.set(-r.wheelie,0,r.lean);
 const seatedPose=()=>rig.update(r.speed,.4,1/60,false,r.bodyLean,0,false,r.wheelie,r.lean);
 for(let i=0;i<120;i++)seatedPose();
 r.beginCrash('loop-out');view.update(bike,r,scene,foot,0);
 for(let i=0;i<1800&&foot.riding;i++){r.step(1/60,0,0,0,[]);view.update(bike,r,scene,foot,1/60)}
 assert.equal(foot.mode,'WALKING');
 for(const stride of [0,1]){
  seatedPose();rig.onFoot(foot.x,foot.y,foot.z,foot.heading,1,foot.side,.8,stride,0);
  for(const joint of [rig.hips,rig.torso,rig.head]){
   const up=new T.Vector3(0,1,0).applyQuaternion(joint.getWorldQuaternion(new T.Quaternion()));
   assert.ok(up.y>.9999);
   assert.ok(Math.abs(joint.position.x)<.001);
  }
 }
 view.reset();disposeBike(bike);
});
