import type {VehicleSpec} from './vehicles';
import {clamp} from './body-control';
// Gameplay RPM calibration, not manufacturer dyno data.
export const ENGINE_TUNING={idleRpm:1400,redlineRpm:8500,shiftDelay:.22,downshiftRatio:.72,cutHz:8,cutDuty:.32,cutGain:.16,rpmResponse:12};
export function gearSpeedLimit(gears:number,gear:number,topSpeed:number){return gears===1?topSpeed:topSpeed*(.24+.76*(clamp(gear,1,gears)-1)/(gears-1))}
export class Powertrain {
 gear=1;rpm=ENGINE_TUNING.idleRpm;ratio=0;limiting=false;cutting=false;private shiftTime=0;private shiftCooldown=0;private phase=0;
 get driveFactor(){return this.cutting?0:1}
 reset(){this.gear=1;this.rpm=ENGINE_TUNING.idleRpm;this.ratio=0;this.limiting=false;this.cutting=false;this.shiftTime=0;this.shiftCooldown=0;this.phase=0}
 requestShift(direction:-1|1,speed:number,spec:VehicleSpec,topSpeed:number){
  if(spec.gears===1||this.shiftCooldown>0)return false;
  const next=clamp(this.gear+direction,1,spec.gears);
  if(next===this.gear)return false;
  const nextLimit=gearSpeedLimit(spec.gears,next,topSpeed);
  if(direction===1&&speed<gearSpeedLimit(spec.gears,this.gear,topSpeed)*.42)return false;
  if(direction===-1&&speed>=nextLimit*.92)return false;
  this.gear=next;this.shiftCooldown=ENGINE_TUNING.shiftDelay;this.shiftTime=0;this.limiting=false;this.cutting=false;
  return true;
 }
 update(dt:number,speed:number,spec:VehicleSpec,topSpeed:number,throttle:number,brake:number,push:boolean,automatic=true){
  const t=ENGINE_TUNING;dt=clamp(dt,0,.1);this.gear=clamp(this.gear,1,spec.gears);
  this.shiftCooldown=Math.max(0,this.shiftCooldown-dt);
  if(push||speed<.1){this.gear=1;this.shiftTime=0;this.limiting=false}
  let ratio=Math.max(0,speed)/gearSpeedLimit(spec.gears,this.gear,topSpeed);
  if(automatic&&this.gear>1&&speed<gearSpeedLimit(spec.gears,this.gear-1,topSpeed)*t.downshiftRatio){this.gear--;this.shiftTime=0;ratio=speed/gearSpeedLimit(spec.gears,this.gear,topSpeed)}
  const atLimit=ratio>=.998||(this.limiting&&ratio>=.997);
  this.limiting=!push&&speed>.5&&throttle>.25&&brake<.05&&atLimit;
  if(automatic&&this.gear<spec.gears&&(ratio>=.998||(this.shiftTime>0&&ratio>.97))){this.shiftTime+=dt;if(this.shiftTime>=t.shiftDelay){this.gear++;this.shiftTime=0;this.limiting=false;ratio=speed/gearSpeedLimit(spec.gears,this.gear,topSpeed)}}else this.shiftTime=0;
  if(this.limiting)this.phase=(this.phase+dt*t.cutHz)%1;else this.phase=0;
  this.cutting=this.limiting&&this.phase<t.cutDuty;
  this.ratio=clamp(ratio,0,1);const target=t.idleRpm+this.ratio*(t.redlineRpm-t.idleRpm);
  this.rpm+=(target-this.rpm)*(1-Math.exp(-dt*t.rpmResponse));
 }
}
