import * as T from 'three';
import type {Track} from './map-layout';

// Survey coordinates in kilometres relative to the junction at Vila do Ipê.
// Scale the survey once before sampling it in physical world metres.
export function makeHorizons(origin:T.Vector3){
 const sections=[
  [[0,0],[-2,1],[-6,2],[-10,2.7],[-14,2],[-19,3],[-23,2],[-26,0]],
  [[-26,0],[-27,-2],[-29,-4],[-28,-5],[-26.7,-4.8],[-26.4,-5.2],[-28.6,-6],[-28.8,-6.5],[-26.1,-6.6],[-25.8,-7.2],[-29,-8.4],[-30,-10],[-29,-12],[-27,-14],[-25,-15]],
  [[-25,-15],[-22,-16],[-19,-15],[-17,-16],[-15,-16],[-13,-16],[-11,-15],[-9,-14]],
  [[-9,-14],[-7,-13],[-6,-11],[-7,-9],[-6,-7],[-4,-6],[-3,-4],[-2,-2],[-1.6,-.8],[0,0]]
 ];
 const ids=['rodovia-poente','serra-cobre','vale-milho','estrada-capela'];
 const names=['Rodovia do Poente','Serra do Cobre','Vale do Milho','Estrada da Capela'];
 const curves=sections.map(nodes=>{
  const curve=new T.CatmullRomCurve3(nodes.map(([x,z])=>new T.Vector3(x,0,z)));
  curve.arcLengthDivisions=2048;return curve;
 });
 const unit=100000/curves.reduce((n,c)=>n+c.getLength(),0);
 const roads:Track[]=curves.map((c,i)=>({id:ids[i],name:names[i],surface:i===2?'terra':'asfalto',
  width:[10,8,6.4,7][i],points:c.getSpacedPoints(Math.ceil(c.getLength()*unit/6)).map(p=>p.multiplyScalar(unit).add(origin))}));
 const pos=(x:number,z:number)=>new T.Vector3(origin.x+x*unit,0,origin.z+z*unit);
 const creek=pos(-15,-16);
 const shortcut=new T.CatmullRomCurve3([roads[0].points[Math.floor(roads[0].points.length*.39)],pos(-11,-1),pos(-10,-3),pos(-8,-5),roads[3].points[Math.floor(roads[3].points.length*.56)]]);
 const bypass:Track={id:'atalho-pasto',name:'Caminho dos Currais',width:5.8,surface:'terra',points:shortcut.getSpacedPoints(Math.ceil(shortcut.getLength()/6))};
 return {roads,bypass,creek,unit,origin};
}
