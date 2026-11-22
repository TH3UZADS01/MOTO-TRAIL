import {tracks,villages,places} from './map-layout';
export function onCobbles(x:number,z:number){return villages.some(v=>{
 const dx=Math.abs(x-v.x),dz=Math.abs(z-v.z);
 return (Math.abs(x-v.x-10)<=4&&dz<49)||(dz<3.2&&dx<39);
})}
type Scar={x:number;z:number;rx:number;rz:number;depth:number};
export const scars:Scar[]=[];
const cells=new Map<string,Scar[]>();
const key=(x:number,z:number)=>Math.floor(x/32)+','+Math.floor(z/32);
for(const [ti,track] of tracks.entries()){
 if(track.surface!=='asfalto')continue;
 for(let i=91+ti*7;i<track.points.length-1;i+=87+(i%31)){
  const p=track.points[i],q=track.points[i+1],h=Math.atan2(q.x-p.x,q.z-p.z),side=i%2?1.4:-1.6;
  if(places.some(v=>Math.hypot(v.x-p.x,v.z-p.z)<45))continue;
  const s={x:p.x+side*Math.cos(h),z:p.z-side*Math.sin(h),rx:.5+(i%5)*.13,rz:.7+(i%4)*.16,depth:i%3===0?.022:-.035-(i%5)*.011};scars.push(s);
  for(let gx=Math.floor((s.x-s.rx)/32);gx<=Math.floor((s.x+s.rx)/32);gx++)for(let gz=Math.floor((s.z-s.rz)/32);gz<=Math.floor((s.z+s.rz)/32);gz++){
   const k=gx+','+gz;const list=cells.get(k)??[];list.push(s);cells.set(k,list);
  }
 }
}
export function pavementRelief(x:number,z:number){
 for(const s of cells.get(key(x,z))??[]){const d=((x-s.x)/s.rx)**2+((z-s.z)/s.rz)**2;if(d<1)return s.depth*(1-d)**2}
 return onCobbles(x,z)?.008*Math.sin(15*x+3*z)*Math.cos(19*z):0;
}

export class PotholeRisk {
 private active=new Set<Scar>();
 private next=new Set<Scar>();
 constructor(private roll:()=>number=Math.random){}

 // The segment spans the wheel tracks for this physics step. Keep contact
 // latched until the rear wheel clears the hole, even after an unsuccessful roll.
 crosses(ax:number,az:number,bx:number,bz:number,speed:number){
  this.next.clear();
  let burst=false;
  for(let gx=Math.floor(Math.min(ax,bx)/32);gx<=Math.floor(Math.max(ax,bx)/32);gx++){
   for(let gz=Math.floor(Math.min(az,bz)/32);gz<=Math.floor(Math.max(az,bz)/32);gz++){
    const nearby=cells.get(gx+','+gz);
    if(!nearby)continue;
    for(const s of nearby){
     if(s.depth>=0||this.next.has(s))continue;
     const x=(ax-s.x)/s.rx,z=(az-s.z)/s.rz,dx=(bx-ax)/s.rx,dz=(bz-az)/s.rz;
     const lengthSq=dx*dx+dz*dz;
     const t=lengthSq?Math.max(0,Math.min(1,-(x*dx+z*dz)/lengthSq)):0;
     if((x+t*dx)**2+(z+t*dz)**2>=1)continue;
     this.next.add(s);
     if(!this.active.has(s)&&speed>=50/3.6&&this.roll()<.65)burst=true;
    }
   }
  }
  const previous=this.active;this.active=this.next;this.next=previous;
  return burst;
 }
}
