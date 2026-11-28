import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Ride,steeringAngle} from '../src/riding';
import {getVehicle} from '../src/vehicles';
import {SimcadeHandling} from '../src/simcade';
import {createBike,disposeBike} from '../src/vehicle-models';
import * as T from 'three';

test('tank fittings stay on the chassis and switchgear follows both steering directions',()=>{
 for(const id of ['twister','r1200gs'] as const){
  const bike=createBike(id);
  const probes:[string,T.Vector3,boolean][] = id==='twister'
   ? [['MATERIAL_TANQUE',new T.Vector3(0,.921,.154),false],
      ['plastico_fosco.002',new T.Vector3(.14,.864,.187),false],
      ['espelho.002',new T.Vector3(.385,1.118,.212),true]]
   : [['object_13',new T.Vector3(.305,.92,.279),false],
      ['object_13',new T.Vector3(-.305,.92,.279),false],
      ['object_14',new T.Vector3(-.262,1.166,.262),true],
      ['object_15',new T.Vector3(.27,1.176,.263),true]];
  for(const [material,target,moving] of probes){
   bike.setSteering(0);bike.root.updateMatrixWorld(true);
   let distance=Infinity;const local=new T.Vector3(),world=new T.Vector3(),probe=new T.Vector3();
   let selected:T.Object3D=bike.root;
   bike.body.traverse(o=>{
    if(!(o instanceof T.Mesh)||o.material.name!==material)return;
    const positions=o.geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++){
     probe.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);
     const d=probe.distanceTo(target);
     if(d<distance){distance=d;selected=o;world.copy(probe);local.fromBufferAttribute(positions,i)}
    }
   });
   assert.ok(distance<.065,material);
   const onBars=bike.steering.worldToLocal(world.clone());
   for(const angle of [-.55,.55]){
    bike.setSteering(angle);
    const expected=moving?bike.steering.localToWorld(onBars.clone()):world;
    assert.ok(selected.localToWorld(local.clone()).distanceTo(expected)<1e-6,material);
   }
  }
  disposeBike(bike);
 }
});

test('GS lamps light the upper rear lens and front glass, leaving the plate unlit',()=>{
 const bike=createBike('r1200gs');
 bike.headlight.update(1);bike.brakeLight.update(1,1);
 const head=bike.headlight.lens.geometry.boundingBox!,tail=bike.brakeLight.lens.geometry.boundingBox!;
 assert.ok(head.min.y>.94&&head.max.z<.72);
 assert.ok(bike.headlight.lens.geometry.getAttribute('position').count>0);
 assert.ok(bike.brakeLight.lens.geometry.getAttribute('position').count>0);
 assert.ok(tail.min.y>.90);
 const plate=bike.body.getObjectByName('Body_object_6') as any;
 assert.equal(plate.material.emissiveIntensity,1);
 assert.equal(plate.material.emissive.getHex(),0);
 disposeBike(bike);
});
test('steering stays controllable above 180 km/h and bank still builds gradually',()=>{
 for(const mode of ['arcade','simcade'] as const){
  const ride=new Ride();ride.spec=getVehicle('r1200gs');ride.setHandlingMode(mode);
  ride.contact=()=>{ride.pitch=0;ride.y=0};
  for(let i=0;i<60;i++){ride.speed=55;ride.step(1/60,0,0,.6,[])}
  assert.ok(ride.steer>.4&&ride.steer<=.6,mode);
 }
 const h=new SimcadeHandling(),spec=getVehicle('r1200gs');
 h.steer(1/60,0,.6,40,spec,1);
 const bank=h.bank(1/60,0,8,40,.6,spec);
 assert.ok(Math.abs(bank)<.02);
 assert.ok(steeringAngle(40,1)>.014);
});
