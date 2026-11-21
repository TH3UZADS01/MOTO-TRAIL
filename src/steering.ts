import * as T from 'three';
import type {VehicleId} from './vehicles';

// Rake measured from vertical in the exported meshes (+Z is forward).
export const rakeDegrees:Record<VehicleId,number>={sahara:28.3,cg150:25.3,cub:26,pop:24,urban:11.5,caloi:11.8};

export function bindSteering(steering:T.Group,id:VehicleId){
 const rake=T.MathUtils.degToRad(rakeDegrees[id]);
 const axis=new T.Vector3(0,Math.cos(rake),-Math.sin(rake));
 const rest=steering.position.clone();
 // The procedural bikes use the ground below the axle as their group origin.
 // Their fork crown is at handlebar height, behind the front axle.
 const crown=id==='urban'||id==='caloi'?new T.Vector3(0,.92,-.13):new T.Vector3();
 const rotated=new T.Vector3();
 return (angle:number)=>{
  steering.quaternion.setFromAxisAngle(axis,angle);
  rotated.copy(crown).applyQuaternion(steering.quaternion);
  steering.position.copy(rest).add(crown).sub(rotated);
 };
}
