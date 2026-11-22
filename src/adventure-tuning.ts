import events from './road-event-config.json';
import type {VehicleId} from './vehicles';

export const adventure={
 cargo:{density:1,baseKg:2,boxKg:12,inertia:3.6,braking:2.4,steering:1.6},
 gearing:{original:1,short:1.12,long:.93},
 suspension:{
  original:{travel:1,frequency:1,road:1,dirt:1},
  trail:{travel:1.15,frequency:.87,road:.94,dirt:1.09},
  road:{travel:.88,frequency:1.16,road:1.05,dirt:.93}
 },
 camTorqueGain:1.20,
 brakeGain:1.16,
 market:{interval:30*60_000,count:3,minKm:1400,maxKm:52000,minCondition:45,maxCondition:94,baseFraction:.43,conditionPremium:.38,mileageDiscount:.10},
 trips:{radius:18,perKm:5,perStop:3},
 events
} as const;
export const parts={
 short:{slot:'gearing',label:'Relação curta',price:80,detail:'Mais força na roda e RPM mais alto. Menor final teórica.'},
 long:{slot:'gearing',label:'Relação longa',price:80,detail:'Menos RPM em cruzeiro. Retomadas e subidas mais lentas.'},
 trail:{slot:'suspension',label:'Suspensão de trilha',price:110,detail:'Mais curso e controle na terra. Direção menos precisa no asfalto.'},
 road:{slot:'suspension',label:'Suspensão de estrada',price:110,detail:'Resposta firme no asfalto. Menos curso na terra.'},
 cam:{slot:'engine',label:'Comando',price:140,detail:'Aumenta a potência do motor em 20%.'},
 improved:{slot:'brakes',label:'Freios melhorados',price:95,detail:'Mais força de frenagem. O desgaste e a aderência continuam limitando a parada.'}
} as const;
export type Part=keyof typeof parts;
export type Slot=typeof parts[Part]['slot'];
export type Prep={engine?:'original'|'cam';gearing:'original'|'short'|'long';suspension:'original'|'trail'|'road';brakes:'original'|'improved';bought:Part[]};
export const originalPrep=():Prep=>({engine:'original',gearing:'original',suspension:'original',brakes:'original',bought:[]});
const priceFactor:Record<VehicleId,number>={pop:1,cub:1,urban:.85,caloi:.65,cg150:1.25,sahara:1.6};
export const workshopMultiplier=3.5;
export const partPrice=(id:VehicleId,part:Part)=>Math.round(parts[part].price*priceFactor[id])*workshopMultiplier;
