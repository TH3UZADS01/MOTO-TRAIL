import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextDirt,inWashBay} from '../src/bike-dirt';
import {createBike,disposeBike} from '../src/vehicle-models';

test('dirt follows travelled distance and washing time',()=>{
 assert.equal(nextDirt(.3,'terra',0,0),.3);
 assert.ok(nextDirt(0,'terra',250,0)>nextDirt(0,'grama',250,0));
 assert.ok(nextDirt(0,'grama',250,0)>nextDirt(0,'asfalto',250,0));
 assert.equal(nextDirt(.9,'terra',650,0),1);
 assert.equal(nextDirt(1,'terra',0,1),.8);
 assert.equal(nextDirt(.8,'terra',0,4),0);
});
test('wash interaction stays inside the rotated pad',()=>{
 const bay={x:16,z:0,angle:Math.PI/2};
 assert.ok(inWashBay(bay,19.5,2.5));assert.ok(!inWashBay(bay,16,3.5));assert.ok(!inWashBay(bay,0,0));
});
test('Sahara rolls forward and backward around both axles, rear locks independently',()=>{
 const bike=createBike('sahara'),[rear,front]=bike.wheels;
 bike.roll(.362,false);
 assert.ok(Math.abs(front.rotation.x-1)<.00001);
 assert.ok(Math.abs(rear.rotation.x-.362/.325)<.00001);
 bike.roll(-.362,false);
 assert.equal(front.rotation.x,0);assert.equal(rear.rotation.x,0);
 bike.roll(.362,true);assert.equal(rear.rotation.x,0);assert.ok(front.rotation.x>0);
 disposeBike(bike);
});
