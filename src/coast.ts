import * as T from 'three';
import {surfaceMaterial,worldUV} from './graphics';
export const COAST_TUNING={shoreX:6300,transition:1100,seaLevel:0,waveHeight:.16,waveSpeed:.8};
export const shoreline=(z:number)=>COAST_TUNING.shoreX+45*Math.sin(z/430)+20*Math.sin(z/170);
export const coastalBlend=(x:number,z:number)=>T.MathUtils.smoothstep(x,shoreline(z)-COAST_TUNING.transition,shoreline(z)-200);
export function coastalHeight(x:number,z:number,inland:number){const d=shoreline(z)-x,beach=d>=0?d*.018:Math.max(-12,d*.04);return T.MathUtils.lerp(inland,beach,coastalBlend(x,z))}
// GPU waves keep CPU work constant. Physics uses a calm sea level, not visual ripples.
export function makeSea(scene:T.Scene){
 const positions:number[]=[],indices:number[]=[],rows=220,columns=48;
 for(let j=0;j<=rows;j++){const z=-8500+j/rows*17000;for(let i=0;i<=columns;i++)positions.push(shoreline(z)-12+i/columns*2400,COAST_TUNING.seaLevel,z)}
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const n=j*(columns+1)+i;indices.push(n,n+columns+1,n+1,n+1,n+columns+1,n+columns+2)}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();worldUV(geometry,15);
 const material=surfaceMaterial('water',0x478f9a),clock={value:0};material.onBeforeCompile=shader=>{shader.uniforms.coastTime=clock;shader.vertexShader='uniform float coastTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed.y += ${COAST_TUNING.waveHeight.toFixed(3)} * (sin(position.x * .22 + coastTime) + .4 * sin(position.z * .16 + coastTime * .7));`)};
 const sea=new T.Mesh(geometry,material);sea.userData.noShadow=true;sea.frustumCulled=false;scene.add(sea);
 const foamPositions:number[]=[],foamIndices:number[]=[];
 for(let j=0;j<=rows*3;j++){const z=-8500+j/(rows*3)*17000,x=shoreline(z);foamPositions.push(x+1,.09,z,x+4,.09,z);if(j){const n=j*2;foamIndices.push(n-2,n,n-1,n-1,n,n+1)}}
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(foamPositions,3));fg.setIndex(foamIndices);fg.computeVertexNormals();const fm=new T.MeshBasicMaterial({color:0xe5f3df,transparent:true,opacity:.3,depthWrite:false,side:T.DoubleSide});const foam=new T.Mesh(fg,fm);foam.userData.noShadow=true;scene.add(foam);
 return {update(time:number){clock.value=time*.001*COAST_TUNING.waveSpeed;foam.position.x=Math.sin(time*.0007)*1.8;fm.opacity=.22+.12*Math.sin(time*.0007)}};
}
