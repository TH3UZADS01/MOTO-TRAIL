import * as T from 'three';
import {createBike,disposeBike} from './vehicle-models';
import {nearestRoute,ground,deepWater,bridgeAt} from './terrain';
import {distance,type RegionCooldown,type Site} from './career';
import type {Obstacle} from './world';

export class Roadside{
 site:Site|null=null;kind=0;private bike?:ReturnType<typeof createBike>;private marker?:T.Mesh<T.OctahedronGeometry,T.MeshBasicMaterial>;private next=0;
 constructor(private scene:T.Scene){}
 clear(){if(this.bike){this.scene.remove(this.bike.root);disposeBike(this.bike);this.bike=undefined}this.site=null;this.next=performance.now()+12000}
 update(player:Site,camera:T.Camera,blocks:Obstacle[],accepted:Site|null,busy:boolean,cooldowns:RegionCooldown[]){
  const cooling=(p:Site)=>cooldowns.some(c=>c.until>Date.now()&&distance(c,p)<300);
  if(this.site&&!accepted&&cooling(this.site)){this.clear();return}
  if(this.site&&(distance(player,this.site)>360||busy&&!accepted||accepted&&distance(accepted,this.site)>1))this.clear();
  if(this.site)return;
  let site=accepted;
  if(site&&distance(site,player)>280)return;
  if(!site){
   if(busy||performance.now()<this.next)return;this.next=performance.now()+4500;
   const angle=Math.random()*Math.PI*2,r=70+Math.random()*150;
   const near=nearestRoute(player.x+r*Math.cos(angle),player.z+r*Math.sin(angle),80);
   if(near.distance>=80)return;
   const a=near.track.points[near.index],b=near.track.points[near.index+1],yaw=Math.atan2(b.x-a.x,b.z-a.z),side=(near.track.width/2+1)*(Math.random()<.5?-1:1);
   const x=near.x+side*Math.cos(yaw),z=near.z-side*Math.sin(yaw);site={x,z,name:'Motociclista'};
   const screen=new T.Vector3(x,ground(x,z)+1,z).project(camera);
   if(distance(player,site)<55||distance(player,site)>260||deepWater(x,z)||bridgeAt(x,z)||Math.abs(ground(x+1,z)-ground(x-1,z))>1||Math.abs(ground(x,z+1)-ground(x,z-1))>1||blocks.some(b=>distance(b,site!)<b.r+2)||cooling(site)||Math.abs(screen.x)<1.15&&Math.abs(screen.y)<1.15&&Math.abs(screen.z)<1)return;
   this.kind=Math.floor(Math.random()*3);
  }
  this.site=site;this.bike=createBike('urban');const root=this.bike.root;
  root.position.set(site.x,ground(site.x,site.z),site.z);const n=nearestRoute(site.x,site.z),a=n.track.points[n.index],b=n.track.points[n.index+1];root.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);
  this.marker=new T.Mesh(new T.OctahedronGeometry(.18),new T.MeshBasicMaterial({color:0xffc767}));this.marker.position.y=2.25;root.add(this.marker);this.scene.add(root);
 }
}
