import * as T from 'three';
export const SIZE = 1280, STEP = 4;
export const BRIDGE = {x:0,z:-240,halfLength:16,halfWidth:5.4};
export const LOOKOUT = {x:291,z:-90,radius:11};
const baseHeight = (x:number,z:number) => 9+35*Math.exp(-((x-220)**2/40000+(z+90)**2/32000))+9*Math.sin(x/190)*Math.cos(z/210);
export const bridgeY = baseHeight(BRIDGE.x,BRIDGE.z);
const raw=(x:number,z:number)=> {
  const base=baseHeight(x,z);
  const radius=Math.sqrt(((x+65)/58)**2+((z-65)/32)**2);
  const blend=T.MathUtils.smoothstep(radius,.65,1.4);
  let y=-2*(1-blend)+base*blend;
  // Graded approaches meet the deck. The stream bed is below it, not a water plane on grass.
  const approach=(1-T.MathUtils.smoothstep(Math.abs(x),22,48))*(1-T.MathUtils.smoothstep(Math.abs(z-BRIDGE.z),9,22));
  y=T.MathUtils.lerp(y,bridgeY,approach);
  const channel=(1-T.MathUtils.smoothstep(Math.abs(x),4,12))*(1-T.MathUtils.smoothstep(Math.abs(z-BRIDGE.z),32,48));
  return y-channel*3.2;
};
// Exactly the same triangulation as PlaneGeometry (including at the banks).
export function height(x:number,z:number):number {
  const half=SIZE/2,ix=Math.floor((x+half)/STEP),iz=Math.floor((z+half)/STEP);
  const a=ix*STEP-half,b=iz*STEP-half,u=(x-a)/STEP,v=(z-b)/STEP;
  const h00=raw(a,b),h10=raw(a+STEP,b),h01=raw(a,b+STEP),h11=raw(a+STEP,b+STEP);
  return u+v<=1?h00+(h10-h00)*u+(h01-h00)*v:h11+(h01-h11)*(1-u)+(h10-h11)*(1-v);
}
export function onBridge(x:number,z:number){return Math.abs(x)<=BRIDGE.halfLength&&Math.abs(z-BRIDGE.z)<=BRIDGE.halfWidth;}
export function roadBed(x:number,z:number){return onBridge(x,z)?bridgeY:height(x,z);}
export const curve=new T.CatmullRomCurve3(Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2;return new T.Vector3(Math.cos(a)*(310+30*Math.sin(3*a)),0,Math.sin(a)*240)}),true,'catmullrom',.35);
export const road=curve.getPoints(1080).map(p=>new T.Vector3(p.x,roadBed(p.x,p.z),p.z));
export const dirt=Array.from({length:401},(_,i)=>{const a=i/400,x=-310+620*a,z=28*Math.sin(a*Math.PI);return new T.Vector3(x,height(x,z),z)});
export function nearest(x:number,z:number,points=road){let d=Infinity,index=0,px=0,pz=0;for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,t=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),nx=a.x+dx*t,nz=a.z+dz*t,dd=(x-nx)**2+(z-nz)**2;if(dd<d){d=dd;index=i;px=nx;pz=nz}}return {distance:Math.sqrt(d),index,x:px,z:pz};}
export function surface(x:number,z:number){return onBridge(x,z)||nearest(x,z).distance<4.3?'asfalto':nearest(x,z,dirt).distance<2.7||Math.hypot(x-LOOKOUT.x,z-LOOKOUT.z)<LOOKOUT.radius?'terra':'grama';}
export function ground(x:number,z:number){return roadBed(x,z)+(surface(x,z)==='grama'?0:.055);}
export const pois=[{name:'Vila do Ipê',x:-310,z:0},{name:'Lago das Garças',x:-110,z:100},{name:'Mirante do Horizonte',x:LOOKOUT.x,z:LOOKOUT.z},{name:'Ponte do Córrego',x:0,z:BRIDGE.z}];
export function terrain(){const g=new T.PlaneGeometry(SIZE,SIZE,SIZE/STEP,SIZE/STEP);g.rotateX(-Math.PI/2);const p=g.attributes.position,colors=[];for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=height(x,z);p.setY(i,h);const c=new T.Color().setHSL(.29+Math.sin(x*.04)*.012,.3,.25+h*.0012);colors.push(c.r,c.g,c.b)}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));}
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
