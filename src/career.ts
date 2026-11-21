import {adventure,type Prep} from './adventure-tuning';
import type {TripProgress,Market} from './adventures';
import {vehicles,type VehicleId} from './vehicles';

export type Tyre='original'|'pista'|'trilha';
export type Condition='motor'|'freios'|'pneus';
export type Equipment={km?:number;prep?:Prep;box:boolean;tyre:Tyre;color?:string}&Record<Condition,number>;
export const factory=():Equipment=>({box:false,tyre:'original',motor:100,freios:100,pneus:100});
export type Site={x:number;z:number;name:string};
export type Job={id:string;name:string;from:Site;to:Site;returning:boolean;pickup:boolean;kg?:number;load:number;pay:number;vehicle:VehicleId};
export type RegionCooldown={x:number;z:number;until:number};
export type Career={market?:Market;expedition?:TripProgress;completedTrips?:string[];tanks?:Partial<Record<VehicleId,number>>;money:number;owned:VehicleId[];garage:Partial<Record<VehicleId,Equipment>>;pet:boolean;job:Job|null;cooldowns:RegionCooldown[]};
const key='moto-trail-career-v2';
export const bikePrices:Record<Exclude<VehicleId,'cub'>,number>={pop:0,caloi:100,urban:350,cg150:650,sahara:1250};
export function buyVehicle(state:Career,id:VehicleId){
 if(id==='cub')throw Error('Descubra todos os locais do mapa para ganhar a Honda Cub');
 if(state.owned.includes(id))throw Error('Esta moto já está na garagem');
 purchase(state,bikePrices[id],()=>{state.owned.push(id)});
}
export function awardCub(state:Career){
 if(state.owned.includes('cub'))return false;
 state.owned.push('cub');return true;
}
export const prices={box:180,paint:45,tyre:90};
export const capacity=(gear:Equipment)=>gear.box?12:2;
export const weightLimit=(gear:Equipment)=>gear.box?adventure.cargo.boxKg:adventure.cargo.baseKg;
export const jobKg=(j:Job)=>j.kg??j.load*adventure.cargo.density;
export const carriedKg=(j:Job|null,id:VehicleId)=>j?.vehicle===id&&!j.pickup?jobKg(j):0;
export const target=(j:Job)=>j.returning&&!j.pickup?j.from:j.to;
export const DELIVERY_RADIUS=8;
export const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
export const cash=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function offer(name:string,from:Site,to:Site,load:number,vehicle:VehicleId,returning=false,rural=false):Job{
 const km=distance(from,to)/1000*(returning?2:1);
 return {id:crypto.randomUUID(),name,from,to,load,vehicle,returning,pickup:returning,kg:load*adventure.cargo.density,pay:Math.round(16+km*(9+load*.8)*(rural?1.15:1)+load*2)};
}
export function acceptJob(state:Career,job:Job){
 if(state.job||state.expedition&&!state.expedition.paused)throw Error('Pause a expedição ou conclua a viagem atual');
 const gear=equipment(state,job.vehicle);
 if(job.load>capacity(gear)||jobKg(job)>weightLimit(gear))throw Error('Instale um baú para esta carga');
 state.job=job;
}
export function cancelJob(state:Career,id:string){
 if(state.job?.id!==id)throw Error('Entrega indisponível');
 state.job=null;
}
export function arrive(state:Career,id:string,at:Site){
 const j=state.job;
 if(!j||j.id!==id||distance(at,target(j))>DELIVERY_RADIUS)return '';
 if(j.pickup){j.pickup=false;return 'Item retirado. Volte ao motociclista.'}
 state.money+=j.pay;state.job=null;
 if(j.from.name==='Motociclista')suppressRegion(state,j.from);
 return 'Serviço concluído · +'+cash(j.pay);
}
function suppressRegion(state:Career,site:Site){
 const now=Date.now();
 state.cooldowns=state.cooldowns.filter(c=>c.until>now);
 state.cooldowns.push({x:site.x,z:site.z,until:now+180000});
}
export function purchase(state:Career,price:number,install:()=>void){
 if(state.money<price)throw Error('Saldo insuficiente');
 state.money-=price;install();
}
export function loadCareer():Career{
 const defaults:Career={money:0,owned:['pop'],garage:{},pet:true,job:null,cooldowns:[]};
 const raw=localStorage.getItem(key);
 if(!raw)return defaults;
 try{
  const saved=JSON.parse(raw);
  if(!saved||typeof saved!=='object')return defaults;
  const owned=vehicles.filter(v=>Array.isArray(saved.owned)&&saved.owned.includes(v.id)).map(v=>v.id);
  return {...defaults,...saved,owned:owned.length?owned:defaults.owned,garage:saved.garage??{},cooldowns:Array.isArray(saved.cooldowns)?saved.cooldowns:[]};
 }catch{return defaults}
}
export function openCareer(){
 for(const obsolete of ['moto-trail-career-v1','ride-fuel-v1','bike-colors-v1','bike-dirt-v1','explored-places-v1','caramelos-mission-v1','caramelos-mission-v2']){
  localStorage.removeItem(obsolete);
 }
 sessionStorage.removeItem('ride-room');
 let current=loadCareer();
 if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(current));
 window.addEventListener('storage',e=>{if(e.key===key)current=loadCareer()});
 function changeNow(edit:(s:Career)=>void,done?:()=>void){
  const next=loadCareer();edit(next);localStorage.setItem(key,JSON.stringify(next));current=next;done?.();
 }
 return {get state(){return current},changeNow,async change(edit:(s:Career)=>void,done?:()=>void){
  const commit=()=>changeNow(edit,done);
  if(navigator.locks)await navigator.locks.request(key,commit);else commit();
 }};
}
export function equipment(s:Career,id:VehicleId){return s.garage[id]??=factory()}
export function tyreResponse(gear:Equipment,road:boolean,speed:number,turn:number,throttle:number){
 const mismatch=gear.tyre==='trilha'?road:gear.tyre==='pista'&&!road;
 const grip=gear.tyre==='original'?1:mismatch?(road?.92:.80):(road?1.025:1.20);
 const slip=mismatch?Math.min(1,Math.abs(speed)/15)*turn*(.04+.08*throttle):0;
 return {grip:grip*(.86+.14*gear.pneus/100),slip};
}
