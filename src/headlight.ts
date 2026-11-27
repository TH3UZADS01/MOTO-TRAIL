import * as T from 'three';

export const HEADLIGHT_TUNING={intensity:70,distance:85,angle:.38,penumbra:.6,decay:1};

export function makeHeadlight(mount:T.Group,lensName:string){
 const lens=mount.getObjectByName(lensName);
 if(!(lens instanceof T.Mesh)||!(lens.material instanceof T.MeshStandardMaterial)||lens.parent!==mount){
  throw new Error(`Missing mounted headlamp lens: ${lensName}`);
 }
 const material=lens.material,unlitOpacity=material.opacity;
 const whiteLed=material.name==='FarolCB';
 material.emissive.setHex(whiteLed?0xf1f7ff:0xffe5ad);
 material.emissiveIntensity=0;

 const t=HEADLIGHT_TUNING;
 const light=new T.SpotLight(0xffedcc,0,t.distance,t.angle,t.penumbra,t.decay);
 lens.geometry.computeBoundingBox();
 lens.updateMatrix();
 const bounds=lens.geometry.boundingBox!.clone().applyMatrix4(lens.matrix);
 bounds.getCenter(light.position);
 light.position.z=bounds.max.z+.008;
 if(whiteLed){
  const glass=mount.getObjectByName('Steering_translucido_incolor') as T.Mesh;
  light.position.z=Math.max(light.position.z,glass.geometry.boundingBox!.max.z+.008);
  light.color.setHex(0xf1f7ff);
 }
 light.target.position.set(0,-.2,28);
 mount.add(light,light.target);

 return {light,lens,update(night:number){
  const level=T.MathUtils.clamp(night,0,1);
  material.emissiveIntensity=2*level;
  if(material.transparent)material.opacity=T.MathUtils.lerp(unlitOpacity,1,level);
  light.intensity=t.intensity*level;
 }};
}
