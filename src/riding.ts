import {Powertrain} from './powertrain';
import {BODY_TUNING,bodyDragMultiplier,clamp} from './body-control';
import {Fuel} from './fuel';
import {getVehicle,type VehicleSpec} from './vehicles';
import {ground,nearestRoute,surface,SIZE,deepWater} from './terrain';
import type {Obstacle} from './world';
export const TOP_SPEED=100/3.6;
export const ACCELERATION_SCALE=.8; // 20% slower acceleration for every motorcycle.
export interface WheelieDebugState {gear:number;rpm:number;wheelTorque:number;pitchTorque:number;stabilizingTorque:number;angle:number}
export function steeringAngle(speed:number,input:number){return input*.56/(1+(speed/5.8)**2);}
export function automaticTuckInput(input:number,speed:number,topSpeed:number){return clamp(input+Math.min(1,Math.max(0,speed)/(topSpeed*.8)),-1,1);}
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
  fuel=new Fuel();spec:VehicleSpec=getVehicle('pop');pushing=false;brakeInput=0;fallen=false;private impact=0;private fallTimer=0;private wheelieAngularVelocity=0;
  bodyLean=0;wheelie=0;wheelieDebug:WheelieDebugState={gear:1,rpm:0,wheelTorque:0,pitchTorque:0,stabilizingTorque:0,angle:0};
  get topSpeed(){return this.spec.maxSpeed}
   resetBody(){this.bodyLean=0;this.wheelie=0;this.wheelieAngularVelocity=0;this.engine.resetClutchKick();}
  takeImpact(){const impact=this.impact;this.impact=0;return impact}
  x=-310;z=0;heading=0;speed=0;steer=0;lean=0;pitch=0;distance=0;y=ground(this.x,this.z);
  constructor(){this.recover()}
  contact(){const dx=Math.sin(this.heading),dz=Math.cos(this.heading),front=ground(this.x+dx*this.spec.wheelbase/2,this.z+dz*this.spec.wheelbase/2),rear=ground(this.x-dx*this.spec.wheelbase/2,this.z-dz*this.spec.wheelbase/2);this.pitch=Math.atan2(front-rear,this.spec.wheelbase);this.y=(front+rear)/2;}
  recover(){const n=nearestRoute(this.x,this.z),p=n.track.points[n.index],q=n.track.points[n.index+1];this.x=p.x;this.z=p.z;this.heading=Math.atan2(q.x-p.x,q.z-p.z);this.speed=0;this.lean=0;this.steer=0;this.fallen=false;this.fallTimer=0;this.resetBody();this.engine.reset();this.contact()}
  step(dt:number,throttle:number,brake:number,turn:number,obstacles:Obstacle[],push=false,bodyInput=0,automatic=true,realistic=false){
    dt=clamp(dt,0,.1);this.brakeInput=brake;
    if(this.fallen){
      this.fallTimer+=dt;this.speed*=Math.exp(-4*dt);this.engine.update(dt,this.speed,this.spec,this.topSpeed,0,1,false,automatic,realistic);
      this.wheelie=Math.max(this.wheelie,BODY_TUNING.loopOutAngle+Math.min(.3,this.fallTimer*.5));
      this.lean+=(Math.sign(this.lean||1)*.8-this.lean)*(1-Math.exp(-dt*3));this.contact();return;
    }
    this.bodyLean+=(clamp(bodyInput,-1,1)-this.bodyLean)*(1-Math.exp(-BODY_TUNING.response*dt));
    throttle=Math.max(0,Math.min(1,throttle));if(this.fuel.get(this.spec.id)<=0)throttle=0;
    const before=this.distance;
    const type=surface(this.x,this.z),grip=type==='asfalto'?1:type==='terra'?.7:.5;
    this.steer+=(turn-this.steer)*(1-Math.exp(-dt*(10-this.speed*.2)/(this.spec.stability??1)));
    this.contact();
    this.pushing=push;
    this.engine.update(dt,this.speed,this.spec,this.topSpeed,throttle,brake,push,automatic,realistic);
     this.engine.updateClutchKick(dt,this.spec,this.speed,throttle,brake,bodyInput,this.wheelie<BODY_TUNING.airborneThreshold,push);
    const gearMax=this.engine.speedAtRedline(this.spec,this.engine.gear);
    const speedLimit=Math.min(this.topSpeed,gearMax);
    if(push){
      if(this.speed>.2)this.speed=Math.max(0,this.speed-6*dt);
      else this.speed+=(-1.15-this.speed)*(1-Math.exp(-dt*5));
    }else if(this.speed<0){this.speed=Math.min(0,this.speed+3*dt);}
    else if(this.speed<.15&&throttle===0){this.speed=0;}
    else {
      const stalled=realistic&&this.engine.stalled;
      const gearThrottle=stalled||(!automatic&&this.speed>speedLimit)?0:throttle;
        const baseAcceleration=acceleration(this.speed,0,brake*grip*(this.spec.braking??1),this.pitch,grip,this.spec.aerodynamicDrag*bodyDragMultiplier(this.bodyLean));
        const mass=(this.spec.mass??100)+this.spec.riderMass;
        const driveAcceleration=stalled?0:realistic
          ?this.engine.wheelForce(this.spec,this.speed,gearThrottle)*grip/mass
          :acceleration(this.speed,gearThrottle*this.engine.driveFactor*this.spec.power*100/(this.spec.mass??100),brake*grip*(this.spec.braking??1),this.pitch,grip,this.spec.aerodynamicDrag*bodyDragMultiplier(this.bodyLean));
         const nextSpeed=this.speed+(stalled?Math.min(0,baseAcceleration):realistic?baseAcceleration+driveAcceleration:driveAcceleration*this.engine.clutchKickGain)*dt;
        this.speed=Math.max(0,Math.min(this.speed>speedLimit?this.speed:speedLimit,nextSpeed));
    }
    // Front-wheel steering has less authority while lifted; retain assisted balance.
    const steeringGrip=1-(1-BODY_TUNING.wheelieSteering)*clamp(this.wheelie/BODY_TUNING.balancePoint,0,1);
    const yaw=this.speed*Math.tan(steeringAngle(this.speed,this.steer))/this.spec.wheelbase*grip*steeringGrip;
    this.heading+=yaw*dt;
    const x=this.x+Math.sin(this.heading)*this.speed*dt,z=this.z+Math.cos(this.heading)*this.speed*dt;
    const hit=deepWater(x,z)||Math.abs(x)>SIZE/2-30||Math.abs(z)>SIZE/2-30||obstacles.some(o=>{const next=(x-o.x)**2+(z-o.z)**2,old=(this.x-o.x)**2+(this.z-o.z)**2;return next<(o.r+.35)**2&&next<=old+1e-10;});
    if(hit){this.wheelie=0;this.wheelieAngularVelocity=0;this.impact=Math.max(this.impact,Math.abs(this.speed));this.speed=0;}else {this.x=x;this.z=z;this.distance+=Math.abs(this.speed)*dt}
    const wheeliePhysics=this.engine.wheeliePhysics(this.spec,this.speed,throttle,this.bodyLean);
    this.wheelieDebug={gear:this.engine.gear,rpm:this.engine.rpm,wheelTorque:wheeliePhysics.wheelTorque,pitchTorque:wheeliePhysics.pitchTorque*BODY_TUNING.wheeliePitchForceScale,stabilizingTorque:wheeliePhysics.stabilizingTorque,angle:this.wheelie};
    const physicalWheelieMargin=this.engine.allowWheelie(this.spec,this.speed,throttle,brake,this.bodyLean);
     // Once airborne, transmit throttle torque without requiring a new body pull.
     const airborne=this.wheelie>BODY_TUNING.airborneThreshold;
     const activeWheelie=!hit&&!push&&!this.engine.stalled&&throttle>0&&(airborne||physicalWheelieMargin>0)&&this.speed>=BODY_TUNING.minWheelieSpeed;
    // Extra lift only during the pull/clutch impulse, not during neutral-body balancing.
    const launchLoad=Math.max(clamp(-this.bodyLean,0,1),clamp((this.engine.clutchKickGain-1)/BODY_TUNING.clutchBoost,0,1));
    const pitchMoment=activeWheelie?wheeliePhysics.pitchTorque*BODY_TUNING.wheeliePitchForceScale*(1+BODY_TUNING.launchPitchBoost*launchLoad):0;
     const mass=(this.spec.mass??100)+this.spec.riderMass;
     const gravityMoment=wheeliePhysics.stabilizingTorque*Math.cos(this.wheelie)-mass*9.81*this.spec.centerOfMassHeight*Math.sin(this.wheelie)*BODY_TUNING.gravityLiftFactor;
    const brakeMoment=brake*wheeliePhysics.stabilizingTorque*1.6;
    const bodyMoment=-this.bodyLean*wheeliePhysics.stabilizingTorque*BODY_TUNING.wheelieControlGain;
     // Throttle release returns the front promptly even without using the brake.
     // Fade this assistance out under braking to preserve the existing brake response.
     const coastLoad=clamp(1-throttle/.3,0,1)*(1-clamp(brake/.1,0,1));
     const coastMoment=this.wheelie>0?wheeliePhysics.stabilizingTorque*BODY_TUNING.coastReturnTorque*coastLoad:0;
     const netMoment=pitchMoment-gravityMoment-brakeMoment+bodyMoment-coastMoment;
     // Blend by missing support torque: small throttle corrections remain smooth,
     // while releasing the throttle or braking produces a prompt weighted descent.
     const descentBlend=this.wheelie>0?clamp(-netMoment/(wheeliePhysics.stabilizingTorque*.4),0,1):0;
     const rotationScale=BODY_TUNING.wheelieAngularAccelerationScale+(BODY_TUNING.descentAccelerationScale-BODY_TUNING.wheelieAngularAccelerationScale)*descentBlend;
     const baseDamping=airborne?BODY_TUNING.airborneDamping:BODY_TUNING.wheelieDamping;
     const damping=baseDamping+(BODY_TUNING.descentDamping-baseDamping)*descentBlend;
     const angularAcceleration=netMoment*rotationScale-this.wheelieAngularVelocity*damping;
    this.wheelieAngularVelocity+=angularAcceleration*dt;
    this.wheelie=Math.max(0,this.wheelie+this.wheelieAngularVelocity*dt);
     // Ground contact absorbs downward rotation instead of storing imaginary momentum.
     if(this.wheelie===0)this.wheelieAngularVelocity=Math.max(0,this.wheelieAngularVelocity);
    this.wheelieDebug.angle=this.wheelie;
    if(this.wheelie>BODY_TUNING.loopOutAngle&&this.wheelieAngularVelocity>0){this.fallen=true;this.fallTimer=0}
    this.fuel.consume(this.spec.id,this.distance-before,dt,throttle,this.speed,this.pitch,push);
    this.contact();this.lean+=(Math.max(-.45,Math.min(.45,-yaw*this.speed*.045))-this.lean)*(1-Math.exp(-dt*7));

  }
}
