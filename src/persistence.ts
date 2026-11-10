import type {VehicleId} from './vehicles';
export type Settings={quality:'baixo'|'medio'|'alto';motor:number;ambient:number;vehicle:VehicleId;deadzone:number;sensitivity:number};
const range=(n:unknown,fallback:number,min=0,max=1)=>typeof n==='number'&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
export function load():Settings {let p:Partial<Settings>={};try {p=JSON.parse(localStorage.getItem('pe-na-estrada')||'{}')||{}}catch{}return {quality:['baixo','medio','alto'].includes(p.quality||'')?p.quality!:'medio',motor:range(p.motor,.5),ambient:range(p.ambient,.35),vehicle:['pop','cub','urban','caloi','cg150'].includes(p.vehicle||'')?p.vehicle!:'pop',deadzone:range(p.deadzone,.14,.05,.4),sensitivity:range(p.sensitivity,1,.5,1.8)}}
export function save(s:Settings){try{localStorage.setItem('pe-na-estrada',JSON.stringify(s))}catch{}}
