import bpy,bmesh,json,struct
from pathlib import Path
from mathutils import Vector
out=Path('D:/PROJETOS/MOTOTRAIL/assets/cub/imported');out.mkdir(exist_ok=True,parents=True)
# Preserve embedded image bytes for the simplified material pipeline.
raw=Path('D:/Downloads/honda_super_cub.glb').read_bytes();length=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+length]);binary=28+length
for i,image in enumerate(gltf['images']):
 view=gltf['bufferViews'][image['bufferView']];start=binary+view.get('byteOffset',0)
 (out/f'texture-{i}.png').write_bytes(raw[start:start+view['byteLength']])
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath='D:/Downloads/honda_super_cub.glb')
obs=[o for o in bpy.data.objects if o.type=='MESH'];bpy.ops.object.select_all(action='DESELECT')
for o in obs:o.select_set(True)
bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();o=bpy.context.object;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(o.data);bm.free()
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
report=[]
for o in [o for o in bpy.data.objects if o.type=='MESH']:
 p=[o.matrix_world@v.co for v in o.data.vertices];lo=[min(v[i] for v in p) for i in range(3)];hi=[max(v[i] for v in p) for i in range(3)];report.append(dict(name=o.name,verts=len(p),lo=lo,hi=hi))
(out/'components.json').write_text(json.dumps(report,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(out/'source.blend'));print('BOUNDS',report[:6],flush=True)
scene=bpy.context.scene
allp=[o.matrix_world@Vector(c) for o in bpy.data.objects if o.type=='MESH' for c in o.bound_box];lo=Vector([min(v[i] for v in allp) for i in range(3)]);hi=Vector([max(v[i] for v in allp) for i in range(3)]);c=(lo+hi)/2;s=max(hi-lo)
bpy.ops.object.camera_add(location=c+Vector((1.5,-2,1))*s);cam=bpy.context.object;cam.rotation_euler=(c-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=s*1.3;scene.camera=cam
scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.color_type='TEXTURE';scene.render.resolution_x=1000;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.filepath=str(out/'source.png');bpy.ops.render.render(write_still=True)
