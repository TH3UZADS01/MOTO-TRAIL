// Developer-only visual check using an isolated headless Chrome profile.
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
 '--headless=new','--remote-debugging-port=9334',`--user-data-dir=${mkdtempSync(join(tmpdir(),'pop-preview-'))}`,
 '--window-size=1400,1000','--use-angle=swiftshader','--enable-unsafe-swiftshader','about:blank'
],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const baseUrl=process.argv[2]||'http://127.0.0.1:5186';
const vehicle=process.argv[3]||'pop',asset=vehicle==='sahara'?'sahara':vehicle==='cg150'?'cg150':vehicle==='cub'?'cub':'pop110';
let ws;
try{
 let tabs;for(let i=0;i<30;i++){try{tabs=await(await fetch('http://127.0.0.1:9334/json')).json();break}catch{await delay(500)}}
 ws=new WebSocket(tabs[0].webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let seq=0;const pending=new Map();const errors=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails)});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 await call('Runtime.enable');await call('Page.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:1400,height:1000,deviceScaleFactor:1,mobile:false});
 for(const view of (process.argv[4]?.split(',')||['model','first'])){
  await call('Page.navigate',{url:`${baseUrl}/?inspect=${view}&vehicle=${vehicle}&hour=12&quality=alto`});
  await delay(12000);
  const shot=await call('Page.captureScreenshot',{format:'png'});
  writeFileSync(`assets/${asset}/${asset}-${view==='model'?'in-game':view==='first'?'first-person':view}.png`,Buffer.from(shot.data,'base64'));
 }
 console.log(JSON.stringify({errors}));
}finally{ws?.close();chrome.kill()}
