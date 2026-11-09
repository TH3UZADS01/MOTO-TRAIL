import type {RemotePlayer} from './network';
import {getVehicle,type VehicleId} from './vehicles';
type Layer={source:AudioBufferSourceNode;gain:GainNode;filter:BiquadFilterNode;bank:'engine'|'moped'|'wind';load:boolean};
type Position={x:number;y:number;z:number};
type RemoteVoice={layers:Layer[];gain:GainNode;pan:StereoPannerNode;horns:Set<AudioBufferSourceNode>};
export class Sound {
 private buffers:AudioBuffer[]=[];private output?:DynamicsCompressorNode;private players:RemotePlayer[]=[];private voices=new Map<string,RemoteVoice>();
 setRemotePlayers(players:RemotePlayer[]){this.players=players;const live=new Set(players.filter(p=>p.connected).map(p=>p.id));for(const [id,v] of this.voices)if(!live.has(id)){for(const l of v.layers){l.source.stop();l.source.disconnect();l.filter.disconnect();l.gain.disconnect()}for(const h of v.horns)h.stop();v.gain.disconnect();v.pan.disconnect();this.voices.delete(id)}}
 private voice(id:string){let v=this.voices.get(id);if(v)return v;const c=this.ctx!,gain=c.createGain(),pan=c.createStereoPanner();gain.gain.value=0;gain.connect(pan);pan.connect(this.output!);v={layers:[],gain,pan,horns:new Set()};
  this.buffers.slice(0,4).forEach((buffer,i)=>{const source=c.createBufferSource(),g=c.createGain(),filter=c.createBiquadFilter();source.buffer=buffer;source.loop=true;g.gain.value=0;filter.type='lowpass';source.connect(filter);filter.connect(g);g.connect(gain);source.start();v!.layers.push({source,gain:g,filter,bank:i<2?'engine':'moped',load:i%2===1})});this.voices.set(id,v);return v;
 }
 updateRemotes(listener:Position,matrix:ArrayLike<number>,audible:boolean,peers:Map<string,{bike:{root:{position:Position}}}>){if(!this.ready||!this.ctx)return;const t=this.ctx.currentTime;
  for(const p of this.players){if(!p.connected)continue;const v=this.voice(p.id),s=p.state,spec=getVehicle(s.vehicleId),pos=peers.get(p.id)?.bike.root.position||s,dx=pos.x-listener.x,dy=pos.y-listener.y,dz=pos.z-listener.z,d=Math.hypot(dx,dy,dz);
   const attenuation=d>=90?0:Math.pow(1-d/90,2)/(1+d/12);v.gain.gain.setTargetAtTime(audible?this.volume*attenuation:0,t,.12);v.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,(dx*matrix[0]+dy*matrix[1]+dz*matrix[2])/Math.max(d,1))),t,.12);
   const speed=Math.max(0,s.speed),ratio=speed/spec.maxSpeed,gear=s.gear??Math.min(spec.gears,1+Math.floor(speed/6)),rev=spec.gears===1?ratio:Math.max(0,Math.min(1,(speed-(gear-1)*5)/7)),load=Math.min(1,(s.throttle??ratio)*.8+ratio*.2);
   for(const l of v.layers){l.gain.gain.setTargetAtTime(s.engineOn!==false&&l.bank===spec.audio?(l.load?.55*load:.42*(1-load*.7)):0,t,.16);l.source.playbackRate.setTargetAtTime(spec.pitch*(l.load?.92+rev*.35:.85+rev*.25),t,.2);l.filter.frequency.setTargetAtTime(spec.filter,t,.25)}
  }
 }
 remoteHorn(id:string){if(!this.ready||!this.ctx||!this.hornBuffer)return;const v=this.voices.get(id);if(!v||v.horns.size>=2)return;const source=this.ctx.createBufferSource();source.buffer=this.hornBuffer;source.connect(v.gain);v.horns.add(source);source.onended=()=>{source.disconnect();v.horns.delete(source)};source.start()}

 ctx?:AudioContext;volume=.5;ambience=.35;vehicle:VehicleId='pop';layers:Layer[]=[];ready=false;private loading?:Promise<void>;private hornBuffer?:AudioBuffer;private lastHorn=-1;
 async start(){
  if(!this.ctx)this.ctx=new AudioContext();await this.ctx.resume();
  if(this.ready)return;
  if(!this.loading)this.loading=this.load().catch(error=>{this.loading=undefined;throw error});
  await this.loading;
 }
 private async load(){const c=this.ctx!,names=['engine-idle','engine-load','moped-idle','moped-load','wind','horn'];
  const buffers=await Promise.all(names.map(async name=>{const response=await fetch(`/audio/${name}.wav`);if(!response.ok)throw new Error(`Não foi possível carregar ${name}`);return c.decodeAudioData(await response.arrayBuffer())}));
  this.buffers=buffers;
  const limiter=c.createDynamicsCompressor();this.output=limiter;limiter.threshold.value=-10;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.008;limiter.release.value=.2;limiter.connect(c.destination);
  buffers.slice(0,5).forEach((buffer,i)=>{const source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();source.buffer=buffer;source.loop=true;gain.gain.value=0;filter.type='lowpass';filter.frequency.value=i===4?700:1800;source.connect(filter);filter.connect(gain);gain.connect(limiter);source.start();this.layers.push({source,gain,filter,bank:i<2?'engine':i<4?'moped':'wind',load:i%2===1})});
  this.hornBuffer=buffers[5];this.ready=true;
 }
 update(speed:number,gear:number,throttle:number,paused:boolean){if(!this.ready||!this.ctx)return;const c=this.ctx,t=c.currentTime,spec=getVehicle(this.vehicle),v=Math.max(0,speed),ratio=v/spec.maxSpeed;
  const rev=spec.gears===1?ratio:Math.max(0,Math.min(1,(v-(gear-1)*5)/7));
  for(const layer of this.layers){let gain=0,rate=1;
   if(layer.bank==='wind')gain=paused?0:this.ambience*(.06+ratio*.16);
   else if(layer.bank===spec.audio&&!paused){const load=Math.min(1,throttle*.8+ratio*.2);gain=this.volume*(layer.load?.55*load:.42*(1-load*.7));rate=spec.pitch*(layer.load?.92+rev*.35:.85+rev*.25);layer.filter.frequency.setTargetAtTime(spec.filter,t,.25);}
   layer.gain.gain.setTargetAtTime(gain,t,.16);layer.source.playbackRate.setTargetAtTime(rate,t,.2);
  }
 }
 horn(){if(!this.ready||!this.ctx||!this.hornBuffer)return;const c=this.ctx;if(c.currentTime-this.lastHorn<.4)return;this.lastHorn=c.currentTime;const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.hornBuffer;gain.gain.value=this.volume*.7;source.connect(gain);gain.connect(this.output!);source.start();source.onended=()=>{source.disconnect();gain.disconnect()};}
}
