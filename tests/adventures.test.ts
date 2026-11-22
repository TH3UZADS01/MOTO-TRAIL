import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {acceptJob,cancelJob,arrive,buyVehicle,carriedKg,equipment,factory,offer,weightLimit,type Career} from '../src/career';
import {installPart,buyUsed,renewMarket,usedPrice,startTrip,pauseTrip,visitStop,trips,destination} from '../src/adventures';
import {Ride} from '../src/riding';
import {getVehicle,vehicles} from '../src/vehicles';
import {RoadEvents} from '../src/road-events';
import {adventure} from '../src/adventure-tuning';
import {deepWater,nearestRoute,road} from '../src/terrain';

const fresh=():Career=>({money:3000,owned:['pop','sahara'],garage:{},pet:true,job:null,cooldowns:[]});
const saved=(s:Career):Career=>JSON.parse(JSON.stringify(s));

test('legacy deliveries reconstruct one load only; pickup, completion and cancellation release it',()=>{
 const s=fresh(),a=trips[0].stops[0],b=trips[0].stops[1];
 s.job=offer('Peças',a,b,2,'pop',true);delete s.job.kg;
 assert.equal(carriedKg(s.job,'pop'),0);arrive(s,s.job.id,b);
 assert.equal(carriedKg(saved(s).job,'pop'),2);assert.equal(carriedKg(s.job,'sahara'),0);
 arrive(s,s.job.id,a);assert.equal(carriedKg(s.job,'pop'),0);
 const box=offer('Caixa',a,b,8,'pop');assert.throws(()=>acceptJob(s,box));
 equipment(s,'pop').box=true;acceptJob(s,box);assert.equal(carriedKg(s.job,'pop'),8);assert.throws(()=>acceptJob(s,box));
 cancelJob(s,box.id);assert.equal(carriedKg(s.job,'pop'),0);
 assert.equal(weightLimit(factory()),2);assert.equal(weightLimit({...factory(),box:true}),12);
});

function physics(id:'pop'|'sahara',kg:number,slope:number,gas:number,brake:number,part?:'short'|'long'|'improved'|'trail'|'road',realistic=true){
 const r=new Ride(),s=fresh();r.spec=getVehicle(id);r.cargoLoad=kg;
 if(part)installPart(s,id,part==='improved'?'brakes':part==='short'||part==='long'?'gearing':'suspension',part);
 r.equipment=equipment(s,id);r.x=-310;r.z=0;r.heading=0;r.speed=4;r.contact=()=>{r.pitch=slope};
 r.step(1/60,gas,brake,.5,[],false,0,false,realistic);
 return r;
}
test('cargo affects acceleration, climbing, braking and steering without changing redline',()=>{
 for(const realistic of [true,false])for(const slope of [0,.12]){
  const delta=(id:'pop'|'sahara')=>physics(id,0,slope,1,0,undefined,realistic).speed-physics(id,12,slope,1,0,undefined,realistic).speed;
  assert.ok(delta('pop')>0);assert.ok(delta('sahara')>0);
  const brake=physics('pop',0,slope,0,1,undefined,realistic),loaded=physics('pop',12,slope,0,1,undefined,realistic);
  assert.ok(loaded.speed>brake.speed);assert.ok(loaded.steer<brake.steer);assert.equal(loaded.topSpeed,brake.topSpeed);
 }
 const relative=(id:'sahara'|'pop')=>(physics(id,0,0,1,0).speed-physics(id,12,0,1,0).speed)/(physics(id,0,0,1,0).speed-4);
 assert.ok(relative('pop')>relative('sahara'));
});
test('workshop changes final ratio, keeps motor curve, changes suspension response and braking',()=>{
 const stock=physics('pop',0,0,1,0),short=physics('pop',0,0,1,0,'short'),long=physics('pop',0,0,1,0,'long');
 assert.ok(short.speed>stock.speed&&long.speed<stock.speed);assert.ok(short.topSpeed<stock.topSpeed&&long.topSpeed>stock.topSpeed);
 assert.ok(short.engine.wheelRpmFromSpeed(10,short.spec)>long.engine.wheelRpmFromSpeed(10,long.spec));
 assert.equal(long.engine.torqueAtRpm(6000,long.spec),stock.engine.torqueAtRpm(6000,stock.spec));
 assert.ok(physics('pop',0,0,0,1,'improved').speed<physics('pop',0,0,0,1).speed);
 assert.ok(physics('pop',0,0,1,0,'road').steer>physics('pop',0,0,1,0,'trail').steer);
 const s=fresh();installPart(s,'pop','gearing','short');const balance=s.money;
 installPart(s,'pop','gearing','original');installPart(s,'pop','gearing','short');assert.equal(s.money,balance);
 assert.equal(equipment(saved(s),'pop').prep!.gearing,'short');assert.equal(equipment(s,'sahara').prep,undefined);
 assert.throws(()=>installPart(s,'pop','gearing','trail'));assert.equal(s.money,balance);
});
test('used listings expire on schedule, survive reload and transfer exact condition for one payment',()=>{
 const s=fresh();renewMarket(s,100);const m=s.market!,l=m.list[0];renewMarket(s,120);
 assert.equal(s.market,m);assert.ok(!m.list.some(l=>l.vehicle==='pop'));
 s.money=30000;const old=s.money;s.money=0;assert.throws(()=>buyUsed(s,l.id,101));s.money=old;
 buyUsed(s,l.id,101);const restored=saved(s),g=equipment(restored,l.vehicle);
 assert.equal(g.km,l.km);assert.equal(g.color,l.color);
 for(const k of ['motor','freios','pneus'] as const)assert.equal(g[k],l[k]);
 assert.ok(restored.owned.includes(l.vehicle));assert.equal(restored.money,old-l.price);
 assert.throws(()=>buyUsed(restored,l.id,101));assert.throws(()=>buyVehicle(restored,l.vehicle));
 assert.ok(!restored.market!.list.some(item=>item.id===l.id));
 renewMarket(restored,m.until);assert.ok(restored.market!.until>m.until);
 assert.ok(usedPrice(l.vehicle,2000,90)>usedPrice(l.vehicle,45000,48));
});
test('itineraries use reachable map sites, advance in order, resume and pay once',()=>{
 for(const t of trips){
  let s=fresh();startTrip(s,t.id);assert.throws(()=>startTrip(s,t.id));
  assert.equal(visitStop(s,t.id,1,t.stops[1]),'');assert.equal(visitStop(s,t.id,0,t.stops[1]),'');
  for(const [i,p] of t.stops.entries()){
   assert.ok(!deepWater(p.x,p.z)&&nearestRoute(p.x,p.z).distance<200,p.name);
   pauseTrip(s,t.id,true);assert.equal(destination(s),undefined);assert.equal(visitStop(s,t.id,i,p),'');
   s=saved(s);pauseTrip(s,t.id,false);assert.deepEqual(destination(s),p);assert.ok(visitStop(s,t.id,i,p));
   assert.equal(visitStop(s,t.id,i,p),'');
  }
  assert.equal(s.money,3000+t.pay);assert.throws(()=>startTrip(saved(s),t.id));
 }
});
test('events are bounded and pooled, avoid the rider and objective, collide and expire',()=>{
 const scene=new T.Scene(),events=new RoadEvents(scene);let count=0;
 let clock=0,lastSpawn=0;
 for(let i=0;i<1200;i++){
  const p=road[(i*12)%road.length],previous=new Set(events.active);
  clock+=15;events.update(15,p,0,[],[]);
  assert.ok(events.active.length<=adventure.events.max);
  for(const e of events.active)if(!previous.has(e)){
   count++;assert.ok(clock-lastSpawn>=adventure.events.interval);lastSpawn=clock;assert.ok(e.group.position.distanceTo(p)>=150);
   const n=nearestRoute(e.group.position.x,e.group.position.z);
   assert.equal(n.track.id,'main');assert.ok(n.distance<.01);
   for(let x=-n.track.width/2;x<=n.track.width/2;x+=.1){
    const dx=Math.cos(e.group.rotation.y)*x,dz=-Math.sin(e.group.rotation.y)*x;
    const row=e.kind==='log'?0:1.8;
    assert.ok(e.hits.some(h=>Math.hypot(h.x-e.group.position.x-dx-row*Math.sin(e.group.rotation.y),h.z-e.group.position.z-dz-row*Math.cos(e.group.rotation.y))<=h.r));
   }
   if(e.hits.length){
    const r=new Ride(),o=e.hits[0];r.x=o.x;r.z=o.z-o.r-.36;r.heading=0;r.speed=5;r.eventObstacles=events.hits;
    r.step(1/60,0,0,0,[]);assert.equal(r.speed,0);
   }
  }
 }
 assert.ok(count>3);
 const p=road[0],expired=[...events.active];events.update(1000,p,0,[],[p]);
 for(const e of expired)assert.ok(!events.active.includes(e));
 events.clear();
 const notice={kind:'log' as const,x:p.x+10,z:p.z,angle:0,region:'test'};
 events.sync([notice],p,notice);assert.equal(events.hits.length,0);
 events.sync([notice],p);const group=events.active[0].group;
 for(let cycle=0;cycle<500;cycle++){
  events.sync([],p);assert.equal(events.hits.length,0);
  events.sync([notice],p);assert.equal(events.active[0].group,group);assert.equal(scene.children.length,1);
 }
 events.dispose();
 assert.equal(scene.children.length,0);assert.equal(events.hits.length,0);
});

test('Comando adds 17% wheel torque on every bike and survives refitting and reload',()=>{
 for(const {id} of vehicles){
  const s=fresh();s.owned=[id];
  installPart(s,id,'gearing','original'); // Existing workshop save without an engine slot.
  delete equipment(s,id).prep!.engine;
  for(const realistic of [false,true]){
   const run=(state:Career)=>{
    const ride=new Ride();ride.spec=getVehicle(id);ride.equipment=equipment(state,id);
    ride.speed=3;ride.step(1/60,1,0,0,[],false,0,false,realistic);return ride;
   };
   const stock=run(s);
   installPart(s,id,'engine','cam');const paid=s.money;
   const tuned=run(saved(s));
   assert.ok(stock.wheelieDebug.wheelTorque>0);
   assert.ok(Math.abs(tuned.wheelieDebug.wheelTorque/stock.wheelieDebug.wheelTorque-1.17)<1e-9);
   assert.ok(tuned.speed>stock.speed);
   installPart(s,id,'engine','original');installPart(s,id,'engine','cam');
   assert.equal(s.money,paid);installPart(s,id,'engine','original');
  }
 }
});
