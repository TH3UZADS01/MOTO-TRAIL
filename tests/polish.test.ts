import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Ride} from '../src/riding';
import {OnFoot} from '../src/on-foot';
import {vehicles} from '../src/vehicles';
import {parkedEngineGain,Sound,CG_AUDIO_TUNING} from '../src/audio';
import {TireParticles,TIRE_PARTICLE_CONFIG} from '../src/tire-particles';
import {prices,repairPrice} from '../src/career';
import {GAS_PRICE} from '../src/fuel';
import {partPrice,retailPrice} from '../src/adventure-tuning';

test('parked engines keep their ignition, location, individual idle and fuel state through remount',()=>{
 for(const spec of vehicles)for(const running of [true,false]){
  const r=new Ride(),f=new OnFoot();r.spec=spec;if(!running)r.engine.stop();
  const {x,z}=r,fuel=r.fuel.get(spec.id);
  assert.ok(f.mount(r,[]));
  for(let i=0;i<180;i++){f.step(1/60,r,0,0,[]);r.parkedIdle(1/60)}
  assert.equal(f.mode,'WALKING');assert.equal(r.x,x);assert.equal(r.z,z);assert.equal(r.speed,0);
  assert.equal(r.engine.rpm,running?spec.idleRpm:0);
  assert.equal(r.fuel.get(spec.id)<fuel,running);
  assert.ok(f.mount(r,[]));for(let i=0;i<90;i++)f.step(1/60,r,0,0,[]);
  assert.equal(f.riding,true);assert.equal(r.engine.running,running);
 }
});

test('parked engine is centered when mounted, pans toward the bike and fades with distance',()=>{
 const sound=new Sound(),smooth=()=>({value:0,setTargetAtTime(v:number,t:number,tau:number){assert.ok(tau>0);this.value=v}});
 const pan=smooth(),gain=smooth();
 Object.assign(sound,{ctx:{currentTime:0},enginePan:{pan},engineVolume:{gain}});
 sound.positionEngine(12,0,0,1,0);assert.equal(pan.value,1);assert.ok(gain.value<1);
 sound.positionEngine(12,0,0,-1,0);assert.equal(pan.value,-1);
 sound.positionEngine(0,0,0,1,0);assert.equal(pan.value,0);assert.equal(gain.value,1);
 assert.ok(parkedEngineGain(40)<parkedEngineGain(12));
});

test('retail prices round once to cents and fuel keeps its tariff',()=>{
 assert.deepEqual([1000,500,250].map(retailPrice),[1180,590,295]);
 assert.deepEqual(prices,{box:743.4,paint:53.1,tyre:371.7});
 assert.equal(repairPrice(50),177.59);assert.equal(partPrice('pop','short'),330.4);assert.equal(GAS_PRICE,7);
});

test('Twister mixer changes idle gain independently from throttle, overrun and pitch',()=>{
 const s=new Sound();s.ready=true;s.vehicle='twister';s.volume=1;s.ctx={currentTime:0} as AudioContext;
 const param=()=>({value:0,setTargetAtTime(v:number){this.value=v}});
 const layers=['idle','load','coast'].map(mode=>({bank:'twister',idle:mode==='idle',idleSound:'twister-idle',load:mode==='load',gain:{gain:param()},source:{playbackRate:param()},filter:{frequency:param()}}));
 s.layers=layers as unknown as Sound['layers'];
 const sample=(speed:number,rpm:number,gas:number)=>s.update(speed,1,gas,false,0,{running:true,rpm});
 const close=(n:number,expected:number)=>assert.ok(Math.abs(n-expected)<1e-6);
 for(const gas of [0,.15,.5,1,0]){
  sample(0,1450,gas);
  if(!gas){close(layers[0].gain.gain.value,CG_AUDIO_TUNING.idleGain*1.55*.82);close(layers[0].source.playbackRate.value,1.06)}
 }
 sample(20,6000,1);close(layers[1].gain.gain.value,CG_AUDIO_TUNING.accelerationGain*1.55*1.12);
 sample(20,6000,0);close(layers[2].gain.gain.value,CG_AUDIO_TUNING.coastGain*1.55*1.12);
});

test('bounded rural dust responds to speed and wheel slip, culls distant emitters and leaves mud distinct',()=>{
 const wheel=new T.Object3D(),scene=new T.Scene();scene.add(wheel);
 const run=(surface:string,kmh:number,skid=false,far=0,slip=0)=>{
  const p=new TireParticles(scene,()=>.5);
  for(let i=0;i<1800;i++)p.update(surface,kmh/3.6,wheel,0,1/60,skid,slip,0,far);
  const result={count:p.count,size:p.points.geometry.getAttribute('particleSize').getX(0)};
  assert.ok(p.count<=TIRE_PARTICLE_CONFIG.capacity);p.dispose();return result;
 };
 const low=run('terra',20),medium=run('terra',60),high=run('terra',100);
 assert.ok(low.count>0&&medium.count>low.count&&high.count>medium.count);
 assert.ok(run('terra',20,true).count>low.count);assert.ok(run('terra',0,false,0,1).count>0);
 assert.equal(run('terra',0,true).count,0);
 assert.equal(run('terra',0).count,0);assert.equal(run('asfalto',60).count,0);
 assert.equal(run('terra',100,false,95).count,0);assert.ok(run('lama',60).size<medium.size);
});
