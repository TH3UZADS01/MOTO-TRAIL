import { tracks, villages, places } from './map-layout';

export function onCobbles(x: number, z: number) {
  return villages.some(v => {
    const dx = Math.abs(x - v.x), dz = Math.abs(z - v.z);
    return (Math.abs(x - v.x - 10) <= 4 && dz < 49) ||
           (dz < 3.2 && dx < 39);
  });
}

type Scar = {
  x: number;
  z: number;
  rx: number;
  rz: number;
  depth: number;
};

export const scars: Scar[] = [];

const cells = new Map<string, Scar[]>();

const key = (x: number, z: number) =>
  Math.floor(x / 32) + ',' + Math.floor(z / 32);

for (const [ti, track] of tracks.entries()) {
  if (track.surface !== 'asfalto') continue;

  for (let i = 91 + ti * 7; i < track.points.length - 1; i += 87 + (i % 31)) {
    const p = track.points[i];
    const q = track.points[i + 1];
    const h = Math.atan2(q.x - p.x, q.z - p.z);
    const side = i % 2 ? 1.4 : -1.6;

    if (places.some(v => Math.hypot(v.x - p.x, v.z - p.z) < 45)) continue;

    const s = {
      x: p.x + side * Math.cos(h),
      z: p.z - side * Math.sin(h),
      rx: 0.5 + (i % 5) * 0.13,
      rz: 0.7 + (i % 4) * 0.16,
      depth: i % 3 === 0 ? 0.022 : -0.035 - (i % 5) * 0.011
    };

    scars.push(s);

    for (let gx = Math.floor((s.x - s.rx) / 32); gx <= Math.floor((s.x + s.rx) / 32); gx++) {
      for (let gz = Math.floor((s.z - s.rz) / 32); gz <= Math.floor((s.z + s.rz) / 32); gz++) {
        const k = gx + ',' + gz;
        const list = cells.get(k) ?? [];
        list.push(s);
        cells.set(k, list);
      }
    }
  }
}

export function pavementRelief(x: number, z: number) {
  for (const s of cells.get(key(x, z)) ?? []) {
    const d = ((x - s.x) / s.rx) ** 2 + ((z - s.z) / s.rz) ** 2;

    if (d < 1) {
      return s.depth * (1 - d) ** 2;
    }
  }

  return onCobbles(x, z)
    ? 0.008 * Math.sin(15 * x + 3 * z) * Math.cos(19 * z)
    : 0;
}