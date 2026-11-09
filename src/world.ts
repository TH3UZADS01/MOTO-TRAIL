import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from 'three';
import {height,terrain,ribbon,terrainPatch,road,nearest,pois,stations,villages,viewpoints,lakes} from './terrain';
export interface Obstacle{x:number;z:number;r:number}
export const obstacles:Obstacle[]=[];
const fixed:Obstacle[]=[];
export function makeWorld(scene:T.Scene){
 obstacles.length=0;fixed.length=0;
 const materials=new Map<number,T.MeshStandardMaterial>();
 const material=(color:number)=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.9}));return materials.get(color)!};
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:number)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m};
 const block=(x:number,z:number,r:number)=>fixed.push({x,z,r});
 function sign(text:string,x:number,z:number,angle:number){const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d')!;ctx.fillStyle='#304d40';ctx.fillRect(0,0,768,192);ctx.strokeStyle='#e5d8b4';ctx.lineWidth=8;ctx.strokeRect(8,8,752,176);ctx.fillStyle='#fff1cc';ctx.font='bold 40px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,113,735);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const mat=new T.MeshBasicMaterial({map:texture});const y=height(x,z);for(const side of [-1,1]){const m=new T.Mesh(new T.PlaneGeometry(5,1.25),mat);m.rotation.y=angle+(side<0?Math.PI:0);m.position.set(x+Math.sin(angle)*.04*side,y+2.5,z+Math.cos(angle)*.04*side);scene.add(m)}box(x,y+1.2,z,.18,2.4,.18,0x655744);block(x,z,.25)}
 // Short meshes allow the renderer to cull distant road sections.
 for(let i=0;i<road.length-1;i+=100){scene.add(ribbon(road.slice(i,Math.min(i+101,road.length)),9.6,0x555d59));}
 for(let start=0;start<road.length-2;start+=100){const parts:T.BufferGeometry[]=[];for(let i=start;i<Math.min(start+100,road.length-2);i+=5){const dash=ribbon(road.slice(i,i+2),.15,0xf0d9a0,.085);parts.push(dash.geometry);(dash.material as T.Material).dispose()}const merged=mergeGeometries(parts);scene.add(new T.Mesh(merged,material(0xf0d9a0)));parts.forEach(g=>g.dispose())}
 function access(p:{x:number;z:number},radius:number){scene.add(terrainPatch(p.x,p.z,radius,0xb8a17b));const n=nearest(p.x,p.z);scene.add(ribbon(Array.from({length:20},(_,i)=>new T.Vector3(T.MathUtils.lerp(n.x,p.x,i/19),0,T.MathUtils.lerp(n.z,p.z,i/19))),6,0xb8a17b,.07))}
 for(const [vIndex,v] of villages.entries()){access(v,60);for(let i=0;i<8;i++){const x=v.x+(i%2?26:-26),z=v.z-42+Math.floor(i/2)*28;if(nearest(x,z).distance<15)continue;const corners=[height(x-5,z-5),height(x+5,z-5),height(x-5,z+5),height(x+5,z+5)],y=Math.max(...corners),bottom=Math.min(...corners)-.25;box(x,(y+bottom)/2,z,10,y-bottom+.1,10,0x928b77);box(x,y+2,z,10,4,10,[0xe6d6b6,0xd4b48c,0xb7ccc0,0xe6caab][(i+vIndex)%4]);const roof=new T.Mesh(new T.ConeGeometry(8,3,4),material(0xa56d52));roof.rotation.y=Math.PI/4;roof.position.set(x,y+5.5,z);scene.add(roof);box(x,y+1.3,z+5.05,1.5,2.6,.12,0x42635e);for(const dx of [-3,3])box(x+dx,y+2.4,z+5.08,1.5,1.2,.15,0xecd79a);block(x,z,7.2)}
  // Village square, flower beds and a small roadside cafe.
  for(const side of [-1,1]){const x=v.x+side*9,z=v.z,y=height(x,z);box(x,y+.5,z,3,1,1,0x826345);block(x,z,1.7);for(let i=0;i<5;i++)box(x-1+i*.5,y+1.1,z,.25,.3,.25,0xe8bd64)}
 }
 for(const s of stations){access(s,22);const y=height(s.x,s.z),n=nearest(s.x,s.z),angle=Math.atan2(s.x-n.x,s.z-n.z),at=(x:number,z:number)=>({x:s.x+Math.cos(angle)*x+Math.sin(angle)*z,z:s.z-Math.sin(angle)*x+Math.cos(angle)*z});
  const part=(x:number,h:number,z:number,w:number,t:number,d:number,color:number)=>{const p=at(x,z),m=box(p.x,h,p.z,w,t,d,color);m.rotation.y=angle;return m};
  part(0,y+4.6,0,20,.45,14,0xe9d8b3);part(0,y+4.85,0,20,.2,14,0x426d62);
  for(const dx of [-8,8])for(const dz of [-5,5]){const p=at(dx,dz),h=height(p.x,p.z);part(dx,(h+y+4.4)/2,dz,.3,y+4.4-h,.3,0xc6bd9d);block(p.x,p.z,.35)}
  for(const dx of [-4,4]){const p=at(dx,0),h=height(p.x,p.z);part(dx,h+.8,0,.85,1.6,.7,0xe2dcc5);part(dx,h+1.1,.36,.6,.4,.025,0x1e3936);block(p.x,p.z,.65)}const signPos=at(10,-10);sign(s.name+' · gasolina',signPos.x,signPos.z,angle);
 }
 for(const p of viewpoints){access(p,18);const y=height(p.x,p.z+10);box(p.x,y+.65,p.z+10,4,.2,.8,0x886442);for(const dx of [-1.5,1.5])box(p.x+dx,y+.3,p.z+10,.2,.6,.6,0x655744);block(p.x,p.z+10,2);for(let i=-3;i<=3;i++){const x=p.x+i*4,z=p.z+16;box(x,height(x,z)+.65,z,.2,1.3,.2,0x887255);block(x,z,.2)}}
 for(const p of pois){const n=nearest(p.x,p.z),a=road[n.index],b=road[n.index+1],angle=Math.atan2(b.x-a.x,b.z-a.z);sign(p.name,n.x+Math.cos(angle)*8-Math.sin(angle)*14,n.z-Math.sin(angle)*8-Math.cos(angle)*14,angle)}
 for(let i=0;i<20;i++){const p=road[i*250],q=road[i*250+1];if(stations.some(s=>Math.hypot(s.x-p.x,s.z-p.z)<60))continue;const a=Math.atan2(q.x-p.x,q.z-p.z);sign('Estrada do Horizonte · km '+i,p.x+Math.cos(a)*8,p.z-Math.sin(a)*8,a)}
 for(const p of lakes){const water=new T.Mesh(new T.CircleGeometry(p.r*.83,64),new T.MeshStandardMaterial({color:0x75aaa5,roughness:.22,metalness:.3}));water.rotation.x=-Math.PI/2;water.position.set(p.x,height(p.x,p.z)+2,p.z);scene.add(water);block(p.x,p.z,p.r*.86)}
 // Local chunks: terrain, groves and rocks have bounded cost even on a 20 km trip.
 const chunks=new Map<string,{group:T.Group;hits:Obstacle[]}>();const dummy=new T.Object3D();
 const crown=new T.IcosahedronGeometry(1,0),trunk=new T.CylinderGeometry(.3,.45,4,6),rock=new T.DodecahedronGeometry(1,0);
 function chunk(gx:number,gz:number){const group=new T.Group(),hits:Obstacle[]=[],cx=gx*256,cz=gz*256;group.add(terrain(cx,cz));let seed=((gx*73856093)^(gz*19349663)^73129)>>>0;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};const trees=new T.InstancedMesh(crown,material(0x718a54),100),trunks=new T.InstancedMesh(trunk,material(0x665540),100),rocks=new T.InstancedMesh(rock,material(0x929788),15);let count=0,rc=0;
  for(let i=0;i<115;i++){const x=cx+(rand()-.5)*256,z=cz+(rand()-.5)*256;if(nearest(x,z).distance<15||pois.some(p=>Math.hypot(x-p.x,z-p.z)<(p.kind==='village'?85:45))||lakes.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+20))continue;const y=height(x,z),s=.8+rand()*1.2;
   if(i<100){dummy.position.set(x,y+6*s,z);dummy.scale.set(3.6*s,3.2*s,3.6*s);dummy.rotation.set(0,rand()*6,0);dummy.updateMatrix();trees.setMatrixAt(count,dummy.matrix);trees.setColorAt(count,new T.Color().setHSL(.22+rand()*.09,.25,.25+rand()*.13));dummy.position.y=y+2*s;dummy.scale.setScalar(s);dummy.updateMatrix();trunks.setMatrixAt(count,dummy.matrix);hits.push({x,z,r:.5*s});count++}
   else{dummy.position.set(x,y+.5*s,z);dummy.scale.set(s*1.5,s,s);dummy.updateMatrix();rocks.setMatrixAt(rc++,dummy.matrix);hits.push({x,z,r:s})}
  }trees.count=trunks.count=count;rocks.count=rc;trees.castShadow=true;group.add(trees,trunks,rocks);scene.add(group);return {group,hits};
 }
 let cell='';const birds=new T.Group();for(let i=0;i<12;i++){const bird=new T.Mesh(new T.ConeGeometry(.5,2,3),material(0x55645c));bird.rotation.z=Math.PI/2;birds.add(bird)}scene.add(birds);
 return {update(x:number,z:number,time:number){const gx=Math.round(x/256),gz=Math.round(z/256),key=gx+','+gz;if(key!==cell){cell=key;const wanted=new Set<string>();for(let a=gx-3;a<=gx+3;a++)for(let b=gz-3;b<=gz+3;b++){const k=a+','+b;wanted.add(k);if(!chunks.has(k))chunks.set(k,chunk(a,b))}for(const [k,c] of chunks)if(!wanted.has(k)){scene.remove(c.group);c.group.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();else if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose()}});chunks.delete(k)}obstacles.length=0;obstacles.push(...fixed);for(const c of chunks.values())obstacles.push(...c.hits)}birds.position.set(x,height(x,z)+55,z);birds.children.forEach((b,i)=>b.position.set(Math.sin(time*.00012+i*.2)*100,Math.sin(time*.002+i)*2,Math.cos(time*.00012+i*.2)*100));}};
}
