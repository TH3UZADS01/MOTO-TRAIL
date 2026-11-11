// Shared tuning for input, physics, animation and network bounds. Positive = forward tuck.
export const BODY_TUNING={response:5,tuckDragReduction:.6,maxWheelie:Math.PI/4,wheelieSteering:.45,wheelieResponse:3.8,landingResponse:7,minWheelieSpeed:1.5,fullWheelieSpeed:5};
export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function bodyDragMultiplier(lean:number){return 1-BODY_TUNING.tuckDragReduction*clamp(lean,0,1)}
export function wheelieTarget(lean:number,speed:number,throttle:number,brake:number,push:boolean){
 if(push||brake>.05||throttle<.2||speed<BODY_TUNING.minWheelieSpeed)return 0;
 const motion=clamp((speed-BODY_TUNING.minWheelieSpeed)/(BODY_TUNING.fullWheelieSpeed-BODY_TUNING.minWheelieSpeed),0,1);
 return BODY_TUNING.maxWheelie*clamp(-lean,0,1)*motion*clamp(throttle*1.5,0,1);
}
