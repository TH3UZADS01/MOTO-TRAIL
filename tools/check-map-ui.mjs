import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const delay=ms=>new Promise(r=>setTimeout(r,ms));

const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=9378','--user-data-dir='+mkdtempSync(join(tmpdir(),'horizontes-')),'--use-angle=swiftshader','--enable-unsafe-swiftshader','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
 let tabs;for(let i=0;i<60&&!tabs;i++){try{tabs=await(await fetch('http://127.0.0.1:9378/json')).json()}catch{await delay(250)}}
 ws=new WebSocket(tabs[0].webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let seq=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')console.error(m.params.exceptionDetails)};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const evaluate=async(expression,awaitPromise=false)=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise})).result.value;
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:960,height:600,deviceScaleFactor:1,mobile:false});

 await call('Page.navigate',{url:'http://127.0.0.1:5198/'});
 for(let i=0;i<120;i++){if(await evaluate("!!document.querySelector('.world-chart')"))break;await delay(500)}
 async function check(js){const result=await call('Runtime.evaluate',{expression:js,returnByValue:true});if(result.exceptionDetails||!result.result.value)throw Error(js+' '+JSON.stringify(result.exceptionDetails??result.result))}
 const key=async(code,key)=>{await call('Input.dispatchKeyEvent',{type:'keyDown',code,key});await call('Input.dispatchKeyEvent',{type:'keyUp',code,key});await delay(250)};
 await check("document.querySelector('#start').click(),true");await key('KeyM','m');
 await check("document.querySelector('.world-chart').open");
 await check("document.querySelector('[data-in]').click(),document.querySelector('[data-out]').click(),document.querySelector('[data-center]').click(),true");
 await check("(()=>{const c=document.querySelector('.world-chart canvas'),r=c.getBoundingClientRect();globalThis.cx=r.x+r.width/2;globalThis.cy=r.y+r.height/2;return r.width>100&&r.height>80})()");
 const [x,y]=await evaluate('[cx,cy]');
 await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x,y});await call('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:x+80,y:y+30});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',x:x+80,y:y+30});
 const pointer=async(x,y)=>{await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x,y});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',x,y})};
 await pointer(x+80,y+30);
 await check("document.querySelector('.world-chart output').textContent.length>3");
 await check("(()=>{const s=document.querySelector('.world-chart select');s.value=Array.from(s.options).find(o=>o.text==='Mirante dos Cotovelos').value;s.dispatchEvent(new Event('change'));return document.querySelector('.world-chart output').textContent.includes('km por estrada')})()");
 await check("document.querySelector('[data-all]').click(),true");
 mkdirSync('artifacts/gps',{recursive:true});
 const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync('artifacts/gps/mapa.png',Buffer.from(shot.data,'base64'));
 await check("document.querySelector('[data-go]').click(),!document.querySelector('.world-chart').open");
 await delay(1200);await key('KeyM','m');await key('KeyM','m');
 await check("!document.querySelector('.world-chart').open&&document.querySelector('#panel').classList.contains('hidden')");
 await check("document.querySelector('#pause').click(),true");await check("!document.querySelector('#panel').classList.contains('hidden')");
 await check("document.querySelector('#resume').nextElementSibling.click(),document.querySelector('.world-chart').open");
 await check("document.querySelector('[data-clear]').click(),true");await key('Escape','Escape');
 await check("!document.querySelector('.world-chart').open&&!document.querySelector('#panel').classList.contains('hidden')");
 await check("(()=>{const field=document.createElement('input');field.id='test-map-typing';document.querySelector('#panel').append(field);field.focus();return true})()");
 await key('KeyM','m');await check("!document.querySelector('.world-chart').open");
 console.log('Mapa e GPS verificados no navegador.');
}finally{ws?.close();chrome.kill()}
