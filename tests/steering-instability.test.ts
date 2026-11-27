import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SteeringInstability} from '../src/steering-instability';
import {Suspension} from '../src/suspension';
import {WheelContact} from '../src/traction';
import {factory, equipment, type Career} from '../src/career';
import {vehicles, getVehicle} from '../src/vehicles';
import {originalPrep,partPrice} from '../src/adventure-tuning';
import {installPart} from '../src/adventures';
import {scars} from '../src/pavement';
import {Ride} from '../src/riding';

function shock(speed:number, travel:number, load=1, tyre=100, fork=100, damper:'original'|'sport'|'reinforced'='original'){
 const model=new SteeringInstability(),s=new Suspension(),contact=new WheelContact(),spec=getVehicle('cg150');
 const gear={...factory(),pneus:tyre,forkCondition:fork,prep:{...originalPrep(),damper}};
 s.front.normalLoad=((spec.mass??100)+spec.riderMass)*9.81*spec.centerOfMassRearDistance/spec.wheelbase*load;
 const step=()=>model.step(1/60,spec,speed,s,contact,gear,0,.6,0,0);
 step();s.front.compression=travel;step();
 const state=model.state, first=Math.abs(model.angle);
 let energy=0,reversals=0;
 for(let i=0;i<120;i++){
  const before=model.angle;
  step();energy+=model.angle**2;
  if(before*model.angle<0)reversals++;
 }
 assert.equal(model.state,'estável');assert.ok(Math.abs(model.angle)<.0001);
 return {first,state,energy,reversals};
}

test('quiet road, shock severity, speed, front load, wear and damping',()=>{
 assert.equal(shock(32,0,.35,0,0).energy,0);
 assert.equal(shock(32,.004).energy,0);
 assert.equal(shock(32,.02).state,'headshake');
 const strong=shock(32,.045,.5,12,20);
 assert.equal(strong.state,'wobble');assert.ok(strong.reversals>2);
 assert.ok(strong.first>shock(12,.045,.5,12,20).first);
 assert.ok(strong.first>shock(32,.045,1,12,20).first);
 assert.ok(strong.first>shock(32,.045,.5,100,20).first);
 assert.ok(strong.first>shock(32,.045,.5,12,100).first);
 const sport=shock(32,.045,.5,12,20,'sport'),heavy=shock(32,.045,.5,12,20,'reinforced');
 assert.ok(strong.energy>sport.energy&&sport.energy>heavy.energy&&heavy.energy>0);
});

test('no road torque in the air; landing and reset for all six motorcycles',()=>{
 for(const spec of vehicles){
  const r=new Ride();r.spec=spec;r.setHandlingMode('simcade');
  const update=(lift:number)=>r.instability.step(1/60,spec,spec.maxSpeed,r.suspension,r.frontContact,r.equipment,0,.5,.35,lift);
  update(.3);r.suspension.front.compression=.06;update(.3);
  assert.equal(r.instability.angle,0);assert.equal(r.instability.physicalAngle,0);
  r.suspension.front.normalLoad=600;update(0);assert.notEqual(r.instability.angle,0);
  r.resetBody();assert.equal(r.instability.velocity,0);assert.equal(r.instability.state,'estável');
 }
});

test('weight transfer changes impact sensitivity without exciting smooth straight-line travel',()=>{
 for(const spec of vehicles){
  function run(acceleration:number){
   const model=new SteeringInstability(),s=new Suspension(),contact=new WheelContact(),gear=factory();
   const speed=spec.maxSpeed*.8;
   for(let i=0;i<90;i++){
    s.step(1/60,spec,0,0,acceleration,0,0,1,1,true);
    model.step(1/60,spec,speed,s,contact,gear,0,1,0,0);
    assert.equal(model.state,'estável');
   }
   s.step(1/60,spec,.032,0,acceleration,0,0,1,1,true);
   model.step(1/60,spec,speed,s,contact,gear,0,1,0,0);
   return Math.abs(model.angle);
  }
  assert.ok(run(4)>run(0),spec.id);
 }
});

test('actual pavement excites the fork consistently at 30, 60 and 120 render frames/s',()=>{
 const spot=scars.find(s=>s.depth<-.055)!;
 function cross(fps:number){
  const r=new Ride();r.setHandlingMode('simcade');r.x=spot.x;r.z=spot.z-4;r.heading=0;r.speed=21;r.contact();
  let peak=0,elapsed=0;
  for(let i=0;i<fps;i++){
   elapsed+=1/fps;
   while(elapsed>=1/60){
    r.step(1/60,.2,0,0,[]);peak=Math.max(peak,Math.abs(r.instability.angle));elapsed-=1/60;
   }
  }
  return peak;
 }
 const peak=cross(60);assert.ok(peak>.002);assert.equal(cross(30),peak);assert.equal(cross(120),peak);
});

test('existing workshop charges per bike, restores original and retains purchased dampers',()=>{
 let s:Career={money:0,owned:['pop','cg150'],garage:{},pet:false,job:null,cooldowns:[]};
 assert.throws(()=>installPart(s,'pop','damper','sport'));
 s.money=1000;installPart(s,'pop','damper','sport');
 assert.equal(s.money,1000-partPrice('pop','sport'));
 s=JSON.parse(JSON.stringify(s));assert.equal(equipment(s,'pop').prep?.damper,'sport');
 const cash=s.money;installPart(s,'pop','damper','original');installPart(s,'pop','damper','sport');
 assert.equal(s.money,cash);assert.equal(equipment(s,'cg150').prep?.damper,undefined);
});

test('GS handlebar visibly reverses after potholes, touchdowns and rough dirt in both modes',()=>{
 const spec=getVehicle('r1200gs'),dt=1/60;
 for(const simcade of [false,true])for(const cause of ['hole','landing','dirt']){
  const model=new SteeringInstability(),s=new Suspension(),c=new WheelContact(),gear=factory();
  let min=0,max=0;
  for(let i=0;i<120;i++){
   const z=i*23*dt,lift=cause==='landing'&&i<25?.32:0;
   const relief=cause==='hole'&&i===25?-.055:cause==='dirt'?.018*(.58*Math.sin(1.7*z)+.42*Math.sin(3.1*z)):0;
   s.step(dt,spec,relief,0,0,0,lift,1,1,simcade);
   model.step(dt,spec,23,s,c,gear,0,.5,0,lift,relief,simcade);
   min=Math.min(min,model.visualAngle);max=Math.max(max,model.visualAngle);
   if(!simcade)assert.equal(model.physicalAngle,0);
  }
  assert.ok(min<0&&max>0&&max-min>.014,cause+' '+simcade+' '+(max-min));
 }
});
