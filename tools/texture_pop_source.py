"""Texture the user's edited Pop, never regenerate its geometry from the old builder.
Backs up the supplied blend/GLB once. Writes UVs, packed Blender textures, GLB and runtime JSON.
"""
import bpy,bmesh,json,math,shutil
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/pop110';PUBLIC=ROOT/'public/models'
BACKUP=OUT/'source-user';BACKUP.mkdir(exist_ok=True)
for src in [OUT/'pop110.blend',PUBLIC/'pop110.glb']:
 dst=BACKUP/src.name
 if not dst.exists():shutil.copy2(src,dst)
bpy.ops.wm.open_mainfile(filepath=str(BACKUP/'pop110.blend'))
bpy.context.preferences.filepaths.save_version=0
TEX=PUBLIC/'pop110-textures';TEX.mkdir(exist_ok=True)

# Keep the source hierarchy/pivots from its companion GLB as a reference.
import struct
raw=(BACKUP/'pop110.glb').read_bytes();glb=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
pivot=next(n for n in glb['nodes'] if n['name']=='SteeringPivot')['matrix']
longScale=1.238/(.8722361326+.6247307062);mid=(-.8722361326+.6247307062)/2
vertical=.9;lift=(.285-.1820529103)*vertical
def convert(p):return Vector((p.x,p.z*vertical+lift,-(p.y-mid)*longScale))
def blender(p):return Vector((p[0],-p[2],p[1]))
steerPos=convert(Vector((pivot[12],-pivot[14],pivot[13])))
centres={name:convert(bpy.data.objects[name+'_Rubber'].matrix_world.translation) for name in ['FrontWheel','RearWheel']}

# Small seamless procedural image tiles: actual UV textures shared by surface family.
# Neutral albedo allows the game's per-motorcycle paint color to remain independent.
textures={};N=256
yy,xx=np.mgrid[0:N,0:N]/N
for family,contrast,rough in [('paint',.025,.32),('seat',.20,.86),('rubber',.09,.94),('plastic',.06,.72),('metal',.035,.38)]:
 grain=(np.sin(xx*math.tau*67+np.sin(yy*math.tau*31))*np.sin(yy*math.tau*59)+1)/2
 if family=='seat':grain=.5+.25*np.sin(xx*math.tau*64)+.25*np.sin(yy*math.tau*64)
 if family=='metal':grain=.5+.5*np.sin(xx*math.tau*100)
 for kind,values in [('color',1-contrast*grain),('roughness',np.clip(rough+(grain-.5)*contrast,0,1))]:
  rgba=np.ones((N,N,4),dtype=np.float32);rgba[:,:,:3]=values[:,:,None]
  image=bpy.data.images.new('Pop_'+family+'_'+kind,width=N,height=N,alpha=False)
  if kind=='roughness':image.colorspace_settings.name='Non-Color'
  image.pixels.foreach_set(rgba.ravel());image.filepath_raw=str(TEX/(family+'-'+kind+'.png'));image.file_format='PNG';image.save();image.pack()
  textures[(family,kind)]=image

materials={};props={};maps={}
def mat(name,color,rough,metal=0,family=None):
 rgb=tuple(int(color[i:i+2],16)/255 for i in (0,2,4))
 linear=lambda x:x/12.92 if x<.04045 else ((x+.055)/1.055)**2.4
 m=bpy.data.materials.new('Pop_'+name);m.use_nodes=True;m.diffuse_color=(*map(linear,rgb),1)
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=m.diffuse_color;bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 if family:
  nodes=m.node_tree.nodes;links=m.node_tree.links
  tex=nodes.new('ShaderNodeTexImage');tex.image=textures[(family,'color')]
  mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=m.diffuse_color
  links.new(tex.outputs['Color'],mix.inputs[1]);links.new(mix.outputs[0],bs.inputs['Base Color'])
  texr=nodes.new('ShaderNodeTexImage');texr.image=textures[(family,'roughness')];links.new(texr.outputs['Color'],bs.inputs['Roughness'])
  maps[name]={'map':f'/models/pop110-textures/{family}-color.png','roughnessMap':f'/models/pop110-textures/{family}-roughness.png'}
 materials[name]=m;props[name]={'color':'#'+color,'roughness':rough,'metalness':metal}
 return m
mat('Paint','234c91',.32,.12,'paint');mat('Seat','24262a',.86,0,'seat');mat('Rubber','16191c',.94,0,'rubber')
mat('BlackPlastic','24282d',.72,0,'plastic');mat('WheelAlloy','3e464d',.38,.55,'metal')
mat('Steel','a7b1b8',.38,.72,'metal');mat('Engine','8c9499',.38,.6,'metal');mat('DarkMetal','41494d',.38,.65,'metal')
mat('Headlamp','d9e6ef',.18,.18);mat('Indicators','f89b16',.25);mat('TailLens','c72530',.25)

origins={'Body':Vector((0,0,0)),'Steering':steerPos,'FrontSuspension':steerPos,'RearSuspension':Vector((0,0,0)),'RearWheel':centres['RearWheel'],'FrontWheel':centres['FrontWheel']}
parents={'Body':None,'Steering':'Body','FrontSuspension':'Steering','RearSuspension':'Body','RearWheel':'Body','FrontWheel':'Steering'}
sources={'chassis':'Body','steer':'Steering','fsusp':'FrontSuspension','rsusp':'RearSuspension',**{n+'_'+m:n for n in ['RearWheel','FrontWheel'] for m in ['Rubber','WheelAlloy']}}
objects=[bpy.data.objects[name] for name in sources]
source_world={o.name:o.matrix_world.copy() for o in objects}
for o in list(bpy.data.objects):
 if o not in objects:bpy.data.objects.remove(o,do_unlink=True)
groups={}
for name,pos in origins.items():
 g=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(g);g.location=blender(pos);groups[name]=g
 if parents[name]:g.parent=groups[parents[name]];g.location=blender(pos-origins[parents[name]])

def classify(source,lo,hi,count):
 cx,cy,cz=(lo+hi)/2;dx,dy,dz=hi-lo
 if source.endswith('Rubber'):return 'Rubber'
 if source.endswith('WheelAlloy'):return 'WheelAlloy'
 if source=='rsusp':
  if cz>.34 and abs(cx)>.08:return 'Steel'
  return 'DarkMetal' if dy>.25 else 'Steel'
 if source=='fsusp':return 'Steel' if dz>.18 and abs(cx)>.045 else 'DarkMetal'
 if source=='steer':
  if hi.y<-.85 and lo.z>.45:return 'Paint' # front fender
  if abs(cx)>.24 and cz>.96 and dy<.13:return 'Rubber'
  return 'BlackPlastic' if (abs(cx)<.14 and cz>.74) else 'DarkMetal'
 # Chassis component classification uses source coordinates before fitting to the rig.
 if lo.z>.58 and hi.y>.80 and dy>.7:return 'Seat'
 if lo.y>.75 and cz>.61 and cz<.78 and dx>.1:return 'TailLens'
 if lo.y<-.63 and hi.y<-.62 and lo.z>.69 and hi.z<.88 and dx>.12:return 'Headlamp'
 if abs(cx)>.12 and .62<cz<.85 and (cy<-.60 or cy>.70) and max(dx,dy,dz)<.18:return 'Indicators'
 if lo.x<-.24 and dy>.3:return 'BlackPlastic' # exhaust heat shield
 if lo.z>.85 and cy<-.45:return 'BlackPlastic' # instruments / visor
 if hi.y>.79 and cz<.62:return 'BlackPlastic' # tail mudguard
 if hi.z>.55 and (dx>.18 or dz>.18 or dy>.3):return 'Paint'
 if cz>.52:return 'BlackPlastic'
 if abs(cx)>.17 and cz<.38:return 'Rubber' if dy<.18 else 'DarkMetal'
 return 'Engine' if cy<.18 else 'DarkMetal'

records={name:{} for name in origins};triangleCount=0
for o in objects:
 source=o.name;part=sources[source];world=source_world[source]
 bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
 seen=set();matnames=list(materials)
 for start in bm.verts:
  if start in seen:continue
  todo=[start];seen.add(start);component=[]
  while todo:
   v=todo.pop();component.append(v)
   for e in v.link_edges:
    q=e.other_vert(v)
    if q not in seen:seen.add(q);todo.append(q)
  points=[world@v.co for v in component];lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)])
  name=classify(source,lo,hi,len(component))
  for v in component:
   for face in v.link_faces:face.material_index=matnames.index(name)
 for v in bm.verts:
  p=world@v.co;converted=convert(p)
  if 'Wheel' in source:
   c=world.translation;converted.z=origins[part].z-(p.y-c.y)*vertical
  v.co=blender(converted-origins[part])
 bm.normal_update();bm.to_mesh(o.data);bm.free()
 o.parent=groups[part];o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_basis=Matrix.Identity(4)
 assigned=[p.material_index for p in o.data.polygons]
 o.data.materials.clear()
 for m in materials.values():o.data.materials.append(m)
 for poly,index in zip(o.data.polygons,assigned):poly.material_index=index
 # Box-projected, metre-scaled UVs. The seamless tiles need no large unwrap atlas.
 uv=o.data.uv_layers.new(name='SurfaceUV')
 for poly in o.data.polygons:
  axis=max(range(3),key=lambda i:abs(poly.normal[i]));axes=[i for i in range(3) if i!=axis]
  for li in poly.loop_indices:
   co=o.data.vertices[o.data.loops[li].vertex_index].co
   uv.data[li].uv=(co[axes[0]]*5,co[axes[1]]*5)
 o.data.update();o.data.calc_loop_triangles()
 for tri in o.data.loop_triangles:
  name=matnames[tri.material_index];rec=records[part].setdefault(name,{'material':name,'positions':[],'normals':[],'uvs':[],'indices':[],'unique':{}})
  for li in tri.loops:
   v=o.data.vertices[o.data.loops[li].vertex_index].co;n=o.data.corner_normals[li].vector;t=uv.data[li].uv
   key=tuple(round(x,6) for x in (v.x,v.z,-v.y,n.x,n.z,-n.y,t.x,t.y))
   if key not in rec['unique']:
    rec['unique'][key]=len(rec['positions'])//3;rec['positions'].extend(key[:3]);rec['normals'].extend(key[3:6]);rec['uvs'].extend(key[6:])
   rec['indices'].append(rec['unique'][key])
  triangleCount+=1

data={'materials':props,'textures':maps,'parts':[],'source':'user-supplied blend and GLB','triangles':triangleCount}
for name in origins:
 meshes=list(records[name].values())
 for r in meshes:del r['unique']
 pos=origins[name]-(origins[parents[name]] if parents[name] else Vector())
 data['parts'].append({'name':name,'parent':parents[name],'position':list(pos),'meshes':meshes})
(ROOT/'src/assets/pop110-model.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(PUBLIC/'pop110.glb'),export_format='GLB',use_selection=True,export_yup=True)

# Studio only: excluded from the GLB and runtime geometry above.
scene=bpy.context.scene;studio=bpy.data.collections.new('PreviewStudio');scene.collection.children.link(studio)
def studio_obj(o):
 for c in list(o.users_collection):c.objects.unlink(o)
 studio.objects.link(o)
floor=bpy.data.materials.new('StudioFloor');floor.diffuse_color=(.26,.28,.29,1)
bpy.ops.mesh.primitive_plane_add(size=200);o=bpy.context.object;o.data.materials.append(floor);studio_obj(o)
scene.world=bpy.data.worlds.new('PopStudio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.4,.46,.5,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
for name,pos,power,size in [('Key',(3,-4,5),550,4),('Fill',(-3,-1,3),400,3),('Rim',(1,4,4),650,3)]:
 light=bpy.data.lights.new(name,'AREA');light.energy=power;light.size=size;o=bpy.data.objects.new(name,light);studio.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.55))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.8,-3.4,1.8));cam=bpy.context.object;studio_obj(cam);cam.rotation_euler=(Vector((0,0,.6))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.6;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=False;scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.resolution_x=1200;scene.render.resolution_y=950;scene.render.resolution_percentage=100;scene.render.filepath=str(OUT/'pop110-textured-preview.png')
scene['Source']='User edited Pop; originals in assets/pop110/source-user';scene['Triangles']=triangleCount
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'pop110.blend'))
print('TEXTURED_POP',triangleCount,'triangles',sum(len(x['meshes']) for x in data['parts']),'draw calls',flush=True)
bpy.ops.render.render(write_still=True)
