import {createRider} from './rider';
import * as T from 'three';
export const vehicleSpec={id:'pop-reference-approx',wheelbase:1.238,seatHeight:.747,maxSpeed:100/3.6,gears:4};
export function createPop(){const root=new T.Group(),body=new T.Group(),steering=new T.Group(),wheels:T.Group[]=[];root.add(body);const mat=(color:number)=>new T.MeshStandardMaterial({color,roughness:.65});const blue=mat(0x234c91),black=mat(0x252c2d),metal=mat(0xabb6b5);
function ell(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,a:number,b:number,c:number){const o=new T.Mesh(new T.SphereGeometry(1,12,8),m);o.position.set(x,y,z);o.scale.set(a,b,c);o.castShadow=true;parent.add(o);return o}
function bar(parent:T.Object3D,m:T.Material,a:number[],b:number[],r:number){const av=new T.Vector3(...a),bv=new T.Vector3(...b),o=new T.Mesh(new T.CylinderGeometry(r,r,av.distanceTo(bv),8),m);o.position.copy(av).add(bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());o.castShadow=true;parent.add(o);return o}
function wheel(parent:T.Object3D,z:number,r:number){const g=new T.Group();g.position.set(0,r,z);parent.add(g);const tire=new T.Mesh(new T.TorusGeometry(r-.045,.045,8,24),black);tire.rotation.y=Math.PI/2;g.add(tire);const rim=new T.Mesh(new T.TorusGeometry(r-.09,.018,6,24),metal);rim.rotation.y=Math.PI/2;g.add(rim);bar(g,metal,[-.055,0,0],[.055,0,0],.065);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;bar(g,metal,[0,0,0],[0,Math.cos(a)*(r-.09),Math.sin(a)*(r-.09)],.013)}wheels.push(g)}
// Approximation from the supplied Pop photos. Paint is isolated from rubber, lenses and engine.
function panel(parent:T.Object3D,m:T.Material,width:number,outline:number[][]){const shape=new T.Shape();outline.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();const geometry=new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1,steps:1});geometry.rotateY(Math.PI/2);geometry.translate(-width/2,0,0);const mesh=new T.Mesh(geometry,m);mesh.castShadow=true;parent.add(mesh);return mesh}
const seatMaterial=mat(0x24272a),seatPixels=new Uint8Array(32*32*4);for(let i=0;i<32*32;i++){const v=170+(i*73%61);seatPixels.set([v,v,v,255],i*4)}const seatTexture=new T.DataTexture(seatPixels,32,32);seatTexture.wrapS=seatTexture.wrapT=T.RepeatWrapping;seatTexture.repeat.set(4,8);seatTexture.needsUpdate=true;seatMaterial.map=seatTexture;seatMaterial.roughness=.95;
wheel(body,-.619,.285);steering.position.z=.619;body.add(steering);wheel(steering,0,.305);
for(const x of [-.075,.075]){bar(steering,metal,[x,.305,0],[x,.93,-.12],.024);bar(steering,black,[x,.305,0],[x,.51,-.04],.03);bar(body,metal,[x,.285,-.619],[x,.68,-.42],.025);for(let i=0;i<8;i++)ell(body,black,x,.4+i*.03,-.55+i*.015,.034,.014,.034);bar(body,black,[x,.3,-.62],[x,.34,.03],.025)}
bar(body,black,[0,.4,-.46],[0,.86,.48],.035);
panel(body,blue,.27,[[-.79,.68],[-.65,.78],[-.06,.72],[.17,.55],[-.12,.48],[-.59,.54]]);
panel(body,black,.24,[[-.52,.51],[-.16,.49],[.08,.43],[-.05,.66],[-.43,.66]]);
ell(body,seatMaterial,0,.765,-.29,.185,.065,.47);
panel(body,blue,.245,[[.03,.54],[.32,.62],[.43,.94],[.57,.91],[.52,.57],[.24,.42]]);
// Compact horizontal engine, black silencer and polished heat shield.
ell(body,metal,0,.36,.015,.145,.115,.17);for(let y=.32;y<.47;y+=.025)bar(body,metal,[-.13,y,.14],[.13,y,.14],.009);
bar(body,metal,[.14,.33,.14],[.19,.24,-.12],.023);bar(body,black,[.19,.26,-.12],[.21,.3,-.76],.047);bar(body,black,[.22,.31,-.23],[.23,.33,-.65],.045);for(const z of [-.27,-.59])ell(body,metal,.262,.33,z,.007,.012,.012);
bar(body,metal,[-.25,.29,.03],[.25,.29,.03],.02);for(const side of [-1,1])bar(body,black,[side*.16,.29,.03],[side*.25,.29,.03],.028);
panel(steering,blue,.32,[[-.17,.87],[-.2,1.05],[-.06,1.1],[.12,1.03],[.14,.91],[.02,.83]]);
const lens=new T.Shape();lens.moveTo(-.13,1.025);lens.lineTo(.13,1.025);lens.lineTo(.10,.94);lens.lineTo(0,.9);lens.lineTo(-.10,.94);lens.closePath();const lamp=new T.Mesh(new T.ShapeGeometry(lens),new T.MeshStandardMaterial({color:0xe1eff1,metalness:.25,roughness:.18,emissive:0x443c26,emissiveIntensity:.4}));lamp.position.z=.145;steering.add(lamp);
ell(steering,blue,0,.66,.04,.10,.037,.24);ell(body,blue,0,.62,-.69,.105,.04,.22);
panel(body,black,.12,[[-.8,.63],[-.85,.61],[-.94,.32],[-.9,.30]]);ell(body,mat(0xc8322b),0,.69,-.78,.125,.055,.025);
for(const side of [-1,1]){ell(steering,mat(0xe5a441),side*.2,.88,-.02,.035,.027,.04);ell(body,mat(0xe5a441),side*.15,.64,-.72,.035,.026,.035);bar(body,metal,[side*.16,.8,-.54],[side*.16,.81,-.76],.016)}
bar(steering,metal,[-.34,1,-.12],[.34,1,-.12],.018);for(const side of [-1,1]){bar(steering,black,[side*.25,1,-.12],[side*.35,1,-.12],.026);bar(steering,metal,[side*.26,1,-.12],[side*.32,1.2,-.1],.009);ell(steering,black,side*.32,1.22,-.1,.065,.04,.025);ell(steering,metal,side*.32,1.22,-.126,.052,.029,.004)}
ell(steering,black,0,1.06,-.14,.085,.022,.055);
const riderRig=createRider(steering,1.48,1),rider=riderRig.root;body.add(rider);
return {root,body,steering,wheels,rider,riderRig,paintMaterials:[blue]};}
