import type {Place} from './map-layout';

const STORAGE_KEY='explored-places-v1';
type StorageAdapter=Pick<Storage,'getItem'|'setItem'>;
export const DISCOVERY_SOUND_DURATION=3;

export class ExplorationProgress {
 private readonly knownNames:Set<string>;
 private readonly discoveredNames:Set<string>;

 constructor(private readonly places:readonly Place[],private readonly storage?:StorageAdapter){
  this.knownNames=new Set(places.map(place=>place.name));
  this.discoveredNames=this.load();
 }

 get discoveredCount(){return this.discoveredNames.size}
 get totalCount(){return this.places.length}

 isDiscovered(name:string){return this.discoveredNames.has(name)}

 discover(name:string){
  if(!this.knownNames.has(name)||this.discoveredNames.has(name))return false;
  this.discoveredNames.add(name);
  this.save();
  return true;
 }

 list(){return this.places.map(place=>({place,discovered:this.discoveredNames.has(place.name)}))}

 private load(){
  try{
   const storage=this.storage??window.localStorage;
   const parsed:unknown=JSON.parse(storage.getItem(STORAGE_KEY)||'[]');
   if(!Array.isArray(parsed))return new Set<string>();
   return new Set(parsed.filter((name):name is string=>typeof name==='string'&&this.knownNames.has(name)));
  }catch(error){
   console.warn('Não foi possível carregar os locais explorados.',error);
   return new Set<string>();
  }
 }

 private save(){
  try{
   const storage=this.storage??window.localStorage;
   storage.setItem(STORAGE_KEY,JSON.stringify([...this.discoveredNames]));
  }catch(error){
   console.warn('Não foi possível salvar os locais explorados.',error);
  }
 }
}

export function mountExplorationPanel(places:readonly Place[],progress:ExplorationProgress,onOpen=()=>{},onClose=()=>{}){
 const app=document.querySelector<HTMLDivElement>('#app')!;
 const openButton=document.createElement('button');
 openButton.id='exploration-open';
 openButton.className='exploration-open';
 openButton.type='button';
 openButton.setAttribute('aria-label','Ver locais explorados');
 openButton.innerHTML='<span>LOCAIS</span><strong id="exploration-count"></strong>';
 document.querySelector('header')!.insertBefore(openButton,document.getElementById('pause'));

 const panel=document.createElement('section');
 panel.id='exploration-panel';
 panel.className='overlay hidden';
 panel.setAttribute('aria-labelledby','exploration-title');
 const sheet=document.createElement('div');
 sheet.className='sheet exploration-sheet';
 const eyebrow=document.createElement('span');
 eyebrow.className='eyebrow';
 eyebrow.textContent='SEU CAMINHO PELO VALE';
 const title=document.createElement('h2');
 title.id='exploration-title';
 title.textContent='Locais explorados';
 const summary=document.createElement('p');
 summary.id='exploration-summary';
 const list=document.createElement('ul');
 list.className='exploration-list';
 for(const {place,discovered} of progress.list()){
  const item=document.createElement('li');
  item.dataset.discovered=String(discovered);
  const name=document.createElement('span');
  name.textContent=place.name;
  const state=document.createElement('span');
  state.className='exploration-state';
  state.textContent=discovered?'Descoberto':'Não descoberto';
  item.append(name,state);
  list.appendChild(item);
 }
 const closeButton=document.createElement('button');
 closeButton.type='button';
 closeButton.className='primary';
 closeButton.textContent='Voltar ao passeio';
 sheet.append(eyebrow,title,summary,list,closeButton);
 panel.appendChild(sheet);
 app.appendChild(panel);

 const update=()=>{
  const count=document.getElementById('exploration-count')!;
  count.textContent=`${progress.discoveredCount}/${progress.totalCount}`;
  summary.textContent=`${progress.discoveredCount} de ${progress.totalCount} locais descobertos`;
  for(const [index,{discovered}] of progress.list().entries()){
   const item=list.children.item(index) as HTMLLIElement;
   item.dataset.discovered=String(discovered);
   item.querySelector('.exploration-state')!.textContent=discovered?'Descoberto':'Não descoberto';
  }
 };
 const close=()=>{if(panel.classList.contains('hidden'))return;panel.classList.add('hidden');onClose();openButton.focus()};
 openButton.addEventListener('click',()=>{onOpen();panel.classList.remove('hidden');closeButton.focus()});
 closeButton.addEventListener('click',close);
 panel.addEventListener('click',event=>{if(event.target===panel)close()});
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){close();event.stopPropagation()}});
 update();
 return {update,close,get isOpen(){return !panel.classList.contains('hidden')}};
}
