import {test} from 'node:test';
import assert from 'node:assert/strict';
import {biomeAt,biomeColor,plantAt} from '../src/biomes';
import {vegetationFactory} from '../src/vegetation';
test('biomes form a continuous normalized blend with deterministic vegetation',()=>{
 for(let x=-500;x<7000;x+=120)for(let z=-4000;z<1500;z+=120){const a=biomeAt(x,z),b=biomeAt(x+.1,z);assert.ok(Math.abs(Object.values(a).reduce((s,n)=>s+n,0)-1)<1e-8);for(const k of Object.keys(a) as (keyof typeof a)[]){assert.ok(a[k]>=0&&a[k]<=1);assert.ok(Math.abs(a[k]-b[k])<.01)}assert.ok(biomeColor(x,z).toArray().every(Number.isFinite));assert.equal(plantAt(x,z,.25),plantAt(x,z,.25))}
});
test('vegetation instance bounds are finite and trunk colliders match placements',()=>{
 const make=vegetationFactory(),sample={x:100,y:10,z:-3000,s:1,r:.6,rotation:1,tint:.4},a=make([sample]),b=make([sample]);assert.deepEqual(a.hits,b.hits);assert.equal(a.hits.length,1);a.group.traverse((o:any)=>{if(o.isInstancedMesh&&o.count)assert.ok(Number.isFinite(o.boundingSphere.radius))});
});
