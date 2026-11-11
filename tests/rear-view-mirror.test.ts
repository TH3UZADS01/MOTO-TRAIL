import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createMirroredQuadGeometry,REAR_MIRROR_DEFAULTS,rearMirrorCaptureDue,updateRearViewCamera} from '../src/rear-view-mirror';
import {Ride} from '../src/riding';

test('rear camera follows the bike and points opposite its heading',()=>{
 const ride=new Ride(),camera=new T.PerspectiveCamera(REAR_MIRROR_DEFAULTS.fov,2,.1,REAR_MIRROR_DEFAULTS.far);
 ride.x=12;ride.y=3;ride.z=-8;ride.heading=0;updateRearViewCamera(camera,ride);
 assert.deepEqual(camera.position.toArray(),[12,3+REAR_MIRROR_DEFAULTS.mountHeight,-8]);
 const direction=camera.getWorldDirection(new T.Vector3());
 assert.ok(direction.z<-.999);
 ride.heading=Math.PI/2;updateRearViewCamera(camera,ride);
 assert.ok(camera.getWorldDirection(new T.Vector3()).x<-.999);
});

test('rear camera projects lateral positions as a mirror would',()=>{
 const ride=new Ride(),camera=new T.PerspectiveCamera(REAR_MIRROR_DEFAULTS.fov,2,.1,REAR_MIRROR_DEFAULTS.far);
 ride.heading=0;updateRearViewCamera(camera,ride);
 const pointInRearView=new T.Vector3(1,ride.y+REAR_MIRROR_DEFAULTS.mountHeight,-10).project(camera);
 assert.ok(pointInRearView.x>0,'a point to the bike right is captured on the camera right');
 const uv=createMirroredQuadGeometry().getAttribute('uv');
 assert.equal(uv.getX(0),1,'the display reverses horizontal image coordinates');
});

test('rear capture cadence defaults to 20 FPS and can be reduced',()=>{
 assert.equal(REAR_MIRROR_DEFAULTS.width,512);
 assert.equal(REAR_MIRROR_DEFAULTS.height,256);
 assert.equal(REAR_MIRROR_DEFAULTS.fps,20);
 assert.equal(rearMirrorCaptureDue(1000,1049,20),false);
 assert.equal(rearMirrorCaptureDue(1000,1050,20),true);
 assert.equal(rearMirrorCaptureDue(1000,1067,15),true);
});
