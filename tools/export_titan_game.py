"""Optimize the decoded Titan and export a GLB plus the game's synchronous mesh asset.
Source is produced by import_titan_edf.py. All dimensions/pivots below are game metres.
"""
import bpy,bmesh,json,math,shutil,subprocess,tempfile
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/cg150';PUBLIC=ROOT/'public/models'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'titan-conversion/titan-decoded.blend'))
bpy.context.preferences.filepaths.save_version=0
BACKUP=OUT/'previous-model';BACKUP.mkdir(exist_ok=True)
for src in [OUT/'cg150.blend',PUBLIC/'cg150.glb',ROOT/'src/assets/cg150-model.json']:
 if src.exists() and not (BACKUP/src.name).exists():shutil.copy2(src,BACKUP/src.name)
# Fit the imported wheelbase and seat to the existing game without changing physics.
LONG=1.32/1.52;VERT=.9;LIFT=-.098;MID=-.04
def fit(p):return Vector((p.x,p.y*LONG+MID*LONG,p.z*VERT+LIFT))
def bg(p):return Vector((p[0],-p[2],p[1]))
def game(p):return [round(p.x,5),round(p.z,5),round(-p.y,5)]
origins={'Body':Vector(), 'Steering':fit(bg((0,.9912,.3372))), 'FrontSuspension':fit(bg((0,.9912,.3372))), 'RearSuspension':Vector(), 'RearWheel':fit(bg((0,.45,-.80))), 'FrontWheel':fit(bg((0,.47,.72)))}
parents={'Body':None,'Steering':'Body','FrontSuspension':'Steering','RearSuspension':'Body','RearWheel':'Body','FrontWheel':'Steering'}
objects=[o for o in bpy.data.objects if o.type=='MESH'];groups={}
for name,pos in origins.items():
 g=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(g);g.location=pos;groups[name]=g
 if parents[name]:g.parent=groups[parents[name]];g.location=pos-origins[parents[name]]

paint=bpy.data.materials.new('Paint');paint.use_nodes=True;paint.diffuse_color=(.025,.028,.034,1)
paint.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=paint.diffuse_color
paint.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.22
paint.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.32
for o in objects:
 part=o['part'];mi=o['material_index'];bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000008)
 # Select complete connected painted panels; never tint seats, tyres or engine.
 if (part=='Body' and mi==3) or (part=='FrontSuspension' and mi==2):
  o.data.materials.append(paint);seen=set()
  for first in bm.verts:
   if first in seen:continue
   pending=[first];seen.add(first);verts=[]
   while pending:
    v=pending.pop();verts.append(v)
    for e in v.link_edges:
     q=e.other_vert(v)
     if q not in seen:seen.add(q);pending.append(q)
   lo=Vector([min(v.co[i] for v in verts) for i in range(3)]);hi=Vector([max(v.co[i] for v in verts) for i in range(3)]);c=(lo+hi)*.5;size=hi-lo
   chosen=(part=='Body' and size.length>.16 and c.z>.65 and c.y<.8 and not(c.z>.96 and c.y>.12)) or (part=='FrontSuspension' and size.y>.25 and size.z<.40)
   print('PANEL',part,len(verts),list(lo),list(hi),chosen,flush=True)
   if chosen:
    for v in verts:
     for f in v.link_faces:f.material_index=1
 for v in bm.verts:
  p=v.co.copy();q=fit(p)
  if 'Wheel' in part:
   centre=bg((0,.47,.72) if part=='FrontWheel' else (0,.45,-.80))
   q.y=origins[part].y+(p.y-centre.y)*VERT
  v.co=q-origins[part]
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 o.parent=groups[part];o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_basis=Matrix.Identity(4)
 bpy.context.view_layer.objects.active=o
 # Preserve tiny details and lens surfaces; reduce the dense mechanical meshes most.
 if len(o.data.polygons)>4000:
  dec=o.modifiers.new('Browser optimization','DECIMATE');dec.ratio=.10 if 'Wheel' not in part else .38;dec.use_collapse_triangulate=True
  bpy.ops.object.modifier_apply(modifier=dec.name)
 o.data.validate(clean_customdata=False);o.data.update()
 for p in o.data.polygons:p.use_smooth=True
 # Labels used by existing brake/headlight integration.
 if part=='Body' and mi==15:o.active_material.name='TailLens'
 if part=='Steering' and mi==14:o.active_material.name='Headlamp'
 print('OPTIMIZED',o.name,len(o.data.polygons),flush=True)

# Export real recovered texture pixels, capped at 512 for the web model.
staging=tempfile.TemporaryDirectory()
stage=Path(staging.name)
texdir=stage/'cg150-textures';texdir.mkdir()
for im in bpy.data.images:
 if im.size[0]>0 and im.name not in ['Render Result','Viewer Node']:
  if max(im.size)>512:
   factor=512/max(im.size);im.scale(*(max(1,round(dim*factor)) for dim in im.size))
  im.filepath_raw=str(texdir/(im.name+'.png'));im.file_format='PNG';im.save();im.pack()

data={'source':'titan150luquine/model.edf + rodatitan15008luq wheels','materials':{},'textures':{},'parts':[]};records={n:{} for n in groups};total=0
def srgb(x):return 12.92*x if x<=.0031308 else 1.055*x**(1/2.4)-.055
for o in objects:
 m=o.data;m.calc_loop_triangles();uv=m.uv_layers.active
 for tri in m.loop_triangles:
  mat=o.data.materials[tri.material_index];name=mat.name;bs=mat.node_tree.nodes.get('Principled BSDF');rgb=mat.diffuse_color[:3]
  data['materials'][name]={'color':'#'+''.join(f'{max(0,min(255,round(srgb(c)*255))):02x}' for c in rgb),'roughness':float(bs.inputs['Roughness'].default_value),'metalness':float(bs.inputs['Metallic'].default_value)}
  for node in mat.node_tree.nodes:
   if node.type=='TEX_IMAGE' and node.image:data['textures'][name]='/models/cg150-textures/'+node.image.name+'.png'
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
(stage/'cg150-model.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=str(stage/'cg150.glb'),export_format='GLB',use_selection=True,export_yup=True)
subprocess.run(['python',str(ROOT/'tools/pack_titan_game.py'),str(stage)],check=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cg150.blend'))
print('TITAN_EXPORT',total,'triangles',sum(len(p['meshes']) for p in data['parts']),'draw calls',flush=True)
scene=bpy.context.scene;bpy.ops.object.camera_add(location=(3,-4,2.0));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.5;scene.camera=cam
scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
scene.render.resolution_x=1100;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.filepath=str(OUT/'titan-conversion/game-preview.png');bpy.ops.render.render(write_still=True)
