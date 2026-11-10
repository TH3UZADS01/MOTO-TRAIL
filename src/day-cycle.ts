import * as T from 'three';
export const DAY_TUNING={cycleSeconds:24*60,startHour:17,sunIntensity:2.5,moonIntensity:.35,nightAmbient:.34,dayAmbient:.85};
export function sampleDay(timeMs:number){const period=DAY_TUNING.cycleSeconds*1000,hour=(((timeMs%period)/period*24+DAY_TUNING.startHour)%24+24)%24,angle=(hour-6)/24*Math.PI*2,elevation=Math.sin(angle),daylight=T.MathUtils.smoothstep(elevation,-.12,.22),night=1-T.MathUtils.smoothstep(elevation,-.08,.12);return {hour,angle,elevation,daylight,night}}
const colors={dayFog:new T.Color(0xd2ded3),seaFog:new T.Color(0xd4e6e8),nightFog:new T.Color(0x111e32),dusk:new T.Color(0xc5987f),daySky:new T.Color(0x87b3c7),nightSky:new T.Color(0x071327),sun:new T.Color(0xffe0b5),duskSun:new T.Color(0xffa367),moon:new T.Color(0x91b6ed)};
export class DayCycle {
 private sunDisk:T.Mesh;private moonDisk:T.Mesh;private stars:T.Points;private direction=new T.Vector3();private horizon=new T.Color();private zenith=new T.Color();
 state=sampleDay(0);private lastSky=-Infinity;
 constructor(private scene:T.Scene,private key:T.DirectionalLight,private ambient:T.HemisphereLight,private sky:T.Mesh){
  const disk=(color:number,r:number)=>{const m=new T.Mesh(new T.SphereGeometry(r,12,8),new T.MeshBasicMaterial({color,fog:false,toneMapped:false}));m.userData.noShadow=true;scene.add(m);return m};this.sunDisk=disk(0xffe8af,5);this.moonDisk=disk(0xd9e7ff,3.5);
  const positions:number[]=[];let seed=724;for(let i=0;i<180;i++){seed=(seed*1664525+1013904223)>>>0;const a=seed/4294967296*Math.PI*2;seed=(seed*1664525+1013904223)>>>0;const y=.12+seed/4294967296*.88,r=Math.sqrt(1-y*y);positions.push(Math.cos(a)*r*400,y*400,Math.sin(a)*r*400)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));this.stars=new T.Points(g,new T.PointsMaterial({color:0xdce8ff,size:1.3,transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false}));this.stars.userData.noShadow=true;scene.add(this.stars);
 }
 update(timeMs:number,x:number,y:number,z:number,coast:number,fogFar:number){
  const s=this.state=sampleDay(timeMs),t=DAY_TUNING;this.direction.set(Math.cos(s.angle)*.85,s.elevation,Math.cos(s.angle)*.45).normalize();
  this.sunDisk.position.copy(this.direction).multiplyScalar(390).add(new T.Vector3(x,y,z));this.moonDisk.position.copy(this.direction).multiplyScalar(-390).add(new T.Vector3(x,y,z));this.sunDisk.visible=s.elevation>-.06;this.moonDisk.visible=s.elevation<.06;this.stars.position.set(x,y,z);(this.stars.material as T.PointsMaterial).opacity=(1-s.daylight)*.7;
  // Reuse the existing shadow-casting directional light for sun OR moon.
  this.key.position.copy(this.direction).multiplyScalar(s.elevation>=0?140:-140);this.key.position.y=Math.max(12,this.key.position.y);this.key.position.add(new T.Vector3(x,y,z));this.key.target.position.set(x,y,z);
  const sunPower=T.MathUtils.smoothstep(s.elevation,0,.3),moonPower=T.MathUtils.smoothstep(-s.elevation,0,.25);
  this.key.intensity=t.sunIntensity*sunPower+t.moonIntensity*moonPower;
  this.key.color.copy(s.elevation>=0?colors.duskSun:colors.moon);if(s.elevation>=0)this.key.color.lerp(colors.sun,sunPower);
  this.ambient.intensity=T.MathUtils.lerp(t.nightAmbient,t.dayAmbient,s.daylight);this.ambient.color.setHex(0x9cb8df).lerp(new T.Color(0xd5e7f2),s.daylight);this.ambient.groundColor.setHex(0x233047).lerp(new T.Color(0x73835c),s.daylight);
  this.horizon.copy(colors.dayFog).lerp(colors.seaFog,coast*.6).lerp(colors.dusk,(1-Math.abs(s.elevation))*s.daylight*.35).lerp(colors.nightFog,1-s.daylight);this.zenith.copy(colors.nightSky).lerp(colors.daySky,s.daylight);
  const fog=this.scene.fog as T.Fog;fog.color.copy(this.horizon);fog.near=T.MathUtils.lerp(65,150,s.daylight);fog.far=fogFar*T.MathUtils.lerp(.72,1,s.daylight);(this.scene.background as T.Color).copy(this.horizon);
  // Sky has only ~560 vertices; recolor at 5 Hz, not every frame.
  if(Math.abs(timeMs-this.lastSky)>200){this.lastSky=timeMs;const p=this.sky.geometry.attributes.position,c=this.sky.geometry.attributes.color,col=new T.Color();for(let i=0;i<p.count;i++){col.copy(this.horizon).lerp(this.zenith,T.MathUtils.smoothstep(p.getY(i)/440,0,.85));c.setXYZ(i,col.r,col.g,col.b)}c.needsUpdate=true;}
  this.sky.position.set(x,y,z);return s;
 }
}
