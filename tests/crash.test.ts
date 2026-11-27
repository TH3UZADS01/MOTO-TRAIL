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
test('frontal and lateral obstacles resolve without tunnelling',()=>{
 for(const o of [{x:0,z:2,r:.1},{x:0,z:2,r:3,halfX:3,halfZ:.05,angle:.4}]){
  const b=new CrashBody();b.position.set(0,1,0);b.velocity.set(0,0,70);b.step(.1,[o],()=>0);
  assert.ok(b.position.z<2);assert.ok(b.velocity.z<70);
 }
 const c=new CrashState('collision',new T.Vector3(),new T.Quaternion(),new T.Vector3(0,0,30),new T.Vector3());
 c.bike.velocity.set(0,0,0);const p=c.detach(new T.Vector3(0,1,0),new T.Quaternion(),new T.Vector3(),new T.Vector3(.4,.8,.4));
 assert.equal(p.velocity.z,30);
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
