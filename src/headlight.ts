import * as T from 'three';
export const HEADLIGHT_TUNING={intensity:70,distance:85,angle:.38,penumbra:.6,decay:1};
// No extra shadow maps: one bounded spot per motorcycle (at most four in a room).
export function makeHeadlight(steering:T.Group,eyeHeight:number){
 const t=HEADLIGHT_TUNING,light=new T.SpotLight(0xffedcc,0,t.distance,t.angle,t.penumbra,t.decay),target=new T.Object3D();
 light.position.set(0,eyeHeight-.5,.18);target.position.set(0,-.2,28);light.target=target;light.castShadow=false;steering.add(light,target);
 const lens=new T.Mesh(new T.CircleGeometry(.055,12),new T.MeshBasicMaterial({color:0xffe5ad,toneMapped:false}));lens.position.copy(light.position);lens.userData.noShadow=true;steering.add(lens);
 return {light,lens,update(night:number){const level=T.MathUtils.clamp(night,0,1);light.intensity=t.intensity*level;lens.visible=level>.05}};
}
