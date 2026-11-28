import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Powertrain} from '../src/powertrain';
import {vehicles} from '../src/vehicles';
import {crankSeconds,failureChance,safeToStart,prepareStarter,STARTER} from '../src/starter';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Ride} from '../src/riding';
import {OnFoot} from '../src/on-foot';
import {Controller} from '../src/input';

test('original stereo WAV keeps its attack and joins at consecutive recorded samples',()=>{
 const file=readFileSync('public'+STARTER.audio);
 assert.equal(createHash('sha256').update(file).digest('hex'),'f68603a9154ea5b64953daa671b5460898d4690ec672e2217e8e519719738cd5');
 const start=file.indexOf('data')+8,length=file.readUInt32LE(start-4)/4;
 const channels=[0,1].map(c=>Float32Array.from({length},(_,i)=>file.readInt16LE(start+4*i+2*c)/32768));
 const original=channels.map(c=>c.slice());
 const sampleRate=file.readUInt32LE(24);
 const loop=prepareStarter({sampleRate,numberOfChannels:2,getChannelData:(c:number)=>channels[c]} as AudioBuffer);
 const first=Math.round(loop.start*sampleRate),last=Math.round(loop.end*sampleRate)-1;
 for(let c=0;c<2;c++){
  assert.deepEqual(channels[c].slice(0,first),original[c].slice(0,first));
  assert.equal(channels[c][last],original[c][first-1]);
 }
});

test('all engines crank without drive and reach their own idle across frame rates and wear levels',()=>{
 for(const spec of vehicles)for(const [health,seconds] of [[100,.5],[80,1.2],[60,2],[40,3.25],[20,14/3],[5,17/3]])for(const fps of [30,60,144]){
  const engine=new Powertrain();engine.stop();
  assert.ok(Math.abs(crankSeconds(health)-seconds)<1e-8);
  let frames=0;
  while(!engine.running&&frames<fps*7){
   assert.equal(engine.rpm,0);assert.equal(engine.wheelForce(spec,10,1),0);
   engine.starter(1/fps,true,spec,health,1,true,()=>.99);frames++;
  }
  assert.equal(engine.rpm,spec.idleRpm);assert.ok(Math.abs(frames/fps-seconds)<1/fps+1e-8);
 }
});

test('cancel, block, fail, retry after repair, hold without retrigger and switch off',()=>{
 const e=new Powertrain(),spec=vehicles[0];e.stop();
 const hold=(dt:number,h=100,fuel=1,safe=true)=>e.starter(dt,true,spec,h,fuel,safe,()=>0);
 const release=()=>e.starter(0,false,spec,100,1,true);
 hold(.2);release();assert.equal(e.ignition,'off');
 hold(6,0);assert.equal(e.ignition,'off');release();
 hold(1,100,0);assert.equal(e.ignition,'off');release();
 hold(1,100,1,false);assert.equal(e.ignition,'off');release();
 hold(6,5);assert.equal(e.ignition,'off');
 assert.ok(failureChance(5)>failureChance(20));assert.equal(failureChance(30),0);
 hold(1);assert.equal(e.ignition,'off');release();
 hold(.5);hold(1);assert.equal(e.running,true);
 release();hold(.01);assert.equal(e.rpm,0);assert.equal(e.ignition,'off');
});

test('coast with zero fuel consumption, recover after a fall, restore old and new saves',()=>{
 const r=new Ride(),foot=new OnFoot();
 for(const realistic of [false,true]){
  r.speed=12;r.engine.stop();const fuel=r.fuel.get(r.spec.id);
  r.step(1/60,1,0,0,[],false,0,true,realistic);
  assert.ok(r.speed>11&&r.speed<13);assert.equal(r.engineThrottle,0);
  assert.equal(r.engine.rpm,0);assert.equal(r.fuel.get(r.spec.id),fuel);
 }
 r.beginCrash('slide');r.liftHere();assert.equal(r.engine.ignition,'off');
 r.engine.starter(1,true,r.spec,100,1,true);assert.equal(r.engine.running,true);
 const save=foot.snapshot(r);foot.restore(r,{...save,engineRunning:false},[]);assert.equal(r.engine.rpm,0);
 const {engineRunning,...legacy}=save;foot.restore(r,legacy,[]);assert.equal(r.engine.rpm,r.spec.idleRpm);
});

test('transmission lockout and held gamepad input including alternate binding',()=>{
 for(const spec of vehicles){
  const manual=['sahara','cg150','twister','r1200gs'].includes(spec.id);
  assert.equal(safeToStart(spec.id,1,false,0),!manual);
  assert.ok(safeToStart(spec.id,0,false,0)&&safeToStart(spec.id,1,false,1)&&safeToStart(spec.id,1,true,0));
 }
 for(const posture of [8,10,11]){
  const button=posture===8?10:8,c=new Controller();
  const pad={id:'test',connected:true,mapping:'standard',axes:[],buttons:Array.from({length:17},(_,i)=>({pressed:i===button,value:Number(i===button)}))} as Gamepad;
  const poll=()=>c.poll(.1,1,[pad],posture);
  assert.equal(poll().starter,true);assert.equal(poll().posture,false);assert.equal(poll().drift,false);
  assert.equal(c.poll(.1,1,[],posture).starter,false);
 }
});
