import * as T from 'three';
import {bridges,stations,villages,specials,viewpoints} from './map-layout';

export type CarameloSpot = {
  id: string;
  label: string;
  hint: string;
  x: number;
  z: number;
};

const waterfall=specials.find((place)=>place.kind==='waterfall')!;
const farm=specials.find((place)=>place.kind==='farm')!;
const selectedBridge=bridges[Math.floor(bridges.length*.65)];
const bridgeSpot=selectedBridge
  ?{x:selectedBridge.x+selectedBridge.dx*(selectedBridge.halfLength+3),z:selectedBridge.z+selectedBridge.dz*(selectedBridge.halfLength+3)}
  :{x:viewpoints[0].x,z:viewpoints[0].z};
export const CARAMELOS_POSITIONS: CarameloSpot[] = [
  {id:'caramelo-1',label:'Caramelo da cachoeira',hint:'perto da cachoeira, no fim da trilha de terra',x:waterfall.x,z:waterfall.z},
  {id:'caramelo-2',label:'Caramelo da fazenda',hint:'na Fazenda Boa Vista, entre os campos',x:farm.x,z:farm.z},
  {id:'caramelo-3',label:'Caramelo do posto',hint:'ao lado do Posto da Serra',x:stations[2].x+24,z:stations[2].z+18},
  {id:'caramelo-4',label:'Caramelo da vila',hint:'na praça de Santa Aurora',x:villages[1].x,z:villages[1].z},
  {id:'caramelo-5',label:'Caramelo da ponte',hint:'na cabeceira de uma ponte sobre o rio',x:bridgeSpot.x,z:bridgeSpot.z},
];

const STORAGE_KEY = 'caramelos-mission-v3';

export class CarameloMission {
  private readonly found = new Set<string>();
  private readonly discovered = new Set<string>();

  constructor(
    private readonly spots: readonly CarameloSpot[] = CARAMELOS_POSITIONS,
    private readonly storage?: Storage,
  ) {
    this.load();
  }

  get total() { return this.spots.length; }
  get foundCount() { return this.found.size; }
  get complete() { return this.found.size >= this.total; }
  get petUnlocked() { return this.complete; }

  hasSpot(id: string) { return this.found.has(id); }

  isDiscovered(id: string) { return this.discovered.has(id)||this.found.has(id); }

  discoverNear(x: number, z: number, radius = 45) {
    const newlyDiscovered: CarameloSpot[] = [];
    for (const spot of this.spots) {
      if (this.isDiscovered(spot.id)||Math.hypot(x-spot.x,z-spot.z)>radius) continue;
      this.discovered.add(spot.id);
      newlyDiscovered.push(spot);
    }
    if (newlyDiscovered.length) this.save();
    return newlyDiscovered;
  }

  nearbySpot(x: number, z: number, radius = 3.5) {
    return this.spots
      .filter((spot)=>!this.found.has(spot.id))
      .map((spot)=>({spot,distance:Math.hypot(x-spot.x,z-spot.z)}))
      .filter(({distance})=>distance<=radius)
      .sort((a,b)=>a.distance-b.distance)[0]?.spot;
  }

  collect(id: string) {
    const spot=this.spots.find((item)=>item.id===id);
    if (!spot||this.found.has(id)) return undefined;
    this.found.add(id);
    this.discovered.add(id);
    this.save();
    return spot;
  }

  updateFromPlayer(x: number, z: number, threshold = 10) {
    const gathered: CarameloSpot[] = [];
    for (const spot of this.spots) {
      if (this.found.has(spot.id)) continue;
      const distance = Math.hypot(x - spot.x, z - spot.z);
      if (distance <= threshold) {
        this.found.add(spot.id);
        this.save();
        gathered.push(spot);
      }
    }
    return gathered;
  }

  visibleSpots(showAll = false) {
    return this.spots.map((spot) => ({...spot, found:this.found.has(spot.id),discovered:showAll||this.isDiscovered(spot.id)}));
  }

  reset() {
    this.found.clear();
    this.discovered.clear();
    this.save();
  }

  private load() {
    const storage = this.storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storage) return;
    try {
      const current = storage.getItem(STORAGE_KEY);
      const parsed: unknown = JSON.parse(current ?? '[]');
      const values = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && 'found' in parsed && Array.isArray(parsed.found)
          ? parsed.found
          : [];
      for (const value of values) {
        if (typeof value === 'string' && this.spots.some((spot) => spot.id === value)) {
          this.found.add(value);
        }
      }
      if (parsed&&typeof parsed==='object'&&'discovered' in parsed&&Array.isArray(parsed.discovered)) {
        for (const value of parsed.discovered) {
          if (typeof value==='string'&&this.spots.some((spot)=>spot.id===value)) this.discovered.add(value);
        }
      }
      for (const id of this.found) this.discovered.add(id);
      const savedUnlock = parsed && typeof parsed === 'object' && 'petUnlocked' in parsed
        ? parsed.petUnlocked
        : undefined;
      const version=parsed&&typeof parsed==='object'&&'version' in parsed&&typeof parsed.version==='number'?parsed.version:0;
      if (savedUnlock !== this.petUnlocked || version<3) this.save();
    } catch (error) {
      console.warn('Não foi possível carregar a missão de caramelos.', error);
    }
  }

  private save() {
    const storage = this.storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({
        version: 3,
        found: [...this.found],
        discovered: [...this.discovered],
        petUnlocked: this.petUnlocked,
      }));
    } catch (error) {
      console.warn('Não foi possível salvar a missão de caramelos.', error);
    }
  }
}

export const CARAMELO_PET_TUNING = {
  scale: .76,
  positionOffset: {x: 0, y: 0, z: 0},
  rotation: {x: 0, y: 0, z: 0},
  modelPivotY: 0,
  secondaryMotion: 0.025,
};

export type CarameloPet = ReturnType<typeof createCarameloPet>;

export function createCarameloPet(anchor: T.Object3D, color = 0xd9a555) {
  const group = new T.Group();
  group.name = 'caramelo-pet';
  group.position.y = CARAMELO_PET_TUNING.modelPivotY;
  group.visible = false;
  anchor.add(group);

  // Local Y=0 is the sole of the paws, both on the saddle and on the ground.
  const pose=new T.Group(),head=new T.Group(),tail=new T.Group();
  group.add(pose);pose.add(head,tail);
  head.position.set(0,.294,.057);tail.position.set(.043,.084,-.098);
  const coat=new T.Color(color),honey=coat.clone().multiplyScalar(.81);
  const cream=0xf2cb8f,umber=0x97623b,ink=0x332b27;
  // Bake rigid details into one vertex-coloured mesh per moving piece.
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.92,flatShading:true});
  const patches=new Map<T.Group,{p:number[];c:number[]}>();
  function oval(parent:T.Group,tint:T.ColorRepresentation,x:number,y:number,z:number,
    w:number,h:number,d:number,tilt=0,roll=0){
    const geo=new T.SphereGeometry(1,12,8);
    geo.scale(w,h,d);geo.rotateX(tilt);geo.rotateZ(roll);geo.translate(x,y,z);
    const positions=geo.getAttribute('position'),indices=geo.getIndex()!,rgb=new T.Color(tint);
    let batch=patches.get(parent);
    if(!batch){batch={p:[],c:[]};patches.set(parent,batch)}
    for(let i=0;i<indices.count;i++){const j=indices.getX(i);batch.p.push(positions.getX(j),positions.getY(j),positions.getZ(j));batch.c.push(rgb.r,rgb.g,rgb.b)}
    geo.dispose();
  }
  oval(pose,coat,0,.158,-.014,.079,.129,.098,.34);
  oval(pose,cream,0,.196,.057,.053,.080,.036,.36);
  for(const side of [-1,1]){
    // Folded haunches and long, slim forelegs give the seated silhouette.
    oval(pose,honey,side*.059,.074,-.046,.047,.068,.075,-.30);
    oval(pose,coat,side*.067,.026,-.003,.035,.025,.060);
    oval(pose,coat,side*.040,.102,.067,.023,.083,.024,-.09);
    oval(pose,cream,side*.040,.020,.087,.027,.020,.042);
  }
  oval(head,coat,0,0,0,.079,.079,.073);
  oval(head,cream,0,-.030,.073,.049,.031,.061,.05);
  oval(head,ink,0,-.019,.121,.025,.017,.017);
  for(const side of [-1,1]){
    oval(head,ink,side*.044,.014,.059,.011,.014,.009);
    oval(head,0xfff4d4,side*.044-.002,.018,.067,.0035,.0035,.002);
    oval(head,honey,side*.047,.033,.051,.018,.006,.009,0,-side*.16);
  }
  const ears=[-1,1].map(side=>{
    const ear=new T.Group();ear.position.set(side*.058,.049,-.009);head.add(ear);
    // One ear pricks up; the other folds forward with a darker tip.
    const drop=side===1;
    oval(ear,umber,side*.016,drop?-.010:.018,.004,.029,drop?.055:.048,.023,drop?-.45:.14,-side*.34);
    oval(ear,drop?honey:0xbc8262,side*.018,drop?-.022:.021,.017,.020,.032,.012,drop?-.45:.14,-side*.34);
    return ear;
  });
  oval(tail,honey,.022,.008,-.040,.021,.021,.063,0,.1);
  oval(tail,coat,.041,.036,-.086,.015,.042,.019,-.46);
  oval(tail,cream,.042,.069,-.092,.011,.021,.012,.28);
  for(const [parent,{p,c}] of patches){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(c,3));geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,material);mesh.receiveShadow=mesh.castShadow=true;parent.add(mesh);
  }

  let reaction = 0, animationTime = 0;
  return {
    group,
    setUnlocked(unlocked: boolean) {
      group.visible = unlocked;
    },
    react() {
      group.visible = true;
      reaction = 0.8;
    },
    update(lean: number, braking: number, dt: number) {
      animationTime += Math.max(0,dt);
      reaction = Math.max(0,reaction-Math.max(0,dt));
      const response = 1 - Math.exp(-8 * Math.max(0, dt));
      pose.rotation.z += (T.MathUtils.clamp(-lean, -1, 1) * CARAMELO_PET_TUNING.secondaryMotion
        + T.MathUtils.clamp(braking, 0, 1) * CARAMELO_PET_TUNING.secondaryMotion * 0.25
        - pose.rotation.z) * response;
      const earSway = T.MathUtils.clamp(-lean, -1, 1) * CARAMELO_PET_TUNING.secondaryMotion;
      ears[0].rotation.z += (earSway-ears[0].rotation.z)*response;
      ears[1].rotation.z += (-earSway-ears[1].rotation.z)*response;
      tail.rotation.y=Math.sin(animationTime*(reaction>0?26:4))*(reaction>0?.65:.13);
      head.rotation.x += ((reaction>0?-.16:0)-head.rotation.x)*response;
    },
  };
}
