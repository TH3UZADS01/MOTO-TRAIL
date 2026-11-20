import * as T from 'three';

// Profile from chin to crown. The chin drops forward, while the back clears the neck.
const profile=[
 [-.73,.73,.80,.12],[-.65,.87,.92,.11],[-.47,.96,1.04,.09],
 [-.28,1,.99,.065],[.02,1.04,1.04,.04],[.29,1.04,1.04,.01],
 [.45,1,.98,-.01],[.69,.87,.89,-.04],[.89,.62,.68,-.055],
 [1,.29,.35,-.055],[1.025,.02,.03,-.055]
];
export function roadHelmetGeometry(){
 const positions:number[]=[],colors:number[]=[];
 const palette=['#25272c','#373940','#16191d','#d71c2e','#991724','#202936','#344151','#515c69','#737781'].map(h=>new T.Color(h));
 const count=40;
 function point(row:number,j:number){
  const [y,x,r,z]=profile[row],a=j*2*Math.PI/count,front=Math.max(0,Math.cos(a));
  return [x*Math.sin(a),y-(row<4?(.27-row*.065)*front:0),z+r*Math.cos(a)];
 }
 function tri(a:number[],b:number[],c:number[],ink:number){
  positions.push(...a,...b,...c);
  const {r,g,b:blue}=palette[ink];for(let i=0;i<3;i++)colors.push(r,g,blue);
 }
 for(let k=0;k<profile.length-1;k++)for(let j=0;j<count;j++){
  const side=Math.min(j+.5,count-j-.5),a=point(k,j),b=point(k,j+1),c=point(k+1,j+1),d=point(k+1,j);
  let ink=(Math.floor(side/3)+k)%4===0?1:0;
  if(k===0)ink=2;
  // Swept red crown and diagonal cheek stripe, mirrored left and right.
  if((k>=6&&side<2+(k-6)*2)||(Math.abs(side-(4+k*1.18))<1.0)||(k===1&&side<4))ink=3;
  if(k===2&&side<2)ink=2;
  const visor=k>=3&&k<=5&&side<8+(k-3);
  if(visor)ink=k===5?6:5;
  tri(a,b,c,ink);tri(a,c,d,ink);
 }
 for(let j=0;j<count;j++){
  tri([0,-.72,.12],point(0,j+1),point(0,j),2);
  tri([0,1.026,-.055],point(10,j),point(10,j+1),0);
 }
 // Raised visor pivots and red release tabs on both temples.
 for(const sign of [-1,1]){
  const centre=[1.045*sign,.13,.14];
  for(let i=0;i<12;i++){
   const end=(n:number)=>[centre[0],centre[1]+.115*Math.cos(n*Math.PI/6),centre[2]+.115*Math.sin(n*Math.PI/6)];
   tri(centre,end(sign*i),end(sign*(i+1)),i%3===0?8:7);
  }
  const x=1.052*sign;tri([x,.105,.09],[x,.16,.09],[x,.14,.21],3);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
