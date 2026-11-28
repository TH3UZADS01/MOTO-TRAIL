import {routes,nearestRoute,deepWater,cliffAt} from './terrain';
import type {Vector3} from 'three';

export type MapPoint={x:number;z:number};
export type Destination=MapPoint&{name:string};
export type RoadPath={points:MapPoint[];metres:number};
const distance=(a:MapPoint,b:MapPoint)=>Math.hypot(a.x-b.x,a.z-b.z);

function makeGraph(){
 const nodes:Vector3[]=[],edges:number[][]=[],starts=new Map<string,number>();
 const cells=new Map<string,number[]>();
 for(const track of routes){
  const start=nodes.length;starts.set(track.id,start);
  for(const p of track.points){
   const index=nodes.length;nodes.push(p);edges.push([]);
   if(index>start){edges[index].push(index-1);edges[index-1].push(index)}
   const x=Math.floor(p.x/8),z=Math.floor(p.z/8);
   for(let i=x-1;i<=x+1;i++)for(let j=z-1;j<=z+1;j++){
    for(const other of cells.get(i+','+j)??[]){
     if(other>=start&&index-other<4)continue;
     if(nodes[other].distanceTo(p)<3.7){edges[index].push(other);edges[other].push(index)}
    }
   }
   const key=x+','+z;if(!cells.has(key))cells.set(key,[]);
   cells.get(key)!.push(index);
  }
 }
 return {nodes,edges,starts};
}
let graph:ReturnType<typeof makeGraph>;
export function roadPath(from:MapPoint,to:MapPoint):RoadPath|null{
 const a=nearestRoute(from.x,from.z,220),b=nearestRoute(to.x,to.z,220);
 if(a.distance>=220||b.distance>=220||deepWater(to.x,to.z)||cliffAt(to.x,to.z))return null;
 // Check the short approach from pavement to the selected point as well.
 const steps=Math.ceil(b.distance/5);
 for(let i=1;i<steps;i++){
  const t=i/steps,x=b.x+(to.x-b.x)*t,z=b.z+(to.z-b.z)*t;
  if(deepWater(x,z)||cliffAt(x,z))return null;
 }
 const {nodes,edges,starts}=graph??=makeGraph();
 const snap=(s:typeof a)=>starts.get(s.track.id)!+s.index+(distance(s,s.track.points[s.index+1])<distance(s,s.track.points[s.index])?1:0);
 const start=snap(a),goal=snap(b);
 const costs=new Float64Array(nodes.length).fill(Infinity),prev=new Int32Array(nodes.length).fill(-1);
 // A* with a binary min-heap. Entries superseded by a shorter path are skipped.
 const heap:{id:number;score:number}[]=[];
 function push(id:number,score:number){
  let i=heap.length;heap.push({id,score});
  while(i>0){const parent=(i-1)>>1;if(heap[parent].score<=score)break;heap[i]=heap[parent];i=parent}
  heap[i]={id,score};
 }
 function pop(){
  const first=heap[0],last=heap.pop()!;
  if(heap.length){let i=0;
   while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;
    if(heap[child].score>=last.score)break;heap[i]=heap[child];i=child}
   heap[i]=last;
  }
  return first;
 }
 costs[start]=0;push(start,distance(nodes[start],nodes[goal]));
 while(heap.length){
  const {id,score}=pop();if(id===goal)break;
  if(score>costs[id]+distance(nodes[id],nodes[goal])+.001)continue;
  for(const next of edges[id]){
   const cost=costs[id]+nodes[id].distanceTo(nodes[next]);
   if(cost>=costs[next])continue;
   costs[next]=cost;prev[next]=id;push(next,cost+distance(nodes[next],nodes[goal]));
  }
 }
 if(!Number.isFinite(costs[goal]))return null;
 const points:MapPoint[]=[to];
 for(let i=goal;i!==-1;i=prev[i])points.push(nodes[i]);
 points.reverse();
 return {points,metres:distance(from,nodes[start])+costs[goal]+distance(nodes[goal],to)};
}
export const freightDistance=(a:MapPoint,b:MapPoint)=>roadPath(a,b)?.metres??Infinity;

export class Navigation{
 manual:Destination|null=null;
 goal:Destination|null=null;
 path:RoadPath|null=null;
 index=0;remaining=0;
 private suppressed='';private missionKey='';private previous:MapPoint|null=null;
 private suffix:number[]=[];
 mark(site:Destination){this.manual=site;this.goal=null}
 cancel(){this.manual=null;this.suppressed=this.missionKey;this.goal=null;this.path=null;this.remaining=0}
 update(here:MapPoint,mission?:Destination|null,missionId=''){
  const key=mission?[missionId,mission.name,mission.x,mission.z].join('/'): '';
  if(key!==this.missionKey){this.suppressed='';this.missionKey=key}
  if(this.manual&&distance(here,this.manual)<8)this.manual=null;
  const dest=this.manual??(this.suppressed!==key?mission:null)??null;
  if(!dest){this.goal=null;this.path=null;this.remaining=0;return}
  const changed=this.goal?.x!==dest.x||this.goal?.z!==dest.z;
  if(!changed&&this.previous&&distance(here,this.previous)<3)return;
  this.previous={x:here.x,z:here.z};
  let best=Infinity,nearest=this.index;
  if(!changed&&this.path){
   const p=this.path.points;
   for(let i=Math.max(0,this.index-6);i<Math.min(p.length,this.index+85);i++){
    const d=distance(here,p[i]);if(d<best){best=d;nearest=i}
   }
  }
  if(changed||best>35&&(!this.lastSearch||distance(here,this.lastSearch)>22)){
   this.goal=dest;this.path=roadPath(here,dest);this.lastSearch={x:here.x,z:here.z};
   this.suffix=[];nearest=0;
   if(this.path){const p=this.path.points;this.suffix[p.length-1]=0;
    for(let i=p.length-2;i>=0;i--)this.suffix[i]=this.suffix[i+1]+distance(p[i],p[i+1]);}
  }
  this.index=nearest;this.remaining=this.path?this.suffix[nearest]+distance(here,this.path.points[nearest]):0;
 }
 private lastSearch:MapPoint|null=null;
}
