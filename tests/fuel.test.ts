import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Fuel,capacities,kmPerLiter} from '../src/fuel';
import {vehicles} from '../src/vehicles';
import {Ride} from '../src/riding';
test('nominal autonomy follows tank and economy at reference cruise',()=>{for(const v of vehicles){
 const f=new Fuel(1);f.consume(v.id,capacities[v.id]*kmPerLiter[v.id]*1000,1,.4,v.maxSpeed*.55,0,false,v.redlineRpm*.5);
 assert.ok(f.get(v.id)<1e-10);
}});
test('fuel empty disables acceleration; refill, capacity and rescue are bounded',()=>{const r=new Ride();r.fuel.consume('pop',1000000,1,1,20,0,false);assert.equal(r.fuel.get('pop'),0);r.step(1/60,1,0,0,[]);assert.ok(r.speed<.1);assert.equal(r.fuel.rescue('pop'),true);assert.equal(r.fuel.rescue('pop'),false);assert.ok(Math.abs(r.fuel.get('pop')-.7)<1e-10);assert.equal(r.fuel.get('cub'),capacities.cub)});
test('pushing does not consume fuel and faster hard riding uses more',()=>{const a=new Fuel(),b=new Fuel();a.consume('pop',1000,60,.4,10,0,false);b.consume('pop',1000,60,1,27,.1,false);assert.ok(a.get('pop')>b.get('pop'));const before=a.get('pop');a.consume('pop',100,1000,0,-1,0,true);assert.equal(a.get('pop'),before)});
