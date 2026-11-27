import type {VehicleSpec} from './vehicles';

export type HandlingMode='arcade'|'simcade';
export const defaultHandlingMode:HandlingMode='arcade';
export const simcadeTuning={
 steeringResponse:9,          // Steering entry rate, per second, at low speed.
 steeringReturn:11,           // Centering rate after releasing the stick or keys.
 highSpeedReduction:.20,      // Fraction of low-speed response lost at cruising speed.
 speedScale:15,               // m/s at the midpoint of the speed-dependent reduction.
 leanResponse:5.5,            // Natural frequency of the critically damped roll spring, per second.
 maxLean:.48,                 // Soft limit in radians, approached progressively.
 balanceSpeed:3,              // m/s at half strength of the low-speed balance assist.
 selfStabilization:.35,       // Extra spring response near center and at walking pace.
 massResponseFactor:.45,      // Sensitivity to total mass relative to a light commuter.
};

export class SimcadeHandling {
 rate=0;
 target=0;
 assist=0;
 private inertia=1;
 reset(angle:number){this.rate=0;this.target=angle;this.assist=0}

 steer(dt:number,current:number,input:number,speed:number,spec:VehicleSpec,surfaceResponse:number){
  const c=simcadeTuning;
  this.inertia=1+c.massResponseFactor*((spec.mass??100)+spec.riderMass-175)/175;
  const fast=speed*speed/(speed*speed+c.speedScale*c.speedScale);
  const response=(input===0?c.steeringReturn:c.steeringResponse)*(1-c.highSpeedReduction*fast);
  // Preserve analog amplitude; digital steps ease through the same physical steering state.
  return current+(input-current)*(1-Math.exp(-dt*response*surfaceResponse/(this.inertia*(spec.stability??1))));
 }

 bank(dt:number,angle:number,lateralAcceleration:number,speed:number,steer:number,spec:VehicleSpec){
  const c=simcadeTuning;
  const low=c.balanceSpeed*c.balanceSpeed/(speed*speed+c.balanceSpeed*c.balanceSpeed);
  this.assist=low+(1-low)*(1-Math.abs(steer));
  const equilibrium=-Math.atan(lateralAcceleration/9.81)*(1-low);
  this.target=c.maxLean*Math.tanh(equilibrium/c.maxLean);
  const frequency=c.leanResponse*(1+c.selfStabilization*this.assist)/(this.inertia*Math.sqrt(spec.centerOfMassHeight/.6));
  // Exact critically damped spring step for a fixed target over this tick.
  const error=angle-this.target,impulse=this.rate+frequency*error,decay=Math.exp(-frequency*dt);
  this.rate=(this.rate-frequency*impulse*dt)*decay;
  return this.target+(error+impulse*dt)*decay;
 }
}
