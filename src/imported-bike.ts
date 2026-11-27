import * as T from 'three';
import {createRider} from './rider';
import twister from './assets/twister-model.json';
import gs from './assets/r1200gs-model.json';

// The packed Twister has a 748 mm saddle and vertically compressed chassis.
const twisterSeatLift=.041;
function buffer(encoded:string){
 const raw=atob(encoded),bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return bytes.buffer;
}
export function createImportedBike(id:'twister'|'r1200gs'){
 const model=id==='twister'?twister:gs,root=new T.Group();
 root.name=id+'-Blender';
 const textures=new Map<string,T.Texture>();
 const materials=new Map(Object.entries(model.materials).map(([name,p])=>{
  const material=new T.MeshStandardMaterial({color:new T.Color().fromArray(p.color),roughness:p.roughness,metalness:p.metalness,side:T.DoubleSide});
  material.name=name;
  if(id==='r1200gs'&&name==='object_6')material.color.setHex(0xd5d5cb);
  if(id==='r1200gs'&&name==='object_10'){
   material.transparent=true;material.opacity=.20;material.depthWrite=false;
   material.color.setHex(0x8ca8ac);material.metalness=0;material.roughness=.2;
  }
  const url=(model.textures as Record<string,string>)[name];
  if(url&&typeof document!=='undefined'){
   let texture=textures.get(url);
   if(!texture){texture=new T.TextureLoader().load(url);texture.colorSpace=T.SRGBColorSpace;texture.flipY=true;texture.wrapS=texture.wrapT=T.RepeatWrapping;textures.set(url,texture)}
   material.map=texture;
  }
  return [name,material] as const;
 }));
 const groups=new Map(model.parts.map(p=>{const g=new T.Group();g.name=p.name;g.position.fromArray(p.position);return [p.name,g]}));
 for(const p of model.parts){
  const group=groups.get(p.name)!;(p.parent?groups.get(p.parent)!:root).add(group);
  for(const m of p.meshes){
   const geometry=new T.BufferGeometry();
   geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer(m.positions)),3));
   geometry.setAttribute('normal',new T.BufferAttribute(new Int16Array(buffer(m.normals)),3,true));
   geometry.setAttribute('uv',new T.BufferAttribute(new Float32Array(buffer(m.uvs)),2));
   geometry.setIndex(new T.BufferAttribute(new Uint32Array(buffer(m.indices)),1));
   geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const mesh=new T.Mesh(geometry,materials.get(m.material));mesh.name=p.name+'_'+m.material;
   if(id==='r1200gs'&&p.name==='Body'&&m.material==='object_0'){
    // Isolate the recessed optical faces from the shared black housing material.
    const positions=geometry.getAttribute('position'),indices=geometry.index!;
    const front:number[]=[],rear:number[]=[],other:number[]=[];
    for(let i=0;i<indices.count;i+=3){
     const triangle=[indices.getX(i),indices.getX(i+1),indices.getX(i+2)];
     const center=new T.Vector3();
     for(const j of triangle)center.add(new T.Vector3().fromBufferAttribute(positions,j));
     center.multiplyScalar(1/3);
     const normals=geometry.getAttribute('normal');
     const facing=triangle.reduce((sum,j)=>sum+normals.getZ(j),0)/3;
     const left=((center.x+.065)/.054)**2+((center.y-1.012)/.055)**2<1;
     const right=((center.x-.065)/.048)**2+((center.y-1.005)/.032)**2<1;
     const headlamp=(left||right)&&center.z>.64&&center.z<.705&&facing>.35;
     const tailLamp=Math.abs(center.x)<.085&&center.y>.96&&center.y<1.01&&center.z<-1.035&&facing<-.35;
     (headlamp?front:tailLamp?rear:other).push(...triangle);
    }
    for(const [name,faces,color] of [['Body_Headlamp',front,0xd5dfe2],['Body_TailLens',rear,0x9b1010]] as const){
     const selected=geometry.clone();selected.setIndex([...faces]);
     const lensGeometry=selected.toNonIndexed();selected.dispose();lensGeometry.computeBoundingBox();
     const lens=new T.Mesh(lensGeometry,new T.MeshStandardMaterial({color,roughness:.3}));
     lens.name=name;group.add(lens);
    }
    geometry.setIndex(other);
   }

   if(id==='twister'&&m.material==='FarolCB')mesh.name='Steering_Headlamp';
   if(p.name==='Body'&&((id==='twister'&&m.material==='LanternaCB')))mesh.name='Body_TailLens';mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  }
 }
 const body=groups.get('Body')!,steering=groups.get('Steering')!;
 const wheels=[groups.get('RearWheel')!,groups.get('FrontWheel')!];
 if(id==='twister'){
  // Match each hub to its tyre radius. Blend the fork and swingarm ends
  // into the raised chassis, keeping wheel geometry and wheelbase intact.
  root.updateMatrixWorld(true);
  const hubs=wheels.map(w=>w.getWorldPosition(new T.Vector3()));
  const drops=wheels.map((w,i)=>{
   const tyre=w.children.find(m=>m.name.endsWith('_pneu_borracha')) as T.Mesh;
   return hubs[i].y+tyre.geometry.boundingBox!.min.y;
  });
  body.traverse(part=>{
   if(!(part instanceof T.Mesh)||wheels.includes(part.parent as T.Group))return;
   const positions=part.geometry.getAttribute('position');
   const origin=part.getWorldPosition(new T.Vector3());
   for(let i=0;i<positions.count;i++){
    const y=origin.y+positions.getY(i),z=origin.z+positions.getZ(i);
    const axle=z>0?1:0,hub=hubs[axle];
    const nearHub=1-T.MathUtils.smoothstep(Math.hypot(y-hub.y,z-hub.z),.18,.39);
    const shift=twisterSeatLift-nearHub*(twisterSeatLift+drops[axle]);
    positions.setY(i,positions.getY(i)+shift-(part.parent===body?0:twisterSeatLift));
   }
   part.geometry.computeBoundingBox();part.geometry.computeBoundingSphere();
  });
  steering.position.y+=twisterSeatLift;
  wheels[0].position.y-=drops[0];
  wheels[1].position.y-=drops[1]+twisterSeatLift;
  // The packed material lost the GLB's transmission. Only the front cover
  // needs to reveal FarolCB behind it.
  const cover=steering.getObjectByName('Steering_translucido_incolor') as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;
  cover.material=cover.material.clone();
  Object.assign(cover.material,{transparent:true,opacity:.16,metalness:0,depthWrite:false});
 }
 const riderRig=createRider(steering,id==='twister'?1.48:1.6,id==='twister'?-.085:.14,0x526b72,.25,id==='twister'?twisterSeatLift:.14,id==='twister'?-.15:-.10,id==='twister'?.36:.365);
 const rider=riderRig.root;body.add(rider);
 const lamp=body.getObjectByName('Steering_Headlamp');
 if(lamp&&lamp.parent!==steering){root.updateMatrixWorld(true);steering.attach(lamp)}
 const paint=materials.get(id==='twister'?'cor_moto.002_Vermelha':'object_8');
 return {root,body,steering,wheels,rider,riderRig,paintMaterials:paint?[paint]:[]};
}

