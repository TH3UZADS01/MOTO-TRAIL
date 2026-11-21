import {places} from '../src/map-layout';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {awardCub,buyVehicle,openCareer} from '../src/career';
import {ExplorationProgress} from '../src/exploration';
import {Fuel} from '../src/fuel';
import {Powertrain} from '../src/powertrain';
import {vehicles} from '../src/vehicles';

test('each calibrated power curve peaks at the requested RPM before its own cutoff',()=>{
 const expected={sahara:[7500,8500],cg150:[8000,9500],pop:[7250,8500],cub:[7500,8500],urban:[8000,9000],caloi:[5500,6500]};
 const engine=new Powertrain();
 for(const v of vehicles){
  assert.deepEqual([v.peakPowerRpm,v.redlineRpm],expected[v.id]);
  const peak=v.peakPowerRpm*engine.torqueAtRpm(v.peakPowerRpm,v);
  for(let rpm=v.idleRpm;rpm<=v.redlineRpm;rpm+=5)assert.ok(rpm*engine.torqueAtRpm(rpm,v)<=peak+1e-8,v.id);
 }
});
test('RPM and cargo each increase consumption at equal road speed and throttle',()=>{
 for(const v of vehicles){
  const spend=(rpm:number,load:number)=>{const f=new Fuel();f.consume(v.id,1000,50,.5,15,.02,false,rpm,load);return f.get(v.id)};
  assert.ok(spend(5000,12)<spend(5000,0));
  assert.ok(spend(5000,0)<spend(2500,0));
 }
});
test('legacy litres migrate, pump and wallet commit together, and exploration reward persists once',async t=>{
 const saved=new Map([['ride-fuel-v2',JSON.stringify({cg150:3,cub:4})]]);
 let failWrite=false;
 const storage={getItem:(k:string)=>saved.get(k)??null,removeItem:(k:string)=>saved.delete(k),setItem:(k:string,v:string)=>{if(failWrite)throw Error('quota');saved.set(k,v)}};
 for(const [key,value] of Object.entries({localStorage:storage,sessionStorage:storage,window:new EventTarget()})){
  const before=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{configurable:true,value});
  t.after(()=>{if(before)Object.defineProperty(globalThis,key,before);else Reflect.deleteProperty(globalThis,key)});
 }
 const store=openCareer(),f=new Fuel();f.bind(store);
 assert.equal(f.get('cg150'),3);assert.equal(f.get('cub'),3.7);
 store.changeNow(s=>{s.money=7.35});
 assert.equal(await f.buy('cg150',.5),.5);assert.equal(store.state.money,3.85);
 failWrite=true;await assert.rejects(f.buy('cg150',.5));failWrite=false;
 assert.equal(f.get('cg150'),3.5);assert.equal(store.state.money,3.85);
 assert.equal(await f.buy('cg150',10),.55);assert.equal(store.state.money,0);
 assert.equal(await f.buy('cg150',1),0);
 store.changeNow(s=>{s.money=100});await f.buy('cg150',20);
 assert.equal(f.get('cg150'),14);assert.equal(store.state.money,30.35);
 assert.equal(await f.buy('cg150',20),0);
 const progress=new ExplorationProgress(places,storage);
 assert.equal(places.length,15);
 for(const place of places.slice(0,-1))progress.discover(place.name);
 assert.ok(progress.isDiscovered('Camping do Lago'));
 assert.equal(progress.discoveredCount,14);
 assert.equal(new ExplorationProgress(places,storage).allPlacesDiscovered,false);
 progress.discover(places[14].name);
 assert.ok(new ExplorationProgress(places,storage).allPlacesDiscovered);
 store.changeNow(s=>{assert.throws(()=>buyVehicle(s,'cub'));assert.ok(awardCub(s));assert.equal(awardCub(s),false)});
 const restored=openCareer(),reloaded=new Fuel();reloaded.bind(restored);
 assert.equal(reloaded.get('cg150'),14);assert.equal(restored.state.money,30.35);
 assert.equal(restored.state.owned.filter(v=>v==='cub').length,1);
});
