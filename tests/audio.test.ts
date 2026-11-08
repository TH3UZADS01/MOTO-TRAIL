import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('all recorded audio assets are valid compact mono PCM with no clipping',()=>{
 for(const name of ['engine-idle','engine-load','moped-idle','moped-load','wind','horn']){
  const b=readFileSync(`public/audio/${name}.wav`);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),22050);let peak=0;for(let i=44;i<b.length-1;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));assert.ok(peak>1000&&peak<30000);assert.ok(b.length<600000);
  if(name!=='horn')assert.ok(Math.abs(b.readInt16LE(44)-b.readInt16LE(b.length-2))<12000,'loop seam must not create a large impulse');
 }
});
