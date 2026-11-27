import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const output='artifacts/horizontes';mkdirSync(output,{recursive:true});
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=9374','--user-data-dir='+mkdtempSync(join(tmpdir(),'horizontes-')),'--use-angle=swiftshader','--enable-unsafe-swiftshader','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
 let tabs;for(let i=0;i<60&&!tabs;i++){try{tabs=await(await fetch('http://127.0.0.1:9374/json')).json()}catch{await delay(250)}}
 ws=new WebSocket(tabs[0].webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let seq=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')console.error(m.params.exceptionDetails)};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const evaluate=async(expression,awaitPromise=false)=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise})).result.value;
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:960,height:600,deviceScaleFactor:1,mobile:false});
 const results=[];
 for(const view of ['postoPoente','trevo','panorama','paredao','cotovelos','vale','milharal','capela','travessia']){
  await call('Page.navigate',{url:'http://127.0.0.1:5197/?inspect='+view+'&hour='+(view==='panorama'?'16.9':'12')});
  let ready=false;for(let i=0;i<90&&!ready;i++){await delay(500);ready=await evaluate("typeof horizonStats==='function' && horizonStats().calls>0 && location.search.includes('"+view+"')")}
  if(!ready)throw Error('scene did not render '+view);
  await evaluate("document.querySelectorAll('#hud,header,#pause,#notification').forEach(e=>e.style.display='none')");
  const timing=await evaluate("new Promise(resolve=>{const t=performance.now();let n=0;function step(){if(++n===12)resolve((performance.now()-t)/12);else requestAnimationFrame(step)}requestAnimationFrame(step)})",true);
  const stats=await evaluate('horizonStats()');if(!stats?.calls)throw Error('missing render metrics '+view);results.push({view,frameMs:timing,...stats});console.log(JSON.stringify(results.at(-1)));
  const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(join(output,view+'.png'),Buffer.from(shot.data,'base64'));
  writeFileSync(join(output,'render.json'),JSON.stringify(results,null,2));
  if(view==='cotovelos'){
   const travel=[];
   for(const kmh of [20,100,150]){
    const frameMs=await evaluate(`new Promise(resolve=>{
     let frames=0,previous=performance.now(),start=previous;
     function sample(now){
      advanceSurvey((now-previous)/1000*${kmh}/3.6,${kmh});previous=now;
      if(++frames>=24)resolve((now-start)/frames);else requestAnimationFrame(sample);
     }
     requestAnimationFrame(sample);
    })`,true);
    travel.push({kmh,frameMs,fps:1000/frameMs,...await evaluate('horizonStats()')});
   }
   writeFileSync(join(output,'movimento.json'),JSON.stringify(travel,null,2));
  }
 }
}finally{ws?.close();chrome.kill()}
