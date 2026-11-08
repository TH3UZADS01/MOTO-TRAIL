import * as T from 'three';
import {height} from './terrain';
import type {Ride} from './riding';
export class FollowCamera {
  camera=new T.PerspectiveCamera(52,innerWidth/innerHeight,.06,900);look=new T.Vector3();target=new T.Vector3();initialized=false;orbit=0;pitch=0;firstPerson=false;
  toggle(){this.firstPerson=!this.firstPerson;this.initialized=false;this.orbit=0;this.pitch=0;this.camera.fov=this.firstPerson?72:52;this.camera.updateProjectionMatrix()}
  update(r:Ride,dt:number,eyeHeight=1.48){const a=r.heading+this.orbit;
    if(this.firstPerson){this.target.set(r.x+Math.sin(r.heading)*-.13,r.y+eyeHeight,r.z+Math.cos(r.heading)*-.13);this.camera.position.copy(this.target);const pitch=r.pitch+this.pitch-.18;this.look.set(this.target.x+Math.sin(a)*Math.cos(pitch)*10,this.target.y+Math.sin(pitch)*10,this.target.z+Math.cos(a)*Math.cos(pitch)*10);this.camera.lookAt(this.look);this.initialized=true;return;}
    this.target.set(r.x-Math.sin(a)*6,r.y+3.1+this.pitch*3,r.z-Math.cos(a)*6);this.target.y=Math.max(this.target.y,height(this.target.x,this.target.z)+1);if(!this.initialized){this.camera.position.copy(this.target);this.initialized=true}this.camera.position.lerp(this.target,1-Math.exp(-dt*5));this.look.set(r.x,r.y+1.1,r.z);this.camera.lookAt(this.look);
  }
}

