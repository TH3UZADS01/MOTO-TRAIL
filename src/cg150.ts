import {createRider} from './rider';
import * as T from 'three';
import model from './assets/cg150-model.json';


// Decode only when a CG is constructed. The export stores little-endian typed buffers.
const nativeBase64=(Uint8Array as typeof Uint8Array & {
 fromBase64?:(encoded:string)=>Uint8Array<ArrayBuffer>
}).fromBase64;
function bytes(encoded:string){
 if(nativeBase64)return nativeBase64(encoded).buffer;
 const raw=atob(encoded), result=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)result[i]=raw.charCodeAt(i);
 return result.buffer;
}

// Titan mesh decoded from the supplied EDF, optimized by tools/export_titan_game.py.
// Own resources per instance: online bike swaps cannot dispose another rider's model.
export function createCG150(){
 const root=new T.Group();root.name='CG150-Blender';
 const textures=new Map<string,T.Texture>();
 const materials=new Map(Object.entries(model.materials).map(([name,properties])=>{
  const material=new T.MeshStandardMaterial({...properties,side:T.DoubleSide});material.name=name;
  const texture=(model.textures as Record<string,string>)[name];
  if(texture&&typeof document!=='undefined'){
   let map=textures.get(texture);
   if(!map){
    map=new T.TextureLoader().load(texture);map.colorSpace=T.SRGBColorSpace;
    map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;textures.set(texture,map);
   }
   material.map=map;
  }
  return [name,material] as const;
 }));
 const parts=new Map<string,T.Group>();
 for(const part of model.parts){const group=new T.Group();group.name=part.name;group.position.fromArray(part.position);parts.set(part.name,group)}
 for(const part of model.parts){
  const group=parts.get(part.name)!;(part.parent?parts.get(part.parent)!:root).add(group);
  for(const mesh of part.meshes){
   const geometry=new T.BufferGeometry();
   const packed=new Int16Array(bytes(mesh.positions)),positions=new Float32Array(packed.length);
   for(let i=0;i<packed.length;i++)positions[i]=packed[i]/16384;
   geometry.setAttribute('position',new T.BufferAttribute(positions,3));
   geometry.setAttribute('normal',new T.BufferAttribute(new Int16Array(bytes(mesh.normals)),3,true));
   if(mesh.uvs)geometry.setAttribute('uv',new T.BufferAttribute(new Float32Array(bytes(mesh.uvs)),2));
   geometry.setIndex(new T.BufferAttribute(new Uint16Array(bytes(mesh.indices)),1));
   geometry.boundingBox=new T.Box3(new T.Vector3().fromArray(mesh.bounds),new T.Vector3().fromArray(mesh.bounds,3));
   geometry.boundingSphere=geometry.boundingBox.getBoundingSphere(new T.Sphere());
   const object=new T.Mesh(geometry,materials.get(mesh.material)!);object.name=`${part.name}_${mesh.material}`;
   object.castShadow=object.receiveShadow=true;group.add(object);
  }
 }
 const body=parts.get('Body')!,steering=parts.get('Steering')!;
 const wheels=[parts.get('RearWheel')!,parts.get('FrontWheel')!];
 const riderRig=createRider(steering,1.48,.24,0x526b72,.25),rider=riderRig.root;body.add(rider);
 return {root,body,steering,wheels,rider,riderRig,paintMaterials:[materials.get('Paint')!]};
}
