import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DISCOVERY_SOUND_DURATION,ExplorationProgress} from '../src/exploration';
import type {Place} from '../src/map-layout';

const places:Place[]=[
 {name:'Vila do Ipê',x:0,z:0,kind:'village'},
 {name:'Mirante da Serra Azul',x:100,z:100,kind:'lookout'}
];
function makeStorage(){
 const values=new Map<string,string>();
 return {
  getItem:(key:string)=>values.get(key)??null,
  setItem:(key:string,value:string)=>{values.set(key,value)},
  values
 };
}

test('all places start undiscovered and discovery is recorded only once',()=>{
 const storage=makeStorage(),progress=new ExplorationProgress(places,storage);
 assert.deepEqual(progress.list().map(item=>item.discovered),[false,false]);
 assert.equal(progress.discover('Vila do Ipê'),true);
 assert.equal(progress.discover('Vila do Ipê'),false);
 assert.equal(progress.discover('local inexistente'),false);
 assert.equal(progress.discoveredCount,1);
 assert.equal(progress.totalCount,2);
 assert.deepEqual(JSON.parse(storage.values.get('explored-places-v1')!),['Vila do Ipê']);
});

test('discovered places persist and unknown stored names are ignored',()=>{
 const storage=makeStorage();
 storage.setItem('explored-places-v1',JSON.stringify(['Vila do Ipê','Vila removida','Vila do Ipê']));
 const progress=new ExplorationProgress(places,storage);
 assert.deepEqual(progress.list().map(item=>item.discovered),[true,false]);
 assert.equal(progress.discover('Mirante da Serra Azul'),true);
 const reloaded=new ExplorationProgress(places,storage);
 assert.deepEqual(reloaded.list().map(item=>item.discovered),[true,true]);
});

test('discovery effect is scheduled as an approximately three-second local sound',()=>{
 assert.equal(DISCOVERY_SOUND_DURATION,3);
});
