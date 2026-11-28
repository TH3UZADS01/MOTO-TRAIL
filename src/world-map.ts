import {Navigation,roadPath,type RoadPath,type Destination,type MapPoint} from './navigation';
import type {Track} from './map-layout';

export function worldMap(roads:Track[],sites:Destination[],gps:Navigation,player:()=>MapPoint,heading:()=>number,sync:()=>void){
 const dialog=document.createElement('dialog');dialog.className='world-chart';
 dialog.innerHTML='<header><h2>Mapa do Horizonte</h2><button data-close aria-label="Fechar mapa">Fechar</button></header><canvas aria-label="Mapa das estradas e localidades"></canvas><footer><label>Destino <select><option value="">Selecione no mapa</option></select></label><button data-go>Traçar rota</button><button data-clear>Cancelar GPS</button><button data-all>Mapa inteiro</button><button data-center>Centralizar</button><button data-out aria-label="Afastar">−</button><button data-in aria-label="Aproximar">+</button></footer><output aria-live="polite"></output>';
 document.body.append(dialog);
 const canvas=dialog.querySelector('canvas')!,ctx=canvas.getContext('2d')!,select=dialog.querySelector('select')!,info=dialog.querySelector('output')!;
 sites.forEach((s,i)=>select.add(new Option(s.name,String(i))));
 const bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
 for(const r of roads)for(const p of r.points){bounds.left=Math.min(bounds.left,p.x);bounds.right=Math.max(bounds.right,p.x);bounds.top=Math.min(bounds.top,p.z);bounds.bottom=Math.max(bounds.bottom,p.z)}
 let center={x:(bounds.left+bounds.right)/2,z:(bounds.top+bounds.bottom)/2};
 let preview:RoadPath|null=null;
 let zoom=1,scale=1,w=0,h=0,selected:Destination|null=null;
 const xy=(p:MapPoint)=>[w/2+(p.x-center.x)*scale,h/2+(p.z-center.z)*scale];
 function draw(){
  if(!dialog.open)return;
  w=canvas.clientWidth;h=canvas.clientHeight;const ratio=Math.min(2,devicePixelRatio);
  canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.scale(ratio,ratio);
  scale=zoom*Math.min((w-36)/(bounds.right-bounds.left),(h-36)/(bounds.bottom-bounds.top));
  function stroke(points:MapPoint[],color:string,width:number,start=0,skip=1){
   ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;
   for(let i=start;i<points.length;i+=skip){const [x,y]=xy(points[i]);if(i===start)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
   if(points.length){const [x,y]=xy(points[points.length-1]);ctx.lineTo(x,y)}ctx.stroke();
  }
  const labels:{x:number;y:number;width:number}[]=[];
  function label(name:string,x:number,y:number,color:string){
   const width=ctx.measureText(name).width;
   if(x<1||y<12||x+width>w-2||y>h-2||labels.some(l=>Math.abs(l.y-y)<14&&x<l.x+l.width+4&&x+width+4>l.x))return;
   labels.push({x,y,width});ctx.fillStyle=color;ctx.fillText(name,x,y);
  }
  ctx.font='11px sans-serif';
  for(const road of roads){stroke(road.points,road.surface==='terra'?'#c39262':'#adc7ad',road.id==='main'?2:1.35);
   const mid=road.points[Math.floor(road.points.length/2)], [x,y]=xy(mid);
   if(zoom>1.8||road.points.length>450){ctx.fillStyle='#cad8bf';ctx.font='11px sans-serif';label(road.name,x+6,y-7,'#b0c8ba')}
  }
  if(preview&&selected!==gps.goal)stroke(preview.points,'#80bcb9',2,0,4);
  if(gps.path)stroke(gps.path.points,'#55dfff',3,gps.index,zoom>6?1:6);
  function dot(p:MapPoint,color:string,r:number){const [x,y]=xy(p);ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fill()}
  for(const s of sites){dot(s,s.name.startsWith('Oficina')?'#a4c8ed':s.name.startsWith('Posto')?'#f6cd75':'#d9a982',3);if(zoom>3){const [x,y]=xy(s);ctx.fillStyle='#fff2d8';label(s.name,x+5,y+10,'#fff2d8')}}
  if(selected)dot(selected,'#ffa357',6);if(gps.goal)dot(gps.goal,'#55dfff',4);
  const [x,y]=xy(player());ctx.save();ctx.translate(x,y);ctx.rotate(-heading());ctx.fillStyle='white';ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(-5,-5);ctx.lineTo(5,-5);ctx.closePath();ctx.fill();ctx.restore();
 }
 function pick(s:Destination){selected=s;const i=sites.indexOf(s);select.value=i>=0?String(i):'';
  const route=preview=roadPath(player(),s);info.textContent=route?s.name+' · '+(route.metres/1000).toFixed(1)+' km por estrada':s.name+' · sem acesso pela malha rodoviária';
  dialog.querySelector<HTMLButtonElement>('[data-go]')!.disabled=!route;draw()}
 select.onchange=()=>{if(select.value!=='')pick(sites[Number(select.value)])};
 let drag:{x:number;y:number;ox:number;oz:number;moved:boolean}|null=null;
 canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,ox:center.x,oz:center.z,moved:false};canvas.setPointerCapture(e.pointerId)};
 canvas.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)drag.moved=true;
  if(drag.moved){center={x:drag.ox-dx/scale,z:drag.oz-dy/scale};draw()}};
 canvas.onpointercancel=()=>{drag=null};
 canvas.onpointerup=e=>{if(!drag)return;const click=!drag.moved;drag=null;if(!click)return;
  const rect=canvas.getBoundingClientRect(),p={x:center.x+(e.clientX-rect.left-w/2)/scale,z:center.z+(e.clientY-rect.top-h/2)/scale};
  const nearest=sites.reduce((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)<Math.hypot(b.x-p.x,b.z-p.z)?a:b);
  pick(Math.hypot(nearest.x-p.x,nearest.z-p.z)*scale<12?nearest:{...p,name:'Ponto marcado'})};
 const magnify=(factor:number)=>{zoom=Math.max(.65,Math.min(160,zoom*factor));draw()};
 canvas.onwheel=e=>{e.preventDefault();magnify(e.deltaY<0?1.35:1/1.35)};
 function action(key:string,fn:()=>void){dialog.querySelector<HTMLButtonElement>('[data-'+key+']')!.onclick=fn}
 action('in',()=>magnify(1.5));action('out',()=>magnify(1/1.5));action('close',()=>dialog.close());
 action('all',()=>{center={x:(bounds.left+bounds.right)/2,z:(bounds.top+bounds.bottom)/2};zoom=1;draw()});
 action('center',()=>{center={x:player().x,z:player().z};zoom=Math.max(zoom,4);draw()});
 action('go',()=>{if(selected){gps.mark(selected);sync();dialog.close()}});
 action('clear',()=>{gps.cancel();sync();selected=null;preview=null;select.value='';info.textContent='GPS cancelado';dialog.querySelector<HTMLButtonElement>('[data-go]')!.disabled=true;draw()});
 new ResizeObserver(draw).observe(canvas);
 return {dialog,open(){sync();dialog.showModal();preview=null;selected=gps.goal;select.value='';if(selected)pick(selected);else{info.textContent='Selecione um local ou toque perto de uma estrada.';dialog.querySelector<HTMLButtonElement>('[data-go]')!.disabled=true}draw()}};
}
