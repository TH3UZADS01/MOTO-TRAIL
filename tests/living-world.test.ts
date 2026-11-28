import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Ride} from '../src/riding';
import {OnFoot} from '../src/on-foot';
import {applyBikePose} from '../src/bike-pose';
import {RIDER_TUNING} from '../src/rider';
import {blocked} from '../src/obstacle';
import {createBike,disposeBike} from '../src/vehicle-models';
import * as T from 'three';
import {vehicles} from '../src/vehicles';
import {eligibleFreight,bikePrices,offer,arrive,type Career} from '../src/career';
import {usedPrice,trips,renewMarket} from '../src/adventures';
import {ground,lakes,deepWater,lakeRadius,stations} from '../src/terrain';
import {scars,pavementRelief,onCobbles} from '../src/pavement';
import {villages} from '../src/map-layout';

test('new jobs and bikes get one multiplier, accepted jobs retain their agreed payment',()=>{
 assert.deepEqual(bikePrices,{pop:0,caloi:2478,urban:8673,cg150:16107,sahara:30975,twister:21240,r1200gs:76700});
 const from=villages[0],to=villages[1],job=offer('Carta',from,to,1,'pop');
 assert.equal(eligibleFreight(from,{...from,x:from.x+600}),false);assert.equal(eligibleFreight(from,{...from,x:from.x+600.01}),true);
 const km=job.referenceKm!;assert.ok(km>3);
 assert.equal(job.pay,Math.round(18+km*9.8*(1+.65*km/(km+18)))*19.5);
 const state:Career={job:{...job,pay:11},money:40,owned:['pop'],garage:{},cooldowns:[],pet:false};
 arrive(state,job.id,to);assert.equal(state.money,51);
 const t=trips[0];assert.equal(t.pay,Math.round(t.km*5+t.stops.length*3)*19.5);
 renewMarket(state,100);const l=state.market!.list[0];assert.equal(l.price,usedPrice(l.vehicle,l.km,(l.motor+l.freios+l.pneus)/3));
 delete state.market!.pricing;l.price=1;renewMarket(state,101);const updated=l.price;renewMarket(state,102);assert.ok(updated>100);assert.equal(l.price,updated);
 state.market!.pricing=2;l.price=4271;renewMarket(state,103);renewMarket(state,104);
 assert.equal(l.price,5039.78);assert.equal(state.money,51);
});

test('all six bikes dismount over time, push with or without fuel, save and mount again',()=>{
 for(const spec of vehicles){
  const b=new Ride();b.spec=spec;b.fuel.get=()=>0;const f=new OnFoot();b.heading=0;
  const start=b.z;b.speed=5;assert.equal(f.mount(b,[]),false);b.speed=0;
  assert.ok(f.mount(b,[]));assert.equal(f.mount(b,[]),false);
  f.step(.1,b,1,0,[]);assert.ok(f.blend>0&&f.blend<1);assert.equal(b.z,start);
  for(let i=0;i<100;i++)f.step(1/60,b,0,0,[]);
  assert.equal(f.mode,'WALKING');assert.ok(f.near(b));assert.ok(f.push(b,[]));
  for(let i=0;i<180;i++)f.step(1/60,b,1,.4,[]);
  assert.equal(f.mode,'PUSHING');assert.ok(b.z>start+1);assert.ok(b.heading>.1);assert.ok(b.speed<2);
  const old=b.z;for(let i=0;i<180;i++)f.step(1/60,b,-1,0,[]);assert.ok(b.z<old);
  const saved=f.snapshot(b),restored=new OnFoot(),other=new Ride();other.spec=spec;restored.restore(other,saved,[]);
  assert.equal(restored.mode,'WALKING');assert.equal(other.z,b.z);assert.ok(restored.near(other));
  assert.ok(f.push(b,[]));assert.equal(b.speed,0);b.fuel.get=()=>1;assert.ok(f.push(b,[]));
  const before=b.z;for(let i=0;i<120;i++)f.step(1/60,b,1,0,[]);
  assert.equal(f.mode,'PUSHING');assert.ok(b.z>before+.5);assert.ok(f.push(b,[]));
  assert.ok(f.mount(b,[]));for(let i=0;i<100;i++)f.step(1/60,b,0,0,[]);assert.ok(f.riding);
 }
});
test('walking in first person faces the view at rest, sideways and in reverse',()=>{
 const b=new Ride(),f=new OnFoot();b.heading=.2;
 assert.ok(f.mount(b,[]));
 for(let i=0;i<100;i++)f.step(1/60,b,0,0,[]);
 for(const [forward,turn,orbit] of [[0,0,.6],[0,1,.8],[-1,0,1]]){
  f.step(1/60,b,forward,turn,[],orbit,true);
  assert.equal(f.heading,b.heading+orbit);
 }
 f.step(1/60,b,0,1,[],1,false);
 assert.ok(f.heading>b.heading+1);
});
test('a thin wall blocks dismounting, walking, riding and pushing at its facade',()=>{
 for(const spec of vehicles){
 const b=new Ride();b.spec=spec;b.heading=0;const f=new OnFoot();b.fuel.get=()=>0;
 const wall={x:b.x,z:b.z+2,r:6,halfX:5,halfZ:.2};
 assert.equal(blocked(wall,b.x,b.z,.3),false);
 assert.equal(f.mount(b,[{...wall,z:b.z,halfZ:1}]),false);assert.ok(f.mount(b,[wall]));
 for(let i=0;i<240;i++)f.step(1/60,b,1,0,[wall]);assert.ok(f.z<wall.z-.4);
 for(let i=0;i<25;i++)f.step(1/60,b,-1,0,[wall]);
 assert.ok(f.push(b,[wall]));for(let i=0;i<300;i++)f.step(1/60,b,1,0,[wall]);
 assert.ok(b.z<wall.z-.7);assert.equal(b.speed,0);
 b.speed=8;for(let i=0;i<30;i++)b.step(1/60,0,0,0,[wall]);assert.ok(b.z<wall.z-.4);assert.equal(b.speed,0);
 }
});
test('pavement details and the visitable lake match their physical footprints',()=>{
 assert.ok(onCobbles(villages[0].x,villages[0].z));assert.ok(scars.some(s=>s.depth>0)&&scars.some(s=>s.depth<0));
 for(const s of scars)assert.ok(Math.abs(pavementRelief(s.x,s.z)-s.depth)<1e-7);
 const lake=lakes[1],bank=lake.z-lakeRadius(lake.r,-Math.PI/2);
 assert.ok(deepWater(lake.x,lake.z));assert.ok(!deepWater(lake.x,bank-10));assert.ok(ground(lake.x,bank-10)>12);
 for(const s of stations)assert.ok(!deepWater(s.x,s.z));
});

test('free arms stay extended at rest and throughout the walking stride',()=>{
 for(const spec of vehicles){
  const bike=createBike(spec.id),rig=bike.riderRig;
  for(const phase of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
   rig.update(0,0,1/60);
   rig.onFoot(.72,0,.12,0,1,1,phase,1,0);
   for(const limb of rig.limbs){
    const upper=new T.Vector3(0,1,0).applyQuaternion(limb.upperArm.quaternion);
    const lower=new T.Vector3(0,1,0).applyQuaternion(limb.forearm.quaternion);
    assert.ok(upper.angleTo(lower)<.13&&upper.y<-.9,spec.id);
   }
  }
  disposeBike(bike);
 }
});
test('both pushing hands follow their own turning grip from either side on every model',()=>{
 for(const spec of vehicles){
  const bike=createBike(spec.id),rig=bike.riderRig;
  for(const side of [-1,1])for(let i=0;i<90;i++){
   bike.setSteering(.5*Math.sin(i/12));
   rig.update(1,0,1/60);
   applyBikePose(bike,0,0,0,1,0,0,spec.wheelbase,false,side);
   const expected=rig.limbs.map(l=>l.hand.getWorldPosition(new T.Vector3()));
   rig.onFoot(side*.47,0,-.06,0,1,side,i/12,1,1);
   assert.ok(rig.torso.position.distanceTo(rig.hips.position)<.23,spec.id);
   assert.ok(Math.abs(rig.torso.rotation.z)<.16,spec.id);
   assert.ok(side*bike.body.rotation.z<0,spec.id);
   rig.limbs.forEach((l,index)=>{
    assert.ok(l.hand.getWorldPosition(new T.Vector3()).distanceTo(expected[index])<1e-6,spec.id);
    const socket=new T.Vector3(l.side*.16,.14,.05).multiplyScalar(RIDER_TUNING.bodyScale).applyQuaternion(rig.torso.quaternion).add(rig.torso.position);
    const armStart=new T.Vector3(0,-l.upperArm.scale.y/2,0).applyQuaternion(l.upperArm.quaternion).add(l.upperArm.position);
    assert.ok(armStart.distanceTo(socket)<.01,spec.id);
   });
   assert.ok(rig.hips.position.y<.9,spec.id);
  }
  disposeBike(bike);
 }
});
test('pushing a loaded motorcycle uphill costs speed without invoking the engine',()=>{
 function travel(grade:number,load:number){
  const b=new Ride();b.fuel.get=()=>0;b.heading=0;b.cargoLoad=load;
  b.contact=()=>{b.pitch=grade;b.y=ground(b.x,b.z)};b.contact();
  const f=new OnFoot();f.mount(b,[]);for(let i=0;i<100;i++)f.step(1/60,b,0,0,[]);
  f.push(b,[]);for(let i=0;i<240;i++)f.step(1/60,b,1,0,[]);
  return b.speed;
 }
 assert.ok(travel(.12,12)<travel(.12,0));assert.ok(travel(.12,0)<travel(0,0));assert.ok(travel(-.2,0)<1.7);
});
