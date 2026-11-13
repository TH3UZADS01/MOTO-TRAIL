import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Ride} from '../src/riding';
import {Powertrain} from '../src/powertrain';
import {getVehicle} from '../src/vehicles';
import {createBike,disposeBike} from '../src/vehicle-models';

function reduction(enabled:boolean,realistic:boolean){
 const r=new Ride();r.spec=getVehicle('cg150');r.engine.autoBlip=enabled;r.speed=9;r.gear=3;r.contact=()=>{r.pitch=0};
 r.engine.update(.1,r.speed,r.spec,r.topSpeed,0,0,false,false,realistic);
 assert.equal(r.engine.requestShift(-1,r.speed,r.spec,r.topSpeed,realistic),true);return r;
}
test('downshift blip delivers a short real throttle pulse and animates the hand',()=>{
 for(const realistic of [false,true]){const on=reduction(true,realistic),off=reduction(false,realistic),bike=createBike('cg150');let peak=0;
  for(let i=0;i<18;i++){for(const r of [on,off]){r.x=-310;r.z=0;r.step(1/60,0,0,0,[],false,0,false,realistic)}peak=Math.max(peak,on.engineThrottle);bike.riderRig.update(on.speed,0,1/60,false,0,on.engineThrottle)}
  assert.ok(peak>.6);assert.ok(on.speed>off.speed+.05,`realistic=${realistic}: no drive pulse`);
  assert.ok(bike.riderRig.limbs.find(l=>l.side===-1)!.hand.rotation.x<-.1);
  for(let i=0;i<60;i++){on.x=-310;on.z=0;on.step(1/60,0,0,0,[],false,0,false,realistic);bike.riderRig.update(on.speed,0,1/60,false,0,on.engineThrottle)}
  assert.equal(on.engineThrottle,0);assert.ok(Math.abs(bike.riderRig.limbs.find(l=>l.side===-1)!.hand.rotation.x)<.001);disposeBike(bike);
 }
});
test('disabling cancels the current pulse and prevents new events; upshifts never blip',()=>{
 const r=reduction(true,true);r.engine.update(.1,r.speed,r.spec,r.topSpeed,0,0,false,false,true);assert.ok(r.engine.blipThrottle>0);
 const sequence=r.engine.revMatchSequence;r.engine.autoBlip=false;assert.equal(r.engine.blipThrottle,0);assert.equal(r.engine.revMatchTime,0);
 for(let i=0;i<30;i++)r.engine.update(1/60,r.speed,r.spec,r.topSpeed,0,0,false,false,true);
 r.engine.requestShift(-1,r.speed,r.spec,r.topSpeed,true);assert.equal(r.engine.revMatchSequence,sequence);
 const e=new Powertrain();assert.equal(e.requestShift(1,9,r.spec,r.topSpeed,true),true);assert.equal(e.revMatchSequence,0);
});
test('automatic transmission downshifts also blip, and braking still slows the bike',()=>{
 const r=new Ride();r.spec=getVehicle('cg150');r.gear=3;r.speed=5;r.contact=()=>{r.pitch=0};let peak=0;
 for(let i=0;i<30;i++){r.x=-310;r.z=0;r.step(1/60,0,1,0,[],false,0,true,true);peak=Math.max(peak,r.engineThrottle)}
 assert.ok(peak>0);assert.ok(r.speed<5);
 const pushing=reduction(true,true);pushing.step(1/60,0,0,0,[],true,0,false,true);assert.equal(pushing.engineThrottle,0);
 const fallen=reduction(true,true);fallen.fallen=true;fallen.step(1/60,0,0,0,[]);assert.equal(fallen.engine.blipThrottle,0);
});
