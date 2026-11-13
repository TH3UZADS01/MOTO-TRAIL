import {makeHeadlight} from './headlight';
import {createCG150} from './cg150';
import {createRider} from './rider';
import * as T from 'three';
import {createPop} from './vehicle';
import {getVehicle,type VehicleId} from './vehicles';
import {CARAMELO_PET_TUNING,createCarameloPet} from './caramelos-mission';
export function createBike(id:VehicleId='pop'){
 const bike=buildBike(id),brakeLight=createBrakeLight(bike.body,bike.wheels[0].position.z);
 const passengerPetAnchor=new T.Group();passengerPetAnchor.name='passenger-pet-anchor';
 const seatAnchor=id==='cg150'?[0,.85,-.52]:id==='cub'?[0,.82,-.35]:id==='caloi'?[0,.83,-.5]:[0,.84,-.52];
 passengerPetAnchor.position.set(
  seatAnchor[0]+CARAMELO_PET_TUNING.positionOffset.x,
  seatAnchor[1]+CARAMELO_PET_TUNING.positionOffset.y,
  seatAnchor[2]+CARAMELO_PET_TUNING.positionOffset.z
 );
 passengerPetAnchor.rotation.set(CARAMELO_PET_TUNING.rotation.x,CARAMELO_PET_TUNING.rotation.y,CARAMELO_PET_TUNING.rotation.z);
 passengerPetAnchor.scale.setScalar(CARAMELO_PET_TUNING.scale);bike.body.add(passengerPetAnchor);
 const pet=createCarameloPet(passengerPetAnchor);
 return {...bike,headlight:makeHeadlight(bike.steering,getVehicle(id).eyeHeight),brakeLight,passengerPetAnchor,pet};
}
function createBrakeLight(body:T.Group,rearZ:number){
 const material=new T.MeshStandardMaterial({color:0x9b1010,emissive:0xff1010,emissiveIntensity:.12,roughness:.28});
 const lens=new T.Mesh(new T.SphereGeometry(1,16,10),material);lens.name='brake-light';lens.position.set(0,.69,rearZ-.16);lens.scale.set(.09,.045,.025);body.add(lens);
 const glow=new T.PointLight(0xff1717,0,2.4,2);glow.position.set(0,.69,rearZ-.2);glow.name='brake-light-glow';body.add(glow);
 let intensity=0;
 return {lens,glow,update(brake:number,dt:number){const target=T.MathUtils.clamp(brake,0,1);intensity=T.MathUtils.lerp(intensity,target,1-Math.exp(-18*Math.max(0,dt)));material.emissiveIntensity=.12+intensity*2.8;glow.intensity=intensity*1.6}};
}
function buildBike(id:VehicleId){
 if(id==='cg150')return createCG150();
 if(id==='pop')return createPop();
 const spec=getVehicle(id),cub=id==='cub',moped=id==='caloi';
 const root=new T.Group(),body=new T.Group(),steering=new T.Group(),wheels:T.Group[]=[];
 root.add(body);body.add(steering);steering.position.z=spec.wheelbase/2;
 const mat=(color:number)=>new T.MeshStandardMaterial({color,roughness:.55});
 const paint=mat(cub?0xeebf29:0xbb2634),white=mat(0xf0e9d4),black=mat(0x20272b),silver=mat(0xb6c2c3),seat=mat(cub?0x76503a:0x263038),lamp=mat(0xffe4aa),amber=mat(0xe9a126);
 function mesh(parent:T.Object3D,g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o}
 function ell(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,a:number,b:number,c:number){const o=mesh(parent,new T.SphereGeometry(1,16,10),m,x,y,z);o.scale.set(a,b,c);return o}
 function box(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,a:number,b:number,c:number){return mesh(parent,new T.BoxGeometry(a,b,c),m,x,y,z)}
 function bar(parent:T.Object3D,m:T.Material,a:number[],b:number[],r:number){const v=new T.Vector3(...a),w=new T.Vector3(...b);const o=mesh(parent,new T.CylinderGeometry(r,r,v.distanceTo(w),8),m,0,0,0);o.position.copy(v).add(w).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),w.sub(v).normalize());return o}
 function panel(parent:T.Object3D,m:T.Material,outline:number[][],depth:number){const s=new T.Shape();outline.forEach(([z,y],i)=>i?s.lineTo(z,y):s.moveTo(z,y));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.02,bevelThickness:.02});g.rotateY(-Math.PI/2);g.translate(depth/2,0,0);return mesh(parent,g,m,0,0,0)}
 function wheel(parent:T.Object3D,z:number,r:number){const g=new T.Group();g.position.set(0,r,z);parent.add(g);const tire=mesh(g,new T.TorusGeometry(r-.035,.035,8,32),black,0,0,0);tire.rotation.y=Math.PI/2;const rim=mesh(g,new T.TorusGeometry(r-.065,.012,6,32),silver,0,0,0);rim.rotation.y=Math.PI/2;
  bar(g,silver,[-.055,0,0],[.055,0,0],.058);for(let i=0;i<(cub||moped?24:5);i++){const a=i/(cub||moped?24:5)*Math.PI*2;bar(g,silver,[0,0,0],[0,Math.cos(a)*(r-.065),Math.sin(a)*(r-.065)],cub||moped?.004:.017)}wheels.push(g);}
 const rear=-spec.wheelbase/2,front=spec.wheelbase/2,radius=moped?.29:.28;
 wheel(body,rear,radius);wheel(steering,0,radius);
 for(const x of [-.07,.07]){bar(steering,silver,[x,radius,0],[x,.92,-.13],.022);bar(body,silver,[x,radius,rear],[x,.7,-.35],.022);bar(body,black,[x,radius,rear],[x,.32,0],.025)}
 // Fenders are curved arcs, not rectangular body blocks.
 for(const [parent,z] of [[body,rear],[steering,0]] as [T.Group,number][]){const f=mesh(parent,new T.TorusGeometry(radius+.04,.055,8,28,Math.PI*.85),moped?silver:paint,0,radius,z);f.rotation.y=Math.PI/2;f.rotation.z=.24;}
 ell(body,silver,0,.34,.02,moped?.105:.16,.12,.18);
 for(let y=.31;y<.45;y+=.023)bar(body,black,[-.12,y,.12],[.12,y,.12],.007);
 bar(body,black,[.18,.26,.07],[.18,.25,rear-.16],moped?.025:.045);
 bar(body,silver,[.19,.27,-.16],[.19,.26,rear-.12],moped?.016:.031);
 const handleY=moped?1.12:1.02,gripZ=front-.12;
 if(moped){
  // Open white pressed frame, exposed engine/belt, bicycle cranks and high handlebar.
  bar(body,white,[0,.69,-.32],[0,.38,.15],.065);bar(body,white,[0,.38,.15],[0,.88,.45],.055);
  panel(body,white,[[-.58,.63],[-.2,.62],[.15,.42],[.15,.35],[-.32,.47],[-.65,.52]],.14);
  panel(body,paint,[[-.5,.59],[-.2,.58],[.05,.43],[-.2,.47]],.152);
  ell(body,seat,0,.77,-.27,.145,.055,.36);bar(body,silver,[-.19,.32,-.08],[.19,.32,-.08],.015);
  for(const side of [-1,1]){bar(body,silver,[side*.19,.32,-.08],[side*.19,.22,-.18],.014);box(body,black,side*.23,.22,-.18,.12,.025,.06)}
  const pulley=mesh(body,new T.TorusGeometry(.09,.012,6,24),black,-.13,.32,-.15);pulley.rotation.y=Math.PI/2;
  panel(steering,paint,[[-.12,.82],[-.12,1.08],[.045,1.06],[.065,.8]],.28);
  box(steering,silver,0,.91,.068,.25,.14,.025);box(steering,lamp,0,.91,.085,.21,.105,.01);
  for(const side of [-1,1])bar(steering,silver,[side*.08,.92,-.12],[side*.32,handleY,-.12],.018);
 }else if(cub){
  // Short brown saddle, separate rear luggage rack, cream leg shield and round headlight.
  ell(body,paint,0,.58,-.35,.17,.18,.3);ell(body,seat,0,.755,-.22,.185,.065,.245);
  panel(body,white,[[-.04,.28],[.14,.33],[.42,.88],[.32,.97],[.22,.83],[.05,.55],[-.12,.43]],.25);
  ell(body,white,-.175,.53,-.35,.022,.12,.19);ell(body,white,.175,.53,-.35,.022,.12,.19);
  for(const x of [-.15,.15])bar(body,silver,[x,.77,-.48],[x,.77,-.84],.013);
  for(let z=-.82;z<=-.48;z+=.065)bar(body,silver,[-.15,.77,z],[.15,.77,z],.01);
  ell(steering,paint,0,1,-.08,.16,.13,.14);
  const ring=mesh(steering,new T.CylinderGeometry(.105,.105,.05,24),silver,0,1,.055);ring.rotation.x=Math.PI/2;
  const light=mesh(steering,new T.CircleGeometry(.088,24),lamp,0,1,.084);
  light.rotation.y=0;
  for(const s of [-1,1])ell(steering,amber,s*.19,1,.015,.035,.04,.035);
 }else{
  // Full red leg fairing, longer two-place saddle, alloy wheels and wide angular lamp.
  panel(body,paint,[[-.02,.24],[.23,.28],[.48,.86],[.38,1.0],[.2,.85],[.04,.51],[-.13,.4]],.25);
  ell(body,paint,0,.58,-.35,.18,.17,.37);ell(body,seat,0,.78,-.27,.185,.06,.43);
  panel(body,white,[[.2,.65],[.32,.8],[.25,.7],[.15,.74]],.275);
  ell(steering,paint,0,1.02,-.09,.255,.125,.14);ell(steering,lamp,0,1.04,.037,.18,.075,.025);
  for(const s of [-1,1])ell(steering,amber,s*.2,1.01,.015,.047,.05,.028);
  for(const s of [-1,1])bar(body,silver,[s*.17,.77,-.56],[s*.17,.77,-.82],.013);
 }
 if(!moped)bar(steering,silver,[-.34,handleY,-.12],[.34,handleY,-.12],.018);
 for(const side of [-1,1]){bar(steering,black,[side*.26,handleY,-.12],[side*.36,handleY,-.12],.025);bar(steering,silver,[side*.28,handleY,-.12],[side*.34,handleY+.22,-.09],.009);ell(steering,black,side*.34,handleY+.24,-.09,moped?.08:.06,.04,.025);}
 // Instrument cluster sits beneath the first-person eye line.
 const dashY=handleY+(moped?.04:.145);
 const dial=mesh(steering,new T.CircleGeometry(.065,24),black,0,dashY,-.14);dial.rotation.x=-Math.PI/2;
 for(let i=0;i<7;i++){const a=i/6*Math.PI;box(steering,white,Math.cos(a)*.047,dashY+.003,-.14-Math.sin(a)*.047,.007,.004,.012)}
 bar(steering,paint,[0,dashY+.008,-.14],[.03,dashY+.008,-.17],.004);
 const riderRig=createRider(steering,spec.eyeHeight,handleY,cub?0x49705a:moped?0x527f9a:0xb77d43),rider=riderRig.root;body.add(rider);
 return {root,body,steering,wheels,rider,riderRig,paintMaterials:[paint]};
}

export function disposeBike(bike:ReturnType<typeof createBike>){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();bike.root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)}});geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(m instanceof T.MeshStandardMaterial)m.map?.dispose();m.dispose()});}
