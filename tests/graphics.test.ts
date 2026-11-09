import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeWorld} from '../src/world';
import {road,ground} from '../src/terrain';
const context={fillStyle:'',strokeStyle:'',lineWidth:0,font:'',textAlign:'',fillRect(){},strokeRect(){},fillText(){}};
(globalThis as any).document={createElement:()=>({width:0,height:0,getContext:()=>context})};
test('road and newly streamed terrain receive shadows throughout a trip',()=>{const scene=new T.Scene(),world=makeWorld(scene),ray=new T.Raycaster();for(const index of [0,1600]){const p=road[index];world.update(p.x,p.z,0);scene.updateMatrixWorld(true);for(const offset of [0,30]){const x=p.x+offset,z=p.z;ray.set(new T.Vector3(x,500,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(scene.children,true).find(h=>Math.abs(h.point.y-ground(x,z))<.2);assert.ok(hit,'rendered ground beneath the rider');assert.equal(hit.object.receiveShadow,true,'ground must receive the bike and tree shadows')}}});
