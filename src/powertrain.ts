import type {VehicleSpec} from './vehicles';
import {clamp} from './body-control';
// Gameplay RPM calibration, not manufacturer dyno data. Automatic shifts remain enabled.
export const ENGINE_TUNING={idleRpm:1400,redlineRpm:8500,shiftDelay:.22,downshiftRatio:.72,cutHz:8,cutDuty:.32,cutGain:.16,rpmResponse:12};
export function gearSpeedLimit(gears:number,gear:number,topSpeed:number){return gears===1?topSpeed:topSpeed*(.24+.76*(clamp(gear,1,gears)-1)/(gears-1))}
export class Powertrain {
 gear=1;rpm=ENGINE_TUNING.idleRpm;ratio=0;limiting=false;cutting=false;private shiftTime=0;private phase=0;
 get driveFactor(){return this.cutting?0:1}
 reset(){this.gear=1;this.rpm=ENGINE_TUNING.idleRpm;this.ratio=0;this.limiting=false;this.cutting=false;this.shiftTime=0;this.phase=0}
 update(dt:number,speed:number,spec:VehicleSpec,topSpeed:number,throttle:number,brake:number,push:boolean){
  const t=ENGINE_TUNING;dt=clamp(dt,0,.1);this.gear=clamp(this.gear,1,spec.gears);
  if(push||speed<.1){this.gear=1;this.shiftTime=0;this.limiting=false}
  let ratio=Math.max(0,speed)/gearSpeedLimit(spec.gears,this.gear,topSpeed);
  if(this.gear>1&&speed<gearSpeedLimit(spec.gears,this.gear-1,topSpeed)*t.downshiftRatio){this.gear--;this.shiftTime=0;ratio=speed/gearSpeedLimit(spec.gears,this.gear,topSpeed)}
  const atLimit=ratio>=.998||(this.limiting&&ratio>=.99);
  this.limiting=!push&&speed>.5&&throttle>.25&&brake<.05&&atLimit;
  if(this.gear<spec.gears&&(ratio>=.998||(this.shiftTime>0&&ratio>.97))){this.shiftTime+=dt;if(this.shiftTime>=t.shiftDelay){this.gear++;this.shiftTime=0;this.limiting=false;ratio=speed/gearSpeedLimit(spec.gears,this.gear,topSpeed)}}else this.shiftTime=0;
  if(this.limiting)this.phase=(this.phase+dt*t.cutHz)%1;else this.phase=0;
  this.cutting=this.limiting&&this.phase<t.cutDuty;
  this.ratio=clamp(ratio,0,1);const target=t.idleRpm+this.ratio*(t.redlineRpm-t.idleRpm);
  this.rpm+=(target-this.rpm)*(1-Math.exp(-dt*t.rpmResponse));
 }
}
