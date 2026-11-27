import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ergonomics,RiderPosture} from '../src/rider-posture';
import {Ride} from '../src/riding';
import {vehicles} from '../src/vehicles';
import {createBike,disposeBike} from '../src/vehicle-models';
import {Controller} from '../src/input';

test('six rigs rise gradually with anchored grips and pegs, then sit again',()=>{
 for(const spec of vehicles){
  const bike=createBike(spec.id),rig=bike.riderRig,p=new RiderPosture();
  bike.setSteering(.3);
  for(let i=0;i<180;i++)rig.update(12,.3,1/60);
  const anchors=rig.limbs.map(l=>[l.hand.position.clone(),l.foot.position.clone()]);
  p.standing=true;
  for(let i=0;i<180;i++){
   p.step(1/60,spec.id,12,0,0,0,true,0,0,0);
   rig.update(12,.3,1/60,false,0,0,false,0,0,false,p);
   rig.limbs.forEach((l,j)=>{
    assert.ok(l.hand.position.distanceTo(anchors[j][0])<1e-6);
    assert.ok(l.foot.position.distanceTo(anchors[j][1])<1e-6);
   });
   if(i===0)assert.ok(p.stand>0&&p.stand<.1);
  }
  assert.ok(Math.abs(rig.hips.position.y-.86-ergonomics[spec.id].rise)<1e-5);
  p.step(1/60,spec.id,12,0,0,0,true,0,.07,.05);assert.ok(p.absorption>0);
  p.standing=false;
  for(let i=0;i<180;i++)p.step(1/60,spec.id,12,0,0,0,true,0,0,0);
  assert.ok(p.rise<.0001);disposeBike(bike);
 }
});
test('road corners, off-road counterbalance, slip and real longitudinal acceleration',()=>{
 const p=new RiderPosture();
 for(const side of [-1,1]){
  for(let i=0;i<120;i++)p.step(1/60,'cg150',18,-side*.4,side*6,3,false,0,0,0);
  assert.ok(p.sideLean*side<0&&p.brace>0);
  p.standing=true;
  for(let i=0;i<120;i++)p.step(1/60,'sahara',18,-side*.4,side*6,-5,true,side*.5,.03,0);
  assert.ok(p.sideLean*side>0&&p.brace<0);
 }
});
test('fixed-step posture is repeatable across render rates and gamepad toggle uses an edge',()=>{
 const run=(fps:number)=>{
  const r=new Ride();r.setHandlingMode('simcade');r.speed=9;r.posture.standing=true;r.softGround=true;
  let acc=0;for(let f=0;f<fps*2;f++){
   acc+=1/fps;while(acc>=1/60){r.step(1/60,.4,0,.3,[]);acc-=1/60}
  }
  return [r.x,r.z,r.posture.rise,r.posture.sideLean,r.posture.brace];
 };
 assert.deepEqual(run(30),run(60));assert.deepEqual(run(60),run(120));
 const c=new Controller(),buttons=Array.from({length:16},()=>({pressed:false,value:0}));
 const pad={connected:true,mapping:'standard',id:'test',axes:[],buttons} as unknown as Gamepad;
 buttons[11].pressed=true;assert.equal(c.poll(.1,1,[pad],11).posture,true);assert.equal(c.poll(.1,1,[pad],11).posture,false);
});
