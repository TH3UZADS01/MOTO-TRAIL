import type {Tyre} from './career';

// Friction coefficients, additional rolling deceleration (m/s²), slip recovery (1/s).
export const surfaces={
 asfalto:{long:1.12,lat:1.12,roll:0,recovery:10},
 terra:{long:.79,lat:.76,roll:.18,recovery:7},
 cascalho:{long:.63,lat:.53,roll:.32,recovery:5},
 areia:{long:.59,lat:.54,roll:.85,recovery:4.5},
 lama:{long:.43,lat:.35,roll:.52,recovery:3.8},
 grama:{long:.63,lat:.57,roll:.34,recovery:5.5}
};
export type ContactSurface=keyof typeof surfaces;
export const touringAssist={transition:20,slipResponse:9,maxSlide:.23,countersteer:.42};
export class WheelContact{
 surface:ContactSurface='asfalto';
 longitudinalGrip=surfaces.asfalto.long;lateralGrip=surfaces.asfalto.lat;rollingResistance=0;
 tireGripMultiplier=1;
 get state(){const slip=Math.max(Math.abs(this.slipRatio),Math.abs(this.lateralSlip));return slip>.5?'HIGH SLIP':slip>.12?'SLIP':'GRIP'}
 slipRatio=0;lateralSlip=0;forceScale=1;normalLoad=0;
 update(dt:number,surface:ContactSurface,tyre:Tyre,health:number,load:number,longForce:number,sideForce:number,speed:number){
  this.surface=surface;this.normalLoad=load;
  const p=surfaces[surface],blend=1-Math.exp(-dt*touringAssist.transition);
  const tread=tyre==='original'?1:surface==='asfalto'?(tyre==='pista'?1.03:.98):(tyre==='trilha'?1.20:.83);
  this.tireGripMultiplier=tread;
  this.longitudinalGrip+=(p.long*tread*(.70+.30*health)-this.longitudinalGrip)*blend;
  this.lateralGrip+=(p.lat*tread*health-this.lateralGrip)*blend;
  this.rollingResistance+=(p.roll/Math.sqrt(tread)-this.rollingResistance)*blend;
  const longitudinal=longForce/Math.max(1,load*this.longitudinalGrip);
  const lateral=sideForce/Math.max(1,load*this.lateralGrip);
  const demand=Math.hypot(longitudinal,lateral);
  // Smooth saturation of the combined contact forces near the friction limit.
  this.forceScale=1/Math.pow(1+demand**6,1/6);
  const lost=1-this.forceScale;
  const relax=(old:number,target:number)=>old+(target-old)*(1-Math.exp(-dt*(Math.abs(target)>Math.abs(old)?touringAssist.slipResponse:p.recovery)));
  this.slipRatio=relax(this.slipRatio,Math.tanh(longitudinal)*lost);
  this.lateralSlip=relax(this.lateralSlip,Math.tanh(lateral)*lost*Math.min(1,Math.abs(speed)/4));
 }
}
