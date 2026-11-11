export type VehicleId='pop'|'cub'|'urban'|'caloi'|'cg150';
export interface VehicleSpec {id:VehicleId;name:string;note:string;maxSpeed:number;aerodynamicDrag:number;power:number;wheelbase:number;eyeHeight:number;gears:number;audio:'engine'|'moped'|'cg150';pitch:number;filter:number;mass?:number;braking?:number;stability?:number}
// Performance values are game tuning, not claims about the pictured vehicle's year/spec.
export const vehicles:VehicleSpec[]=[
 {id:'cg150',name:'Honda CG 150 2008',note:'150 cc · urbana · até 132 km/h',maxSpeed:132/3.6,aerodynamicDrag:.002,power:1.75,wheelbase:1.32,eyeHeight:1.60,gears:5,audio:'cg150',pitch:1,filter:7000,mass:118,braking:1.15,stability:1.12},
 {id:'pop',name:'Pop 110i ES',note:'Leve e ágil · até 115 km/h',maxSpeed:115/3.6,aerodynamicDrag:.0047,power:1.3,wheelbase:1.238,eyeHeight:1.48,gears:4,audio:'engine',pitch:1,filter:1800},
 {id:'cub',name:'Cub clássica',note:'Inspirada na Cub amarela · até 82,8 km/h',maxSpeed:82.8/3.6,aerodynamicDrag:.0086,power:.9,wheelbase:1.22,eyeHeight:1.46,gears:4,audio:'engine',pitch:.88,filter:1300},
 {id:'urban',name:'Shineray Phoenix',note:'Inspirada na referência enviada · até 92 km/h',maxSpeed:92/3.6,aerodynamicDrag:.0069,power:1.06,wheelbase:1.25,eyeHeight:1.5,gears:4,audio:'engine',pitch:1.12,filter:2300},
 {id:'caloi',name:'Caloi XR',note:'Ciclomotor · aproximação da foto · até 57,5 km/h',maxSpeed:57.5/3.6,aerodynamicDrag:.0157,power:.68,wheelbase:1.12,eyeHeight:1.43,gears:1,audio:'moped',pitch:1,filter:2600}
];
export const getVehicle=(id:string)=>vehicles.find(v=>v.id===id)||vehicles.find(v=>v.id==='pop')!;
