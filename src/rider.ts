import * as T from 'three';
// Radians, metres and response per second. Shared by local and remote riders.
export const RIDER_TUNING={intensity:.30,response:7,maxLean:.28,fullEffectSpeed:12,steerReference:.56,steerSpeedScale:5.8,hipShift:.22,kneeOpening:.10};
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
 const limbs=[-1,1].map(side=>({side,upperArm:mesh(root,new T.CylinderGeometry(1,1,1,8),jacket),forearm:mesh(root,new T.CylinderGeometry(1,1,1,8),jacket),thigh:mesh(root,new T.CylinderGeometry(1,1,1,8),pants),shin:mesh(root,new T.CylinderGeometry(1,1,1,8),pants),hand:ell(root,skin,0,0,0,.04,.04,.05),foot:ell(root,black,side*.21,.29,.02,.06,.045,.1),knee:new T.Vector3()}));
 const axis=new T.Vector3(0,1,0),delta=new T.Vector3(),hand=new T.Vector3(),shoulder=new T.Vector3(),elbow=new T.Vector3(),hip=new T.Vector3(),ankle=new T.Vector3();let lean=0;
 function segment(mesh:T.Mesh,a:T.Vector3,b:T.Vector3,r:number){delta.copy(b).sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(r,delta.length(),r);mesh.quaternion.setFromUnitVectors(axis,delta.normalize())}
 const eye=new T.Vector3();
 function update(speed:number,steer:number,dt:number,firstPerson=false){const motion=T.MathUtils.clamp(Math.abs(speed)/RIDER_TUNING.fullEffectSpeed,0,1),angle=steer*RIDER_TUNING.steerReference/(1+(speed/RIDER_TUNING.steerSpeedScale)**2),turnLoad=angle/RIDER_TUNING.steerReference*(1+Math.abs(speed)/RIDER_TUNING.steerSpeedScale),target=T.MathUtils.clamp(-turnLoad*motion*RIDER_TUNING.intensity,-RIDER_TUNING.maxLean,RIDER_TUNING.maxLean);lean=T.MathUtils.lerp(lean,target,1-Math.exp(-RIDER_TUNING.response*Math.max(0,dt)));
  hips.position.x=-lean*RIDER_TUNING.hipShift;hips.rotation.z=lean*.4;torso.position.x=hips.position.x-lean*.35;torso.rotation.z=lean;torso.rotation.x=.10;
  head.position.set(hips.position.x-lean*.70,eyeHeight+.025,-.1);head.rotation.z=lean*.8;segment(neck,new T.Vector3(torso.position.x,1.32,-.12),new T.Vector3(head.position.x,eyeHeight-.08,-.1),.055);head.visible=!firstPerson;neck.visible=!firstPerson;eye.copy(head.position);eye.z+=.10;
  for(const l of limbs){const side=l.side,inside=side*steer>0?Math.abs(lean)/RIDER_TUNING.maxLean:0;hip.set(side*.12+hips.position.x,.84,-.2);l.knee.set(side*(kneeWidth+inside*RIDER_TUNING.kneeOpening)+hips.position.x*.4,.60,.22);ankle.set(side*.21,.3,-.05);segment(l.thigh,hip,l.knee,.075);segment(l.shin,l.knee,ankle,.06);
   // Hands are evaluated in the same parent coordinates as the turning handlebar.
   hand.set(side*.31,handleY,-.12).applyQuaternion(steering.quaternion).add(steering.position);shoulder.set(side*.16+torso.position.x,1.27,-.12);elbow.copy(shoulder).lerp(hand,.52);elbow.x+=side*.045;elbow.y-=.055;segment(l.upperArm,shoulder,elbow,.06);segment(l.forearm,elbow,hand,.05);l.hand.position.copy(hand);
  }
 }
 update(0,0,0);return {root,head,hips,torso,limbs,eye,update,get lean(){return lean}};
}
