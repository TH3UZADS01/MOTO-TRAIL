import {test} from 'node:test';
import assert from 'node:assert/strict';
import {load,save} from '../src/persistence';

test('transmission and automatic tuck preferences are saved and restored',()=>{
 const previous=globalThis.localStorage;
 const values=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)}});
 try{
  const settings=load();assert.equal(settings.transmission,'automatic');assert.equal(settings.autoTuck,false);assert.equal(settings.autoBlip,true);
  settings.autoBlip=false;settings.transmission='manual';settings.autoTuck=true;save(settings);
  assert.equal(load().autoBlip,false);assert.equal(load().transmission,'manual');assert.equal(load().autoTuck,true);
  values.set('pe-na-estrada',JSON.stringify({...settings,transmission:'invalid'}));
  assert.equal(load().transmission,'automatic');
  values.set('pe-na-estrada',JSON.stringify({...settings,autoTuck:'yes'}));
  assert.equal(load().autoTuck,false);
 }finally{
  if(previous===undefined)delete (globalThis as {localStorage?:Storage}).localStorage;
  else Object.defineProperty(globalThis,'localStorage',{configurable:true,value:previous});
 }
});
