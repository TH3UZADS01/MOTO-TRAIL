import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Ride,acceleration,steeringAngle,TOP_SPEED} from '../src/riding';
import {road,height,ground,nearest,terrain,BRIDGE,bridgeY,LOOKOUT,terrainPatch} from '../src/terrain';
import * as T from 'three';
test('closed continuous road has plausible gradients',()=>{assert.ok(road[0].distanceTo(road.at(-1)!)<.001);let max=0;for(let i=1;i<road.length;i++){const a=road[i-1],b=road[i];max=Math.max(max,Math.abs(b.y-a.y)/Math.hypot(b.x-a.x,b.z-a.z))}assert.ok(max<.3,`grade ${max}`)});
test('rendered terrain and collision height agree',()=>{const mesh=terrain();mesh.updateMatrixWorld();const ray=new T.Raycaster();for(let i=0;i<25;i++){const x=-300+i*23.13,z=100*Math.sin(i);ray.set(new T.Vector3(x,300,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(mesh);assert.ok(hit.length);assert.ok(Math.abs(hit[0].point.y-height(x,z))<.0001)}mesh.geometry.dispose()});
test('brakes stop, obstacles block, recovery is on road',()=>{const r=new Ride();for(let i=0;i<180;i++)r.step(1/60,1,0,0,[]);assert.ok(r.speed>1);for(let i=0;i<180;i++)r.step(1/60,0,1,0,[]);assert.equal(r.speed,0);r.x=100;r.z=100;r.recover();assert.ok(nearest(r.x,r.z).distance<.01);assert.ok(Math.abs(r.y-ground(r.x,r.z))<.02);const x=r.x,z=r.z;r.step(1/60,1,0,0,[{x:x+Math.sin(r.heading)*.4,z:z+Math.cos(r.heading)*.4,r:2}]);assert.equal(r.x,x);assert.equal(r.z,z)});
test('full circuit with feedback steering remains driveable',()=>{const r=new Ride();r.x=road[0].x;r.z=road[0].z;r.recover();let maxError=0;for(let i=0;i<18000&&r.distance<2200;i++){const n=nearest(r.x,r.z),p=road[(n.index+7)%(road.length-1)];const target=Math.atan2(p.x-r.x,p.z-r.z);const error=Math.atan2(Math.sin(target-r.heading),Math.cos(target-r.heading));r.step(1/60,r.speed<10?1:.1,r.speed>12?1:0,Math.max(-1,Math.min(1,error*3)),[]);maxError=Math.max(maxError,n.distance);assert.ok(Number.isFinite(r.y));}assert.ok(r.distance>2100);assert.ok(maxError<4,`road deviation ${maxError}`)});


test('80 km/h attainable on level asphalt and braking remains effective',()=>{let speed=0;for(let i=0;i<60*90;i++)speed=Math.max(0,Math.min(TOP_SPEED,speed+acceleration(speed,1,0,0,1)/60));assert.ok(speed*3.6>=79.9);for(let i=0;i<60*4;i++)speed=Math.max(0,speed+acceleration(speed,0,1,0,1)/60);assert.equal(speed,0)});
test('turn radius grows progressively with speed',()=>{const radius=(v:number)=>1.238/Math.tan(steeringAngle(v,1));assert.ok(radius(2)<3);assert.ok(radius(10)>radius(2)*3);assert.ok(radius(22)>radius(10)*3);assert.equal(steeringAngle(4,-1),-steeringAngle(4,1));});
test('bridge deck clears the stream and joins both approaches',()=>{assert.ok(bridgeY-height(0,BRIDGE.z)>3);for(let x=-16;x<=16;x+=.5)assert.ok(Math.abs(ground(x,BRIDGE.z)-bridgeY-.055)<.0001);for(const side of [-1,1])assert.ok(Math.abs(ground(side*16.01,BRIDGE.z)-ground(side*15.99,BRIDGE.z))<.02);});
test('mirante patch follows ground triangles without floating',()=>{const m=terrainPatch(LOOKOUT.x,LOOKOUT.z,LOOKOUT.radius,0xffffff),p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i)-height(p.getX(i),p.getZ(i))-.055)<.00001);m.geometry.dispose()});

