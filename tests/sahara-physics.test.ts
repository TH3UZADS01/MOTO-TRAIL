import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getVehicle} from '../src/vehicles';
import {Powertrain} from '../src/powertrain';
import {Ride} from '../src/riding';
import {capacities} from '../src/fuel';

test('Sahara uses original six ratios, wheelbase, capacity and published engine peaks',()=>{
 const s=getVehicle('sahara'),p=new Powertrain();
 assert.equal(s.gears,6);assert.equal(s.wheelbase,1.396);assert.equal(capacities.sahara,14);
 assert.equal(s.finalDrive,(65/24)*(38/14));
 assert.ok(Math.abs(p.torqueAtRpm(6500,s)-30.6948)<.001);
 assert.ok(Math.abs(p.torqueAtRpm(7500,s)*7500*2*Math.PI/60/735.49875-31.5)<.001);
 let previous=0;for(let g=1;g<=6;g++){const speed=p.speedAtRedline(s,g);assert.ok(speed>previous);previous=speed}
 assert.ok(previous*3.6>150&&previous*3.6<160);
});
test('Sahara accelerates progressively through gears and brakes in realistic mode',()=>{
 const r=new Ride();r.spec=getVehicle('sahara');r.contact=()=>{r.pitch=0};
 let time100=0;
 for(let i=0;i<60*120;i++){
  r.x=-310;r.z=0;r.heading=0;r.step(1/60,1,0,0,[],false,0,true,true);
  if(!time100&&r.speed>=100/3.6)time100=(i+1)/60;
  assert.ok(Number.isFinite(r.speed));assert.ok(r.speed<=r.topSpeed);
 }
 assert.ok(time100>5&&time100<25,`0-100 ${time100}s`);
 assert.ok(r.gear>=5);assert.ok(r.speed*3.6>125,`speed ${r.speed*3.6}`);
 const before=r.speed;
 for(let i=0;i<60;i++){r.x=-310;r.z=0;r.step(1/60,0,1,0,[],false,0,true,true)}
 assert.ok(r.speed<before-3);
});
