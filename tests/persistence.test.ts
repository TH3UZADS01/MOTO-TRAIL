import {test} from 'node:test';
import assert from 'node:assert/strict';
import {load,save} from '../src/persistence';

test('transmission preference is saved and restored; unknown values default to automatic',()=>{
 const previous=globalThis.localStorage;
 const values=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)}});
 try{
  const settings=load();assert.equal(settings.transmission,'automatic');
  settings.transmission='manual';save(settings);
  assert.equal(load().transmission,'manual');
  values.set('pe-na-estrada',JSON.stringify({...settings,transmission:'invalid'}));
  assert.equal(load().transmission,'automatic');
 }finally{
  if(previous===undefined)delete (globalThis as {localStorage?:Storage}).localStorage;
  else Object.defineProperty(globalThis,'localStorage',{configurable:true,value:previous});
 }
});
