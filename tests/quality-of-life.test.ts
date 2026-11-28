import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Navigation,roadPath} from '../src/navigation';
import {stations,villages,viewpoints,nearestRoute,routes} from '../src/terrain';
import {freightPay,offer,arrive,acceptJob,conditionFactor,type Career} from '../src/career';
import {nextDirt} from '../src/bike-dirt';
import {Ride} from '../src/riding';
import {accumulateWear} from '../src/mechanical-wear';
import {createBike,disposeBike} from '../src/vehicle-models';
import {vehicles} from '../src/vehicles';

test('road routes cross junctions and regions, trim travelled chunks and recalculate after a detour',()=>{
 const home=villages[0],far=viewpoints[4],gps=new Navigation();
 const short=roadPath(home,stations[0])!,long=roadPath(home,far)!;
 assert.ok(short.metres<500&&long.metres>30000);
 for(let i=1;i<long.points.length-1;i+=50){
  const p=long.points[i];assert.ok(nearestRoute(p.x,p.z,12).distance<1);
 }
 gps.mark(far);gps.update(home);const initial=gps.remaining,original=gps.path;
 for(let i=10;i<200;i+=10)gps.update(long.points[i]);
 assert.equal(gps.path,original);assert.ok(gps.index>100&&gps.remaining<initial);
 const bypass=routes.find(t=>t.id==='atalho-pasto')!;
 gps.update(bypass.points[900]);assert.notEqual(gps.path,original);assert.ok(gps.path);
 assert.equal(roadPath(home,{x:70000,z:70000}),null);
 gps.cancel();gps.update(home,far,'delivery');assert.equal(gps.goal,far);
 gps.cancel();gps.update(home,far,'delivery');assert.equal(gps.goal,null);
 gps.mark(stations[1]);gps.update(home,null);assert.equal(gps.goal,stations[1]);
});

test('distance premium grows smoothly and accepted pay survives detours and repeat arrivals',()=>{
 const samples=[2,8,25,50].map(km=>freightPay(km,2,false));
 assert.ok(samples.every((p,i)=>i===0||p>samples[i-1]));
 assert.ok((samples[3]-samples[2])/25>(samples[1]-samples[0])/6);
 const job=offer('Peça',villages[0],viewpoints[4],1,'pop'),pay=job.pay;
 const state:Career={money:0,garage:{},owned:['pop'],pet:true,job:null,cooldowns:[]};
 acceptJob(state,job);assert.equal(arrive(state,job.id,villages[3]),'');assert.equal(state.job?.pay,pay);
 arrive(state,job.id,job.to);arrive(state,job.id,job.to);assert.equal(state.money,pay);
});

test('80 km of touring versus severe use and a stopped engine',()=>{
 function journey(harsh:boolean){
  const r=new Ride(),w={motor:0,freios:0,pneus:0,fork:0,km:0};
  r.engine.rpm=r.spec.redlineRpm*(harsh?.98:.55);r.speed=harsh?24:17;
  r.brakeInput=harsh?.8:0;r.drift.active=harsh;r.suspension.front.compression=harsh?.07:.01;
  for(let i=0;i<800;i++)accumulateWear(w,r,100,harsh?'terra':'asfalto',harsh?.95:.4,100/r.speed);
  return w;
 }
 const calm=journey(false),hard=journey(true);
 assert.ok(calm.motor<12&&calm.fork<8&&calm.pneus<18&&calm.freios===0);
 for(const part of ['motor','pneus','fork','freios'] as const)assert.ok(hard[part]>calm[part]*2);
 const parked=new Ride(),w={motor:0,freios:0,pneus:0,fork:0,km:0};parked.engine.stalled=true;
 accumulateWear(w,parked,0,'lama',0,300);assert.equal(w.motor,0);
 assert.ok(conditionFactor('freios',10)<conditionFactor('freios',70));
 assert.ok(nextDirt(0,'asfalto',1000,0)<.01);
 assert.ok(nextDirt(0,'asfalto',1000,0)<nextDirt(0,'terra',1000,0));
 assert.ok(nextDirt(0,'terra',1000,0)<nextDirt(0,'lama',1000,0));
});

test('accessories clear rider and one another on every chassis while banking',()=>{
 for(const spec of vehicles){
  const b=createBike(spec.id);
  try{
   b.pet.setUnlocked(true);b.cargo.visible=true;
   for(const lean of [0,.35,-.35]){
    b.body.rotation.z=lean;b.riderRig.update(lean?18:0,.3,.016,false,0,.6);
    b.pet.update(lean,.3,.016);b.root.updateMatrixWorld(true);
    const dog=new T.Box3().setFromObject(b.pet.group,true);
    const rider=new T.Box3().setFromObject(b.rider,true);
    const caseShell=new T.Box3().setFromObject(b.cargo.children.at(-1)!,true);
    assert.ok(dog.max.z<rider.min.z,spec.id+' pilot');
    assert.ok(dog.min.z>caseShell.max.z,spec.id+' case');
    b.cargo.visible=false;assert.ok(b.pet.group.visible);b.cargo.visible=true;
   }
  }finally{disposeBike(b)}
 }
});

test('Twister running loops gain 12% while idle, pitch and the CG mix keep their calibration',async()=>{
 const {Sound,CG_AUDIO_TUNING:tuning}=await import('../src/audio');
 const param=()=>({value:0,setTargetAtTime(v:number){this.value=v}});
 for(const bank of ['twister','cg150'] as const){
  const sound=new Sound();sound.ready=true;sound.ctx={currentTime:0} as AudioContext;
  sound.volume=1;sound.vehicle=bank;
  const layers=['idle','on','off'].map(mode=>({bank,idle:mode==='idle',idleSound:bank+'-idle',load:mode==='on',
   source:{playbackRate:param()},filter:{frequency:param()},gain:{gain:param()}}));
  sound.layers=layers as unknown as typeof sound.layers;
  sound.update(0,1,0,false,0,{ratio:0});const [idle,on,off]=layers;
  assert.equal(idle.gain.gain.value,tuning.idleGain*(bank==='twister'?1.55:1));
  const gain=bank==='twister'?1.55*1.12:1;
  sound.update(15,2,1,false,0,{ratio:1});assert.ok(Math.abs(on.gain.gain.value-tuning.accelerationGain*gain)<1e-6);
  sound.update(15,2,0,false,0,{ratio:1});assert.ok(Math.abs(off.gain.gain.value-tuning.coastGain*gain)<1e-6);
  assert.equal(off.source.playbackRate.value,tuning.maxRate*(bank==='twister'?1.06:1));
 }
});
