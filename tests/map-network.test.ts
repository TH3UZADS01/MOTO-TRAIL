import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {routes,road,nearest,nearestRoute,surface,ground,height,bridges,deepWater,specials,dirtLength} from '../src/terrain';
import {riverX,waterY} from '../src/map-layout';
import {Ride,acceleration} from '../src/riding';
import {makeWorld,obstacles} from '../src/world';
const context={fillStyle:'',strokeStyle:'',lineWidth:0,font:'',textAlign:'',fillRect(){},strokeRect(){},fillText(){}};
(globalThis as any).document={createElement:()=>({width:0,height:0,getContext:()=>context})};
test('all branches connect to the network and intentional dead ends reach destinations',()=>{
 assert.equal(routes.filter(r=>r.surface==='terra').length,5);assert.ok(dirtLength>7000);
 for(const route of routes.slice(1))for(const end of [route.points[0],route.points.at(-1)!]){const distance=Math.min(...routes.filter(r=>r.id!==route.id).map(r=>nearest(end.x,end.z,r.points).distance));assert.ok(distance<.1||specials.some(p=>Math.hypot(end.x-p.x,end.z-p.z)<1),`${route.id} disconnected by ${distance}`)}
});
test('three bridges have dry decks, clear water underneath and continuous approaches',()=>{
 assert.equal(bridges.length,3);
 for(const b of bridges){for(let s=-b.halfLength-12;s<b.halfLength+12;s+=.5){const x=b.x+b.dx*s,z=b.z+b.dz*s,next=ground(x+b.dx*.5,z+b.dz*.5);assert.ok(Math.abs(next-ground(x,z))<.15,`bridge approach discontinuity ${b.track} at ${s}`);assert.equal(deepWater(x,z),false)}assert.ok(ground(b.x,b.z)-waterY(b.z)>6);assert.ok(height(b.x,b.z)<waterY(b.z));const z=b.z+200;assert.ok(deepWater(riverX(z),z))}
});
test('dirt has lower grip and longer braking; recovery keeps the rider on an interior trail',()=>{
 assert.ok(acceleration(15,0,1*.7,0,.7)>acceleration(15,0,1,0,1));const route=routes.find(r=>r.id==='ridge')!,p=route.points[180],r=new Ride();r.x=p.x;r.z=p.z;assert.equal(surface(r.x,r.z),'terra');r.recover();assert.equal(nearestRoute(r.x,r.z).track.id,'ridge');assert.ok(Math.hypot(r.x-p.x,r.z-p.z)<5);
});
test('every interior route is traversable with its actual scenery and surface physics',()=>{
 const world=makeWorld(new T.Scene());for(const route of routes.slice(1)){const r=new Ride(),start=route.points[0],next=route.points[1];r.x=start.x;r.z=start.z;r.heading=Math.atan2(next.x-start.x,next.z-start.z);r.contact();let best=0,maxError=0,stalled=0;
  for(let i=0;i<60*750;i++){world.update(r.x,r.z,i*1000/60);const n=nearest(r.x,r.z,route.points);best=Math.max(best,n.index);if(n.index>=route.points.length-5)break;const target=route.points[Math.min(n.index+3,route.points.length-1)],angle=Math.atan2(target.x-r.x,target.z-r.z),error=Math.atan2(Math.sin(angle-r.heading),Math.cos(angle-r.heading)),speed=route.surface==='terra'?6:9;r.step(1/60,r.speed<speed?1:.1,r.speed>speed+1?1:0,T.MathUtils.clamp(error*4,-1,1),obstacles);maxError=Math.max(maxError,n.distance);stalled=r.speed<.1?stalled+1:0;if(stalled>300)break}
  assert.ok(best>=route.points.length-6,`${route.id} stopped at ${best}/${route.points.length} x=${r.x} z=${r.z}, obstacles=${JSON.stringify(obstacles.filter(o=>Math.hypot(o.x-r.x,o.z-r.z)<10))}`);assert.ok(maxError<route.width/2,`${route.id} departure ${maxError}`);
 }
});

test('all scenery meshes have finite vertices, including dead-end access paths',()=>{const scene=new T.Scene();makeWorld(scene);scene.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.attributes.position;for(let i=0;i<p.array.length;i++)assert.ok(Number.isFinite(p.array[i]),`non-finite geometry in ${o.type}`)}})});
