import {adventure,retailPrice,originalPrep,partPrice,parts,type Part,type Slot} from './adventure-tuning';
import {payment,baseBikePrices,bikePrices,cash,distance,equipment,factory,purchase,target,type Career,type Site} from './career';
import {villages,specials,stations,viewpoints} from './map-layout';
import {PALETTE} from './paint';
import type {VehicleId} from './vehicles';

export function installPart(s:Career,id:VehicleId,slot:Slot,part:Part|'original'){
 if(!s.owned.includes(id)||part!=='original'&&parts[part].slot!==slot)throw Error('Preparação incompatível');
 const gear=equipment(s,id),prep=gear.prep??=originalPrep();
 if(part!=='original'&&!prep.bought.includes(part))purchase(s,partPrice(id,part),()=>prep.bought.push(part));
 Object.assign(prep,{[slot]:part});
}

type SaleId=Exclude<VehicleId,'cub'>;
export type Listing={id:string;vehicle:SaleId;km:number;motor:number;freios:number;pneus:number;color:string;price:number};
export type Market={pricing?:number;until:number;list:Listing[]};
const market=adventure.market;
export function usedPrice(id:SaleId,km:number,condition:number){
 return retailPrice(Math.round(baseBikePrices[id]*(market.baseFraction+market.conditionPremium*condition/100-market.mileageDiscount*Math.min(1,km/market.maxKm))));
}
export function renewMarket(s:Career,now=Date.now(),random=Math.random){
 if(s.market&&s.market.until>now){
  if((s.market.pricing??0)<3){
   for(const l of s.market.list){
    l.price=s.market.pricing===2?retailPrice(l.price):usedPrice(l.vehicle,l.km,(l.motor+l.freios+l.pneus)/3);
   }
   s.market.pricing=3;
  }
  return;
 }
 const available=(Object.keys(bikePrices) as SaleId[]).filter(id=>bikePrices[id]>0&&!s.owned.includes(id));
 const list:Listing[]=[];
 const between=(a:number,b:number)=>Math.floor(a+random()*(b-a+1));
 while(list.length<market.count&&available.length){
  const vehicle=available.splice(between(0,available.length-1),1)[0];
  const km=between(market.minKm,market.maxKm);
  const wear=()=>between(market.minCondition,market.maxCondition);
  const motor=wear(),freios=wear(),pneus=wear(),price=usedPrice(vehicle,km,(motor+freios+pneus)/3);
  list.push({id:crypto.randomUUID(),vehicle,km,motor,freios,pneus,price,color:PALETTE[between(0,PALETTE.length-1)]});
 }
 s.market={pricing:3,until:now+market.interval,list};
}
export function buyUsed(s:Career,id:string,now=Date.now()){
 if(s.market&&s.market.until>now)renewMarket(s,now);
 const market=s.market,listing=market?.list.find(l=>l.id===id);
 if(!listing||!market||now>=market.until||s.owned.includes(listing.vehicle))throw Error('Anúncio indisponível');
 purchase(s,listing.price,()=>{
  const {vehicle,km,motor,freios,pneus,color}=listing;
  s.owned.push(vehicle);s.garage[vehicle]={...factory(),km,motor,freios,pneus,color};
  market.list=market.list.filter(l=>l.id!==id);
 });
}

function trip(id:string,name:string,description:string,difficulty:string,factor:number,stops:Site[]){
 const km=stops.slice(1).reduce((sum,p,i)=>sum+distance(stops[i],p)/1000,0);
 return {id,name,description,difficulty,stops,km,pay:payment(Math.round((km*adventure.trips.perKm+stops.length*adventure.trips.perStop)*factor))};
}
const legacyCrossing=trip('travessia','Travessia do Horizonte','Atravesse o vale entre a serra, o lago e o litoral.','Longa · mista',1.3,[villages[0],viewpoints[0],specials[0],villages[2],specials[2],specials[1],villages[3],viewpoints[2]]);
export const trips=[
 trip('vila','Passeio da vila','Visite o posto e suba ao mirante.','Fácil',1,[villages[0],stations[0],viewpoints[0]]),
 trip('interior','Caminhos do interior','Cruze a vila, a fazenda e o camping.','Mista',1.15,[villages[1],specials[0],villages[2],specials[1],stations[4]]),
 trip('travessia','Travessia do Horizonte','Saia da Vila do Ipê, atravesse a Serra do Cobre e volte pelo Vale do Milho.','Longa · mista',1.3,[villages[0],stations[5],viewpoints[3],viewpoints[4],stations[6],specials[3],villages[4],villages[0]])
];
export type TripProgress={id:string;next:number;paused:boolean;expanded?:boolean};
export const tripById=(id:string,progress?:TripProgress)=>id===legacyCrossing.id&&progress?.id===id&&!progress.expanded?legacyCrossing:trips.find(t=>t.id===id);
export function startTrip(s:Career,id:string){
 if(s.job||s.expedition||!tripById(id)||s.completedTrips?.includes(id))throw Error('Expedição indisponível');
 s.expedition={id,next:0,paused:false,expanded:true};
}
export function pauseTrip(s:Career,id:string,paused:boolean){
 if(s.expedition?.id!==id||!paused&&s.job)throw Error('Conclua o objetivo atual');
 s.expedition.paused=paused;
}
export function destination(s:Career){
 if(s.job)return target(s.job);
 const e=s.expedition;
 return e&&!e.paused?tripById(e.id,e)?.stops[e.next]:undefined;
}
export function visitStop(s:Career,id:string,index:number,p:Site){
 const e=s.expedition,t=tripById(id,e);
 if(!e||!t||e.id!==id||e.paused||s.job||index!==e.next||!t.stops[index]||distance(t.stops[index],p)>adventure.trips.radius)return '';
 if(++e.next<t.stops.length)return 'Etapa concluída · siga para '+t.stops[e.next].name;
 delete s.expedition;
 const history=s.completedTrips??=[];
 if(history.includes(id))return '';
 history.push(id);s.money+=t.pay;
 return 'Expedição concluída · +'+cash(t.pay);
}
