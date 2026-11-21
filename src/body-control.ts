// Radians, metres, forces and response rates shared by riding and bike posing.
export const BODY_TUNING={
 response:5,tuckDragReduction:.6,balancePoint:Math.PI/5,loopOutAngle:Math.PI/2,
 wheelieForceMargin:.82,wheeliePitchForceScale:1.5,wheelieAngularAccelerationScale:.0018,
 wheelieDamping:1.35,wheelieControlGain:.28,wheelieSteering:.45,
 landingResponse:7,minWheelieSpeed:2.2,wheelieSensitivity:1,
 // Brief assisted clutch slip, followed by engagement; release the body input to rearm.
 clutchCharge:.18,clutchRelease:.28,clutchCooldown:1.2,clutchBoost:.85,clutchRpm:3200,clutchMinimumPeakRpm:8200,clutchPeakRatio:.995,
 airborneThreshold:.08,airborneDamping:2.4,gravityLiftFactor:.55,
 // Less rotational resistance when returning to ground: avoid a slow-motion landing.
 descentAccelerationScale:.0036,descentDamping:.65,
 launchPitchBoost:.65,coastReturnTorque:.65
};
export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function bodyDragMultiplier(lean:number){return 1-BODY_TUNING.tuckDragReduction*clamp(lean,0,1)}

// Fade the manoeuvre in after push-off, then out as road speed increases (m/s).
export function counterweightBlend(speed:number,wheelie=0){
 const smooth=(x:number)=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
 return smooth((speed-.35)/1.05)*(1-smooth((speed-3)/4))*(1-smooth(wheelie/BODY_TUNING.airborneThreshold));
}
