import * as T from 'three';
import {ground,contactSurface} from './terrain';
import {blocked,type Obstacle} from './obstacle';
export type CrashKind='loop-out'|'collision'|'slide';
export const CRASH_TUNING={gravity:9.81,step:1/120,maxTravel:.12,friction:{asfalto:.48,terra:.38,cascalho:.32,areia:.55,lama:.24,grama:.30},sleepSpeed:.18};
const v=new T.Vector3(),normal=new T.Vector3(),q=new T.Quaternion();
/** One oriented box per body; corners and centre support uneven terrain. */
export class CrashBody {
 position=new T.Vector3();velocity=new T.Vector3();orientation=new T.Quaternion();angular=new T.Vector3();
 grounded=false;sleeping=false;quiet=0;
 constructor(public half=new T.Vector3(.38,.65,1),public center=new T.Vector3(0,.65,0),private readonly body:'bike'|'rider'='bike'){}
 clearance(floor=ground){
  let gap=Infinity;
  for(const x of [-1,0,1])for(const z of [-1,0,1])for(const y of [-1,1]){
   v.set(x*this.half.x,y*this.half.y,z*this.half.z).applyQuaternion(this.orientation).add(this.position);
   gap=Math.min(gap,v.y-floor(v.x,v.z));
  }return gap;
 }
 origin(target=new T.Vector3()){return target.copy(this.center).applyQuaternion(this.orientation).negate().add(this.position)}
 step(dt:number,obstacles:readonly Obstacle[],floor=ground,friction=(x:number,z:number)=>CRASH_TUNING.friction[contactSurface(x,z)]){
  if(this.sleeping||dt<=0)return;
  const count=Math.max(1,Math.ceil(dt/CRASH_TUNING.step),Math.ceil(this.velocity.length()*dt/CRASH_TUNING.maxTravel));
  const h=dt/count,r=Math.min(this.half.x,this.half.z);
  for(let i=0;i<count;i++){
   this.velocity.y-=CRASH_TUNING.gravity*h;
   const old=this.position.clone();this.position.addScaledVector(this.velocity,h);
   for(const o of obstacles){
    if(!blocked(o,this.position.x,this.position.z,r))continue;
    if(o.halfX!==undefined){
     const c=Math.cos(o.angle??0),s=Math.sin(o.angle??0),dx=old.x-o.x,dz=old.z-o.z;
     const lx=dx*c-dz*s,lz=dx*s+dz*c;
     if(Math.abs(lx)-(o.halfX??o.r)>Math.abs(lz)-(o.halfZ??o.r))normal.set(Math.sign(lx)*c,0,-Math.sign(lx)*s);
     else normal.set(Math.sign(lz)*s,0,Math.sign(lz)*c);
    }else normal.set(old.x-o.x,0,old.z-o.z).normalize();
    const closing=this.velocity.dot(normal);
    if(closing<0){this.position.x=old.x;this.position.z=old.z;this.velocity.addScaledVector(normal,-1.08*closing);this.angular.multiplyScalar(.65)}
   }
   const spin=this.angular.length();if(spin>0)this.orientation.premultiply(q.setFromAxisAngle(v.copy(this.angular).normalize(),spin*h)).normalize();
   const gap=this.clearance(floor);this.grounded=gap<=.003;
   if(this.grounded){
    this.position.y-=Math.min(0,gap);
    const e=.15,x=this.position.x,z=this.position.z;
    normal.set((floor(x-e,z)-floor(x+e,z))/(2*e),1,(floor(x,z-e)-floor(x,z+e))/(2*e)).normalize();
    const impact=this.velocity.dot(normal);
    if(impact<0)this.velocity.addScaledVector(normal,-impact*(impact<-2?1.08:1));
    const mu=friction(x,z);
    if(this.body==='rider'){
     // Scrubbing and tumbling resist motion along the ground, including downhill.
     const tangent=v.copy(this.velocity).addScaledVector(normal,-this.velocity.dot(normal));
     const speed=tangent.length();
     const deceleration=mu*(2.6*CRASH_TUNING.gravity+1.8*speed);
     if(speed>0)this.velocity.addScaledVector(tangent,-Math.min(1,deceleration*h/speed));
    }else{
     const speed=this.velocity.length(),loss=mu*CRASH_TUNING.gravity*h;
     this.velocity.multiplyScalar(Math.max(0,1-loss/Math.max(speed,.001)));
    }
    this.angular.multiplyScalar(Math.exp(-(Math.abs(new T.Vector3(0,1,0).applyQuaternion(this.orientation).y)>.45?1.3:3.8)*h));
    if(this.velocity.length()<CRASH_TUNING.sleepSpeed&&this.angular.length()<.12)this.quiet+=h;else this.quiet=0;
    if(this.quiet>.5){this.sleeping=true;this.velocity.set(0,0,0);this.angular.set(0,0,0);break}
   }else this.angular.multiplyScalar(Math.exp(-.08*h));
  }
 }
}
export class CrashState {
 bike=new CrashBody();rider?:CrashBody;elapsed=0;
 readonly incoming=new T.Vector3();readonly angular=new T.Vector3();
 constructor(public kind:CrashKind,position:T.Vector3,orientation:T.Quaternion,velocity:T.Vector3,angular:T.Vector3){
  this.incoming.copy(velocity);this.angular.copy(angular);
  this.bike.orientation.copy(orientation);this.bike.position.copy(this.bike.center).applyQuaternion(orientation).add(position);
  this.bike.velocity.copy(velocity);this.bike.angular.copy(angular);
 }
 detach(position:T.Vector3,orientation:T.Quaternion,center:T.Vector3,half:T.Vector3){
  const b=this.rider=new CrashBody(half,center,'rider');b.orientation.copy(orientation);b.position.copy(center).applyQuaternion(orientation).add(position);
  b.velocity.copy(this.incoming).add(v.copy(this.angular).cross(b.position.clone().sub(this.bike.position)));
  b.angular.copy(this.angular).multiplyScalar(.65);if(this.kind==='collision')b.angular.add(new T.Vector3(2,0,.8).applyQuaternion(orientation));
  return b;
 }
 step(dt:number,obstacles:readonly Obstacle[]){this.elapsed+=dt;this.bike.step(dt,obstacles);this.rider?.step(dt,obstacles)}
}
