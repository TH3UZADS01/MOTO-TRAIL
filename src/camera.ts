import * as T from 'three';
import {height} from './terrain';
import type {Ride} from './riding';
// FOV in degrees; distances in metres. Set shakeIntensity=0 to disable shaking.
export const CAMERA_TUNING={minLookPitch:-1.05,maxLookPitch:.65,baseFov:70,maxFov:95,fovResponse:4,brakeFov:5,brakePitch:.10,brakeAdvance:.075,brakeResponse:8,eyeOffsetZ:.06,lookDown:.23,roll:.25,shakeIntensity:.045,shakeDuration:.28,impactReference:22,impactMinimum:1.5,recoil:.12};
export class FollowCamera {
 camera=new T.PerspectiveCamera(52,typeof innerWidth==='number'?innerWidth/innerHeight:16/9,.04,900);look=new T.Vector3();target=new T.Vector3();initialized=false;orbit=0;pitch=0;firstPerson=false;
 private braking=0;private shake=0;private shakeLeft=0;private time=0;
 toggle(){this.firstPerson=!this.firstPerson;this.initialized=false;this.orbit=0;this.pitch=0;this.camera.fov=this.firstPerson?CAMERA_TUNING.baseFov:52;this.camera.updateProjectionMatrix()}
 update(r:Ride,dt:number,eyeHeight=1.48,body?:T.Object3D,eye?:T.Vector3){dt=Math.max(0,Math.min(dt,.1));this.time+=dt;const c=CAMERA_TUNING,a=r.heading+this.orbit,impact=r.takeImpact();if(impact>c.impactMinimum){this.shake=Math.min(1,impact/c.impactReference);this.shakeLeft=c.shakeDuration}
  const braking=r.brakeInput*T.MathUtils.clamp(Math.abs(r.speed)/8,0,1);this.braking=T.MathUtils.lerp(this.braking,braking,1-Math.exp(-dt*c.brakeResponse));this.shakeLeft=Math.max(0,this.shakeLeft-dt);const envelope=this.shakeLeft/Math.max(.001,c.shakeDuration),shock=this.shake*envelope*envelope;
  if(this.firstPerson){const targetFov=T.MathUtils.lerp(c.baseFov,c.maxFov,T.MathUtils.clamp(Math.abs(r.speed)/r.spec.maxSpeed,0,1))-c.brakeFov*this.braking;this.camera.fov=T.MathUtils.lerp(this.camera.fov,targetFov,1-Math.exp(-dt*c.fovResponse));this.camera.updateProjectionMatrix();
   if(body&&eye){body.updateWorldMatrix(true,false);this.target.copy(eye);this.target.z+=c.eyeOffsetZ;body.localToWorld(this.target)}else this.target.set(r.x,r.y+eyeHeight,r.z);
   const advance=this.braking*c.brakeAdvance-shock*c.recoil;this.target.x+=Math.sin(r.heading)*advance;this.target.z+=Math.cos(r.heading)*advance;this.target.y-=this.braking*.025;
   this.camera.position.copy(this.target);this.camera.position.x+=Math.cos(this.time*93)*shock*c.shakeIntensity;this.camera.position.y+=Math.sin(this.time*117)*shock*c.shakeIntensity;
   const pitch=r.pitch+this.pitch-c.lookDown-this.braking*c.brakePitch+shock*.04;this.look.set(this.target.x+Math.sin(a)*Math.cos(pitch)*10,this.target.y+Math.sin(pitch)*10,this.target.z+Math.cos(a)*Math.cos(pitch)*10);this.camera.lookAt(this.look);this.camera.rotateZ(-r.lean*c.roll);this.initialized=true;return;
  }
  this.target.set(r.x-Math.sin(a)*6,r.y+3.1+this.pitch*3,r.z-Math.cos(a)*6);this.target.y=Math.max(this.target.y,height(this.target.x,this.target.z)+1);if(!this.initialized)this.camera.position.copy(this.target);this.initialized=true;this.camera.position.lerp(this.target,1-Math.exp(-dt*5));this.look.set(r.x,r.y+1.1,r.z);this.camera.lookAt(this.look);
 }
}
