import * as T from 'three';
import type {createBike} from './vehicle-models';
import type {Ride} from './riding';
import type {OnFoot} from './on-foot';
import {ground} from './terrain';
type Bike=ReturnType<typeof createBike>;
const contactVertices=new WeakMap<T.BufferGeometry,T.Vector3[]>();
const contactPoint=new T.Vector3();
function riderClearance(root:T.Object3D){
 let gap=Infinity;
 root.updateWorldMatrix(true,true);
 root.traverseVisible(part=>{
  if(!(part instanceof T.Mesh))return;
  let vertices=contactVertices.get(part.geometry);
  if(!vertices){
   vertices=[];const seen=new Set<string>(),positions=part.geometry.getAttribute('position');
   for(let i=0;i<positions.count;i++){
    contactPoint.fromBufferAttribute(positions,i);
    const key=contactPoint.toArray().join(',');
    if(!seen.has(key)){seen.add(key);vertices.push(contactPoint.clone())}
   }
   contactVertices.set(part.geometry,vertices);
  }
  for(const vertex of vertices){
   const p=contactPoint.copy(vertex).applyMatrix4(part.matrixWorld);
   gap=Math.min(gap,p.y-ground(p.x,p.z));
  }
 });
 return gap;
}
export class CrashView {
 private detached?:Bike;private stand=0;private released=false;private touchedGround=false;
 reset(){if(this.detached){this.detached.body.attach(this.detached.rider);this.detached=undefined}this.stand=0;this.released=false;this.touchedGround=false}
 update(b:Bike,r:Ride,scene:T.Scene,foot:OnFoot,dt:number){
  const c=r.crash;if(!r.fallen||!c){this.reset();return}
  if(!this.detached){
   b.root.updateMatrixWorld(true);scene.attach(b.rider);this.detached=b;
   const box=new T.Box3();b.rider.updateMatrixWorld(true);
   // Bound mesh vertices in rider-local coordinates, including the helmet.
   const inverse=b.rider.matrixWorld.clone().invert();
   b.rider.traverse(o=>{if(o instanceof T.Mesh){const a=o.geometry.getAttribute('position');const m=inverse.clone().multiply(o.matrixWorld);for(let i=0;i<a.count;i++)box.expandByPoint(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(m))}});
   const center=box.getCenter(new T.Vector3()),half=box.getSize(new T.Vector3()).multiplyScalar(.5);
   half.x=Math.max(.40,half.x);half.y=Math.max(.85,half.y);half.z=Math.max(.43,half.z);
   c.detach(b.rider.position,b.rider.quaternion,center,half);
   // The contact point on a fallen bike depends on its bars, engine and luggage.
   // Measure both sides in chassis space once, with the rider already detached.
   const chassisInverse=b.body.matrixWorld.clone().invert(),matrix=new T.Matrix4();
   let left=Infinity,right=-Infinity;
   b.body.traverseVisible(o=>{
    if(!(o instanceof T.Mesh))return;
    const vertices=o.geometry.getAttribute('position');
    const m=matrix.multiplyMatrices(chassisInverse,o.matrixWorld).elements;
    for(let i=0;i<vertices.count;i++){
     const x=m[0]*vertices.getX(i)+m[4]*vertices.getY(i)+m[8]*vertices.getZ(i)+m[12];
     left=Math.min(left,x);right=Math.max(right,x);
    }
   });
   if(right>left){
    const body=c.bike,origin=body.origin();
    body.center.x=(right+left)/2;body.half.x=(right-left)/2;
    body.position.copy(body.center).applyQuaternion(body.orientation).add(origin);
   }
  }
  b.root.position.set(0,0,0);b.root.quaternion.identity();b.body.position.copy(c.bike.origin());b.body.quaternion.copy(c.bike.orientation);
  if(this.released)return;
  const pilot=c.rider!;b.rider.position.copy(pilot.origin());b.rider.quaternion.copy(pilot.orientation);b.riderRig.accident(dt,pilot.grounded);
  if(pilot.sleeping){
   this.stand=Math.min(1,this.stand+dt/1.6);
   const t=this.stand*this.stand*(3-2*this.stand),upright=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),r.heading);
   b.rider.quaternion.slerp(upright,t);
   // Raise the body while getting up so rotated limbs cannot sink through the floor.
   const target=new T.Vector3(pilot.position.x,ground(pilot.position.x,pilot.position.z),pilot.position.z);
   b.rider.position.lerp(target,t);
   if(this.stand===1){
    foot.mode='WALKING';foot.blend=1;foot.hold=0;foot.x=target.x;foot.y=target.y;foot.z=target.z;foot.heading=r.heading;
    b.body.attach(b.rider);this.released=true;return;
   }
  }
  if(dt>0){
   const gap=riderClearance(b.rider);
   this.touchedGround ||= pilot.grounded;
   // Keep genuine airtime, but remove the space between the animated limbs and the collider.
   const separation=this.touchedGround?Math.max(0,pilot.clearance())+.002:Math.max(.002,gap);
   if(Number.isFinite(gap))b.rider.position.y+=separation-gap;
  }
 }
 get active(){return !!this.detached&&!this.released}
}
