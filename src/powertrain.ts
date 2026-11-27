import type { VehicleSpec } from "./vehicles";
import { BODY_TUNING, clamp } from "./body-control";
// Gameplay RPM calibration, not manufacturer dyno data.*
export const ENGINE_TUNING = {
  idleRpm: 1400,
  shiftDelay: 0.22,
  downshiftRatio: 0.72,
  cutHz: 8, // Fallback para specs antigas sem cutFrequencyHz.
  cutDuty: 0.32,
  cutGain: 0.16,
  rpmResponse: 32, // Free or slipping engine reaches 90% of a throttle step in 72 ms.
  clutchSlipRpm: 700,
  revMatchDuration: 0.3,
  blipThrottle: 0.65,
  revMatchIntensity: 0.32,
  revMatchOvershootRpm: 650,
  revMatchMinimumRpm: 180,
  revMatchVolume: 0.45,
};
// Keep the limiter latched through the small RPM dip caused by each ignition cut.*
export const LIMITER_TUNING = { entryRpm: 25, releaseRpm: 100 };
const smoothstep = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
export class Powertrain {
  private blipEnabled = true;
  get autoBlip() {
    return this.blipEnabled;
  }
  set autoBlip(enabled: boolean) {
    this.blipEnabled = enabled;
    if (!enabled) this.cancelBlip();
  }
  cancelBlip() {
    this.revMatchTime = 0;
    this.revMatchPeak = 0;
  }
  get blipThrottle() {
    return this.autoBlip
      ? ENGINE_TUNING.blipThrottle * this.revMatchEnvelope
      : 0;
  }
  effectiveThrottle(input: number) {
    return Math.max(clamp(input, 0, 1), this.blipThrottle);
  }
  gear = 1;
  rpm = ENGINE_TUNING.idleRpm;
  ratio = 0;
  limiting = false;
  cutting = false;
  clutch = 0;
  engineBrakeTorque=0; // Resistive torque at the rear wheel, Nm (magnitude).
  engineBrakeStrength=0; // Fraction of calibrated peak crank torque actually transmitted.
  private coastCurve=0;
  resetEngineBrake(){this.coastCurve=0;this.engineBrakeTorque=0;this.engineBrakeStrength=0}
  updateEngineBrake(dt:number,spec:VehicleSpec,speed:number,throttle:number,enabled:boolean){
    if(!enabled||this.gear===0||this.stalled||this.clutch<=0||speed<=0){
      this.resetEngineBrake();return 0;
    }
    const wheelRpm=this.wheelRpmFromSpeed(speed,spec);
    const rev=clamp((Math.min(this.rpm,wheelRpm)-spec.idleRpm)/(spec.redlineRpm-spec.idleRpm),0,1);
    const curve=Math.pow(rev,spec.engineBrake.exponent);
    this.coastCurve+=(curve-this.coastCurve)*(1-Math.exp(-dt*spec.engineBrake.response));
    this.engineBrakeStrength=this.coastCurve*this.clutch*(1-smoothstep(throttle/.18));
    this.engineBrakeTorque=spec.engineBrake.peakNm*this.engineBrakeStrength*this.getTotalRatio(spec);
    return this.engineBrakeTorque/spec.wheelRadius;
  }
  lugging = false;
  revMatchTime = 0;
  revMatchPeak = 0;
  revMatchSequence = 0;
  stalled = false;
  private shiftTime = 0;
  private shiftCooldown = 0;
  private phase = 0;
  private kickTime = 0;
  private kickCooldown = 0;
  private kickHeld = false;
  private kickGear = 1;
  private kickBaseRpm = 0;
  clutchKickGain = 1;
  resetClutchKick() {
    this.kickTime = 0;
    this.kickCooldown = 0;
    this.kickHeld = false;
    this.clutchKickGain = 1;
  }
  updateClutchKick(
    dt: number,
    spec: VehicleSpec,
    speed: number,
    throttle: number,
    brake: number,
    bodyInput: number,
    grounded: boolean,
    disabled = false,
  ) {
    const t = BODY_TUNING,
      held = bodyInput < -0.55;
    if (!held) this.kickHeld = false;
    this.kickCooldown = Math.max(0, this.kickCooldown - dt);
    this.clutchKickGain = 1;
    const allowed =
      !disabled &&
      !this.stalled &&
      !this.limiting &&
      brake < 0.05 &&
      throttle > 0.45 &&
      speed >= t.minWheelieSpeed &&
      speed * 3.6 <= (spec.wheelieMaxSpeedKmh[this.gear - 1] ?? 0);
    if (!allowed || this.gear !== this.kickGear) this.kickTime = 0;
    if (
      held &&
      !this.kickHeld &&
      allowed &&
      grounded &&
      this.kickCooldown === 0
    ) {
      this.kickHeld = true;
      this.kickTime = t.clutchCharge + t.clutchRelease;
      this.kickCooldown = t.clutchCooldown;
      this.kickGear = this.gear;
      this.kickBaseRpm = this.rpm;
    }
    if (this.kickTime <= 0) return;
    this.kickTime = Math.max(0, this.kickTime - dt);
    // Keep a strong flare even with a partially pressed trigger; the redline clamp below still applies.*
    const flare = Math.max(
      t.clutchMinimumPeakRatio * spec.redlineRpm - this.kickBaseRpm,
      t.clutchRpm,
      spec.idleRpm +
        (spec.redlineRpm - spec.idleRpm) * t.clutchPeakRatio * throttle -
        this.kickBaseRpm,
    );
    if (this.kickTime > t.clutchRelease) {
      const charge = 1 - (this.kickTime - t.clutchRelease) / t.clutchCharge;
      // An RPM target, not an additive boost every frame, keeps the flare consistent at any tick rate.*
      this.clutch *= 0.35;
      this.rpm = Math.min(
        spec.redlineRpm - 100,
        Math.max(
          this.rpm,
          this.kickBaseRpm + flare * smoothstep(Math.min(1, charge / 0.65)),
        ),
      );
    } else {
      const release = this.kickTime / t.clutchRelease;
      this.clutchKickGain = 1 + t.clutchBoost * Math.sin(Math.PI * release);
      this.rpm = Math.min(
        spec.redlineRpm - 100,
        Math.max(
          this.rpm,
          this.kickBaseRpm + flare * smoothstep(Math.min(1, release / 0.85)),
        ),
      );
    }
    this.ratio = clamp(
      (this.rpm - spec.idleRpm) / (spec.redlineRpm - spec.idleRpm),
      0,
      1,
    );
  }
  get driveFactor() {
    return this.cutting ? 0 : 1;
  }
  private updateLimiter(
    dt: number,
    wheelRpm: number,
    spec: VehicleSpec,
    throttle: number,
    brake: number,
    push: boolean,
  ) {
    const threshold =
      spec.redlineRpm -
      (this.limiting ? LIMITER_TUNING.releaseRpm : LIMITER_TUNING.entryRpm);
    this.limiting =
      !push &&
      !this.stalled &&
      throttle > 0.25 &&
      brake < 0.05 &&
      wheelRpm >= threshold;
    if (this.limiting) this.phase = (this.phase + dt * (spec.cutFrequencyHz ?? ENGINE_TUNING.cutHz)) % 1;
    else this.phase = 0;
    this.cutting = this.limiting && this.phase < ENGINE_TUNING.cutDuty;
  }
  get torqueRpm() {
    return Math.max(0, this.rpm - this.revMatchPeak * this.revMatchEnvelope);
  }
  get revMatchEnvelope() {
    if (this.revMatchTime <= 0 || ENGINE_TUNING.revMatchDuration <= 0) return 0;
    return Math.sin(
      Math.PI *
        clamp(1 - this.revMatchTime / ENGINE_TUNING.revMatchDuration, 0, 1),
    );
  }
  private startRevMatch(
    targetRpm: number,
    spec: VehicleSpec,
    gearSteps: number,
  ) {
    if (!this.autoBlip || targetRpm <= spec.idleRpm) {
      this.cancelBlip();
      return;
    }
    const target = clamp(targetRpm, spec.idleRpm, spec.redlineRpm),
      headroom = Math.max(0, spec.redlineRpm - target);
    const requested = Math.max(
      ENGINE_TUNING.revMatchMinimumRpm,
      Math.max(0, target - this.rpm) * ENGINE_TUNING.revMatchIntensity +
        Math.max(0, gearSteps - 1) * ENGINE_TUNING.revMatchOvershootRpm * 0.25,
    );
    this.revMatchPeak = Math.min(headroom, requested);
    this.revMatchTime = ENGINE_TUNING.revMatchDuration;
    this.revMatchSequence++;
  }
  getGearRatio(spec: VehicleSpec, gear = this.gear) {
    if (gear === 0) return 0;
    return (
      spec.gearRatios[
        Math.max(0, Math.min(gear - 1, spec.gearRatios.length - 1))
      ] ?? 1
    );
  }
  torqueScale = 1;
  finalRatioScale = 1;
  getTotalRatio(spec: VehicleSpec, gear = this.gear) {
    return (
      this.getGearRatio(spec, gear) * spec.finalDrive * this.finalRatioScale
    );
  }
  wheelRpmFromSpeed(speed: number, spec: VehicleSpec, gear = this.gear) {
    if (speed <= 0) return 0;
    return (
      (speed * 60 * this.getTotalRatio(spec, gear)) /
      (2 * Math.PI * spec.wheelRadius)
    );
  }
  speedAtRpm(rpm: number, spec: VehicleSpec, gear = this.gear) {
    if (gear === 0) return 0;
    return (
      (Math.max(0, rpm) * (2 * Math.PI * spec.wheelRadius)) /
      (60 * this.getTotalRatio(spec, gear))
    );
  }
  speedAtRedline(spec: VehicleSpec, gear = this.gear) {
    return this.speedAtRpm(spec.redlineRpm, spec, gear);
  }
  torqueAtRpm(rpm: number, spec: VehicleSpec) {
    const curve = spec.torqueCurve,
      limited = clamp(rpm, curve[0].rpm, curve[curve.length - 1].rpm);
    for (let i = 1; i < curve.length; i++)
      if (limited <= curve[i].rpm) {
        const a = curve[i - 1],
          b = curve[i],
          t = (limited - a.rpm) / (b.rpm - a.rpm);
        return a.torqueNm + (b.torqueNm - a.torqueNm) * t;
      }
    return curve[curve.length - 1].torqueNm;
  }
  gearLugFactor(speed: number, spec: VehicleSpec, gear = this.gear) {
    if (gear <= 1) return 1;
    const minimum = spec.gearMinSpeedKmh[gear - 1] ?? 0;
    if (minimum <= 0) return 1;
    const ratio = clamp((speed * 3.6) / Math.max(minimum, 0.01), 0, 1);
    const floor = [0.42, 0.28, 0.2, 0.14, 0.1][gear - 2] ?? 0.08;
    return floor + (1 - floor) * smoothstep(ratio);
  }
  wheelTorque(
    spec: VehicleSpec,
    speed: number,
    throttle = 1,
    gear = this.gear,
  ) {
    const delivered =
      clamp(throttle, 0, 1) *
      this.clutch *
      this.gearLugFactor(speed, spec, gear) *
      this.driveFactor;
    return (
      this.torqueAtRpm(this.torqueRpm, spec) *
      this.torqueScale *
      this.getTotalRatio(spec, gear) *
      delivered *
      this.clutchKickGain
    );
  }
  wheelForce(spec: VehicleSpec, speed: number, throttle = 1, gear = this.gear) {
    return this.wheelTorque(spec, speed, throttle, gear) / spec.wheelRadius;
  }
  estimatedRpm(spec: VehicleSpec, speed: number, gear = this.gear) {
    return clamp(
      this.wheelRpmFromSpeed(speed, spec, gear),
      spec.idleRpm,
      spec.redlineRpm,
    );
  }
  wheeliePhysics(
    spec: VehicleSpec,
    speed: number,
    throttle: number,
    bodyLean: number,
  ) {
    const wheelTorque = this.wheelTorque(spec, speed, throttle),
      tractionForce = wheelTorque / spec.wheelRadius;
    const rearArm =
      spec.centerOfMassRearDistance * (1 - 0.55 * clamp(-bodyLean, 0, 1));
    const comHeight =
      spec.centerOfMassHeight * (1 + 0.1 * clamp(-bodyLean, 0, 1));
    const mass = (spec.mass ?? 100) + spec.riderMass;
    return {
      wheelTorque,
      tractionForce,
      pitchTorque: tractionForce * comHeight,
      stabilizingTorque: mass * 9.81 * rearArm,
    };
  }
  allowWheelie(
    spec: VehicleSpec,
    speed: number,
    throttle: number,
    brake: number,
    bodyLean: number,
  ) {
    const maxKmh = spec.wheelieMaxSpeedKmh[this.gear - 1] ?? 0;
    if (
      maxKmh <= 0 ||
      speed * 3.6 > maxKmh ||
      speed < BODY_TUNING.minWheelieSpeed ||
      throttle < 0.45 ||
      this.limiting ||
      this.clutch < 0.12
    )
      return 0;
    const { pitchTorque, stabilizingTorque } = this.wheeliePhysics(
      spec,
      speed,
      throttle,
      bodyLean,
    );
    return pitchTorque *
      BODY_TUNING.wheeliePitchForceScale *
      (spec.wheelieAssist ?? 1) >=
      stabilizingTorque * BODY_TUNING.wheelieForceMargin
      ? 1
      : 0;
  }
  reset(idleRpm = ENGINE_TUNING.idleRpm) {
    this.resetClutchKick();
    this.gear = 1;
    this.rpm = idleRpm;
    this.ratio = 0;
    this.limiting = false;
    this.cutting = false;
    this.clutch = 0;
    this.lugging = false;
    this.shiftTime = 0;
    this.shiftCooldown = 0;
    this.phase = 0;
    this.revMatchTime = 0;
    this.revMatchPeak = 0;
    this.stalled = false;
  }
  requestShift(
    direction: -1 | 1,
    speed: number,
    spec: VehicleSpec,
    _topSpeed: number,
    realistic = false,
  ) {
    if (spec.gears === 1 || this.shiftCooldown > 0) return false;
    const next = clamp(this.gear + direction, 0, spec.gears);
    if (next === 0 && this.gear === 1) {
      if (Math.abs(speed) > 0.001) return false;
      this.gear = 0;
      this.shiftCooldown = ENGINE_TUNING.shiftDelay;
      this.shiftTime = 0;
      this.clutch = 0;
      this.cancelBlip();
      this.resetClutchKick();
      this.limiting = this.cutting = this.lugging = this.stalled = false;
      return true;
    }
    if (next === this.gear) return false;
    const oldGear = this.gear,
      previousRpm = this.rpm,
      nextRpm = this.wheelRpmFromSpeed(speed, spec, next),
      target = clamp(nextRpm, spec.idleRpm, spec.redlineRpm);
    if (direction === -1 && nextRpm > spec.redlineRpm) return false;
    if (realistic) {
      this.gear = next;
      this.shiftCooldown = ENGINE_TUNING.shiftDelay;
      this.shiftTime = 0;
      this.limiting = false;
      this.cutting = false;
      if (direction === -1) {
        this.rpm = previousRpm;
        this.startRevMatch(target, spec, oldGear - next);
      } else {
        this.revMatchTime = 0;
        this.revMatchPeak = 0;
      }
      this.rpm = target;
      return true;
    }
    this.gear = next;
    this.shiftCooldown = ENGINE_TUNING.shiftDelay;
    this.shiftTime = 0;
    this.limiting = false;
    this.cutting = false;
    if (direction === -1)
      this.startRevMatch(
        this.estimatedRpm(spec, speed, next),
        spec,
        oldGear - next,
      );
    else {
      this.revMatchTime = 0;
      this.revMatchPeak = 0;
    }
    this.rpm = this.estimatedRpm(spec, speed, next);
    return true;
  }
  update(
    dt: number,
    speed: number,
    spec: VehicleSpec,
    topSpeed: number,
    throttle: number,
    brake: number,
    push: boolean,
    automatic = true,
    realistic = false,
    lever = 0,
  ) {
    const previousRpm=this.rpm;
    if(lever<1)this.updateEngaged(dt,speed,spec,topSpeed,throttle,brake,push,automatic,realistic);
    else{
      this.shiftCooldown=Math.max(0,this.shiftCooldown-dt);
      this.clutch=0;this.lugging=false;this.stalled=false;this.cancelBlip();
    }
    if(lever>0){
      this.clutch*=1-lever;
      const target=spec.idleRpm+clamp(throttle,0,1)*(spec.redlineRpm-spec.idleRpm);
      const freeRpm=previousRpm+(target-previousRpm)*(1-Math.exp(-ENGINE_TUNING.rpmResponse*dt));
      this.rpm+=(freeRpm-this.rpm)*lever;
      this.ratio=clamp((this.rpm-spec.idleRpm)/(spec.redlineRpm-spec.idleRpm),0,1);
      this.updateLimiter(dt,this.rpm,spec,throttle,brake,push);
    }
  }
  private updateEngaged(
    dt: number,
    speed: number,
    spec: VehicleSpec,
    topSpeed: number,
    throttle: number,
    brake: number,
    push: boolean,
    automatic = true,
    realistic = false,
  ) {
    if (push || speed < 0.5 || this.stalled) this.cancelBlip();
    if (this.gear === 0) {
      if (automatic || spec.gears === 1) this.gear = 1;
      else {
        dt = clamp(dt, 0, 0.1);
        this.shiftCooldown = Math.max(0, this.shiftCooldown - dt);
        const target =
          spec.idleRpm +
          clamp(throttle, 0, 1) * (spec.redlineRpm - spec.idleRpm);
        this.rpm +=
          (target - this.rpm) * (1 - Math.exp(-ENGINE_TUNING.rpmResponse * dt));
        this.ratio = clamp(
          (this.rpm - spec.idleRpm) / (spec.redlineRpm - spec.idleRpm),
          0,
          1,
        );
        this.clutch = 0;
        this.updateLimiter(dt, this.rpm, spec, throttle, 0, push);
        return;
      }
    }
    if (realistic) {
      this.updateRealistic(
        dt,
        speed,
        spec,
        topSpeed,
        throttle,
        brake,
        push,
        automatic,
      );
      return;
    }
    const t = ENGINE_TUNING;
    dt = clamp(dt, 0, 0.1);
    this.gear = clamp(this.gear, 1, spec.gears);
    this.shiftCooldown = Math.max(0, this.shiftCooldown - dt);
    if (push || (automatic && speed < 0.1)) {
      this.gear = 1;
      this.shiftTime = 0;
      this.limiting = false;
    }
    const maxForGear = (gear: number) =>
      Math.min(topSpeed, this.speedAtRedline(spec, gear));
    let wheelRpm = this.wheelRpmFromSpeed(speed, spec),
      downshiftSteps = 0;
    if (
      automatic &&
      this.shiftCooldown === 0 &&
      this.gear > 1 &&
      speed < maxForGear(this.gear - 1) * t.downshiftRatio
    ) {
      const oldGear = this.gear;
      this.gear--;
      downshiftSteps = oldGear - this.gear;
      this.shiftTime = 0;
      this.shiftCooldown = t.shiftDelay;
      wheelRpm = this.wheelRpmFromSpeed(speed, spec);
    }
    this.updateLimiter(dt, wheelRpm, spec, throttle, brake, push);
    if (
      automatic &&
      this.shiftCooldown === 0 &&
      this.gear < spec.gears &&
      (wheelRpm >= spec.redlineRpm - 180 ||
        speed >= maxForGear(this.gear) * 0.98)
    ) {
      this.shiftTime += dt;
      if (this.shiftTime >= t.shiftDelay) {
        this.gear++;
        this.shiftCooldown = t.shiftDelay;
        this.shiftTime = 0;
        this.limiting = false;
        wheelRpm = this.wheelRpmFromSpeed(speed, spec);
      }
    } else this.shiftTime = 0;
    if (!this.limiting) {
      this.phase = 0;
      this.cutting = false;
    }
    this.ratio = clamp(wheelRpm / spec.redlineRpm, 0, 1);
    const target = clamp(wheelRpm, spec.idleRpm, spec.redlineRpm);
    if (downshiftSteps) this.startRevMatch(target, spec, downshiftSteps);
    this.revMatchTime = Math.max(0, this.revMatchTime - dt);
    this.rpm = Math.min(
      spec.redlineRpm,
      target + this.revMatchPeak * this.revMatchEnvelope,
    );
    if (this.revMatchTime === 0) this.revMatchPeak = 0;
    this.clutch = 1;
    this.lugging = false;
  }
  private updateRealistic(
    dt: number,
    speed: number,
    spec: VehicleSpec,
    topSpeed: number,
    throttle: number,
    brake: number,
    push: boolean,
    automatic: boolean,
  ) {
    const t = ENGINE_TUNING;
    dt = clamp(dt, 0, 0.1);
    this.gear = clamp(this.gear, 1, spec.gears);
    this.shiftCooldown = Math.max(0, this.shiftCooldown - dt);
    const speedKmh = Math.max(0, speed) * 3.6,
      gearMax = Math.min(topSpeed * 3.6, this.speedAtRedline(spec) * 3.6);
    let wheelRpm = this.wheelRpmFromSpeed(speed, spec);
    let downshiftSteps = 0;
    if (automatic && this.shiftCooldown === 0) {
      if (
        this.gear < spec.gears &&
        (wheelRpm >= spec.redlineRpm - 180 || speedKmh >= gearMax)
      ) {
        this.gear++;
        this.shiftCooldown = t.shiftDelay;
        wheelRpm = this.wheelRpmFromSpeed(speed, spec);
      } else if (
        this.gear > 1 &&
        (wheelRpm < spec.idleRpm + 850 ||
          speedKmh < (spec.gearMinSpeedKmh[this.gear - 1] ?? 0) * 0.78)
      ) {
        const oldGear = this.gear;
        this.gear--;
        downshiftSteps = oldGear - this.gear;
        this.shiftCooldown = t.shiftDelay;
        wheelRpm = this.wheelRpmFromSpeed(speed, spec);
      }
    }
    const idle = spec.idleRpm,
      redline = spec.redlineRpm,
      gearMin = spec.gearMinSpeedKmh[this.gear - 1] ?? 0;
    if (downshiftSteps)
      this.startRevMatch(clamp(wheelRpm, idle, redline), spec, downshiftSteps);
    // The blip opens the throttle briefly, including clutch engagement and delivered torque.*
    this.revMatchTime = Math.max(0, this.revMatchTime - dt);
    throttle = this.effectiveThrottle(throttle);
    const gearLowSpeed = gearMin > 0 && speedKmh < gearMin * 0.45;
    const nearStall =
      gearLowSpeed && this.gear >= 3 && speedKmh < Math.max(2, gearMin * 0.1);
    const freeRpm =
      idle +
      (redline - idle) * (push ? 0 : 0.025 + clamp(throttle, 0, 1) * 0.58);
    // Slip is confined to launch. Once coupled, the selected ratio sets engine RPM.*
    // The single-speed moped uses a wider centrifugal engagement range for takeoff.*
    const singleSpeed = spec.gears === 1;
    const startRpm = singleSpeed ? spec.clutchEngagementRpm : idle;
    const lockRpm = singleSpeed
      ? startRpm * 3.2
      : spec.clutchEngagementRpm + t.clutchSlipRpm;
    const clutchBlend = smoothstep(
      (wheelRpm - startRpm) / Math.max(lockRpm - startRpm, 1),
    );
    const fullyCoupled = wheelRpm >= lockRpm;
    const target = clamp(
      freeRpm + (wheelRpm - freeRpm) * clutchBlend,
      idle,
      redline,
    );
    const launchClutch =
      smoothstep((freeRpm - spec.clutchEngagementRpm) / t.clutchSlipRpm) * 0.9;
    const clutchSlipFactor = clutchBlend + (1 - clutchBlend) * launchClutch;
    const minimumSlip = gearLowSpeed && this.gear > 1 ? 0.12 : 0;
    this.clutch = push ? 0 : clamp(clutchSlipFactor, minimumSlip, 1);
    this.lugging =
      !push &&
      this.gear > 1 &&
      (speedKmh < gearMin || gearLowSpeed || this.clutch < 0.18);
    this.updateLimiter(dt, wheelRpm, spec, throttle, brake, push);
    const rpmFloor = nearStall && this.gear >= 5 ? spec.stallRpm * 0.72 : idle;
    const shouldStall =
      !push &&
      this.gear >= 5 &&
      speedKmh < 2 &&
      throttle > 0.8 &&
      this.rpm < spec.stallRpm;
    if (shouldStall || this.stalled) {
      this.stalled = true;
      this.clutch = 0;
      this.lugging = true;
      this.rpm = Math.max(0, this.rpm - dt * 2200);
      this.ratio = clamp((this.rpm - idle) / (redline - idle), 0, 1);
      if (push || speed > 0.45 || throttle < 0.05) this.stalled = false;
      return;
    }
    const rpmTarget = nearStall
      ? Math.min(spec.stallRpm * (this.gear >= 5 ? 0.82 : 1), target)
      : target;
    if (fullyCoupled) this.rpm = clamp(rpmTarget, idle, redline);
    else
      this.rpm += (rpmTarget - this.rpm) * (1 - Math.exp(-dt * t.rpmResponse));
    this.rpm = clamp(this.rpm, rpmFloor, redline);
    if (this.revMatchTime > 0)
      this.rpm = clamp(
        Math.max(rpmTarget, this.estimatedRpm(spec, speed)) +
          this.revMatchPeak * this.revMatchEnvelope,
        idle,
        redline,
      );
    else this.revMatchPeak = 0;
    this.ratio = clamp((this.rpm - idle) / (redline - idle), 0, 1);
  }
}
