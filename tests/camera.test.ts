import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FollowCamera,CAMERA_TUNING} from '../src/camera';
import {Ride} from '../src/riding';
import {Group,Vector3} from 'three';

test('walking camera follows the eyes and keeps the movement heading while strafing',()=>{
 const view=new FollowCamera(),head=new Group();
 head.position.set(3,2,4);head.rotation.y=Math.PI;
 view.toggle();view.orbit=Math.PI/2;view.pitch=.2;
 view.followWalker(3,0,4,0,1/60,head);
 assert.ok(view.camera.position.distanceTo(head.localToWorld(new Vector3(0,0,.10)))<1e-6);
 assert.ok(view.camera.getWorldDirection(new Vector3()).distanceTo(new Vector3(Math.cos(.2),Math.sin(.2),0))<1e-6);
 view.toggle();view.followWalker(3,0,4,0,1/60,head);
 assert.ok(view.camera.position.distanceTo(head.position)>4);
});
test('first person FOV is smooth, speed dependent and contracts under braking',()=>{const r=new Ride(),c=new FollowCamera();c.toggle();r.speed=r.spec.maxSpeed;c.update(r,1/60);assert.ok(c.camera.fov>70&&c.camera.fov<75);for(let i=0;i<180;i++)c.update(r,1/60);assert.ok(c.camera.fov>94);r.brakeInput=1;for(let i=0;i<90;i++)c.update(r,1/60);assert.ok(c.camera.fov<92);r.speed=0;r.brakeInput=0;for(let i=0;i<180;i++)c.update(r,1/60);assert.ok(Math.abs(c.camera.fov-CAMERA_TUNING.baseFov)<.1)});
test('collision emits its lost speed once, small contacts cannot repeatedly shake camera',()=>{const r=new Ride();r.speed=15;r.step(1/60,0,0,0,[{x:r.x+Math.sin(r.heading),z:r.z+Math.cos(r.heading),r:2}]);assert.ok(r.takeImpact()>14);assert.equal(r.takeImpact(),0);r.step(1/60,1,0,0,[{x:r.x+Math.sin(r.heading),z:r.z+Math.cos(r.heading),r:2}]);assert.ok(r.takeImpact()<1)});

test('impact recoil decays and braking advances the first-person camera',()=>{const r=new Ride(),c=new FollowCamera();c.toggle();r.speed=12;c.update(r,1/60);r.brakeInput=1;for(let i=0;i<90;i++)c.update(r,1/60);const forward=(c.camera.position.x-r.x)*Math.sin(r.heading)+(c.camera.position.z-r.z)*Math.cos(r.heading);assert.ok(forward>.06);r.brakeInput=0;for(let i=0;i<120;i++)c.update(r,1/60);r.speed=18;r.step(1/60,0,0,0,[{x:r.x+Math.sin(r.heading),z:r.z+Math.cos(r.heading),r:2}]);c.update(r,1/60);assert.ok(Math.hypot(c.camera.position.x-r.x,c.camera.position.z-r.z)>.03);for(let i=0;i<120;i++)c.update(r,1/60);assert.ok(Math.hypot(c.camera.position.x-r.x,c.camera.position.z-r.z)<.001)});
