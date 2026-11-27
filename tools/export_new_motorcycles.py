import bpy,math,json,sys
from pathlib import Path
from mathutils import Vector,Matrix
root=Path('D:/PROJETOS/MOTOTRAIL')
for id,source in [('twister','honda_twister_300'),('r1200gs','bmw_motorcycle__3d')]:
 if '--' in sys.argv and id not in sys.argv[sys.argv.index('--')+1:]:continue
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(Path('C:/Users/olive/Downloads/ATT MOTOTRAIL')/f'{source}.glb'))
 bpy.context.preferences.filepaths.save_version=0
 out=root/'assets'/id;out.mkdir(parents=True,exist_ok=True)
 public=root/'public/models';public.mkdir(exist_ok=True)
 if id=='r1200gs':
  colours={'object_4':(.012,.012,.012,1),'object_5':(.012,.012,.012,1),'object_2':(.018,.021,.023,1),'object_8':(.55,.58,.6,1),'object_0':(.08,.09,.10,1),'object_6':(.45,.008,.006,1)}
  for mat in bpy.data.materials:
   bs=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) if mat.use_nodes else None
   if bs:
    colour=colours.get(mat.name,(.25,.28,.30,1))
    bs.inputs['Base Color'].default_value=colour;mat.diffuse_color=colour
    bs.inputs['Metallic'].default_value=0 if mat.name in colours else .65
    bs.inputs['Roughness'].default_value=.85 if mat.name in ['object_4','object_5','object_2'] else .45

 tw=id=='twister'
 def fit(p):
  return Vector(((p.y-.015)*1.1,-(p.x+.014)*1.1,p.z*.9+.09)) if tw else Vector((p.x,-(-p.y+.14),p.z))
 origins={'Body':Vector(),'Steering':Vector((0,-.40,1.0)),'FrontSuspension':Vector((0,-.40,1.0)),
 'FrontWheel':fit(Vector((.617,.015,.264))) if tw else fit(Vector((0,-.615,.32))),
 'RearWheel':fit(Vector((-.645,.015,.295))) if tw else fit(Vector((0,.90,.33)))}
 parents={'Body':None,'Steering':'Body','FrontSuspension':'Steering','FrontWheel':'Steering','RearWheel':'Body'}
 groups={}
 for n,p in origins.items():
  g=bpy.data.objects.new(n,None);bpy.context.collection.objects.link(g);g.location=p;groups[n]=g
  if parents[n]:g.parent=groups[parents[n]];g.location=p-origins[parents[n]]
 if not tw:
  for o in list(bpy.data.objects):
   if o.type!='MESH' or o.name not in ['Object_2','Object_6','Object_10','Object_20']:continue
   bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
   bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
 meshes=[o for o in bpy.data.objects if o.type=='MESH']
 for o in meshes:
  pts=[o.matrix_world@v.co for v in o.data.vertices]
  lo=Vector([min(p[i] for p in pts) for i in range(3)]);hi=Vector([max(p[i] for p in pts) for i in range(3)])
  number=int(o.name.split('_')[1].split('.')[0])
  part='Body'
  if tw:
   if number in [410,414,416,418,421,423]:part='FrontWheel'
   elif number in [530,532,536,558,560,562,564,566]:part='RearWheel'
   elif number in [493,495,497]:part='Steering'
   elif lo.x>.28 and hi.z<.84 and lo.z>.22:part='FrontSuspension'
   elif lo.x>.05 and hi.z>.80 and lo.x>.07:part='Steering'
  else:
   if number==16:part='FrontWheel'
   elif number==15:part='RearWheel'
   # Both wheel assemblies share materials in the source. Split their complete
   # loose components before assigning rims, spokes, hubs and brake discs.
   elif number in [10,20]:part='FrontWheel' if hi.y<0 else 'RearWheel'
   elif number in [7,11]:part='Steering'
   # Keep the instrument cluster and tank cap on the body. Classify complete
   # handlebar components, never a triangle crop through the tank cap.
   elif number in [2,6] and lo.z>1.06 and lo.y>-.345 and hi.y<-.04:part='Steering'
   elif number in [2,6] and hi.y<-.24 and hi.z<1.03 and lo.z<.75:part='FrontSuspension'
  for v,p in zip(o.data.vertices,pts):
   q=fit(p)
   if tw and part in ['FrontWheel','RearWheel']:
    center=.264 if part=='FrontWheel' else .295
    q.z=origins[part].z+(p.z-center)*1.1
   v.co=q-origins[part]
  o.parent=groups[part];o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_basis=Matrix.Identity(4)
  bpy.context.view_layer.objects.active=o
  if len(o.data.polygons)>700:
   dec=o.modifiers.new('Browser budget','DECIMATE');dec.ratio=.18 if tw else .28
   bpy.ops.object.modifier_apply(modifier=dec.name)
 for im in bpy.data.images:
  if im.size[0] and max(im.size)>1024:im.scale(1024,1024)
 # Join per articulation, preserving material assignments and UVs.
 for name,g in groups.items():
  obs=[o for o in g.children if o.type=='MESH']
  if not obs:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in obs:o.select_set(True)
  bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();bpy.context.object.name=name+'_Mesh'
 bpy.ops.object.select_all(action='DESELECT')
 for g in groups.values():
  g.select_set(True)
  for o in g.children:
   if o.type=='MESH':o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(public/f'{id}.glb'),export_format='GLB',use_selection=True,export_yup=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(out/f'{id}.blend'))
 print('EXPORTED',id,flush=True)
