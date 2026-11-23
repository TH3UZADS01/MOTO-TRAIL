export type VehicleId = "pop" | "cub" | "urban" | "caloi" | "cg150" | "sahara";

export interface TorquePoint {
  rpm: number;
  torqueNm: number;
}

export interface VehicleSpec {
  id: VehicleId;
  name: string;
  note: string;
  maxSpeed: number;
  aerodynamicDrag: number;
  power: number;
  wheelbase: number;
  eyeHeight: number;
  gears: number;
  gearRatios: number[];
  finalDrive: number;
  wheelRadius: number;
  idleRpm: number;
  stallRpm: number;
  clutchEngagementRpm: number;
  peakPowerRpm: number;
  redlineRpm: number;
  // Frequência das interrupções do limitador (ciclos por segundo), independente do RPM máximo.
  cutFrequencyHz: number;
  accelerationScale?: { realistic: number; arcade: number };
  torqueCurve: TorquePoint[];
  gearMinSpeedKmh: number[];
  wheelieMaxSpeedKmh: number[];
  centerOfMassHeight: number;
  centerOfMassRearDistance: number;
  riderMass: number;
  audio: "engine" | "moped" | "cg150" | "sahara";
  pitch: number;
  filter: number;
  mass?: number;
  braking?: number;
  stability?: number;
  wheelieAssist?: number;
}

// All values are gameplay tuning, not manufacturer dyno specifications.
export const vehicles: VehicleSpec[] = [
  // XRE300 Sahara: Honda gasoline torque and power peaks; intermediate points and gearing are game estimates.
  // Mass includes fuel and fluids.
  {
    id: "sahara",
    name: "Honda Sahara 300 2026",
    note: "293,5 cc · trail moderna · 6 marchas",
    maxSpeed: 150 / 3.6,
    aerodynamicDrag: 0.0015,
    power: 2.2,
    wheelbase: 1.425,
    eyeHeight: 1.6,
    gears: 6,
    gearRatios: [3, 2.0, 1.52, 1.24, 1.05, 0.91],
    finalDrive: 7.4,
    wheelRadius: 0.325,
    idleRpm: 1300,
    stallRpm: 950,
    clutchEngagementRpm: 2000,
    peakPowerRpm: 7500,
    redlineRpm: 8500,
    cutFrequencyHz: 9,
    torqueCurve: [
      { rpm: 1300, torqueNm: 12 },
      { rpm: 2500, torqueNm: 17 },
      { rpm: 4000, torqueNm: 23 },
      { rpm: 5750, torqueNm: 26.5 },
      { rpm: 6500, torqueNm: 25.7 },
      { rpm: 7500, torqueNm: (24.8 * 735.49875) / ((7500 * 2 * Math.PI) / 60) },
      { rpm: 8000, torqueNm: 21.6 },
      { rpm: 8500, torqueNm: 20 },
    ],
    gearMinSpeedKmh: [0, 18, 30, 43, 55, 65],
    wheelieMaxSpeedKmh: [50, 70, 85, 0, 0, 0],
    centerOfMassHeight: 0.73,
    centerOfMassRearDistance: 0.71,
    riderMass: 75,
    audio: "sahara",
    pitch: 1,
    filter: 6500,
    mass: 159,
    braking: 1.2,
    stability: 1.16,
    wheelieAssist: 0.65,
  },
  {
    id: "cg150",
    name: "Honda CG Titan 150 2008",
    note: "150 cc · urbana · até 132 km/h",
    maxSpeed: 132 / 3.6,
    aerodynamicDrag: 0.002,
    power: 1.75,
    wheelbase: 1.32,
    eyeHeight: 1.6,
    gears: 5,
    gearRatios: [2.93, 2.08, 1.62, 1.24, 0.96],
    finalDrive: 8.902662,
    wheelRadius: 0.315,
    idleRpm: 1400,
    stallRpm: 1100,
    clutchEngagementRpm: 1800,
    peakPowerRpm: 8000,
    redlineRpm: 9500,
    cutFrequencyHz: 16,
    torqueCurve: [
      { rpm: 1400, torqueNm: 8 },
      { rpm: 3000, torqueNm: 13 },
      { rpm: 5000, torqueNm: 16.5 },
      { rpm: 6500, torqueNm: 17.5 },
      { rpm: 8000, torqueNm: 15.2 },
      { rpm: 8750, torqueNm: 13.6 },
      { rpm: 9500, torqueNm: 12.2 },
    ],
    gearMinSpeedKmh: [0, 18, 35, 50, 70],
    wheelieMaxSpeedKmh: [48, 70, 80, 0, 0],
    centerOfMassHeight: 0.66,
    centerOfMassRearDistance: 0.68,
    riderMass: 75,
    audio: "cg150",
    pitch: 1,
    filter: 7000,
    mass: 118,
    braking: 1.15,
    stability: 1.12,
  },
  {
    id: "pop",
    name: "Honda Pop 110i 2024",
    note: "Leve e ágil · até 115 km/h",
    maxSpeed: 115 / 3.6,
    aerodynamicDrag: 0.0044,
    power: 1.56,
    accelerationScale: { realistic: 0.5, arcade: 0.34 },
    wheelbase: 1.238,
    eyeHeight: 1.48,
    gears: 4,
    gearRatios: [2.86, 1.96, 1.46, 1.12],
    finalDrive: 7.58812,
    wheelRadius: 0.305,
    idleRpm: 1400,
    stallRpm: 1050,
    clutchEngagementRpm: 1800,
    peakPowerRpm: 7250,
    redlineRpm: 8500,
    cutFrequencyHz: 5,
    torqueCurve: [
      { rpm: 1400, torqueNm: 7.2 },
      { rpm: 3000, torqueNm: 10.8 },
      { rpm: 5000, torqueNm: 14.4 },
      { rpm: 6000, torqueNm: 15 },
      { rpm: 7250, torqueNm: 14.16 },
      { rpm: 8000, torqueNm: 12.6 },
      { rpm: 8500, torqueNm: 11.52 },
    ],
    gearMinSpeedKmh: [0, 18, 32, 50],
    wheelieMaxSpeedKmh: [42, 62, 70, 0],
    centerOfMassHeight: 0.62,
    centerOfMassRearDistance: 0.64,
    riderMass: 75,
    audio: "engine",
    pitch: 1,
    filter: 3000,
    mass: 104,
  },
  {
    id: "cub",
    name: "Honda Super Cub C125",
    note: "Clássica de escudo creme · até 82,8 km/h",
    maxSpeed: 82.8 / 3.6,
    aerodynamicDrag: 0.0086,
    power: 0.9,
    wheelbase: 1.22,
    eyeHeight: 1.46,
    gears: 4,
    gearRatios: [3.08, 2.14, 1.66, 1.22],
    finalDrive: 9.35798,
    wheelRadius: 0.295,
    idleRpm: 1350,
    stallRpm: 980,
    clutchEngagementRpm: 1700,
    peakPowerRpm: 7500,
    redlineRpm: 8500,
    cutFrequencyHz: 5,
    torqueCurve: [
      { rpm: 1350, torqueNm: 5 },
      { rpm: 3000, torqueNm: 8 },
      { rpm: 5000, torqueNm: 10 },
      { rpm: 6250, torqueNm: 10.5 },
      { rpm: 7500, torqueNm: 10 },
      { rpm: 8000, torqueNm: 9.25 },
      { rpm: 8500, torqueNm: 8.6 },
    ],
    gearMinSpeedKmh: [0, 15, 25, 38],
    wheelieMaxSpeedKmh: [34, 50, 0, 0],
    centerOfMassHeight: 0.59,
    centerOfMassRearDistance: 0.63,
    riderMass: 75,
    audio: "engine",
    pitch: 0.88,
    filter: 1300,
    mass: 96,
  },
  {
    id: "urban",
    name: "Shineray Phoenix 50",
    note: "50 cc · carburada · 4 marchas",
    maxSpeed: 92 / 3.6,
    aerodynamicDrag: 0.0069,
    power: 1.06,
    wheelbase: 1.25,
    eyeHeight: 1.5,
    gears: 4,
    gearRatios: [2.74, 1.92, 1.48, 1.17],
    finalDrive: 9.771512,
    wheelRadius: 0.31,
    idleRpm: 1500,
    stallRpm: 1010,
    clutchEngagementRpm: 1750,
    peakPowerRpm: 8000,
    redlineRpm: 9000,
    cutFrequencyHz: 12,
    torqueCurve: [
      { rpm: 1500, torqueNm: 2.4 },
      { rpm: 3200, torqueNm: 4.8 },
      { rpm: 5000, torqueNm: 7.8 },
      { rpm: 6500, torqueNm: 8.1 },
      { rpm: 8000, torqueNm: 7.4 },
      { rpm: 8500, torqueNm: 6.9 },
      { rpm: 9000, torqueNm: 6.4 },
    ],
    gearMinSpeedKmh: [0, 17, 28, 40],
    wheelieMaxSpeedKmh: [38, 56, 64, 0],
    centerOfMassHeight: 0.61,
    centerOfMassRearDistance: 0.65,
    riderMass: 75,
    audio: "engine",
    pitch: 1.12,
    filter: 2300,
    mass: 102,
    wheelieAssist: 1.08,
  },
  {
    id: "caloi",
    name: "Caloi XR 50 2T",
    note: "AV10 · dois tempos · transmissão automática",
    maxSpeed: 57.5 / 3.6,
    aerodynamicDrag: 0.023,
    power: 0.68,
    wheelbase: 1.12,
    eyeHeight: 1.43,
    gears: 1,
    gearRatios: [2.8],
    finalDrive: 4.078995,
    wheelRadius: 0.268,
    idleRpm: 1500,
    stallRpm: 1000,
    clutchEngagementRpm: 1500,
    peakPowerRpm: 5500,
    redlineRpm: 6500,
    cutFrequencyHz: 11,
    torqueCurve: [
      { rpm: 1500, torqueNm: 2.2 },
      { rpm: 2600, torqueNm: 3.1 },
      { rpm: 3800, torqueNm: 5.5 },
      { rpm: 4800, torqueNm: 7.1 },
      { rpm: 5500, torqueNm: 7.0 },
      { rpm: 6000, torqueNm: 6.3 },
      { rpm: 6500, torqueNm: 5.65 },
    ],
    gearMinSpeedKmh: [0],
    wheelieMaxSpeedKmh: [35],
    centerOfMassHeight: 0.48,
    centerOfMassRearDistance: 0.54,
    riderMass: 75,
    audio: "moped",
    pitch: 1,
    filter: 2600,
    mass: 42,
    wheelieAssist: 1.55,
  },
];

export const getVehicle = (id: string) =>
  vehicles.find((v) => v.id === id) || vehicles.find((v) => v.id === "pop")!;
