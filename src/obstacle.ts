export interface Obstacle{x:number;z:number;r:number;halfX?:number;halfZ?:number;angle?:number}
// Sweep in wall-local coordinates. Return the normal component of travel at contact.
export function wallImpact(o:Obstacle,x:number,z:number,dx:number,dz:number,r:number){
 const c=Math.cos(o.angle??0),s=Math.sin(o.angle??0),rx=x-o.x,rz=z-o.z;
 const px=rx*c-rz*s,pz=rx*s+rz*c,vx=dx*c-dz*s,vz=dx*s+dz*c;
 const hx=o.halfX!+r,hz=o.halfZ!+r,len=Math.hypot(dx,dz);
 if(!len)return 0;
 if(Math.abs(px)<=hx&&Math.abs(pz)<=hz){
  const inward=hx-Math.abs(px)<hz-Math.abs(pz)?-Math.sign(px)*vx:-Math.sign(pz)*vz;
  return Math.max(0,inward)/len;
 }
 let enter=0,exit=1,normal=0;
 for(const [p,v,h] of [[px,vx,hx],[pz,vz,hz]]){
  if(Math.abs(v)<1e-10){if(Math.abs(p)>h)return 0;continue}
  const t1=(-h-p)/v,t2=(h-p)/v,near=Math.min(t1,t2);
  if(near>=enter){enter=near;normal=Math.abs(v)/len}
  exit=Math.min(exit,Math.max(t1,t2));if(enter>exit)return 0;
 }
 return normal;
}
export function blocked(o:Obstacle,x:number,z:number,r:number){
 const dx=x-o.x,dz=z-o.z;
 if(Math.abs(dx)>o.r+r||Math.abs(dz)>o.r+r)return false;
 if(o.halfX===undefined||o.halfZ===undefined)return dx*dx+dz*dz<(r+o.r)**2;
 const c=Math.cos(o.angle??0),s=Math.sin(o.angle??0);
 const a=Math.max(0,Math.abs(dx*c-dz*s)-o.halfX),b=Math.max(0,Math.abs(dx*s+dz*c)-o.halfZ);
 return a*a+b*b<r*r;
}
