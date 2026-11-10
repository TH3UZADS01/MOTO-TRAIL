import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRider,RIDER_TUNING} from '../src/rider';
test('rider leans inward smoothly, opens inside knee and keeps hands on grips',()=>{const steering=new T.Group();steering.position.z=.62;steering.rotation.y=.25;const rig=createRider(steering);rig.update(15,1,1/60);assert.ok(rig.lean<0&&rig.lean>-.1);for(let i=0;i<120;i++)rig.update(15,1,1/60);assert.ok(Math.abs(rig.lean)<=RIDER_TUNING.maxLean);assert.ok(rig.limbs[1].knee.x>Math.abs(rig.limbs[0].knee.x));for(const l of rig.limbs){const target=new T.Vector3(l.side*.31,1.02,-.12).applyQuaternion(steering.quaternion).add(steering.position);assert.ok(l.hand.position.distanceTo(target)<1e-6)}for(let i=0;i<180;i++)rig.update(0,0,1/60);assert.ok(Math.abs(rig.lean)<1e-6)});
