import * as T from 'three';
export type Track={id:string;name:string;surface:'asfalto'|'terra';width:number;points:T.Vector3[]};
export type Place={name:string;x:number;z:number;kind:'village'|'station'|'lookout'|'farm'|'camp'|'waterfall'};
const controls=[[-310,0],[-650,-400],[-450,-900],[-650,-1300],[-400,-1650],[-650,-2100],[-600,-2700],[-350,-3000],[400,-3100],[850,-2900],[1250,-3200],[1800,-3100],[2300,-3350],[2700,-3100],[3000,-3300],[3400,-3400],[3550,-3200],[3200,-3000],[3400,-2800],[3950,-3000],[4450,-2950],[4650,-2700],[4300,-2500],[4500,-2300],[4900,-2200],[5000,-1900],[4550,-1650],[4900,-1350],[4600,-1050],[4900,-750],[4550,-400],[4400,0],[3900,250],[3400,0],[2850,250],[2400,80],[1900,300],[1450,100],[950,300],[450,100]];
const shape=new T.CatmullRomCurve3(controls.map(([x,z])=>new T.Vector3(x,0,z)),true,'centripetal');
export const MAP_SCALE=20000/shape.getLength();
export const point=(x:number,z:number)=>new T.Vector3((x+310)*MAP_SCALE-310,0,z*MAP_SCALE);
export const original=(x:number,z:number)=>({x:(x+310)/MAP_SCALE-310,z:z/MAP_SCALE});
const outer=shape.getSpacedPoints(5000).map(p=>point(p.x,p.z));
const anchor=(index:number)=>{const p=point(...controls[index] as [number,number]);return outer.reduce((a,b)=>a.distanceToSquared(p)<b.distanceToSquared(p)?a:b).clone()};
function path(id:string,name:string,surface:Track['surface'],nodes:T.Vector3[],width=surface==='terra'?5.8:8.6):Track{const c=new T.CatmullRomCurve3(nodes,false,'centripetal');return {id,name,surface,width,points:c.getSpacedPoints(Math.max(2,Math.ceil(c.getLength()/4)))}}
const center=point(2050,-1550);
const north=path('north','Estrada das Araucárias','asfalto',[anchor(11),point(1920,-2700),point(1780,-2350),point(2080,-2000),center]);
const west=path('west','Caminho de Boa Vista','asfalto',[anchor(3),point(-100,-1450),point(500,-1250),point(950,-1500),point(1500,-1530),center]);
const east=path('east','Estrada da Cachoeira','asfalto',[center,point(2700,-1650),point(3200,-1400),point(3800,-1350),anchor(28)]);
const south=path('south','Estrada do Lago','asfalto',[center,point(2050,-1050),point(2200,-700),point(1850,-300),anchor(36)]);
const at=(t:Track,f:number)=>t.points[Math.round((t.points.length-1)*f)].clone();
const farm=point(420,-1940),camp=point(2650,380),falls=point(3850,-1970);
export const tracks:Track[]=[{id:'main',name:'Estrada do Horizonte',surface:'asfalto',width:9.6,points:outer},north,west,east,south,
 path('farm','Estrada dos Ipês','terra',[anchor(5),point(-220,-2070),point(50,-1830),farm,point(650,-1780),point(700,-1470),at(west,.45)]),
 path('fields','Trilha dos Pomares','terra',[farm,point(900,-1850),point(1030,-2050),point(1180,-1850),point(1000,-1650),at(west,.52)]),
 path('camp','Caminho do Camping','terra',[at(south,.55),point(2500,-600),point(2780,-390),point(2600,-170),anchor(35),camp]),
 path('falls','Trilha da Cachoeira','terra',[at(east,.63),point(3520,-1630),point(3660,-1690),point(3590,-1860),falls]),
 path('ridge','Trilha da Serra','terra',[anchor(18),point(3600,-2600),point(3400,-2350),point(3650,-2200),point(3450,-2000),at(east,.47)],5.4)
];
export const mainPlan=tracks[0].points;
function beside(points:T.Vector3[],fraction:number,offset:number,name:string,kind:Place['kind']):Place{const index=Math.min(points.length-2,Math.floor(fraction*(points.length-1))),p=points[index],q=points[index+1],l=p.distanceTo(q);return {name,kind,x:p.x+(q.z-p.z)/l*offset,z:p.z-(q.x-p.x)/l*offset}}
const fractionAt=(i:number)=>{const p=anchor(i);return outer.indexOf(outer.reduce((a,b)=>a.distanceToSquared(p)<b.distanceToSquared(p)?a:b))/(outer.length-1)};
export const villages:Place[]=[beside(outer,0,80,'Vila do Ipê','village'),beside(outer,fractionAt(7),80,'Santa Aurora','village'),{name:'Vila das Araucárias',kind:'village',x:center.x+70,z:center.z+80},beside(outer,fractionAt(31),80,'Porto do Sol','village')];
export const stations:Place[]=[.003,.20,.41,.62,.82].map((f,i)=>beside(outer,f,24,['Posto do Ipê','Posto Aurora','Posto da Serra','Posto Boa Vista','Posto do Sol'][i],'station'));
export const viewpoints:Place[]=[beside(outer,fractionAt(20),35,'Mirante da Serra Azul','lookout'),beside(outer,fractionAt(33),35,'Mirante do Lago','lookout')];
export const specials:Place[]=[{name:'Fazenda Boa Vista',kind:'farm',x:farm.x,z:farm.z},{name:'Camping do Lago',kind:'camp',x:camp.x,z:camp.z},{name:'Cachoeira',kind:'waterfall',x:falls.x,z:falls.z}];
export const places=[...villages,...stations,...viewpoints,...specials];
export const lake={...point(1820,1100),r:650*MAP_SCALE};
export const riverStart=-4200*MAP_SCALE,riverEnd=1100*MAP_SCALE;
export const riverX=(z:number)=>point(1400+140*Math.sin(z/MAP_SCALE/380),0).x;
export const waterY=(z:number)=>12+Math.max(0,riverEnd-650*MAP_SCALE-z)*.003;
export const riverWidth=22;
export const river=Array.from({length:Math.ceil((riverEnd-riverStart)/8)+1},(_,i)=>{const z=Math.min(riverEnd,riverStart+i*8);return new T.Vector3(riverX(z),waterY(z),z)});
export type Bridge={x:number;z:number;dx:number;dz:number;halfLength:number;width:number;track:string};
export const bridges:Bridge[]=[];
for(const t of tracks)for(let i=0;i<t.points.length-1;i++){const a=t.points[i],b=t.points[i+1],fa=a.x-riverX(a.z),fb=b.x-riverX(b.z);if(fa*fb>=0)continue;const u=fa/(fa-fb),x=T.MathUtils.lerp(a.x,b.x,u),z=T.MathUtils.lerp(a.z,b.z,u);if(z<riverStart||z>riverEnd)continue;const l=a.distanceTo(b),dx=(b.x-a.x)/l,dz=(b.z-a.z)/l;bridges.push({x,z,dx,dz,halfLength:52/Math.max(.3,Math.abs(dx)),width:t.width+1.4,track:t.id})}

// Straight, constant-width bridge decks; ease the approaches into the original curves.
for(const b of bridges){const t=tracks.find(t=>t.id===b.track)!;for(const p of t.points){const dx=p.x-b.x,dz=p.z-b.z,along=dx*b.dx+dz*b.dz,side=dx*b.dz-dz*b.dx;if(Math.abs(along)>b.halfLength+50||Math.abs(side)>30)continue;const weight=1-T.MathUtils.smoothstep(Math.abs(along),b.halfLength,b.halfLength+50);p.x-=b.dz*side*weight;p.z+=b.dx*side*weight}}
