import {clamp} from './body-control';
import {surfaces,type ContactSurface} from './traction';

const skidAngle={asfalto:.16,cascalho:.26,terra:.33,areia:.18,lama:.30,grama:.26};

export class Drift {
 active=false;
 slip=0;
 reset(){this.active=false;this.slip=0}

 update(dt:number,held:boolean,speed:number,steer:number,surface:ContactSurface,grip:number,load:number){
  this.active=held;
  const traction=clamp(grip*load,.5,1.5);
  const pace=clamp((speed*3.6-8)/24,0,1);
  const target=held?clamp(steer*pace*skidAngle[surface]/traction,-.36,.36):0;
  const response=held?7:4+surfaces[surface].recovery*traction;
  this.slip+=(target-this.slip)*(-Math.expm1(-response*dt));
 }
}
