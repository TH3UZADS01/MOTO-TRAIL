import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGameServer,WORLD,validState} from '../server/app.mjs';
const origin='http://127.0.0.1:5173';
const state=(x,sequence=0)=>({vehicleId:'cub',x,y:12,z:0,heading:1,speed:9,pitch:.05,lean:.1,steer:.2,sequence});
async function client(port){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,{origin});const messages=[];ws.on('message',data=>messages.push(JSON.parse(data.toString())));await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject)});return {ws,messages,send:m=>ws.send(JSON.stringify(m)),wait:async predicate=>{const deadline=Date.now()+5000;while(Date.now()<deadline){const index=messages.findIndex(predicate);if(index>=0)return messages.splice(index,1)[0];await new Promise(r=>setTimeout(r,10))}throw new Error('Timed out waiting for server message')}}}
const hello=(type,name,extra={})=>({type,name,world:WORLD,vehicleId:'pop',...extra});
test('real separate WebSocket sessions: rooms, movement, bikes, capacity, leave and restart resume',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'mototrail-online-'));let game=createGameServer({dataDir:dir,origins:[origin]});const sockets=[];
 try{
  let address=await game.listen(0);const a=await client(address.port);sockets.push(a.ws);a.send(hello('create','Ana'));const welcome=await a.wait(m=>m.type==='welcome');
  const b=await client(address.port);sockets.push(b.ws);b.send(hello('join','Bruno',{code:welcome.code}));const wb=await b.wait(m=>m.type==='welcome');assert.notEqual(wb.id,welcome.id);
  a.send({type:'state',state:state(-300)});const received=await b.wait(m=>m.type==='snapshot'&&m.players.some(p=>p.id===welcome.id&&p.state.x===-300));assert.equal(received.players.find(p=>p.id===welcome.id).state.vehicleId,'cub');
  b.send({type:'state',state:{...state(-290),vehicleId:'caloi'}});await a.wait(m=>m.type==='snapshot'&&m.players.some(p=>p.id===wb.id&&p.state.vehicleId==='caloi'));
  const other=await client(address.port);sockets.push(other.ws);other.send(hello('create','Outra sala'));await other.wait(m=>m.type==='welcome');const isolated=await other.wait(m=>m.type==='snapshot');assert.equal(isolated.players.length,1);
  for(const name of ['C','D']){const c=await client(address.port);sockets.push(c.ws);c.send(hello('join',name,{code:welcome.code}));await c.wait(m=>m.type==='welcome')}
  const fifth=await client(address.port);sockets.push(fifth.ws);fifth.send(hello('join','E',{code:welcome.code}));assert.match((await fifth.wait(m=>m.type==='error')).message,/quatro/);
  b.send({type:'leave'});await a.wait(m=>m.type==='snapshot'&&m.players.length===3&&!m.players.some(p=>p.id===wb.id));
  const bad=await client(address.port);sockets.push(bad.ws);bad.send(hello('join','Invalid',{code:welcome.code}));await bad.wait(m=>m.type==='welcome');bad.send({type:'state',state:{...state(-200),speed:99999}});assert.match((await bad.wait(m=>m.type==='error')).message,/inválido/);
  // Same persistent session on a brand-new server instance, no shared room memory.
  await game.close();game=createGameServer({dataDir:dir,origins:[origin]});address=await game.listen(0);
  const resumed=await client(address.port);sockets.push(resumed.ws);resumed.send(hello('resume','Ana',{code:welcome.code,token:welcome.token}));const wr=await resumed.wait(m=>m.type==='welcome');assert.equal(wr.id,welcome.id);assert.equal(wr.state.x,-300);
  resumed.send({type:'state',state:state(-299,0)});await resumed.wait(m=>m.type==='snapshot'&&m.players.some(p=>p.id===welcome.id&&p.state.x===-299));
 }finally{for(const socket of sockets)socket.terminate();await game.close();if(dir.startsWith(join(tmpdir(),'mototrail-online-')))rmSync(dir,{recursive:true,force:true});}
});
test('protocol rejects malformed positions, nonfinite numbers and unknown vehicles',()=>{assert.equal(validState(state(0)),true);for(const patch of [{x:Infinity},{speed:NaN},{vehicleId:'hacked'},{sequence:1.5},{z:10000}])assert.equal(validState({...state(0),...patch}),false)});
test('rate limit terminates flooding sessions',async()=>{const dir=mkdtempSync(join(tmpdir(),'mototrail-online-'));const game=createGameServer({dataDir:dir,origins:[origin]});let c;try{const address=await game.listen(0);c=await client(address.port);c.send(hello('create','Fast'));await c.wait(m=>m.type==='welcome');for(let i=0;i<40;i++)c.send({type:'state',state:state(0,i)});assert.match((await c.wait(m=>m.type==='error')).message,/Muitas/)}finally{c?.ws.terminate();await game.close();if(dir.startsWith(join(tmpdir(),'mototrail-online-')))rmSync(dir,{recursive:true,force:true});}});

test('large map positions, 100 km/h and horns reach only other riders in the same room, with cooldown',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'mototrail-online-')),game=createGameServer({dataDir:dir,origins:[origin]}),sockets=[];
 try{
  const {port}=await game.listen(0),a=await client(port),b=await client(port),other=await client(port);sockets.push(a.ws,b.ws,other.ws);
  a.send(hello('create','Ana'));const wa=await a.wait(m=>m.type==='welcome');
  b.send(hello('join','Bruno',{code:wa.code}));await b.wait(m=>m.type==='welcome');
  other.send(hello('create','Outra'));await other.wait(m=>m.type==='welcome');
  a.send({type:'state',state:{...state(6200),z:-2500,speed:100/3.6}});
  const snapshot=await b.wait(m=>m.type==='snapshot'&&m.players.some(p=>p.id===wa.id&&p.state.x===6200));
  assert.equal(snapshot.players.find(p=>p.id===wa.id).state.speed,100/3.6);
  a.send({type:'horn',id:'spoof'});a.send({type:'horn'});
  assert.equal((await b.wait(m=>m.type==='horn')).id,wa.id);
  await new Promise(r=>setTimeout(r,180));
  for(const c of [a,b,other])assert.equal(c.messages.filter(m=>m.type==='horn').length,0);
  await new Promise(r=>setTimeout(r,250));a.send({type:'horn'});await b.wait(m=>m.type==='horn');
  a.send({type:'state',state:state(-300,1)});
  await b.wait(m=>m.type==='snapshot'&&m.players.some(p=>p.id===wa.id&&p.state.sequence===1));
 }finally{for(const ws of sockets)ws.terminate();await game.close();rmSync(dir,{recursive:true,force:true})}
});
