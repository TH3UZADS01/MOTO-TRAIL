import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Fuel,capacities} from '../src/fuel';
import {vehicles} from '../src/vehicles';
import {Ride} from '../src/riding';
test('a full 20 km ride uses a comfortable part of the tank on every bike',()=>{for(const v of vehicles){const f=new Fuel();for(let i=0;i<20000;i++)f.consume(v.id,1,1/20,.7,20,0,false);assert.ok(f.ratio(v.id)>.35);assert.ok(f.ratio(v.id)<.7)}});
test('fuel empty disables acceleration; refill, capacity and rescue are bounded',()=>{const r=new Ride();r.fuel.consume('pop',1000000,1,1,20,0,false);assert.equal(r.fuel.get('pop'),0);r.step(1/60,1,0,0,[]);assert.ok(r.speed<.1);assert.equal(r.fuel.rescue('pop'),true);assert.equal(r.fuel.rescue('pop'),false);r.fuel.refill('pop',1000);assert.equal(r.fuel.get('pop'),capacities.pop);assert.equal(r.fuel.get('cub'),capacities.cub)});
test('pushing does not consume fuel and faster hard riding uses more',()=>{const a=new Fuel(),b=new Fuel();a.consume('pop',1000,60,.4,10,0,false);b.consume('pop',1000,60,1,27,.1,false);assert.ok(a.get('pop')>b.get('pop'));const before=a.get('pop');a.consume('pop',100,1000,0,-1,0,true);assert.equal(a.get('pop'),before)});
