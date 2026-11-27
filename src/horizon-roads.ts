import * as T from 'three';
import {places,horizons,type Track} from './map-layout';
import {surfaceMaterial,worldUV} from './graphics';
import {onCreekDeck,trailMaterial,height,roadBed,nearRoute,creekX} from './terrain';
import type {Obstacle} from './obstacle';

// Store small descriptors permanently. Vertex buffers and roadside instances
// belong to the active cells and can be rebuilt from their survey indices.
export function horizonRoads(){
 type Section={track:Track;start:number;end:number};
 const cells=new Map<string,Section[]>();
 for(const track of [...horizons.roads,horizons.bypass]){
  for(let start=0;start<track.points.length-1;){
   const p=track.points[start],gx=Math.round(p.x/256),gz=Math.round(p.z/256);
   let end=start+1;
   while(end<track.points.length-1&&Math.round(track.points[end].x/256)===gx&&Math.round(track.points[end].z/256)===gz)end++;
   const key=gx+','+gz,sections=cells.get(key)??[];
   sections.push({track,start,end});cells.set(key,sections);start=end;
  }
 }
 const cube=new T.BoxGeometry(),paint=surfaceMaterial('dirt',0xffffff,true);
 const timber=new T.MeshStandardMaterial({roughness:1});
 const up=new T.Vector3(0,1,0);
 return function build(gx:number,gz:number,group:T.Group,hits:Obstacle[]){
  const sections=cells.get(gx+','+gz)??[];
  const xyz:number[]=[],rgb:number[]=[],indices:number[]=[],matrix:T.Matrix4[]=[],colors:T.Color[]=[];
  function beam(a:T.Vector3,b:T.Vector3,w:number,d:number,color:number,solid=false){
   const delta=b.clone().sub(a),length=delta.length(),mid=a.clone().lerp(b,.5);
   matrix.push(new T.Matrix4().compose(mid,new T.Quaternion().setFromUnitVectors(up,delta.normalize()),new T.Vector3(w,length,d)));
   colors.push(new T.Color(color));
   if(solid){const horizontal=Math.hypot(a.x-b.x,a.z-b.z);hits.push({x:mid.x,z:mid.z,r:Math.hypot(w,horizontal)/2,angle:Math.atan2(b.x-a.x,b.z-a.z),halfX:w/2,halfZ:Math.max(w,horizontal)/2})}
  }
  for(const {track,start,end} of sections){
   const {points,width}=track,dirt=track.surface==='terra',mountain=track.id==='serra-cobre';
   function side(i:number,offset:number,lift:number){
    const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
    const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);
    const x=p.x+dz/l*offset,z=p.z-dx/l*offset;return new T.Vector3(x,roadBed(x,z)+lift,z);
   }
   function strip(i:number,left:number,right:number,color:number,lift:number){
    const base=xyz.length/3,tint=new T.Color(color);
    for(const j of [i,i+1])for(const offset of [left,right]){
     const v=side(j,offset,lift);xyz.push(v.x,v.y,v.z);rgb.push(tint.r,tint.g,tint.b);
    }
    indices.push(base,base+2,base+1,base+1,base+2,base+3);
   }
   for(let i=start;i<end;i++){
    const half=width/2;
    strip(i,-half-1.3,half+1.3,dirt?0xb87d52:0xab9076,.082);
    const center=points[i],soil=dirt?trailMaterial(center.x,center.z):'asfalto';
    strip(i,-half,half,onCreekDeck(center.x,center.z)?0xabaa9e:dirt?(soil==='cascalho'?0xa39176:soil==='lama'?0x92694c:soil==='areia'?0xc19768:0xb67e51):track.id==='estrada-capela'?0x69665c:0x515655,.102);
    if(dirt&&!onCreekDeck(center.x,center.z)){for(const sign of [-1,1])strip(i,sign*1.2-.32,sign*1.2+.32,0xad754d,.12)}
    else{
     if(i%3===0)strip(i,-.085,.085,0xf4e4b6,.14);
     for(const sign of [-1,1])strip(i,sign*(half-.23)-.07,sign*(half-.23)+.07,0xeaddc2,.14);
    }
    const rail=mountain,spacing=rail?2:3;
    if(i%spacing!==0||i+spacing>=points.length||(!rail&&Math.floor(i/85)%3===0))continue;
    const sign=rail?(side(i,half+22,0).y<side(i,-half-22,0).y?1:-1):(Math.floor(i/160)%2?1:-1);
    const offset=(half+(rail?.95:9))*sign;
    const a=side(i,offset,rail?.74:1.05),b=side(i+spacing,offset,rail?.74:1.05);
    if(places.some(p=>Math.hypot(p.x-a.x,p.z-a.z)<80))continue;
    if(nearRoute(a.x,a.z,half+.35)||nearRoute(b.x,b.z,half+.35))continue;
    if(rail||!nearRoute(a.x,a.z,10)){
     beam(a,b,rail?.18:.085,rail?.25:.12,rail?0x828783:0x70503b,true);
     const bottom=a.clone();bottom.y=height(a.x,a.z)-.07;beam(bottom,a,.16,.18,rail?0x656b68:0x77543d);
    }
   }
  }
  const creek=horizons.creek;
  if(Math.abs(gx*256-creek.x)<400&&Math.abs(gz*256-creek.z)<670){
   for(let z=gz*256-128;z<gz*256+128;z+=8){
    if(Math.abs(z-creek.z)>600||Math.round(creekX(z)/256)!==gx)continue;
    const n=xyz.length/3;
    for(const zz of [z,z+8])for(const sign of [-1,1]){xyz.push(creekX(zz)+sign*15,42,zz);rgb.push(.12,.34,.34)}
    indices.push(n,n+2,n+1,n+1,n+2,n+3);
   }
   if(Math.round(creek.x/256)===gx&&Math.round(creek.z/256)===gz){
    for(const sign of [-1,1]){
     const z=creek.z+sign*4.05;
     const vec=(x:number,y:number)=>new T.Vector3(creek.x+x,y,z);
     beam(vec(-30,43.8),vec(30,43.8),.58,.6,0x9d967e);
     beam(vec(-30,44.65),vec(30,44.65),.2,.24,0xc8b78a,true);
     for(let x=-30;x<=30;x+=6)beam(vec(x,43.8),vec(x,44.8),.32,.32,0xc2a05b);
    }
    beam(new T.Vector3(creek.x-30,43.68,creek.z),new T.Vector3(creek.x+30,43.68,creek.z),.6,8.45,0xa59b84);
   }
  }
  if(xyz.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));g.setIndex(indices);g.computeVertexNormals();worldUV(g,2.5);g.computeBoundingSphere();const mesh=new T.Mesh(g,paint);mesh.userData.sharedMaterial=true;mesh.receiveShadow=true;group.add(mesh)}
  if(matrix.length){const m=new T.InstancedMesh(cube,timber,matrix.length);matrix.forEach((v,i)=>{m.setMatrixAt(i,v);m.setColorAt(i,colors[i])});m.computeBoundingSphere();m.castShadow=m.receiveShadow=true;group.add(m)}
 };
}
