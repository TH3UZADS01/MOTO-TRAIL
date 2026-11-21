import {BODY_TUNING} from './body-control';
import * as T from 'three';
import {roadHelmetGeometry} from './road-helmet';
import traveller from './assets/traveller.json';

// Each rigid piece keeps the local origin and proportions of its animation anchor.
function travellerGeometry(name:keyof typeof traveller){
 const part=traveller[name],positions:number[]=[],colors:number[]=[];
 const swatches=part.colors.map(hex=>new T.Color('#'+hex));
 for(const [a,b,c,slot] of part.triangles){
  const tint=swatches[slot];
  for(const i of [a,b,c]){
   positions.push(part.positions[i*3],part.positions[i*3+1],part.positions[i*3+2]);
   colors.push(tint.r,tint.g,tint.b);
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();
 return geometry;
}
// Radians, metres and response per second. Shared by local and remote riders.
export const RIDER_TUNING={bodyScale:.85,intensity:.30,response:7,maxLean:.28,fullEffectSpeed:12,counterweightLean:.39,steerSpeedScale:5.8,hipShift:.22,kneeOpening:.10,upperArmLength:.32,forearmLength:.29,wristOffset:.045,throttleWrist:.85,throttleElbowDrop:.08,throttleElbowBack:.10,wheelieSideShift:.34,wheelieSideLean:.18,wheelieSideResponse:6};
export type RiderRig=ReturnType<typeof createRider>;
export function createRider(steering:T.Group,eyeHeight=1.48,handleY=1.02,_jacketColor=0xc88b48,kneeWidth=.22,seatLift=0){
 const root=new T.Group(),head=new T.Group();root.name='animated-rider';
 // Scale anatomy around the saddle, not the rig: grip and ground targets stay in bike space.
 const size=RIDER_TUNING.bodyScale;
 const mat=(color:number)=>new T.MeshStandardMaterial({color,roughness:.8});
 const skin=mat(0xb97d55),cloth=new T.MeshStandardMaterial({vertexColors:true,roughness:.86});
 const mesh=(parent:T.Object3D,g:T.BufferGeometry,m:T.Material)=>{const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;parent.add(o);return o};
 const ell=(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,a:number,b:number,c:number,piece?:keyof typeof traveller)=>{const o=mesh(parent,piece?travellerGeometry(piece):new T.SphereGeometry(1,12,8),m);const offset=parent===root?1:size;o.position.set(x*offset,y*offset,z*offset);o.scale.set(a*size,b*size,c*size);return o};
 const neck=mesh(root,new T.CylinderGeometry(1,1,1,8),skin);
 const hips=ell(root,cloth,0,.86,-.21,.14,.11,.14,"hips"),torso=ell(root,cloth,0,1.13,-.17,.175,.25,.12,"torso");root.add(head);
 const openHelmet=ell(head,cloth,0,0,0,.133,.156,.133,"helmet");
 const integral=mesh(head,roadHelmetGeometry(),new T.MeshStandardMaterial({vertexColors:true,roughness:.35,metalness:.15}));
 integral.scale.copy(openHelmet.scale);integral.visible=false;
 function setFullFace(enabled:boolean){integral.visible=enabled;openHelmet.visible=!enabled}
 const limbs=[-1,1].map(side=>{const hand=new T.Group();root.add(hand);const glove=ell(hand,cloth,0,0,0,.045,.04,.055,'glove');glove.scale.x*=-side;return {side,upperArm:mesh(root,travellerGeometry("upperArm"),cloth),forearm:mesh(root,travellerGeometry("forearm"),cloth),thigh:mesh(root,travellerGeometry("thigh"),cloth),shin:mesh(root,travellerGeometry("shin"),cloth),hand,foot:ell(root,cloth,side*.21,.29,.02,.055,.04,.09,"boot"),knee:new T.Vector3()}});
 const axis=new T.Vector3(0,1,0),delta=new T.Vector3(),hand=new T.Vector3(),shoulder=new T.Vector3(),elbow=new T.Vector3(),hip=new T.Vector3(),ankle=new T.Vector3(),straightKnee=new T.Vector3();let lean=0,foreAft=0,throttlePose=0,stopPose=0;
 function segment(mesh:T.Mesh,a:T.Vector3,b:T.Vector3,r:number){delta.copy(b).sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(r,delta.length(),r);mesh.quaternion.setFromUnitVectors(axis,delta.normalize())}
 // Human-scale limbs keep the bike from looking miniature; grip and foot anchors stay fixed.
 // Two rigid bones: throttle changes the elbow angle/plane, never the arm lengths.
 const wrist=new T.Vector3(),reach=new T.Vector3(),bend=new T.Vector3();
 const wristTurn=new T.Quaternion(),gripAxis=new T.Vector3(1,0,0);
 function solveArm(side:number,pose:number){
  const upper=RIDER_TUNING.upperArmLength,lower=RIDER_TUNING.forearmLength;
  reach.copy(wrist).sub(shoulder);let distance=reach.length();reach.normalize();
  // At extreme body/steering poses the shoulder follows the reach slightly instead
  // of stretching a bone or pulling the hand off its handlebar.
  const reachable=T.MathUtils.clamp(distance,Math.abs(upper-lower)+.001,upper+lower-.001);
  shoulder.addScaledVector(reach,distance-reachable);distance=reachable;
  bend.set(side*.16,-.24-RIDER_TUNING.throttleElbowDrop*pose,RIDER_TUNING.throttleElbowBack*pose);
  bend.addScaledVector(reach,-bend.dot(reach)).normalize();
  const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
  const height=Math.sqrt(Math.max(0,upper*upper-along*along));
  elbow.copy(shoulder).addScaledVector(reach,along).addScaledVector(bend,height);
 }
 const neckBase=new T.Vector3(),neckTop=new T.Vector3();
 const eye=new T.Vector3();let fallBlend=0,wheelieSide=0;
 function update(speed:number,steer:number,dt:number,firstPerson=false,bodyInput=0,throttle=0,fallen=false,wheelie=0,chassisLean=0){
  const sideTarget=fallen?0:T.MathUtils.smoothstep(wheelie,.08,.65);
  wheelieSide=T.MathUtils.lerp(wheelieSide,sideTarget,1-Math.exp(-RIDER_TUNING.wheelieSideResponse*Math.max(0,dt)));
  fallBlend=T.MathUtils.lerp(fallBlend,fallen?1:0,1-Math.exp(-4*Math.max(0,dt)));
  throttlePose=T.MathUtils.lerp(throttlePose,T.MathUtils.clamp(throttle,0,1),1-Math.exp(-10*Math.max(0,dt)));
  const stopTarget=1-T.MathUtils.smoothstep(Math.abs(speed),.12,.65);stopPose=T.MathUtils.lerp(stopPose,stopTarget,1-Math.exp(-5*Math.max(0,dt)));
  foreAft=T.MathUtils.lerp(foreAft,T.MathUtils.clamp(bodyInput,-1,1),1-Math.exp(-RIDER_TUNING.response*Math.max(0,dt)));
  const motion=T.MathUtils.clamp(Math.abs(speed)/RIDER_TUNING.fullEffectSpeed,0,1);
  const relativeSpeed=Math.abs(speed)/RIDER_TUNING.steerSpeedScale;
  const turnLoad=steer*(1+relativeSpeed)/(1+relativeSpeed*relativeSpeed);
  const inward=T.MathUtils.clamp(-turnLoad*motion*RIDER_TUNING.intensity,-RIDER_TUNING.maxLean,RIDER_TUNING.maxLean);
  const curveTransition=T.MathUtils.smoothstep(speed,25/3.6,30/3.6);
  const grounded=1-T.MathUtils.smoothstep(wheelie,0,BODY_TUNING.airborneThreshold);
  const counterweight=fallen?0:T.MathUtils.smoothstep(speed,.35,1.4)*grounded*(1-curveTransition);
  // The torso inherits the chassis bank. Keep it outboard until the rider tips into the turn.
  const outward=steer*RIDER_TUNING.counterweightLean;
  const balanced=-chassisLean+.08*steer;
  const target=T.MathUtils.lerp(inward,steer>=0?Math.max(outward,balanced):Math.min(outward,balanced),counterweight);
  lean=T.MathUtils.lerp(lean,target,1-Math.exp(-RIDER_TUNING.response*Math.max(0,dt)));
  hips.position.z=-.21-foreAft*.035;hips.position.x=-lean*RIDER_TUNING.hipShift+wheelieSide*.06;hips.rotation.z=lean*.4;torso.position.x=hips.position.x-lean*.35+wheelieSide*.20;torso.rotation.z=lean-wheelieSide*RIDER_TUNING.wheelieSideLean;torso.rotation.x=.10+foreAft*.5;torso.position.z=-.17+foreAft*.12;torso.position.y=.86+(.27-Math.max(0,foreAft)*.06)*size+Math.max(0,eyeHeight-1.48)*.15;
  // Attach head and neck to the oriented torso, including tuck, lean and wheelie poses.
  // The helmet remains upright in wheelies, but its attachment moves with the chest.
  neckBase.set(0,.19*size,0).applyQuaternion(torso.quaternion).add(torso.position);
  head.position.set(0,.35*size,.015*size).applyQuaternion(torso.quaternion).add(torso.position);
  head.rotation.z=torso.rotation.z;head.rotation.x=fallen?0:Math.min(wheelie,Math.PI/2);
  neckTop.set(0,-.12*size,0).applyQuaternion(head.quaternion).add(head.position);
  segment(neck,neckBase,neckTop,.047*size);head.visible=!firstPerson;neck.visible=!firstPerson;
  eye.copy(head.position);eye.y+=seatLift;eye.z+=.10*size;
  for(const l of limbs){const side=l.side,inside=side*steer>0&&lean*steer<0?Math.abs(lean)/RIDER_TUNING.maxLean:0;hip.set(side*.12+hips.position.x,.84,-.2);const leftStop=side===1?stopPose:0;ankle.set(side*(.21+leftStop*.27),.3-leftStop*(.3-(.035+.04*size)),-.05+leftStop*.10);ankle.y-=seatLift*leftStop;l.knee.set(side*(kneeWidth+inside*RIDER_TUNING.kneeOpening+leftStop*.20)+hips.position.x*.4,.60-leftStop*.15,.16*size+leftStop*.05);if(leftStop>0){straightKnee.copy(hip).lerp(ankle,.5);straightKnee.z+=.1;l.knee.lerp(straightKnee,leftStop*.75)}segment(l.thigh,hip,l.knee,.064*size);segment(l.shin,l.knee,ankle,.052*size);l.foot.position.copy(ankle);l.foot.position.y-=.035;
   // Hands are evaluated in the same parent coordinates as the turning handlebar.
   hand.set(side*.31,handleY,-.12).applyQuaternion(steering.quaternion).add(steering.position);hand.y-=seatLift;
   const twist=side===-1?throttlePose:0;
   l.hand.position.copy(hand);
   l.hand.quaternion.copy(steering.quaternion).multiply(wristTurn.setFromAxisAngle(gripAxis,-RIDER_TUNING.throttleWrist*twist));
   if(l.hand.rotation.x===0)l.hand.rotation.x=0;
   // Follow the back of the rotating hand, not its grip centre, keeping the cuff attached.
   wrist.set(0,0,-RIDER_TUNING.wristOffset).applyQuaternion(l.hand.quaternion).add(hand);
   shoulder.set(side*.16*size,.14*size,.05*size).applyQuaternion(torso.quaternion).add(torso.position);
   solveArm(side,twist);
   segment(l.upperArm,shoulder,elbow,.051*size);segment(l.forearm,elbow,wrist,.043*size);
  }
  root.position.set(0,seatLift-.2*fallBlend,-.8*fallBlend);root.rotation.set(-.95*fallBlend,0,.12*fallBlend);
 }
 update(0,0,0);return {root,head,setFullFace,neck,hips,torso,limbs,eye,update,get lean(){return lean},get foreAft(){return foreAft},get stopPose(){return stopPose}};
}
