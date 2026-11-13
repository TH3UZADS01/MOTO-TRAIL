import * as T from 'three';
// Radians, metres and response per second. Shared by local and remote riders.
export const RIDER_TUNING={intensity:.30,response:7,maxLean:.28,fullEffectSpeed:12,steerReference:.56,steerSpeedScale:5.8,hipShift:.22,kneeOpening:.10,throttleWrist:.85,throttleElbowDrop:.08,throttleElbowBack:.10,wheelieSideShift:.34,wheelieSideLean:.18,wheelieSideResponse:6};
export type RiderRig=ReturnType<typeof createRider>;
export function createRider(steering:T.Group,eyeHeight=1.48,handleY=1.02,jacketColor=0xc88b48,kneeWidth=.22){
 const root=new T.Group(),head=new T.Group();root.name='animated-rider';
 const mat=(color:number)=>new T.MeshStandardMaterial({color,roughness:.8});
 const jacket=mat(jacketColor),pants=mat(0x33454e),skin=mat(0xbd9874),black=mat(0x20272b),helmet=mat(0xe9dfbf);
 const mesh=(parent:T.Object3D,g:T.BufferGeometry,m:T.Material)=>{const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;parent.add(o);return o};
 const ell=(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,a:number,b:number,c:number)=>{const o=mesh(parent,new T.SphereGeometry(1,12,8),m);o.position.set(x,y,z);o.scale.set(a,b,c);return o};
 const neck=mesh(root,new T.CylinderGeometry(1,1,1,8),skin);
 const hips=ell(root,pants,0,.86,-.21,.15,.12,.15),torso=ell(root,jacket,0,1.13,-.17,.19,.27,.13);root.add(head);
 ell(head,helmet,0,0,0,.145,.17,.145);ell(head,black,0,.01,.13,.12,.075,.025);
 const limbs=[-1,1].map(side=>{const hand=new T.Group();root.add(hand);ell(hand,skin,0,0,0,.045,.04,.055);for(let i=0;i<3;i++)ell(hand,skin,(i-1)*.025,-.018,.036,.018,.018,.026);ell(hand,skin,.035,0,-.015,.026,.02,.032);return {side,upperArm:mesh(root,new T.CylinderGeometry(1,1,1,8),jacket),forearm:mesh(root,new T.CylinderGeometry(1,1,1,8),jacket),thigh:mesh(root,new T.CylinderGeometry(1,1,1,8),pants),shin:mesh(root,new T.CylinderGeometry(1,1,1,8),pants),hand,foot:ell(root,black,side*.21,.29,.02,.06,.045,.1),knee:new T.Vector3()}});
 const axis=new T.Vector3(0,1,0),delta=new T.Vector3(),hand=new T.Vector3(),shoulder=new T.Vector3(),elbow=new T.Vector3(),hip=new T.Vector3(),ankle=new T.Vector3(),straightKnee=new T.Vector3();let lean=0,foreAft=0,throttlePose=0,stopPose=0;
 function segment(mesh:T.Mesh,a:T.Vector3,b:T.Vector3,r:number){delta.copy(b).sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(r,delta.length(),r);mesh.quaternion.setFromUnitVectors(axis,delta.normalize())}
 const eye=new T.Vector3();let fallBlend=0,wheelieSide=0;
 function update(speed:number,steer:number,dt:number,firstPerson=false,bodyInput=0,throttle=0,fallen=false,wheelie=0){
  const sideTarget=fallen?0:T.MathUtils.smoothstep(wheelie,.08,.65);
  wheelieSide=T.MathUtils.lerp(wheelieSide,sideTarget,1-Math.exp(-RIDER_TUNING.wheelieSideResponse*Math.max(0,dt)));
  fallBlend=T.MathUtils.lerp(fallBlend,fallen?1:0,1-Math.exp(-4*Math.max(0,dt)));
  throttlePose=T.MathUtils.lerp(throttlePose,T.MathUtils.clamp(throttle,0,1),1-Math.exp(-10*Math.max(0,dt)));
  const stopTarget=1-T.MathUtils.smoothstep(Math.abs(speed),.12,.65);stopPose=T.MathUtils.lerp(stopPose,stopTarget,1-Math.exp(-5*Math.max(0,dt)));
  foreAft=T.MathUtils.lerp(foreAft,T.MathUtils.clamp(bodyInput,-1,1),1-Math.exp(-RIDER_TUNING.response*Math.max(0,dt)));const motion=T.MathUtils.clamp(Math.abs(speed)/RIDER_TUNING.fullEffectSpeed,0,1),angle=steer*RIDER_TUNING.steerReference/(1+(speed/RIDER_TUNING.steerSpeedScale)**2),turnLoad=angle/RIDER_TUNING.steerReference*(1+Math.abs(speed)/RIDER_TUNING.steerSpeedScale),target=T.MathUtils.clamp(-turnLoad*motion*RIDER_TUNING.intensity,-RIDER_TUNING.maxLean,RIDER_TUNING.maxLean);lean=T.MathUtils.lerp(lean,target,1-Math.exp(-RIDER_TUNING.response*Math.max(0,dt)));
  hips.position.z=-.21-foreAft*.035;hips.position.x=-lean*RIDER_TUNING.hipShift+wheelieSide*.06;hips.rotation.z=lean*.4;torso.position.x=hips.position.x-lean*.35+wheelieSide*.12;torso.rotation.z=lean-wheelieSide*RIDER_TUNING.wheelieSideLean;torso.rotation.x=.10+foreAft*.5;torso.position.z=-.17+foreAft*.12;torso.position.y=1.13-Math.max(0,foreAft)*.06;
  head.position.set(hips.position.x-lean*.70+wheelieSide*(RIDER_TUNING.wheelieSideShift-.06),Math.min(eyeHeight+.025-Math.max(0,foreAft)*.18,1.565),-.1+foreAft*.29);head.rotation.z=lean*.8-wheelieSide*RIDER_TUNING.wheelieSideLean;head.rotation.x=fallen?0:Math.min(wheelie,Math.PI/2);const neckBaseY=Math.max(1.32-Math.max(0,foreAft)*.10,head.position.y-.185);segment(neck,new T.Vector3(torso.position.x,neckBaseY,-.12+foreAft*.20),new T.Vector3(head.position.x,head.position.y-.105,head.position.z),.055);head.visible=!firstPerson;neck.visible=!firstPerson;eye.copy(head.position);eye.z+=.10;
  for(const l of limbs){const side=l.side,inside=side*steer>0?Math.abs(lean)/RIDER_TUNING.maxLean:0;hip.set(side*.12+hips.position.x,.84,-.2);const leftStop=side===1?stopPose:0;ankle.set(side*(.21+leftStop*.27),.3-leftStop*.25,-.05+leftStop*.10);l.knee.set(side*(kneeWidth+inside*RIDER_TUNING.kneeOpening+leftStop*.20)+hips.position.x*.4,.60-leftStop*.15,.22+leftStop*.05);if(leftStop>0){straightKnee.copy(hip).lerp(ankle,.5);straightKnee.z+=.1;l.knee.lerp(straightKnee,leftStop*.75)}segment(l.thigh,hip,l.knee,.075);segment(l.shin,l.knee,ankle,.06);l.foot.position.copy(ankle);l.foot.position.y-=.035;
   // Hands are evaluated in the same parent coordinates as the turning handlebar.
   hand.set(side*.31,handleY,-.12).applyQuaternion(steering.quaternion).add(steering.position);shoulder.set(side*.16+torso.position.x,1.27-Math.max(0,foreAft)*.10,-.12+foreAft*.20);elbow.copy(shoulder).lerp(hand,.52);elbow.x+=side*.045;elbow.y-=.055;if(side===-1){elbow.y-=RIDER_TUNING.throttleElbowDrop*throttlePose;elbow.z+=RIDER_TUNING.throttleElbowBack*throttlePose;}segment(l.upperArm,shoulder,elbow,.06);segment(l.forearm,elbow,hand,.05);l.hand.position.copy(hand);l.hand.rotation.x=side===-1?-RIDER_TUNING.throttleWrist*throttlePose:0;
  }
  root.position.set(0,-.2*fallBlend,-.8*fallBlend);root.rotation.set(-.95*fallBlend,0,.12*fallBlend);
 }
 update(0,0,0);return {root,head,neck,hips,torso,limbs,eye,update,get lean(){return lean},get foreAft(){return foreAft},get stopPose(){return stopPose}};
}
