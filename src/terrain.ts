import {onCobbles} from './pavement';
import {coastalHeight,shoreline} from './coast';
import {biomeColor} from './biomes';
import {surfaceMaterial,worldUV} from './graphics';
import * as T from 'three';
import {horizons,tracks,mainPlan,places,villages,stations,viewpoints,specials,lake,bridges,riverX,riverStart,riverEnd,riverWidth,waterY,original,MAP_SCALE,type Track} from './map-layout';
export {villages,stations,viewpoints,specials,bridges};
export const SIZE=80000,STEP=8;
export const LOOKOUT={...viewpoints[0],radius:18};
export const lakes=[lake,{x:viewpoints[1].x,z:viewpoints[1].z+270,r:153}];
export const lakeRadius=(r:number,a:number)=>r*(.90+.055*Math.sin(3*a+.6)+.035*Math.cos(5*a));
export const pois=places;
type Segment={a:T.Vector3;b:T.Vector3;index:number;track:Track};
const allSegments=new WeakMap<Map<string,Segment[]>,Segment[]>();
function makeIndex(routes:Track[]){const grid=new Map<string,Segment[]>(),list:Segment[]=[];allSegments.set(grid,list);for(const track of routes)for(let i=0;i<track.points.length-1;i++){const a=track.points[i],b=track.points[i+1],s={a,b,index:i,track};list.push(s);for(let x=Math.floor(Math.min(a.x,b.x)/64);x<=Math.floor(Math.max(a.x,b.x)/64);x++)for(let z=Math.floor(Math.min(a.z,b.z)/64);z<=Math.floor(Math.max(a.z,b.z)/64);z++){const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key)!.push(s)}}return grid}
const networkIndex=makeIndex(tracks),indexes=new WeakMap<T.Vector3[],ReturnType<typeof makeIndex>>();
function query(x:number,z:number,grid:ReturnType<typeof makeIndex>,radius=Infinity){
 let d=radius*radius,index=0,px=x,pz=z,track=tracks[0];
 const cx=Math.floor(x/64),cz=Math.floor(z/64);
 function visit(s:Segment){const {a,b}=s,dx=b.x-a.x,dz=b.z-a.z,t=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/Math.max(1e-12,dx*dx+dz*dz),0,1),nx=a.x+dx*t,nz=a.z+dz*t,dd=(x-nx)**2+(z-nz)**2;if(dd<d){d=dd;index=s.index;px=nx;pz=nz;track=s.track}}
 for(let ring=0;ring<=Math.ceil(radius/64)+1;ring++){
  if(ring===5&&!Number.isFinite(radius)){for(const s of allSegments.get(grid)!)visit(s);break}
  for(let gx=cx-ring;gx<=cx+ring;gx++)for(let gz=cz-ring;gz<=cz+ring;gz++){
   if(ring&&Math.abs(gx-cx)!==ring&&Math.abs(gz-cz)!==ring)continue;
   const entries=grid.get(gx+','+gz);if(entries)for(const s of entries)visit(s);
  }
  const edge=Math.min(x-(cx-ring)*64,(cx+ring+1)*64-x,z-(cz-ring)*64,(cz+ring+1)*64-z);
  if(d<=edge*edge)break;
 }
 return {distance:Math.sqrt(d),index,x:px,z:pz,track};
}
export const nearestRoute=(x:number,z:number,radius=Infinity)=>query(x,z,networkIndex,radius);
export {freightDistance} from './navigation';
export const nearRoute=(x:number,z:number,radius:number)=>nearestRoute(x,z,radius).distance<radius;
export function nearest(x:number,z:number,points=road){let grid=indexes.get(points);if(!grid){grid=makeIndex([{...tracks[0],points}]);indexes.set(points,grid)}return query(x,z,grid)}
const pads=places.map(p=>({...p,r:p.kind==='village'?65:p.kind==='farm'?38:p.kind==='camp'?30:22}));
const smooth=T.MathUtils.smoothstep;
const {creek,unit,origin}=horizons;
// Coarse index for the broad canyon profile. Sampling the fine tyre-contact
// index hundreds of metres from a road would dominate chunk construction.
const mountainAxis=horizons.roads[1].points;
const sampled=mountainAxis.filter((_,i)=>i%5===0||i===mountainAxis.length-1);
type ShelfNode={x0:number;x1:number;z0:number;z1:number;lo:number;hi:number;children?:ShelfNode[]};
function splitShelf(lo:number,hi:number):ShelfNode{
 const node:ShelfNode={x0:Infinity,x1:-Infinity,z0:Infinity,z1:-Infinity,lo,hi};
 for(let i=lo;i<=hi;i++){const p=sampled[i];node.x0=Math.min(node.x0,p.x);node.x1=Math.max(node.x1,p.x);node.z0=Math.min(node.z0,p.z);node.z1=Math.max(node.z1,p.z)}
 if(hi-lo>6){const mid=(hi+lo)>>1;node.children=[splitShelf(lo,mid),splitShelf(mid,hi)]}
 return node;
}
const shelfTree=splitShelf(0,sampled.length-1);
function shelf(x:number,z:number){
 let distance=720**2,px=x,pz=z;
 function visit(n:ShelfNode){
  const ox=Math.max(0,n.x0-x,x-n.x1),oz=Math.max(0,n.z0-z,z-n.z1);
  if(ox*ox+oz*oz>=distance)return;
  if(n.children){for(const child of n.children)visit(child);return}
  for(let i=n.lo;i<n.hi;i++){
   const a=sampled[i],b=sampled[i+1],dx=b.x-a.x,dz=b.z-a.z;
   const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
   const nx=a.x+t*dx,nz=a.z+t*dz,dd=(x-nx)**2+(z-nz)**2;
   if(dd<distance){distance=dd;px=nx;pz=nz}
  }
 }
 visit(shelfTree);return {distance:Math.sqrt(distance),x:px,z:pz};
}
export const creekX=(z:number)=>creek.x+18*Math.sin((z-creek.z)/120);
export const creekBlend=(z:number)=>1-smooth(Math.abs(z-creek.z),650,920);
export function highlands(x:number){return smooth(origin.x-x,20*unit,26*unit)}
export function plateau(x:number,z:number){
 const hills=55+24*Math.sin(x/800)+18*Math.cos(z/650+x/1800);
 // Layered watersheds behind the highway and the farms, tapering into the old valley.
 const ridge=(crest:number,width:number)=>Math.exp(-(((z-crest)/width)**2));
 const skyline=(125+42*Math.sin(x/1140)+18*Math.cos(x/390))*
  (ridge(5400+560*Math.sin(x/2600),1000)+ridge(-20700+750*Math.cos(x/2900),1400));
 return hills+skyline+highlands(x)*(420+115*Math.sin(z/1700)+64*Math.cos(x/1350+z/2400));
}
function expandedHeight(x:number,z:number){
 const h=plateau(x,z),massif=highlands(x);
 // A graded shelf follows the surveyed axis. Beyond its cut, the uphill
 // wall and the incised valley are continuous parts of the physical ground.
 let relief=0;
 if(massif>0){
  const n=shelf(x,z),d=n.distance;
  const first=mountainAxis[0],last=mountainAxis[mountainAxis.length-1];
  const interior=smooth(Math.min(Math.hypot(n.x-first.x,n.z-first.z),Math.hypot(n.x-last.x,n.z-last.z)),200,900);
  if(d<720&&interior>0){
   const side=Math.tanh((x-n.x+.35*(z-n.z))/30);
   relief=side*(105+35*Math.sin(z/480)+8*Math.sin(x/64+z/49))*smooth(d,10,95)*(1-smooth(d,390,720));
   return T.MathUtils.lerp(h,T.MathUtils.lerp(plateau(n.x,n.z),h,smooth(d,8,38))+relief*massif,interior);
  }
 }
 const blend=creekBlend(z)*(1-smooth(Math.abs(x-creekX(z)),10,60));
 const bank=T.MathUtils.lerp(h,44,creekBlend(z)*(1-smooth(Math.abs(x-creekX(z)),38,260)));
 return T.MathUtils.lerp(bank,40,blend*(1-smooth(Math.abs(x-creekX(z)),11,28)));
}
function baseHeight(x:number,z:number){if(x<origin.x-1700)return expandedHeight(x,z);const p=original(x,z),mountain=150*Math.exp(-((p.x-3850)**2/1100000+(p.z+2850)**2/600000));let h=35+15*Math.sin(p.x/600)*Math.cos(p.z/750)+mountain+8*Math.sin(p.z/500);if(z>=riverStart-100&&z<=riverEnd){const d=Math.abs(x-riverX(z));h=T.MathUtils.lerp(waterY(z)+7,h,T.MathUtils.smoothstep(d,85,300))}const ridge=1-T.MathUtils.smoothstep(Math.hypot((x-3650)*.56,z+3080),240,720);
 if(ridge>0){const roadGap=nearestRoute(x,z,140).distance,clear=T.MathUtils.smoothstep(roadGap,23,120);
  if(clear>0){let town=1;for(const v of pads)town=Math.min(town,T.MathUtils.smoothstep(Math.hypot(x-v.x,z-v.z),v.r+30,v.r+100));
   h+=town*ridge*clear*(62+26*Math.sin(x/112+z/74)+18*Math.cos(z/53)+11*Math.sin(x/39));
  }}
 return T.MathUtils.lerp(coastalHeight(x,z,h),x<origin.x-900?expandedHeight(x,z):h,smooth(origin.x-x,900,1700))}
// Cut service terraces to the elevation of their approach, including fill on the valley side.
const terraces=pads.map(p=>{
 const n=highlands(p.x)>.1?nearestRoute(p.x,p.z):p;
 return {...p,level:baseHeight(n.x,n.z)};
});
function raw(x:number,z:number){let h=baseHeight(x,z);for(const p of terraces){const d=Math.hypot(x-p.x,z-p.z);if(d<p.r+65)h=T.MathUtils.lerp(p.level,h,T.MathUtils.smoothstep(d,p.r,p.r+65))}
 for(const l of lakes){const dx=x-l.x,dz=z-l.z;if(Math.abs(dx)>l.r+70||Math.abs(dz)>l.r+70)continue;
  const d=Math.hypot(dx,dz)-lakeRadius(l.r,Math.atan2(dz,dx));
  if(d<65)h=d<=0?12+Math.max(-5,d*.14):T.MathUtils.lerp(12,h,T.MathUtils.smoothstep(d,0,65));
 }
 if(z>=riverStart&&z<=riverEnd){const d=Math.abs(x-riverX(z));if(d<42)h=T.MathUtils.lerp(waterY(z)-3,h,T.MathUtils.smoothstep(d,riverWidth/2,42))}
 return h;
}
// Road ribbons, streamed terrain and physics sample the same eight-metre lattice.
const heightCache=new Map<number,number>();
function gridHeight(x:number,z:number){
 const key=(x/STEP+8192)*16384+z/STEP;
 const cached=heightCache.get(key);if(cached!==undefined)return cached;
 if(heightCache.size>=180000)heightCache.clear();
 const h=raw(x,z);heightCache.set(key,h);return h;
}
export function height(x:number,z:number):number{const a=Math.floor(x/STEP)*STEP,b=Math.floor(z/STEP)*STEP,u=(x-a)/STEP,v=(z-b)/STEP,h00=gridHeight(a,b),h10=gridHeight(a+STEP,b),h01=gridHeight(a,b+STEP),h11=gridHeight(a+STEP,b+STEP);return u+v<=1?h00+(h10-h00)*u+(h01-h00)*v:h11+(h01-h11)*(1-u)+(h10-h11)*(1-v)}
export function bridgeAt(x:number,z:number){return bridges.find(b=>Math.abs((x-b.x)*b.dx+(z-b.z)*b.dz)<=b.halfLength&&Math.abs((x-b.x)*b.dz-(z-b.z)*b.dx)<=b.width/2)}
export function onCreekDeck(x:number,z:number){return Math.abs(x-creek.x)<=30&&Math.abs(z-creek.z)<=4.4}
export function roadBed(x:number,z:number){return onCreekDeck(x,z)?44:bridgeAt(x,z)?waterY(z)+7:height(x,z)}
export const road=mainPlan.map(p=>new T.Vector3(p.x,roadBed(p.x,p.z),p.z));
export const routes=tracks.map(t=>({...t,points:t.id==='main'?road:t.points.map(p=>new T.Vector3(p.x,roadBed(p.x,p.z),p.z))}));
export const roadLength=road.slice(1).reduce((sum,p,i)=>sum+p.distanceTo(road[i]),0);
export const dirtLength=routes.filter(t=>t.surface==='terra').reduce((sum,t)=>sum+t.points.slice(1).reduce((d,p,i)=>d+p.distanceTo(t.points[i]),0),0);
export function surface(x:number,z:number){const n=nearestRoute(x,z,12);return bridgeAt(x,z)||onCobbles(x,z)?'asfalto':n.distance<n.track.width/2?n.track.surface:pads.some(p=>Math.hypot(x-p.x,z-p.z)<p.r)?'terra':'grama'}
// Stable bands on the existing dirt routes; shared by contact sampling and vertex colours.
export function trailMaterial(x:number,z:number){
 const band=Math.sin(x/54+z/83)+.55*Math.sin(z/34-x/128);
 return band>1?'areia':band<-.98?'lama':band>.32?'cascalho':'terra';
}
export function contactSurface(x:number,z:number){
 const n=nearestRoute(x,z,12);
 if(bridgeAt(x,z)||onCobbles(x,z))return 'asfalto';
 if(n.distance<n.track.width/2)return n.track.surface==='terra'?trailMaterial(x,z):'asfalto';
 if(pads.some(p=>Math.hypot(x-p.x,z-p.z)<p.r))return 'terra';
 return x>shoreline(z)-28?'areia':'grama';
}
export function cliffAt(x:number,z:number){return highlands(x)>.2&&Math.hypot(height(x+1,z)-height(x-1,z),height(x,z+1)-height(x,z-1))>2.4}
export function ground(x:number,z:number){return roadBed(x,z)+.06}
export function deepWater(x:number,z:number){if(onCreekDeck(x,z))return false;if(creekBlend(z)>.6&&Math.abs(x-creekX(z))<14&&height(x,z)<42)return true;if(x>shoreline(z)+8)return true;if(bridgeAt(x,z))return false;if(lakes.some(l=>Math.abs(x-l.x)<l.r+10&&Math.abs(z-l.z)<l.r+10&&height(x,z)<12))return true;return z>=riverStart&&z<=riverEnd&&Math.abs(x-riverX(z))<riverWidth/2+3&&height(x,z)<waterY(z)-.4}
export function terrain(cx=0,cz=0,size=256){const g=new T.PlaneGeometry(size,size,size/STEP,size/STEP);g.rotateX(-Math.PI/2);g.translate(cx,0,cz);const p=g.attributes.position,colors=[];for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=height(x,z);p.setY(i,h);const c=biomeColor(x,z);if(lakes.some(l=>Math.abs(x-l.x)<l.r+35&&Math.abs(z-l.z)<l.r+35)&&h<17)c.setHex(0xc8b782);else if(highlands(x)>.2&&Math.abs(height(x+8,z)-h)+Math.abs(height(x,z+8)-h)>3)c.setHex(0xaa735a);else if(h>145)c.lerp(new T.Color(0x898982),.53);colors.push(c.r,c.g,c.b)}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();worldUV(g,6);const mesh=new T.Mesh(g,surfaceMaterial('grass',0xffffff,true));mesh.receiveShadow=true;return mesh}
export function ribbon(points:T.Vector3[],width:number,color:number,offset=.055){
  points=points.filter((p,i)=>i===0||p.distanceToSquared(points[i-1])>1e-10);
  const vertices:number[]=[],indices:number[]=[],columns=Math.max(2,Math.ceil(width/.5));
  for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.max(1e-8,Math.hypot(dx,dz));
    for(let j=0;j<=columns;j++){const side=(j/columns-.5)*width,x=p.x+dz/len*side,z=p.z-dx/len*side;vertices.push(x,roadBed(x,z)+offset,z)}
    if(i<points.length-1)for(let j=0;j<columns;j++){const n=i*(columns+1)+j;indices.push(n,n+columns+1,n+1,n+1,n+columns+1,n+columns+2)}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();worldUV(g,4);const kind=color===0x555d59?'asphalt':'dirt';const material=(color===0xe8d5a0||color===0xf0d9a0)?new T.MeshStandardMaterial({color,roughness:1}):surfaceMaterial(kind,color);const mesh=new T.Mesh(g,material);mesh.receiveShadow=true;return mesh;
}
// Copy terrain triangles inside a disk: no floating flat disk, no mismatched contact plane.
export function terrainPatch(cx:number,cz:number,r:number,color:number){
  const positions:number[]=[];
  for(let x=Math.floor((cx-r)/STEP)*STEP;x<cx+r;x+=STEP)for(let z=Math.floor((cz-r)/STEP)*STEP;z<cz+r;z+=STEP){
    const triangles=[[[x,z],[x,z+STEP],[x+STEP,z]],[[x,z+STEP],[x+STEP,z+STEP],[x+STEP,z]]];
    for(const tri of triangles){const mx=(tri[0][0]+tri[1][0]+tri[2][0])/3,mz=(tri[0][1]+tri[1][1]+tri[2][1])/3;if(Math.hypot(mx-cx,mz-cz)>r)continue;for(const [px,pz] of tri)positions.push(px,height(px,pz)+.055,pz);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();worldUV(g,4);const kind=color===0x555d59?'asphalt':'dirt';const material=(color===0xe8d5a0||color===0xf0d9a0)?new T.MeshStandardMaterial({color,roughness:1}):surfaceMaterial(kind,color);const mesh=new T.Mesh(g,material);mesh.receiveShadow=true;return mesh;
}
