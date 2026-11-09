import {enableShadows} from './graphics';
import * as T from 'three';
import {createBike,disposeBike} from './vehicle-models';
import type {RemotePlayer,RiderState} from './network';
import {ground} from './terrain';
type Frame={time:number;state:RiderState};
type Peer={bike:ReturnType<typeof createBike>;label:T.Sprite;frames:Frame[];name:string;connected:boolean;vehicleId:string};
export class RemoteRiders {
 peers=new Map<string,Peer>();
 constructor(private scene:T.Scene){}
 private label(text:string){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d')!;c.fillStyle='#173c37dd';c.fillRect(0,0,512,96);c.font='bold 36px sans-serif';c.textAlign='center';c.fillStyle='#fff2cf';c.fillText(text,256,61,480);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false}));sprite.scale.set(2.5,.47,1);sprite.renderOrder=2;return sprite}
 update(players:RemotePlayer[],now=performance.now()){
  const live=new Set(players.map(p=>p.id));for(const [id,p] of this.peers)if(!live.has(id))this.remove(id,p);
  for(const p of players){let peer=this.peers.get(p.id);
   if(peer&&peer.vehicleId!==p.state.vehicleId){this.remove(p.id,peer);peer=undefined}
   if(!peer){const bike=createBike(p.state.vehicleId),label=this.label(p.name);enableShadows(bike.root);this.scene.add(bike.root,label);peer={bike,label,frames:[],name:p.name,connected:p.connected,vehicleId:p.state.vehicleId};this.peers.set(p.id,peer)}
   if(peer.name!==p.name||peer.connected!==p.connected){this.scene.remove(peer.label);peer.label.material.map?.dispose();peer.label.material.dispose();peer.label=this.label(p.name+(p.connected?'':' · reconectando'));this.scene.add(peer.label);peer.name=p.name;peer.connected=p.connected;}
   peer.frames.push({time:now,state:{...p.state,y:ground(p.state.x,p.state.z)}});if(peer.frames.length>20)peer.frames.shift();
  }
 }
 private remove(id:string,p:Peer){this.scene.remove(p.bike.root,p.label);disposeBike(p.bike);p.label.material.map?.dispose();p.label.material.dispose();this.peers.delete(id)}
 clear(){for(const [id,p] of this.peers)this.remove(id,p)}
 render(now:number,dt:number){const target=now-120;
  for(const p of this.peers.values()){const frames=p.frames;if(!frames.length)continue;while(frames.length>2&&frames[1].time<target)frames.shift();const a=frames[0],b=frames[1]||a,t=T.MathUtils.clamp((target-a.time)/Math.max(1,b.time-a.time),0,1),s=a.state,e=b.state;
   const teleport=Math.hypot(s.x-e.x,s.z-e.z)>12,u=teleport?1:t;
   p.bike.root.position.set(T.MathUtils.lerp(s.x,e.x,u),T.MathUtils.lerp(s.y,e.y,u),T.MathUtils.lerp(s.z,e.z,u));
   p.bike.root.rotation.y=s.heading+Math.atan2(Math.sin(e.heading-s.heading),Math.cos(e.heading-s.heading))*u;
   p.bike.body.rotation.set(-T.MathUtils.lerp(s.pitch,e.pitch,u),0,T.MathUtils.lerp(s.lean,e.lean,u));p.bike.steering.rotation.y=e.steer*.2;
   for(const wheel of p.bike.wheels)wheel.rotation.x+=(p.connected?e.speed:0)*dt/.28;
   p.label.position.copy(p.bike.root.position);p.label.position.y+=2.1;
  }
 }
}
