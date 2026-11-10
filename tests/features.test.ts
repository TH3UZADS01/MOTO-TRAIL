import {test} from 'node:test';
import assert from 'node:assert/strict';
import {axis,Controller} from '../src/input';
import {createBike,disposeBike} from '../src/vehicle-models';
import {vehicles} from '../src/vehicles';
import {Ride} from '../src/riding';
import * as T from 'three';
test('gamepad deadzone, analog triggers, edge buttons and disconnect',()=>{
 const c=new Controller(),pad={id:'test-pad',connected:true,mapping:'standard',axes:[.5,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))} as Gamepad;
 assert.equal(axis(.1,.14),0);assert.ok(axis(.5,.14)>.4);pad.buttons[7].value=.4;pad.buttons[3].pressed=true;
 const input=c.poll(.14,1,[pad]);assert.equal(input.throttle,.4);assert.ok(input.turn<0);assert.equal(input.camera,true);assert.equal(c.poll(.14,1,[pad]).camera,false);assert.equal(c.poll(.14,1,[]).disconnected,true);assert.equal(c.poll(.14,1,[]).throttle,0);
});
test('push backwards escapes an overlapping obstacle without teleporting',()=>{const r=new Ride(),x=r.x,z=r.z,dx=Math.sin(r.heading),dz=Math.cos(r.heading),o=[{x:x+dx*.65,z:z+dz*.65,r:.5}];for(let i=0;i<120;i++)r.step(1/60,0,0,0,o,true);assert.ok(r.speed<0);assert.ok((r.x-x)*dx+(r.z-z)*dz< -1);assert.ok(r.distance>1);const d=r.distance;for(let i=0;i<60;i++)r.step(1/60,0,0,0,o);assert.equal(r.speed,0);assert.ok(r.distance>=d);});
test('pushing at speed first brakes before moving backwards',()=>{const r=new Ride();r.speed=15;r.step(1/60,0,0,0,[],true);assert.ok(r.speed>14);});
test('all vehicle models have distinct geometry and dispose GPU resources',()=>{const counts=[];for(const spec of vehicles){const b=createBike(spec.id);assert.equal(b.wheels.length,2);assert.ok(b.rider.children.length>0);let meshes=0,disposed=0;b.root.traverse(o=>{if(o instanceof T.Mesh){meshes++;o.geometry.addEventListener('dispose',()=>disposed++)}});counts.push(meshes);disposeBike(b);assert.ok(disposed>0)}assert.equal(new Set(counts).size,vehicles.length);});
