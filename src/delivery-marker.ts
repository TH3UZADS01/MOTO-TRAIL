import * as T from 'three';
import {DELIVERY_RADIUS, type Site} from './career';
import {ground} from './terrain';

export function makeDeliveryMarker(scene:T.Scene){
 const marker=new T.Group();
 const gold=new T.MeshBasicMaterial({color:0xffc53d,side:T.DoubleSide,toneMapped:false});
 const ring=new T.RingGeometry(DELIVERY_RADIUS-.35,DELIVERY_RADIUS,64);
 ring.rotateX(-Math.PI/2);
 marker.add(new T.Mesh(ring,gold));
 const arrow=new T.Mesh(new T.ConeGeometry(1.15,2.5,4),gold);
 arrow.rotation.z=Math.PI;
 marker.add(arrow);
 marker.visible=false;
 scene.add(marker);
 return (site:Site|null,time:number)=>{
  if(site&&(!marker.visible||marker.position.x!==site.x||marker.position.z!==site.z)){
   const y=ground(site.x,site.z);
   marker.position.set(site.x,y,site.z);
   const vertices=ring.attributes.position;
   for(let i=0;i<vertices.count;i++){
    vertices.setY(i,ground(site.x+vertices.getX(i),site.z+vertices.getZ(i))-y+.18);
   }
   vertices.needsUpdate=true;
   ring.computeBoundingSphere();
  }
  marker.visible=!!site;
  arrow.position.y=6+.45*Math.sin(time*.003);
 };
}
