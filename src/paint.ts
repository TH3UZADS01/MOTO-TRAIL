import {vehicles,type VehicleId} from './vehicles';
import type {createBike} from './vehicle-models';
export const PALETTE=['#234c91','#b72d32','#eebf29','#e5e5db','#242932','#41836b','#df793b','#864e9d'];
export const DEFAULT_COLORS:Record<VehicleId,string>={pop:'#234c91',cub:'#eebf29',urban:'#bb2634',caloi:'#bb2634',cg150:'#242932'};
export const validColor=(value:unknown):value is string=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);
export function loadColors(){const colors={...DEFAULT_COLORS};try{const saved=JSON.parse(localStorage.getItem('bike-colors-v1')||'{}');for(const v of vehicles)if(validColor(saved?.[v.id]))colors[v.id]=saved[v.id]}catch{}return colors}
export function saveColors(colors:Record<VehicleId,string>){try{localStorage.setItem('bike-colors-v1',JSON.stringify(colors))}catch{}}
export function applyBikeColor(bike:ReturnType<typeof createBike>,color:string){if(!validColor(color))return;for(const material of bike.paintMaterials)material.color.set(color)}
