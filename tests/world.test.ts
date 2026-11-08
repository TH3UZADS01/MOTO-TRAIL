import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeWorld,obstacles} from '../src/world';
import {Ride} from '../src/riding';
import {road,nearest} from '../src/terrain';
// Canvas drawing is irrelevant to the geometry/collision test; no browser is emulated.
const context={fillStyle:'',strokeStyle:'',lineWidth:0,font:'',textAlign:'',fillRect(){},strokeRect(){},fillText(){}};
(globalThis as any).document={createElement:()=>({width:0,height:0,getContext:()=>context})};
test('expanded circuit can be completed with actual world obstacles',()=>{
 const scene=new T.Scene();makeWorld(scene);const r=new Ride();r.x=road[0].x;r.z=road[0].z;r.recover();
 const length=road.slice(1).reduce((sum,p,i)=>sum+p.distanceTo(road[i]),0);
 assert.ok(length>1750);let maxDeviation=0;
 for(let i=0;i<60*300&&r.distance<length+50;i++){
  const n=nearest(r.x,r.z),p=road[(n.index+7)%(road.length-1)],target=Math.atan2(p.x-r.x,p.z-r.z),error=Math.atan2(Math.sin(target-r.heading),Math.cos(target-r.heading));
  r.step(1/60,r.speed<10?1:.1,r.speed>12?1:0,Math.max(-1,Math.min(1,error*3)),obstacles);maxDeviation=Math.max(maxDeviation,n.distance);
 }
 assert.ok(r.distance>length,`stopped after ${r.distance.toFixed(1)} m of ${length.toFixed(1)} m`);assert.ok(maxDeviation<4);
 const first=obstacles.map(o=>({...o}));makeWorld(new T.Scene());assert.deepEqual(obstacles,first,'seeded world must be reproducible without duplicated obstacles');
});
