import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Ride} from '../src/riding';
import {Controller} from '../src/input';
import {vehicles,getVehicle,type VehicleId} from '../src/vehicles';

// Sample identical asphalt at a controlled entry speed each tick, with real gearbox and suspension.
function bench(id:VehicleId,kmh:number,grade=0){
 const r=new Ride();r.spec=getVehicle(id);r.gear=Math.min(4,r.spec.gears);r.setHandlingMode('simcade');
 r.contact=()=>{r.pitch=grade};const {x,z}=r;
 const run=(gas:number,brake:number,lever=0,ticks=120,turn=0)=>{
  for(let i=0;i<ticks;i++){
   r.x=x;r.z=z;r.speed=kmh/3.6;r.step(1/60,gas,brake,turn,[],false,0,false,true,false,lever);
  }
 };
 return {r,run};
}

test('partial and hard braking, drive, rebound and axle load conservation on all six bikes',()=>{
 for(const spec of vehicles){
  const {r,run}=bench(spec.id,30);r.gear=Math.min(2,spec.gears);
  run(0,.25);
  const mild=r.suspension.front.compression;
  run(0,1,0,1);
  assert.ok(Math.abs(r.suspension.front.compression-mild)<.005);
  run(0,1);
  assert.ok(r.suspension.front.compression>mild&&mild>0&&r.suspension.rear.compression<0);
  const weight=((spec.mass??100)+spec.riderMass)*9.81;
  assert.ok(Math.abs(r.suspension.front.normalLoad+r.suspension.rear.normalLoad-weight)<1e-6);
  run(1,0);assert.ok(r.suspension.transfer>0&&r.suspension.rear.compression>0,spec.id);
  assert.equal(r.wheelie,0);
  for(let i=0;i<180;i++)r.suspension.step(1/60,spec,0,0,0,0,0,1,1,true);
  assert.ok(Math.abs(r.suspension.front.compression)<1e-5);
 }
});
test('downshifts produce higher RPM, overrun torque and front load on the Titan and Sahara',()=>{
 for(const id of ['cg150','sahara'] as const)for(const speed of [40,60,80]){
  const {r,run}=bench(id,speed,-.04);
  if(speed===80)r.gear=5;
  run(0,0);const torque=r.engine.engineBrakeTorque,rpm=r.engine.rpm,load=r.suspension.front.normalLoad;
  assert.ok(r.engine.requestShift(-1,r.speed,r.spec,r.topSpeed,true));
  run(0,0,0,90,.3);
  assert.ok(r.engine.rpm>rpm&&r.engine.engineBrakeTorque>torque);
  assert.ok(r.suspension.front.normalLoad>load&&!r.fallen);
  assert.equal(r.engine.requestShift(-1,r.engine.speedAtRedline(r.spec,r.gear-1)+1,r.spec,r.topSpeed,true),false);
 }
});

test('braking and suspension agree across 30, 60 and 120 Hz render schedules',()=>{
 const run=(fps:number)=>{
  const {r}=bench('sahara',60);r.speed=60/3.6;
  let accumulator=0,tick=0;
  for(let f=0;f<fps*2;f++){
   accumulator+=1/fps;
   while(accumulator>=1/60){
    r.step(1/60,0,tick<60?0:.45,.18,[],false,0,false,true);
    accumulator-=1/60;tick++;
   }
  }
  return [r.speed,r.engine.engineBrakeTorque,r.suspension.transfer,r.suspension.front.compression,r.lean];
 };
 assert.deepEqual(run(30),run(60));assert.deepEqual(run(120),run(60));
});
test('partial clutch reduces overrun, neutral and open clutch disconnect it, arcade keeps legacy coasting',()=>{
 for(const spec of vehicles){
  const {r,run}=bench(spec.id,40);
  run(0,0);const coupled=r.engine.engineBrakeTorque,closedSpeed=r.speed;
  assert.ok(coupled>0);
  run(0,0,.5);assert.ok(r.engine.engineBrakeTorque>0&&r.engine.engineBrakeTorque<coupled);
  run(0,0,1,1);assert.equal(r.engine.engineBrakeTorque,0);assert.ok(r.speed>closedSpeed);
  if(spec.gears>1){r.gear=0;run(0,0);assert.equal(r.engine.engineBrakeTorque,0)}
  r.setHandlingMode('arcade');r.gear=1;run(0,0);assert.equal(r.engine.engineBrakeTorque,0);assert.equal(r.suspension.transfer,0);
 }
 const torque=(id:VehicleId)=>{const {r,run}=bench(id,40);run(0,0);return r.engine.engineBrakeTorque};
 assert.ok(torque('caloi')<torque('cg150')*.3);
});

test('analog clutch input, fuel loss, and departure from rest',()=>{
 const pad={id:'test',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},()=>({value:0,pressed:false}))};
 pad.buttons[5].value=.4;
 assert.equal(new Controller().poll(.1,1,[pad as Gamepad]).clutch,.4);
 for(const spec of vehicles){
  const {r,run}=bench(spec.id,40);
  r.fuel.get=()=>0;run(0,0);assert.equal(r.engine.engineBrakeTorque,0);
  const start=new Ride();start.spec=spec;start.setHandlingMode('simcade');
  for(let i=0;i<30;i++)start.step(1/60,1,0,0,[],false,0,true,true);
  assert.ok(start.speed>0&&start.suspension.loadShift>0&&start.wheelie===0,spec.id);
 }
});
