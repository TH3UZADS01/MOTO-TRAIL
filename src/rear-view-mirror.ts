import * as T from 'three';
import type {Ride} from './riding';

export const REAR_MIRROR_DEFAULTS={width:512,height:256,fps:20,mountHeight:1.55,fov:78,far:900} as const;
export const REAR_MIRROR_WIDTHS=[256,512,768] as const;

type MirrorRenderer=Pick<T.WebGLRenderer,'autoClear'|'clear'|'getScissor'|'getScissorTest'|'getViewport'|'render'|'setRenderTarget'|'setScissor'|'setScissorTest'|'setViewport'|'shadowMap'>;
type MirrorOptions={enabled?:boolean;fps?:number;width?:number};

export function updateRearViewCamera(camera:T.PerspectiveCamera,ride:Ride){
 camera.position.set(ride.x,ride.y+REAR_MIRROR_DEFAULTS.mountHeight,ride.z);
 camera.rotation.order='YXZ';
 camera.rotation.set(-ride.pitch,ride.heading,-ride.lean,'YXZ');
 camera.updateMatrixWorld(true);
}

export function rearMirrorCaptureDue(lastCapture:number,now:number,fps:number){return now-lastCapture>=1000/fps}

export function createMirroredQuadGeometry(){
 const geometry=new T.PlaneGeometry(2,2),uv=geometry.getAttribute('uv');
 for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));
 uv.needsUpdate=true;
 return geometry;
}

export class RearViewMirror {
 readonly camera=new T.PerspectiveCamera(REAR_MIRROR_DEFAULTS.fov,2,.1,REAR_MIRROR_DEFAULTS.far);
 private target:T.WebGLRenderTarget;
 private readonly displayScene=new T.Scene();
 private readonly displayCamera=new T.OrthographicCamera(-1,1,1,-1,0,2);
 private readonly displayMaterial:T.MeshBasicMaterial;
 private enabled:boolean;
 private active=false;
 private fps:number;
 private lastCapture=-Infinity;
 private width:number;

 constructor(private readonly renderer:MirrorRenderer,private readonly element:HTMLElement,options:MirrorOptions={}){
  this.enabled=options.enabled??true;
  this.fps=options.fps??REAR_MIRROR_DEFAULTS.fps;
  this.width=options.width??REAR_MIRROR_DEFAULTS.width;
  this.validateFps(this.fps);
  this.validateWidth(this.width);
  this.target=this.createTarget(this.width);
  this.displayMaterial=new T.MeshBasicMaterial({map:this.target.texture,depthTest:false,depthWrite:false,toneMapped:false});
  this.displayScene.add(new T.Mesh(createMirroredQuadGeometry(),this.displayMaterial));
  this.displayCamera.position.z=1;
  this.syncVisibility();
 }

 setConfiguration(options:Pick<MirrorOptions,'fps'|'width'>){
  if(options.fps!==undefined){this.validateFps(options.fps);this.fps=options.fps}
  if(options.width!==undefined&&options.width!==this.width){
   this.validateWidth(options.width);
   this.target.dispose();
   this.width=options.width;
   this.target=this.createTarget(this.width);
   this.displayMaterial.map=this.target.texture;
   this.displayMaterial.needsUpdate=true;
   this.lastCapture=-Infinity;
  }
 }

 setEnabled(enabled:boolean){this.enabled=enabled;this.lastCapture=-Infinity;this.syncVisibility()}
 setActive(active:boolean){this.active=active;if(active)this.lastCapture=-Infinity;this.syncVisibility()}

 capture(scene:T.Scene,ride:Ride,now:number){
  if(!this.enabled||!this.active||!rearMirrorCaptureDue(this.lastCapture,now,this.fps))return;
  updateRearViewCamera(this.camera,ride);
  const viewport=this.renderer.getViewport(new T.Vector4());
  const scissor=this.renderer.getScissor(new T.Vector4());
  const scissorTest=this.renderer.getScissorTest();
  const shadowAutoUpdate=this.renderer.shadowMap.autoUpdate;
  try{
   this.renderer.setRenderTarget(this.target);
   this.renderer.setScissorTest(false);
   this.renderer.shadowMap.autoUpdate=false;
   this.renderer.clear();
   this.renderer.render(scene,this.camera);
  }finally{
   this.renderer.setRenderTarget(null);
   this.renderer.setViewport(viewport);
   this.renderer.setScissor(scissor);
   this.renderer.setScissorTest(scissorTest);
   this.renderer.shadowMap.autoUpdate=shadowAutoUpdate;
  }
  this.lastCapture=now;
 }

 renderOverlay(){
  if(!this.enabled||!this.active)return;
  const rect=this.element.getBoundingClientRect();
  if(rect.width<=0||rect.height<=0)return;
  const viewport=this.renderer.getViewport(new T.Vector4());
  const scissor=this.renderer.getScissor(new T.Vector4());
  const scissorTest=this.renderer.getScissorTest();
  const autoClear=this.renderer.autoClear;
  const x=rect.left,y=window.innerHeight-rect.bottom;
  try{
   this.renderer.autoClear=false;
   this.renderer.setViewport(x,y,rect.width,rect.height);
   this.renderer.setScissor(x,y,rect.width,rect.height);
   this.renderer.setScissorTest(true);
   this.renderer.render(this.displayScene,this.displayCamera);
  }finally{
   this.renderer.setViewport(viewport);
   this.renderer.setScissor(scissor);
   this.renderer.setScissorTest(scissorTest);
   this.renderer.autoClear=autoClear;
  }
 }

 dispose(){this.target.dispose();this.displayMaterial.dispose();this.displayScene.traverse(object=>{if(object instanceof T.Mesh)object.geometry.dispose()})}

 private createTarget(width:number){
  const target=new T.WebGLRenderTarget(width,width/2,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true});
  target.texture.colorSpace=T.SRGBColorSpace;
  return target;
 }

 private validateFps(fps:number){if(!Number.isFinite(fps)||fps<1||fps>60)throw new RangeError('Rear mirror FPS must be between 1 and 60.')}
 private validateWidth(width:number){if(!REAR_MIRROR_WIDTHS.some(value=>value===width))throw new RangeError(`Rear mirror width must be one of ${REAR_MIRROR_WIDTHS.join(', ')}.`)}
 private syncVisibility(){this.element.classList.toggle('hidden',!this.enabled||!this.active)}
}
