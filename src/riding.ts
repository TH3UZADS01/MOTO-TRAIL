import {SimcadeHandling,defaultHandlingMode,type HandlingMode} from './simcade';
import {RiderPosture,ergonomics} from './rider-posture';
import {WheelContact,touringAssist} from './traction';
import {pavementRelief} from './pavement';
import {wallImpact} from './obstacle';
import {Suspension,loadTuning} from './suspension';
import {adventure} from './adventure-tuning';
import {conditionFactor,criticalCondition,factory,tyreResponse} from './career';
import {Powertrain} from './powertrain';
import {Drift,DRIFT_TUNING} from './drift';
import {BODY_TUNING,bodyDragMultiplier,clamp,counterweightBlend} from './body-control';
import {Fuel} from './fuel';
import {getVehicle,type VehicleSpec} from './vehicles';
import {ground,nearestRoute,contactSurface,surface,SIZE,deepWater} from './terrain';
import type {Obstacle} from './world';
const flatTyreKmh={caloi:30,urban:35,cub:38,pop:42,cg150:46,sahara:50};
const CRASH_SPEED=35/3.6; // Closing speed perpendicular to the obstacle, in m/s.
export const TOP_SPEED=100/3.6;
export const ACCELERATION_SCALE=.8; // 20% slower acceleration for every motorcycle.
export interface WheelieDebugState {gear:number;rpm:number;wheelTorque:number;pitchTorque:number;stabilizingTorque:number;angle:number}
export function steeringAngle(speed:number,input:number,wheelie=0){return input*(.56+.14*counterweightBlend(speed,wheelie))/(1+(speed/5.8)**2);}
export function automaticTuckInput(input:number,speed:number,topSpeed:number){return clamp(input+Math.min(1,Math.max(0,speed)/(topSpeed*.8)),-1,1);}
export function acceleration(speed:number,throttle:number,brake:number,pitch:number,grip:number,aerodynamicDrag=.002,topSpeed=TOP_SPEED){
  const drive=throttle*4.8*Math.max(0,1-speed/48);
  const ratio=clamp(speed/(topSpeed*.85),0,1);
  const windScale=.7*(.16+.54*ratio*ratio*(3-2*ratio));
  const net=drive-brake*8-.22-speed*speed*(aerodynamicDrag*windScale+(1-grip)*.012)-9.81*Math.sin(pitch)-(1-grip)*1.7;
  // Scale positive acceleration under power, preserving terminal speed, coasting and braking.
  return throttle>0&&brake===0&&net>0?net*ACCELERATION_SCALE:net;
}
export class Ride {
  handlingMode:HandlingMode=defaultHandlingMode;
  readonly handling=new SimcadeHandling();
  setHandlingMode(mode:HandlingMode){
    if(this.handlingMode===mode)return;
    this.frontContact=new WheelContact();this.rearContact=new WheelContact();this.assistedSlide=0;this.posture.reset();this.handlingMode=mode;this.engine.resetEngineBrake();this.suspension.resetLoads();
    this.handling.reset(this.lean);
  }
  frontContact=new WheelContact();
  rearContact=new WheelContact();
  readonly posture=new RiderPosture();
  assistedSlide=0;
  get slideAssist(){return touringAssist.countersteer*(1-Math.abs(this.rearContact.lateralSlip))}
  private sampleContact(x:number,z:number){
    if(this.sandAt?.(x,z)??this.softGround)return 'areia';
    return contactSurface(x,z);
  }
  sandAt?:(x:number,z:number)=>boolean;
  eventObstacles:Obstacle[]=[];softGround=false;
  equipment=factory();cargoLoad=0;
  engine=new Powertrain();engineThrottle=0;
  drift=new Drift();
  suspension=new Suspension();
  burnoutSpeed=0;
  get gear(){return this.engine.gear}
  set gear(value:number){this.engine.gear=value}
  fuel=new Fuel();spec:VehicleSpec=getVehicle('pop');pushing=false;brakeInput=0;fallen=false;private impact=0;private fallTimer=0;private wheelieAngularVelocity=0;
  bodyLean=0;wheelie=0;wheelieDebug:WheelieDebugState={gear:1,rpm:0,wheelTorque:0,pitchTorque:0,stabilizingTorque:0,angle:0};
  get topSpeed(){return this.spec.maxSpeed/adventure.gearing[this.equipment.prep?.gearing??'original']}
   resetBody(){this.posture.reset();this.frontContact=new WheelContact();this.rearContact=new WheelContact();this.assistedSlide=0;this.engine.resetEngineBrake();this.handling.reset(this.lean);this.suspension.reset();this.burnoutSpeed=0;this.engineThrottle=0;this.engine.cancelBlip();this.drift.reset();this.bodyLean=0;this.wheelie=0;this.wheelieAngularVelocity=0;this.engine.resetClutchKick();}
  takeImpact(){const impact=this.impact;this.impact=0;return impact}
  x=-310;z=0;heading=0;speed=0;steer=0;lean=0;pitch=0;distance=0;y=ground(this.x,this.z);
  constructor(){this.recover()}
  contact(){const dx=Math.sin(this.heading),dz=Math.cos(this.heading),front=ground(this.x+dx*this.spec.wheelbase/2,this.z+dz*this.spec.wheelbase/2),rear=ground(this.x-dx*this.spec.wheelbase/2,this.z-dz*this.spec.wheelbase/2);this.pitch=Math.atan2(front-rear,this.spec.wheelbase);this.y=(front+rear)/2;}
  recover(){const n=nearestRoute(this.x,this.z),p=n.track.points[n.index],q=n.track.points[n.index+1];this.x=p.x;this.z=p.z;this.heading=Math.atan2(q.x-p.x,q.z-p.z);this.speed=0;this.lean=0;this.steer=0;this.fallen=false;this.fallTimer=0;this.resetBody();this.engine.reset(this.spec.idleRpm);this.contact()}
  step(dt:number,throttle:number,brake:number,turn:number,obstacles:Obstacle[],push=false,bodyInput=0,automatic=true,realistic=false,servicing=false,clutchLever=0){
    const prep=this.equipment.prep;
    this.engine.torqueScale=prep?.engine==='cam'?adventure.camTorqueGain:1;
    this.engine.finalRatioScale=adventure.gearing[prep?.gearing??'original'];
    const suspension=adventure.suspension[prep?.suspension??'original'];
    const baseMass=(this.spec.mass??100)+this.spec.riderMass;
    const loadRatio=this.cargoLoad/baseMass;
    const initialSpeed=this.speed;
    dt=clamp(dt,0,.1);this.brakeInput=brake;this.engineThrottle=0;
    const motor=conditionFactor('motor',this.equipment.motor);
    brake*=conditionFactor('freios',this.equipment.freios);
    this.drift.update(dt,brake,this.speed,this.steer,push||this.fallen||this.wheelie>.08);
    if(this.fallen){
      this.suspension.reset();
      this.burnoutSpeed=0;
      this.fallTimer+=dt;this.speed*=Math.exp(-4*dt);this.engine.update(dt,this.speed,this.spec,this.topSpeed,0,1,false,automatic,realistic);this.engine.cancelBlip();
      if(this.wheelie>=BODY_TUNING.loopOutAngle)this.wheelie=Math.max(this.wheelie,BODY_TUNING.loopOutAngle+Math.min(.3,this.fallTimer*.5));
      this.lean+=(Math.sign(this.lean||1)*.8-this.lean)*(1-Math.exp(-dt*3));this.contact();return;
    }
    this.bodyLean+=(clamp(bodyInput,-1,1)-this.bodyLean)*(1-Math.exp(-BODY_TUNING.response*dt));
    throttle=Math.max(0,Math.min(1,throttle));if(this.fuel.get(this.spec.id)<=0)throttle=0;
    const before=this.distance;
    const simcade=this.handlingMode==='simcade';
    const halfAxle=this.spec.wheelbase/2,ax=Math.sin(this.heading)*halfAxle,az=Math.cos(this.heading)*halfAxle;
    const frontSurface=simcade?this.sampleContact(this.x+ax,this.z+az):'asfalto';
    const rearSurface=simcade?this.sampleContact(this.x-ax,this.z-az):'asfalto';
    const type=simcade?rearSurface:this.softGround?'terra':surface(this.x,this.z);
    const tyre=tyreResponse(this.equipment,type==='asfalto',this.speed,this.steer,throttle);
    const surfaceGrip=simcade||type==='asfalto'?1:type==='terra'?.7:.5;
    const health=conditionFactor('pneus',this.equipment.pneus);
    const grip=simcade?health:surfaceGrip*tyre.grip;
    const unwornGrip=simcade?1:surfaceGrip*tyre.baseGrip;
    // A flat tyre loses cornering grip much faster than it loses forward traction.
    const damage=clamp(1-this.equipment.pneus/criticalCondition,0,1);
    const rollingGrip=grip+.95*(unwornGrip-grip);
    const driveGrip=grip+.74*(unwornGrip-grip);
    const tyreLimit=this.topSpeed+(flatTyreKmh[this.spec.id]/3.6-this.topSpeed)*damage;
    const response=(type==='asfalto'?suspension.road:suspension.dirt)/(1+adventure.cargo.steering*loadRatio);
    if(simcade)this.steer=this.handling.steer(dt,this.steer,turn,this.speed,this.spec,response/(1+.4*this.frontContact.rollingResistance)*(1-loadTuning.steeringFeedback*this.suspension.loadShift));
    else this.steer+=(turn-this.steer)*(1-Math.exp(-dt*response*(10-this.speed*.2)/(this.spec.stability??1)));
    this.contact();
    this.pushing=push;
    const lever=simcade?clamp(clutchLever,0,1):0;
    const burnout=lever===0&&!push&&Math.abs(this.speed)<.20&&this.wheelie<.02&&throttle*motor>=.18&&brake>=.25&&this.gear>0&&!this.engine.stalled;
    if(burnout){
      const target=this.engine.speedAtRedline(this.spec,this.gear)*(.35+.45*throttle);
      this.burnoutSpeed+=(target-this.burnoutSpeed)*(1-Math.exp(-8*dt));
    }else this.burnoutSpeed=0;
    const drivenSpeed=simcade?this.speed*(1+this.rearContact.slipRatio):this.speed;
    this.engine.update(dt,burnout?this.burnoutSpeed:drivenSpeed,this.spec,this.topSpeed,throttle,brake,push,automatic&&lever===0,realistic,lever);
     this.engine.updateClutchKick(dt,this.spec,this.speed,throttle,brake,bodyInput,this.wheelie<BODY_TUNING.airborneThreshold,push||lever>0);
    if(this.fuel.get(this.spec.id)<=0||push||this.engine.stalled)this.engine.cancelBlip();
    this.engineThrottle=push||this.engine.stalled||this.fuel.get(this.spec.id)<=0?0:this.engine.effectiveThrottle(throttle);
    const coastForce=this.engine.updateEngineBrake(dt,this.spec,this.speed,this.engineThrottle,simcade&&!push&&!burnout&&!servicing&&this.fuel.get(this.spec.id)>0);
    const gearMax=this.engine.speedAtRedline(this.spec,this.engine.gear);
    const speedLimit=this.gear===0?this.topSpeed:Math.min(this.topSpeed,gearMax);
    if(burnout){
      this.speed=0;
    }else if(push){
      if(this.speed>.2)this.speed=Math.max(0,this.speed-6*dt);
      else this.speed+=(-1.15-this.speed)*(1-Math.exp(-dt*5));
    }else if(this.speed<0){this.speed=Math.min(0,this.speed+3*dt);}
    else if(this.speed<.15&&throttle===0){this.speed=0;}
    else {
      const stalled=realistic&&this.engine.stalled;
      const gearThrottle=this.gear===0||stalled||this.drift.active||(!automatic&&this.speed>speedLimit)?0:this.engineThrottle*motor;
      const effectiveBrake=brake*(simcade?1-loadTuning.brakeFeedback*this.suspension.loadShift:1)*(prep?.brakes==='improved'?adventure.brakeGain:1)/(1+adventure.cargo.braking*loadRatio)*(1-(1-DRIFT_TUNING.brakingFactor)*this.drift.amount);
        const baseAcceleration=acceleration(this.speed,0,effectiveBrake*grip*(this.spec.braking??1),this.pitch,rollingGrip,this.spec.aerodynamicDrag*bodyDragMultiplier(this.bodyLean),this.topSpeed);
        const mass=baseMass+adventure.cargo.inertia*this.cargoLoad;
        const arcadeTorque=realistic?1:this.engine.torqueAtRpm(this.engine.torqueRpm,this.spec)/this.engine.torqueAtRpm(this.spec.peakPowerRpm,this.spec);
        const driveAcceleration=stalled?0:realistic
          ?this.engine.wheelForce(this.spec,this.speed,gearThrottle)*driveGrip/mass
          :acceleration(this.speed,gearThrottle*(1-lever)*(1-.2*damage)*this.engine.torqueScale*this.engine.finalRatioScale*baseMass/mass*(.85+.15*arcadeTorque)*this.engine.driveFactor*this.spec.power*100/(this.spec.mass??100),effectiveBrake*grip*(this.spec.braking??1),this.pitch,rollingGrip,this.spec.aerodynamicDrag*bodyDragMultiplier(this.bodyLean),this.topSpeed);
        const netAcceleration=stalled?Math.min(0,baseAcceleration):realistic?baseAcceleration+driveAcceleration:driveAcceleration*this.engine.clutchKickGain;
        const scale=gearThrottle>0&&netAcceleration>0&&brake===0
          ?this.spec.accelerationScale?.[realistic?'realistic':'arcade']??1:1;
        let accelerationApplied=netAcceleration*scale-coastForce/(baseMass+this.cargoLoad);
        if(simcade){
          const totalMass=baseMass+this.cargoLoad,weight=totalMass*9.81;
          const bias=this.spec.centerOfMassRearDistance/this.spec.wheelbase;
          const loaded=this.suspension.front.normalLoad+this.suspension.rear.normalLoad>0;
          const frontLoad=loaded?this.suspension.front.normalLoad:weight*bias;
          const rearLoad=loaded?this.suspension.rear.normalLoad:weight*(1-bias);
          const sideAcceleration=this.speed*this.speed*Math.tan(steeringAngle(this.speed,this.steer,this.wheelie))/this.spec.wheelbase;
          const braking=8*effectiveBrake*grip*(this.spec.braking??1)*totalMass;
          const frontForce=-braking*.68;
          const rearForce=(netAcceleration-baseAcceleration)*scale*totalMass-braking*.32-coastForce;
          this.frontContact.update(dt,frontSurface,this.equipment.tyre,health,frontLoad,frontForce,totalMass*bias*sideAcceleration,this.speed);
          this.rearContact.update(dt,rearSurface,this.equipment.tyre,health,rearLoad,rearForce,totalMass*(1-bias)*sideAcceleration,this.speed);
          accelerationApplied+=(frontForce*(this.frontContact.forceScale-1)+rearForce*(this.rearContact.forceScale-1))/totalMass;
          const rolling=(frontLoad*this.frontContact.rollingResistance+rearLoad*this.rearContact.rollingResistance)/weight;
          accelerationApplied-=rolling*(.65+.055*this.speed)*Math.min(1,this.speed);
        }
        const nextSpeed=this.speed+accelerationApplied*dt;
        const tyreCeiling=damage>0?Math.max(tyreLimit,this.speed-2*dt):Infinity;
        this.speed=Math.max(0,Math.min(tyreCeiling,Math.max(this.speed,speedLimit),nextSpeed));
    }
    if(simcade&&(burnout||push||this.speed<=0)){
     const weight=(baseMass+this.cargoLoad)*9.81,bias=this.spec.centerOfMassRearDistance/this.spec.wheelbase;
     this.frontContact.update(dt,frontSurface,this.equipment.tyre,health,weight*bias,0,0,this.speed);
     this.rearContact.update(dt,rearSurface,this.equipment.tyre,health,weight*(1-bias),burnout?weight:0,0,this.speed);
    }
    // Front-wheel steering has less authority while lifted; retain assisted balance.
    const steeringGrip=1-(1-BODY_TUNING.wheelieSteering)*clamp(this.wheelie/BODY_TUNING.balancePoint,0,1);
    const postureGain=this.posture.stand*ergonomics[this.spec.id].assist;
    const uprightSteering=type==='asfalto'?1-postureGain*clamp(this.speed/24,0,1):1+postureGain*Math.abs(this.frontContact.lateralSlip);
    const contactSteering=simcade?uprightSteering*(1-.55*Math.abs(this.frontContact.lateralSlip)):1;
    const yaw=contactSteering*this.speed*Math.tan(steeringAngle(this.speed,this.steer,this.wheelie))/this.spec.wheelbase*grip*steeringGrip*(1+DRIFT_TUNING.steeringBoost*this.drift.amount);
    const previousHeading=this.heading;
    this.heading+=(burnout?1.9*this.steer*throttle:yaw)*dt;
    const slideTarget=simcade&&!burnout&&!push?this.rearContact.lateralSlip*touringAssist.maxSlide:0;
    this.assistedSlide+=(slideTarget-this.assistedSlide)*(1-Math.exp(-dt*7));
    const travelHeading=this.heading-this.drift.slip-(simcade?0:tyre.slip)-this.assistedSlide*(1-this.slideAssist);
    let x=this.x+Math.sin(travelHeading)*this.speed*dt,z=this.z+Math.cos(travelHeading)*this.speed*dt;
    if(burnout){
      // Keep the inside boot fixed in world space as the chassis rotates around it.
      const footX=this.steer<0?-.48:.48,footZ=.05;
      const dc=Math.cos(previousHeading)-Math.cos(this.heading),ds=Math.sin(previousHeading)-Math.sin(this.heading);
      x+=footX*dc+footZ*ds;
      z+=footZ*dc-footX*ds;
    }
    const dx=x-this.x,dz=z-this.z,travelSq=dx*dx+dz*dz;
    let hitObject=false,closingSpeed=0;
    const checkObstacle=(o:Obstacle)=>{
      const ox=o.x-this.x,oz=o.z-this.z,radius=o.r+.35;
      if(Math.abs(ox)>radius+Math.abs(dx)||Math.abs(oz)>radius+Math.abs(dz))return;
      if(o.halfX!==undefined){
       const normal=wallImpact(o,this.x,this.z,dx,dz,.35);
       if(normal>0){hitObject=true;closingSpeed=Math.max(closingSpeed,Math.abs(this.speed)*normal)}
       return;
      }
      const toward=ox*dx+oz*dz;
      if(travelSq===0||toward<=0)return;
      const t=Math.min(1,toward/travelSq);
      if((ox-t*dx)**2+(oz-t*dz)**2>=radius*radius)return;
      hitObject=true;
      // The perpendicular offset from the path determines how directly the bike hits.
      const cross=ox*dz-oz*dx;
      const normalFraction=Math.sqrt(Math.max(0,1-cross*cross/(travelSq*radius*radius)));
      closingSpeed=Math.max(closingSpeed,Math.abs(this.speed)*normalFraction);
    };
    obstacles.forEach(checkObstacle);this.eventObstacles.forEach(checkObstacle);
    const hit=hitObject||deepWater(x,z)||Math.abs(x)>SIZE/2-30||Math.abs(z)>SIZE/2-30;
    if(hit){
      if(burnout)this.heading=previousHeading;
      this.drift.reset();this.wheelie=0;this.wheelieAngularVelocity=0;
      this.impact=Math.max(this.impact,Math.abs(this.speed));this.speed=0;
      if(closingSpeed>=CRASH_SPEED){
        this.fallen=true;this.fallTimer=0;this.resetBody();return;
      }
    }else {this.x=x;this.z=z;this.distance+=Math.abs(this.speed)*dt}
    const wheeliePhysics=this.engine.wheeliePhysics(this.spec,this.speed,throttle*motor,this.bodyLean);
    this.wheelieDebug={gear:this.engine.gear,rpm:this.engine.rpm,wheelTorque:wheeliePhysics.wheelTorque,pitchTorque:wheeliePhysics.pitchTorque*BODY_TUNING.wheeliePitchForceScale,stabilizingTorque:wheeliePhysics.stabilizingTorque,angle:this.wheelie};
    const physicalWheelieMargin=this.engine.allowWheelie(this.spec,this.speed,throttle*motor,brake,this.bodyLean);
     // Once airborne, transmit throttle torque without requiring a new body pull.
     const airborne=this.wheelie>BODY_TUNING.airborneThreshold;
     const activeWheelie=!hit&&!push&&!this.engine.stalled&&throttle>0&&(airborne||physicalWheelieMargin>0)&&this.speed>=BODY_TUNING.minWheelieSpeed;
    // Extra lift only during the pull/clutch impulse, not during neutral-body balancing.
    const launchLoad=Math.max(clamp(-this.bodyLean,0,1),clamp((this.engine.clutchKickGain-1)/BODY_TUNING.clutchBoost,0,1));
    const pitchMoment=activeWheelie?wheeliePhysics.pitchTorque*BODY_TUNING.wheeliePitchForceScale*(this.spec.wheelieAssist??1)*(1+BODY_TUNING.launchPitchBoost*launchLoad):0;
     const mass=baseMass+adventure.cargo.inertia*this.cargoLoad;
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
    this.fuel.consume(this.spec.id,this.distance-before,dt,this.engineThrottle,this.speed,this.pitch,push||this.engine.stalled||servicing,this.engine.rpm,this.cargoLoad);
    this.contact();
    if(dt>0){
     const half=this.spec.wheelbase/2,slope=Math.tan(this.pitch)*half;
     const relief=type==='terra'?.018:type==='grama'?.012:0;
     const dx=Math.sin(this.heading)*half,dz=Math.cos(this.heading)*half;
     const bump=(x:number,z:number)=>pavementRelief(x,z)+relief*(.58*Math.sin(2.3*x+1.7*z)+.42*Math.sin(3.1*z-1.2*x));
     this.suspension.step(dt,this.spec,this.y+slope+bump(this.x+dx,this.z+dz),this.y-slope+bump(this.x-dx,this.z-dz),(this.speed-initialSpeed)/dt,this.cargoLoad,this.wheelie,suspension.travel,suspension.frequency,simcade,this.pitch,this.posture.rise);
    }
    if(simcade&&!this.fallen)this.posture.step(dt,this.spec.id,this.speed,this.lean,yaw*this.speed,this.suspension.acceleration,type!=='asfalto',this.rearContact.lateralSlip,this.suspension.front.compression,this.suspension.rear.compression);
    if(simcade&&!burnout){
     this.lean=this.handling.bank(dt,this.lean,yaw*this.speed,this.speed,this.steer,this.spec);
    }else{
    const bank=burnout?-.23*this.steer:clamp(-yaw*this.speed*.044-.068*this.steer*counterweightBlend(this.speed,this.wheelie),-.46,.46);
    this.lean+=(bank-this.lean)*(1-Math.exp(-dt*7));
    if(simcade)this.handling.reset(this.lean);
    }

  }
}
