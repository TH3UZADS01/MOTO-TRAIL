import * as T from 'three';
export const SIZE=16000, STEP=8;
// A closed scenic road, scaled by measured arc length rather than an odometer multiplier.
export const curve=new T.CatmullRomCurve3(Array.from({length:32},(_,i)=>{const a=Math.PI+i/32*Math.PI*2;return new T.Vector3(Math.cos(a)*(3400+220*Math.sin(3*a)),0,Math.sin(a)*2700)}),true,'catmullrom',.35);
const sampled=curve.getSpacedPoints(5000),length=sampled.slice(1).reduce((sum,p,i)=>sum+p.distanceTo(sampled[i]),0),scale=20000/length,origin=sampled[0].clone();
const route=sampled.map(p=>new T.Vector3((p.x-origin.x)*scale-310,0,(p.z-origin.z)*scale));
export const LOOKOUT={x:0,z:0,radius:18};
const baseHeight=(x:number,z:number)=>35+24*Math.sin(x/650)*Math.cos(z/800)+18*Math.sin(z/1100)+65*Math.exp(-((x-3600)**2+(z+1800)**2)/1500000);
export const villages=[0,.23,.48,.73].map((t,i)=>{const p=route[Math.floor(t*5000)],q=route[Math.floor(t*5000)+1],dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz);return {name:['Vila do Ipê','Santa Aurora','Vila das Araucárias','Porto do Sol'][i],x:p.x+dz/l*80,z:p.z-dx/l*80,kind:'village'}});
export const stations=[.003,.20,.41,.62,.82].map((t,i)=>{const p=route[Math.floor(t*5000)],q=route[Math.floor(t*5000)+1],dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz);return {name:['Posto do Ipê','Posto Aurora','Posto da Serra','Posto Boa Vista','Posto do Sol'][i],x:p.x+dz/l*24,z:p.z-dx/l*24,kind:'station'}});
export const viewpoints=[.12,.35,.57,.89].map((t,i)=>{const p=route[Math.floor(t*5000)],q=route[Math.floor(t*5000)+1],dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz);return {name:['Mirante das Nuvens','Vale dos Girassóis','Mirante da Serra Azul','Lago do Pôr do Sol'][i],x:p.x+dz/l*32,z:p.z-dx/l*32,kind:'lookout'}});
Object.assign(LOOKOUT,{x:viewpoints[0].x,z:viewpoints[0].z});
export const lakes=[.89,.35].map((t,i)=>{const p=route[Math.floor(t*5000)],q=route[Math.floor(t*5000)+1],dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz);return {x:p.x+dz/l*190,z:p.z-dx/l*190,r:i?65:90}});
const pads=[...stations.map(p=>({...p,r:22})),...villages.map(p=>({...p,r:65})),...viewpoints.map(p=>({...p,r:20}))];
function raw(x:number,z:number){let y=baseHeight(x,z);for(const p of pads){const d=Math.hypot(x-p.x,z-p.z);if(d<p.r+24)y=T.MathUtils.lerp(baseHeight(p.x,p.z),y,T.MathUtils.smoothstep(d,p.r,p.r+24))}for(const p of lakes){const d=Math.hypot(x-p.x,z-p.z);if(d<p.r+35)y=T.MathUtils.lerp(baseHeight(p.x,p.z)-8,y,T.MathUtils.smoothstep(d,p.r*.8,p.r+35))}return y}
export function height(x:number,z:number):number {const a=Math.floor(x/STEP)*STEP,b=Math.floor(z/STEP)*STEP,u=(x-a)/STEP,v=(z-b)/STEP,h00=raw(a,b),h10=raw(a+STEP,b),h01=raw(a,b+STEP),h11=raw(a+STEP,b+STEP);return u+v<=1?h00+(h10-h00)*u+(h01-h00)*v:h11+(h01-h11)*(1-u)+(h10-h11)*(1-v)}
export const roadBed=height;
export const road=route.map(p=>new T.Vector3(p.x,height(p.x,p.z),p.z));
export const roadLength=road.slice(1).reduce((sum,p,i)=>sum+p.distanceTo(road[i]),0);
const indexes=new WeakMap<T.Vector3[],Map<string,number[]>>();
export function nearest(x:number,z:number,points=road){
 // Indexed segments keep physics independent of the full 20 km road size.
 let grid=indexes.get(points);if(!grid){grid=new Map();for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];for(let gx=Math.floor(Math.min(a.x,b.x)/64);gx<=Math.floor(Math.max(a.x,b.x)/64);gx++)for(let gz=Math.floor(Math.min(a.z,b.z)/64);gz<=Math.floor(Math.max(a.z,b.z)/64);gz++){const k=gx+','+gz;if(!grid.has(k))grid.set(k,[]);grid.get(k)!.push(i)}}indexes.set(points,grid)}
 let d=Infinity,index=0,px=0,pz=0;const cx=Math.floor(x/64),cz=Math.floor(z/64);
 for(let ring=0;ring<260;ring++){for(let gx=cx-ring;gx<=cx+ring;gx++)for(let gz=cz-ring;gz<=cz+ring;gz++){if(ring&&Math.abs(gx-cx)!==ring&&Math.abs(gz-cz)!==ring)continue;for(const i of grid.get(gx+','+gz)||[]){const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,t=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/Math.max(1e-12,dx*dx+dz*dz),0,1),nx=a.x+dx*t,nz=a.z+dz*t,dd=(x-nx)**2+(z-nz)**2;if(dd<d){d=dd;index=i;px=nx;pz=nz}}}
 const edge=Math.min(x-(cx-ring)*64,(cx+ring+1)*64-x,z-(cz-ring)*64,(cz+ring+1)*64-z);if(d<=edge*edge)break;
 }return {distance:Math.sqrt(d),index,x:px,z:pz};
}
export function surface(x:number,z:number){return nearest(x,z).distance<4.8?'asfalto':pads.some(p=>Math.hypot(x-p.x,z-p.z)<p.r)?'terra':'grama'}
export function ground(x:number,z:number){return height(x,z)+.06}
export const pois=[...villages,...stations,...viewpoints];
export function terrain(cx=0,cz=0,size=256){const g=new T.PlaneGeometry(size,size,size/STEP,size/STEP);g.rotateX(-Math.PI/2);g.translate(cx,0,cz);const p=g.attributes.position,colors=[];for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=height(x,z);p.setY(i,h);const c=new T.Color().setHSL(.26+Math.sin(x/400)*.025,.28,.32+h*.0004);colors.push(c.r,c.g,c.b)}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:1}))}
export function ribbon(points:T.Vector3[],width:number,color:number,offset=.055){
  const vertices:number[]=[],indices:number[]=[],columns=Math.max(2,Math.ceil(width/.5));
  for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    for(let j=0;j<=columns;j++){const side=(j/columns-.5)*width,x=p.x+dz/len*side,z=p.z-dx/len*side;vertices.push(x,roadBed(x,z)+offset,z)}
    if(i<points.length-1)for(let j=0;j<columns;j++){const n=i*(columns+1)+j;indices.push(n,n+columns+1,n+1,n+1,n+columns+1,n+columns+2)}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide}));
}
// Copy terrain triangles inside a disk: no floating flat disk, no mismatched contact plane.
export function terrainPatch(cx:number,cz:number,r:number,color:number){
  const positions:number[]=[];
  for(let x=Math.floor((cx-r)/STEP)*STEP;x<cx+r;x+=STEP)for(let z=Math.floor((cz-r)/STEP)*STEP;z<cz+r;z+=STEP){
    const triangles=[[[x,z],[x,z+STEP],[x+STEP,z]],[[x,z+STEP],[x+STEP,z+STEP],[x+STEP,z]]];
    for(const tri of triangles){const mx=(tri[0][0]+tri[1][0]+tri[2][0])/3,mz=(tri[0][1]+tri[1][1]+tri[2][1])/3;if(Math.hypot(mx-cx,mz-cz)>r)continue;for(const [px,pz] of tri)positions.push(px,height(px,pz)+.055,pz);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();return new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide}));
}
