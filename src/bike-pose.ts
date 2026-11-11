import * as T from 'three';
import {BODY_TUNING,clamp} from './body-control';
// Rotate around the rear axle, not the centre: the rear tyre stays on its original contact.
const terrainQ=new T.Quaternion(),liftQ=new T.Quaternion(),pivot=new T.Vector3(),offset=new T.Vector3(),xAxis=new T.Vector3(1,0,0),euler=new T.Euler();
export function applyBikePose(bike:{body:T.Group;wheels:T.Group[]},pitch:number,lean:number,wheelie:number,stopPose=0){
 const angle=clamp(wheelie,0,BODY_TUNING.maxWheelie);terrainQ.setFromEuler(euler.set(-pitch,0,lean-clamp(stopPose,0,1)*.08));liftQ.setFromAxisAngle(xAxis,-angle);
 pivot.copy(bike.wheels[0].position);offset.copy(pivot).applyQuaternion(liftQ).negate().add(pivot).applyQuaternion(terrainQ);
 bike.body.position.copy(offset);bike.body.quaternion.copy(terrainQ).multiply(liftQ);
}
