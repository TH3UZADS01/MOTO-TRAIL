import {clamp} from './body-control';

// Seconds, metres/second and radians. A locked rear wheel slides; it cannot drive.
export const DRIFT_TUNING={holdSeconds:1,brakeThreshold:.6,minSpeed:2,releaseSpeed:.8,steeringBoost:1.35,maxSlip:.48,response:5,recovery:8,brakingFactor:.3};
export class Drift {
 held=0;active=false;amount=0;slip=0;
 reset(){this.held=0;this.active=false;this.amount=0;this.slip=0}
 update(dt:number,brake:number,speed:number,steer:number,disabled=false){
  const t=DRIFT_TUNING;
  if(disabled){this.reset();return}
  if(brake<t.brakeThreshold||speed<(this.active?t.releaseSpeed:t.minSpeed)){this.held=0;this.active=false}
  else {this.held+=dt;this.active=this.held+1e-9>=t.holdSeconds}
  this.amount+=((this.active?1:0)-this.amount)*(1-Math.exp(-dt*(this.active?t.response:t.recovery)));
  const target=clamp(steer,-1,1)*t.maxSlip*this.amount;
  this.slip+=(target-this.slip)*(1-Math.exp(-dt*t.recovery));
 }
}
