import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Sound,AUDIO_ASSETS,CG_AUDIO_TUNING} from '../src/audio';
function setup(){const sound=new Sound();sound.ctx={currentTime:1} as AudioContext;sound.ready=true;sound.vehicle='cg150';const parameter=()=>({value:0,response:0,setTargetAtTime(value:number,_time:number,response:number){this.value=value;this.response=response}});sound.layers=AUDIO_ASSETS.map(a=>({bank:a.bank,load:a.load,gain:{gain:parameter()},source:{playbackRate:parameter()},filter:{frequency:parameter()}})) as any;return sound}
const gain=(s:Sound,load:boolean)=>s.layers.find(l=>l.bank==='cg150'&&l.load===load)!.gain.gain.value;
test('CG selects supplied acceleration and coast loops with smoothed transitions',()=>{
 const s=setup();s.update(20,4,1,false);assert.ok(gain(s,true)>0);assert.equal(gain(s,false),0);assert.ok(s.layers.filter(l=>l.bank==='engine'||l.bank==='moped').every(l=>l.gain.gain.value===0));
 s.update(20,4,0,false);assert.equal(gain(s,true),0);assert.ok(gain(s,false)>0);
 s.update(20,4,.5,false);assert.ok(gain(s,true)>0&&gain(s,false)>0);
 s.update(20,4,1,false,1);assert.equal(gain(s,true),0);assert.ok(gain(s,false)>0);
 const coast=gain(s,false);s.update(0,1,0,false);assert.ok(gain(s,false)>0&&gain(s,false)<coast);
 for(const l of s.layers.filter(l=>l.bank==='cg150')){assert.ok(l.source.playbackRate.value>=CG_AUDIO_TUNING.minRate);assert.ok((l.gain.gain as any).response>0)}
 s.update(20,4,1,true);assert.ok(s.layers.every(l=>l.gain.gain.value===0));
 s.vehicle='pop';s.update(10,2,1,false);assert.equal(gain(s,true),0);assert.equal(gain(s,false),0);assert.ok(s.layers.some(l=>l.bank==='engine'&&l.gain.gain.value>0));
});
test('both CG recordings are nonempty mono PCM WAVs and have continuous loop seams',()=>{
 for(const a of AUDIO_ASSETS.filter(a=>a.bank==='cg150')){const b=readFileSync(`public/audio/${a.name}.wav`);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');let format=false,data:Buffer|undefined;
  for(let at=12;at+8<=b.length;){const name=b.toString('ascii',at,at+4),size=b.readUInt32LE(at+4);if(name==='fmt '){assert.equal(b.readUInt16LE(at+8),1);assert.equal(b.readUInt16LE(at+10),1);assert.equal(b.readUInt32LE(at+12),44100);assert.equal(b.readUInt16LE(at+22),16);format=true}if(name==='data')data=b.subarray(at+8,at+8+size);at+=8+size+(size%2)}
  assert.ok(format&&data&&data.length>44100*2);assert.ok(Math.abs(data!.readInt16LE(0)-data!.readInt16LE(data!.length-2))<100);
 }
});
