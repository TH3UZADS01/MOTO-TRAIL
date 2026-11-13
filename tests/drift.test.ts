import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Drift} from '../src/drift';
import {Ride} from '../src/riding';
import {TireParticles} from '../src/tire-particles';
import {BrakePushAssist} from '../src/input';

test('rear lock requires one continuous second, and releases smoothly',()=>{
 const d=new Drift();for(let i=0;i<59;i++)d.update(1/60,1,10,1);assert.equal(d.active,false);
 d.update(1/60,1,10,1);assert.equal(d.active,true);
 for(let i=0;i<30;i++)d.update(1/60,1,10,1);assert.ok(d.slip>.2);
 d.update(1/60,0,10,1);assert.equal(d.active,false);assert.ok(d.slip>0);
 for(let i=0;i<120;i++)d.update(1/60,0,10,1);assert.ok(d.slip<.001);
 for(let i=0;i<59;i++)d.update(1/60,1,10,1);assert.equal(d.active,false);
});
test('stopped push assist, reverse and airborne riding cannot activate drift',()=>{
 for(const [speed,disabled] of [[0,false],[-1,false],[10,true]] as const){const d=new Drift();for(let i=0;i<240;i++)d.update(1/60,1,speed,1,disabled);assert.equal(d.active,false);assert.equal(d.slip,0)}
 const assist=new BrakePushAssist();for(let i=0;i<61;i++)assist.update(1,0,1/60);assert.equal(assist.update(1,0,1/60),true);
});
test('drift turns harder, slides sideways and stops on impact or recovery',()=>{
 const r=new Ride();r.speed=30;r.contact=()=>{r.pitch=0};
 for(let i=0;i<135;i++){r.x=-310;r.z=0;r.step(1/60,0,1,1,[])}
 assert.equal(r.drift.active,true);assert.ok(r.drift.slip>.1);
 const start=r.heading;r.step(1/60,0,1,1,[]);const driftYaw=r.heading-start;
 const normal=new Ride();normal.speed=r.speed;normal.steer=r.steer;normal.heading=start;normal.contact=()=>{normal.pitch=0};normal.step(1/60,0,1,1,[]);
 assert.ok(driftYaw>normal.heading-start);assert.ok(r.speed<30);
 const travel=r.heading-r.drift.slip;
 r.step(1/60,0,1,1,[{x:r.x+Math.sin(travel),z:r.z+Math.cos(travel),r:2}]);assert.equal(r.speed,0);assert.equal(r.drift.active,false);
 r.recover();assert.equal(r.drift.slip,0);
});
test('locked rear emits bounded white smoke on asphalt and lets it fade after release',()=>{
 const scene=new T.Scene(),wheel=new T.Object3D();wheel.position.y=.3;scene.add(wheel);const p=new TireParticles(scene,()=>.5);
 p.update('asfalto',15,wheel,0,.1,true);assert.ok(p.count>0&&p.count<=96);
 const colors=p.points.geometry.getAttribute('particleColor');assert.ok(colors.getX(0)>.7);assert.equal(colors.getX(0),colors.getY(0));assert.equal(colors.getX(0),colors.getZ(0));
 p.update('asfalto',15,wheel,0,.1,false);assert.ok(p.count>0);
 for(let i=0;i<30;i++)p.update('asfalto',0,wheel,0,.1,false);
 assert.equal(p.count,0);p.dispose();
});
