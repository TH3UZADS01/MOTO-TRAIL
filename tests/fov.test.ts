import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FollowCamera} from '../src/camera';
import {Ride} from '../src/riding';
import {load,save} from '../src/persistence';

test('custom FOV survives camera switches and retains speed and braking response',()=>{
 const c=new FollowCamera(),r=new Ride();c.setFov(80,60);
 assert.equal(c.camera.fov,60);c.toggle();assert.equal(c.camera.fov,80);
 r.speed=r.topSpeed;
 for(let i=0;i<180;i++)c.update(r,1/60);
 assert.ok(c.camera.fov>104&&c.camera.fov<=105);
 r.brakeInput=1;for(let i=0;i<180;i++)c.update(r,1/60);
 assert.ok(c.camera.fov<101&&c.camera.fov>99);
 c.toggle();assert.equal(c.camera.fov,60);
 c.setFov(NaN,Infinity);assert.equal(c.camera.fov,52);
});

test('FOV settings migrate old saves, clamp invalid values and persist',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let stored='{}';
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>stored,setItem:(_key:string,value:string)=>{stored=value}}});
 try{
  const settings=load();assert.equal(settings.firstPersonFov,70);assert.equal(settings.thirdPersonFov,52);
  settings.firstPersonFov=78;settings.thirdPersonFov=48;save(settings);
  assert.equal(load().firstPersonFov,78);assert.equal(load().thirdPersonFov,48);
  stored=JSON.stringify({firstPersonFov:200,thirdPersonFov:-10});
  assert.equal(load().firstPersonFov,90);assert.equal(load().thirdPersonFov,40);
 }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage')}
});
