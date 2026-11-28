import {cliffAt,deepWater,ground,SIZE} from './terrain';
import {blocked, type Obstacle} from './obstacle';
import type {Ride} from './riding';

export type TravelMode='RIDING'|'DISMOUNTING'|'WALKING'|'PUSHING'|'MOUNTING';
type Point={x:number;z:number};
const smooth=(v:number)=>v*v*(3-2*v);
const clamp=(x:number,min:number,max:number)=>Math.min(max,Math.max(min,x));
const approach=(a:number,b:number,k:number)=>a+(b-a)*k;
const face=(a:number,b:number,dt:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*(1-Math.exp(-12*dt));
export class OnFoot {
 mode:TravelMode='RIDING';x=0;y=0;z=0;heading=0;side=1;phase=0;stride=0;blend=0;hold=0;
 private clock=0;private velocity=0;private vertical=0;private anchor={x:0,z:0};
 get riding(){return this.mode==='RIDING'}
 private clear(x:number,z:number,r:number,obs:readonly Obstacle[]){
  return Math.max(Math.abs(x),Math.abs(z))<SIZE/2-30&&!cliffAt(x,z)&&!deepWater(x,z)&&!obs.some(o=>blocked(o,x,z,r));
 }
 private beside(b:Ride,side=this.side,heading=b.heading,x=b.x,z=b.z,pushing=false){
  const lateral=pushing?.47:.72,forward=pushing?-.06:b.spec.wheelbase*.09;
  return {x:x+side*lateral*Math.cos(heading)+forward*Math.sin(heading),z:z-side*lateral*Math.sin(heading)+forward*Math.cos(heading)};
 }
 near(b:Ride){return Math.hypot(this.x-b.x,this.z-b.z)<1.55}
 private passage(b:Ride,end:Point,obs:readonly Obstacle[]){
  for(let i=1;i<=6;i++){const t=i/6;if(!this.clear(approach(b.x,end.x,t),approach(b.z,end.z,t),.23,obs))return false}return true;
 }
 mount(b:Ride,obs:readonly Obstacle[]){
  if(this.riding){
   if(Math.abs(b.speed)>.12||b.fallen||b.burnoutSpeed>.2)return false;
   for(const side of [1,-1]){
    const p=this.beside(b,side);if(!this.passage(b,p,obs)||Math.abs(ground(p.x,p.z)-b.y)>.5)continue;
    this.side=side;this.anchor=p;this.mode='DISMOUNTING';this.clock=0;this.x=b.x;this.z=b.z;this.y=b.y;this.heading=b.heading;
    b.speed=0;b.steer=0;b.lean=0;b.brakeInput=0;b.resetBody();return true;
   }
  }else if(this.mode==='WALKING'&&this.near(b)&&this.passage(b,this,obs)){
   this.side=(this.x-b.x)*Math.cos(b.heading)-(this.z-b.z)*Math.sin(b.heading)>=0?1:-1;
   this.anchor={x:this.x,z:this.z};this.mode='MOUNTING';this.clock=1;this.stride=0;return true;
  }
  return false;
 }
 push(b:Ride,obs:readonly Obstacle[]){
  if(this.mode==='PUSHING'){this.mode='WALKING';this.velocity=0;b.speed=0;b.steer=0;return true}
  if(this.mode!=='WALKING'||!this.near(b))return false;
  this.side=(this.x-b.x)*Math.cos(b.heading)-(this.z-b.z)*Math.sin(b.heading)>=0?1:-1;
  const p=this.beside(b,this.side,b.heading,b.x,b.z,true);if(!this.passage(b,p,obs)||Math.hypot(p.x-this.x,p.z-this.z)>1.1)return false;
  for(let i=1;i<=5;i++)if(!this.clear(approach(this.x,p.x,i/5),approach(this.z,p.z,i/5),.23,obs))return false;
  this.anchor={x:this.x,z:this.z};this.clock=0;this.hold=0;this.mode='PUSHING';return true;
 }
 step(dt:number,b:Ride,forward:number,turn:number,obs:readonly Obstacle[],orbit=0,firstPerson=false){
  if(this.riding)return;
  if(this.mode==='DISMOUNTING'||this.mode==='MOUNTING'){
   this.clock=clamp(this.clock+dt/1.35*(this.mode==='DISMOUNTING'?1:-1),0,1);this.blend=smooth(this.clock);this.heading=face(this.heading,b.heading,dt);
   this.x=approach(b.x,this.anchor.x,this.blend);this.z=approach(b.z,this.anchor.z,this.blend);this.y=ground(this.x,this.z);
   if(this.clock===1)this.mode='WALKING';if(this.clock===0){this.mode='RIDING';this.hold=0}return;
  }
  let travel=0;
  if(this.mode==='PUSHING'){

   this.clock=Math.min(1,this.clock+dt/.45);this.hold=smooth(this.clock);this.heading=face(this.heading,b.heading,dt);
   const p=this.beside(b,this.side,b.heading,b.x,b.z,true);
   if(this.clock<1){this.x=approach(this.anchor.x,p.x,this.hold);this.z=approach(this.anchor.z,p.z,this.hold)}
   else{
    const mass=(b.spec.mass??100)+b.cargoLoad,grade=Math.sin(b.pitch)*Math.sign(forward);
    const speed=forward*(forward>0?1.35:.75)*clamp(1-grade*mass/34,.12,1.2);
    this.velocity=approach(this.velocity,speed,1-Math.exp(-dt*(forward?3:7)));
    b.steer=approach(b.steer,turn,1-Math.exp(-6*dt));
    const ds=this.velocity*dt,h=b.heading+ds*Math.tan(.52*b.steer)/b.spec.wheelbase;
    const x=b.x+Math.sin(h)*ds,z=b.z+Math.cos(h)*ds,walker=this.beside(b,this.side,h,x,z,true);
    const fits=[-.45,0,.45].every(t=>this.clear(x+Math.sin(h)*t*b.spec.wheelbase,z+Math.cos(h)*t*b.spec.wheelbase,.25,obs));
    if(fits&&this.clear(walker.x,walker.z,.23,obs)){b.x=x;b.z=z;b.heading=h;b.speed=this.velocity;b.contact();this.x=walker.x;this.z=walker.z;this.heading=h;travel=ds}
    else{b.speed=0;this.velocity=0}
   }
  }else{
   this.hold=Math.max(0,this.hold-dt*4);
   const h=b.heading+orbit,norm=Math.max(1,Math.hypot(turn,forward));
   const dx=(Math.sin(h)*forward+Math.cos(h)*turn)*2.25*dt/norm,dz=(Math.cos(h)*forward-Math.sin(h)*turn)*2.25*dt/norm;
   const can=(x:number,z:number)=>{const rx=x-b.x,rz=z-b.z;
    const side=rx*Math.cos(b.heading)-rz*Math.sin(b.heading),along=rx*Math.sin(b.heading)+rz*Math.cos(b.heading);
    return (Math.abs(side)>.40||Math.abs(along)>b.spec.wheelbase*.72)&&this.clear(x,z,.23,obs)&&ground(x,z)<this.y+.28};
   const prevX=this.x,prevZ=this.z;if(can(this.x+dx,this.z))this.x+=dx;if(can(this.x,this.z+dz))this.z+=dz;
   travel=Math.hypot(this.x-prevX,this.z-prevZ);
   if(firstPerson)this.heading=h;
   else if(travel>.0001)this.heading=face(this.heading,Math.atan2(dx,dz),dt);
  }
  const floor=ground(this.x,this.z);this.vertical-=9.81*dt;this.y=Math.max(floor,this.y+this.vertical*dt);if(this.y===floor)this.vertical=0;
  this.phase+=travel*6;this.stride=approach(this.stride,Math.min(1,Math.abs(travel)/dt),1-Math.exp(-12*dt));
 }
 reset(){this.mode='RIDING';this.blend=this.hold=this.velocity=this.stride=this.clock=0}
 snapshot(b:Ride){return {engineRunning:b.engine.running,id:b.spec.id,bx:b.x,bz:b.z,bh:b.heading,x:this.x,z:this.z,side:this.side,walking:!this.riding}}
 restore(b:Ride,s:Omit<ReturnType<OnFoot['snapshot']>,'engineRunning'>&{engineRunning?:boolean},obs:readonly Obstacle[]){
  if(!s||s.id!==b.spec.id||![s.bx,s.bz,s.bh,s.x,s.z].every(Number.isFinite)||!this.clear(s.bx,s.bz,.25,obs))return;
  b.engine.stop();if(s.engineRunning!==false&&b.equipment.motor>0&&b.fuel.get(b.spec.id)>0){b.engine.ignition='running';b.engine.rpm=b.spec.idleRpm}
  this.reset();b.x=s.bx;b.z=s.bz;b.heading=s.bh;b.speed=0;b.contact();this.side=s.side===-1?-1:1;
  if(s.walking){const p=this.clear(s.x,s.z,.23,obs)&&Math.hypot(s.x-b.x,s.z-b.z)>.45?s:this.beside(b);
   if(this.clear(p.x,p.z,.23,obs)){this.mode='WALKING';this.blend=1;this.x=p.x;this.z=p.z;this.y=ground(p.x,p.z);this.heading=b.heading}}
 }
}
