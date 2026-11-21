import * as T from 'three';
import {adventure} from './adventure-tuning';
import {bridgeAt,deepWater,ground,nearestRoute,pois} from './terrain';
import type {Obstacle} from './world';
import type {Site} from './career';

const config=adventure.events;
type Point=Pick<Site,'x'|'z'>;
type Kind='log'|'closure'|'rocks'|'slide'|'sand';
const kinds:Kind[]=['log','closure','rocks','slide','sand'];
export type RoadNotice={kind:Kind;x:number;z:number;angle:number;region:string};
type Event={kind:Kind;group:T.Group;hits:Obstacle[];until:number;region:string};
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);

export class RoadEvents{
 readonly active:Event[]=[];
 readonly hits:Obstacle[]=[];
 private elapsed=0;
 private next=1;
 private sequence=0;
 private recent=new Map<string,number>();
 private pool=new Map<Kind,T.Group[]>();
 private geometry=new Map<string,T.BufferGeometry>();
 private materials=new Map<number,T.MeshStandardMaterial>();
 constructor(private scene:T.Scene){}
 private object(kind:Kind){
  const cached=this.pool.get(kind)?.pop();if(cached)return cached;
  const group=new T.Group();group.name='Evento · '+kind;
  const piece=(shape:string,color:number,x:number,y:number,z:number,w:number,h:number,d:number)=>{
   let geo=this.geometry.get(shape);
   if(!geo){
    geo=shape==='box'?new T.BoxGeometry():shape==='cone'?new T.ConeGeometry(.5,1,8):shape==='log'?new T.CylinderGeometry(.5,.5,1,8):new T.DodecahedronGeometry(.5);
    this.geometry.set(shape,geo);
   }
   if(!this.materials.has(color))this.materials.set(color,new T.MeshStandardMaterial({color,roughness:.95}));
   const m=new T.Mesh(geo,this.materials.get(color));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
  };
  if(kind==='log'){
   piece('log',0x65503c,0,.24,0,.48,2.35,.48).rotation.z=Math.PI/2;
   piece('log',0x66543e,-.25,.38,.20,.17,.8,.17).rotation.x=.9;
  }else if(kind==='closure'){
   piece('box',0xe8ac54,0,.65,0,1.75,.22,.14);
   for(const x of [-.67,.67]){piece('box',0x785f48,x,.34,0,.12,.66,.18);piece('cone',0xe77a31,x,.24,1.1,.43,.48,.43)}
  }else if(kind==='sand')piece('rock',0xe1c78d,0,.04,0,2.5,.15,6);
  else{
   if(kind==='slide')piece('rock',0xaa7953,0,.08,0,2.6,.58,3.6);
   for(const [x,z,r] of [[-.55,-.6,.63],[.45,.45,.74],[.1,1.15,.46]])piece('rock',0x786f60,x,r*.25,z,r,r*.82,r);
  }
  return group;
 }
 private remove(index:number){
  const [e]=this.active.splice(index,1);this.scene.remove(e.group);
  if(!this.pool.has(e.kind))this.pool.set(e.kind,[]);this.pool.get(e.kind)!.push(e.group);
  this.hits.length=0;for(const other of this.active)this.hits.push(...other.hits);
 }
 onSand(p:Point){return this.active.some(e=>e.kind==='sand'&&dist(p,e.group.position)<1.4)}
 update(dt:number,p:Point,heading:number,fixed:Obstacle[],protectedPoints:readonly Point[],peers:Iterable<{bike:{root:{position:Point}}}>=[],propose?:(e:RoadNotice)=>void){
  this.elapsed+=dt;
  for(let i=this.active.length-1;i>=0;i--){
   const e=this.active[i];
   if(e.until<=this.elapsed||dist(p,e.group.position)>config.removeDistance||protectedPoints.some(q=>dist(q,e.group.position)<config.clearance))this.remove(i);
  }
  if(this.elapsed<this.next)return;
  this.next=this.elapsed+config.interval;
  for(const [key,end] of this.recent)if(end<=this.elapsed)this.recent.delete(key);
  if(this.active.length>=config.max)return;
  const riders=Array.from(peers,peer=>peer.bike.root.position);
  const n=nearestRoute(p.x,p.z),points=n.track.points;
  const a=points[n.index],b=points[n.index+1];
  const forward=(b.x-a.x)*Math.sin(heading)+(b.z-a.z)*Math.cos(heading)>=0?1:-1;
  for(const offset of [58,82,100,-66,-88]){
   const i=n.index+offset*forward;
   if(i<2||i+2>=points.length)continue;
   const q=points[i],t=points[i+1],angle=Math.atan2(t.x-q.x,t.z-q.z);
   const side=(i%2?1:-1)*n.track.width*.28;
   const x=q.x+side*Math.cos(angle),z=q.z-side*Math.sin(angle),at={x,z},range=dist(p,at);
   const region=Math.floor(x/config.regionSize)+','+Math.floor(z/config.regionSize);
   const ahead=((x-p.x)*Math.sin(heading)+(z-p.z)*Math.cos(heading))/range;
   if(range<config.sightDistance&&ahead>.95)continue;
   if(riders.some(r=>dist(r,at)<config.minDistance)||range<config.minDistance||range>config.spawnRange||this.recent.has(region)||n.track.width<5||bridgeAt(x,z)||deepWater(x,z))continue;
   if(pois.some(v=>dist(v,at)<config.clearance)||protectedPoints.some(v=>dist(v,at)<config.clearance)||fixed.some(o=>dist(o,at)<o.r+4))continue;
   const kind=kinds[(this.sequence++ + Math.floor(Math.abs(q.x+q.z)/config.regionSize))%kinds.length];
   this.recent.set(region,this.elapsed+config.regionCooldown);
   const notice={kind,x,z,angle,region};
   if(propose)propose(notice);else this.place(notice,this.elapsed+config.lifetime+Math.random()*config.extraLifetime);
   return;
  }
 }
 private place({kind,x,z,angle,region}:RoadNotice,until:number){
   const group=this.object(kind);group.position.set(x,ground(x,z),z);group.rotation.y=angle;this.scene.add(group);
   const hits:Obstacle[]=[];
   const hit=(lx:number,lz:number,r:number)=>hits.push({x:x+lx*Math.cos(angle)+lz*Math.sin(angle),z:z+lz*Math.cos(angle)-lx*Math.sin(angle),r});
   if(kind==='log'||kind==='closure')for(const dx of [-.8,0,.8])hit(dx,0,.43);
   if(kind==='closure'){hit(-.67,1.1,.23);hit(.67,1.1,.23)}
   if(kind==='rocks'||kind==='slide'){hit(-.55,-.6,.38);hit(.45,.45,.4);hit(.1,1.15,.26);if(kind==='slide')hit(0,0,.9)}
   this.active.push({kind,group,hits,until:until,region});
   this.hits.push(...hits);
 }
 clear(){while(this.active.length)this.remove(0);this.recent.clear();this.next=this.elapsed+1}
 sync(notices:readonly RoadNotice[],player:Point,objective?:Point){
  const visible=notices.filter(e=>dist(e,player)<=config.removeDistance&&(!objective||dist(e,objective)>=config.clearance));
  for(let i=this.active.length-1;i>=0;i--)if(!visible.some(e=>e.region===this.active[i].region))this.remove(i);
  for(const e of visible)if(!this.active.some(a=>a.region===e.region)&&dist(e,player)>4)this.place(e,Infinity);
 }
 dispose(){
  while(this.active.length)this.remove(0);
  this.pool.clear();for(const g of this.geometry.values())g.dispose();for(const m of this.materials.values())m.dispose();
  this.geometry.clear();this.materials.clear();this.recent.clear();
 }
}
