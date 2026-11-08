import {getVehicle,type VehicleSpec} from './vehicles';
import {ground,nearest,road,surface,SIZE} from './terrain';
import type {Obstacle} from './world';
export const TOP_SPEED=80/3.6;
export function steeringAngle(speed:number,input:number){return input*.56/(1+(speed/5.8)**2);}
export function acceleration(speed:number,throttle:number,brake:number,pitch:number,grip:number){
  const drive=throttle*4.8*Math.max(0,1-speed/31);
  return drive-brake*8-.22-speed*speed*.002-9.81*Math.sin(pitch)-(1-grip)*1.7;
}
export class Ride {
  spec:VehicleSpec=getVehicle('pop');pushing=false;
  x=-310;z=0;heading=0;speed=0;steer=0;lean=0;pitch=0;distance=0;gear=1;y=ground(this.x,this.z);
  constructor(){this.recover()}
  contact(){const dx=Math.sin(this.heading),dz=Math.cos(this.heading),front=ground(this.x+dx*this.spec.wheelbase/2,this.z+dz*this.spec.wheelbase/2),rear=ground(this.x-dx*this.spec.wheelbase/2,this.z-dz*this.spec.wheelbase/2);this.pitch=Math.atan2(front-rear,this.spec.wheelbase);this.y=(front+rear)/2;}
  recover(){const n=nearest(this.x,this.z),p=road[n.index],q=road[n.index+1];this.x=p.x;this.z=p.z;this.heading=Math.atan2(q.x-p.x,q.z-p.z);this.speed=0;this.lean=0;this.steer=0;this.contact()}
  step(dt:number,throttle:number,brake:number,turn:number,obstacles:Obstacle[],push=false){
    const grip=surface(this.x,this.z)==='asfalto'?1:surface(this.x,this.z)==='terra'?.8:.55;
    this.steer+=(turn-this.steer)*(1-Math.exp(-dt*(10-this.speed*.2)));
    this.contact();
        this.pushing=push;
    if(push){
      if(this.speed>.2)this.speed=Math.max(0,this.speed-6*dt);
      else this.speed+=(-1.15-this.speed)*(1-Math.exp(-dt*5));
    }else if(this.speed<0){this.speed=Math.min(0,this.speed+3*dt);}
    else this.speed=Math.max(0,Math.min(this.spec.maxSpeed,this.speed+acceleration(this.speed,throttle*this.spec.power,brake,this.pitch,grip)*dt));
    const yaw=this.speed*Math.tan(steeringAngle(this.speed,this.steer))/this.spec.wheelbase*grip;
    this.heading+=yaw*dt;
    const x=this.x+Math.sin(this.heading)*this.speed*dt,z=this.z+Math.cos(this.heading)*this.speed*dt;
    const hit=Math.abs(x)>SIZE/2-30||Math.abs(z)>SIZE/2-30||obstacles.some(o=>{const next=(x-o.x)**2+(z-o.z)**2,old=(this.x-o.x)**2+(this.z-o.z)**2;return next<(o.r+.35)**2&&next<=old+1e-10;});
    if(hit)this.speed=0;else {this.x=x;this.z=z;this.distance+=Math.abs(this.speed)*dt}
    this.contact();this.lean+=(Math.max(-.45,Math.min(.45,-yaw*this.speed*.045))-this.lean)*(1-Math.exp(-dt*7));
    if(this.spec.gears===1)this.gear=1;
    // Hysteresis avoids repeated shifts and pitch jumps close to a threshold.
    if(this.gear<this.spec.gears&&this.speed>this.gear*5.5+.6)this.gear++;
    if(this.gear>1&&this.speed<(this.gear-1)*5.5-.8)this.gear--;
  }
}

