import {makeSea} from './coast';
import {vegetationFactory} from './vegetation';
import {BIOME_TUNING} from './biomes';
import {enableShadows,surfaceMaterial,worldUV} from './graphics';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from 'three';
import {height,terrain,ribbon,terrainPatch,road,nearest,pois,stations,villages,viewpoints,lakes,routes,nearestRoute,nearRoute,bridges,specials,deepWater} from './terrain';
import {river,riverWidth,waterY,riverX,riverStart,riverEnd,point} from './map-layout';
export interface Obstacle{x:number;z:number;r:number}
export const obstacles:Obstacle[]=[];
const fixed:Obstacle[]=[];
export function makeWorld(scene:T.Scene){
 obstacles.length=0;fixed.length=0;const sea=makeSea(scene);
 const materials=new Map<number,T.MeshStandardMaterial>();
 const material=(color:number)=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.9}));return materials.get(color)!};
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:number)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m};
 const block=(x:number,z:number,r:number)=>fixed.push({x,z,r});
 function sign(text:string,x:number,z:number,angle:number){const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d')!;ctx.fillStyle='#304d40';ctx.fillRect(0,0,768,192);ctx.strokeStyle='#e5d8b4';ctx.lineWidth=8;ctx.strokeRect(8,8,752,176);ctx.fillStyle='#fff1cc';ctx.font='bold 40px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,113,735);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const mat=new T.MeshBasicMaterial({map:texture});const y=height(x,z);for(const side of [-1,1]){const m=new T.Mesh(new T.PlaneGeometry(5,1.25),mat);m.rotation.y=angle+(side<0?Math.PI:0);m.position.set(x+Math.sin(angle)*.04*side,y+2.5,z+Math.cos(angle)*.04*side);scene.add(m)}box(x,y+1.2,z,.18,2.4,.18,0x655744);block(x,z,.25)}
 // Paved and dirt routes share the exact geometry used by physics.
 for(const route of routes){for(let i=0;i<route.points.length-1;i+=100){const section=route.points.slice(i,Math.min(i+101,route.points.length)),mesh=ribbon(section,route.width,route.surface==='terra'?0xb48a58:0x555d59,route.surface==='terra'?.065:.075);scene.add(mesh);
   if(route.surface==='terra'){const p=mesh.geometry.attributes.position,colors:number[]=[];for(let j=0;j<p.count;j++){const shade=.91+.06*Math.sin(p.getX(j)*.8+p.getZ(j)*.3)+.03*Math.cos(p.getZ(j)*1.7);colors.push(shade,shade,shade)}mesh.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));(mesh.material as T.MeshStandardMaterial).vertexColors=true;
    for(const side of [-1,1]){const tread=section.map((p,j)=>{const a=section[Math.max(0,j-1)],b=section[Math.min(section.length-1,j+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);return new T.Vector3(p.x+dz/l*side*1.1,0,p.z-dx/l*side*1.1)});scene.add(ribbon(tread,.35,0xa47d51,.08))}
   }
  }
  if(route.surface==='asfalto')for(let start=0;start<route.points.length-2;start+=100){const parts:T.BufferGeometry[]=[];for(let i=start;i<Math.min(start+100,route.points.length-2);i+=5){const dash=ribbon(route.points.slice(i,i+2),.15,0xf0d9a0,.105);parts.push(dash.geometry);(dash.material as T.Material).dispose()}if(parts.length){scene.add(new T.Mesh(mergeGeometries(parts),material(0xf0d9a0)));parts.forEach(g=>g.dispose())}}
 }
 // River geometry follows its water level, never the road/bridge collision surface.
 for(let start=0;start<river.length-1;start+=80){const pts=river.slice(start,start+81),positions:number[]=[],indices:number[]=[];pts.forEach((p,i)=>{positions.push(p.x-riverWidth/2,p.y,p.z,p.x+riverWidth/2,p.y,p.z);if(i)indices.push((i-1)*2,(i-1)*2+1,i*2,i*2,(i-1)*2+1,i*2+1)});const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();worldUV(g,7);scene.add(new T.Mesh(g,surfaceMaterial('water',0x73aaa5)))}
 const beam=(a:T.Vector3,b:T.Vector3,w:number,h:number,color:number)=>{const m=box(0,0,0,w,h,a.distanceTo(b),color);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),b.clone().sub(a).normalize());return m};
 for(const b of bridges){const pos=(along:number,side:number,dy:number)=>{const x=b.x+b.dx*along+b.dz*side,z=b.z+b.dz*along-b.dx*side;return new T.Vector3(x,waterY(z)+7+dy,z)};
  beam(pos(-b.halfLength,0,-.3),pos(b.halfLength,0,-.3),b.width,.6,0x999787);
  for(const side of [-1,1]){const offset=side*(b.width/2-.15);beam(pos(-b.halfLength,offset,1.05),pos(b.halfLength,offset,1.05),.14,.16,0xe1d2af);for(let d=-b.halfLength;d<=b.halfLength;d+=4){const p=pos(d,offset,.55);box(p.x,p.y,p.z,.2,1.1,.2,0xcfc1a3)}for(let d=-b.halfLength;d<=b.halfLength;d+=.8){const p=pos(d,offset,0);block(p.x,p.z,.14)}}
  for(const along of [-b.halfLength*.6,b.halfLength*.6]){const p=pos(along,0,-3);box(p.x,p.y,p.z,1.5,6,1.5,0x8d9187)}
 }
 function access(p:{x:number;z:number},radius:number){scene.add(terrainPatch(p.x,p.z,radius,0xb8a17b));const n=nearestRoute(p.x,p.z);if(n.distance<.5)return;scene.add(ribbon(Array.from({length:20},(_,i)=>new T.Vector3(T.MathUtils.lerp(n.x,p.x,i/19),0,T.MathUtils.lerp(n.z,p.z,i/19))),6,0xb8a17b,.07))}
 for(const [vIndex,v] of villages.entries()){access(v,60);for(let i=0;i<8;i++){const x=v.x+(i%2?26:-26),z=v.z-42+Math.floor(i/2)*28;if(nearRoute(x,z,15))continue;const corners=[height(x-5,z-5),height(x+5,z-5),height(x-5,z+5),height(x+5,z+5)],y=Math.max(...corners),bottom=Math.min(...corners)-.25;box(x,(y+bottom)/2,z,10,y-bottom+.1,10,0x928b77);box(x,y+2,z,10,4,10,[0xe6d6b6,0xd4b48c,0xb7ccc0,0xe6caab][(i+vIndex)%4]);const roof=new T.Mesh(new T.ConeGeometry(8,3,4),material(0xa56d52));roof.rotation.y=Math.PI/4;roof.position.set(x,y+5.5,z);scene.add(roof);box(x,y+1.3,z+5.05,1.5,2.6,.12,0x42635e);for(const dx of [-3,3])box(x+dx,y+2.4,z+5.08,1.5,1.2,.15,0xecd79a);block(x,z,7.2)}
  // Village square, flower beds and a small roadside cafe.
  for(const side of [-1,1]){const x=v.x+side*9,z=v.z,y=height(x,z);if(nearRoute(x,z,12))continue;box(x,y+.5,z,3,1,1,0x826345);block(x,z,1.7);for(let i=0;i<5;i++)box(x-1+i*.5,y+1.1,z,.25,.3,.25,0xe8bd64)}
 }
 for(const s of stations){access(s,22);const y=height(s.x,s.z),n=nearestRoute(s.x,s.z),angle=Math.atan2(s.x-n.x,s.z-n.z),at=(x:number,z:number)=>({x:s.x+Math.cos(angle)*x+Math.sin(angle)*z,z:s.z-Math.sin(angle)*x+Math.cos(angle)*z});
  const part=(x:number,h:number,z:number,w:number,t:number,d:number,color:number)=>{const p=at(x,z),m=box(p.x,h,p.z,w,t,d,color);m.rotation.y=angle;return m};
  part(0,y+4.6,0,20,.45,14,0xe9d8b3);part(0,y+4.85,0,20,.2,14,0x426d62);
  for(const dx of [-8,8])for(const dz of [-5,5]){const p=at(dx,dz),h=height(p.x,p.z);part(dx,(h+y+4.4)/2,dz,.3,y+4.4-h,.3,0xc6bd9d);block(p.x,p.z,.35)}
  for(const dx of [-4,4]){const p=at(dx,0),h=height(p.x,p.z);part(dx,h+.8,0,.85,1.6,.7,0xe2dcc5);part(dx,h+1.1,.36,.6,.4,.025,0x1e3936);block(p.x,p.z,.65)}const signPos=at(10,-10);sign(s.name+' · gasolina',signPos.x,signPos.z,angle);
 }
 for(const p of viewpoints){access(p,18);const y=height(p.x,p.z+10);box(p.x,y+.65,p.z+10,4,.2,.8,0x886442);for(const dx of [-1.5,1.5])box(p.x+dx,y+.3,p.z+10,.2,.6,.6,0x655744);block(p.x,p.z+10,2);for(let i=-3;i<=3;i++){const x=p.x+i*4,z=p.z+16;box(x,height(x,z)+.65,z,.2,1.3,.2,0x887255);block(x,z,.2)}}
 for(const p of pois){const n=nearestRoute(p.x,p.z),a=n.track.points[n.index],b=n.track.points[n.index+1],angle=Math.atan2(b.x-a.x,b.z-a.z);{const x=n.x+Math.cos(angle)*9-Math.sin(angle)*20,z=n.z-Math.sin(angle)*9-Math.cos(angle)*20;if(!nearRoute(x,z,6))sign(p.name,x,z,angle)}}
 for(let i=0;i<20;i++){const p=road[i*250],q=road[i*250+1];if(stations.some(s=>Math.hypot(s.x-p.x,s.z-p.z)<60))continue;const a=Math.atan2(q.x-p.x,q.z-p.z);sign('Estrada do Horizonte · km '+i,p.x+Math.cos(a)*8,p.z-Math.sin(a)*8,a)}
 for(const p of lakes){const g=new T.CircleGeometry(p.r*.88,96);g.rotateX(-Math.PI/2);g.translate(p.x,12,p.z);worldUV(g,7);const water=new T.Mesh(g,surfaceMaterial('water',0x75aaa5));scene.add(water)}
 // Small interior destinations make the branches worth exploring.
 for(const p of specials){access(p,p.kind==='farm'?35:24);const safe=(x:number,z:number,r=4)=>!nearRoute(x,z,r+5);
  if(p.kind==='farm'){const x=p.x-30,z=p.z-25,y=height(x,z);if(safe(x,z,10)){box(x,y+3,z,16,6,12,0xb97851);const roof=new T.Mesh(new T.ConeGeometry(12,4,4),material(0x8b5a45));roof.position.set(x,y+8,z);roof.rotation.y=Math.PI/4;scene.add(roof);block(x,z,10)}
   for(let i=0;i<7;i++){const x=p.x-75+i*5,z=p.z+30;if(safe(x,z,3)){scene.add(terrainPatch(x,z,3,0x9b8c43));for(let j=0;j<6;j++){const zz=z+j*5;if(!safe(x,zz,2))continue;box(x,height(x,zz)+.65,zz,.5,1.3,.5,0x9eac54)}}}
  }else if(p.kind==='camp'){for(let i=0;i<4;i++){const x=p.x+(i%2?16:-16),z=p.z+Math.floor(i/2)*15,y=height(x,z);if(!safe(x,z,3))continue;const tent=new T.Mesh(new T.ConeGeometry(3,3.5,4),material(i%2?0xc6a667:0x87947d));tent.position.set(x,y+1.75,z);tent.rotation.y=Math.PI/4;scene.add(tent);block(x,z,2.6)}
  }else{const x=p.x+28,z=p.z-20,y=height(x,z);if(safe(x,z,12)){for(let i=0;i<7;i++){const stone=new T.Mesh(new T.DodecahedronGeometry(1,0),material(i%2?0x8c9184:0x7e887c));stone.scale.set(4+i%3,4+(i%2)*2,4);stone.position.set(x+(i-3)*2.4,y+3.5+(i%2),z-1-(i%3));stone.rotation.y=i*.8;stone.castShadow=true;scene.add(stone)}
    const fall=new T.Mesh(new T.PlaneGeometry(4.5,7),new T.MeshStandardMaterial({color:0x96cfc7,roughness:.25,transparent:true,opacity:.85,side:T.DoubleSide}));fall.position.set(x,y+4,z+3.4);scene.add(fall);box(x,y+.6,z+3.5,4.8,.2,.8,0xd6e7d9);block(x,z,11);scene.add(terrainPatch(x,z+10,7,0x7caaa0))}}
 }
 for(const route of routes.filter(t=>t.id!=='main')){for(const p of [route.points[8],route.points.at(-9)!]){const n=nearestRoute(p.x,p.z),a=n.track.points[n.index],b=n.track.points[n.index+1],angle=Math.atan2(b.x-a.x,b.z-a.z),x=p.x+Math.cos(angle)*9,z=p.z-Math.sin(angle)*9;if(!nearRoute(x,z,6))sign(route.name+(route.surface==='terra'?' · terra':' · asfalto'),x,z,angle)}}
 // Local chunks: terrain, groves and rocks have bounded cost even on a 20 km trip.
 const chunks=new Map<string,{group:T.Group;details:T.Group;hits:Obstacle[];cx:number;cz:number}>();const dummy=new T.Object3D();
 const vegetation=vegetationFactory(),rock=new T.DodecahedronGeometry(1,0);
 function chunk(gx:number,gz:number){const group=new T.Group(),hits:Obstacle[]=[],cx=gx*256,cz=gz*256;group.add(terrain(cx,cz));let seed=((gx*73856093)^(gz*19349663)^73129)>>>0;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};const samples=[];
  const rocks=new T.InstancedMesh(rock,material(0x929788),15);let rc=0;
  for(let i=0;i<150;i++){const x=cx+(rand()-.5)*256,z=cz+(rand()-.5)*256;if(nearRoute(x,z,15)||deepWater(x,z)||(z>=riverStart&&z<=riverEnd&&Math.abs(x-riverX(z))<48)||pois.some(p=>Math.hypot(x-p.x,z-p.z)<(p.kind==='village'?85:45))||lakes.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+20))continue;const y=height(x,z),s=.7+rand()*1.1;
   if(i<135)samples.push({x,y,z,s,r:rand(),rotation:rand()*Math.PI*2,tint:rand()});
   else{dummy.position.set(x,y+.5*s,z);dummy.scale.set(s*1.5,s,s);dummy.rotation.set(0,rand()*6,0);dummy.updateMatrix();rocks.setMatrixAt(rc++,dummy.matrix);hits.push({x,z,r:s})}
  }
  const plants=vegetation(samples);group.add(plants.group);hits.push(...plants.hits);rocks.count=rc;rocks.castShadow=true;rocks.computeBoundingSphere();group.add(rocks);enableShadows(group);scene.add(group);return {group,details:plants.details,hits,cx,cz};
 }
 enableShadows(scene);
 let cell='';const birds=new T.Group();for(let i=0;i<12;i++){const bird=new T.Mesh(new T.ConeGeometry(.5,2,3),material(0x55645c));bird.rotation.z=Math.PI/2;birds.add(bird)}scene.add(birds);
 return {update(x:number,z:number,time:number){sea.update(time);const gx=Math.round(x/256),gz=Math.round(z/256),key=gx+','+gz;if(key!==cell){cell=key;const wanted=new Set<string>();for(let a=gx-3;a<=gx+3;a++)for(let b=gz-3;b<=gz+3;b++){const k=a+','+b;wanted.add(k);if(!chunks.has(k))chunks.set(k,chunk(a,b))}for(const [k,c] of chunks)if(!wanted.has(k)){scene.remove(c.group);c.group.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();else if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose()}});chunks.delete(k)}obstacles.length=0;obstacles.push(...fixed);for(const c of chunks.values())obstacles.push(...c.hits)}for(const c of chunks.values())c.details.visible=Math.hypot(c.cx-x,c.cz-z)<BIOME_TUNING.detailDistance;birds.position.set(x,height(x,z)+55,z);birds.children.forEach((b,i)=>b.position.set(Math.sin(time*.00012+i*.2)*100,Math.sin(time*.002+i)*2,Math.cos(time*.00012+i*.2)*100));}};
}
