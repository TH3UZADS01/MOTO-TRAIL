"""Adapt the supplied CC-BY Super Cub GLB to the existing animated game rig.
Run inspect_super_cub.py first to import/join/weld and split connected components.
"""
import bpy,bmesh,json,math,shutil
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/cub';PUBLIC=ROOT/'public/models'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'imported/source.blend'))
bpy.context.preferences.filepaths.save_version=0
backup=OUT/'previous-model';backup.mkdir(exist_ok=True)
for src in [OUT/'cub.blend',PUBLIC/'cub.glb',ROOT/'src/assets/cub-model.json']:
 if src.exists() and not (backup/src.name).exists():shutil.copy2(src,backup/src.name)
LONG=1.22/1.395;MID=-.109;VERT=.95
# Blender X lateral, -Y forward, Z up. Wheel radii retain their round silhouette.
def fit(p):return Vector((p.x*.83,(p.y-MID)*LONG,p.z*VERT))
def game(p):return [round(p.x,5),round(p.z,5),round(-p.y,5)]
origins={'Body':Vector(),'Steering':fit(Vector((0,-.45,.90))),'FrontSuspension':fit(Vector((0,-.45,.90))),'RearSuspension':Vector(),'RearWheel':fit(Vector((0,.5885,.3375))),'FrontWheel':fit(Vector((0,-.8065,.3375)))}
parents={'Body':None,'Steering':'Body','FrontSuspension':'Steering','RearSuspension':'Body','RearWheel':'Body','FrontWheel':'Steering'}
objects=[o for o in bpy.data.objects if o.type=='MESH'];groups={}
for name,pos in origins.items():
 g=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(g);g.location=pos;groups[name]=g
 if parents[name]:g.parent=groups[parents[name]];g.location=pos-origins[parents[name]]
atlas=bpy.data.images.load(str(OUT/'imported/texture-0.png'));atlas.name='cub-atlas'
pixels=np.array(atlas.pixels[:],dtype=np.float32).reshape(atlas.size[1],atlas.size[0],4)
green=(pixels[:,:,1]>pixels[:,:,0]*1.5)&(pixels[:,:,1]>pixels[:,:,2]*1.3)&(pixels[:,:,1]>.02)
neutral=pixels.copy();neutral[green,:3]=.85
paintmap=bpy.data.images.new('cub-paint',width=atlas.size[0],height=atlas.size[1]);paintmap.pixels.foreach_set(neutral.ravel())
materials={}
for name,im in [('Atlas',atlas),('Paint',paintmap),('TailLens',atlas),('Headlamp',atlas)]:
 mat=bpy.data.materials.new(name);mat.use_nodes=True;mat.diffuse_color=(1,1,1,1)
 bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.6 if name=='Atlas' else .4
 tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 if name=='Paint':mat.diffuse_color=(.025,.14,.04,1);bs.inputs['Base Color'].default_value=mat.diffuse_color
 materials[name]=mat
# Material tint is multiplied in Three.js; Blender uses the same multiplication for preview/GLB.
mat=materials['Paint'];bs=mat.node_tree.nodes.get('Principled BSDF');tex=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE')
mix=mat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=mat.diffuse_color;mat.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);mat.node_tree.links.new(mix.outputs[0],bs.inputs['Base Color'])
kept=[]
for o in objects:
 number=int(o.name.rsplit('.',1)[1]) if '.' in o.name else 0
 # The parked centre stand would drag on the road; riding geometry omits it.
 if number==231:bpy.data.objects.remove(o,do_unlink=True);continue
 world=o.matrix_world.copy();points=[world@v.co for v in o.data.vertices];lo=Vector([min(v[i] for v in points) for i in range(3)]);hi=Vector([max(v[i] for v in points) for i in range(3)])
 part='Body'
 if number in [173,174,181] or 236<=number<=293:part='FrontWheel'
 elif number in [168,169,170,213] or 294<=number<=351:part='RearWheel'
 elif number in [5,6,7,8,15,163,164,165,166]:part='RearSuspension'
 elif (hi.y<-.30 and lo.z>.90) or number==233:part='Steering'
 elif number in [68,69,154,157,161,172,176,178,179,180,234] or (hi.y<-.43 and lo.z>.30):part='FrontSuspension'
 o['part']=part
 o.data.materials.clear()
 for mat in materials.values():o.data.materials.append(mat)
 uv=o.data.uv_layers.active
 for face in o.data.polygons:
  samples=[]
  for li in face.loop_indices:
   t=uv.data[li].uv;x=int(t.x*atlas.size[0])%atlas.size[0];y=int(t.y*atlas.size[1])%atlas.size[1];samples.append(pixels[y,x,:3])
  c=np.mean(samples,axis=0)
  face.material_index=1 if c[1]>c[0]*1.5 and c[1]>c[2]*1.3 and c[1]>.02 else 0
  if lo.y>.7 and c[0]>c[1]*1.5 and c[0]>c[2]*1.5:face.material_index=2
  if number==38:face.material_index=3
 for v,p in zip(o.data.vertices,points):
  q=fit(p)
  if 'Wheel' in part:
   cy=-.8065 if part=='FrontWheel' else .5885;q.y=origins[part].y+(p.y-cy)*VERT
  v.co=q-origins[part]
 o.parent=groups[part];o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_basis=Matrix.Identity(4)
 bpy.context.view_layer.objects.active=o
 if len(o.data.polygons)>60:
  dec=o.modifiers.new('Low poly silhouette','DECIMATE');dec.ratio=.12 if len(o.data.polygons)>1000 else .2;dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
 o.data.validate(clean_customdata=False);o.data.update()
 for poly in o.data.polygons:poly.use_smooth=False
 kept.append(o)
objects=kept
# Export real recovered texture pixels, capped at 512 for the web model.
texdir=PUBLIC/'cub-textures';texdir.mkdir(exist_ok=True)
for im in bpy.data.images:
 if im.name in ['cub-atlas','cub-paint']:
  if max(im.size)>1024:im.scale(1024,1024)
  im.filepath_raw=str(texdir/(im.name+'.png'));im.file_format='PNG';im.save();im.pack()

data={'source':'Honda Super cub by Aleksandr Sagidullin, CC-BY-4.0','materials':{},'textures':{},'parts':[]};records={n:{} for n in groups};total=0
def srgb(x):return 12.92*x if x<=.0031308 else 1.055*x**(1/2.4)-.055
for o in objects:
 m=o.data;m.calc_loop_triangles();uv=m.uv_layers.active
 for tri in m.loop_triangles:
  mat=o.data.materials[tri.material_index];name=mat.name;bs=mat.node_tree.nodes.get('Principled BSDF');rgb=mat.diffuse_color[:3]
  data['materials'][name]={'color':'#'+''.join(f'{max(0,min(255,round(srgb(c)*255))):02x}' for c in rgb),'roughness':float(bs.inputs['Roughness'].default_value),'metalness':float(bs.inputs['Metallic'].default_value)}
  for node in mat.node_tree.nodes:
   if node.type=='TEX_IMAGE' and node.image:data['textures'][name]='/models/cub-textures/'+node.image.name+'.png'
  rec=records[o['part']].setdefault(name,{'material':name,'positions':[],'normals':[],'uvs':[],'indices':[],'unique':{}})
  for li in tri.loops:
   v=m.vertices[m.loops[li].vertex_index].co;n=m.corner_normals[li].vector;t=uv.data[li].uv
   key=tuple(game(v)+game(n)+[round(t.x,5),round(t.y,5)])
   if key not in rec['unique']:
    rec['unique'][key]=len(rec['positions'])//3;rec['positions'].extend(key[:3]);rec['normals'].extend(key[3:6]);rec['uvs'].extend(key[6:])
   rec['indices'].append(rec['unique'][key])
  total+=1
for name,g in groups.items():
 meshes=list(records[name].values())
 for rec in meshes:del rec['unique']
 data['parts'].append({'name':name,'parent':parents[name],'position':game(g.location),'meshes':meshes})
data['triangles']=total
(ROOT/'src/assets/cub-model.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
# Join per animated group so the companion GLB also has bounded draw calls.
for part,g in groups.items():
 obs=[o for o in g.children if o.type=='MESH']
 if len(obs)>1:
  bpy.ops.object.select_all(action='DESELECT')
  for o in obs:o.select_set(True)
  bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();bpy.context.object.name=part+'_Mesh'
bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=str(PUBLIC/'cub.glb'),export_format='GLB',use_selection=True,export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cub.blend'))
print('CUB_EXPORT',total,'triangles',sum(len(p['meshes']) for p in data['parts']),'draw calls',flush=True)
scene=bpy.context.scene;bpy.ops.object.camera_add(location=(3,-4,2.0));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.5;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False
scene.world=bpy.data.worlds.new('PreviewWorld');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.3,.35,.4,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
for name,pos,power in [('Key',(3,-4,5),550),('Fill',(-3,-1,3),350),('Rim',(1,4,4),500)]:
 light=bpy.data.lights.new(name,'AREA');light.energy=power;light.size=4;obj=bpy.data.objects.new(name,light);scene.collection.objects.link(obj);obj.location=pos;obj.rotation_euler=(Vector((0,0,.6))-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.location.z=-.01
scene.render.resolution_x=1100;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.filepath=str(OUT/'imported/game-preview.png');bpy.ops.render.render(write_still=True)
