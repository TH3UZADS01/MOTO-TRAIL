import {ENGINE_TUNING} from './powertrain';
import {TireParticles} from './tire-particles';
import {applyBikePose} from './bike-pose';
import {steeringAngle} from './riding';
import {applyBikeColor,DEFAULT_COLORS} from './paint';
import {enableShadows} from './graphics';
import * as T from 'three';
import {createBike,disposeBike} from './vehicle-models';
import type {RemotePlayer,RiderState} from './network';
import {ground} from './terrain';
type Frame={time:number;state:RiderState};
type Peer={blipTime:number;blipSequence:number;smoke:TireParticles;bike:ReturnType<typeof createBike>;label:T.Sprite;frames:Frame[];name:string;connected:boolean;vehicleId:string};
export class RemoteRiders {
 peers=new Map<string,Peer>();
 constructor(private scene:T.Scene){}
 private label(text:string){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d')!;c.fillStyle='#173c37dd';c.fillRect(0,0,512,96);c.font='bold 36px sans-serif';c.textAlign='center';c.fillStyle='#fff2cf';c.fillText(text,256,61,480);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false}));sprite.scale.set(2.5,.47,1);sprite.renderOrder=2;return sprite}
 update(players:RemotePlayer[],now=performance.now()){
  const live=new Set(players.map(p=>p.id));for(const [id,p] of this.peers)if(!live.has(id))this.remove(id,p);
  for(const p of players){let peer=this.peers.get(p.id);
   if(peer&&peer.vehicleId!==p.state.vehicleId){this.remove(p.id,peer);peer=undefined}
   if(!peer){const bike=createBike(p.state.vehicleId),label=this.label(p.name);enableShadows(bike.root);this.scene.add(bike.root,label);peer={blipTime:0,blipSequence:p.state.revMatchSequence??0,smoke:new TireParticles(this.scene),bike,label,frames:[],name:p.name,connected:p.connected,vehicleId:p.state.vehicleId};this.peers.set(p.id,peer)}
   if(peer.name!==p.name||peer.connected!==p.connected){this.scene.remove(peer.label);peer.label.material.map?.dispose();peer.label.material.dispose();peer.label=this.label(p.name+(p.connected?'':' · reconectando'));this.scene.add(peer.label);peer.name=p.name;peer.connected=p.connected;}
   const sequence=p.state.revMatchSequence??0;if(sequence>peer.blipSequence&&p.connected)peer.blipTime=ENGINE_TUNING.revMatchDuration;peer.blipSequence=sequence;
   applyBikeColor(peer.bike,p.state.color||DEFAULT_COLORS[p.state.vehicleId]);
   peer.bike.pet.setUnlocked(!!p.state.petUnlocked&&!p.state.fallen);
   peer.frames.push({time:now,state:{...p.state,y:ground(p.state.x,p.state.z)}});if(peer.frames.length>20)peer.frames.shift();
  }
 }
 private remove(id:string,p:Peer){this.scene.remove(p.bike.root,p.label);disposeBike(p.bike);p.smoke.dispose();p.label.material.map?.dispose();p.label.material.dispose();this.peers.delete(id)}
 clear(){for(const [id,p] of this.peers)this.remove(id,p)}
 render(now:number,dt:number,night=0){const target=now-120;
  for(const p of this.peers.values()){const frames=p.frames;if(!frames.length)continue;while(frames.length>2&&frames[1].time<target)frames.shift();const a=frames[0],b=frames[1]||a,t=T.MathUtils.clamp((target-a.time)/Math.max(1,b.time-a.time),0,1),s=a.state,e=b.state;
   p.blipTime=Math.max(0,p.blipTime-dt);const blip=p.connected&&!e.fallen?ENGINE_TUNING.blipThrottle*Math.sin(Math.PI*(1-p.blipTime/ENGINE_TUNING.revMatchDuration)):0;
   const teleport=Math.hypot(s.x-e.x,s.z-e.z)>12,u=teleport?1:t;
   p.bike.root.position.set(T.MathUtils.lerp(s.x,e.x,u),T.MathUtils.lerp(s.y,e.y,u),T.MathUtils.lerp(s.z,e.z,u));
   p.bike.root.rotation.y=s.heading+Math.atan2(Math.sin(e.heading-s.heading),Math.cos(e.heading-s.heading))*u;
   p.bike.headlight.update(night);p.bike.brakeLight.update(p.connected?T.MathUtils.lerp(Number(s.braking??false),Number(e.braking??false),u):0,dt);p.bike.steering.rotation.y=steeringAngle(e.speed,e.steer);p.bike.riderRig.update(p.connected?e.speed:0,e.steer,dt,false,T.MathUtils.lerp(s.bodyLean??0,e.bodyLean??0,u),blip,!!e.fallen,T.MathUtils.lerp(s.wheelie??0,e.wheelie??0,u));applyBikePose(p.bike,T.MathUtils.lerp(s.pitch,e.pitch,u),T.MathUtils.lerp(s.lean,e.lean,u),T.MathUtils.lerp(s.wheelie??0,e.wheelie??0,u),p.bike.riderRig.stopPose);
   p.bike.pet.update(T.MathUtils.lerp(s.bodyLean??0,e.bodyLean??0,u), Number(e.braking??false), dt);
   for(const wheel of p.bike.wheels)if(!(e.drifting&&wheel===p.bike.wheels[0]))wheel.rotation.x+=(p.connected?e.speed:0)*dt/.28;
   p.smoke.update('asfalto',p.connected?e.speed:0,p.bike.wheels[0],e.heading,dt,!!e.drifting&&p.connected&&!e.fallen);
   p.label.position.copy(p.bike.root.position);p.label.position.y+=2.1;
  }
 }
}
