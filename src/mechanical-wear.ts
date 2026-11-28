import type {Ride} from './riding';
import type {ContactSurface} from './traction';

export type WearDelta={fork:number;motor:number;pneus:number;freios:number;km:number};
export function accumulateWear(w:WearDelta,r:Ride,metres:number,soil:ContactSurface,throttle:number,dt:number){

 const paved=soil==='asfalto',km=metres/1000;
 const highRpm=Math.max(0,(r.engine.rpm/r.spec.redlineRpm-.78)/.22);
 const compression=Math.max(0,r.suspension.front.compression,r.suspension.rear.compression);
 const shock=Math.max(0,compression/.055-.4);
 const brake=Math.min(1,r.brakeInput);
 const mismatch=r.equipment.tyre==='pista'&&!paved||r.equipment.tyre==='trilha'&&paved;
 if(!r.fallen&&r.engine.running&&throttle>0)w.motor+=.003*dt*highRpm**2*throttle;
 if(metres<=0)return;
 w.km+=km;
 if(!r.pushing&&r.engine.running)w.motor+=metres/2500*.30*(1+5*highRpm**2+2*Number(r.engine.lugging)*throttle+throttle*r.cargoLoad/20);
 w.fork+=metres/3500*.30*(1+shock**2*(paved?2:4));
 w.freios+=metres/1100*.35*brake**2*(1+Math.min(2,r.speed/18));
 w.pneus+=metres/1500*.30*(mismatch?1.5:1)*(1+Number(!paved)*.3+4*Number(r.drift.active)+brake**2+Math.min(2,Math.abs(r.rearContact.slipRatio)));
}
