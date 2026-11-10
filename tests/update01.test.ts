import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Ride} from '../src/riding';
import {BODY_TUNING} from '../src/body-control';
import {Controller} from '../src/input';
import {vehicles} from '../src/vehicles';
import {createBike,disposeBike} from '../src/vehicle-models';
import {applyBikePose} from '../src/bike-pose';
import {Fuel} from '../src/fuel';
function flatStep(r:Ride,body:number,gas=1,brake=0){r.x=-310;r.z=0;r.heading=0;r.contact=()=>{r.pitch=0};r.step(1/60,gas,brake,0,[],false,body)}
test('left stick Y controls body independently of steering and resets on disconnect',()=>{const c=new Controller(),pad={id:'test',connected:true,mapping:'standard',axes:[.5,-1,0,0],buttons:[]} as unknown as Gamepad;let s=c.poll(.14,1,[pad]);assert.equal(s.body,1);assert.ok(s.turn<0);pad.axes[1]=1;assert.equal(c.poll(.14,1,[pad]).body,-1);assert.equal(c.poll(.14,1,[]).body,0)});
test('forward tuck smoothly increases attainable top speed by 15% on every motorcycle',()=>{for(const spec of vehicles){const r=new Ride();r.spec=spec;flatStep(r,1);assert.ok(r.bodyLean>0&&r.bodyLean<.1);for(let i=0;i<60*180;i++)flatStep(r,1);assert.ok(Math.abs(r.topSpeed/spec.maxSpeed-1.15)<1e-6);assert.ok(r.speed>spec.maxSpeed*1.14,`${spec.id}: ${r.speed}`);const previous=r.speed;flatStep(r,0);assert.ok(previous-r.speed<.1);r.recover();assert.equal(r.wheelie,0);assert.equal(r.bodyLean,0)}});
test('wheelie is bounded and lands under braking, low speed, and release',()=>{const r=new Ride();for(let i=0;i<300;i++)flatStep(r,-1);assert.ok(r.wheelie>.4&&r.wheelie<=BODY_TUNING.maxWheelie);const lifted=r.wheelie;for(let i=0;i<120;i++)flatStep(r,-1,0,1);assert.ok(r.wheelie<lifted*.01);r.speed=0;for(let i=0;i<120;i++)flatStep(r,-1,0);assert.ok(r.wheelie<.001);for(let i=0;i<300;i++)flatStep(r,-1);for(let i=0;i<180;i++)flatStep(r,0);assert.ok(r.wheelie<.001);const grounded=new Ride(),liftedRide=new Ride();for(const moto of [grounded,liftedRide]){moto.speed=10;moto.steer=1;moto.heading=0}liftedRide.bodyLean=-1;liftedRide.wheelie=BODY_TUNING.maxWheelie;grounded.step(1/60,1,0,1,[]);liftedRide.step(1/60,1,0,1,[],false,-1);assert.ok(liftedRide.heading<grounded.heading*.6)});
test('wheelie rotation keeps rear axle fixed for all models and follows terrain pitch',()=>{for(const v of vehicles){const b=createBike(v.id);applyBikePose(b,.12,.1,0);b.body.updateMatrixWorld(true);const axle=b.wheels[0].getWorldPosition(new T.Vector3());applyBikePose(b,.12,.1,Math.PI/4);b.body.updateMatrixWorld(true);assert.ok(axle.distanceTo(b.wheels[0].getWorldPosition(new T.Vector3()))<1e-6);assert.ok(b.wheels[1].getWorldPosition(new T.Vector3()).y>axle.y+.6);disposeBike(b)}});
test('fuel increases exactly 10% for every bike without changing refill or capacity',()=>{for(const v of vehicles){const f=new Fuel(),before=f.get(v.id),meters=1000,dt=60,gas=.7,speed=20,pitch=.05;const old=(meters/1000*(.065+.04*(speed/28)**2+.015*gas+pitch*.08)*(v.id==='caloi'?.7:1)+dt*.000015);f.consume(v.id,meters,dt,gas,speed,pitch,false);assert.ok(Math.abs(before-f.get(v.id)-old*1.1)<1e-12);f.refill(v.id,100);assert.equal(f.get(v.id),before)}});
