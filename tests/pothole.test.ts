import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PotholeRisk,scars} from '../src/pavement';

test('only fast pothole entries roll, once per passage, including a swept crossing',()=>{
 const hole=scars.find(s=>s.depth<0)!,patch=scars.find(s=>s.depth>0)!;
 let rolls=0;
 const risk=new PotholeRisk(()=>++rolls===1?.20:.1999);
 const cross=(s:typeof hole,speed:number,z=s.z)=>risk.crosses(s.x-2,z,s.x+2,z,speed/3.6);
 assert.equal(cross(patch,90),false);
 assert.equal(cross(hole,74),false);
 assert.equal(cross(hole,60),false);
 assert.equal(rolls,0);
 cross(hole,60,hole.z+4);
 assert.equal(cross(hole,75),false);
 assert.equal(cross(hole,90),false);
 assert.equal(rolls,1);
 cross(hole,60,hole.z+4);
 assert.equal(cross(hole,75),true);
 assert.equal(rolls,2);
});
