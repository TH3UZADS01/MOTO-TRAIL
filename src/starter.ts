import type {VehicleId} from './vehicles';

const manualClutchModels=new Set<VehicleId>(['sahara','cg150','twister','r1200gs']);
export function safeToStart(id:VehicleId,gear:number,automatic:boolean,clutch:number){
 return automatic||!manualClutchModels.has(id)||gear===0||clutch>.8;
}

export const STARTER={
 audio:'/audio/starter.wav',gain:1,fade:.035,
 loopStart:.035,loopEnd:.305,overlap:.020,
 // Condition in percent and seconds at that condition, from broken to healthy.
 times:[[0,6],[30,4],[50,2.5],[70,1.5],[90,.9],[100,.5]] as const,
 failureBelow:30,maxFailure:.55,
};
export function crankSeconds(health:number){
 const points=STARTER.times;
 for(let i=1;i<points.length;i++){
  const [a,slow]=points[i-1],[b,fast]=points[i];
  if(health<=b)return slow+(fast-slow)*Math.max(0,(health-a)/(b-a));
 }
 return points[points.length-1][1];
}
export const failureChance=(health:number)=>STARTER.maxFailure*Math.max(0,1-health/STARTER.failureBelow);
// Prepare a continuous sustain loop once. The source file and its attack stay intact.
export function prepareStarter(buffer:AudioBuffer){
 const end=Math.round(STARTER.loopEnd*buffer.sampleRate),start=Math.round(STARTER.loopStart*buffer.sampleRate);
 const overlap=Math.round(STARTER.overlap*buffer.sampleRate);
 for(let c=0;c<buffer.numberOfChannels;c++){
  const v=buffer.getChannelData(c);
  for(let i=0;i<overlap;i++){
   const mix=(1-Math.cos(Math.PI*i/(overlap-1)))/2;
   v[end-overlap+i]=v[end-overlap+i]*(1-mix)+v[start+i]*mix;
  }
 }
 return {start:(start+overlap)/buffer.sampleRate,end:end/buffer.sampleRate};
}
