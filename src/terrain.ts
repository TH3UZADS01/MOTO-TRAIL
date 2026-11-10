import {coastalHeight,shoreline} from './coast';
import {biomeColor} from './biomes';
import {surfaceMaterial,worldUV} from './graphics';
import * as T from 'three';
import {tracks,mainPlan,places,villages,stations,viewpoints,specials,lake,bridges,riverX,riverStart,riverEnd,riverWidth,waterY,original,MAP_SCALE,type Track} from './map-layout';
export {villages,stations,viewpoints,specials,bridges};
export const SIZE=16000,STEP=8;
export const LOOKOUT={...viewpoints[0],radius:18};
export const lakes=[lake];
export const pois=places;
type Segment={a:T.Vector3;b:T.Vector3;index:number;track:Track};
function makeIndex(routes:Track[]){const grid=new Map<string,Segment[]>();for(const track of routes)for(let i=0;i<track.points.length-1;i++){const a=track.points[i],b=track.points[i+1],s={a,b,index:i,track};for(let x=Math.floor(Math.min(a.x,b.x)/64);x<=Math.floor(Math.max(a.x,b.x)/64);x++)for(let z=Math.floor(Math.min(a.z,b.z)/64);z<=Math.floor(Math.max(a.z,b.z)/64);z++){const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key)!.push(s)}}return grid}
const networkIndex=makeIndex(tracks),indexes=new WeakMap<T.Vector3[],ReturnType<typeof makeIndex>>();
function query(x:number,z:number,grid:ReturnType<typeof makeIndex>,radius=Infinity){let d=radius*radius,index=0,px=x,pz=z,track=tracks[0];const cx=Math.floor(x/64),cz=Math.floor(z/64);for(let ring=0;ring<=Math.min(260,Math.ceil(radius/64)+1);ring++){for(let gx=cx-ring;gx<=cx+ring;gx++)for(let gz=cz-ring;gz<=cz+ring;gz++){if(ring&&Math.abs(gx-cx)!==ring&&Math.abs(gz-cz)!==ring)continue;for(const s of grid.get(gx+','+gz)||[]){const {a,b}=s,dx=b.x-a.x,dz=b.z-a.z,t=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/Math.max(1e-12,dx*dx+dz*dz),0,1),nx=a.x+dx*t,nz=a.z+dz*t,dd=(x-nx)**2+(z-nz)**2;if(dd<d){d=dd;index=s.index;px=nx;pz=nz;track=s.track}}}const edge=Math.min(x-(cx-ring)*64,(cx+ring+1)*64-x,z-(cz-ring)*64,(cz+ring+1)*64-z);if(d<=edge*edge)break}return {distance:Math.sqrt(d),index,x:px,z:pz,track}}
export const nearestRoute=(x:number,z:number,radius=Infinity)=>query(x,z,networkIndex,radius);
export const nearRoute=(x:number,z:number,radius:number)=>nearestRoute(x,z,radius).distance<radius;
export function nearest(x:number,z:number,points=road){let grid=indexes.get(points);if(!grid){grid=makeIndex([{...tracks[0],points}]);indexes.set(points,grid)}return query(x,z,grid)}
const pads=places.map(p=>({...p,r:p.kind==='village'?65:p.kind==='farm'?38:p.kind==='camp'?30:22}));
function baseHeight(x:number,z:number){const p=original(x,z),mountain=150*Math.exp(-((p.x-3850)**2/1100000+(p.z+2850)**2/600000));let h=35+15*Math.sin(p.x/600)*Math.cos(p.z/750)+mountain+8*Math.sin(p.z/500);if(z>=riverStart-100&&z<=riverEnd){const d=Math.abs(x-riverX(z));h=T.MathUtils.lerp(waterY(z)+7,h,T.MathUtils.smoothstep(d,85,300))}return coastalHeight(x,z,h)}
function raw(x:number,z:number){let h=baseHeight(x,z);for(const p of pads){const d=Math.hypot(x-p.x,z-p.z);if(d<p.r+65)h=T.MathUtils.lerp(baseHeight(p.x,p.z),h,T.MathUtils.smoothstep(d,p.r,p.r+65))}
 const dLake=Math.hypot(x-lake.x,z-lake.z);if(dLake<lake.r+65)h=T.MathUtils.lerp(8,h,T.MathUtils.smoothstep(dLake,lake.r*.88,lake.r+65));
 if(z>=riverStart&&z<=riverEnd){const d=Math.abs(x-riverX(z));if(d<42)h=T.MathUtils.lerp(waterY(z)-3,h,T.MathUtils.smoothstep(d,riverWidth/2,42))}
 return h;
}
export function height(x:number,z:number):number{const a=Math.floor(x/STEP)*STEP,b=Math.floor(z/STEP)*STEP,u=(x-a)/STEP,v=(z-b)/STEP,h00=raw(a,b),h10=raw(a+STEP,b),h01=raw(a,b+STEP),h11=raw(a+STEP,b+STEP);return u+v<=1?h00+(h10-h00)*u+(h01-h00)*v:h11+(h01-h11)*(1-u)+(h10-h11)*(1-v)}
export function bridgeAt(x:number,z:number){return bridges.find(b=>Math.abs((x-b.x)*b.dx+(z-b.z)*b.dz)<=b.halfLength&&Math.abs((x-b.x)*b.dz-(z-b.z)*b.dx)<=b.width/2)}
export function roadBed(x:number,z:number){return bridgeAt(x,z)?waterY(z)+7:height(x,z)}
export const road=mainPlan.map(p=>new T.Vector3(p.x,roadBed(p.x,p.z),p.z));
export const routes=tracks.map(t=>({...t,points:t.id==='main'?road:t.points.map(p=>new T.Vector3(p.x,roadBed(p.x,p.z),p.z))}));
export const roadLength=road.slice(1).reduce((sum,p,i)=>sum+p.distanceTo(road[i]),0);
export const dirtLength=routes.filter(t=>t.surface==='terra').reduce((sum,t)=>sum+t.points.slice(1).reduce((d,p,i)=>d+p.distanceTo(t.points[i]),0),0);
export function surface(x:number,z:number){const n=nearestRoute(x,z,12);return bridgeAt(x,z)?'asfalto':n.distance<n.track.width/2?n.track.surface:pads.some(p=>Math.hypot(x-p.x,z-p.z)<p.r)?'terra':'grama'}
export function ground(x:number,z:number){return roadBed(x,z)+.06}
export function deepWater(x:number,z:number){if(x>shoreline(z)+8)return true;if(bridgeAt(x,z))return false;if(Math.hypot(x-lake.x,z-lake.z)<lake.r*.88&&height(x,z)<11.5)return true;return z>=riverStart&&z<=riverEnd&&Math.abs(x-riverX(z))<riverWidth/2+3&&height(x,z)<waterY(z)-.4}
export function terrain(cx=0,cz=0,size=256){const g=new T.PlaneGeometry(size,size,size/STEP,size/STEP);g.rotateX(-Math.PI/2);g.translate(cx,0,cz);const p=g.attributes.position,colors=[];for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=height(x,z);p.setY(i,h);const c=biomeColor(x,z);colors.push(c.r,c.g,c.b)}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();worldUV(g,6);const mesh=new T.Mesh(g,surfaceMaterial('grass',0xffffff,true));mesh.receiveShadow=true;return mesh}
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
