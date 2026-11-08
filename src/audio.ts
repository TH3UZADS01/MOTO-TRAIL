import {getVehicle,type VehicleId} from './vehicles';
type Layer={source:AudioBufferSourceNode;gain:GainNode;filter:BiquadFilterNode;bank:'engine'|'moped'|'wind';load:boolean};
export class Sound {
 ctx?:AudioContext;volume=.5;ambience=.35;vehicle:VehicleId='pop';layers:Layer[]=[];ready=false;private loading?:Promise<void>;private hornBuffer?:AudioBuffer;private lastHorn=-1;
 async start(){
  if(!this.ctx)this.ctx=new AudioContext();await this.ctx.resume();
  if(this.ready)return;
  if(!this.loading)this.loading=this.load().catch(error=>{this.loading=undefined;throw error});
  await this.loading;
 }
 private async load(){const c=this.ctx!,names=['engine-idle','engine-load','moped-idle','moped-load','wind','horn'];
  const buffers=await Promise.all(names.map(async name=>{const response=await fetch(`/audio/${name}.wav`);if(!response.ok)throw new Error(`Não foi possível carregar ${name}`);return c.decodeAudioData(await response.arrayBuffer())}));
  const limiter=c.createDynamicsCompressor();limiter.threshold.value=-10;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.008;limiter.release.value=.2;limiter.connect(c.destination);
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
 horn(){if(!this.ready||!this.ctx||!this.hornBuffer)return;const c=this.ctx;if(c.currentTime-this.lastHorn<.4)return;this.lastHorn=c.currentTime;const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.hornBuffer;gain.gain.value=.35;source.connect(gain);gain.connect(c.destination);source.start();source.onended=()=>{source.disconnect();gain.disconnect()};}
}
