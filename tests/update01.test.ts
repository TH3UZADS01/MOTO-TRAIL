import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Ride,automaticTuckInput} from '../src/riding';
import {BODY_TUNING} from '../src/body-control';
import {Controller} from '../src/input';
import {vehicles} from '../src/vehicles';
import {createBike,disposeBike} from '../src/vehicle-models';
import {applyBikePose} from '../src/bike-pose';
import {Fuel} from '../src/fuel';
function flatStep(r:Ride,body:number,gas=1,brake=0,automatic=true){r.x=-310;r.z=0;r.heading=0;r.contact=()=>{r.pitch=0};r.step(1/60,gas,brake,0,[],false,body,automatic)}
test('left stick Y controls body independently of steering and resets on disconnect',()=>{const c=new Controller(),buttons=Array.from({length:16},()=>({pressed:false,value:0})),pad={id:'test',connected:true,mapping:'standard',axes:[.5,-1,0,0],buttons} as unknown as Gamepad;let s=c.poll(.14,1,[pad]);assert.equal(s.body,1);assert.ok(s.turn<0);buttons[12].pressed=true;assert.equal(c.poll(.14,1,[pad]).shiftUp,true);assert.equal(c.poll(.14,1,[pad]).shiftUp,false);buttons[12].pressed=false;buttons[13].pressed=true;assert.equal(c.poll(.14,1,[pad]).shiftDown,true);pad.axes[1]=1;assert.equal(c.poll(.14,1,[pad]).body,-1);assert.equal(c.poll(.14,1,[]).body,0)});
test('aerodynamic tuck helps each motorcycle reach its fixed top speed',()=>{for(const spec of vehicles){
 const expectedTopSpeeds:Record<string,number>={cg150:132,pop:115,cub:82.8,urban:92,caloi:57.5};
 assert.ok(Math.abs(spec.maxSpeed*3.6-expectedTopSpeeds[spec.id])<1e-9,`${spec.id} top speed`);
 const ride=new Ride();ride.spec=spec;assert.equal(ride.topSpeed,spec.maxSpeed);
 for(let i=0;i<60*180;i++)flatStep(ride,0);
 const uprightSpeed=ride.speed;assert.ok(uprightSpeed<spec.maxSpeed*.95,`${spec.id} upright: ${uprightSpeed*3.6} km/h`);
 if(spec.id==='cg150')assert.ok(uprightSpeed*3.6>=112&&uprightSpeed*3.6<=120,`CG 150 upright: ${uprightSpeed*3.6} km/h`);
 ride.recover();ride.spec=spec;
 for(let i=0;i<60*180;i++)flatStep(ride,1);
 assert.ok(ride.bodyLean>.99);assert.ok(ride.speed<=spec.maxSpeed,`${spec.id} exceeded top speed`);
 assert.ok(ride.speed>spec.maxSpeed-.5,`${spec.id} tucked: ${ride.speed*3.6} km/h`);
 assert.ok(ride.speed>uprightSpeed+.9,`${spec.id} tuck did not reduce drag`);
 const tuckedSpeed=ride.speed;
 for(let i=0;i<60;i++)flatStep(ride,0);
 assert.ok(tuckedSpeed-ride.speed<2.5&&ride.speed<tuckedSpeed,`${spec.id} posture transition was abrupt or did not slow`);
 ride.recover();assert.equal(ride.wheelie,0);assert.equal(ride.bodyLean,0);
}});
test('manual gear limits derive from the redline and do not clip speed abruptly',()=>{for(const spec of vehicles){
 const ride=new Ride();ride.spec=spec;
 const firstLimit=ride.engine.speedAtRedline(spec,1);
 for(let i=0;i<60*20;i++)flatStep(ride,0,1,0,false);
 assert.ok(ride.speed<=firstLimit,`${spec.id} exceeded first-gear limit`);
 if(spec.gears>1)assert.ok(ride.speed<spec.maxSpeed*.5,`${spec.id} reached near top speed in first gear`);
 for(let gear=1;gear<=spec.gears;gear++){
  const limit=Math.min(spec.maxSpeed,ride.engine.speedAtRedline(spec,gear));
  ride.engine.gear=gear;ride.speed=limit-.01;
  flatStep(ride,0,1,0,false);
  assert.ok(ride.speed<=limit,`${spec.id} exceeded gear ${gear} limit`);
  ride.speed=limit+.5;
  flatStep(ride,0,1,0,false);
  assert.ok(ride.speed<limit+.5&&ride.speed>limit,`${spec.id} downshift was abrupt or accelerated above gear ${gear} limit`);
 }
}});
test('automatic tuck increases progressively with speed and preserves manual body input',()=>{assert.equal(automaticTuckInput(0,0,40),0);assert.ok(automaticTuckInput(0,10,40)>.3);assert.equal(automaticTuckInput(0,40,40),1);assert.equal(automaticTuckInput(-1,40,40),0);assert.equal(automaticTuckInput(0,-10,40),0)});
test('throttle animation rotates only the right hand and eases back on release for every bike',()=>{for(const spec of vehicles){
 const bike=createBike(spec.id),right=bike.riderRig.limbs.find(l=>l.side===-1)!,left=bike.riderRig.limbs.find(l=>l.side===1)!;
 const rightArm=right.upperArm.position.clone(),leftArm=left.upperArm.position.clone(),leftForearm=left.forearm.position.clone();
 for(let i=0;i<60;i++)bike.riderRig.update(0,0,1/60,false,0,1);
 const pressed=right.hand.rotation.x;assert.ok(pressed<-.25,`${spec.id} right hand did not twist with throttle`);assert.ok(right.upperArm.position.distanceTo(rightArm)>.005,`${spec.id} right arm did not follow throttle`);assert.ok(left.upperArm.position.distanceTo(leftArm)<1e-9);assert.ok(left.forearm.position.distanceTo(leftForearm)<1e-9);assert.equal(left.hand.rotation.x,0);
 bike.riderRig.update(0,0,1/60,false,0,0);assert.ok(right.hand.rotation.x>pressed&&right.hand.rotation.x<0,`${spec.id} hand did not smoothly return`);
 for(let i=0;i<60;i++)bike.riderRig.update(0,0,1/60,false,0,0);
 assert.ok(Math.abs(right.hand.rotation.x)<.001,`${spec.id} hand did not return to neutral`);disposeBike(bike);
}});
test('stopping lowers the left foot and gently leans each bike, then returns while moving',()=>{for(const spec of vehicles){
 const bike=createBike(spec.id),left=bike.riderRig.limbs.find(l=>l.side===1)!,right=bike.riderRig.limbs.find(l=>l.side===-1)!;
 for(let i=0;i<120;i++)bike.riderRig.update(0,0,1/60);
 assert.ok(bike.riderRig.stopPose>.99,`${spec.id} stop pose did not settle`);
 assert.ok(left.foot.position.x>.45&&left.foot.position.y<.03,`${spec.id} left foot did not reach the ground`);
 assert.ok(left.knee.x>.3,`${spec.id} left leg did not extend outward`);
 const leftHip=new T.Vector3(.12,.84,-.2),leftAnkle=new T.Vector3(left.foot.position.x,left.foot.position.y+.035,left.foot.position.z),semiStraightKnee=leftHip.lerp(leftAnkle,.5);semiStraightKnee.z+=.1;
 assert.ok(left.knee.distanceTo(semiStraightKnee)<.12,`${spec.id} left leg remained too bent`);
 assert.ok(Math.abs(right.foot.position.x+.21)<1e-9&&right.foot.position.y>.25,`${spec.id} right foot moved off the peg`);
 applyBikePose(bike,0,0,0,bike.riderRig.stopPose);assert.ok(bike.body.rotation.z<-.07,`${spec.id} did not lean gently to the left while stopped`);
 for(let i=0;i<120;i++)bike.riderRig.update(8,0,1/60);
 assert.ok(bike.riderRig.stopPose<.01,`${spec.id} stop pose did not return while moving`);
 assert.ok(left.foot.position.y>.25,`${spec.id} left foot did not return to the peg`);
 disposeBike(bike);
}});
test('brake lights illuminate smoothly on every bike and fade when braking stops',()=>{for(const spec of vehicles){
 const bike=createBike(spec.id),base=(bike.brakeLight.lens.material as T.MeshStandardMaterial).emissiveIntensity;
 bike.brakeLight.update(1,.2);assert.ok((bike.brakeLight.lens.material as T.MeshStandardMaterial).emissiveIntensity>base+1);assert.ok(bike.brakeLight.glow.intensity>1);
 const lit=(bike.brakeLight.lens.material as T.MeshStandardMaterial).emissiveIntensity;bike.brakeLight.update(0,.01);assert.ok((bike.brakeLight.lens.material as T.MeshStandardMaterial).emissiveIntensity<lit);assert.ok(bike.brakeLight.glow.intensity>0);
 for(let i=0;i<60;i++)bike.brakeLight.update(0,1/60);
 assert.ok(Math.abs((bike.brakeLight.lens.material as T.MeshStandardMaterial).emissiveIntensity-base)<.001);assert.ok(bike.brakeLight.glow.intensity<.001);disposeBike(bike);
}});
test('CG 150 rider head remains connected to a proportionate neck',()=>{const bike=createBike('cg150'),neck=bike.riderRig.neck,head=bike.riderRig.head,torso=bike.riderRig.torso,neckTop=neck.position.y+neck.scale.y/2,neckBottom=neck.position.y-neck.scale.y/2,torsoTop=torso.position.y+.27;assert.ok(neck.scale.y<.1);assert.ok(neckBottom<torsoTop, 'neck should overlap the torso');assert.ok(neckTop>head.position.y-.18,'neck should connect to the head');assert.ok(head.position.y<1.6,'CG 150 head should stay at a proportionate height');disposeBike(bike)});
test('wheelie passes the old 45-degree cap, loop-out falls, braking lands, and reset recovers',()=>{const r=new Ride();for(let i=0;i<300;i++)flatStep(r,-1);assert.ok(r.wheelie>Math.PI/4);assert.equal(r.fallen,true);const fallenSpeed=r.speed;r.step(1/60,1,0,1,[],false,-1);assert.ok(r.speed<fallenSpeed);r.recover();assert.equal(r.fallen,false);assert.equal(r.wheelie,0);const landing=new Ride();landing.speed=10/3.6;landing.wheelie=Math.PI/3;for(let i=0;i<120;i++)flatStep(landing,0,0,1);assert.equal(landing.fallen,false);assert.ok(landing.wheelie<Math.PI/3);const slow=new Ride();slow.speed=1;for(let i=0;i<120;i++)flatStep(slow,-1,0);assert.equal(slow.wheelie,0);const grounded=new Ride(),liftedRide=new Ride();for(const moto of [grounded,liftedRide]){moto.speed=10;moto.steer=1;moto.heading=0}liftedRide.bodyLean=-1;liftedRide.wheelie=Math.PI/4;grounded.step(1/60,1,0,1,[]);liftedRide.step(1/60,1,0,1,[],false,-1);assert.ok(liftedRide.heading<grounded.heading*.6)});
test('wheelie rotation keeps rear axle fixed for all models and follows terrain pitch',()=>{for(const v of vehicles){const b=createBike(v.id);applyBikePose(b,.12,.1,0);b.body.updateMatrixWorld(true);const axle=b.wheels[0].getWorldPosition(new T.Vector3());applyBikePose(b,.12,.1,Math.PI/4);b.body.updateMatrixWorld(true);assert.ok(axle.distanceTo(b.wheels[0].getWorldPosition(new T.Vector3()))<1e-6);assert.ok(b.wheels[1].getWorldPosition(new T.Vector3()).y>axle.y+.6);disposeBike(b)}});
test('fuel increases exactly 10% for every bike without changing refill or capacity',()=>{for(const v of vehicles){const f=new Fuel(),before=f.get(v.id),meters=1000,dt=60,gas=.7,speed=20,pitch=.05;const old=(meters/1000*(.065+.04*(speed/28)**2+.015*gas+pitch*.08)*(v.id==='caloi'?.7:1)+dt*.000015);f.consume(v.id,meters,dt,gas,speed,pitch,false);assert.ok(Math.abs(before-f.get(v.id)-old*1.1)<1e-12, v.id);f.refill(v.id,100);assert.equal(f.get(v.id),before)}});
