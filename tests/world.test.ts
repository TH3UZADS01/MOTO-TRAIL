import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeWorld,obstacles} from '../src/world';
import {Ride} from '../src/riding';
import {road,nearest,stations} from '../src/terrain';
// Canvas drawing is irrelevant to the geometry/collision test; no browser is emulated.
const context={fillStyle:'',strokeStyle:'',lineWidth:0,font:'',textAlign:'',fillRect(){},strokeRect(){},fillText(){}};
(globalThis as any).document={createElement:()=>({width:0,height:0,getContext:()=>context})};
test('expanded circuit can be completed with actual world obstacles',()=>{
 const scene=new T.Scene();const world=makeWorld(scene);const r=new Ride();r.x=road[0].x;r.z=road[0].z;r.recover();
 const length=road.slice(1).reduce((sum,p,i)=>sum+p.distanceTo(road[i]),0);
 assert.ok(length>20000);let maxDeviation=0;
 for(let i=0;i<60*2200&&r.distance<length+50;i++){
  world.update(r.x,r.z,i*1000/60);
  const n=nearest(r.x,r.z),p=road[(n.index+4)%(road.length-1)],target=Math.atan2(p.x-r.x,p.z-r.z),error=Math.atan2(Math.sin(target-r.heading),Math.cos(target-r.heading));
  r.step(1/60,r.speed<10?1:.1,r.speed>12?1:0,Math.max(-1,Math.min(1,error*3)),obstacles);maxDeviation=Math.max(maxDeviation,n.distance);
 }
 assert.ok(r.distance>length,`stopped after ${r.distance.toFixed(1)} m of ${length.toFixed(1)} m at ${r.x},${r.z}; nearby ${JSON.stringify(obstacles.filter(o=>Math.hypot(o.x-r.x,o.z-r.z)<10))}`);assert.ok(maxDeviation<4,`maximum road deviation ${maxDeviation}`);
 world.update(-310,0,0);const order=(a:any,b:any)=>a.x-b.x||a.z-b.z;const first=obstacles.map(o=>({...o})).sort(order);const second=makeWorld(new T.Scene());second.update(-310,0,0);assert.deepEqual([...obstacles].sort(order),first,'seeded world must be reproducible without duplicated obstacles');
});

test('station approaches have a collision-free stopping point within refueling reach',()=>{
 const world=makeWorld(new T.Scene());for(const s of stations){world.update(s.x,s.z,0);const n=nearest(s.x,s.z),d=Math.hypot(n.x-s.x,n.z-s.z),target={x:s.x+(n.x-s.x)/d*8,z:s.z+(n.z-s.z)/d*8};assert.ok(Math.hypot(target.x-s.x,target.z-s.z)<12);for(let i=0;i<=40;i++){const x=n.x+(target.x-n.x)*i/40,z=n.z+(target.z-n.z)*i/40;assert.ok(!obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.4),s.name+' has a blocked driveway: '+JSON.stringify(obstacles.filter(o=>Math.hypot(x-o.x,z-o.z)<o.r+.4)))}}
});
