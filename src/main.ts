import {DayCycle,DAY_TUNING} from './day-cycle';
import {applyBikePose} from './bike-pose';
import {coastalBlend} from './coast';
import {loadColors,saveColors,applyBikeColor,PALETTE} from './paint';
import {makeSky,configureShadows,enableShadows} from './graphics';
import './style.css';
import * as T from 'three';
import {makeWorld,obstacles} from './world';
import {createBike,disposeBike} from './vehicle-models';
import {vehicles,getVehicle,type VehicleId} from './vehicles';
import {BrakePushAssist,Controller,touchSteering} from './input';
import {Ride,automaticTuckInput,steeringAngle} from './riding';
import {BODY_TUNING} from './body-control';
import {FollowCamera,CAMERA_TUNING} from './camera';
import {RearViewMirror,assignLocalBikeLayer,enableLocalBikeLayer} from './rear-view-mirror';
import {TireParticles} from './tire-particles';
import {Sound} from './audio';
import {ExplorationProgress,mountExplorationPanel} from './exploration';
import {load,save} from './persistence';
import {pois,surface,ground,LOOKOUT,stations,road,roadLength,nearest,nearestRoute,routes,bridges,specials} from './terrain';
import {RideNetwork} from './network';
import {RemoteRiders} from './remote-riders';
import {river} from './map-layout';
import {mountInterface} from './interface';
import {CarameloMission,CARAMELOS_POSITIONS,CARAMELO_PET_TUNING,createCarameloPet} from './caramelos-mission';
mountInterface();
const el=(id:string)=>document.getElementById(id)!;
const touchInputs={forward:false,back:false,throttle:false,brake:false,left:false,right:false,refuel:false};
let brakeHoldTime=0,brakePushActive=false;
const touchControls=document.createElement('div');touchControls.id='touch-controls';touchControls.innerHTML='<div class="touch-steering"><button type="button" data-touch="left" aria-label="Virar à esquerda">◀</button><button type="button" data-touch="right" aria-label="Virar à direita">▶</button></div><div class="touch-body"><button type="button" data-touch="forward" aria-label="Inclinar corpo para frente">&#8597;</button><button type="button" data-touch="back" aria-label="Puxar corpo e embreagem para empinar">&#8595;</button></div><div class="touch-utilities"><button type="button" data-touch-action="horn" aria-label="Buzinar">H</button><button type="button" data-touch="refuel" aria-label="Abastecer" class="hidden">⛽</button><button type="button" data-touch-action="camera" aria-label="Alternar câmera">◉</button><button type="button" data-touch-action="collect" aria-label="Encontrar caramelo" class="hidden">🐕</button></div><div class="touch-pedals"><button type="button" data-touch="brake" aria-label="Frear; segure parado para empurrar">FREIO</button><button type="button" data-touch="throttle" aria-label="Acelerar">ACELERAR</button></div><div id="touch-shifts" class="touch-shifts hidden"><button type="button" data-touch-action="shift-down" aria-label="Reduzir marcha">−</button><button type="button" data-touch-action="shift-up" aria-label="Subir marcha">+</button></div>';
document.body.appendChild(touchControls);
const clearTouchInputs=()=>{touchInputs.forward=false;touchInputs.back=false;touchInputs.throttle=false;touchInputs.brake=false;touchInputs.left=false;touchInputs.right=false;touchInputs.refuel=false;brakeHoldTime=0;brakePushActive=false;touchControls.querySelectorAll('.pressed').forEach(button=>button.classList.remove('pressed'))};
const scene=new T.Scene();scene.background=new T.Color(0xd2ded3);scene.fog=new T.Fog(0xd2ded3,150,780);const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;el('scene').appendChild(renderer.domElement);
const ambientLight=new T.HemisphereLight(0xd5e7f2,0x73835c,.85);scene.add(ambientLight);const sun=new T.DirectionalLight(0xffe0b5,2.5);sun.position.set(-70,140,80);sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=45;sun.shadow.camera.bottom=-45;sun.shadow.camera.near=.1;sun.shadow.camera.far=300;sun.shadow.bias=-.001;scene.add(sun,sun.target);const world=makeWorld(scene),sky=makeSky(scene),dayCycle=new DayCycle(scene,sun,ambientLight,sky);
const settings=load(),bikeColors=loadColors();let bike=createBike(settings.vehicle);assignLocalBikeLayer(bike.root);applyBikeColor(bike,bikeColors[settings.vehicle]);enableShadows(bike.root);scene.add(bike.root);const ride=new Ride(),camera=new FollowCamera(),sound=new Sound(),controller=new Controller(),brakePushAssist=new BrakePushAssist();enableLocalBikeLayer(camera.camera);ride.spec=getVehicle(settings.vehicle);sound.vehicle=settings.vehicle;let playing=false,started=false,last=performance.now(),accumulator=0,throttle=0;const keys=new Set<string>();let notifyUntil=0,wheelieDebugTimer=0,fallEventHandled=false;const wheelieDebugEnabled=import.meta.env.DEV&&new URLSearchParams(location.search).get('debug-wheelie')==='1';
const rearMirror=new RearViewMirror(renderer,el('rear-mirror'),{enabled:settings.rearMirror,fps:settings.rearMirrorFps,width:settings.rearMirrorWidth});
const tireParticles=new TireParticles(scene);tireParticles.points.layers.set(1);
let explorationWasPlaying=false;
const exploration=new ExplorationProgress(pois),explorationPanel=mountExplorationPanel(pois,exploration,()=>{explorationWasPlaying=playing;if(playing){pause();el('panel').classList.add('hidden')}},()=>{keys.clear();if(explorationWasPlaying&&!document.hidden)resume()});
const caramelosMission=new CarameloMission();
const missionStatus=document.createElement('div');missionStatus.className='mission-panel';missionStatus.innerHTML='<span>CARAMELOS</span><strong id="caramelos-count"></strong><small id="caramelos-remaining"></small>';
document.querySelector('footer')?.appendChild(missionStatus);
const missionInteraction=document.createElement('button');missionInteraction.id='mission-interaction';missionInteraction.className='mission-interaction hidden';missionInteraction.type='button';missionInteraction.textContent='Encontrar caramelo · F';document.body.appendChild(missionInteraction);
const worldCaramelos=new Map(CARAMELOS_POSITIONS.map((spot)=>{
 const anchor=new T.Group();anchor.name=`${spot.id}-anchor`;anchor.position.set(spot.x,ground(spot.x,spot.z),spot.z);anchor.scale.setScalar(CARAMELO_PET_TUNING.scale);scene.add(anchor);
 const pet=createCarameloPet(anchor);pet.setUnlocked(!caramelosMission.hasSpot(spot.id));
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const context=canvas.getContext('2d')!;context.fillStyle='#edce92';context.beginPath();context.arc(48,48,42,0,Math.PI*2);context.fill();context.fillStyle='#24453f';context.font='bold 64px sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText('!',48,50);
 const texture=new T.CanvasTexture(canvas),marker=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthTest:true}));marker.name=`${spot.id}-hint`;marker.position.y=1;marker.scale.set(.46,.46,1);marker.visible=!caramelosMission.hasSpot(spot.id)&&(settings.carameloMapMode==='easy'||caramelosMission.isDiscovered(spot.id));anchor.add(marker);
 return [spot.id,{anchor,pet,marker}] as const;
}));
bike.pet.setUnlocked(caramelosMission.petUnlocked);
let nearbyCaramelo:string|undefined;
function updateMissionHud(){
 const found=caramelosMission.foundCount,remaining=caramelosMission.total-found;
 el('caramelos-count').textContent=`${found} encontrado${found===1?'':'s'}`;
 el('caramelos-remaining').textContent=`Falta${remaining===1?'':'m'} ${remaining}`;
}
updateMissionHud();
if(import.meta.env.DEV){const q=new URLSearchParams(location.search).get('quality');if(q==='baixo'||q==='medio'||q==='alto')settings.quality=q;}
ride.fuel.restore();
window.addEventListener('pagehide',()=>ride.fuel.save());
const remoteRiders=new RemoteRiders(scene);
const network=new RideNetwork({
 horn:id=>{if(!document.hidden)sound.remoteHorn(id)},
 status:text=>{el('online-status').textContent=text;if(network.active)el('connection-badge').textContent=text;},
 welcome:(state,code)=>{
  chooseVehicle(state.vehicleId);ride.x=state.x;ride.z=state.z;ride.heading=state.heading;ride.speed=0;ride.fallen=!!state.fallen;ride.wheelie=ride.fallen?(state.wheelie??BODY_TUNING.loopOutAngle):0;ride.contact();camera.initialized=false;
  const invite=new URL(location.href);invite.search='';invite.hash='';invite.searchParams.set('room',code);(el('invite-link') as HTMLInputElement).value=invite.toString();
  (el('room-code') as HTMLInputElement).value=code;el('invite-area').classList.remove('hidden');el('online').classList.add('hidden');resume();notify(`Você entrou na sala ${code}. Boa viagem!`);
 },
 players:players=>{remoteRiders.update(players);sound.setRemotePlayers(players);el('online-members').textContent=network.active?`${players.length+1}/4 viajantes · Você${players.length?' · '+players.map(p=>p.name+(p.connected?'':' (reconectando)')).join(' · '):''}`:'';},
 ended:()=>{remoteRiders.clear();sound.setRemotePlayers([]);el('invite-area').classList.add('hidden');el('connection-badge').textContent='Solo';}
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
  if(inspect==='posto'){ride.x=stations[0].x;ride.z=stations[0].z+8;ride.heading=Math.PI;ride.contact();}
  if(inspect==='mirante'){ride.x=LOOKOUT.x;ride.z=LOOKOUT.z+7;ride.heading=Math.PI;ride.contact();}
  if(inspect==='ponte'){const b=bridges[0];ride.x=b.x-b.dx*38;ride.z=b.z-b.dz*38;ride.heading=Math.atan2(b.dx,b.dz);ride.contact();}
  if(inspect==='terra'){const t=routes.find(t=>t.id==='farm')!,p=t.points[150],q=t.points[151];ride.x=p.x;ride.z=p.z;ride.heading=Math.atan2(q.x-p.x,q.z-p.z);ride.contact();}
  if(inspect==='camping'||inspect==='cachoeira'){const p=specials.find(p=>p.kind===(inspect==='camping'?'camp':'waterfall'))!;ride.x=p.x;ride.z=p.z+18;ride.heading=inspect==='camping'?Math.PI:2.45;ride.contact();}
  if(inspect==='centro'){const t=routes.find(t=>t.id==='north')!,p=t.points.at(-12)!,q=t.points.at(-11)!;ride.x=p.x;ride.z=p.z;ride.heading=Math.atan2(q.x-p.x,q.z-p.z);ride.contact();}
  if(['posto','mirante','ponte','terra','centro','camping','cachoeira'].includes(inspect||'')){el('intro').classList.add('hidden');el('hud').classList.remove('hidden');}
}
for(const id of ['vehicle-intro','vehicle-pause']){
 const select=el(id) as HTMLSelectElement;for(const v of vehicles){const option=document.createElement('option');option.value=v.id;option.textContent=v.name;select.appendChild(option)}select.value=settings.vehicle;
 select.onchange=()=>chooseVehicle(select.value as VehicleId);
}
el('vehicle-note').textContent=getVehicle(settings.vehicle).note;
function syncPaint(){for(const id of ['paint-intro','paint-pause'])(el(id) as HTMLInputElement).value=bikeColors[settings.vehicle]}
function paint(color:string){bikeColors[settings.vehicle]=color;applyBikeColor(bike,color);saveColors(bikeColors);syncPaint()}
for(const suffix of ['intro','pause']){el('paint-'+suffix).oninput=e=>paint((e.target as HTMLInputElement).value);for(const color of PALETTE){const b=document.createElement('button');b.style.background=color;b.title=color;b.setAttribute('aria-label','Pintar '+color);b.onclick=()=>paint(color);el('palette-'+suffix).appendChild(b)}}syncPaint();
let inspectHour:number|undefined;
// Reproducible local-only inspection views for models, rider and new regions.
if(import.meta.env.DEV){const q=new URLSearchParams(location.search),view=q.get('inspect'),v=q.get('vehicle');if(q.has('hour')){const hour=Number(q.get('hour'));if(Number.isFinite(hour))inspectHour=((hour%24)+24)%24;}if(vehicles.some(b=>b.id===v))chooseVehicle(v as VehicleId);
 if(view==='wheelie'||view==='tuck'){ride.bodyLean=view==='wheelie'?-1:1;ride.wheelie=view==='wheelie'?Math.PI/4:0;ride.speed=10;camera.orbit=1.1}
 if(view==='coast'){ride.x=6090;ride.z=-250;ride.heading=Math.PI/2;ride.contact()}
 if(view==='dry'){ride.x=3800;ride.z=-2200;ride.heading=.5;ride.contact()}
 if(view==='model'||view==='first'||view==='firstdown'||view==='lean'){camera.orbit=view==='first'||view==='firstdown'?0:1.1;if(view==='first'||view==='firstdown'){camera.toggle();camera.pitch=view==='firstdown'?-1.0:0}if(view==='lean'){ride.speed=12;ride.steer=.7}}
 if(['coast','dry','model','first','firstdown','lean','wheelie','tuck'].includes(view||'')){el('intro').classList.add('hidden');el('hud').classList.remove('hidden')}
}
function chooseVehicle(id:VehicleId){
 scene.remove(bike.root);disposeBike(bike);settings.vehicle=id;bike=createBike(id);bike.pet.setUnlocked(caramelosMission.petUnlocked);assignLocalBikeLayer(bike.root);applyBikeColor(bike,bikeColors[settings.vehicle]);enableShadows(bike.root);scene.add(bike.root);ride.spec=getVehicle(id);ride.speed=0;ride.fallen=false;fallEventHandled=false;ride.engine.reset();ride.lean=0;ride.resetBody();ride.contact();sound.vehicle=id;camera.initialized=false;
 for(const name of ['vehicle-intro','vehicle-pause'])(el(name) as HTMLSelectElement).value=id;
 el('vehicle-note').textContent=ride.spec.note;syncPaint();save(settings);
}
let lastHonk=-Infinity;
function honk(){const now=performance.now();if(now-lastHonk<400)return;lastHonk=now;sound.horn();network.horn()}
function toggleCamera(){camera.toggle();(el('camera-mode') as HTMLSelectElement).value=camera.firstPerson?'first':'third'}
el('camera-mode').onchange=()=>{if(((el('camera-mode') as HTMLSelectElement).value==='first')!==camera.firstPerson)toggleCamera()};
const mirrorEnabled=el('rear-mirror-enabled') as HTMLInputElement;mirrorEnabled.checked=settings.rearMirror;mirrorEnabled.onchange=()=>{settings.rearMirror=mirrorEnabled.checked;rearMirror.setEnabled(settings.rearMirror);save(settings)};
const mirrorFps=el('rear-mirror-fps') as HTMLSelectElement;mirrorFps.value=String(settings.rearMirrorFps);mirrorFps.onchange=()=>{settings.rearMirrorFps=Number(mirrorFps.value) as typeof settings.rearMirrorFps;rearMirror.setConfiguration({fps:settings.rearMirrorFps});save(settings)};
const mirrorResolution=el('rear-mirror-resolution') as HTMLSelectElement;mirrorResolution.value=String(settings.rearMirrorWidth);mirrorResolution.onchange=()=>{settings.rearMirrorWidth=Number(mirrorResolution.value) as typeof settings.rearMirrorWidth;rearMirror.setConfiguration({width:settings.rearMirrorWidth});save(settings)};
for(const name of ['deadzone','sensitivity'] as const){(el(name) as HTMLInputElement).value=String(settings[name]);el(name).oninput=()=>{settings[name]=Number((el(name) as HTMLInputElement).value);save(settings)}}
const transmission=el('transmission') as HTMLSelectElement,manualShiftHelp=el('manual-shift-help'),transmissionControls=el('transmission-controls');
transmission.value=settings.transmission;
function updateTransmissionUi(){const manual=settings.transmission==='manual';manualShiftHelp.classList.toggle('hidden',!manual);el('touch-shifts').classList.toggle('hidden',!manual);transmissionControls.textContent=manual?'Manual: PageUp/PageDown ou direcional ↑/↓ no controle.':'Automático: trocas gerenciadas pelo motor.'}
transmission.onchange=()=>{settings.transmission=transmission.value as typeof settings.transmission;updateTransmissionUi();save(settings)};
updateTransmissionUi();
const ridingMode=el('riding-mode') as HTMLSelectElement,ridingModeHelp=el('riding-mode-help');
ridingMode.value=settings.ridingMode;
function updateRidingModeUi(){ridingModeHelp.textContent=settings.ridingMode==='realistic'?'Realista: torque, RPM ligado à roda e embreagem centrífuga. Marchas altas podem engasgar em baixa velocidade.':'Arcade: pilotagem simplificada com aceleração e empinada facilitadas.'}
ridingMode.onchange=()=>{settings.ridingMode=ridingMode.value as typeof settings.ridingMode;updateRidingModeUi();save(settings)};
updateRidingModeUi();
const autoTuck=el('auto-tuck') as HTMLInputElement;autoTuck.checked=settings.autoTuck;autoTuck.onchange=()=>{settings.autoTuck=autoTuck.checked;save(settings)};
const carameloMapMode=el('caramelo-map-mode') as HTMLSelectElement,carameloDiscoveryRadius=el('caramelo-discovery-radius') as HTMLSelectElement;
carameloMapMode.value=settings.carameloMapMode;carameloMapMode.onchange=()=>{settings.carameloMapMode=carameloMapMode.value as typeof settings.carameloMapMode;save(settings)};
carameloDiscoveryRadius.value=String(settings.carameloDiscoveryRadius);carameloDiscoveryRadius.onchange=()=>{settings.carameloDiscoveryRadius=Number(carameloDiscoveryRadius.value) as typeof settings.carameloDiscoveryRadius;save(settings)};
function collectNearbyCaramelo(){
 if(!playing||!nearbyCaramelo)return;
 const found=caramelosMission.collect(nearbyCaramelo);if(!found)return;
 const dog=worldCaramelos.get(found.id);dog?.pet.react();if(dog)setTimeout(()=>dog.pet.setUnlocked(false),800);nearbyCaramelo=undefined;missionInteraction.classList.add('hidden');
 const touchCollect=touchControls.querySelector<HTMLButtonElement>('[data-touch-action="collect"]');touchCollect?.classList.add('hidden');
 updateMissionHud();
 if(caramelosMission.petUnlocked){bike.pet.setUnlocked(true);sound.playDiscovery();notify(`Missão concluída · ${caramelosMission.foundCount}/${caramelosMission.total}. Seu pet agora vai com você!`)}
 else{sound.playDiscovery();notify(`Caramelo encontrado · ${caramelosMission.foundCount}/${caramelosMission.total}`)}
}
missionInteraction.onclick=collectNearbyCaramelo;
for(const button of Array.from(touchControls.querySelectorAll<HTMLButtonElement>('[data-touch]'))){
 const control=button.dataset.touch as keyof typeof touchInputs;
 const release=()=>{touchInputs[control]=false;button.classList.remove('pressed')};
 button.addEventListener('pointerdown',(event:PointerEvent)=>{event.preventDefault();event.stopPropagation();touchInputs[control]=true;button.classList.add('pressed');button.setPointerCapture(event.pointerId)});
 for(const name of ['pointerup','pointercancel','lostpointercapture'] as const)button.addEventListener(name,release);
}
for(const button of Array.from(touchControls.querySelectorAll<HTMLButtonElement>('[data-touch-action]')))button.addEventListener('pointerdown',(event:PointerEvent)=>{
 event.preventDefault();event.stopPropagation();
 switch(button.dataset.touchAction){
  case 'horn':if(playing)honk();break;
  case 'camera':if(playing)toggleCamera();break;
  case 'shift-up':if(playing&&settings.transmission==='manual')ride.engine.requestShift(1,ride.speed,ride.spec,ride.topSpeed,settings.ridingMode==='realistic');break;
  case 'shift-down':if(playing&&settings.transmission==='manual')ride.engine.requestShift(-1,ride.speed,ride.spec,ride.topSpeed,settings.ridingMode==='realistic');break;
   case 'collect':collectNearbyCaramelo();break;
  }
});
function quality(){const q=settings.quality;renderer.setPixelRatio(Math.min(devicePixelRatio,q==='baixo'?.8:q==='medio'?1.25:1.7));configureShadows(renderer,sun,q);camera.camera.far=q==='baixo'?550:900;camera.camera.updateProjectionMatrix();(scene.fog as T.Fog).far=q==='baixo'?500:700;sound.volume=settings.motor;sound.effects=settings.effects;sound.ambience=settings.ambient;save(settings)}quality();
(el('quality') as HTMLSelectElement).value=settings.quality;(el('motor') as HTMLInputElement).value=String(settings.motor);(el('ambient') as HTMLInputElement).value=String(settings.ambient);
el('quality').onchange=e=>{settings.quality=(e.target as HTMLSelectElement).value as typeof settings.quality;quality()};(el('effects') as HTMLInputElement).value=String(settings.effects);for(const name of ['motor','ambient','effects'] as const)el(name).oninput=e=>{settings[name]=Number((e.target as HTMLInputElement).value);quality()};
function pause(){if(!ride.fallen)ride.resetBody();ride.brakeInput=0;ride.fuel.save();playing=false;rearMirror.setActive(false);ride.speed=0;keys.clear();clearTouchInputs();brakePushAssist.reset();touchControls.classList.remove('active');network.send({vehicleId:settings.vehicle,color:bikeColors[settings.vehicle],bodyLean:ride.bodyLean,wheelie:ride.wheelie,fallen:ride.fallen,braking:false,petUnlocked:caramelosMission.petUnlocked,revMatchSequence:ride.engine.revMatchSequence,x:ride.x,y:ride.y,z:ride.z,heading:ride.heading,speed:0,pitch:ride.pitch,lean:ride.lean,steer:ride.steer},performance.now(),true);el('panel').classList.remove('hidden')}
function resume(){started=true;playing=true;rearMirror.setActive(true);el('intro').classList.add('hidden');el('panel').classList.add('hidden');el('hud').classList.remove('hidden');touchControls.classList.add('active');void sound.start().then(()=>{el('audio-status').textContent='Áudio pronto'}).catch(()=>{el('audio-status').textContent='Falha ao carregar áudio. Tente continuar novamente.';notify('Não foi possível carregar o áudio.')});last=performance.now();accumulator=0}
function notify(text:string){el('notification').textContent=text;el('notification').classList.add('visible');notifyUntil=performance.now()+4500}
el('fuel-rescue').onclick=()=>{if(ride.fuel.rescue(settings.vehicle)){ride.fuel.save();notify('Ajuda chegou: 0,7 L para alcançar um posto.')}else notify('O socorro fica disponível quando o tanque esvaziar.');};
el('start').onclick=resume;el('resume').onclick=resume;el('pause').onclick=pause;el('settings-open').onclick=pause;el('recover').onclick=()=>{ride.recover();camera.initialized=false;resume()};el('home').onclick=()=>{playing=false;rearMirror.setActive(false);ride.speed=0;touchControls.classList.remove('active');clearTouchInputs();el('panel').classList.add('hidden');el('intro').classList.remove('hidden');el('hud').classList.add('hidden')};el('credits-open').onclick=()=>el('credits').classList.remove('hidden');el('credits-close').onclick=()=>el('credits').classList.add('hidden');
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','PageUp','PageDown'].includes(e.code))e.preventDefault();if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;keys.add(e.code);if(e.repeat)return;if(explorationPanel.isOpen){if(e.code==='Escape')explorationPanel.close();return}if(e.code==='Escape'){if(playing)pause();else if(started)resume()}if(playing&&settings.transmission==='manual'){if(e.code==='PageUp')ride.engine.requestShift(1,ride.speed,ride.spec,ride.topSpeed,settings.ridingMode==='realistic');if(e.code==='PageDown')ride.engine.requestShift(-1,ride.speed,ride.spec,ride.topSpeed,settings.ridingMode==='realistic')}if(e.code==='KeyF'&&playing)collectNearbyCaramelo();if(e.code==='KeyR'&&playing){ride.recover();camera.initialized=false;notify('De volta à estrada. Boa viagem!')}if(e.code==='KeyH'&&playing)honk();if(e.code==='KeyC'&&playing)toggleCamera()});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();clearTouchInputs();if(playing)pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause()});
let dragging=false,oldX=0,oldY=0;renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;oldX=e.clientX;oldY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(dragging){camera.orbit-=(e.clientX-oldX)*.006;camera.pitch=T.MathUtils.clamp(camera.pitch-(e.clientY-oldY)*.004,camera.firstPerson?CAMERA_TUNING.minLookPitch:-.65,CAMERA_TUNING.maxLookPitch);oldX=e.clientX;oldY=e.clientY}});renderer.domElement.addEventListener('pointerup',()=>{dragging=false});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.camera.aspect=innerWidth/innerHeight;camera.camera.updateProjectionMatrix()});

let hudTimer=.2,fuelSaveTimer=0,refueling=false;
const routeCanvas=el('route-map') as HTMLCanvasElement,routeContext=routeCanvas.getContext('2d')!;
function drawMap(){const c=routeContext,w=routeCanvas.width,h=routeCanvas.height;c.clearRect(0,0,w,h);const mapPoints=routes.flatMap(r=>r.points),xs=mapPoints.map(p=>p.x),zs=mapPoints.map(p=>p.z),minX=Math.min(...xs)-150,minZ=Math.min(...zs)-150,scale=Math.min((w-24)/(Math.max(...xs)-minX+150),(h-24)/(Math.max(...zs)-minZ+150)),point=(x:number,z:number)=>[12+(x-minX)*scale,12+(z-minZ)*scale];
 const line=(points:readonly {x:number;z:number}[],color:string,width:number,dashed=false)=>{c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dashed?[3,2]:[]);c.beginPath();points.forEach((p,i)=>{if(i%5&&i!==points.length-1)return;const [x,z]=point(p.x,p.z);if(i===0)c.moveTo(x,z);else c.lineTo(x,z)});c.stroke()};
 line(river,'#78b8c7',2);for(const route of routes)line(route.points,route.surface==='terra'?'#e0ac66':'#d7dfc5',route.id==='main'?1.8:1.2,route.surface==='terra');c.setLineDash([]);
 for(const spot of caramelosMission.visibleSpots(settings.carameloMapMode==='easy')){if(!spot.discovered)continue;const [x,z]=point(spot.x,spot.z);c.fillStyle=spot.found?'#a9d887':'#d9a555';c.beginPath();c.arc(x,z,spot.found?4:3.5,0,Math.PI*2);c.fill();if(!spot.found){c.strokeStyle='#fff0c8';c.lineWidth=1;c.stroke()}}
 for(const s of stations){const [x,z]=point(s.x,s.z);c.fillStyle='#f1cc82';c.fillRect(x-3,z-3,6,6)}const [x,z]=point(ride.x,ride.z);c.fillStyle='#ffffff';c.beginPath();c.arc(x,z,4,0,Math.PI*2);c.fill();}

function frame(now:number){
 requestAnimationFrame(frame);const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;
 world.update(ride.x,ride.z,now);const coast=coastalBlend(ride.x,ride.z),day=dayCycle.update(inspectHour===undefined?network.clock:(inspectHour-DAY_TUNING.startHour+24)%24/24*DAY_TUNING.cycleSeconds*1000,ride.x,ride.y,ride.z,coast,settings.quality==='baixo'?500:700);renderer.toneMappingExposure=.95+coast*.05*day.daylight;bike.headlight.update(day.night);
 const pad=controller.poll(settings.deadzone,settings.sensitivity);
 if(pad.disconnected&&playing){pause();notify('Controle desconectado. Passeio pausado.')}
 const explorationBlocking=explorationPanel.isOpen;
 if(explorationBlocking&&(pad.pause||pad.start))explorationPanel.close();
 else if(pad.pause){if(playing)pause();else resume()}
 if(pad.start&&!playing&&!explorationBlocking)resume();
 if(!playing&&!explorationBlocking&&(pad.previous||pad.next)){const i=vehicles.findIndex(v=>v.id===settings.vehicle);chooseVehicle(vehicles[(i+(pad.next?1:vehicles.length-1))%vehicles.length].id)}
 if(playing&&settings.transmission==='manual'){if(pad.shiftUp)ride.engine.requestShift(1,ride.speed,ride.spec,ride.topSpeed,settings.ridingMode==='realistic');if(pad.shiftDown)ride.engine.requestShift(-1,ride.speed,ride.spec,ride.topSpeed,settings.ridingMode==='realistic')}
 if(pad.camera&&playing)toggleCamera();if(pad.horn&&playing)honk();
 if(playing){
  accumulator+=dt;throttle=Math.max(keys.has('KeyW')||keys.has('ArrowUp')?1:0,pad.throttle,touchInputs.throttle?1:0);
  const brakeRequest=Math.max(keys.has('KeyS')||keys.has('ArrowDown')?1:0,pad.brake,touchInputs.brake?1:0),keyboardTurn=(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0),touchTurn=touchSteering(touchInputs.left,touchInputs.right),turn=keyboardTurn||pad.turn||touchTurn,brakePush=brakePushAssist.update(brakeRequest,ride.speed,dt),push=keys.has('KeyQ')||pad.push||brakePush,brake=push?0:brakeRequest,manualBodyInput=(keys.has('KeyI')||touchInputs.forward?1:0)-(keys.has('KeyK')||touchInputs.back?1:0)||pad.body,bodyInput=settings.autoTuck?automaticTuckInput(manualBodyInput,ride.speed,ride.topSpeed):manualBodyInput;
  const station=stations.find(s=>Math.hypot(ride.x-s.x,ride.z-s.z)<12);
  const refuelButton=touchControls.querySelector<HTMLButtonElement>('[data-touch=refuel]')!;refuelButton.classList.toggle('hidden',!station);if(!station)touchInputs.refuel=false;
  refueling=!!station&&Math.abs(ride.speed)<.5&&throttle===0&&!push&&(keys.has('KeyE')||pad.refuel||touchInputs.refuel);
  while(accumulator>=1/60){if(refueling)ride.fuel.refill(settings.vehicle,1/60);ride.step(1/60,refueling?0:throttle,refueling?1:brake,turn,obstacles,push,refueling?0:bodyInput,settings.transmission==='automatic',settings.ridingMode==='realistic');accumulator-=1/60}
   wheelieDebugTimer+=dt;if(wheelieDebugEnabled&&wheelieDebugTimer>=.25){wheelieDebugTimer=0;console.debug('Wheelie diagnostics',ride.wheelieDebug)}
  for(const p of pois)if(Math.hypot(ride.x-p.x,ride.z-p.z)<24&&exploration.discover(p.name)){explorationPanel.update();notify(`Novo lugar descoberto · ${p.name}`);sound.playDiscovery()}
  for(const spot of caramelosMission.discoverNear(ride.x,ride.z,settings.carameloDiscoveryRadius)){notify(`Perto de ${spot.hint}. Aproxime-se para encontrar o caramelo.`);const marker=worldCaramelos.get(spot.id)?.marker;if(marker)marker.visible=true}
  const nearby=caramelosMission.nearbySpot(ride.x,ride.z,5);
  nearbyCaramelo=nearby?.id;
  missionInteraction.classList.toggle('hidden',!nearby);
  if(nearby)missionInteraction.textContent=`Encontrar ${nearby.label} · F`;
  const touchCollect=touchControls.querySelector<HTMLButtonElement>('[data-touch-action="collect"]');touchCollect?.classList.toggle('hidden',!nearby);
  if(ride.fallen&&!fallEventHandled){fallEventHandled=true;sound.playCrash();notify('Você caiu para trás. Use R ou o botão de reset para voltar à moto.')}
  else if(!ride.fallen)fallEventHandled=false;
  camera.orbit-=pad.lookX*dt*2;camera.pitch=T.MathUtils.clamp(camera.pitch-pad.lookY*dt*1.4,camera.firstPerson?CAMERA_TUNING.minLookPitch:-.65,CAMERA_TUNING.maxLookPitch);
  if(!dragging&&!pad.lookX&&!pad.lookY){camera.orbit*=Math.exp(-dt*2);camera.pitch*=Math.exp(-dt*2)}
 }
 bike.root.position.set(ride.x,ride.y,ride.z);bike.root.rotation.y=ride.heading;bike.rider.visible=true;
 bike.pet.setUnlocked(caramelosMission.petUnlocked&&!ride.fallen);bike.pet.update(ride.bodyLean, ride.brakeInput, dt);
 for(const [id,dog] of worldCaramelos){dog.pet.update(0,0,dt);dog.marker.visible=!caramelosMission.hasSpot(id)&&(settings.carameloMapMode==='easy'||caramelosMission.isDiscovered(id));dog.marker.position.y=1+Math.sin(now*.003+id.length)*.07}
 bike.steering.rotation.y=steeringAngle(ride.speed,ride.steer);bike.riderRig.update(ride.speed,ride.steer,dt,camera.firstPerson,ride.bodyLean,playing&&!refueling&&!ride.pushing&&ride.fuel.get(settings.vehicle)>0&&!ride.fallen?throttle:0,ride.fallen);bike.brakeLight.update(playing&&!refueling?ride.brakeInput:0,dt);applyBikePose(bike,ride.pitch,ride.lean,ride.wheelie,bike.riderRig.stopPose);for(const wheel of bike.wheels)if(playing)wheel.rotation.x+=ride.speed*dt/(settings.vehicle==='caloi'?.29:.27);
 tireParticles.update(surface(ride.x,ride.z),playing?ride.speed:0,bike.wheels[0],ride.heading,dt);
 camera.update(ride,dt,ride.spec.eyeHeight,bike.body,bike.riderRig.eye);

 sound.update(ride.speed,ride.gear,ride.pushing||ride.fallen?0:throttle,!playing||refueling||ride.fuel.get(settings.vehicle)<=0,ride.brakeInput,ride.engine);
 network.send({vehicleId:settings.vehicle,color:bikeColors[settings.vehicle],bodyLean:ride.bodyLean,wheelie:ride.wheelie,fallen:ride.fallen,braking:playing&&ride.brakeInput>.05,petUnlocked:caramelosMission.petUnlocked,revMatchSequence:ride.engine.revMatchSequence,gear:ride.gear,rpm:ride.engine.rpm,x:ride.x,y:ride.y,z:ride.z,heading:ride.heading,speed:playing?ride.speed:0,pitch:ride.pitch,lean:ride.lean,steer:ride.steer},now);
 remoteRiders.render(now,dt,day.night);
 camera.camera.updateMatrixWorld();
 sound.updateRemotes(camera.camera.position,camera.camera.matrixWorld.elements,network.connected&&!document.hidden,remoteRiders.peers);
 if(now>notifyUntil)el('notification').classList.remove('visible');hudTimer+=dt;
 fuelSaveTimer+=dt;if(fuelSaveTimer>5){fuelSaveTimer=0;ride.fuel.save()}
 if(hudTimer>.15){hudTimer=0;el('world-time').textContent=`${day.night>.5?'☾':'☀'} ${String(Math.floor(day.hour)).padStart(2,'0')}:${String(Math.floor(day.hour%1*60)).padStart(2,'0')}`;el('speed').textContent=String(Math.round(Math.abs(ride.speed)*3.6));el('gear').textContent=ride.speed<-.02?'EMPURRANDO':`${ride.spec.gears===1?'SEM CÂMBIO':`${ride.gear} · ${settings.transmission==='automatic'?'AUTO':'MANUAL'}`} · ${Math.round(ride.engine.rpm/100)*100} RPM${settings.ridingMode==='realistic'?' · REALISTA':''}${ride.engine.limiting?' · CORTE':''}${ride.engine.lugging?' · ENGASGANDO':''}`;
 updateMissionHud();
 const near=pois.reduce((a,b)=>Math.hypot(a.x-ride.x,a.z-ride.z)<Math.hypot(b.x-ride.x,b.z-ride.z)?a:b);el('place').textContent=near.name;el('trip').textContent=`${(ride.distance/1000).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} km · ${surface(ride.x,ride.z)}`;  const ratio=ride.fuel.ratio(settings.vehicle),fuel=ride.fuel.get(settings.vehicle),station=stations.find(s=>Math.hypot(ride.x-s.x,ride.z-s.z)<12),n=nearest(ride.x,ride.z),progress=n.index/(road.length-1)*roadLength/1000;
  el('fuel-level').textContent=`${fuel.toFixed(1)} L · ${Math.round(ratio*100)}%${ratio<.2?' · RESERVA':''}`;
  (el('fuel-meter') as HTMLMeterElement).value=ratio;
  const next=stations.map(s=>({s,d:Math.hypot(s.x-ride.x,s.z-ride.z)})).sort((a,b)=>a.d-b.d)[0],route=nearestRoute(ride.x,ride.z);
  el('fuel-hint').textContent=refueling?'Abastecendo… solte o botão para sair':station?'Pare e segure o botão de abastecimento ou E / X':fuel<=0?'Tanque vazio · solicite gasolina na pausa':`${next.s.name}: ${(next.d/1000).toFixed(1)} km em linha reta`;
  el('route-progress').textContent=route.track.id==='main'?`Horizonte · km ${progress.toFixed(1)} / ${(roadLength/1000).toFixed(1)}`:`${route.track.name} · ${route.track.surface}`;drawMap();
  el('gamepad-status').textContent=pad.connected?'Controle conectado · mapeamento padrão':'Conecte um controle padrão e pressione um botão.';
 }
 renderer.render(scene,camera.camera);
 if(playing){rearMirror.capture(scene,ride,now,sun);rearMirror.renderOverlay();}
}
network.restore();
requestAnimationFrame(frame);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;el('error').classList.remove('hidden');el('error').textContent='A conexão com a placa gráfica foi interrompida. Recarregue a página para continuar.'});
