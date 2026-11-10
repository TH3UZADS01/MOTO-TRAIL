import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBike,disposeBike} from '../src/vehicle-models';
import {vehicles} from '../src/vehicles';
import {applyBikeColor,loadColors,saveColors} from '../src/paint';
test('paint affects only designated body materials on every motorcycle',()=>{for(const v of vehicles){const b=createBike(v.id),other=new Map<T.MeshStandardMaterial,number>();b.root.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshStandardMaterial&&!b.paintMaterials.includes(o.material))other.set(o.material,o.material.color.getHex())});applyBikeColor(b,'#12ab34');for(const m of b.paintMaterials)assert.equal(m.color.getHex(),0x12ab34);for(const [m,color] of other)assert.equal(m.color.getHex(),color);disposeBike(b)}});
test('colors survive reload per bike and invalid saved values use defaults',()=>{let saved='';(globalThis as any).localStorage={getItem:()=>saved,setItem:(_k:string,v:string)=>saved=v};const colors=loadColors();colors.pop='#123456';colors.cg150='#abcdef';saveColors(colors);assert.deepEqual(loadColors(),colors);saved='{"pop":"garbage","cg150":"#000000"}';assert.notEqual(loadColors().pop,'garbage');assert.equal(loadColors().cg150,'#000000')});
