import {test} from 'node:test';
import assert from 'node:assert/strict';
import {vehicles} from '../src/vehicles';
import {Ride} from '../src/riding';
import {axis} from '../src/input';
import {SimcadeHandling,simcadeTuning} from '../src/simcade';

test('park, cruise, steer, reverse and release across the fleet and speed range',()=>{
 for(const mode of ['arcade','simcade'] as const)for(const spec of vehicles){
  for(const kmh of [0,10,36,70,110].filter(k=>k<=spec.maxSpeed*3.6)){
   const r=new Ride();r.spec=spec;r.setHandlingMode(mode);
   const {x,z}=r,dt=1/60;
   const tick=(turn:number)=>{
    r.x=x;r.z=z;r.speed=kmh/3.6;r.step(dt,0,0,turn,[]);
    assert.ok(!r.fallen&&Number.isFinite(r.heading));
   };
   const initial=r.heading;
   for(let i=0;i<60;i++)tick(axis(.1,.14));
   assert.equal(r.heading,initial);assert.equal(r.lean,0);
   const small=axis(.28,.14);
   for(let i=0;i<60;i++)tick(small);
   assert.ok(r.steer>0&&r.steer<=small);
   if(kmh)assert.ok(r.heading>initial&&r.lean<0);
   const start=r.heading;tick(1);assert.ok(r.steer<1);
   for(let i=0;i<29;i++)tick(1);
   if(kmh)assert.ok(r.heading-start>.015);
   for(let i=0;i<90;i++)tick(-1);
   if(kmh)assert.ok(r.lean>0);
   if(mode==='simcade')assert.ok(Math.abs(r.lean)<=simcadeTuning.maxLean);
   for(let i=0;i<180;i++){tick(0);assert.ok(r.lean>=-1e-6)}
   assert.ok(Math.abs(r.lean)<.001);
  }
 }
});

test('handling switches preserve orientation, road speed, gear and equipment',()=>{
 const r=new Ride();r.speed=12;r.gear=3;r.setHandlingMode('simcade');
 r.step(1/60,.3,0,1,[],false,0,false,true);
 assert.notEqual(r.handling.rate,0);
 const snapshot=()=>[r.speed,r.heading,r.lean,r.steer,r.gear,r.engine.rpm,r.equipment];
 const before=snapshot();
 for(const mode of ['arcade','simcade'] as const){
  r.setHandlingMode(mode);assert.deepEqual(snapshot(),before);assert.equal(r.handling.rate,0);
 }
});

test('model mass affects steering onset and render cadence preserves the fixed-step result',()=>{
 const firstTurn=(id:string)=>new SimcadeHandling().steer(1/60,0,1,12,vehicles.find(v=>v.id===id)!,1);
 assert.ok(firstTurn('caloi')>firstTurn('pop')&&firstTurn('pop')>firstTurn('sahara'));
 function run(fps:number){
  const r=new Ride();r.setHandlingMode('simcade');let accumulator=0,ticks=0;
  for(let frame=0;frame<fps*4;frame++){
   accumulator+=1/fps;
   while(accumulator>=1/60){
    r.step(1/60,1,0,ticks<60?0:ticks<150?.5:-.5,[]);
    accumulator-=1/60;ticks++;
   }
  }
  return [ticks,r.heading,r.lean,r.speed,r.x,r.z];
 }
 assert.deepEqual(run(30),run(60));assert.deepEqual(run(120),run(60));
});
