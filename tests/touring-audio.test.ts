import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AUDIO_ASSETS} from '../src/audio';
import {getVehicle} from '../src/vehicles';

for(const [id,prefix] of [['twister','twister'],['r1200gs','gs']] as const){
 test(id+' uses dedicated acceleration, overrun and idle recordings',()=>{
  const bank=getVehicle(id).audio;
  assert.equal(bank,id);
  const layers=AUDIO_ASSETS.filter(a=>a.bank===bank);
  assert.deepEqual(layers.map(a=>[a.name,a.load]),[[prefix+'-on',true],[prefix+'-off',false]]);
  for(const mode of ['idle','on','off']){
   const b=readFileSync('public/audio/'+prefix+'-'+mode+'.wav');
   assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),44100);
   let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));
   assert.ok(peak>1000&&peak<30000);
   assert.ok(Math.abs(b.readInt16LE(44)-b.readInt16LE(b.length-2))<1500);
  }
 });
}
