import * as T from 'three';
import {height,nearRoute,deepWater,villages,stations,viewpoints,specials} from './terrain';
type Site={x:number;z:number};
type Block=Site & {r:number};

export function makePlaceLights(scene:T.Scene,obstacles:Block[]){
 const bulbs:T.Vector3[]=[],poles:T.Vector3[]=[];
 function post(site:Site,dx:number,dz:number){
  // Try alternate sides when a building, the entrance or a stream occupies the first.
  for(const [ox,oz] of [[dx,dz],[-dx,dz],[dx,-dz],[-dx,-dz],[dz,dx],[-dz,-dx]]){
   const x=site.x+ox,z=site.z+oz;
   if(nearRoute(x,z,10)||deepWater(x,z)||obstacles.some(b=>Math.hypot(b.x-x,b.z-z)<b.r+1.2))continue;
   const y=height(x,z);poles.push(new T.Vector3(x,y+2.45,z));
   bulbs.push(new T.Vector3(x,y+4.98,z));obstacles.push({x,z,r:.22});break;
  }
 }
 for(const v of villages){post(v,10,12);post(v,-10,-12)}
 for(const p of [...viewpoints,...specials])post(p,8,9);
 for(const s of stations){
  post(s,15,6);
  // Illuminate the pumps from below the canopy as well.
  bulbs.push(new T.Vector3(s.x,height(s.x,s.z)+4.21,s.z));
 }
 const glow=new T.MeshStandardMaterial({color:0xffedd2,emissive:0xffc77e,emissiveIntensity:0});
 const iron=new T.MeshStandardMaterial({color:0x41473f,roughness:.85});
 function batch(points:T.Vector3[],geo:T.BufferGeometry,mat:T.Material,dy=0){
  const mesh=new T.InstancedMesh(geo,mat,points.length),matrix=new T.Matrix4();
  points.forEach((p,i)=>mesh.setMatrixAt(i,matrix.makeTranslation(p.x,p.y+dy,p.z)));
  mesh.computeBoundingSphere();scene.add(mesh);
 }
 batch(poles,new T.CylinderGeometry(.10,.16,5,8),iron);
 batch(bulbs,new T.CylinderGeometry(.44,.32,.19,12),glow);
 batch(bulbs,new T.CylinderGeometry(.28,.49,.14,12),iron,.16);
 // Only nearby fixtures need to illuminate geometry. Distant lenses still glow.
 const pool=Array.from({length:3},()=>{const l=new T.PointLight(0xffcf98,0,26,2);scene.add(l);return l});
 const nearest=bulbs.slice();
 let lastX=Infinity,lastZ=Infinity;
 return (x:number,z:number,night:number)=>{
  glow.emissiveIntensity=night*2.8;
  if(Math.abs(lastX-x)+Math.abs(lastZ-z)>2){
   const dist=(p:T.Vector3)=>(p.x-x)**2+(p.z-z)**2;
   nearest.sort((a,b)=>dist(a)-dist(b));lastX=x;lastZ=z;
  }
  pool.forEach((l,i)=>{
   const p=nearest[i],distance=p?Math.hypot(p.x-x,p.z-z):Infinity;
   l.visible=night>.002&&distance<100;
   if(l.visible){l.position.copy(p);l.position.y-=.16;l.intensity=night*115*(1-T.MathUtils.smoothstep(distance,65,100))}
  });
 };
}
