import * as T from 'three';
import {height,terrain,ribbon,terrainPatch,road,dirt,nearest,pois,BRIDGE,bridgeY,LOOKOUT,ground} from './terrain';
export interface Obstacle {x:number;z:number;r:number}
export const obstacles:Obstacle[]=[];
export function makeWorld(scene:T.Scene){
  obstacles.length=0;
  scene.add(terrain(),ribbon(road,8.6,0x555d59),ribbon(dirt,5.4,0xb59a70,.02));
  const materials=new Map<number,T.MeshStandardMaterial>();
  const material=(color:number)=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.9}));return materials.get(color)!};
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:number)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m};
  const beam=(a:T.Vector3,b:T.Vector3,width:number,color:number)=>{const m=box(0,0,0,width,a.distanceTo(b),width,color);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return m};
  for(let i=0;i<road.length-5;i+=10)scene.add(ribbon(road.slice(i,i+4),.12,0xe8d5a0,.08));
  let seed=73129;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const trees=new T.InstancedMesh(new T.IcosahedronGeometry(4.1,0),new T.MeshStandardMaterial({color:0xffffff,flatShading:true}),750);
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.28,.45,4,6),material(0x655744),750),dummy=new T.Object3D();let count=0;
  while(count<750){const x=(rand()-.5)*1120,z=(rand()-.5)*1120;
    if(nearest(x,z).distance<14||nearest(x,z,dirt).distance<9||((x+65)/70)**2+((z-65)/50)**2<1||Math.hypot(x+310,z)<65||Math.hypot(x-LOOKOUT.x,z-LOOKOUT.z)<25||Math.abs(x)<20&&Math.abs(z-BRIDGE.z)<60)continue;
    const s=.65+rand()*.8,y=height(x,z);dummy.position.set(x,y+6*s,z);dummy.scale.set(s*1.1,s*.8,s);dummy.rotation.y=rand()*6;dummy.updateMatrix();trees.setMatrixAt(count,dummy.matrix);trees.setColorAt(count,new T.Color().setHSL(.24+rand()*.055,.22+rand()*.1,.23+rand()*.12));dummy.scale.setScalar(s);dummy.position.y=y+2*s;dummy.updateMatrix();trunks.setMatrixAt(count,dummy.matrix);obstacles.push({x,z,r:.5*s});count++;
  }
  trees.castShadow=true;scene.add(trees,trunks);
  for(let i=0;i<9;i++){const x=-335-(i%3)*14,z=-45+Math.floor(i/3)*32;
    const corners=[height(x-5,z-5),height(x+5,z-5),height(x-5,z+5),height(x+5,z+5)],y=Math.max(...corners),bottom=Math.min(...corners)-.2;
    box(x,(y+bottom)/2,z,10,y-bottom+.1,10,0x8f8a76);box(x,y+2,z,10,4,10,[0xd9c8a2,0xe7dfc8,0xb0c0b5][i%3]);
    const roof=new T.Mesh(new T.ConeGeometry(8,3,4),material(0xa56348));roof.rotation.y=Math.PI/4;roof.position.set(x,y+5,z);scene.add(roof);box(x+5.06,y+1.3,z,.12,2.6,1.5,0x42635e);box(x+5.08,y+2,z+3,.15,1.2,1.6,0x748e91);obstacles.push({x,z,r:7});
  }
  const lake=new T.Mesh(new T.CircleGeometry(1,64),new T.MeshStandardMaterial({color:0x70a9a3,roughness:.28,metalness:.22}));lake.rotation.x=-Math.PI/2;lake.scale.set(58,32,1);lake.position.set(-65,2,65);scene.add(lake);
  for(const x of [-100,-80,-60,-40,-25])obstacles.push({x,z:65,r:x===-25||x===-100?17:23});
  // Stream below a solid deck; road collision uses this same deck elevation.
  const creek=new T.Mesh(new T.PlaneGeometry(8,72),material(0x75aaa5));creek.rotation.x=-Math.PI/2;creek.position.set(0,bridgeY-2.6,BRIDGE.z);scene.add(creek);
  box(0,bridgeY-.25,BRIDGE.z,32,.56,10.8,0x85877d);
  for(const side of [-1,1]){
    const z=BRIDGE.z+side*5.1;
    for(let x=-16;x<=16;x+=4){box(x,bridgeY+.67,z,.2,1.34,.2,0xd4c8a7);}
    beam(new T.Vector3(-16,bridgeY+1.25,z),new T.Vector3(16,bridgeY+1.25,z),.16,0xd4c8a7);
    for(let x=-16;x<=16;x+=.75)obstacles.push({x,z,r:.16});
    for(const x of [-12,12])box(x,bridgeY-1.4,z,.9,2.8,.9,0x85877d);
  }
  // Mirante uses original terrain triangles, and its approach joins the road.
  scene.add(terrainPatch(LOOKOUT.x,LOOKOUT.z,LOOKOUT.radius,0xb2a080));
  const approach=nearest(LOOKOUT.x,LOOKOUT.z);
  const access=Array.from({length:40},(_,i)=>new T.Vector3(T.MathUtils.lerp(approach.x,LOOKOUT.x,i/39),0,T.MathUtils.lerp(approach.z,LOOKOUT.z,i/39)));
  scene.add(ribbon(access,4,0xb2a080,.09));
  for(let x=LOOKOUT.x-8;x<=LOOKOUT.x+8;x+=4){const z=LOOKOUT.z-9,y=height(x,z);box(x,y+.6,z,.2,1.2,.2,0x826a4a);obstacles.push({x,z,r:.2});if(x<LOOKOUT.x+8)beam(new T.Vector3(x,y+1,z),new T.Vector3(x+4,height(x+4,z)+1,z),.12,0x826a4a);}
  const bx=LOOKOUT.x,bz=LOOKOUT.z-5,seatY=Math.max(height(bx-1.3,bz),height(bx+1.3,bz))+.65;
  box(bx,seatY,bz,3,.15,.7,0x886442);box(bx,seatY+.4,bz-.3,3,.7,.12,0x886442);
  for(const x of [bx-1.2,bx+1.2])for(const z of [bz-.25,bz+.25]){const y=height(x,z);box(x,(y+seatY)/2,z,.12,seatY-y,.12,0x655744)}obstacles.push({x:bx,z:bz,r:1.5});
  // Separate front/back faces: text stays readable from both directions.
  for(const p of pois){const route=nearest(p.name==='Ponte do Córrego'?-24:p.x,p.z),a=road[route.index],b=road[route.index+1],tangent=b.clone().sub(a).setY(0).normalize();
    const sx=route.x+tangent.z*7.3,sz=route.z-tangent.x*7.3,y=height(sx,sz);
    const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d')!;ctx.fillStyle='#304d40';ctx.fillRect(0,0,768,192);ctx.strokeStyle='#e5d8b4';ctx.lineWidth=8;ctx.strokeRect(8,8,752,176);ctx.fillStyle='#fff1cc';ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.fillText(p.name,384,113);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
    const m=new T.MeshBasicMaterial({map:texture,side:T.FrontSide});
    for(const side of [-1,1]){const face=new T.Mesh(new T.PlaneGeometry(4.5,1.125),m);face.position.set(sx+tangent.x*.035*side,y+2.4,sz+tangent.z*.035*side);face.rotation.y=Math.atan2(tangent.x,tangent.z)+(side===-1?Math.PI:0);scene.add(face)}
    box(sx,y+1.15,sz,.15,2.3,.15,0x665640);obstacles.push({x:sx,z:sz,r:.2});
  }
  // Rocks along shoulders and a spaced, passable slalom on the dirt shortcut.
  const rockGeometry=new T.DodecahedronGeometry(1,0),rocks=new T.InstancedMesh(rockGeometry,material(0x8f9184),70);
  for(let i=0;i<70;i++){
    let x:number,z:number,r:number;
    if(i<6){const p=dirt[75+i*38],q=dirt[76+i*38],a=Math.atan2(q.x-p.x,q.z-p.z),side=i%2?1:-1;x=p.x+Math.cos(a)*side*1.45;z=p.z-Math.sin(a)*side*1.45;r=.55;}
    else {const index=Math.floor(rand()*(road.length-1)),p=road[index],q=road[index+1],a=Math.atan2(q.x-p.x,q.z-p.z),distance=9+rand()*8;x=p.x+Math.cos(a)*distance;z=p.z-Math.sin(a)*distance;r=.6+rand()*1.3;if(Math.abs(x)<25&&Math.abs(z-BRIDGE.z)<25){x+=30}}
    dummy.position.set(x,height(x,z)+r*.3,z);dummy.rotation.set(rand()*.3,rand()*6,rand()*.2);dummy.scale.set(r,r*.7,r);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);obstacles.push({x,z,r:r*.85});
  }
  rocks.castShadow=true;scene.add(rocks);
  // A short roadside fence, with grounded sloped rails and collidable posts.
  for(let x=-190;x<=-150;x+=5){const z=245,y=height(x,z);box(x,y+.65,z,.18,1.3,.18,0x887255);obstacles.push({x,z,r:.2});if(x<-150)beam(new T.Vector3(x,y+1,z),new T.Vector3(x+5,height(x+5,z)+1,z),.12,0x887255);}
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,x=Math.cos(a)*750,z=Math.sin(a)*750;const m=new T.Mesh(new T.IcosahedronGeometry(1,1),material(0x7f9383));m.scale.set(140+rand()*100,75+rand()*100,150+rand()*70);m.position.set(x,-15,z);scene.add(m)}
  scene.traverse(o=>{if(o instanceof T.Mesh)o.receiveShadow=true});return {trees};
}

