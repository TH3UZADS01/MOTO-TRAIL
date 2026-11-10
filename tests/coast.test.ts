import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shoreline,coastalHeight,coastalBlend} from '../src/coast';
import {routes,deepWater,height} from '../src/terrain';
test('coastal road remains dry, smooth and inside world boundaries',()=>{const route=routes.find(r=>r.id==='coast')!;assert.ok(route);for(const [i,p] of route.points.entries()){assert.ok(Math.abs(p.x)<7970&&Math.abs(p.z)<7970);assert.equal(deepWater(p.x,p.z),false);assert.ok(height(p.x,p.z)>1);if(i)assert.ok(Math.abs(p.y-route.points[i-1].y)/p.distanceTo(route.points[i-1])<.16)}});
test('beach descends continuously to sea and deep water blocks riding',()=>{for(let z=-1000;z<500;z+=50){const shore=shoreline(z);assert.equal(coastalBlend(shore,z),1);assert.ok(Math.abs(coastalHeight(shore,z,50))<.001);assert.equal(deepWater(shore+20,z),true);for(let x=shore-1200;x<shore+30;x+=2)assert.ok(Math.abs(coastalHeight(x,z,50)-coastalHeight(x+2,z,50))<.3)}});
