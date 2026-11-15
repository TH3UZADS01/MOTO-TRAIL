import {createRider} from './rider';
import * as T from 'three';
import model from './assets/pop110-model.json';

export const vehicleSpec={id:'pop-blender-reference',wheelbase:1.238,seatHeight:.747,maxSpeed:100/3.6,gears:4};

// User-supplied geometry, textured/exported by tools/texture_pop_source.py.
// Own resources per instance: online bike swaps cannot dispose another rider's model.
export function createPop(){
 const root=new T.Group();root.name='Pop110-Blender';
 const materials=new Map(Object.entries(model.materials).map(([name,properties])=>{
  const material=new T.MeshStandardMaterial({...properties,side:T.DoubleSide});material.name=name;
  const maps=model.textures[name as keyof typeof model.textures];
  material.userData.textureFiles=maps;
  // Unit tests construct rigs without a DOM; browser instances own their textures.
  if(maps&&typeof document!=='undefined'){
   const loader=new T.TextureLoader();
   material.map=loader.load(maps.map);material.map.colorSpace=T.SRGBColorSpace;
   material.roughnessMap=loader.load(maps.roughnessMap);material.roughness=1;
   for(const texture of [material.map,material.roughnessMap]){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4}
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
 // Imported steering pivot is at the steering head, above the ground plane.
 const riderRig=createRider(steering,1.48,.24),rider=riderRig.root;body.add(rider);
 return {root,body,steering,wheels,rider,riderRig,paintMaterials:[materials.get('Paint')!]};
}
