import * as T from 'three';
export const vehicleSpec={id:'pop-2027-approx',wheelbase:1.238,seatHeight:.747,maxSpeed:80/3.6,gears:4};
export function createPop(){const root=new T.Group(),body=new T.Group(),steering=new T.Group(),wheels:T.Group[]=[];root.add(body);const mat=(color:number)=>new T.MeshStandardMaterial({color,roughness:.65});const blue=mat(0x267fa3),black=mat(0x252c2d),metal=mat(0xabb6b5),skin=mat(0xbd9874),jacket=mat(0xc88b48),pants=mat(0x364852);
function ell(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,a:number,b:number,c:number){const o=new T.Mesh(new T.SphereGeometry(1,12,8),m);o.position.set(x,y,z);o.scale.set(a,b,c);o.castShadow=true;parent.add(o);return o}
function bar(parent:T.Object3D,m:T.Material,a:number[],b:number[],r:number){const av=new T.Vector3(...a),bv=new T.Vector3(...b),o=new T.Mesh(new T.CylinderGeometry(r,r,av.distanceTo(bv),8),m);o.position.copy(av).add(bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());o.castShadow=true;parent.add(o);return o}
function wheel(parent:T.Object3D,z:number,r:number){const g=new T.Group();g.position.set(0,r,z);parent.add(g);const tire=new T.Mesh(new T.TorusGeometry(r-.045,.045,8,24),black);tire.rotation.y=Math.PI/2;g.add(tire);const rim=new T.Mesh(new T.TorusGeometry(r-.09,.018,6,24),metal);rim.rotation.y=Math.PI/2;g.add(rim);bar(g,metal,[-.055,0,0],[.055,0,0],.065);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;bar(g,metal,[0,0,0],[0,Math.cos(a)*(r-.09),Math.sin(a)*(r-.09)],.013)}wheels.push(g)}
wheel(body,-.619,.258);steering.position.z=.619;body.add(steering);wheel(steering,0,.279);
for(const x of [-.07,.07]){bar(steering,metal,[x,.28,0],[x,.9,-.13],.023);bar(body,metal,[x,.28,-.619],[x,.66,-.37],.025);bar(body,black,[x,.3,-.62],[x,.32,.03],.03)}
bar(body,black,[0,.38,-.4],[0,.85,.47],.045);ell(body,blue,0,.58,-.3,.16,.18,.37);ell(body,black,0,.747,-.28,.19,.065,.43);const fairing=ell(body,blue,0,.65,.35,.16,.26,.13);fairing.rotation.x=-.3;ell(body,metal,0,.34,.02,.15,.12,.18);for(let y=.3;y<.43;y+=.025)bar(body,black,[-.14,y,.1],[.14,y,.1],.008);bar(body,black,[.18,.28,.05],[.18,.29,-.69],.045);bar(body,metal,[-.25,.28,.03],[.25,.28,.03],.022);
ell(steering,blue,0,.94,-.08,.2,.13,.12);ell(steering,mat(0xffe6ae),0,.95,.025,.13,.085,.025);ell(steering,blue,0,.6,.025,.075,.035,.22);ell(body,blue,0,.55,-.65,.075,.035,.2);ell(body,mat(0xca463a),0,.68,-.73,.09,.035,.025);
bar(steering,metal,[-.34,1,-.15],[.34,1,-.15],.018);for(const s of [-1,1]){bar(steering,black,[s*.25,1,-.15],[s*.35,1,-.15],.026);bar(steering,metal,[s*.26,1,-.15],[s*.32,1.2,-.12],.009);ell(steering,black,s*.32,1.22,-.12,.065,.04,.025)}
ell(steering,black,0,1.04,-.15,.09,.025,.065);
const rider=new T.Group();body.add(rider); // Articulated rider, hands at the grips, feet on the pegs.
ell(rider,pants,0,.86,-.21,.16,.13,.16);const torso=ell(rider,jacket,0,1.13,-.17,.2,.29,.13);torso.rotation.x=.12;ell(rider,mat(0xe9dfbf),0,1.51,-.12,.145,.17,.145);ell(rider,black,0,1.52,.005,.12,.075,.035);
for(const s of [-1,1]){bar(rider,pants,[s*.12,.86,-.2],[s*.2,.62,.16],.08);bar(rider,pants,[s*.2,.62,.16],[s*.22,.32,.02],.065);ell(rider,black,s*.22,.3,.08,.065,.05,.12);bar(rider,jacket,[s*.17,1.3,-.12],[s*.26,1.12,.12],.065);bar(rider,jacket,[s*.26,1.12,.12],[s*.31,1,.46],.055);ell(rider,skin,s*.31,1,.46,.04,.04,.06)}
return {root,body,steering,wheels,rider};}


