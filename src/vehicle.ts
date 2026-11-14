import {createRider} from './rider';
import * as T from 'three';
import model from './assets/pop110-model.json';

export const vehicleSpec={id:'pop-blender-reference',wheelbase:1.238,seatHeight:.747,maxSpeed:100/3.6,gears:4};

// Exact meshes and pivots exported by tools/build_pop_blender.py.
// Own resources per instance: online bike swaps cannot dispose another rider's model.
export function createPop(){
 const root=new T.Group();root.name='Pop110-Blender';
 const materials=new Map(Object.entries(model.materials).map(([name,properties])=>{
  const material=new T.MeshStandardMaterial({...properties,side:T.DoubleSide});material.name=name;
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
  }
 }
 const body=parts.get('Body')!,steering=parts.get('Steering')!;
 const wheels=[parts.get('RearWheel')!,parts.get('FrontWheel')!];
 const riderRig=createRider(steering,1.48,1),rider=riderRig.root;body.add(rider);
 return {root,body,steering,wheels,rider,riderRig,paintMaterials:[materials.get('Paint')!]};
}
