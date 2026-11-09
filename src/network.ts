import type {VehicleId} from './vehicles';
export const WORLD='vale-horizonte-v5';
export interface RiderState {vehicleId:VehicleId;x:number;y:number;z:number;heading:number;speed:number;pitch:number;lean:number;steer:number;sequence:number}
export interface RemotePlayer {id:string;name:string;connected:boolean;state:RiderState}
interface Session {code:string;id:string;token:string;name:string;vehicleId:VehicleId}
interface Events {horn:(id:string)=>void;status:(text:string)=>void;welcome:(state:RiderState,code:string,id:string)=>void;players:(players:RemotePlayer[])=>void;ended:()=>void}
export class RideNetwork {
 socket?:WebSocket;session?:Session;connecting=false;private wanted=false;private timer?:ReturnType<typeof setTimeout>;private attempt=0;private sequence=0;private lastSent=0;private generation=0;private name='';private vehicleId:VehicleId='pop';
 readonly url=import.meta.env.VITE_MULTIPLAYER_URL||(import.meta.env.DEV?'ws://127.0.0.1:8787/ws':'');
 constructor(private events:Events){}
 get active(){return !!this.session}
 get connected(){return this.socket?.readyState===WebSocket.OPEN&&!!this.session&&!this.connecting}
 private store(){try{if(this.session)sessionStorage.setItem('ride-room',JSON.stringify(this.session));else sessionStorage.removeItem('ride-room')}catch{}}
 restore(){try{const s=JSON.parse(sessionStorage.getItem('ride-room')||'null');if(s?.token&&s?.code){this.session=s;this.name=s.name;this.vehicleId=s.vehicleId;this.wanted=true;this.open('resume',s.code)}}catch{}}
 connect(type:'create'|'join',name:string,vehicleId:VehicleId,code=''){
  this.leave();if(!this.url){this.events.status('Online não configurado neste site. Consulte as instruções de publicação.');return}
  this.name=name.trim();this.vehicleId=vehicleId;this.wanted=true;this.attempt=0;this.open(type,code.trim().toUpperCase());
 }
 private open(type:'create'|'join'|'resume',code:string){
  if(!this.wanted)return;this.connecting=true;const generation=++this.generation;this.events.status(type==='resume'?'Reconectando à sala…':'Conectando…');
  let ws:WebSocket;try{const url=new URL(this.url);if(!['ws:','wss:'].includes(url.protocol)||(location.protocol==='https:'&&url.protocol!=='wss:'))throw new Error();ws=new WebSocket(url)}catch{this.fail('Endereço do servidor inválido. HTTPS exige wss://.');return}this.socket=ws;
  const timeout=setTimeout(()=>ws.close(),60000);
  ws.onopen=()=>ws.send(JSON.stringify({type,world:WORLD,name:this.name,vehicleId:this.vehicleId,code,token:type==='resume'?this.session?.token:undefined}));
  ws.onmessage=event=>{if(generation!==this.generation)return;let m;try{m=JSON.parse(event.data)}catch{return}
   if(m.type==='error'){this.events.status(m.message);if(m.fatal){this.wanted=false;this.session=undefined;this.store();this.events.players([]);this.events.ended();}return}
   if(m.type==='welcome'){
    clearTimeout(timeout);if(m.world!==WORLD){this.fail('Versão diferente do servidor. Recarregue o jogo.');return}
    this.session={code:m.code,id:m.id,token:m.token,name:this.name,vehicleId:this.vehicleId};this.connecting=false;this.attempt=0;this.sequence=0;this.store();this.events.welcome(m.state,m.code,m.id);this.events.status(`Sala ${m.code} · conectado`);
   }
   if(m.type==='horn'&&typeof m.id==='string')this.events.horn(m.id);
   if(m.type==='snapshot'&&Array.isArray(m.players)&&m.world===WORLD)this.events.players(m.players.filter((p:RemotePlayer)=>p.id!==this.session?.id));
  };
  ws.onerror=()=>{};
  ws.onclose=()=>{clearTimeout(timeout);if(generation!==this.generation)return;this.connecting=false;this.events.players([]);
   if(this.wanted&&this.session&&this.attempt<8){const delay=Math.min(1000*2**this.attempt++,12000);this.events.status(`Conexão perdida. Reconectando em ${Math.round(delay/1000)} s…`);this.timer=setTimeout(()=>this.open('resume',this.session!.code),delay)}
   else if(this.wanted)this.fail('Servidor indisponível ou sessão encerrada. Tente entrar novamente.');
  };
 }
 private fail(message:string){this.wanted=false;this.connecting=false;this.session=undefined;this.store();this.socket?.close();this.events.players([]);this.events.status(message);this.events.ended()}
 horn(){if(this.connected)this.socket!.send(JSON.stringify({type:'horn'}))}
 send(state:Omit<RiderState,'sequence'>,now:number,force=false){if(!this.connected||(!force&&now-this.lastSent<100)||this.socket!.bufferedAmount>16384)return;this.lastSent=now;this.socket!.send(JSON.stringify({type:'state',state:{...state,sequence:this.sequence++}}));}
 leave(){this.wanted=false;this.generation++;clearTimeout(this.timer);if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify({type:'leave'}));this.socket?.close();this.socket=undefined;this.session=undefined;this.connecting=false;this.store();this.events.players([]);this.events.ended()}
}

