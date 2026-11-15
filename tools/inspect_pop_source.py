import bpy,json,bmesh
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
report=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.verts.ensure_lookup_table()
 seen=set();parts=[]
 for start in bm.verts:
  if start in seen:continue
  todo=[start];seen.add(start);vs=[]
  while todo:
   v=todo.pop();vs.append(o.matrix_world@v.co)
   for e in v.link_edges:
    q=e.other_vert(v)
    if q not in seen:seen.add(q);todo.append(q)
  lo=[min(v[i] for v in vs) for i in range(3)];hi=[max(v[i] for v in vs) for i in range(3)]
  parts.append({'verts':len(vs),'lo':[round(v,3) for v in lo],'hi':[round(v,3) for v in hi]})
 report.append({'name':o.name,'parts':sorted(parts,key=lambda p:-p['verts'])});bm.free()
(root/'assets/pop110/source-inspection.json').write_text(json.dumps(report,indent=1))
scene=bpy.context.scene
for o in list(scene.objects):
 if o.type in ['LIGHT','CAMERA']:bpy.data.objects.remove(o,do_unlink=True)
mat=bpy.data.materials.new('InspectionClay');mat.diffuse_color=(.35,.4,.45,1)
for o in scene.objects:
 if o.type=='MESH' and not o.data.materials:o.data.materials.append(mat)
def look(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(3,-4,2));cam=bpy.context.object;look(cam,(0,0,.65));cam.data.type='ORTHO';cam.data.ortho_scale=3.0;scene.camera=cam
scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
scene.render.resolution_x=1100;scene.render.resolution_y=850;scene.render.resolution_percentage=100;scene.render.filepath=str(root/'assets/pop110/source-clay.png');bpy.ops.render.render(write_still=True)
