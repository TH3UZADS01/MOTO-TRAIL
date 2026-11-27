import {clamp} from './body-control';
import type {VehicleId} from './vehicles';

// Hip rise in metres, seated corner lean in radians, loose-ground steering assist as a fraction.
export const ergonomics = {
  pop:   {rise: .145, lean: .10,  assist: .035},
  cub:   {rise: .135, lean: .09,  assist: .030},
  cg150: {rise: .170, lean: .16,  assist: .045},
  sahara:{rise: .200, lean: .14,  assist: .080},
  urban: {rise: .135, lean: .10,  assist: .030},
  caloi: {rise: .130, lean: .085, assist: .025}
} satisfies Record<VehicleId, {rise: number; lean: number; assist: number}>;

export type RiderPose = {
  stand: number;
  rise: number;
  sideLean: number;
  brace: number;
  absorption: number;
};

export class RiderPosture implements RiderPose {
  standing = false;
  stand = 0;
  rise = 0;
  sideLean = 0;
  brace = 0;
  absorption = 0;
  lateralAcceleration = 0;
  private previousTravel = 0;

  reset() {
    this.standing = false;
    this.stand = 0;
    this.rise = 0;
    this.sideLean = 0;
    this.brace = 0;
    this.absorption = 0;
    this.lateralAcceleration = 0;
    this.previousTravel = 0;
  }

  step(dt: number, id: VehicleId, speed: number, bank: number, lateral: number,
       longitudinal: number, loose: boolean, slip: number, front: number, rear: number) {
    const profile = ergonomics[id];
    const blend = 1 - Math.exp(-6 * dt);
    this.stand += (Number(this.standing) - this.stand) * (1 - Math.exp(-4.5 * dt));
    this.lateralAcceleration = lateral;

    const travel = (front + rear) * .5;
    const impulse = clamp(Math.abs(travel - this.previousTravel) / Math.max(.001, dt), 0, 1);
    this.previousTravel = travel;
    this.absorption += (impulse * this.stand * .07 - this.absorption) * blend;
    this.rise = profile.rise * this.stand - this.absorption;

    // Road riders follow the corner. On loose ground the torso stays closer to vertical.
    const motion = clamp((Math.abs(speed) - 4) / 5, 0, 1);
    const highSpeed = clamp((Math.abs(speed) - 20) / 18, 0, 1);
    const corner = -Math.tanh(lateral / 6) * profile.lean * (1 - .30 * highSpeed);
    const relativeLean = loose ? -bank * (.46 + .37 * this.stand) : corner * (1 - .7 * this.stand);
    const targetLean = clamp(relativeLean + slip * .08, -.40, .40) * motion;
    this.sideLean += (targetLean - this.sideLean) * blend;
    this.brace += (clamp(longitudinal / 7, -1, 1) - this.brace) * blend;
  }
}
