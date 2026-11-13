import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {CarameloMission,CARAMELOS_POSITIONS,CARAMELO_PET_TUNING} from '../src/caramelos-mission';
import {createBike,disposeBike} from '../src/vehicle-models';
import {assignLocalBikeLayer,LOCAL_BIKE_LAYER} from '../src/rear-view-mirror';

function memoryStorage(initial:Record<string,string>={}):Storage {
 const values=new Map(Object.entries(initial));
 return {
  get length(){return values.size},
  clear(){values.clear()},
  getItem(key){return values.get(key)??null},
  key(index){return [...values.keys()][index]??null},
  removeItem(key){values.delete(key)},
  setItem(key,value){values.set(key,String(value))},
 };
}

test('legacy partial progress is migrated and can never unlock a pet early',()=>{
 const store=memoryStorage({'caramelos-mission-v1':JSON.stringify(['caramelo-1'])});
 const mission=new CarameloMission(CARAMELOS_POSITIONS,store);
 assert.equal(mission.foundCount,1);
 assert.equal(mission.petUnlocked,false);
 const saved=JSON.parse(store.getItem('caramelos-mission-v2')!);
 assert.equal(saved.petUnlocked,false);
 assert.deepEqual(saved.found,['caramelo-1']);
});

test('pet unlocks only after every fixed caramelo is found and progress persists',()=>{
 const store=memoryStorage(),mission=new CarameloMission(CARAMELOS_POSITIONS,store);
 for(const [index,spot] of CARAMELOS_POSITIONS.entries()){
  const found=mission.updateFromPlayer(spot.x,spot.z);
  assert.equal(found.length,1);
  assert.equal(mission.petUnlocked,index===CARAMELOS_POSITIONS.length-1);
 }
 assert.equal(mission.complete,true);
 const loaded=new CarameloMission(CARAMELOS_POSITIONS,store);
 assert.equal(loaded.foundCount,CARAMELOS_POSITIONS.length);
 assert.equal(loaded.petUnlocked,true);
});

test('exploration reveals and persists hints; interaction alone collects the nearby caramelo',()=>{
 const store=memoryStorage(),mission=new CarameloMission(CARAMELOS_POSITIONS,store),spot=CARAMELOS_POSITIONS[0];
 assert.equal(mission.visibleSpots()[0].discovered,false);
 assert.deepEqual(mission.discoverNear(spot.x+30,spot.z),[spot]);
 assert.equal(mission.petUnlocked,false);
 assert.equal(mission.nearbySpot(spot.x+30,spot.z),undefined);
 assert.equal(mission.nearbySpot(spot.x+2,spot.z)?.id,spot.id);
 assert.equal(mission.collect(spot.id)?.id,spot.id);
 assert.equal(mission.petUnlocked,false);
 const loaded=new CarameloMission(CARAMELOS_POSITIONS,store);
 assert.equal(loaded.isDiscovered(spot.id),true);
 assert.equal(loaded.hasSpot(spot.id),true);
 assert.equal(loaded.collect(spot.id),undefined);
});

test('pet is seated in a scaled passenger anchor on every bike and follows only its hierarchy',()=>{
 for(const vehicle of ['pop','cub','urban','caloi','cg150'] as const){
  const bike=createBike(vehicle);
  try{
   const {passengerPetAnchor,pet}=bike;
   assert.equal(passengerPetAnchor.parent,bike.body);
   assert.equal(pet.group.parent,passengerPetAnchor);
   assert.equal(pet.group.visible,false);
   assert.equal(passengerPetAnchor.scale.x,CARAMELO_PET_TUNING.scale);
   assignLocalBikeLayer(bike.root);
   assert.equal(pet.group.layers.mask,1<<LOCAL_BIKE_LAYER);
   pet.setUnlocked(true);
   bike.root.updateMatrixWorld(true);
   const bounds=new T.Box3().setFromObject(pet.group);
   const height=bounds.max.y-bounds.min.y;
   assert.ok(height>=.4&&height<=.5,`${vehicle} pet height ${height}`);
   const anchorPosition=passengerPetAnchor.position.clone(),petPosition=pet.group.position.clone();
   pet.update(-1,1,.1);
   assert.ok(passengerPetAnchor.position.distanceTo(anchorPosition)<1e-12);
   assert.ok(pet.group.position.distanceTo(petPosition)<1e-12);
  }finally{disposeBike(bike)}
 }
});
