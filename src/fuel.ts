import {getVehicle,vehicles,type VehicleId} from './vehicles';
import type {Career,openCareer} from './career';

export const GAS_PRICE=7;
export const capacities:Record<VehicleId,number>={pop:4.2,cub:3.7,urban:3,caloi:2.7,cg150:14,sahara:13.8};
export const kmPerLiter:Record<VehicleId,number>={pop:48,cub:100/1.5,urban:45,caloi:35,cg150:38,sahara:29};
export const CONSUMPTION_MULTIPLIER=3;
const bounded=(value:number,id:VehicleId)=>Math.max(0,Math.min(capacities[id],value));

export class Fuel {
 private initial={...capacities};
 private delta:Partial<Record<VehicleId,number>>={};
 private store?:ReturnType<typeof openCareer>;
 constructor(private scale=CONSUMPTION_MULTIPLIER){}
 bind(store:ReturnType<typeof openCareer>){
  this.store=store;
  try{
   const old=JSON.parse(localStorage.getItem('ride-fuel-v2')||'{}');
   for(const {id} of vehicles)if(Number.isFinite(old?.[id]))this.initial[id]=bounded(old[id],id);
  }catch{}
 }
 private level(id:VehicleId,state?:Career){
  const saved=state?.tanks?.[id];
  return bounded((typeof saved==='number'&&Number.isFinite(saved)?saved:this.initial[id])+(this.delta[id]??0),id);
 }
 get(id:VehicleId){return this.level(id,this.store?.state)}
 ratio(id:VehicleId){return this.get(id)/capacities[id]}
 consume(id:VehicleId,meters:number,dt:number,throttle:number,speed:number,pitch:number,push:boolean,rpm=getVehicle(id).idleRpm,load=0){
  if(push||dt<=0)return;
  const spec=getVehicle(id),rev=Math.min(1,Math.max(0,rpm/spec.redlineRpm));
  // Reference cruise: moderate throttle, half redline, level ground and no freight.
  const effort=.58+.30*throttle+.36*rev+.12*(Math.abs(speed)/(spec.maxSpeed*.55))**2
    +Math.max(0,Math.min(12,load))*.014+Math.max(-.15,Math.sin(pitch))*1.4;
  const liters=meters>0?meters/1000/kmPerLiter[id]*effort:dt/3600*(.12+capacities[id]*.018)*(1+rev*throttle*3);
  this.delta[id]=(this.delta[id]??0)-Math.min(this.get(id),liters*this.scale);
 }
 rescue(id:VehicleId){if(this.get(id)>.01)return false;this.delta[id]=(this.delta[id]??0)+.7-this.get(id);return true}

 // Merge only locally ridden litres into the latest career. Money and tanks share one storage write.
 private checkpoint(s:Career){
  s.tanks??={};
  for(const {id} of vehicles)s.tanks[id]=this.level(id,s);
 }
 saveNow(){
  if(this.store&&Object.keys(this.delta).length)this.store.changeNow(s=>this.checkpoint(s),()=>{this.delta={}});
 }
 async save(){
  if(this.store&&Object.keys(this.delta).length)await this.store.change(s=>this.checkpoint(s),()=>{this.delta={}});
 }
 async buy(id:VehicleId,requested:number){
  if(!this.store||!Number.isFinite(requested)||requested<=0)return 0;
  let liters=0;
  await this.store.change(s=>{
   this.checkpoint(s);
   const available=Math.max(0,Math.round(s.money*100)),current=s.tanks![id]!;
   liters=Math.min(requested,capacities[id]-current,available/(GAS_PRICE*100));
   if(liters<=0)return;
   const cents=Math.ceil(liters*GAS_PRICE*100-1e-8);
   if(cents<=0){liters=0;return}
   s.money=(available-cents)/100;
   s.tanks![id]=bounded(current+liters,id);
  },()=>{this.delta={}});
  return liters;
 }
}
