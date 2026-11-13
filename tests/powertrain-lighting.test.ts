import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Powertrain,ENGINE_TUNING} from '../src/powertrain';
import {vehicles} from '../src/vehicles';
import {Sound,AUDIO_ASSETS} from '../src/audio';
import * as T from 'three';
import {sampleDay,DayCycle,DAY_TUNING} from '../src/day-cycle';
import {makeSky} from '../src/graphics';
import {createBike,disposeBike} from '../src/vehicle-models';
const timeAt=(hour:number)=>(hour-DAY_TUNING.startHour+24)%24/24*DAY_TUNING.cycleSeconds*1000;
test('limiter only operates at redline with load, gives bounded pulses, then upshifts',()=>{
 for(const spec of vehicles){const engine=new Powertrain(),top=spec.maxSpeed;engine.update(1/60,0,spec,top,1,0,false);assert.equal(engine.limiting,false);
  for(let gear=1;gear<=spec.gears;gear++){engine.reset();engine.gear=gear;const speed=engine.speedAtRedline(spec,gear);let cut=0,open=0;
   for(let i=0;i<12;i++){engine.update(1/60,speed,spec,top,1,0,false);assert.equal(engine.limiting,true);engine.cutting?cut++:open++;}assert.ok(cut>0&&open>0);assert.equal(engine.gear,gear);
   for(let i=0;i<4;i++)engine.update(1/60,speed,spec,top,1,0,false);if(gear<spec.gears){assert.equal(engine.gear,gear+1);assert.equal(engine.limiting,false);assert.ok(engine.ratio<1)}
   engine.update(1/60,speed,spec,top,0,0,false);assert.equal(engine.cutting,false);engine.update(1/60,speed,spec,top,1,1,false);assert.equal(engine.cutting,false);engine.update(1/60,speed,spec,top,1,0,true);assert.equal(engine.cutting,false);
  }
 }
});
test('manual shifting stays player-controlled, blocks over-rev downshifts, and automatic mode remains automatic',()=>{
 for(const spec of vehicles){
  const top=spec.maxSpeed,engine=new Powertrain();
  engine.update(1/60,top,spec,top,1,0,false,false);
  if(spec.gears===1){assert.equal(engine.requestShift(1,top,spec,top),false);continue}
  assert.equal(engine.gear,1);
  const firstLimit=engine.speedAtRedline(spec,1);
  assert.equal(engine.requestShift(1,0,spec,top),true);
  assert.equal(engine.gear,2);
  engine.reset();
  assert.equal(engine.requestShift(1,firstLimit*.8,spec,top),true);
  assert.equal(engine.gear,2);
  engine.update(1/60,top,spec,top,1,0,false,false);
  assert.equal(engine.gear,2);
  assert.equal(engine.requestShift(-1,firstLimit*1.01,spec,top),false);
  engine.update(1/60,0,spec,top,0,0,false,true);
  assert.equal(engine.gear,1);
  engine.gear=1;
  const physicalFirstLimit=Math.min(top,engine.speedAtRedline(spec,1));
  for(let i=0;i<30;i++)engine.update(1/60,physicalFirstLimit,spec,top,1,0,false,true);
  assert.equal(engine.gear,2);
  for(let i=0;i<30;i++)engine.update(1/60,physicalFirstLimit*.7,spec,top,0,0,false,true);
  assert.equal(engine.gear,1);
 }
});
test('every gear has one redline and a redline-derived speed with positive torque at cutoff',()=>{
 for(const spec of vehicles){
  const engine=new Powertrain();
  assert.ok(Math.abs(engine.speedAtRedline(spec,spec.gears)-spec.maxSpeed)<.001,`${spec.id} top gear must reach redline at its configured top speed`);
  for(let gear=1;gear<=spec.gears;gear++){
   const speed=engine.speedAtRedline(spec,gear);
   assert.ok(speed>0&&Number.isFinite(speed),`${spec.id} gear ${gear} speed`);
   assert.ok(Math.abs(engine.wheelRpmFromSpeed(speed,spec,gear)-spec.redlineRpm)<1e-8);
   assert.ok(engine.torqueAtRpm(spec.redlineRpm,spec)>0,`${spec.id} gear ${gear} retains torque through cutoff`);
   engine.gear=gear;engine.update(1/60,speed,spec,spec.maxSpeed,1,0,false,false);
   assert.ok(Math.abs(engine.rpm-spec.redlineRpm)<1e-8,`${spec.id} gear ${gear} reaches the shared limiter`);
   assert.equal(engine.limiting,true);
  }
 }
});
test('audio cutoff affects only engine gain, leaves wind alone and restores on release',()=>{
 const s=new Sound();s.ctx={currentTime:1} as AudioContext;s.ready=true;s.vehicle='cg150';const parameter=()=>({value:0,setTargetAtTime(value:number){this.value=value}});s.layers=AUDIO_ASSETS.map(a=>({...a,gain:{gain:parameter()},source:{playbackRate:parameter()},filter:{frequency:parameter()}})) as any;
 const state={ratio:1,limiting:true,cutting:false,revMatchTime:0,revMatchPeak:0};s.update(30,5,1,false,0,state);const before=s.layers.map(l=>l.gain.gain.value);s.update(30,5,1,false,0,{...state,cutting:true});s.layers.forEach((l,i)=>assert.ok(Math.abs(l.gain.gain.value-before[i]*(l.bank==='wind'?1:ENGINE_TUNING.cutGain))<1e-9));s.update(30,5,1,false,0,state);s.layers.forEach((l,i)=>assert.equal(l.gain.gain.value,before[i]));s.update(30,5,1,true,0,{...state,cutting:true});assert.ok(s.layers.every(l=>l.gain.gain.value===0));
});
test('high-gear launches are progressively weaker and stall only in the top gears under lugging load',()=>{
 for(const spec of vehicles){
  const engine=new Powertrain(),forces=[];
  for(let gear=1;gear<=spec.gears;gear++){engine.reset();engine.gear=gear;engine.update(1/60,0,spec,spec.maxSpeed,1,0,false,false,true);forces.push(engine.wheelForce(spec,0,1))}
  assert.ok(forces[0]>0);for(let gear=1;gear<forces.length;gear++)assert.ok(forces[gear]<forces[gear-1],`${spec.id} gear ${gear+1} should have less launch force`);
 }
 const spec=vehicles.find(v=>v.id==='cg150')!,engine=new Powertrain();engine.gear=3;
 for(let i=0;i<90;i++)engine.update(1/60,0,spec,spec.maxSpeed,1,0,false,false,true);
 assert.equal(engine.stalled,false);assert.equal(engine.lugging,true);
 engine.gear=5;engine.reset();engine.gear=5;
 for(let i=0;i<90;i++)engine.update(1/60,0,spec,spec.maxSpeed,1,0,false,false,true);
 assert.equal(engine.stalled,true);assert.equal(engine.clutch,0);assert.equal(engine.lugging,true);
});
test('all configured ratios descend and coupled shifts immediately use the new gear RPM',()=>{
 for(const spec of vehicles){
  for(let i=0;i<spec.gearRatios.length;i++){
   assert.ok(spec.gearRatios[i]>0,`${spec.id} gear ${i+1} ratio must be positive`);
   if(i>0)assert.ok(spec.gearRatios[i]<spec.gearRatios[i-1],`${spec.id} ratios must decrease`);
  }
  for(let gear=1;gear<spec.gears;gear++){
   const engine=new Powertrain();
   const speed=spec.redlineRpm*.5*2*Math.PI*spec.wheelRadius/(60*engine.getTotalRatio(spec,gear));
   engine.gear=gear;engine.rpm=spec.redlineRpm*.82;
   assert.equal(engine.requestShift(1,speed,spec,spec.maxSpeed,true),true);
   assert.equal(engine.rpm,engine.estimatedRpm(spec,speed,gear+1));
   assert.ok(engine.rpm<spec.redlineRpm*.82,`${spec.id} ${gear}→${gear+1} RPM must fall`);
   engine.update(1/60,speed,spec,spec.maxSpeed,0,0,false,false,true);
  }
 }
});
test('every downshift starts a bounded rev-match regardless of current RPM',()=>{
 for(const spec of vehicles){
  for(let gear=spec.gears;gear>1;gear--){
   const engine=new Powertrain();engine.gear=gear;engine.rpm=spec.idleRpm+40;
   const targetRatio=engine.getTotalRatio(spec,gear-1),speed=spec.redlineRpm*.5*2*Math.PI*spec.wheelRadius/(60*targetRatio);
   assert.equal(engine.requestShift(-1,speed,spec,spec.maxSpeed,true),true,`${spec.id} ${gear}→${gear-1}`);
   assert.equal(engine.revMatchSequence,1);
   assert.equal(engine.revMatchTime,ENGINE_TUNING.revMatchDuration);
   engine.update(ENGINE_TUNING.revMatchDuration/2,speed,spec,spec.maxSpeed,0,0,false,false,true);
   assert.ok(engine.rpm>engine.estimatedRpm(spec,speed),`${spec.id} ${gear}→${gear-1} should blip above the new-gear RPM`);
   assert.ok(engine.effectiveThrottle(0)>0,'rev-match briefly opens the throttle');
   assert.ok(engine.wheelForce(spec,speed,engine.effectiveThrottle(0))>0,'blip must deliver actual torque');
  }
 }
});
test('rev match triggers audio blip on downshift',()=>{
 const s=new Sound();s.ctx={currentTime:1} as AudioContext;s.ready=true;s.vehicle='pop';const parameter=()=>({value:0,setTargetAtTime(value:number){this.value=value}});s.layers=AUDIO_ASSETS.map(a=>({...a,gain:{gain:parameter()},source:{playbackRate:parameter()},filter:{frequency:parameter()}})) as any;
 const before=s.layers.find(l=>l.bank==='engine'&&l.load)?.gain.gain.value ?? 0;
 s.update(20,2,1,false,0,{ratio:.6,limiting:false,cutting:false,revMatchTime:ENGINE_TUNING.revMatchDuration*.4,revMatchPeak:1200});
 const engineLayer=s.layers.find(l=>l.bank==='engine'&&l.load)!;
 assert.ok(engineLayer.gain.gain.value>before);
 assert.ok(engineLayer.source.playbackRate.value>1);
});
test('day cycle wraps continuously, sunrise/sunset fade, night lights preserve visibility',()=>{
 const noon=sampleDay(timeAt(12)),midnight=sampleDay(timeAt(0));assert.equal(noon.daylight,1);assert.equal(noon.night,0);assert.equal(midnight.daylight,0);assert.equal(midnight.night,1);assert.ok(noon.elevation>.99&&midnight.elevation<-.99);
 for(let t=0;t<DAY_TUNING.cycleSeconds*1000;t+=1000){const a=sampleDay(t),b=sampleDay(t+10);assert.ok(Math.abs(a.daylight-b.daylight)<.01);assert.ok(Math.abs(a.night-b.night)<.01);assert.ok(Math.abs(a.elevation-sampleDay(t+DAY_TUNING.cycleSeconds*1000).elevation)<1e-12)}
 const scene=new T.Scene();scene.background=new T.Color();scene.fog=new T.Fog(0,150,700);const sun=new T.DirectionalLight(),ambient=new T.HemisphereLight(),cycle=new DayCycle(scene,sun,ambient,makeSky(scene));cycle.update(timeAt(0),0,20,0,0,700);assert.ok(sun.intensity>0&&ambient.intensity>0);assert.ok((scene.fog as T.Fog).far>400);
 for(const v of vehicles){const b=createBike(v.id);b.headlight.update(1);assert.ok(b.headlight.light.intensity>0);assert.equal(b.headlight.light.castShadow,false);assert.equal(b.headlight.light.parent,b.steering);b.headlight.update(0);assert.equal(b.headlight.light.intensity,0);assert.equal(b.headlight.lens.visible,false);disposeBike(b)}
});
