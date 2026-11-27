import * as T from 'three';
import {writeFileSync,mkdirSync} from 'node:fs';
import {routes,road,deepWater,cliffAt,ground,contactSurface} from '../src/terrain';
import {makeWorld,obstacles} from '../src/world';
import {blocked} from '../src/obstacle';
import assert from 'node:assert/strict';
import {Ride} from '../src/riding';
import {OnFoot} from '../src/on-foot';
import {tripById} from '../src/adventures';
import {viewpoints,stations} from '../src/map-layout';

const context={fillRect(){},strokeRect(){},fillText(){}};
Object.assign(globalThis,{document:{createElement:()=>({getContext:()=>context})}});
const scene=new T.Scene(),start=performance.now(),world=makeWorld(scene),initMs=performance.now()-start,first=performance.now();
world.update(road[0].x,road[0].z,0);
const original={initMs,firstMs:performance.now()-first,rootObjects:scene.children.length,activeColliders:obstacles.length};
const results=[];
for(const track of routes.slice(-5)){
 let length=0,maxGrade=0,wet=0,cliffs=0,peakChunks=0,maxColliders=0;
 const times:number[]=[],issues:{index:number;x:number;z:number}[]=[];
 for(let i=0;i<track.points.length-1;i++){
  const p=track.points[i],q=track.points[i+1],kmh=track.surface==='terra'?45:i%2000<1000?100:150;
  const d=q.distanceTo(p),heading=Math.atan2(q.x-p.x,q.z-p.z);
  const now=performance.now();world.update(p.x,p.z,length/(kmh/3.6)*1000,kmh/3.6,heading);
  times.push(performance.now()-now);length+=d;maxGrade=Math.max(maxGrade,Math.abs(q.y-p.y)/Math.hypot(q.x-p.x,q.z-p.z));
  wet+=Number(deepWater(p.x,p.z));cliffs+=Number(cliffAt(p.x,p.z));peakChunks=Math.max(peakChunks,world.chunkCount);maxColliders=Math.max(maxColliders,obstacles.length);
  if(obstacles.some(o=>blocked(o,p.x,p.z,.35)))issues.push({index:i,x:p.x,z:p.z});
  if(!Number.isFinite(ground(p.x,p.z))||!contactSurface(p.x,p.z))throw Error(track.id);
 }
 times.sort((a,b)=>a-b);
 const result={id:track.id,length,maxGrade,wet,cliffs,obstructed:issues.length,firstObstructions:issues.slice(0,4),peakChunks,maxColliders,medianUpdateMs:times[Math.floor(times.length*.5)],p99UpdateMs:times[Math.floor(times.length*.99)],peakUpdateMs:times.at(-1)};
 results.push(result);console.log(JSON.stringify(result));
}
world.update(road[0].x,road[0].z,0);
mkdirSync('artifacts/horizontes',{recursive:true});writeFileSync('artifacts/horizontes/percurso.json',JSON.stringify({original,results,returnColliders:obstacles.length,heapMiB:process.memoryUsage().heapUsed/1048576},null,2));
assert.equal(tripById('travessia',{id:'travessia',next:1,paused:false})?.stops[1],viewpoints[0]);
assert.equal(tripById('travessia',{id:'travessia',next:1,paused:false,expanded:true})?.stops[1],stations[5]);
for(const track of routes.slice(-5)){
 const i=Math.floor(track.points.length/2),p=track.points[i],q=track.points[i+1];
 const rider=new Ride(),walker=new OnFoot();
 rider.x=p.x;rider.z=p.z;rider.heading=Math.atan2(q.x-p.x,q.z-p.z);rider.contact();
 world.update(p.x,p.z,0);
 const step=(frames:number,forward:number)=>{for(let frame=0;frame<frames;frame++)walker.step(1/60,rider,forward,0,obstacles)};
 assert.ok(walker.mount(rider,obstacles),track.id);step(90,0);
 const startX=walker.x,startZ=walker.z;step(10,1);
 assert.ok(Math.hypot(walker.x-startX,walker.z-startZ)>.1,track.id);
 assert.ok(walker.push(rider,obstacles),track.id);step(150,1);
 assert.ok(Math.hypot(rider.x-p.x,rider.z-p.z)>.25,track.id);
 assert.ok(walker.push(rider,obstacles)&&walker.mount(rider,obstacles),track.id);step(90,0);
 assert.ok(walker.riding,track.id);
}
if(results.some(r=>r.obstructed||r.wet||r.cliffs||r.maxGrade>.17))process.exitCode=1;
