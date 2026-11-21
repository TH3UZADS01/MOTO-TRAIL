import * as T from 'three';
import {BODY_TUNING,clamp} from './body-control';
// Rotate around the rear axle, not the centre: the rear tyre stays on its original contact.
const terrainQ=new T.Quaternion(),liftQ=new T.Quaternion(),pivot=new T.Vector3(),offset=new T.Vector3(),xAxis=new T.Vector3(1,0,0),euler=new T.Euler();
export function applyBikePose(bike:{body:T.Group;wheels:T.Group[];setSuspension?:(front:number,rear:number)=>void},pitch:number,lean:number,wheelie:number,stopPose=0,front=0,rear=0,wheelbase=1,fallen=false){
 bike.setSuspension?.(front,rear);
 pitch+=Math.atan2(rear-front,wheelbase);
 if(fallen&&wheelie<BODY_TUNING.loopOutAngle)lean*=1.7;
 const angle=Math.max(0,wheelie);terrainQ.setFromEuler(euler.set(-pitch,0,lean-clamp(stopPose,0,1)*.08));liftQ.setFromAxisAngle(xAxis,-angle);
 pivot.copy(bike.wheels[0].position);offset.copy(pivot).applyQuaternion(liftQ).negate().add(pivot).applyQuaternion(terrainQ);
 offset.y-=(front+rear)*.5;
 bike.body.position.copy(offset);bike.body.quaternion.copy(terrainQ).multiply(liftQ);
}
