import http from 'node:http';
import {WebSocketServer,WebSocket} from 'ws';
import {randomBytes,createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
export const WORLD='vale-horizonte-v3';
const hash=token=>createHash('sha256').update(token).digest('hex');
const validVehicle=id=>['pop','cub','urban','caloi'].includes(id);
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function validState(s){return s&&validVehicle(s.vehicleId)&&finite(s.x,-610,610)&&finite(s.z,-610,610)&&finite(s.y,-20,160)&&finite(s.heading,-1e6,1e6)&&finite(s.pitch,-1.6,1.6)&&finite(s.lean,-.8,.8)&&finite(s.steer,-1,1)&&finite(s.speed,-1.3,23)&&(s.throttle===undefined||finite(s.throttle,0,1))&&(s.gear===undefined||(Number.isInteger(s.gear)&&finite(s.gear,1,4)))&&(s.engineOn===undefined||typeof s.engineOn==='boolean')&&Number.isSafeInteger(s.sequence)&&s.sequence>=0;}
const publicMember=p=>({id:p.id,name:p.name,connected:!!p.socket,state:p.state});
export function createGameServer({dataDir=resolve('server-data'),origins=['http://127.0.0.1:5173','http://127.0.0.1:5174','http://localhost:5173'],graceMs=120000,maxRooms=50}={}){
 mkdirSync(dataDir,{recursive:true});const file=resolve(dataDir,'rooms.json'),rooms=new Map();let dirty=false;
 if(existsSync(file)){const saved=JSON.parse(readFileSync(file,'utf8'));if(saved.world===WORLD)for(const room of saved.rooms){if(Date.now()-room.updated>2*60*60*1000)continue;const members=new Map(room.members.map(p=>[p.id,{...p,socket:null,offlineAt:Date.now()}]));rooms.set(room.code,{...room,members})}}
 function persist(){if(!dirty)return;const data={world:WORLD,rooms:[...rooms.values()].map(r=>({code:r.code,updated:r.updated,members:[...r.members.values()].map(({socket,...p})=>p)}))};const temp=file+'.tmp';writeFileSync(temp,JSON.stringify(data),{mode:0o600});renameSync(temp,file);dirty=false;}
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.writeHead(req.url==='/health'?200:404);res.end(JSON.stringify(req.url==='/health'?{ok:true,world:WORLD}: {error:'Not found'}))});
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{if(req.url!=='/ws'||!origins.includes(req.headers.origin)||wss.clients.size>=200){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req))});
 const send=(ws,data)=>{if(ws?.readyState===WebSocket.OPEN&&ws.bufferedAmount<65536)ws.send(JSON.stringify(data))};
 const broadcast=r=>{const message={type:'snapshot',world:WORLD,at:Date.now(),players:[...r.members.values()].map(publicMember)};for(const p of r.members.values())send(p.socket,message)};
 wss.on('connection',ws=>{
  let room,member,count=0,windowStart=Date.now(),joined=false,lastHorn=0;ws.alive=true;
  const fail=(message,fatal=false)=>{send(ws,{type:'error',message,fatal});if(fatal)ws.close(1008,'Invalid request')};
  ws.on('pong',()=>{ws.alive=true});
  const handshake=setTimeout(()=>{if(!joined)ws.close(1008,'Handshake timeout')},10000);handshake.unref();
  ws.on('message',(bytes,binary)=>{
   if(binary)return fail('Mensagem inválida.',true);const now=Date.now();if(now-windowStart>1000){windowStart=now;count=0}if(++count>35)return fail('Muitas mensagens. Reconecte mais tarde.',true);
   let message;try{message=JSON.parse(bytes.toString())}catch{return fail('Mensagem inválida.',true)}
   if(!message||typeof message!=='object')return fail('Mensagem inválida.',true);
   if(!joined){
    if(!['create','join','resume'].includes(message.type)||message.world!==WORLD)return fail('Versão incompatível. Recarregue o jogo.',true);
    const name=typeof message.name==='string'?message.name.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,20):'';
    if(!name||!validVehicle(message.vehicleId))return fail('Informe seu apelido e uma moto válida.',true);
    if(message.type==='create'){
     if(rooms.size>=maxRooms)return fail('Servidor cheio. Tente mais tarde.',true);
     let code;do{code=randomBytes(4).toString('hex').toUpperCase()}while(rooms.has(code));room={code,updated:now,members:new Map()};rooms.set(code,room);
    }else{room=rooms.get(String(message.code||'').toUpperCase());if(!room)return fail('Sala não encontrada ou encerrada.',true)}
    let token;
    if(message.type==='resume'){
     if(typeof message.token!=='string'||message.token.length!==64)return fail('Sessão expirada. Entre novamente.',true);
     const digest=hash(message.token);member=[...room.members.values()].find(p=>p.tokenHash===digest);
     if(!member)return fail('Sessão expirada. Entre novamente.',true);
     if(member.socket)return fail('Esta sessão já está conectada.',true);token=message.token;member.state.sequence=-1;
    }else{
     if(room.members.size>=4)return fail('Esta sala já tem quatro viajantes.',true);
     token=randomBytes(32).toString('hex');member={id:randomBytes(8).toString('hex'),tokenHash:hash(token),name,offlineAt:0,state:{vehicleId:message.vehicleId,x:-310,z:room.members.size*3,y:0,heading:Math.PI,speed:0,pitch:0,lean:0,steer:0,sequence:-1}};room.members.set(member.id,member);
    }
    member.socket=ws;member.offlineAt=0;member.name=name;room.updated=now;joined=true;clearTimeout(handshake);dirty=true;
    // Persist session credentials before acknowledging admission, so reconnects survive a restart.
    try{persist()}catch{member.socket=null;room.members.delete(member.id);return fail('Não foi possível salvar a sala.',true)}
    send(ws,{type:'welcome',code:room.code,id:member.id,token,world:WORLD,state:member.state});broadcast(room);return;
   }
   if(message.type==='leave'){room.members.delete(member.id);member.socket=null;if(!room.members.size)rooms.delete(room.code);dirty=true;broadcast(room);ws.close(1000,'Left room');return}
   if(message.type==='horn'){if(now-lastHorn<400)return;lastHorn=now;for(const p of room.members.values())if(p.id!==member.id)send(p.socket,{type:'horn',id:member.id});return}
   if(message.type!=='state'||!validState(message.state))return fail('Estado inválido.',true);
   const state=message.state;if(state.sequence<=member.state.sequence)return;
   member.state={vehicleId:state.vehicleId,x:state.x,y:state.y,z:state.z,heading:state.heading,speed:state.speed,pitch:state.pitch,lean:state.lean,steer:state.steer,sequence:state.sequence,throttle:state.throttle??0,gear:state.gear??1,engineOn:state.engineOn??true};room.updated=now;dirty=true;
  });
  ws.on('close',()=>{clearTimeout(handshake);if(member?.socket===ws){member.socket=null;member.offlineAt=Date.now();member.state.speed=0;dirty=true;broadcast(room)}});
  ws.on('error',()=>{});
 });
 const tick=setInterval(()=>{for(const room of rooms.values())broadcast(room)},100);tick.unref();
 const maintenance=setInterval(()=>{const now=Date.now();for(const room of rooms.values()){for(const p of room.members.values())if(!p.socket&&now-p.offlineAt>graceMs){room.members.delete(p.id);dirty=true}if(!room.members.size){rooms.delete(room.code);dirty=true}}try{persist()}catch(error){console.error('Room checkpoint failed:',error.message)}},1000);maintenance.unref();
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue}ws.alive=false;ws.ping()}},15000);heartbeat.unref();
 return {server,wss,rooms,listen:(port=8787,host='127.0.0.1')=>new Promise(resolve=>server.listen(port,host,()=>resolve(server.address()))),close:async()=>{clearInterval(tick);clearInterval(maintenance);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();dirty=true;persist();await new Promise(resolve=>server.close(resolve));wss.close()}};
}

