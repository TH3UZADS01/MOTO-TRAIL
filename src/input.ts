export function axis(value:number,deadzone:number,sensitivity=1){const v=Math.abs(value);return v<=deadzone?0:Math.sign(value)*Math.min(1,(v-deadzone)/(1-deadzone)*sensitivity);}
export class Controller {
  previous:boolean[]=[];id='';
  poll(deadzone:number,sensitivity:number,pads:readonly (Gamepad|null)[]=Array.from(navigator.getGamepads?.()||[])){
    const pad=pads.find(p=>p?.connected&&p.mapping==='standard');
    if(!pad){const disconnected=!!this.id;this.id='';this.previous=[];return {connected:false,disconnected,throttle:0,brake:0,turn:0,lookX:0,lookY:0,push:false,camera:false,pause:false,start:false,horn:false,previous:false,next:false}}
    if(this.id!==pad.id){this.previous=[];this.id=pad.id}
    const down=(i:number)=>!!pad.buttons[i]?.pressed,edge=(i:number)=>down(i)&&!this.previous[i];
    const state={connected:true,disconnected:false,throttle:pad.buttons[7]?.value||0,brake:pad.buttons[6]?.value||0,turn:-axis(pad.axes[0]||0,deadzone,sensitivity),lookX:axis(pad.axes[2]||0,deadzone),lookY:axis(pad.axes[3]||0,deadzone),push:down(1),camera:edge(3),pause:edge(9),start:edge(0),horn:edge(4),previous:edge(14),next:edge(15)};
    this.previous=pad.buttons.map(b=>b.pressed);return state;
  }
}
