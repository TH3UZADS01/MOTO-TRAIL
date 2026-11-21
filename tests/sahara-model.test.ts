import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBike,disposeBike} from '../src/vehicle-models';

test('Sahara Blender geometry retains steering and wheel pivots and separate suspension',()=>{
 const bike=createBike('sahara');
 assert.equal(bike.root.name,'Sahara-Blender');
 assert.equal(bike.wheels[0].parent,bike.body);
 assert.equal(bike.wheels[1].parent,bike.steering);
 assert.equal(bike.body.getObjectByName('FrontSuspension')?.parent,bike.steering);
 assert.equal(bike.body.getObjectByName('RearSuspension')?.parent,bike.body);
 assert.ok(Math.abs(bike.wheels[0].position.z+.7125)<1e-6);
 assert.ok(Math.abs(bike.wheels[1].getWorldPosition(new T.Vector3()).z-.7125)<1e-6);
 assert.equal(bike.brakeLight.lens,bike.body.getObjectByName('Body_TailLens'));
 const bounds=new T.Box3();let triangles=0;
 bike.root.updateMatrixWorld(true);
 bike.body.traverse(o=>{if(o instanceof T.Mesh&&o.name.startsWith(o.parent!.name+'_')){
  assert.ok(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite));
  triangles+=o.geometry.index!.count/3;
  bounds.union(o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld));
 }});
 const size=bounds.getSize(new T.Vector3());
 assert.ok(size.z>1.9&&size.z<2.3);assert.ok(size.y>1.19&&size.y<1.6);assert.ok(size.x<1.0);
 assert.ok(triangles>5000&&triangles<65000);
 disposeBike(bike);
});

test('separate Sahara instances do not share disposable resources',()=>{
 const a=createBike('sahara'),b=createBike('sahara');
 const ma=a.body.getObjectByName('Body_Paint') as T.Mesh,mb=b.body.getObjectByName('Body_Paint') as T.Mesh;
 assert.notEqual(ma.geometry,mb.geometry);assert.notEqual(a.paintMaterials[0],b.paintMaterials[0]);
 let disposed=false;mb.geometry.addEventListener('dispose',()=>disposed=true);
 disposeBike(a);assert.equal(disposed,false);disposeBike(b);assert.equal(disposed,true);
});

test('original Sahara front tyre stays concentric with the steering axle as it rolls',()=>{
 const bike=createBike('sahara'),wheel=bike.wheels[1];
 const tyre=wheel.getObjectByName('FrontWheel_FrontWheel_Material1') as T.Mesh;
 assert.ok(tyre);
 const axle=new T.Vector3(),box=new T.Box3();
 for(const turn of [-.4,0,.4]){
  bike.steering.rotation.y=turn;
  for(const spin of [0,Math.PI/4,Math.PI/2]){
   wheel.rotation.x=spin;bike.root.updateMatrixWorld(true);
   wheel.getWorldPosition(axle);box.setFromObject(tyre,true);
   assert.ok(Math.abs(box.min.y)<.003);
   assert.ok(Math.abs((box.max.y+box.min.y)/2-axle.y)<.002);
  }
 }
 disposeBike(bike);
});

test('Sahara rear wheel keeps the front spoke layout with a wider, taller tyre on a smaller rim',()=>{
 const bike=createBike('sahara');
 const dimensions=bike.wheels.map((wheel,i)=>{
  const part=i===0?'RearWheel':'FrontWheel';
  const get=(material:number)=>(wheel.getObjectByName(`${part}_${part}_Material${material}`) as T.Mesh).geometry;
  const positions=get(1).getAttribute('position');
  const rim=get(2).boundingBox!;
  let minX=Infinity,maxX=-Infinity,outerRadius=0;
  for(let j=0;j<positions.count;j++){
   const r=Math.hypot(positions.getY(j),positions.getZ(j));
   if(r<rim.max.y)continue;
   minX=Math.min(minX,positions.getX(j));maxX=Math.max(maxX,positions.getX(j));outerRadius=Math.max(outerRadius,r);
  }
  return {width:maxX-minX,rim:rim.max.y,profile:outerRadius-rim.max.y,radius:outerRadius,spokes:get(0).index!.count};
 });
 const [rear,front]=dimensions;
 assert.equal(rear.spokes,front.spokes);assert.ok(rear.width>front.width*1.2);
 assert.ok(rear.rim<front.rim*.85);assert.ok(rear.profile>front.profile*1.15);
 assert.ok(Math.abs(rear.radius-bike.wheels[0].position.y)<.003);
 disposeBike(bike);
});
