import {ENGINE_TUNING,type Powertrain} from './powertrain';
import {DISCOVERY_SOUND_DURATION} from './exploration';
import type {RemotePlayer} from './network';
import {getVehicle,type VehicleId} from './vehicles';
// High-RPM recordings supplied by the user; gains, pitch range and crossfade are tunable.
export const CG_AUDIO_TUNING={accelerationGain:.45,coastGain:.4,idleGain:.12,minRate:.65,maxRate:1.1,response:.16,filter:7000};
export const AUDIO_ASSETS=[
 {name:'engine-idle',bank:'engine',load:false},{name:'engine-load',bank:'engine',load:true},
 {name:'moped-idle',bank:'moped',load:false},{name:'moped-load',bank:'moped',load:true},
 {name:'wind',bank:'wind',load:false},{name:'cg150-on-high',bank:'cg150',load:true},
 {name:'cg150-off-high',bank:'cg150',load:false}
] as const;
type Layer={source:AudioBufferSourceNode;gain:GainNode;filter:BiquadFilterNode;bank:'engine'|'moped'|'wind'|'cg150';load:boolean};
type Position={x:number;y:number;z:number};
type RemoteVoice={gain:GainNode;pan:StereoPannerNode;horns:Set<AudioBufferSourceNode>};
export class Sound {
 private output?:DynamicsCompressorNode;private effectsOutput?:GainNode;private effectVolume=.5;
 get effects(){return this.effectVolume}
 set effects(value:number){this.effectVolume=Math.max(0,Math.min(1,value));if(this.effectsOutput&&this.ctx)this.effectsOutput.gain.setTargetAtTime(this.effectVolume,this.ctx.currentTime,.025)}
 private players:RemotePlayer[]=[];private voices=new Map<string,RemoteVoice>();private revMatchSequences=new Map<string,number>();
 setRemotePlayers(players:RemotePlayer[]){
  this.players=players;const live=new Set(players.filter(p=>p.connected).map(p=>p.id));
  for(const [id,v] of this.voices)if(!live.has(id)){for(const h of v.horns)h.stop();v.gain.disconnect();v.pan.disconnect();this.voices.delete(id)}
  for(const id of this.revMatchSequences.keys())if(!players.some(p=>p.id===id))this.revMatchSequences.delete(id);
  for(const player of players){const sequence=player.state.revMatchSequence??0,previous=this.revMatchSequences.get(player.id);if(previous!==undefined&&sequence>previous)this.remoteRevMatch(player.id);this.revMatchSequences.set(player.id,sequence)}
 }
 private voice(id:string){let v=this.voices.get(id);if(v)return v;const c=this.ctx!,gain=c.createGain(),pan=c.createStereoPanner();gain.gain.value=0;gain.connect(pan);pan.connect(this.effectsOutput!);v={gain,pan,horns:new Set()};
  this.voices.set(id,v);return v;
 }
 updateRemotes(listener:Position,matrix:ArrayLike<number>,audible:boolean,peers:Map<string,{bike:{root:{position:Position}}}>){if(!this.ready||!this.ctx)return;const t=this.ctx.currentTime;
  for(const p of this.players){if(!p.connected)continue;const v=this.voice(p.id),s=p.state,pos=peers.get(p.id)?.bike.root.position||s,dx=pos.x-listener.x,dy=pos.y-listener.y,dz=pos.z-listener.z,d=Math.hypot(dx,dy,dz);
   const attenuation=d>=90?0:Math.pow(1-d/90,2)/(1+d/12);v.gain.gain.setTargetAtTime(audible?attenuation:0,t,.12);v.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,(dx*matrix[0]+dy*matrix[1]+dz*matrix[2])/Math.max(d,1))),t,.12);

  }
 }
 remoteHorn(id:string){if(!this.ready||!this.ctx||!this.hornBuffer)return;const v=this.voices.get(id);if(!v||v.horns.size>=2)return;const source=this.ctx.createBufferSource();source.buffer=this.hornBuffer;source.connect(v.gain);v.horns.add(source);source.onended=()=>{source.disconnect();v.horns.delete(source)};source.start()}
 private remoteRevMatch(id:string){
  if(!this.ready||!this.ctx)return;
  const voice=this.voice(id),oscillator=this.ctx.createOscillator(),gain=this.ctx.createGain(),at=this.ctx.currentTime;
  oscillator.type='sawtooth';oscillator.frequency.setValueAtTime(190,at);oscillator.frequency.exponentialRampToValueAtTime(620,at+.075);oscillator.frequency.exponentialRampToValueAtTime(260,at+.28);
  gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(ENGINE_TUNING.revMatchVolume*.16,at+.018);gain.gain.exponentialRampToValueAtTime(.0001,at+.3);
  oscillator.connect(gain);gain.connect(voice.gain);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};oscillator.start(at);oscillator.stop(at+.31);
 }

 ctx?:AudioContext;volume=.5;ambience=.35;vehicle:VehicleId='pop';layers:Layer[]=[];ready=false;private loading?:Promise<void>;private hornBuffer?:AudioBuffer;private lastHorn=-1;private queuedDiscoveries=0;private discoveryQueueUntil=0;private crashQueued=false;
 async start(){
  if(!this.ctx)this.ctx=new AudioContext();await this.ctx.resume();
  if(this.ready)return;
  if(!this.loading)this.loading=this.load().catch(error=>{this.loading=undefined;throw error});
  await this.loading;
 }
 private async load(){const c=this.ctx!,names=[...AUDIO_ASSETS.map(a=>a.name),'horn'];
  const buffers=await Promise.all(names.map(async name=>{const response=await fetch(`/audio/${name}.wav`);if(!response.ok)throw new Error(`Não foi possível carregar ${name}`);return c.decodeAudioData(await response.arrayBuffer())}));
  const limiter=c.createDynamicsCompressor();this.output=limiter;limiter.threshold.value=-10;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.008;limiter.release.value=.2;limiter.connect(c.destination);this.effectsOutput=c.createGain();this.effectsOutput.gain.value=this.effects;this.effectsOutput.connect(limiter);
  buffers.slice(0,AUDIO_ASSETS.length).forEach((buffer,i)=>{const asset=AUDIO_ASSETS[i];const source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();source.buffer=buffer;source.loop=true;gain.gain.value=0;filter.type='lowpass';filter.frequency.value=asset.bank==='wind'?700:asset.bank==='cg150'?CG_AUDIO_TUNING.filter:1800;source.connect(filter);filter.connect(gain);gain.connect(limiter);source.start();this.layers.push({source,gain,filter,bank:asset.bank,load:asset.load})});
  this.hornBuffer=buffers[AUDIO_ASSETS.length];this.ready=true;
  while(this.queuedDiscoveries>0){this.queuedDiscoveries--;this.scheduleDiscovery()}
  if(this.crashQueued){this.crashQueued=false;this.playCrash()}
 }
 playDiscovery(){
  if(this.effects<=0)return;
  if(!this.ready||!this.ctx||!this.output){this.queuedDiscoveries=Math.min(this.queuedDiscoveries+1,32);return}
  this.scheduleDiscovery();
 }
 playCrash(){
  if(this.effects<=0)return;
  if(!this.ready||!this.ctx||!this.output){this.crashQueued=true;return}
  const c=this.ctx,at=c.currentTime,osc=c.createOscillator(),tone=c.createGain(),noise=c.createBufferSource(),filter=c.createBiquadFilter(),noiseGain=c.createGain();
  osc.type='triangle';osc.frequency.setValueAtTime(115,at);osc.frequency.exponentialRampToValueAtTime(38,at+.24);
  tone.gain.setValueAtTime(.0001,at);tone.gain.exponentialRampToValueAtTime(.42,at+.012);tone.gain.exponentialRampToValueAtTime(.0001,at+.32);
  const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*.18),c.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(1-i/samples.length);
  noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=750;noiseGain.gain.setValueAtTime(.22,at);noiseGain.gain.exponentialRampToValueAtTime(.0001,at+.18);
  osc.connect(tone);tone.connect(this.effectsOutput!);noise.connect(filter);filter.connect(noiseGain);noiseGain.connect(this.effectsOutput!);
  osc.onended=()=>{osc.disconnect();tone.disconnect()};noise.onended=()=>{noise.disconnect();filter.disconnect();noiseGain.disconnect()};
  osc.start(at);osc.stop(at+.33);noise.start(at);noise.stop(at+.19);
 }
 private scheduleDiscovery(){
  if(this.effects<=0)return;
  const c=this.ctx!,output=this.effectsOutput!,start=Math.max(c.currentTime,this.discoveryQueueUntil);
  const notes=[523.25,659.25,783.99,1046.5,1318.51];
  for(let i=0;i<notes.length;i++){
   const at=start+i*.55,duration=i===notes.length-1?.8:.58;
   const oscillator=c.createOscillator(),gain=c.createGain();
   oscillator.type=i===notes.length-1?'sine':'triangle';
   oscillator.frequency.setValueAtTime(notes[i],at);
   gain.gain.setValueAtTime(.0001,at);
   gain.gain.exponentialRampToValueAtTime(.11,at+.045);
   gain.gain.setValueAtTime(.044,at+.28);
   gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
   oscillator.connect(gain);gain.connect(output);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
   oscillator.start(at);oscillator.stop(at+duration+.01);
  }
  this.discoveryQueueUntil=start+DISCOVERY_SOUND_DURATION;
 }
 update(speed:number,gear:number,throttle:number,paused:boolean,brake=0,engine?:Partial<Pick<Powertrain,'ratio'|'limiting'|'cutting'|'lugging'|'revMatchTime'|'revMatchPeak'|'revMatchEnvelope'>>){if(!this.ready||!this.ctx)return;const c=this.ctx,t=c.currentTime,spec=getVehicle(this.vehicle),v=Math.max(0,speed),ratio=v/spec.maxSpeed;
  const rev=engine?.ratio??(spec.gears===1?ratio:Math.max(0,Math.min(1,(v-(gear-1)*5)/7)));
  const revBlip=engine?.revMatchEnvelope??(engine&&engine.revMatchTime&&engine.revMatchTime>0?Math.sin(Math.PI*(1-engine.revMatchTime/ENGINE_TUNING.revMatchDuration)):0);
  for(const layer of this.layers){let gain=0,rate=1;
   if(layer.bank==='wind')gain=paused?0:this.ambience*(.06+ratio*.16);
   else if(layer.bank==='cg150'&&spec.audio==='cg150'&&!paused){
    // Throttle selects acceleration; releasing it (or braking) exposes the coast loop.
    // Both loops run continuously so switching never retriggers the recording.
    const gas=Math.max(0,Math.min(1,throttle))*(1-Math.max(0,Math.min(1,brake))),moving=Math.min(1,v/5),tuning=CG_AUDIO_TUNING;
    gain=this.volume*(layer.load?tuning.accelerationGain*Math.sqrt(gas):(tuning.idleGain+(tuning.coastGain-tuning.idleGain)*moving)*Math.sqrt(1-gas));
    rate=tuning.minRate+(tuning.maxRate-tuning.minRate)*Math.max(rev,gas*.3);layer.filter.frequency.setTargetAtTime(tuning.filter,t,.25);
   }
   else if(layer.bank===spec.audio&&!paused){const load=Math.min(1,throttle*.8+ratio*.2);gain=this.volume*(layer.load?.55*load:.42*(1-load*.7));rate=spec.pitch*(layer.load?.92+rev*.35:.85+rev*.25);layer.filter.frequency.setTargetAtTime(spec.filter,t,.25);}
   if(engine?.lugging&&layer.bank===spec.audio&&!paused){gain*=1.08;rate*=.94}
   if(revBlip>0&&layer.bank===spec.audio&&!paused){gain*=1+revBlip*ENGINE_TUNING.revMatchVolume;rate*=1+revBlip*.18;}
   const cutting=!!engine?.limiting&&!!engine.cutting&&!paused&&throttle>.25&&brake<.05;
   if(layer.bank!=='wind'&&cutting)gain*=ENGINE_TUNING.cutGain;
   layer.gain.gain.setTargetAtTime(gain,t,layer.bank!=='wind'&&engine?.limiting ? .008 : layer.bank==='cg150'?CG_AUDIO_TUNING.response:.16);layer.source.playbackRate.setTargetAtTime(rate,t,.2);
  }
 }
 horn(){if(!this.ready||!this.ctx||!this.hornBuffer)return;const c=this.ctx;if(c.currentTime-this.lastHorn<.4)return;this.lastHorn=c.currentTime;const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.hornBuffer;gain.gain.value=.7;source.connect(gain);gain.connect(this.effectsOutput!);source.start();source.onended=()=>{source.disconnect();gain.disconnect()};}
}
