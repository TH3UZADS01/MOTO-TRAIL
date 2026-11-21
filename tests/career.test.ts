import {test} from 'node:test';
import assert from 'node:assert/strict';
import {arrive,bikePrices,buyVehicle,capacity,equipment,factory,offer,purchase,tyreResponse,type Career} from '../src/career';
const home={x:1,z:1,name:'Moto'},station={x:500,z:20,name:'Posto'};
const fresh=():Career=>({money:0,owned:['pop'],garage:{},pet:true,job:null,cooldowns:[]});
test('dealership charges once and only unlocks an affordable bike',()=>{
 const s=fresh();
 assert.throws(()=>buyVehicle(s,'cg150'),/Saldo insuficiente/);
 assert.deepEqual(s.owned,['pop']);
 s.money=bikePrices.cg150+27;
 buyVehicle(s,'cg150');
 assert.throws(()=>buyVehicle(s,'cg150'),/garagem/);
 assert.deepEqual(s.owned,['pop','cg150']);
 assert.equal(s.money,27);
});
test('assistance survives reload and pays once after pickup and return',()=>{
 const s=fresh(),job=offer('Gasolina',home,station,2,'pop',true);s.job=job;
 assert.equal(arrive(s,job.id,home),'');arrive(s,job.id,station);assert.equal(s.money,0);
 const restored=JSON.parse(JSON.stringify(s));arrive(restored,job.id,home);arrive(restored,job.id,home);
 assert.equal(restored.money,job.pay);assert.equal(restored.job,null);
});
test('equipment spending and storage are isolated by vehicle',()=>{
 const s=fresh(),g=equipment(s,'pop');assert.equal(capacity(g),2);
 assert.throws(()=>purchase(s,180,()=>{g.box=true}));assert.equal(g.box,false);
 s.money=180;purchase(s,180,()=>{g.box=true});assert.equal(s.money,0);assert.equal(capacity(g),12);assert.equal(capacity(equipment(s,'cub')),2);
});
test('tyres modify grip and directional slip with surface and wear',()=>{
 const g=factory();g.tyre='pista';const pista=tyreResponse(g,false,18,1,1);g.tyre='trilha';const trail=tyreResponse(g,false,18,1,1);
 assert.ok(trail.grip>pista.grip&&trail.slip<pista.slip);g.pneus=10;assert.ok(tyreResponse(g,false,18,1,1).grip<trail.grip);
});
