import type {VehicleSpec} from './vehicles';
import {BODY_TUNING,clamp} from './body-control';
// Gameplay RPM calibration, not manufacturer dyno data.
export const ENGINE_TUNING={idleRpm:1400,redlineRpm:8500,shiftDelay:.22,downshiftRatio:.72,cutHz:8,cutDuty:.32,cutGain:.16,rpmResponse:12,clutchSlipRpm:700,revMatchDuration:.3,blipThrottle:.65,revMatchIntensity:.32,revMatchOvershootRpm:650,revMatchMinimumRpm:180,revMatchVolume:.45};
// Keep the limiter latched through the small RPM dip caused by each ignition cut.
export const LIMITER_TUNING={entryRpm:25,releaseRpm:100};
const smoothstep=(value:number)=>{const t=clamp(value,0,1);return t*t*(3-2*t)};
export class Powertrain {
 private blipEnabled=true;
 get autoBlip(){return this.blipEnabled}
 set autoBlip(enabled:boolean){this.blipEnabled=enabled;if(!enabled)this.cancelBlip()}
 cancelBlip(){this.revMatchTime=0;this.revMatchPeak=0}
 get blipThrottle(){return this.autoBlip?ENGINE_TUNING.blipThrottle*this.revMatchEnvelope:0}
 effectiveThrottle(input:number){return Math.max(clamp(input,0,1),this.blipThrottle)}
 gear=1;rpm=ENGINE_TUNING.idleRpm;ratio=0;limiting=false;cutting=false;clutch=0;lugging=false;revMatchTime=0;revMatchPeak=0;revMatchSequence=0;stalled=false;
 private shiftTime=0;private shiftCooldown=0;private phase=0;
 private kickTime=0;private kickCooldown=0;private kickHeld=false;private kickGear=1;private kickBaseRpm=0;
 clutchKickGain=1;
 resetClutchKick(){this.kickTime=0;this.kickCooldown=0;this.kickHeld=false;this.clutchKickGain=1}
 updateClutchKick(dt:number,spec:VehicleSpec,speed:number,throttle:number,brake:number,bodyInput:number,grounded:boolean,disabled=false){
  const t=BODY_TUNING,held=bodyInput<-.55;if(!held)this.kickHeld=false;
  this.kickCooldown=Math.max(0,this.kickCooldown-dt);this.clutchKickGain=1;
  const allowed=!disabled&&!this.stalled&&!this.limiting&&brake<.05&&throttle>.45&&speed>=t.minWheelieSpeed&&speed*3.6<=(spec.wheelieMaxSpeedKmh[this.gear-1]??0);
  if(!allowed||this.gear!==this.kickGear)this.kickTime=0;
  if(held&&!this.kickHeld&&allowed&&grounded&&this.kickCooldown===0){this.kickHeld=true;this.kickTime=t.clutchCharge+t.clutchRelease;this.kickCooldown=t.clutchCooldown;this.kickGear=this.gear;this.kickBaseRpm=this.rpm}
  if(this.kickTime<=0)return;
  this.kickTime=Math.max(0,this.kickTime-dt);
  const flare=Math.max(t.clutchRpm,(spec.idleRpm+(spec.redlineRpm-spec.idleRpm)*t.clutchPeakRatio*throttle)-this.kickBaseRpm);
  if(this.kickTime>t.clutchRelease){
   const charge=1-(this.kickTime-t.clutchRelease)/t.clutchCharge;
   // An RPM target, not an additive boost every frame, keeps the flare consistent at any tick rate.
   this.clutch*=.35;this.rpm=Math.min(spec.redlineRpm-100,Math.max(this.rpm,this.kickBaseRpm+flare*smoothstep(charge)));
  }else {
   const release=this.kickTime/t.clutchRelease;
   this.clutchKickGain=1+t.clutchBoost*Math.sin(Math.PI*release);
   this.rpm=Math.min(spec.redlineRpm-100,Math.max(this.rpm,this.kickBaseRpm+flare*release*release));
  }
  this.ratio=clamp((this.rpm-spec.idleRpm)/(spec.redlineRpm-spec.idleRpm),0,1);
 }
 get driveFactor(){return this.cutting?0:1}
 private updateLimiter(dt:number,wheelRpm:number,spec:VehicleSpec,throttle:number,brake:number,push:boolean){
  const threshold=spec.redlineRpm-(this.limiting?LIMITER_TUNING.releaseRpm:LIMITER_TUNING.entryRpm);
  this.limiting=!push&&!this.stalled&&throttle>.25&&brake<.05&&wheelRpm>=threshold;
  if(this.limiting)this.phase=(this.phase+dt*ENGINE_TUNING.cutHz)%1;else this.phase=0;
  this.cutting=this.limiting&&this.phase<ENGINE_TUNING.cutDuty;
 }
 get torqueRpm(){return Math.max(0,this.rpm-this.revMatchPeak*this.revMatchEnvelope)}
 get revMatchEnvelope(){
  if(this.revMatchTime<=0||ENGINE_TUNING.revMatchDuration<=0)return 0;
  return Math.sin(Math.PI*clamp(1-this.revMatchTime/ENGINE_TUNING.revMatchDuration,0,1));
 }
 private startRevMatch(targetRpm:number,spec:VehicleSpec,gearSteps:number){
  if(!this.autoBlip||targetRpm<=spec.idleRpm){this.cancelBlip();return}
  const target=clamp(targetRpm,spec.idleRpm,spec.redlineRpm),headroom=Math.max(0,spec.redlineRpm-target);
  const requested=Math.max(ENGINE_TUNING.revMatchMinimumRpm,Math.max(0,target-this.rpm)*ENGINE_TUNING.revMatchIntensity
    +Math.max(0,gearSteps-1)*ENGINE_TUNING.revMatchOvershootRpm*.25);
  this.revMatchPeak=Math.min(headroom,requested);
  this.revMatchTime=ENGINE_TUNING.revMatchDuration;
  this.revMatchSequence++;
 }
 getGearRatio(spec:VehicleSpec,gear=this.gear){return spec.gearRatios[Math.max(0,Math.min(gear-1,spec.gearRatios.length-1))]??1}
 getTotalRatio(spec:VehicleSpec,gear=this.gear){return this.getGearRatio(spec,gear)*spec.finalDrive}
 wheelRpmFromSpeed(speed:number,spec:VehicleSpec,gear=this.gear){if(speed<=0)return 0;return speed*60*this.getTotalRatio(spec,gear)/(2*Math.PI*spec.wheelRadius)}
 speedAtRpm(rpm:number,spec:VehicleSpec,gear=this.gear){return Math.max(0,rpm)*(2*Math.PI*spec.wheelRadius)/(60*this.getTotalRatio(spec,gear))}
 speedAtRedline(spec:VehicleSpec,gear=this.gear){return this.speedAtRpm(spec.redlineRpm,spec,gear)}
 torqueAtRpm(rpm:number,spec:VehicleSpec){
  const curve=spec.torqueCurve,limited=clamp(rpm,curve[0].rpm,curve[curve.length-1].rpm);
  for(let i=1;i<curve.length;i++)if(limited<=curve[i].rpm){const a=curve[i-1],b=curve[i],t=(limited-a.rpm)/(b.rpm-a.rpm);return a.torqueNm+(b.torqueNm-a.torqueNm)*t}
  return curve[curve.length-1].torqueNm;
 }
 gearLugFactor(speed:number,spec:VehicleSpec,gear=this.gear){
  if(gear<=1)return 1;
  const minimum=spec.gearMinSpeedKmh[gear-1]??0;if(minimum<=0)return 1;
  const ratio=clamp((speed*3.6)/Math.max(minimum,.01),0,1);
  const floor=[.42,.28,.2,.14,.1][gear-2]??.08;
  return floor+(1-floor)*smoothstep(ratio);
 }
 wheelTorque(spec:VehicleSpec,speed:number,throttle=1,gear=this.gear){
  const delivered=clamp(throttle,0,1)*this.clutch*this.gearLugFactor(speed,spec,gear)*this.driveFactor;
  return this.torqueAtRpm(this.torqueRpm,spec)*this.getTotalRatio(spec,gear)*delivered*this.clutchKickGain;
 }
 wheelForce(spec:VehicleSpec,speed:number,throttle=1,gear=this.gear){return this.wheelTorque(spec,speed,throttle,gear)/spec.wheelRadius}
 estimatedRpm(spec:VehicleSpec,speed:number,gear=this.gear){return clamp(this.wheelRpmFromSpeed(speed,spec,gear),spec.idleRpm,spec.redlineRpm)}
 wheeliePhysics(spec:VehicleSpec,speed:number,throttle:number,bodyLean:number){
  const wheelTorque=this.wheelTorque(spec,speed,throttle),tractionForce=wheelTorque/spec.wheelRadius;
  const rearArm=spec.centerOfMassRearDistance*(1-.55*clamp(-bodyLean,0,1));
  const comHeight=spec.centerOfMassHeight*(1+.1*clamp(-bodyLean,0,1));
  const mass=(spec.mass??100)+spec.riderMass;
  return {wheelTorque,tractionForce,pitchTorque:tractionForce*comHeight,stabilizingTorque:mass*9.81*rearArm};
 }
 allowWheelie(spec:VehicleSpec,speed:number,throttle:number,brake:number,bodyLean:number){
  const maxKmh=spec.wheelieMaxSpeedKmh[this.gear-1]??0;
  if(maxKmh<=0||speed*3.6>maxKmh||speed<BODY_TUNING.minWheelieSpeed||throttle<.45||this.limiting||this.clutch<.12)return 0;
  const {pitchTorque,stabilizingTorque}=this.wheeliePhysics(spec,speed,throttle,bodyLean);
  return pitchTorque*BODY_TUNING.wheeliePitchForceScale>=stabilizingTorque*BODY_TUNING.wheelieForceMargin?1:0;
 }
 reset(){this.resetClutchKick();this.gear=1;this.rpm=ENGINE_TUNING.idleRpm;this.ratio=0;this.limiting=false;this.cutting=false;this.clutch=0;this.lugging=false;this.shiftTime=0;this.shiftCooldown=0;this.phase=0;this.revMatchTime=0;this.revMatchPeak=0;this.stalled=false}
 requestShift(direction:-1|1,speed:number,spec:VehicleSpec,_topSpeed:number,realistic=false){
  if(spec.gears===1||this.shiftCooldown>0)return false;
  const next=clamp(this.gear+direction,1,spec.gears);
  if(next===this.gear)return false;
  const oldGear=this.gear,previousRpm=this.rpm,nextRpm=this.wheelRpmFromSpeed(speed,spec,next),target=clamp(nextRpm,spec.idleRpm,spec.redlineRpm);
  if(direction===-1&&nextRpm>spec.redlineRpm)return false;
  if(realistic){
   this.gear=next;this.shiftCooldown=ENGINE_TUNING.shiftDelay;this.shiftTime=0;this.limiting=false;this.cutting=false;
   if(direction===-1){this.rpm=previousRpm;this.startRevMatch(target,spec,oldGear-next)}
   else{this.revMatchTime=0;this.revMatchPeak=0}
   this.rpm=target;
   return true;
  }
  this.gear=next;this.shiftCooldown=ENGINE_TUNING.shiftDelay;this.shiftTime=0;this.limiting=false;this.cutting=false;
  if(direction===-1)this.startRevMatch(this.estimatedRpm(spec,speed,next),spec,oldGear-next);
  else{this.revMatchTime=0;this.revMatchPeak=0}
  this.rpm=this.estimatedRpm(spec,speed,next);
  return true;
 }
 update(dt:number,speed:number,spec:VehicleSpec,topSpeed:number,throttle:number,brake:number,push:boolean,automatic=true,realistic=false){
  if(push||speed<.5||this.stalled)this.cancelBlip();
  if(realistic){this.updateRealistic(dt,speed,spec,topSpeed,throttle,brake,push,automatic);return}
  const t=ENGINE_TUNING;dt=clamp(dt,0,.1);this.gear=clamp(this.gear,1,spec.gears);
  this.shiftCooldown=Math.max(0,this.shiftCooldown-dt);
  if(push||(automatic&&speed<.1)){this.gear=1;this.shiftTime=0;this.limiting=false}
  const maxForGear=(gear:number)=>Math.min(topSpeed,this.speedAtRedline(spec,gear));
  let wheelRpm=this.wheelRpmFromSpeed(speed,spec),downshiftSteps=0;
  if(automatic&&this.shiftCooldown===0&&this.gear>1&&speed<maxForGear(this.gear-1)*t.downshiftRatio){
   const oldGear=this.gear;this.gear--;downshiftSteps=oldGear-this.gear;this.shiftTime=0;
   this.shiftCooldown=t.shiftDelay;
   wheelRpm=this.wheelRpmFromSpeed(speed,spec);
  }
  this.updateLimiter(dt,wheelRpm,spec,throttle,brake,push);
  if(automatic&&this.shiftCooldown===0&&this.gear<spec.gears&&(wheelRpm>=spec.redlineRpm-180||speed>=maxForGear(this.gear)*.98)){
   this.shiftTime+=dt;
   if(this.shiftTime>=t.shiftDelay){this.gear++;this.shiftCooldown=t.shiftDelay;this.shiftTime=0;this.limiting=false;wheelRpm=this.wheelRpmFromSpeed(speed,spec)}
  }else this.shiftTime=0;
  if(!this.limiting){this.phase=0;this.cutting=false}this.ratio=clamp(wheelRpm/spec.redlineRpm,0,1);
  const target=clamp(wheelRpm,spec.idleRpm,spec.redlineRpm);if(downshiftSteps)this.startRevMatch(target,spec,downshiftSteps);
  this.revMatchTime=Math.max(0,this.revMatchTime-dt);this.rpm=target+this.revMatchPeak*this.revMatchEnvelope;
  if(this.revMatchTime===0)this.revMatchPeak=0;
  this.clutch=1;this.lugging=false;
 }
 private updateRealistic(dt:number,speed:number,spec:VehicleSpec,topSpeed:number,throttle:number,brake:number,push:boolean,automatic:boolean){
  const t=ENGINE_TUNING;dt=clamp(dt,0,.1);this.gear=clamp(this.gear,1,spec.gears);this.shiftCooldown=Math.max(0,this.shiftCooldown-dt);
  const speedKmh=Math.max(0,speed)*3.6,gearMax=Math.min(topSpeed*3.6,this.speedAtRedline(spec)*3.6);
  let wheelRpm=this.wheelRpmFromSpeed(speed,spec);
  let downshiftSteps=0;
  if(automatic&&this.shiftCooldown===0){
   if(this.gear<spec.gears&&(wheelRpm>=spec.redlineRpm-180||speedKmh>=gearMax)){
    this.gear++;this.shiftCooldown=t.shiftDelay;wheelRpm=this.wheelRpmFromSpeed(speed,spec);
   }else if(this.gear>1&&(wheelRpm<spec.idleRpm+850||speedKmh<(spec.gearMinSpeedKmh[this.gear-1]??0)*.78)){
    const oldGear=this.gear;this.gear--;downshiftSteps=oldGear-this.gear;this.shiftCooldown=t.shiftDelay;wheelRpm=this.wheelRpmFromSpeed(speed,spec);
   }
  }
  const idle=spec.idleRpm,redline=spec.redlineRpm,gearMin=spec.gearMinSpeedKmh[this.gear-1]??0;
  if(downshiftSteps)this.startRevMatch(clamp(wheelRpm,idle,redline),spec,downshiftSteps);
  // The blip opens the throttle briefly, including clutch engagement and delivered torque.
  this.revMatchTime=Math.max(0,this.revMatchTime-dt);
  throttle=this.effectiveThrottle(throttle);
  const gearLowSpeed=gearMin>0&&speedKmh<gearMin*.45;
  const nearStall=gearLowSpeed&&this.gear>=3&&speedKmh<Math.max(2,gearMin*.1);
  const freeRpm=idle+(redline-idle)*(push?0:.025+clamp(throttle,0,1)*.58);
  const clutchBlend=smoothstep((wheelRpm-spec.clutchEngagementRpm)/Math.max(spec.clutchEngagementRpm*2.2,1));
  const fullyCoupled=clutchBlend>=.999;
  const target=clamp(freeRpm+(wheelRpm-freeRpm)*clutchBlend,idle,redline);
  const clutchSlipFactor=fullyCoupled?1:smoothstep((freeRpm-spec.clutchEngagementRpm)/t.clutchSlipRpm)*.9;
  const minimumSlip=gearLowSpeed&&this.gear>1?.12:0;
  this.clutch=push?0:clamp(clutchSlipFactor,minimumSlip,1);
  this.lugging=!push&&this.gear>1&&(speedKmh<gearMin||gearLowSpeed||this.clutch<.18);
  this.updateLimiter(dt,wheelRpm,spec,throttle,brake,push);
  const rpmFloor=nearStall&&this.gear>=5?spec.stallRpm*.72:idle;
  const shouldStall=!push&&this.gear>=5&&speedKmh<2&&throttle>.8&&this.rpm<spec.stallRpm;
  if(shouldStall||this.stalled){
   this.stalled=true;this.clutch=0;this.lugging=true;this.rpm=Math.max(0,this.rpm-dt*2200);
   this.ratio=clamp((this.rpm-idle)/(redline-idle),0,1);
   if(push||speed>.45||throttle<.05)this.stalled=false;
   return;
  }
  const rpmTarget=nearStall?Math.min(spec.stallRpm*(this.gear>=5?.82:1),target):target;
  if(fullyCoupled)this.rpm=clamp(rpmTarget,idle,redline);
  else this.rpm+=(rpmTarget-this.rpm)*(1-Math.exp(-dt*t.rpmResponse));
  this.rpm=clamp(this.rpm,rpmFloor,redline);
  if(this.revMatchTime>0)this.rpm=clamp(Math.max(rpmTarget,this.estimatedRpm(spec,speed))+this.revMatchPeak*this.revMatchEnvelope,idle,redline);
  else this.revMatchPeak=0;
  this.ratio=clamp((this.rpm-idle)/(redline-idle),0,1);
 }
}
