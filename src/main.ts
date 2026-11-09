import './style.css';
import * as T from 'three';
import {makeWorld,obstacles} from './world';
import {createBike,disposeBike} from './vehicle-models';
import {vehicles,getVehicle,type VehicleId} from './vehicles';
import {Controller} from './input';
import {Ride,steeringAngle} from './riding';
import {FollowCamera} from './camera';
import {Sound} from './audio';
import {load,save} from './persistence';
import {pois,surface,BRIDGE,LOOKOUT} from './terrain';
import {RideNetwork} from './network';
import {RemoteRiders} from './remote-riders';
import {mountInterface} from './interface';
mountInterface();
const el=(id:string)=>document.getElementById(id)!;
const scene=new T.Scene();scene.background=new T.Color(0xc3d5ce);scene.fog=new T.Fog(0xc3d5ce,150,780);const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;el('scene').appendChild(renderer.domElement);
scene.add(new T.HemisphereLight(0xe4f0ea,0x657653,1.5));const sun=new T.DirectionalLight(0xffdeb0,1.8);sun.position.set(-70,140,80);sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=45;sun.shadow.camera.bottom=-45;sun.shadow.camera.near=.1;sun.shadow.camera.far=300;sun.shadow.bias=-.001;scene.add(sun,sun.target);makeWorld(scene);
const settings=load();let bike=createBike(settings.vehicle);scene.add(bike.root);const ride=new Ride(),camera=new FollowCamera(),sound=new Sound(),controller=new Controller();ride.spec=getVehicle(settings.vehicle);sound.vehicle=settings.vehicle;let playing=false,started=false,last=performance.now(),accumulator=0,throttle=0;const keys=new Set<string>(),discovered=new Set<string>();let notifyUntil=0;
const remoteRiders=new RemoteRiders(scene);
const network=new RideNetwork({
 status:text=>{el('online-status').textContent=text;if(network.active)el('connection-badge').textContent=text;},
 welcome:(state,code)=>{
  chooseVehicle(state.vehicleId);ride.x=state.x;ride.z=state.z;ride.heading=state.heading;ride.speed=0;ride.contact();camera.initialized=false;
  const invite=new URL(location.href);invite.search='';invite.hash='';invite.searchParams.set('room',code);(el('invite-link') as HTMLInputElement).value=invite.toString();
  (el('room-code') as HTMLInputElement).value=code;el('invite-area').classList.remove('hidden');el('online').classList.add('hidden');resume();notify(`Você entrou na sala ${code}. Boa viagem!`);
 },
 players:players=>{remoteRiders.update(players);el('online-members').textContent=network.active?`${players.length+1}/4 viajantes · Você${players.length?' · '+players.map(p=>p.name+(p.connected?'':' (reconectando)')).join(' · '):''}`:'';},
 ended:()=>{remoteRiders.clear();el('invite-area').classList.add('hidden');el('connection-badge').textContent='☀ Fim de tarde · Solo';}
});
const inviteCode=new URLSearchParams(location.search).get('room');
if(inviteCode){(el('room-code') as HTMLInputElement).value=inviteCode.toUpperCase().slice(0,8);el('online').classList.remove('hidden');}
try{(el('nickname') as HTMLInputElement).value=localStorage.getItem('ride-nickname')||''}catch{}
function openOnline(){if(playing)pause();el('online').classList.remove('hidden');}
el('online-open').onclick=openOnline;el('online-pause').onclick=openOnline;
el('online-close').onclick=()=>el('online').classList.add('hidden');
for(const [id,type] of [['room-create','create'],['room-join','join']] as const)el(id).onclick=()=>{
 if(network.connecting)return;
 const name=(el('nickname') as HTMLInputElement).value.trim(),code=(el('room-code') as HTMLInputElement).value.trim();
 if(!name){el('online-status').textContent='Informe seu apelido.';return}
 if(type==='join'&&!/^[A-Fa-f0-9]{8}$/.test(code)){el('online-status').textContent='O código tem oito letras/números.';return}
 try{localStorage.setItem('ride-nickname',name)}catch{}
 void sound.start().catch(()=>{});network.connect(type,name,settings.vehicle,code);
};
el('room-leave').onclick=()=>{network.leave();el('online-status').textContent='Você saiu da sala. O passeio solo continua.';};
el('copy-invite').onclick=()=>{const link=(el('invite-link') as HTMLInputElement).value;void navigator.clipboard?.writeText(link).then(()=>el('online-status').textContent='Convite copiado. Envie para seus amigos.').catch(()=>el('online-status').textContent='Selecione o link acima e copie manualmente.');};
// Local-only, reproducible visual QA viewpoints, eliminated from production builds.
if(import.meta.env.DEV){
  const inspect=new URLSearchParams(location.search).get('inspect');
  if(inspect==='ponte'){ride.x=-23;ride.z=BRIDGE.z;ride.heading=Math.PI/2;ride.contact();}
  if(inspect==='mirante'){ride.x=LOOKOUT.x;ride.z=LOOKOUT.z+7;ride.heading=Math.PI;ride.contact();}
}
for(const id of ['vehicle-intro','vehicle-pause']){
 const select=el(id) as HTMLSelectElement;for(const v of vehicles){const option=document.createElement('option');option.value=v.id;option.textContent=v.name;select.appendChild(option)}select.value=settings.vehicle;
 select.onchange=()=>chooseVehicle(select.value as VehicleId);
}
el('vehicle-note').textContent=getVehicle(settings.vehicle).note;
function chooseVehicle(id:VehicleId){
 scene.remove(bike.root);disposeBike(bike);settings.vehicle=id;bike=createBike(id);scene.add(bike.root);ride.spec=getVehicle(id);ride.speed=0;ride.gear=1;ride.lean=0;ride.contact();sound.vehicle=id;camera.initialized=false;
 for(const name of ['vehicle-intro','vehicle-pause'])(el(name) as HTMLSelectElement).value=id;
 el('vehicle-note').textContent=ride.spec.note;save(settings);
}
function toggleCamera(){camera.toggle();(el('camera-mode') as HTMLSelectElement).value=camera.firstPerson?'first':'third'}
el('camera-mode').onchange=()=>{if(((el('camera-mode') as HTMLSelectElement).value==='first')!==camera.firstPerson)toggleCamera()};
for(const name of ['deadzone','sensitivity'] as const){(el(name) as HTMLInputElement).value=String(settings[name]);el(name).oninput=()=>{settings[name]=Number((el(name) as HTMLInputElement).value);save(settings)}}
function quality(){const q=settings.quality;renderer.setPixelRatio(Math.min(devicePixelRatio,q==='baixo'?.8:q==='medio'?1.25:1.7));renderer.shadowMap.enabled=q!=='baixo';renderer.shadowMap.type=T.PCFSoftShadowMap;sun.castShadow=q!=='baixo';camera.camera.far=q==='baixo'?550:900;camera.camera.updateProjectionMatrix();(scene.fog as T.Fog).far=q==='baixo'?500:780;sound.volume=settings.motor;sound.ambience=settings.ambient;save(settings)}quality();
(el('quality') as HTMLSelectElement).value=settings.quality;(el('motor') as HTMLInputElement).value=String(settings.motor);(el('ambient') as HTMLInputElement).value=String(settings.ambient);
el('quality').onchange=e=>{settings.quality=(e.target as HTMLSelectElement).value as typeof settings.quality;quality()};for(const name of ['motor','ambient'] as const)el(name).oninput=e=>{settings[name]=Number((e.target as HTMLInputElement).value);quality()};
function pause(){playing=false;ride.speed=0;keys.clear();network.send({vehicleId:settings.vehicle,x:ride.x,y:ride.y,z:ride.z,heading:ride.heading,speed:0,pitch:ride.pitch,lean:ride.lean,steer:ride.steer},performance.now(),true);el('panel').classList.remove('hidden')}
function resume(){started=true;playing=true;el('intro').classList.add('hidden');el('panel').classList.add('hidden');el('hud').classList.remove('hidden');void sound.start().then(()=>{el('audio-status').textContent='Áudio pronto · gravações CC0'}).catch(()=>{el('audio-status').textContent='Falha ao carregar áudio. Tente continuar novamente.';notify('Não foi possível carregar o áudio.')});last=performance.now();accumulator=0}
function notify(text:string){el('notification').textContent=text;el('notification').classList.add('visible');notifyUntil=performance.now()+4500}
el('start').onclick=resume;el('resume').onclick=resume;el('pause').onclick=pause;el('settings-open').onclick=pause;el('recover').onclick=()=>{ride.recover();camera.initialized=false;resume()};el('home').onclick=()=>{playing=false;ride.speed=0;el('panel').classList.add('hidden');el('intro').classList.remove('hidden');el('hud').classList.add('hidden')};el('credits-open').onclick=()=>el('credits').classList.remove('hidden');el('credits-close').onclick=()=>el('credits').classList.add('hidden');
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;keys.add(e.code);if(e.repeat)return;if(e.code==='Escape'){if(playing)pause();else if(started)resume()}if(e.code==='KeyR'&&playing){ride.recover();camera.initialized=false;notify('De volta à estrada. Boa viagem!')}if(e.code==='KeyH'&&playing)sound.horn();if(e.code==='KeyC'&&playing)toggleCamera()});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(playing)pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause()});
let dragging=false,oldX=0,oldY=0;renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;oldX=e.clientX;oldY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(dragging){camera.orbit-=(e.clientX-oldX)*.006;camera.pitch=T.MathUtils.clamp(camera.pitch-(e.clientY-oldY)*.004,-.65,.65);oldX=e.clientX;oldY=e.clientY}});renderer.domElement.addEventListener('pointerup',()=>{dragging=false});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.camera.aspect=innerWidth/innerHeight;camera.camera.updateProjectionMatrix()});
let hudTimer=0;
function frame(now:number){
 requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.1);last=now;
 const pad=controller.poll(settings.deadzone,settings.sensitivity);
 if(pad.disconnected&&playing){pause();notify('Controle desconectado. Passeio pausado.')}
 if(pad.pause){if(playing)pause();else resume()}
 if(pad.start&&!playing)resume();
 if(!playing&&(pad.previous||pad.next)){const i=vehicles.findIndex(v=>v.id===settings.vehicle);chooseVehicle(vehicles[(i+(pad.next?1:vehicles.length-1))%vehicles.length].id)}
 if(pad.camera&&playing)toggleCamera();if(pad.horn&&playing)sound.horn();
 if(playing){
  accumulator+=dt;throttle=Math.max(keys.has('KeyW')||keys.has('ArrowUp')?1:0,pad.throttle);
  const brake=Math.max(keys.has('KeyS')||keys.has('ArrowDown')?1:0,pad.brake),keyboardTurn=(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0),turn=keyboardTurn||pad.turn,push=keys.has('KeyQ')||pad.push;
  while(accumulator>=1/60){ride.step(1/60,throttle,brake,turn,obstacles,push);accumulator-=1/60}
  for(const p of pois)if(Math.hypot(ride.x-p.x,ride.z-p.z)<24&&!discovered.has(p.name)){discovered.add(p.name);notify(`Novo lugar descoberto · ${p.name}`)}
  camera.orbit-=pad.lookX*dt*2;camera.pitch=T.MathUtils.clamp(camera.pitch-pad.lookY*dt*1.4,-.65,.65);
  if(!dragging&&!pad.lookX&&!pad.lookY){camera.orbit*=Math.exp(-dt*2);camera.pitch*=Math.exp(-dt*2)}
 }
 bike.root.position.set(ride.x,ride.y,ride.z);bike.root.rotation.y=ride.heading;bike.body.rotation.set(-ride.pitch,0,ride.lean);bike.rider.visible=!camera.firstPerson;
 bike.steering.rotation.y=steeringAngle(ride.speed,ride.steer);for(const wheel of bike.wheels)if(playing)wheel.rotation.x+=ride.speed*dt/(settings.vehicle==='caloi'?.29:.27);
 camera.update(ride,dt,ride.spec.eyeHeight);sun.position.set(ride.x-70,ride.y+140,ride.z+80);sun.target.position.set(ride.x,ride.y,ride.z);
 sound.update(ride.speed,ride.gear,ride.pushing?0:throttle,!playing);
 network.send({vehicleId:settings.vehicle,x:ride.x,y:ride.y,z:ride.z,heading:ride.heading,speed:playing?ride.speed:0,pitch:ride.pitch,lean:ride.lean,steer:ride.steer},now);
 remoteRiders.render(now,dt);
 if(now>notifyUntil)el('notification').classList.remove('visible');hudTimer+=dt;
 if(hudTimer>.15){hudTimer=0;el('speed').textContent=String(Math.round(Math.abs(ride.speed)*3.6));el('gear').textContent=ride.speed<-.02?'EMPURRANDO':ride.spec.gears===1?'AUTOMÁTICA':`${ride.gear} · AUTO`;
  const near=pois.reduce((a,b)=>Math.hypot(a.x-ride.x,a.z-ride.z)<Math.hypot(b.x-ride.x,b.z-ride.z)?a:b);el('place').textContent=near.name;el('trip').textContent=`${(ride.distance/1000).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} km · ${surface(ride.x,ride.z)}`;
  el('gamepad-status').textContent=pad.connected?'Controle conectado · mapeamento padrão':'Conecte um controle padrão e pressione um botão.';
 }
 renderer.render(scene,camera.camera);
}
network.restore();
requestAnimationFrame(frame);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;el('error').classList.remove('hidden');el('error').textContent='A conexão com a placa gráfica foi interrompida. Recarregue a página para continuar.'});








