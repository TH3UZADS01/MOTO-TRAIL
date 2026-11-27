import type {VehicleId, VehicleSpec} from './vehicles';
import type {Suspension} from './suspension';
import type {WheelContact} from './traction';
import type {Equipment} from './career';
import {clamp} from './body-control';

// Natural frequency (Hz), impulse transmission, damping ratio, maximum deflection (rad).
export const steeringProfiles = {
  twister:{hz:7.5,transmission:.95,damping:.24,limit:.09},r1200gs:{hz:6.3,transmission:.72,damping:.26,limit:.09},
  pop:    {hz: 8.3, transmission: .86, damping: .27, limit: .074},
  cub:    {hz: 7.9, transmission: .78, damping: .29, limit: .070},
  cg150:  {hz: 7.6, transmission: 1.06, damping: .22, limit: .105},
  sahara: {hz: 6.6, transmission: .75, damping: .22, limit: .100},
  urban:  {hz: 8.4, transmission: .87, damping: .27, limit: .073},
  caloi:  {hz: 8.9, transmission: 1.08, damping: .27, limit: .065}
} satisfies Record<VehicleId, {hz:number; transmission:number; damping:number; limit:number}>;

export const damperRatio = {original: 0, sport: .12, reinforced: .24};
const smooth = (x:number) => {const t=clamp(x,0,1); return t*t*(3-2*t)};

export class SteeringInstability {
  angle=0;
  velocity=0;
  frequency=0;
  damping=0;
  disturbance=0;
  physicalAngle=0;
  frontLoad=0;
  grounded=false;
  private sampled=false;
  private previousTravel=0;
  private previousRelief=0;private previousLift=0;private descent=0;
  get visualAngle(){return clamp(this.angle*1.8,-.20,.20)}
  private previousSlip=0;
  private peak=0;
  private envelope=0;

  get state(){return this.envelope>.038?'wobble':this.envelope>.002?'headshake':'estável'}

  reset(){
    this.angle=this.velocity=this.envelope=this.physicalAngle=this.disturbance=this.peak=0;
    this.frontLoad=this.previousTravel=this.previousSlip=this.frequency=this.damping=0;
    this.previousRelief=this.previousLift=this.descent=0;
    this.sampled=this.grounded=false;
  }

  step(dt:number,spec:VehicleSpec,speed:number,suspension:Suspension,contact:WheelContact,
       gear:Equipment,cargo:number,assist:number,steer:number,lift:number,relief=0,simcade=true,roadImpulseGain=1){
    if(!(dt>0 && dt<=.1))return;
    const p=steeringProfiles[spec.id], front=suspension.front;
    const staticLoad=((spec.mass??100)+spec.riderMass+cargo)*9.81*spec.centerOfMassRearDistance/spec.wheelbase;
    const load=simcade?clamp(front.normalLoad/staticLoad,0,1.5):clamp(1-lift/.20,0,1);
    const supported=load>.025 && lift<(this.grounded?.16:.06);
    if(this.sampled&&lift>.06)this.descent=Math.max(this.descent*.96,clamp((this.previousLift-lift)/(dt*2),0,1));
    const fast=smooth((speed-1.5)/Math.min(26,Math.max(12,spec.maxSpeed*.65)));
    const tyreWear=smooth(1-gear.pneus/100),forkWear=smooth(1-(gear.forkCondition??100)/100);
    const light=smooth(1-load);
    const risk=fast*(.48*light+.28*tyreWear+.24*forkWear);
    this.frequency=p.hz*(1-.09*light+.04*fast);
    const omega=2*Math.PI*this.frequency;
    const damper=gear.prep?.damper??'original';
    const target=p.damping*(1-.64*risk)+.055*assist+(damperRatio[damper]??0);
    this.damping=this.sampled?this.damping+(target-this.damping)*(1-Math.exp(-12*dt)):target;
    this.disturbance=0;

    if(this.sampled && supported){
      const travelRate=(front.compression-this.previousTravel)/dt;
      // Excite only the rising edge of a significant shock. Ring-down and closely spaced
      // ripples share a decaying peak, rather than injecting full energy on every tick.
      const roadRate=(relief-this.previousRelief)/dt;
      const shock=clamp(Math.max((Math.abs(travelRate)-.30)/1.45,(Math.abs(roadRate)-.10)/.9),0,1);
      const edge=Math.max(0,shock-this.peak)+.45*Math.max(0,Math.abs(roadRate)-.18)/(1+Math.abs(roadRate));
      this.peak=Math.max(shock,this.peak*Math.exp(-4*dt));
      // A soft touchdown excites less energy than a loaded, compressing fork.
      const landingSeverity=smooth(Math.max(0,travelRate)/1.45+.45*load);
      const landing=this.grounded||lift>.06?0:(.45+.55*landingSeverity+.45*this.descent)*(.85+.15*Math.abs(steer));
      const recovery=Math.max(0,Math.abs(this.previousSlip)-Math.abs(contact.lateralSlip)-dt*.8);
      const direction=Math.sign(steer)||Math.sign(this.previousSlip)||Math.sign(travelRate)||1;
      const tune=gear.prep?.suspension==='trail'?.90:gear.prep?.suspension==='road'?1.08:1;
      const kick=(edge*roadImpulseGain+landing+Math.min(.25,recovery))*direction*fast*p.transmission*tune;
      this.disturbance=(kick*(.055+.095*risk)+landing*(1-fast)*.035*direction)*(1+.24*forkWear)*omega;
      this.velocity+=omega*p.limit*Math.tanh(this.disturbance/(omega*p.limit));
    }else this.peak=0;

    // Unit-inertia spring. Substep symplectic Euler and cap phase-space energy.
    const steps=Math.ceil(dt*480),h=dt/steps;
    for(let i=0;(this.angle!==0||this.velocity!==0)&&i<steps;i++){
      this.velocity-=h*(omega*omega*this.angle+2*this.damping*omega*this.velocity);
      this.angle+=h*this.velocity;
      const energyRadius=Math.hypot(this.angle,this.velocity/omega);
      if(energyRadius>p.limit){
        const scale=p.limit/energyRadius;
        this.angle*=scale;
        this.velocity*=scale;
      }
    }
    this.envelope=Math.hypot(this.angle,this.velocity/omega);
    if(this.envelope<1e-6)this.angle=this.velocity=this.envelope=0;
    const authority=.012+.095*smooth((this.envelope-.019)/.05);
    this.physicalAngle=simcade&&supported?this.angle*authority*Math.min(1,load,contact.lateralGrip)*(1-.42*assist):0;
    this.frontLoad=front.normalLoad;
    this.grounded=supported;
    this.sampled=true;
    if(supported)this.descent=0;
    this.previousLift=lift;this.previousRelief=relief;
    this.previousTravel=front.compression;
    this.previousSlip=contact.lateralSlip;
  }
}



