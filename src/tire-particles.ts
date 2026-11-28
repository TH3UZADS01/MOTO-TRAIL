import * as T from 'three';

export const TIRE_PARTICLE_CONFIG={capacity:96,minimumSpeed:.5,dirtParticlesPerMeter:.9,grassParticlesPerMeter:.55,maximumParticlesPerSecond:32} as const;
const SMOKE_COLOR=new T.Color(0xe8e8e8);
const SAND_COLOR=new T.Color(0xd4b780),MUD_COLOR=new T.Color(0x503924);
const DIRT_COLOR=new T.Color(0xc18c61),GRASS_COLOR=new T.Color(0x548542),CAPACITY=TIRE_PARTICLE_CONFIG.capacity;

export function tireParticleEmissionRate(surface:string,speed:number){
 if(surface==='smoke')return Math.abs(speed)>.8?Math.min(32,Math.abs(speed)*4):0;
 if(surface!=='terra'&&surface!=='grama'&&surface!=='areia'&&surface!=='cascalho'&&surface!=='lama')return 0;
 const magnitude=Math.abs(speed);
 if(magnitude<TIRE_PARTICLE_CONFIG.minimumSpeed)return 0;
 const density=surface==='terra'?TIRE_PARTICLE_CONFIG.dirtParticlesPerMeter:TIRE_PARTICLE_CONFIG.grassParticlesPerMeter;
 return Math.min(TIRE_PARTICLE_CONFIG.maximumParticlesPerSecond,magnitude*density);
}

export class TireParticles {
 private readonly geometry=new T.BufferGeometry();
 private readonly material=new T.ShaderMaterial({
  uniforms:{},
  vertexShader:`attribute vec4 particleColor;
attribute float particleSize;
attribute float particleLeaf;
attribute float particleRotation;
varying vec4 vColor;
varying float vLeaf;
varying float vRotation;
void main(){
 vec4 viewPosition=modelViewMatrix*vec4(position,1.0);
 gl_Position=projectionMatrix*viewPosition;
 gl_PointSize=clamp(particleSize*(300.0/max(1.0,-viewPosition.z)),1.0,particleLeaf==0.0?112.0:12.0);
 vColor=particleColor;
 vLeaf=particleLeaf;
 vRotation=particleRotation;
}`,
  fragmentShader:`varying vec4 vColor;
varying float vLeaf;
varying float vRotation;
void main(){
 vec2 p=gl_PointCoord*2.0-1.0;
 float c=cos(vRotation),s=sin(vRotation);
 p=mat2(c,-s,s,c)*p;
 float alpha;
 if(vLeaf>0.5){
  float width=0.28*(1.0-abs(p.y));
  if(abs(p.x)>width)discard;
  alpha=1.0-smoothstep(0.82,1.0,abs(p.y));
 }else{
  float radius=length(p);
  if(radius>1.0)discard;
  if(vLeaf==0.0){
   float lobes=.87+.08*sin(5.0*p.x+2.0*p.y)+.05*cos(6.0*p.y-2.0*p.x);
   alpha=1.0-smoothstep(.04,lobes,radius);
  }else alpha=1.0-smoothstep(.78,1.0,radius);
 }
 gl_FragColor=vec4(vColor.rgb,vColor.a*alpha);
 #include <colorspace_fragment>
}`,
  transparent:true,depthWrite:false,toneMapped:false
 });
 private readonly particles=new Array<{life:number;duration:number;vx:number;vy:number;vz:number}>(CAPACITY);
 private readonly positions=new Float32Array(CAPACITY*3);
 private readonly colors=new Float32Array(CAPACITY*4);
 private readonly sizes=new Float32Array(CAPACITY);
 private readonly leaves=new Float32Array(CAPACITY);
 private readonly rotations=new Float32Array(CAPACITY);
 private next=0;
 private emissionRemainder=0;
 private currentSurface='';
 private activeCount=0;
 private pendingUpdate=false;
 private readonly wheelPosition=new T.Vector3();
 private readonly movement=new T.Vector3();
 private readonly color=new T.Color();
 readonly points:T.Points;

 constructor(private readonly scene:T.Scene,private readonly random:()=>number=Math.random){
  for(let i=0;i<CAPACITY;i++)this.particles[i]={life:0,duration:0,vx:0,vy:0,vz:0};
  this.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(this.positions.length),3).setUsage(T.DynamicDrawUsage));
  this.geometry.setAttribute('particleColor',new T.BufferAttribute(new Float32Array(this.colors.length),4).setUsage(T.DynamicDrawUsage));
  this.geometry.setAttribute('particleSize',new T.BufferAttribute(new Float32Array(this.sizes.length),1).setUsage(T.DynamicDrawUsage));
  this.geometry.setAttribute('particleLeaf',new T.BufferAttribute(new Float32Array(this.leaves.length),1).setUsage(T.DynamicDrawUsage));
  this.geometry.setAttribute('particleRotation',new T.BufferAttribute(new Float32Array(this.rotations.length),1).setUsage(T.DynamicDrawUsage));
  this.geometry.setDrawRange(0,0);
  this.points=new T.Points(this.geometry,this.material);
  this.points.frustumCulled=false;
  this.points.renderOrder=1;
  this.scene.add(this.points);
 }

 get count(){return this.activeCount}
 get surface(){return this.currentSurface}

 update(surface:string,speed:number,rearWheel:T.Object3D,heading:number,dt:number,smoking=false,slip=0,acceleration=0,distance=0){
  const dry=surface==="terra"||surface==="cascalho";
  if(smoking&&surface==="asfalto")surface="smoke";
  dt=T.MathUtils.clamp(dt,0,.1);
  if(surface!==this.currentSurface){
   this.emissionRemainder=0;
   this.currentSurface=surface;
  }
  const lockedSlide=smoking?Math.min(1,Math.abs(speed)/8):0;
  const agitation=dry?Math.min(1,Math.abs(slip)+lockedSlide):0;
  const equivalentSpeed=Math.abs(speed)+agitation*8;
  const proximity=1-T.MathUtils.smoothstep(distance,35,85);
  const rate=proximity*Math.min(32,tireParticleEmissionRate(surface,equivalentSpeed)*(dry?1+.45*agitation+.25*T.MathUtils.clamp(acceleration/4,0,1):1));
  const intensity=Math.min(1,equivalentSpeed/26+agitation*.35);
  if(distance>=90){if(this.activeCount)this.clearParticles();return}
  if(rate>0&&dt>0){
   rearWheel.getWorldPosition(this.wheelPosition);
   const direction=Math.sign(speed)||1;
   this.movement.set(Math.sin(heading)*direction,0,Math.cos(heading)*direction);
   this.emissionRemainder+=rate*dt;
   while(this.emissionRemainder>=1){
    this.spawn(surface,direction,heading,intensity);
    this.emissionRemainder-=1;
   }
  }else if(Math.abs(speed)<TIRE_PARTICLE_CONFIG.minimumSpeed){
   this.emissionRemainder=0;
  }
  this.advance(dt);
 }

 dispose(){
  this.scene.remove(this.points);
  this.geometry.dispose();
  this.material.dispose();
 }

 private spawn(surface:string,direction:number,heading:number,intensity:number){
  const index=this.next;
  this.next=(this.next+1)%CAPACITY;
  this.pendingUpdate=true;
  const p=this.particles[index],isLeaf=surface==='grama',isSmoke=surface==='smoke';
  const dry=surface==='terra'||surface==='cascalho';
  const spread=(this.random()-.5)*(dry?.4+intensity*.6:.24);
  const trailing=.16+this.random()*.2;
  const lateralX=Math.cos(heading),lateralZ=-Math.sin(heading);
  this.positions[index*3]=this.wheelPosition.x-this.movement.x*trailing+lateralX*spread;
  this.positions[index*3+1]=this.wheelPosition.y-.18+this.random()*.16;
  this.positions[index*3+2]=this.wheelPosition.z-this.movement.z*trailing+lateralZ*spread;
  p.duration=dry?1.2+.65*intensity+this.random()*.6:surface==='lama'?.3+this.random()*.18:isSmoke?1.1+this.random()*.5:isLeaf?.65+this.random()*.45:.75+this.random()*.6;
  p.life=p.duration;
  const lateralVelocity=(this.random()-.5)*(dry?1.5+intensity*2.4:.45);
  p.vx=-this.movement.x*(.45+this.random()*.7)+lateralX*lateralVelocity;
  p.vy=dry?.4+this.random()*(.55+.5*intensity):isLeaf?.45+this.random()*.55:.25+this.random()*.45;
  p.vz=-this.movement.z*(.45+this.random()*.7)+lateralZ*lateralVelocity;
  this.color.copy(isSmoke?SMOKE_COLOR:isLeaf?GRASS_COLOR:surface==='areia'?SAND_COLOR:surface==='lama'?MUD_COLOR:DIRT_COLOR).multiplyScalar(.82+this.random()*.36);
  this.colors[index*4]=this.color.r;
  this.colors[index*4+1]=this.color.g;
  this.colors[index*4+2]=this.color.b;
  this.colors[index*4+3]=dry?.42:1;
  this.sizes[index]=dry?(.48+this.random()*.58)*(.65+.9*intensity):isSmoke?.35+this.random()*.18:isLeaf?.14+this.random()*.1:.12+this.random()*.1;
  this.leaves[index]=isLeaf?1:dry?0:-1;
  this.rotations[index]=this.random()*Math.PI*2;
  if(direction<0)this.rotations[index]+=Math.PI;
 }

 private advance(dt:number){
  if(this.activeCount===0&&!this.pendingUpdate)return;
  this.pendingUpdate=false;
  const packedPositions=this.geometry.getAttribute('position') as T.BufferAttribute;
  const packedColors=this.geometry.getAttribute('particleColor') as T.BufferAttribute;
  const packedSizes=this.geometry.getAttribute('particleSize') as T.BufferAttribute;
  const packedLeaves=this.geometry.getAttribute('particleLeaf') as T.BufferAttribute;
  const packedRotations=this.geometry.getAttribute('particleRotation') as T.BufferAttribute;
  const drag=Math.exp(-1.7*dt);
  let visible=0;
  for(let i=0;i<CAPACITY;i++){
   const p=this.particles[i];
   if(p.life<=0)continue;
   p.life-=dt;
   if(p.life<=0)continue;
   const cloud=this.colors[i*4+3]<1;
   p.vx*=drag;p.vz*=drag;p.vy=cloud?p.vy*Math.exp(-dt*.8):Math.max(-.8,p.vy-1.15*dt);
   this.positions[i*3]+=p.vx*dt;
   this.positions[i*3+1]+=p.vy*dt;
   this.positions[i*3+2]+=p.vz*dt;
   const fade=p.life/p.duration;
   packedPositions.setXYZ(visible,this.positions[i*3],this.positions[i*3+1],this.positions[i*3+2]);
   packedColors.setXYZW(visible,this.colors[i*4],this.colors[i*4+1],this.colors[i*4+2],cloud?.42*fade*Math.min(1,(1-fade)*12):fade);
   packedSizes.setX(visible,this.sizes[i]*(cloud?1+2.6*(1-fade):1));
   packedLeaves.setX(visible,this.leaves[i]);
   packedRotations.setX(visible,this.rotations[i]);
   visible++;
  }
  this.activeCount=visible;
  this.geometry.setDrawRange(0,visible);
  packedPositions.needsUpdate=true;
  packedColors.needsUpdate=true;
  packedSizes.needsUpdate=true;
  packedLeaves.needsUpdate=true;
  packedRotations.needsUpdate=true;
 }

 private clearParticles(){
  for(const p of this.particles)p.life=0;
  this.activeCount=0;
  this.emissionRemainder=0;
  this.geometry.setDrawRange(0,0);
 }
}
