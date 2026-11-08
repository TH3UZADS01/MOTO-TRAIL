export type VehicleId='pop'|'cub'|'urban'|'caloi';
export interface VehicleSpec {id:VehicleId;name:string;note:string;maxSpeed:number;power:number;wheelbase:number;eyeHeight:number;gears:number;audio:'engine'|'moped';pitch:number;filter:number}
// Performance values are game tuning, not claims about the pictured vehicle's year/spec.
export const vehicles:VehicleSpec[]=[
 {id:'pop',name:'Pop 110i ES',note:'2027 · aproximação',maxSpeed:80/3.6,power:1,wheelbase:1.238,eyeHeight:1.48,gears:4,audio:'engine',pitch:1,filter:1800},
 {id:'cub',name:'Cub clássica',note:'Inspirada na Cub amarela',maxSpeed:72/3.6,power:.9,wheelbase:1.22,eyeHeight:1.46,gears:4,audio:'engine',pitch:.88,filter:1300},
 {id:'urban',name:'Motoneta vermelha',note:'Modelo da foto não confirmado',maxSpeed:80/3.6,power:1.06,wheelbase:1.25,eyeHeight:1.5,gears:4,audio:'engine',pitch:1.12,filter:2300},
 {id:'caloi',name:'Caloi XR',note:'Ciclomotor · aproximação da foto',maxSpeed:50/3.6,power:.68,wheelbase:1.12,eyeHeight:1.43,gears:1,audio:'moped',pitch:1,filter:2600}
];
export const getVehicle=(id:string)=>vehicles.find(v=>v.id===id)||vehicles[0];
