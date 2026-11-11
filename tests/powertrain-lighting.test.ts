import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Powertrain,gearSpeedLimit,ENGINE_TUNING} from '../src/powertrain';
import {vehicles} from '../src/vehicles';
import {Sound,AUDIO_ASSETS} from '../src/audio';
import * as T from 'three';
import {sampleDay,DayCycle,DAY_TUNING} from '../src/day-cycle';
import {makeSky} from '../src/graphics';
import {createBike,disposeBike} from '../src/vehicle-models';
const timeAt=(hour:number)=>(hour-DAY_TUNING.startHour+24)%24/24*DAY_TUNING.cycleSeconds*1000;
test('limiter only operates at redline with load, gives bounded pulses, then upshifts',()=>{
 for(const spec of vehicles){const engine=new Powertrain(),top=spec.maxSpeed;engine.update(1/60,0,spec,top,1,0,false);assert.equal(engine.limiting,false);
  for(let gear=1;gear<=spec.gears;gear++){engine.reset();engine.gear=gear;const speed=gearSpeedLimit(spec.gears,gear,top);let cut=0,open=0;
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
  const firstLimit=gearSpeedLimit(spec.gears,1,top);
  assert.equal(engine.requestShift(1,firstLimit*.2,spec,top),false);
  assert.equal(engine.requestShift(1,firstLimit*.8,spec,top),true);
  assert.equal(engine.gear,2);
  engine.update(1/60,top,spec,top,1,0,false,false);
  assert.equal(engine.gear,2);
  assert.equal(engine.requestShift(-1,firstLimit*.95,spec,top),false);
  engine.update(1/60,0,spec,top,0,0,false,true);
  assert.equal(engine.gear,1);
  engine.gear=1;
  for(let i=0;i<30;i++)engine.update(1/60,firstLimit,spec,top,1,0,false,true);
  assert.equal(engine.gear,2);
  engine.update(1/60,firstLimit*.7,spec,top,0,0,false,true);
  assert.equal(engine.gear,1);
 }
});
test('audio cutoff affects only engine gain, leaves wind alone and restores on release',()=>{
 const s=new Sound();s.ctx={currentTime:1} as AudioContext;s.ready=true;s.vehicle='cg150';const parameter=()=>({value:0,setTargetAtTime(value:number){this.value=value}});s.layers=AUDIO_ASSETS.map(a=>({...a,gain:{gain:parameter()},source:{playbackRate:parameter()},filter:{frequency:parameter()}})) as any;
 const state={ratio:1,limiting:true,cutting:false};s.update(30,5,1,false,0,state);const before=s.layers.map(l=>l.gain.gain.value);s.update(30,5,1,false,0,{...state,cutting:true});s.layers.forEach((l,i)=>assert.ok(Math.abs(l.gain.gain.value-before[i]*(l.bank==='wind'?1:ENGINE_TUNING.cutGain))<1e-9));s.update(30,5,1,false,0,state);s.layers.forEach((l,i)=>assert.equal(l.gain.gain.value,before[i]));s.update(30,5,1,true,0,{...state,cutting:true});assert.ok(s.layers.every(l=>l.gain.gain.value===0));
});
test('day cycle wraps continuously, sunrise/sunset fade, night lights preserve visibility',()=>{
 const noon=sampleDay(timeAt(12)),midnight=sampleDay(timeAt(0));assert.equal(noon.daylight,1);assert.equal(noon.night,0);assert.equal(midnight.daylight,0);assert.equal(midnight.night,1);assert.ok(noon.elevation>.99&&midnight.elevation<-.99);
 for(let t=0;t<DAY_TUNING.cycleSeconds*1000;t+=1000){const a=sampleDay(t),b=sampleDay(t+10);assert.ok(Math.abs(a.daylight-b.daylight)<.01);assert.ok(Math.abs(a.night-b.night)<.01);assert.ok(Math.abs(a.elevation-sampleDay(t+DAY_TUNING.cycleSeconds*1000).elevation)<1e-12)}
 const scene=new T.Scene();scene.background=new T.Color();scene.fog=new T.Fog(0,150,700);const sun=new T.DirectionalLight(),ambient=new T.HemisphereLight(),cycle=new DayCycle(scene,sun,ambient,makeSky(scene));cycle.update(timeAt(0),0,20,0,0,700);assert.ok(sun.intensity>0&&ambient.intensity>0);assert.ok((scene.fog as T.Fog).far>400);
 for(const v of vehicles){const b=createBike(v.id);b.headlight.update(1);assert.ok(b.headlight.light.intensity>0);assert.equal(b.headlight.light.castShadow,false);assert.equal(b.headlight.light.parent,b.steering);b.headlight.update(0);assert.equal(b.headlight.light.intensity,0);assert.equal(b.headlight.lens.visible,false);disposeBike(b)}
});
