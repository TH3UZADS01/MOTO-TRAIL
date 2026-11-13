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

const STORAGE_KEY = 'caramelos-mission-v2';
const LEGACY_STORAGE_KEY = 'caramelos-mission-v1';

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
      const legacy = current === null ? storage.getItem(LEGACY_STORAGE_KEY) : null;
      const parsed: unknown = JSON.parse(current ?? legacy ?? '[]');
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
      if (legacy !== null || savedUnlock !== this.petUnlocked || version<3) this.save();
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
  scale: 1,
  positionOffset: {x: 0, y: 0, z: 0},
  rotation: {x: 0, y: 0, z: 0},
  modelPivotY: 0.23,
  secondaryMotion: 0.025,
};

export type CarameloPet = ReturnType<typeof createCarameloPet>;

export function createCarameloPet(anchor: T.Object3D, color = 0xd9a555) {
  const group = new T.Group();
  group.name = 'caramelo-pet';
  group.position.y = CARAMELO_PET_TUNING.modelPivotY;
  group.visible = false;
  anchor.add(group);

  const fur = new T.MeshStandardMaterial({color, roughness: 0.9});
  const dark = new T.MeshStandardMaterial({color: 0x4d3120, roughness: 1});
  const ear = new T.MeshStandardMaterial({color: 0x8f6132, roughness: 0.9});
  const pose = new T.Group();
  group.add(pose);

  const body = new T.Mesh(new T.SphereGeometry(.17, 18, 14), fur);
  body.scale.set(1.15, 0.8, 1.5);
  body.position.y = 0.02;
  pose.add(body);

  const head = new T.Mesh(new T.SphereGeometry(.11, 16, 12), fur);
  head.position.set(0, 0.12, 0.19);
  head.scale.set(1.1, 1, 1);
  pose.add(head);

  const snout = new T.Mesh(new T.SphereGeometry(.06, 12, 10), dark);
  snout.position.set(0, 0.05, 0.28);
  snout.scale.set(1.2, 0.8, 1.6);
  pose.add(snout);

  const earLeft = new T.Mesh(new T.ConeGeometry(.04, .09, 8), ear);
  earLeft.rotation.z = -0.3;
  earLeft.position.set(-0.09, 0.22, 0.17);
  pose.add(earLeft);

  const earRight = earLeft.clone();
  earRight.position.x = 0.09;
  pose.add(earRight);

  const tail = new T.Mesh(new T.ConeGeometry(.04, .12, 8), fur);
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.08, -0.22);
  pose.add(tail);

  const legPositions = [[-0.08, -0.12, 0.06], [0.08, -0.12, 0.06], [-0.08, -0.12, -0.06], [0.08, -0.12, -0.06]];
  for (const [x, y, z] of legPositions) {
    const leg = new T.Mesh(new T.CapsuleGeometry(.03, .09, 4, 8), dark);
    leg.position.set(x, y, z);
    pose.add(leg);
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
      earLeft.rotation.z += (-0.3 + earSway - earLeft.rotation.z) * response;
      earRight.rotation.z += (0.3 - earSway - earRight.rotation.z) * response;
      tail.rotation.z += ((reaction>0?Math.sin(animationTime*38)*.7:0)-tail.rotation.z)*response;
      head.rotation.x += ((reaction>0?-.16:0)-head.rotation.x)*response;
    },
  };
}
