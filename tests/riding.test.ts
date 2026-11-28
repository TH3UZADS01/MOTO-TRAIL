import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Ride,acceleration,steeringAngle,TOP_SPEED} from '../src/riding';
test('wind starts at zero and grows progressively below the former drag curve',()=>{
 let previous=0;
 for(const speed of [0,5,10,20,30,40]){
  const coefficient=.004;
  const wind=acceleration(speed,0,0,0,1,0,40)-acceleration(speed,0,0,0,1,coefficient,40);
  if(!speed){assert.equal(wind,0);continue}
  assert.ok(wind>previous&&wind<coefficient*speed**2);
  const ratio=Math.min(1,speed/34);
  const previousWind=coefficient*speed**2*(.16+.54*ratio**2*(3-2*ratio));
  assert.ok(Math.abs(wind-.7*previousWind)<1e-10);
  if(speed===5)assert.ok(wind<coefficient*speed**2*.25);
  previous=wind;
 }
});
import {getVehicle,vehicles} from '../src/vehicles';
test('stock upright Pop reaches 100 km/h in 25–35 seconds on level asphalt',()=>{
 for(const realistic of [false,true]){
  const ride=new Ride();ride.spec=getVehicle('pop');
  const {x,z}=ride;
  ride.contact=()=>{ride.pitch=0};
  let ticks=0;
  while(ride.speed<100/3.6&&ticks<35*60){
   ride.x=x;ride.z=z;
   ride.step(1/60,1,0,0,[],false,0,true,realistic);
   ticks++;
  }
  assert.ok(ride.speed>=100/3.6&&ticks>=25*60);
  assert.equal(ride.topSpeed,115/3.6);
 }
});
test('each flat tyre can get moving and sustain 30–50 km/h on level asphalt',()=>{
 for(const spec of vehicles)for(const realistic of [false,true]){
  const ride=new Ride();ride.spec=spec;ride.equipment.pneus=0;
  const {x,z}=ride;
  ride.contact=()=>{ride.pitch=0};
  for(let i=0;i<3600;i++){
   ride.x=x;ride.z=z;
   ride.step(1/60,1,0,0,[],false,0,true,realistic);
  }
  const kmh=ride.speed*3.6;
  assert.ok(kmh>=30-1e-8&&kmh<=50+1e-8,spec.id+' '+kmh);
 }
});
import {road,height,ground,nearest,terrain,LOOKOUT,terrainPatch,roadLength,stations} from '../src/terrain';
import * as T from 'three';
test('closed continuous road has plausible gradients',()=>{assert.ok(road[0].distanceTo(road.at(-1)!)<.001);let max=0;for(let i=1;i<road.length;i++){const a=road[i-1],b=road[i];max=Math.max(max,Math.abs(b.y-a.y)/Math.hypot(b.x-a.x,b.z-a.z))}assert.ok(max<.3,`grade ${max}`)});
test('rendered terrain and collision height agree',()=>{const mesh=terrain(0,0,1024);mesh.updateMatrixWorld();const ray=new T.Raycaster();for(let i=0;i<25;i++){const x=-300+i*23.13,z=100*Math.sin(i);ray.set(new T.Vector3(x,300,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(mesh);assert.ok(hit.length);assert.ok(Math.abs(hit[0].point.y-height(x,z))<.0001)}mesh.geometry.dispose()});
test('brakes stop, obstacles block, recovery is on road',()=>{const r=new Ride();for(let i=0;i<180;i++)r.step(1/60,1,0,0,[]);assert.ok(r.speed>1);r.speed=40/3.6;for(let i=0;i<180;i++)r.step(1/60,0,1,0,[]);assert.equal(r.speed,0);r.x=100;r.z=100;r.recover();assert.ok(nearest(r.x,r.z).distance<.01);assert.ok(Math.abs(r.y-ground(r.x,r.z))<.02);const x=r.x,z=r.z;r.step(1/60,1,0,0,[{x:x+Math.sin(r.heading)*.4,z:z+Math.cos(r.heading)*.4,r:2}]);assert.equal(r.x,x);assert.equal(r.z,z)});
test('first two kilometers with feedback steering remains driveable',()=>{const r=new Ride();r.x=road[0].x;r.z=road[0].z;r.recover();let maxError=0;for(let i=0;i<18000&&r.distance<2200;i++){const n=nearest(r.x,r.z),p=road[(n.index+7)%(road.length-1)];const target=Math.atan2(p.x-r.x,p.z-r.z);const error=Math.atan2(Math.sin(target-r.heading),Math.cos(target-r.heading));r.step(1/60,r.speed<10?1:.1,r.speed>12?1:0,Math.max(-1,Math.min(1,error*3)),[]);maxError=Math.max(maxError,n.distance);assert.ok(Number.isFinite(r.y));}assert.ok(r.distance>2100);assert.ok(maxError<4,`road deviation ${maxError}`)});


test('100 km/h attainable on level asphalt and braking remains effective',()=>{let speed=0;for(let i=0;i<60*90;i++)speed=Math.max(0,Math.min(TOP_SPEED,speed+acceleration(speed,1,0,0,1)/60));assert.ok(speed*3.6>=99.9);for(let i=0;i<60*4;i++)speed=Math.max(0,speed+acceleration(speed,0,1,0,1)/60);assert.equal(speed,0)});
test('turn radius grows progressively with speed',()=>{const radius=(v:number)=>1.238/Math.tan(steeringAngle(v,1));assert.ok(radius(2)<3);assert.ok(radius(10)>radius(2)*3);assert.ok(radius(22)>radius(10)*3);assert.equal(steeringAngle(4,-1),-steeringAngle(4,1));});
test('realistic wheelie responds to real first-gear pitch torque and stays unavailable in a high gear',()=>{
 const r=new Ride();r.spec=getVehicle('cg150');r.speed=10/3.6;r.gear=1;r.bodyLean=-1;
 for(let i=0;i<60;i++)r.step(1/60,1,0,0,[],false,-1,false,true);
 assert.ok(r.wheelie>0,`expected first-gear lift; debug=${JSON.stringify(r.wheelieDebug)}`);
 assert.ok(r.wheelieDebug.pitchTorque>r.wheelieDebug.stabilizingTorque*.95);
 r.resetBody();r.gear=5;r.wheelie=0;r.speed=10/3.6;
 for(let i=0;i<60;i++)r.step(1/60,1,0,0,[],false,0,false,true);
 assert.equal(r.wheelie,0);
});
test('20 km route has reachable stations every few kilometers',()=>{assert.ok(roadLength>=20000&&roadLength<20200);const originalStations=stations.slice(0,5);const indices=originalStations.map(s=>nearest(s.x,s.z).index).sort((a,b)=>a-b);for(let i=0;i<indices.length;i++){const gap=((indices[(i+1)%indices.length]-indices[i]+5000)%5000)/5000*roadLength;assert.ok(gap<4500)}for(const p of originalStations)assert.ok(nearest(p.x,p.z).distance<30)});
test('mirante patch follows ground triangles without floating',()=>{const m=terrainPatch(LOOKOUT.x,LOOKOUT.z,LOOKOUT.radius,0xffffff),p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i)-height(p.getX(i),p.getZ(i))-.055)<.001);m.geometry.dispose()});

test('solid impacts distinguish frontal crashes from light and glancing contact',()=>{
 for(const [speed,offset,event,crash] of [[16,0,false,true],[16,0,true,true],[7,0,false,false],[16,.82,false,false]] as const){
  const ride=new Ride();ride.heading=0;ride.speed=speed;
  const obstacle={x:ride.x+offset,z:ride.z+1,r:.5};
  if(event)ride.eventObstacles=[obstacle];
  ride.step(.1,0,0,0,event?[]:[obstacle]);
  assert.equal(ride.fallen,crash);if(!crash)assert.equal(ride.speed,0);
  if(crash){
   assert.ok(ride.crash!.incoming.length()>10);assert.ok(ride.crash!.bike.velocity.length()<ride.crash!.incoming.length());
   ride.step(.1,1,0,0,[]);assert.ok(ride.crash!.bike.angular.length()>0);
   ride.recover();assert.equal(ride.fallen,false);assert.equal(ride.lean,0);
  }
 }
});

test('critical wear weakens propulsion, braking and cornering in both riding modes',()=>{
 for(const realistic of [false,true]){
  function step(part:'motor'|'freios'|'pneus',condition:number,gas:number,brake:number){
   const ride=new Ride();ride.speed=4;ride.equipment[part]=condition;
   ride.contact=()=>{ride.pitch=0};
   ride.step(1/60,gas,brake,1,[],false,0,false,realistic);
   return ride;
  }
  const drive=(health:number)=>step('motor',health,1,0).speed-step('motor',health,0,0).speed;
  const stopping=(health:number)=>step('freios',health,0,0).speed-step('freios',health,0,1).speed;
  assert.equal(drive(0),0);
  assert.ok(drive(10)>0&&drive(10)<drive(100));
  assert.ok(stopping(0)>0&&stopping(0)<stopping(100)*.1&&stopping(10)>stopping(0));
  const heading=new Ride().heading;
  const turn=(health:number)=>Math.abs(step('pneus',health,0,0).heading-heading);
  assert.ok(turn(0)>0&&turn(0)<turn(100)*.3&&turn(10)>turn(0));
 }
});


test('stock GS lifts in second with rearward input and stays planted during a neutral roll-on',()=>{
 for(const kmh of [35,55])for(const body of [-1,0]){
  const r=new Ride();r.spec=getVehicle('r1200gs');r.setHandlingMode('simcade');
  r.speed=kmh/3.6;r.gear=2;r.contact=()=>{r.pitch=0};
  for(let i=0;i<60;i++)r.step(1/60,1,0,0,[],false,body,false,true);
  assert.equal(r.gear,2);assert.equal(r.fallen,false);
  if(body<0)assert.ok(r.wheelie>Math.PI/6);else assert.equal(r.wheelie,0);
 }
});
