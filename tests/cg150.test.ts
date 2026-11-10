import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getVehicle} from '../src/vehicles';
import {acceleration} from '../src/riding';
test('CG 150 reaches its tuned limit and brakes harder than Pop from equal speed',()=>{
 const cg=getVehicle('cg150'),pop=getVehicle('pop');let speed=0;
 for(let i=0;i<60*90;i++)speed=Math.min(cg.maxSpeed,Math.max(0,speed+acceleration(speed,cg.power*100/cg.mass!,0,0,1)/60));
 assert.ok(speed*3.6>114);assert.ok(cg.maxSpeed>pop.maxSpeed);
 assert.ok(acceleration(20,0,cg.braking!,0,1)<acceleration(20,0,pop.braking??1,0,1));assert.ok(cg.stability!>1);
});
