import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Ride} from '../src/riding';
import {vehicles} from '../src/vehicles';

test('a stationary burnout spins the rear wheel and pivots around the inside boot',()=>{
 for(const spec of vehicles)for(const turn of [-1,0,1]){
  const ride=new Ride();ride.spec=spec;
  const boot=()=>({
   x:ride.x+(turn||1)*.48*Math.cos(ride.heading)+.05*Math.sin(ride.heading),
   z:ride.z-(turn||1)*.48*Math.sin(ride.heading)+.05*Math.cos(ride.heading)
  });
  const initial=boot(),heading=ride.heading;
  for(let i=0;i<120;i++)ride.step(1/60,1,1,turn,[],false,0,true,true);
  assert.ok(ride.burnoutSpeed>1);
  assert.equal(ride.speed,0);
  assert.equal(ride.distance,0);
  assert.ok(Math.hypot(boot().x-initial.x,boot().z-initial.z)<1e-8);
  if(turn){assert.ok(turn*(ride.heading-heading)>Math.PI);assert.ok(turn*ride.lean<-.15)}
  else assert.equal(ride.heading,heading);
  ride.step(1/60,1,0,turn,[]);
  assert.equal(ride.burnoutSpeed,0);
  assert.ok(ride.speed>0);
 }
});
test('rolling, pushing and neutral do not engage a burnout',()=>{
 const ride=new Ride();ride.speed=4;
 ride.step(1/60,1,1,1,[]);assert.equal(ride.burnoutSpeed,0);
 ride.speed=0;ride.step(1/60,1,1,1,[],true);assert.equal(ride.burnoutSpeed,0);
 ride.speed=0;ride.gear=0;ride.step(1/60,1,1,1,[],false,0,false,true);assert.equal(ride.burnoutSpeed,0);
});
