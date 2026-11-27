import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WheelContact,surfaces,type ContactSurface} from '../src/traction';
import {Ride} from '../src/riding';
import {vehicles} from '../src/vehicles';
import {routes,contactSurface} from '../src/terrain';

test('six surfaces progressively share longitudinal and lateral grip; trail tyres and releasing throttle recover traction',()=>{
 for(const surface of Object.keys(surfaces) as ContactSurface[]){
  const run=(turn:number,tyre:'original'|'pista'|'trilha')=>{
   const wheel=new WheelContact();
   for(let i=0;i<120;i++)wheel.update(1/60,surface,tyre,1,900,850,turn,12);
   return wheel;
  };
  const straight=run(0,'original'),turn=run(700,'original');
  assert.ok(turn.slipRatio>straight.slipRatio&&turn.lateralSlip>0);
  const before=turn.slipRatio;
  for(let i=0;i<60;i++)turn.update(1/60,surface,'original',1,900,0,0,12);
  assert.ok(turn.slipRatio<before*.05&&turn.state==='GRIP');
  if(surface!=='asfalto')assert.ok(run(700,'trilha').slipRatio<run(700,'pista').slipRatio);
 }
});

test('road samples, engine braking, sand climb and mixed contacts work on each bike',()=>{
 const points=new Map<ContactSurface,{x:number;z:number}>();
 for(const route of routes)for(const p of route.points){
  const kind=contactSurface(p.x,p.z);
  if(kind===contactSurface(p.x,p.z-1)&&kind===contactSurface(p.x,p.z+1))points.set(kind,p);
 }
 for(const spec of vehicles){
  function run(kind:ContactSurface,grade:number,gas:number){
   const p=points.get(kind)!;assert.ok(p);
   const r=new Ride();r.spec=spec;r.setHandlingMode('simcade');
   r.gear=Math.min(2,spec.gears);r.contact=()=>{r.pitch=grade};
   for(let i=0;i<90;i++){
    r.x=p.x;r.z=p.z;r.heading=0;r.speed=9;r.step(1/60,gas,0,.35,[],false,0,false,true);
   }
   assert.equal(r.frontContact.surface,kind);assert.equal(r.rearContact.surface,kind);
   return r;
  }
  assert.ok(run('areia',.07,1).speed<run('terra',0,1).speed);
  const coast=run('terra',0,0);assert.ok(coast.rearContact.slipRatio<0&&coast.engine.engineBrakeTorque>0);
  for(const kind of ['asfalto','cascalho','lama'] as const)run(kind,0,1);
  const r=run('asfalto',0,1);
  r.heading=0;const middle=r.z;r.sandAt=(_x,z)=>z>middle;
  r.step(1/60,1,0,0,[]);
  assert.equal(r.frontContact.surface,'areia');assert.equal(r.rearContact.surface,'asfalto');
  assert.ok(r.frontContact.rollingResistance>0&&r.frontContact.rollingResistance<surfaces.areia.roll);
 }
});
