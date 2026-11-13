import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Ride} from '../src/riding';
import {Powertrain} from '../src/powertrain';
import {vehicles,getVehicle} from '../src/vehicles';
import {TireParticles} from '../src/tire-particles';
import {Sound} from '../src/audio';

function step(r:Ride,gas=0,body=0,brake=0,dt=1/60){r.x=-310;r.z=0;r.contact=()=>{r.pitch=0};r.step(dt,gas,brake,0,[],false,body,false,true)}
test('ground contact never stores downward wheelie momentum',()=>{
 const r=new Ride();for(let i=0;i<600;i++)step(r);
 assert.equal(r.wheelie,0);assert.equal((r as any).wheelieAngularVelocity,0);
});
test('stalled braking integrates acceleration once',()=>{
 const losses:number[]=[];
 for(const dt of [1/60,1/30]){const r=new Ride();r.spec=getVehicle('cg150');r.speed=.4;r.gear=5;r.engine.rpm=0;r.engine.stalled=true;step(r,1,0,1,dt);assert.equal(r.engine.stalled,true);losses.push((.4-r.speed)/dt)}
 assert.ok(losses[0]>8);assert.ok(Math.abs(losses[0]-losses[1])<.001);
});
test('packing live particles preserves each simulation position after a dead slot',()=>{
 const dust:any=new TireParticles(new T.Scene());
 for(const i of [1,2]){Object.assign(dust.particles[i],{life:1,duration:1,vx:0,vy:0,vz:0});dust.positions[i*3]=i*10}
 dust.activeCount=2;dust.advance(.01);dust.advance(.01);
 const pos=dust.points.geometry.getAttribute('position');assert.equal(pos.getX(0),10);assert.equal(pos.getX(1),20);dust.dispose();
});
test('clutch pulse charges, releases once and requires release plus cooldown',()=>{
 const e=new Powertrain(),spec=getVehicle('pop');let boostedFrames=0;
 for(let i=0;i<180;i++){e.update(1/60,3,spec,spec.maxSpeed,1,0,false,false,true);e.updateClutchKick(1/60,spec,3,1,0,-1,true);if(e.clutchKickGain>1)boostedFrames++}
 assert.ok(boostedFrames>5&&boostedFrames<20);assert.equal(e.clutchKickGain,1);
 e.updateClutchKick(1/60,spec,3,1,0,0,true);e.updateClutchKick(1/60,spec,3,1,0,-1,true);assert.ok(e.clutch<.5);
 e.updateClutchKick(1/60,spec,3,1,1,-1,true);assert.equal(e.clutchKickGain,1);
 e.reset();assert.equal(e.clutchKickGain,1);
});
test('each bike can release body input and balance on throttle alone, then brake down',()=>{
 for(const spec of vehicles){const r=new Ride();r.spec=spec;r.speed=3;let lifted=false,airFrames=0;
  for(let i=0;i<360;i++){
   const gas=lifted?Math.max(0,Math.min(1,.55+(.5-r.wheelie)*2-(r as any).wheelieAngularVelocity*.8)):1;
   step(r,gas,lifted?0:-1);if(r.wheelie>.4)lifted=true;if(lifted&&r.wheelie>.08&&!r.fallen)airFrames++;
  }
  // Faster gravity return shortens the run as first gear reaches its limiter.
  // Still require sustained throttle control after the body input was released.
  assert.ok(lifted&&airFrames>60,spec.id);assert.equal(r.fallen,false,spec.id);
  r.wheelie=.6;(r as any).wheelieAngularVelocity=0;for(let i=0;i<120;i++)step(r,0,0,1);
  assert.equal(r.wheelie,0,spec.id);
 }
});
test('45 degree wheelie returns promptly without throttle and faster with braking',()=>{
 for(const spec of vehicles){const durations:number[]=[];
  for(const brake of [0,1]){const r=new Ride();r.spec=spec;r.speed=5;r.wheelie=Math.PI/4;let ticks=0;
   while(r.wheelie>0&&ticks<180){step(r,0,0,brake);ticks++}
   assert.equal(r.wheelie,0,spec.id);assert.equal((r as any).wheelieAngularVelocity,0);durations.push(ticks/60);
  }
  assert.ok(durations[0]>.4&&durations[0]<.95,`${spec.id}: coast ${durations[0]}`);
  assert.ok(durations[1]<.75&&durations[1]<durations[0],`${spec.id}: brake ${durations[1]}`);
 }
});
test('body pull lifts the front promptly without requiring prolonged throttle buildup',()=>{
 for(const spec of vehicles){const r=new Ride();r.spec=spec;r.speed=3;let ticks=0;
  while(r.wheelie<.6&&ticks<180){step(r,1,-1);ticks++}
  assert.ok(r.wheelie>=.6,`${spec.id}: failed to reach 34 degrees`);
  assert.ok(ticks/60<(spec.id==='caloi'?3:1.5),`${spec.id}: ${ticks/60}s`);
 }
});
test('clutch flare reaches high RPM without exceeding redline and settles after engagement',()=>{
 for(const spec of vehicles)for(const dt of [1/60,1/120]){const e=new Powertrain();let peak=0;
  for(let time=0;time<1.5;time+=dt){e.update(dt,3,spec,spec.maxSpeed,1,0,false,false,true);e.updateClutchKick(dt,spec,3,1,0,-1,true);peak=Math.max(peak,e.rpm);assert.ok(e.rpm<spec.redlineRpm)}
  assert.ok(peak>7900,spec.id);assert.ok(e.rpm<6000,spec.id);assert.equal(e.clutchKickGain,1);
 }
});
test('muted effects do not queue discovery or crash sounds',()=>{
 const s:any=new Sound();s.effects=0;s.playDiscovery();s.playCrash();assert.equal(s.queuedDiscoveries,0);assert.equal(s.crashQueued,false);
});
test('effects volume updates the shared gain even for already scheduled sounds',()=>{
 const s:any=new Sound();let target=-1;
 s.ctx={currentTime:2};s.effectsOutput={gain:{setTargetAtTime:(value:number)=>{target=value}}};
 s.effects=.2;assert.equal(target,.2);s.effects=0;assert.equal(target,0);assert.equal(s.volume,.5);
});
test('clutch kick cannot engage while pushing, braking, stalled or in a high gear',()=>{
 for(const mode of ['push','brake','stall','gear']){const e=new Powertrain(),spec=getVehicle('cg150');e.gear=mode==='gear'?5:1;e.stalled=mode==='stall';e.clutch=1;
  for(let i=0;i<90;i++)e.updateClutchKick(1/60,spec,3,1,mode==='brake'?1:0,-1,true,mode==='push');
  assert.equal(e.clutchKickGain,1,mode);assert.equal(e.clutch,1,mode);
 }
});
