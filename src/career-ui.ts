import {adventure} from './adventure-tuning';
import {destination,renewMarket,tripById,visitStop} from './adventures';
import {adventureMenu} from './adventure-menu';
import {eligibleFreight,acceptJob,weightLimit,jobKg,carriedKg,buyVehicle,bikePrices,arrive,capacity,cash,DELIVERY_RADIUS,distance,equipment,offer,prices,repairPrice,purchase,target,type Job,type Site,type Career,type Condition,type openCareer} from './career';
import {PALETTE} from './paint';
import {freightDistance,villages,specials,stations} from './terrain';
import {getVehicle,type VehicleId} from './vehicles';
import type {Roadside} from './roadside';

export function careerUI(store:ReturnType<typeof openCareer>,npc:Roadside,shops:Site[],depots:Site[],dealers:Site[],id:()=>VehicleId,parked:()=>boolean,position:()=>Site,pause:()=>void,resume:()=>void,notify:(s:string)=>void,refresh:()=>void,paint:(color:string)=>void,currentColor:()=>string){
 const dialog=document.createElement('dialog');dialog.className='career-dialog';document.body.append(dialog);
 const prompt=document.createElement('button');prompt.className='career-action';prompt.hidden=true;document.querySelector('#hud')!.append(prompt);
 const wallet=document.getElementById('wallet')!,mission=document.getElementById('job-target')!;
 const guidance=document.createElement('div');guidance.className='delivery-guide';guidance.hidden=true;document.querySelector('#hud')!.append(guidance);
 let busy=false,mode='',site:Site|null=null;
 const gear=()=>equipment(store.state,id());
 function close(){dialog.close()}
 let marketTimer:ReturnType<typeof setTimeout>|undefined;
 dialog.onclose=()=>{clearTimeout(marketTimer);refresh();resume()};
 function button(text:string,fn:()=>void,parent:HTMLElement=dialog){
  const b=document.createElement('button');b.textContent=text;b.onclick=fn;parent.append(b);return b;
 }
 function line(tag:string,text:string){const e=document.createElement(tag);e.textContent=text;dialog.append(e)}
 async function transaction(fn:(s:Career)=>void,msg:string,finish=true){
  if(busy)return;busy=true;
  try{await store.change(fn);refresh();wallet.textContent='👛 '+cash(store.state.money);notify(msg);if(finish)close()}
  catch(e){notify((e as Error).message);const feedback=dialog.querySelector('output');if(feedback)feedback.textContent=(e as Error).message}
  finally{busy=false}
 }
 function accept(j:Job){
  void transaction(s=>acceptJob(s,j),'Siga o marcador dourado e pare dentro do círculo');
 }
 function showJob(j:Job){
  line('h3',j.name);line('p',j.from.name+' → '+j.to.name+(j.returning?' → retorno':'')+' · '+(freightDistance(j.from,j.to)*(j.returning?2:1)/1000).toFixed(1)+' km aprox.');
  const b=button('Aceitar · '+j.load+' L · '+jobKg(j)+' kg · '+cash(j.pay),()=>accept(j));b.disabled=j.load>capacity(gear())||jobKg(j)>weightLimit(gear())||!!store.state.expedition&&!store.state.expedition.paused;
 }
 function open(){
  if(!site||!mode||!parked()||dialog.open)return;
  pause();dialog.showModal();render();
 }
 function manage(){
  mode='Viagens e carga';site=position();dialog.showModal();render('trips');
 }
 async function showUsed(){
  try{if(store.state.market?.pricing!==2||store.state.market.until<=Date.now())await store.change(s=>renewMarket(s));if(dialog.open&&mode==='Concessionária')render('used')}
  catch{notify('Falha ao carregar anúncios')}
 }
 function render(tab=''){
  clearTimeout(marketTimer);
  if(!site)return;
  if(tab==='used'&&store.state.market)marketTimer=setTimeout(showUsed,Math.max(1,store.state.market.until-Date.now()));
  dialog.replaceChildren();line('h2',mode);line('p',site.name+' · '+cash(store.state.money));
  if(mode==='Oficina'){
   button('Serviços',()=>render());button('Preparação',()=>render('prep'));
   line('p','Quilometragem · '+(gear().km??0).toFixed(1)+' km');
  }
  if(mode==='Concessionária'){
   button('Novas',()=>render());button('Usadas',showUsed);
  }
  if(mode==='Fretes')button('Expedições',()=>render('trips'));
  if(tab)adventureMenu(tab,store,id(),line,button,(fn,msg)=>void transaction(fn,msg));
  else if(mode==='Concessionária'){
   line('p','A compra adiciona a moto à sua garagem. Selecione a moto pelo menu de pausa.');
   for(const id of (Object.keys(bikePrices) as (keyof typeof bikePrices)[]).sort((a,b)=>bikePrices[a]-bikePrices[b])){
    const v=getVehicle(id),owned=store.state.owned.includes(id),price=bikePrices[id];
    const label=owned?'Na garagem':cash(price);
    button(v.name+' · '+label,()=>void transaction(s=>buyVehicle(s,v.id),v.name+' na garagem')).disabled=owned||store.state.money<price;
   }
  }else if(mode==='Oficina'){
   const install=(label:string,price:number,action:(g:ReturnType<typeof gear>)=>void)=>button(label+' · '+cash(price),()=>void transaction(s=>purchase(s,price,()=>action(equipment(s,id()))),'Serviço concluído'));
   line('h3','Manutenção');
   for(const part of ['motor','freios','pneus'] as Condition[]){
    const value=gear()[part],cost=repairPrice(value);
    install(part+' · '+value.toFixed(1)+'%',cost,g=>{if(g[part]>=100)throw Error('Componente em dia');g[part]=100}).disabled=value>=100;
   }
   line('h3','Personalização');
   const preview=document.createElement('input');preview.type='color';preview.value=currentColor();preview.oninput=()=>paint(preview.value);preview.setAttribute('aria-label','Prévia da pintura');dialog.append(preview);
   const palette=document.createElement('div');palette.className='paint-palette';dialog.append(palette);
   for(const color of PALETTE){const b=button('',()=>{preview.value=color;paint(color)},palette);b.style.background=color;b.setAttribute('aria-label',color)}
   install('Pintar',prices.paint,g=>{g.color=preview.value});
   line('h3','Acessórios');install(gear().box?'Baú instalado':'Instalar baú de 12 L',prices.box,g=>{if(g.box)throw Error('Baú já instalado');g.box=true}).disabled=gear().box;
   line('h3','Pneus');for(const tyre of ['pista','trilha'] as const)install('Instalar pneu de '+tyre,prices.tyre,g=>{if(g.tyre===tyre)throw Error('Pneu já instalado');g.tyre=tyre;g.pneus=100}).disabled=gear().tyre===tyre;
  }else if(mode==='Fretes'){
   line('p','Carga atual · '+carriedKg(store.state.job,id())+' / '+weightLimit(gear())+' kg · volume '+capacity(gear())+' L');
   const destinations=[...villages,...specials].filter(p=>eligibleFreight(site!,p)).sort(()=>0.5-Math.random());
   for(const [i,load] of [1,2,8].entries())showJob(offer(['Documentos','Ferramentas','Caixa de mantimentos'][i],site,destinations[i],load,id(),false,destinations[i].kind==='farm'));
  }else{
   const kind=npc.kind;
   line('p',['Minha gasolina acabou. Pode buscar um galão no posto?','Minha moto parou. Pode buscar uma peça na oficina?','Pode levar esta encomenda à vila?'][kind]);
   const choices=kind===0?stations:kind===1?shops:villages.filter(v=>eligibleFreight(site!,v));
   const dest=choices.reduce((a,b)=>distance(site!,a)<distance(site!,b)?a:b);
   showJob(offer(['Buscar gasolina','Buscar peça','Encomenda urgente'][kind],site,dest,2,id(),kind!==2));
  }
  line('output','');button(mode==='Ajudar motociclista'?'Recusar':'Fechar',()=>{if(mode==='Ajudar motociclista')npc.clear();close()});
 }
 prompt.onclick=open;
 window.addEventListener('keydown',e=>{if(e.code==='KeyG'&&!e.repeat&&!prompt.hidden&&document.querySelector('#hud')?.classList.contains('hidden')===false)open()});
 return {dialog,open,manage,update(active:boolean){
  if(dialog.open)return;
  const s=store.state,j=s.job,p=position();
  wallet.textContent='👛 '+cash(s.money);
  const nearestDepot=depots.reduce((a,b)=>distance(p,a)<distance(p,b)?a:b);
  const meters=j?distance(p,target(j)):Infinity;
  const range=meters<1000?Math.round(meters)+' m':(meters/1000).toFixed(1)+' km';
  mission.textContent=j?j.name+' · '+target(j).name+' · '+range:s.money===0?'Fretes · '+nearestDepot.name.replace('Fretes · ','')+' · '+(distance(p,nearestDepot)/1000).toFixed(1)+' km':'';
  const exp=s.expedition,checkpoint=!j&&exp&&!exp.paused?destination(s):undefined;
  if(exp&&checkpoint){
   const d=distance(p,checkpoint);
   mission.textContent='Etapa '+(exp.next+1)+'/'+tripById(exp.id)!.stops.length+' · '+checkpoint.name+' · '+Math.round(d)+' m';
   if(active&&!busy&&d<=adventure.trips.radius){
    busy=true;let msg='';
    void store.change(state=>{msg=visitStop(state,exp.id,exp.next,position())}).then(()=>{if(msg)notify(msg)}).catch(()=>notify('Falha ao salvar etapa')).finally(()=>{busy=false});
   }
  }
  const inside=meters<=DELIVERY_RADIUS;
  guidance.hidden=!active||!j||meters>150;
  if(j&&!guidance.hidden){
   const action=j.pickup?'retirar o item':'entregar a carga';
   guidance.textContent=id()!==j.vehicle?'Volte com a moto do trabalho':inside?'Pare aqui para '+action+' automaticamente':'Pare no círculo dourado para '+action+' · '+range;
  }
  const shop=shops.find(o=>distance(o,p)<7),depot=depots.find(o=>distance(o,p)<7),nearNpc=npc.site&&distance(npc.site,p)<6;
  const dealer=dealers.find(o=>distance(o,p)<8);
  if(active&&!j&&(!dealer||!parked())&&dealers.some(o=>distance(o,p)<24)){
   guidance.hidden=false;
   guidance.textContent='Concessionária · pare em frente à vitrine para ver as motos';
  }
  mode=dealer?'Concessionária':shop?'Oficina':!j&&nearNpc?'Ajudar motociclista':!j&&depot?'Fretes':'';
  site=dealer||shop||(nearNpc?npc.site:null)||depot||null;
  prompt.hidden=!active||!parked()||!mode||inside;prompt.textContent=mode+' · G / A';
  if(active&&parked()&&j&&id()===j.vehicle&&inside&&!busy){
   busy=true;let message='';void store.change(state=>{message=arrive(state,j.id,p)}).then(()=>{if(message)notify(message);refresh()}).catch(()=>notify('Falha ao salvar trabalho')).finally(()=>{busy=false});
  }
 }};
}
