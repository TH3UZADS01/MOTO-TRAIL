import type {VehicleId} from './vehicles';
export const capacities:Record<VehicleId,number>={pop:4.2,cub:4,urban:4,caloi:2.7};
export class Fuel {
 private tanks={...capacities};
 get(id:VehicleId){return this.tanks[id]}
 ratio(id:VehicleId){return this.get(id)/capacities[id]}
 consume(id:VehicleId,meters:number,dt:number,throttle:number,speed:number,pitch:number,push:boolean){if(push||this.get(id)<=0)return;const efficiency=id==='caloi'?.7:1,liters=meters/1000*(.065+.04*(Math.abs(speed)/28)**2+.015*throttle+Math.max(0,pitch)*.08)*efficiency+dt*.000015;this.tanks[id]=Math.max(0,this.get(id)-liters)}
 refill(id:VehicleId,dt:number){this.tanks[id]=Math.min(capacities[id],this.get(id)+dt*.25)}
 rescue(id:VehicleId){if(this.get(id)>.01)return false;this.tanks[id]=.7;return true}
 save(){try{localStorage.setItem('ride-fuel-v1',JSON.stringify(this.tanks))}catch{}}
 restore(){try{const saved=JSON.parse(localStorage.getItem('ride-fuel-v1')||'{}');for(const id of Object.keys(capacities) as VehicleId[]){const n=saved[id];if(typeof n==='number'&&Number.isFinite(n))this.tanks[id]=Math.max(0,Math.min(capacities[id],n))}}catch{}}
}
