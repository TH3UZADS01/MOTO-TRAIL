import {createRider} from './rider';
import * as T from 'three';
import model from './assets/sahara-model.json';


// Exact meshes and pivots exported by tools/export_sahara_edf.py.
// Own resources per instance: online bike swaps cannot dispose another rider's model.
export function createSahara(){
 const root=new T.Group();root.name='Sahara-Blender';
 const materials=new Map(Object.entries(model.materials).map(([name,properties])=>{
  const material=new T.MeshStandardMaterial({...properties,side:T.DoubleSide});material.name=name;
  // Tinted screen stays readable from the rider's eye instead of hiding the road.
  if(name==='Windshield'){material.transparent=true;material.opacity=.30;material.depthWrite=false;material.roughness=.6}
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
   geometry.setIndex(mesh.indices);
   geometry.computeBoundingSphere();geometry.computeBoundingBox();
   const object=new T.Mesh(geometry,materials.get(mesh.material)!);object.name=`${part.name}_${mesh.material}`;
   object.castShadow=object.receiveShadow=true;group.add(object);
   if(mesh.material==='Windshield'){object.castShadow=false;object.receiveShadow=false}
  }
 }
 const body=parts.get('Body')!,steering=parts.get('Steering')!;
 const wheels=[parts.get('RearWheel')!,parts.get('FrontWheel')!];
 const riderRig=createRider(steering,1.60,.24,0x526b72,.31,.075),rider=riderRig.root;body.add(rider);
 return {root,body,steering,wheels,rider,riderRig,paintMaterials:[materials.get('Paint')!]};
}
