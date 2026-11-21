import {parts,partPrice,originalPrep,type Part} from './adventure-tuning';
import {buyUsed,installPart,startTrip,pauseTrip,trips} from './adventures';
import {cancelJob,carriedKg,cash,equipment,weightLimit,target,type Career,type openCareer} from './career';
import {getVehicle,type VehicleId} from './vehicles';

export function adventureMenu(tab:string,store:ReturnType<typeof openCareer>,id:VehicleId,line:(tag:string,text:string)=>void,button:(label:string,click:()=>void)=>HTMLButtonElement,act:(fn:(s:Career)=>void,msg:string)=>void){
 const s=store.state,g=equipment(s,id);
 if(tab==='trips'){
  line('p','Carga atual · '+carriedKg(s.job,id)+' / '+weightLimit(g)+' kg');
  if(s.job){
   const jobId=s.job.id;line('p',s.job.name+' → '+target(s.job).name);
   button('Cancelar entrega',()=>act(state=>cancelJob(state,jobId),'Entrega cancelada'));
  }
  for(const t of trips){
   line('h3',t.name);line('p',t.description+' '+t.difficulty+' · '+t.km.toFixed(1)+' km entre pontos · '+cash(t.pay));
   line('p',t.stops.map(p=>p.name).join(' → '));
   const e=s.expedition;
   if(e?.id===t.id){
    line('p','Etapa '+(e.next+1)+' de '+t.stops.length+' · '+t.stops[e.next].name);
    button(e.paused?'Retomar':'Interromper',()=>act(state=>pauseTrip(state,t.id,!e.paused),e.paused?'Expedição retomada':'Progresso da expedição salvo')).disabled=e.paused&&!!s.job;
   }else button(s.completedTrips?.includes(t.id)?'Concluída':'Iniciar expedição',()=>act(state=>startTrip(state,t.id),'Siga até '+t.stops[0].name)).disabled=!!e||!!s.job||!!s.completedTrips?.includes(t.id);
  }
 }else if(tab==='prep'){
  const prep=g.prep??originalPrep();
  for(const [slot,title] of [['engine','Motor'],['gearing','Relação'],['suspension','Suspensão'],['brakes','Freios']] as const){
   line('h3',title);
   for(const part of ['original',...(Object.keys(parts) as Part[]).filter(p=>parts[p].slot===slot)] as const){
    const original=part==='original',label=original?'Original':parts[part].label;
    const price=original||prep.bought.includes(part)?0:partPrice(id,part);
    if(!original)line('p',parts[part].detail);
    const installed=(prep[slot]??'original')===part;
    button(label+' · '+(installed?'Instalado':price?cash(price):'Instalar grátis'),()=>act(state=>installPart(state,id,slot,part),label+' instalado')).disabled=installed||s.money<price;
   }
  }
 }else if(tab==='used'){
  const listings=s.market?.list.filter(l=>!s.owned.includes(l.vehicle))??[];
  if(!listings.length)line('p','Nenhum anúncio disponível neste lote.');
  if(s.market)line('p','Renovação às '+new Date(s.market.until).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
  for(const l of listings){
   line('h3',getVehicle(l.vehicle).name);
   const mean=(l.motor+l.pneus+l.freios)/3;
   line('p',l.km.toLocaleString('pt-BR')+' km · '+(mean>=75?'Bom estado':'Estado regular')+' · Cor '+l.color);
   line('p','Motor '+l.motor+'% · Freios '+l.freios+'% · Pneus '+l.pneus+'%');
   button('Comprar · '+cash(l.price),()=>act(state=>buyUsed(state,l.id),'Usada adicionada à garagem')).disabled=s.money<l.price;
  }
 }
}
