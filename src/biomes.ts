import {coastalBlend,shoreline} from './coast';
import * as T from 'three';
import {villages} from './map-layout';
export const BIOME_TUNING={dryCenterX:3800,dryCenterZ:-2200,dryRadius:1700,forestNorth:-1700,transition:900,detailDistance:420};
export type BiomeWeights={forest:number;pasture:number;dry:number;urban:number;coast:number};
// Continuous weights also drive vegetation probabilities: no hard biome borders.
export function biomeAt(x:number,z:number):BiomeWeights{
 const t=BIOME_TUNING,dry=(1-T.MathUtils.smoothstep(Math.hypot(x-t.dryCenterX,z-t.dryCenterZ),t.dryRadius*.45,t.dryRadius))*.95;
 const urban=1-T.MathUtils.smoothstep(Math.min(...villages.map(v=>Math.hypot(x-v.x,z-v.z))),85,240);
 const coast=coastalBlend(x,z),forest=T.MathUtils.smoothstep(-z,-t.forestNorth-t.transition,-t.forestNorth+t.transition);
 return {forest:(1-dry)*(1-urban)*forest*(1-coast),pasture:(1-dry)*(1-urban)*(1-forest)*(1-coast),dry:dry*(1-urban)*(1-coast),urban:urban*(1-coast),coast};
}
const tones={forest:new T.Color('#69824e'),pasture:new T.Color('#a3aa64'),dry:new T.Color('#bd9d6b'),urban:new T.Color('#9c9d7c'),coast:new T.Color('#dfcf9c')};
export function biomeColor(x:number,z:number){const w=biomeAt(x,z),c=new T.Color(0,0,0);for(const k of Object.keys(w) as (keyof BiomeWeights)[])c.add(tones[k].clone().multiplyScalar(w[k]));return c.multiplyScalar(.96+.04*Math.sin(x/71)*Math.cos(z/83))}
export type Plant='broadleaf'|'pine'|'palm'|'cactus'|'shrub'|'grass';
export function plantAt(x:number,z:number,r:number):Plant{const b=biomeAt(x,z);if(r<b.coast)return x>shoreline(z)-65?'grass':r<b.coast*.55?'palm':'shrub';r-=b.coast;if(r<b.dry)return r<b.dry*.36?'cactus':r<b.dry*.72?'shrub':'grass';r-=b.dry;if(r<b.forest)return r<b.forest*.5?'pine':'broadleaf';return r-b.forest<(b.pasture+b.urban)*.22?'broadleaf':r-b.forest<(b.pasture+b.urban)*.55?'shrub':'grass'}
