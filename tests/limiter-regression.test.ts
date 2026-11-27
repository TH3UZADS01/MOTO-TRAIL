import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Powertrain} from '../src/powertrain';
import {Ride} from '../src/riding';
import {vehicles} from '../src/vehicles';

test('high RPM torque has no abrupt cliff before ignition cutoff',()=>{
 for(const spec of vehicles){const e=new Powertrain();
  assert.ok(e.torqueAtRpm(spec.redlineRpm,spec)>=e.torqueAtRpm(spec.redlineRpm-100,spec)*.94,spec.id);
  assert.ok(e.torqueAtRpm(spec.redlineRpm,spec)<e.torqueAtRpm(spec.peakPowerRpm,spec),spec.id);
 }
});
test('limiter stays rhythmic across small wheel RPM dips, and releases under unloading',()=>{
 for(const spec of vehicles)for(const realistic of [false,true]){
  const e=new Powertrain();let cuts=0,open=0;
  for(let i=0;i<120;i++){
   const rpm=spec.redlineRpm-(i===0?0:i%2?60:20);
   e.update(1/60,e.speedAtRpm(rpm,spec),spec,spec.maxSpeed,1,0,false,false,realistic);
   assert.equal(e.limiting,true);e.cutting?cuts++:open++;
  }
  assert.ok(cuts>25&&cuts<50,`${spec.id}: ${cuts} cut frames`);assert.ok(open>60);
  e.update(1/60,e.speedAtRpm(spec.redlineRpm-250,spec),spec,spec.maxSpeed,1,0,false,false,realistic);assert.equal(e.limiting,false);
  e.update(1/60,e.speedAtRedline(spec),spec,spec.maxSpeed,0,0,false,false,realistic);assert.equal(e.cutting,false);
  e.update(1/60,e.speedAtRedline(spec),spec,spec.maxSpeed,1,1,false,false,realistic);assert.equal(e.cutting,false);
 }
});
test('realistic lower gears reach and repeatedly cut under actual acceleration and drag',()=>{
 for(const spec of vehicles)for(let gear=1;gear<=Math.max(1,spec.gears-1);gear++){
  const r=new Ride();r.spec=spec;r.gear=gear;r.speed=r.engine.speedAtRedline(spec,gear)*.8;r.contact=()=>{r.pitch=0};let cuts=0,open=0;
  for(let i=0;i<3600;i++){r.x=-310;r.z=0;r.step(1/60,1,0,0,[],false,1,false,true);if(r.engine.limiting){r.engine.cutting?cuts++:open++}}
  assert.equal(r.gear,gear);assert.ok(cuts>30&&open>60,`${spec.id}, gear ${gear}: ${cuts}/${open}`);
  assert.ok(r.speed<=r.topSpeed+.001);
 }
});
test('a transient RPM blip below wheel redline cannot prematurely cut drive',()=>{
 for(const spec of vehicles){const e=new Powertrain();e.rpm=spec.redlineRpm;
  e.update(1/60,e.speedAtRpm(spec.redlineRpm*.8,spec),spec,spec.maxSpeed,1,0,false,false,true);
  assert.equal(e.limiting,false);assert.equal(e.driveFactor,1);
 }
});

test('touring bikes pull through their nominal speed while sixth gear has RPM available',()=>{
 for(const id of ['sahara','twister','r1200gs'] as const)for(const realistic of [false,true]){
  const r=new Ride();r.spec=vehicles.find(v=>v.id===id)!;r.gear=6;r.speed=r.spec.maxSpeed;
  r.contact=()=>{r.pitch=0};
  for(let i=0;i<180;i++){r.x=-310;r.z=0;r.step(1/60,1,0,0,[],false,1,false,realistic)}
  assert.ok(r.speed>r.spec.maxSpeed+.1,id);
  assert.ok(r.speed<=r.engine.speedAtRedline(r.spec,6),id);
 }
});
