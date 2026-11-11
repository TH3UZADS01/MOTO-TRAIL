import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {routes,surface} from '../src/terrain';
import {TireParticles,tireParticleEmissionRate,TIRE_PARTICLE_CONFIG} from '../src/tire-particles';

test('emission rate follows speed and stops on asphalt or at rest',()=>{
 assert.equal(tireParticleEmissionRate('asfalto',20),0);
 assert.equal(tireParticleEmissionRate('terra',0),0);
 assert.equal(tireParticleEmissionRate('grama',TIRE_PARTICLE_CONFIG.minimumSpeed-.01),0);
 assert.ok(tireParticleEmissionRate('terra',20)>tireParticleEmissionRate('terra',5));
 assert.ok(tireParticleEmissionRate('grama',20)>tireParticleEmissionRate('grama',5));
});

test('terrain detection selects only matching dirt or grass particles near the rear wheel',()=>{
 const dirt=routes.find(route=>route.id==='ridge')!.points[180],grass={x:-5000,z:-5000};
 assert.equal(surface(dirt.x,dirt.z),'terra');
 assert.equal(surface(grass.x,grass.z),'grama');
 const scene=new T.Scene(),wheel=new T.Object3D();wheel.position.set(0,.28,-1);scene.add(wheel);
 const effects=new TireParticles(scene,()=>.5);
 try{
  effects.update(surface(dirt.x,dirt.z),20,wheel,0,.1);
  assert.equal(effects.surface,'terra');
  assert.ok(effects.count>0);
  const firstPosition=effects.points.geometry.getAttribute('position');
  assert.ok(firstPosition.getZ(0)<wheel.position.z,'particles trail the rear tire');
  const dirtLeaf=effects.points.geometry.getAttribute('particleLeaf');
  assert.equal(dirtLeaf.getX(0),0);
  const dirtColor=effects.points.geometry.getAttribute('particleColor');
  assert.ok(dirtColor.getX(0)>dirtColor.getY(0),'dirt particles are brown');
  effects.update(surface(grass.x,grass.z),20,wheel,0,.1);
  assert.equal(effects.surface,'grama');
  assert.ok(effects.count>0);
  const grassLeaf=effects.points.geometry.getAttribute('particleLeaf');
  for(let i=0;i<effects.count;i++)assert.equal(grassLeaf.getX(i),1,'grass emits leaf-shaped particles only');
  const grassColor=effects.points.geometry.getAttribute('particleColor');
  assert.ok(grassColor.getY(0)>grassColor.getX(0),'grass fragments are green');
  effects.update('asfalto',20,wheel,0,.1);
  assert.equal(effects.count,0,'leaves are cleared when the tire moves to another surface');
 }finally{effects.dispose()}
});

test('stopped bike emits no new particles and active particles fade out',()=>{
 const scene=new T.Scene(),wheel=new T.Object3D();wheel.position.y=.28;scene.add(wheel);
 const effects=new TireParticles(scene,()=>.5);
 try{
  effects.update('terra',25,wheel,0,.1);
  const spawned=effects.count;
  assert.ok(spawned>0&&spawned<=TIRE_PARTICLE_CONFIG.capacity);
  effects.update('terra',0,wheel,0,.1);
  assert.equal(effects.count,spawned);
  for(let i=0;i<20;i++)effects.update('terra',0,wheel,0,.1);
  assert.equal(effects.count,0);
 }finally{effects.dispose()}
});
