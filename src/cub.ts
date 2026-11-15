import {createRider} from './rider';
import * as T from 'three';
import model from './assets/cub-model.json';


// Supplied Super Cub, simplified and rigged by tools/export_super_cub.py.
// Own resources per instance: online bike swaps cannot dispose another rider's model.
export function createCub(){
 const root=new T.Group();root.name='Cub-Blender';
 const materials=new Map(Object.entries(model.materials).map(([name,properties])=>{
  const material=new T.MeshStandardMaterial({...properties,side:T.DoubleSide});material.name=name;
  const texture=(model.textures as Record<string,string>)[name];
  if(texture&&typeof document!=='undefined'){
   material.map=new T.TextureLoader().load(texture);material.map.colorSpace=T.SRGBColorSpace;
   material.map.wrapS=material.map.wrapT=T.RepeatWrapping;material.map.anisotropy=4;
  }
  return [name,material] as const;
 }));
 const parts=new Map<string,T.Group>();
 for(const part of model.parts){const group=new T.Group();group.name=part.name;group.position.fromArray(part.position);parts.set(part.name,group)}
 for(const part of model.parts){
  const group=parts.get(part.name)!;(part.parent?parts.get(part.parent)!:root).add(group);
  for(const mesh of part.meshes){
   const geometry=new T.BufferGeometry();
   geometry.setAttribute('position',new T.Float32BufferAttribute(mesh.positions,3));
   geometry.setAttribute('normal',new T.Float32BufferAttribute(mesh.normals,3));
   geometry.setAttribute('uv',new T.Float32BufferAttribute(mesh.uvs,2));
   geometry.setIndex(mesh.indices);
   geometry.computeBoundingSphere();geometry.computeBoundingBox();
   const object=new T.Mesh(geometry,materials.get(mesh.material)!);object.name=`${part.name}_${mesh.material}`;
   object.castShadow=object.receiveShadow=true;group.add(object);
  }
 }
 const body=parts.get('Body')!,steering=parts.get('Steering')!;
 const wheels=[parts.get('RearWheel')!,parts.get('FrontWheel')!];
 const riderRig=createRider(steering,1.46,.15,0x49705a),rider=riderRig.root;body.add(rider);
 return {root,body,steering,wheels,rider,riderRig,paintMaterials:[materials.get('Paint')!]};
}
