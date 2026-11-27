import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Drift} from '../src/drift';
import {Ride} from '../src/riding';
import {TireParticles} from '../src/tire-particles';
import {Controller} from '../src/input';
import {surfaces,type ContactSurface} from '../src/traction';
import {getVehicle} from '../src/vehicles';

test('locked rear steps out in a turn and recovers smoothly on release at different frame rates',()=>{
 for(const surface of Object.keys(surfaces) as ContactSurface[]){
  const peaks=[];
  for(const fps of [30,60,120]){
   const d=new Drift(),step=(held:boolean,steer:number)=>d.update(1/fps,held,12,steer,surface,surfaces[surface].lat,1);
   step(true,0);assert.ok(d.active);assert.equal(d.slip,0);
   for(let i=0;i<fps;i++)step(true,.8);
   const peak=d.slip;peaks.push(peak);assert.ok(peak>.06&&d.active);
   step(false,.8);assert.ok(!d.active&&d.slip>0&&d.slip<peak);
   for(let i=0;i<fps;i++)step(false,.8);
   assert.ok(d.slip<.002);
  }
  assert.ok(Math.max(...peaks)-Math.min(...peaks)<1e-6);
 }
});
test('held rear brake slows the bike under power and releases on the next physics step',()=>{
 for(const mode of ['arcade','simcade'] as const){
  const r=new Ride();r.setHandlingMode(mode);r.speed=10;r.gear=2;r.contact=()=>{r.pitch=0};
  const step=(held:boolean,turn=0)=>r.step(1/60,1,0,turn,[],false,0,true,true,false,0,held);
  const initial=r.speed;
  for(let i=0;i<45;i++)step(true,.45);
  assert.ok(r.drift.active&&r.brakeInput===1&&r.speed<initial&&r.drift.slip>.01);
  const slowed=r.speed;
  for(let i=0;i<30;i++){step(false);assert.ok(!r.drift.active&&r.brakeInput===0)}
  assert.ok(r.speed>slowed);
  r.speed=0;
  for(let i=0;i<30;i++){step(true);assert.equal(r.speed,0);assert.equal(r.burnoutSpeed,0)}
 }
});
test('drift uses the free stick click while held for every posture binding',()=>{
 for(const posture of [8,10,11]){
  const c=new Controller(),buttons=Array.from({length:17},()=>({pressed:false,value:0}));
  const pad={id:'test',mapping:'standard',connected:true,axes:[],buttons} as unknown as Gamepad;
  buttons[posture===11?10:11].pressed=true;
  const input=c.poll(.1,1,[pad],posture);assert.ok(input.drift&&!input.posture);
  assert.equal(c.poll(.1,1,[pad],posture).drift,true);
  buttons[posture===11?10:11].pressed=false;assert.equal(c.poll(.1,1,[pad],posture).drift,false);
  buttons[posture].pressed=true;assert.equal(c.poll(.1,1,[pad],posture).posture,true);
 }
});
test('the service brake slows the bike without initiating drift',()=>{
 const r=new Ride();r.speed=18;
 for(let i=0;i<90;i++)r.step(1/60,0,1,.5,[]);
 assert.ok(r.speed<18);assert.equal(r.drift.slip,0);
 for(let i=0;i<180;i++)r.step(1/60,0,1,0,[]);
 assert.equal(r.speed,0);assert.equal(r.pushing,false);
});
test('front shimmy is bounded on dirt and gravel across the speed range',()=>{
 const r=new Ride();
 function peak(kmh:number,surface:ContactSurface){
  r.instability.reset();let peak=0;
  for(let i=0;i<240;i++){
   r.instability.step(1/60,getVehicle('twister'),kmh/3.6,r.suspension,r.frontContact,r.equipment,0,0,0,0,0,false,1,surface);
   peak=Math.max(peak,Math.abs(r.instability.shimmy));assert.equal(r.instability.physicalAngle,0);
  }
  return peak;
 }
 const [slow,onset,mid,fast,limit]=[10,25,40,60,80].map(v=>peak(v,'terra'));
 assert.equal(slow,0);assert.ok(onset>0&&onset<.001&&mid>.004&&fast>mid&&limit<=.032);
 assert.ok(peak(60,'cascalho')<fast);
 for(const surface of ['asfalto','areia','lama','grama'] as const)assert.equal(peak(80,surface),0);
});
test('locked rear emits bounded white smoke on asphalt and lets it fade after release',()=>{
 const scene=new T.Scene(),wheel=new T.Object3D();wheel.position.y=.3;scene.add(wheel);const p=new TireParticles(scene,()=>.5);
 p.update('asfalto',15,wheel,0,.1,true);assert.ok(p.count>0&&p.count<=96);
 const colors=p.points.geometry.getAttribute('particleColor');assert.ok(colors.getX(0)>.7);assert.equal(colors.getX(0),colors.getY(0));assert.equal(colors.getX(0),colors.getZ(0));
 p.update('asfalto',15,wheel,0,.1,false);assert.ok(p.count>0);
 for(let i=0;i<30;i++)p.update('asfalto',0,wheel,0,.1,false);
 assert.equal(p.count,0);p.dispose();
});

