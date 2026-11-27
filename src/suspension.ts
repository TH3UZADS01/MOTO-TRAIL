import type {VehicleId,VehicleSpec} from './vehicles';

// Available compression from normal ride height, in metres.
const travel:Record<VehicleId,number>={twister:.075,r1200gs:.12,sahara:.135,cg150:.083,pop:.063,cub:.06,urban:.052,caloi:.047};
// Dynamic travel per unit of weight moved between axles (fraction of total weight).
export const loadTuning={gravity:9.81,response:9,frontTravel:1.35,rearTravel:1.05,steeringFeedback:.14,brakeFeedback:.08};
class Axle {
 compression=0;
 normalLoad=0; // Newtons
 private velocity=0;
 private previousHeight?:number;
 reset(){this.normalLoad=0;this.compression=0;this.velocity=0;this.previousHeight=undefined}
 step(dt:number,height:number,target:number,limit:number,frequency:number){
  const change=height-(this.previousHeight??height);
  this.previousHeight=height;
  if(Math.abs(change)>.45){this.velocity=0;this.compression=0;return}
  const groundVelocity=change/dt,steps=Math.ceil(dt*120),h=dt/steps;
  for(let i=0;i<steps;i++){
   const relative=groundVelocity-this.velocity;
   const damping=relative>0?.58:.78;
   this.velocity+=(frequency*frequency*(this.compression-target)+2*damping*frequency*relative)*h;
   const next=this.compression+(groundVelocity-this.velocity)*h;
   this.compression=Math.max(-limit*.55,Math.min(limit,next));
   if(next!==this.compression)this.velocity=groundVelocity;
  }
 }
}
export class Suspension {
 readonly front=new Axle();
 readonly rear=new Axle();
 acceleration=0;
 transfer=0; // Positive shifts weight rearwards.
 loadShift=0; // Transfer as a fraction of total normal load.
 resetLoads(){this.acceleration=this.transfer=this.loadShift=this.front.normalLoad=this.rear.normalLoad=0}
 reset(){this.resetLoads();this.front.reset();this.rear.reset()}
 step(dt:number,spec:VehicleSpec,frontHeight:number,rearHeight:number,acceleration:number,cargo:number,lift:number,travelScale=1,frequencyScale=1,simcade=false,pitch=0,riderRise=0){
  if(dt<=0)return;
  const limit=travel[spec.id]*travelScale,frequency=(spec.id==='sahara'?12:15)*frequencyScale;
  const transfer=Math.max(-1,Math.min(1,acceleration*spec.centerOfMassHeight/(9.81*spec.wheelbase)));
  const airborne=Math.min(1,lift/.20);
  if(simcade){
   const mass=(spec.mass??100)+spec.riderMass+cargo;
   const weight=mass*loadTuning.gravity*Math.cos(pitch);
   const frontBias=spec.centerOfMassRearDistance/spec.wheelbase;
   this.acceleration=acceleration;
   // On a slope, subtract gravitational acceleration along the road from measured acceleration.
   const wanted=mass*(acceleration+loadTuning.gravity*Math.sin(pitch))*(spec.centerOfMassHeight+riderRise*spec.riderMass/mass*.45)/spec.wheelbase;
   const bounded=Math.max(-(1-frontBias)*weight,Math.min(frontBias*weight,wanted));
   this.transfer+=(bounded-this.transfer)*(1-Math.exp(-dt*loadTuning.response));
   this.front.normalLoad=Math.max(0,Math.min(weight,weight*frontBias-this.transfer))*(1-airborne);
   this.rear.normalLoad=weight-this.front.normalLoad;
   this.loadShift=frontBias-this.front.normalLoad/weight;
   const massFrequency=frequency*Math.sqrt(175/mass);
   this.front.step(dt,frontHeight,-limit*loadTuning.frontTravel*this.loadShift,limit,massFrequency);
   this.rear.step(dt,rearHeight,limit*(loadTuning.rearTravel*this.loadShift+.012*cargo),limit,massFrequency*.93);
   return;
  }
  this.front.step(dt,frontHeight,limit*(-1.65*transfer*(1-airborne)-.52*airborne),limit,frequency);
  this.rear.step(dt,rearHeight,limit*(1.25*transfer+.23*airborne+.012*cargo),limit,frequency*.93);
 }
}
