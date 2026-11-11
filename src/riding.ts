import {Powertrain,gearSpeedLimit} from './powertrain';
import {BODY_TUNING,bodyDragMultiplier,wheelieTarget,clamp} from './body-control';
import {Fuel} from './fuel';
import {getVehicle,type VehicleSpec} from './vehicles';
import {ground,nearestRoute,surface,SIZE,deepWater} from './terrain';
import type {Obstacle} from './world';
export const TOP_SPEED=100/3.6;
export const ACCELERATION_SCALE=.8; // 20% slower acceleration for every motorcycle.
export function steeringAngle(speed:number,input:number){return input*.56/(1+(speed/5.8)**2);}
export function acceleration(speed:number,throttle:number,brake:number,pitch:number,grip:number,aerodynamicDrag=.002){
  const drive=throttle*4.8*Math.max(0,1-speed/48);
  const net=drive-brake*8-.22-speed*speed*(aerodynamicDrag+(1-grip)*.012)-9.81*Math.sin(pitch)-(1-grip)*1.7;
  // Scale positive acceleration under power, preserving terminal speed, coasting and braking.
  return throttle>0&&brake===0&&net>0?net*ACCELERATION_SCALE:net;
}
export class Ride {
  engine=new Powertrain();
  get gear(){return this.engine.gear}
  set gear(value:number){this.engine.gear=value}
  fuel=new Fuel();spec:VehicleSpec=getVehicle('pop');pushing=false;brakeInput=0;private impact=0;
  bodyLean=0;wheelie=0;
  get topSpeed(){return this.spec.maxSpeed}
  resetBody(){this.bodyLean=0;this.wheelie=0;}
  takeImpact(){const impact=this.impact;this.impact=0;return impact}
  x=-310;z=0;heading=0;speed=0;steer=0;lean=0;pitch=0;distance=0;y=ground(this.x,this.z);
  constructor(){this.recover()}
  contact(){const dx=Math.sin(this.heading),dz=Math.cos(this.heading),front=ground(this.x+dx*this.spec.wheelbase/2,this.z+dz*this.spec.wheelbase/2),rear=ground(this.x-dx*this.spec.wheelbase/2,this.z-dz*this.spec.wheelbase/2);this.pitch=Math.atan2(front-rear,this.spec.wheelbase);this.y=(front+rear)/2;}
  recover(){const n=nearestRoute(this.x,this.z),p=n.track.points[n.index],q=n.track.points[n.index+1];this.x=p.x;this.z=p.z;this.heading=Math.atan2(q.x-p.x,q.z-p.z);this.speed=0;this.lean=0;this.steer=0;this.resetBody();this.engine.reset();this.contact()}
  step(dt:number,throttle:number,brake:number,turn:number,obstacles:Obstacle[],push=false,bodyInput=0,automatic=true){
    dt=clamp(dt,0,.1);this.brakeInput=brake;
    this.bodyLean+=(clamp(bodyInput,-1,1)-this.bodyLean)*(1-Math.exp(-BODY_TUNING.response*dt));
    throttle=Math.max(0,Math.min(1,throttle));if(this.fuel.get(this.spec.id)<=0)throttle=0;
    const before=this.distance;
    const type=surface(this.x,this.z),grip=type==='asfalto'?1:type==='terra'?.7:.5;
    this.steer+=(turn-this.steer)*(1-Math.exp(-dt*(10-this.speed*.2)/(this.spec.stability??1)));
    this.contact();
    this.pushing=push;
    this.engine.update(dt,this.speed,this.spec,this.topSpeed,throttle,brake,push,automatic);
    const speedLimit=automatic?this.topSpeed:gearSpeedLimit(this.spec.gears,this.engine.gear,this.topSpeed);
    if(push){
      if(this.speed>.2)this.speed=Math.max(0,this.speed-6*dt);
      else this.speed+=(-1.15-this.speed)*(1-Math.exp(-dt*5));
    }else if(this.speed<0){this.speed=Math.min(0,this.speed+3*dt);}
    else if(this.speed<.15&&throttle===0){this.speed=0;}
    else {
      const gearThrottle=!automatic&&this.speed>=speedLimit?0:throttle;
      const nextSpeed=this.speed+acceleration(this.speed,gearThrottle*this.engine.driveFactor*this.spec.power*100/(this.spec.mass??100),brake*grip*(this.spec.braking??1),this.pitch,grip,this.spec.aerodynamicDrag*bodyDragMultiplier(this.bodyLean))*dt;
      this.speed=Math.max(0,Math.min(this.speed>speedLimit?this.speed:speedLimit,nextSpeed));
    }
    // Front-wheel steering has less authority while lifted; retain assisted balance.
    const steeringGrip=1-(1-BODY_TUNING.wheelieSteering)*this.wheelie/BODY_TUNING.maxWheelie;
    const yaw=this.speed*Math.tan(steeringAngle(this.speed,this.steer))/this.spec.wheelbase*grip*steeringGrip;
    this.heading+=yaw*dt;
    const x=this.x+Math.sin(this.heading)*this.speed*dt,z=this.z+Math.cos(this.heading)*this.speed*dt;
    const hit=deepWater(x,z)||Math.abs(x)>SIZE/2-30||Math.abs(z)>SIZE/2-30||obstacles.some(o=>{const next=(x-o.x)**2+(z-o.z)**2,old=(this.x-o.x)**2+(this.z-o.z)**2;return next<(o.r+.35)**2&&next<=old+1e-10;});
    if(hit){this.wheelie=0;this.impact=Math.max(this.impact,Math.abs(this.speed));this.speed=0;}else {this.x=x;this.z=z;this.distance+=Math.abs(this.speed)*dt}
    const lift=hit?0:wheelieTarget(this.bodyLean,this.speed,throttle,brake,push);
    this.wheelie=clamp(this.wheelie+(lift-this.wheelie)*(1-Math.exp(-dt*(lift<this.wheelie?BODY_TUNING.landingResponse:BODY_TUNING.wheelieResponse))),0,BODY_TUNING.maxWheelie);
    this.fuel.consume(this.spec.id,this.distance-before,dt,throttle,this.speed,this.pitch,push);
    this.contact();this.lean+=(Math.max(-.45,Math.min(.45,-yaw*this.speed*.045))-this.lean)*(1-Math.exp(-dt*7));

  }
}
