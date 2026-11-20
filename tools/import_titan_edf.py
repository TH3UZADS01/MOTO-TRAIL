"""Converter for the supplied unencrypted PiBoSo EDF layout, with strict bounds checks.
Run in Blender. Reads the user ZIP; never executes files from the archive.
"""
import bpy,struct,zlib,zipfile,json,math,argparse,sys
import numpy as np
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/cg150/titan-conversion';OUT.mkdir(parents=True,exist_ok=True)
args=argparse.ArgumentParser(description=__doc__)
args.add_argument('--zip',default=r'C:/Users/olive/OneDrive/Desktop/titan150luquine.zip')
args.add_argument('--wheels',default=r'D:/mods/tyres/rodatitan15008luq')
args.add_argument("--sahara",type=Path,help="Decode the Sahara 300 model.edf instead of the Titan archive")
options=args.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
bpy.context.preferences.filepaths.save_version=0
if options.sahara:
 OUT=ROOT/'artifacts/sahara';OUT.mkdir(parents=True,exist_ok=True);b=options.sahara.read_bytes()
else:
 with zipfile.ZipFile(options.zip) as z:b=z.read('titan150luquine/model.edf')
assert b[:4]==b'EDF\0'
u=lambda o:struct.unpack_from('<I',b,o)[0]
o=4;blocks=[];textures=[]
for block in range(4):
 bounds=struct.unpack_from('<6f',b,o);o+=24;nm=u(o);o+=4;assert 0<nm<100
 mats=[]
 for j in range(nm):
  mats.append({'color':struct.unpack_from('<3f',b,o+4),'texture':u(o+44)});o+=56
 nv=u(o);o+=4;assert 0<nv<2000000
 pos=np.frombuffer(b,'<f4',nv*3,o).reshape(-1,3).copy()
 uv=np.frombuffer(b,'<f4',nv*2,o+nv*12).reshape(-1,2).copy();o+=nv*72
 nt=u(o);o+=4;idx=np.frombuffer(b,'<u4',nt*3,o).reshape(-1,3).copy();o+=nt*12
 assert np.isfinite(pos).all() and np.isfinite(uv).all() and idx.max()<nv
 nn=u(o);o+=4;nodes=[]
 for i in range(nn):
  name=b[o:o+100].split(b'\0')[0].decode();m=np.array(struct.unpack_from('<16f',b,o+104)).reshape(4,4);o+=232
  kind=u(o);nc=u(o+4);o+=8;children=struct.unpack_from('<'+'I'*nc,b,o);o+=nc*4
  ng=u(o);o+=4;groups=[]
  for j in range(ng):
   group=struct.unpack_from('<6I',b,o);o+=24;assert group[1]<nm and group[2]+group[3]<=nt;groups.append(group)
  o+=32;nodes.append({'name':name,'matrix':m,'children':children,'groups':groups})
 # Texture dictionary is present after the first scene only in this EDF variant.
 if block==0:
  nx=u(o);o+=4;assert nx<100
  for i in range(nx):
   name=b[o:o+100].split(b'\0')[0].decode();kind,w,h=struct.unpack_from('<3I',b,o+100);size=u(o+132)
   raw=zlib.decompress(b[o+144:o+144+size],-15);assert len(raw)==w*h*4
   textures.append((name,w,h,raw));o+=144+size
 blocks.append({'bounds':bounds,'mats':mats,'pos':pos,'uv':uv,'idx':idx,'nodes':nodes})
# The referenced wheel pack is installed alongside the source mod.
main_bytes=b
for wheel_file in ['f_tyre.edf','r_tyre.edf']:
 b=Path(options.wheels,wheel_file).read_bytes()
 o=4
 bounds=struct.unpack_from('<6f',b,o);o+=24;nm=u(o);o+=4;assert 0<nm<100
 mats=[]
 for j in range(nm):
  mats.append({'color':struct.unpack_from('<3f',b,o+4),'texture':u(o+44)});o+=56
 nv=u(o);o+=4;assert 0<nv<2000000
 pos=np.frombuffer(b,'<f4',nv*3,o).reshape(-1,3).copy()
 uv=np.frombuffer(b,'<f4',nv*2,o+nv*12).reshape(-1,2).copy();o+=nv*72
 nt=u(o);o+=4;idx=np.frombuffer(b,'<u4',nt*3,o).reshape(-1,3).copy();o+=nt*12
 assert np.isfinite(pos).all() and np.isfinite(uv).all() and idx.max()<nv
 nn=u(o);o+=4;nodes=[]
 for i in range(nn):
  name=b[o:o+100].split(b'\0')[0].decode();m=np.array(struct.unpack_from('<16f',b,o+104)).reshape(4,4);o+=232
  kind=u(o);nc=u(o+4);o+=8;children=struct.unpack_from('<'+'I'*nc,b,o);o+=nc*4
  ng=u(o);o+=4;groups=[]
  for j in range(ng):
   group=struct.unpack_from('<6I',b,o);o+=24;assert group[1]<nm and group[2]+group[3]<=nt;groups.append(group)
  o+=32;nodes.append({'name':name,'matrix':m,'children':children,'groups':groups})
 blocks.append({'bounds':bounds,'mats':mats,'pos':pos,'uv':uv,'idx':idx,'nodes':nodes})
b=main_bytes
print('Decoded',sum(len(x['idx']) for x in blocks),'triangles',len(textures),'textures',flush=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
images=[]
for name,w,h,raw in textures:
 im=bpy.data.images.new(name,width=w,height=h,alpha=True)
 pixels=np.frombuffer(raw,np.uint8).reshape(h,w,4).astype(np.float32)/255
 im.pixels.foreach_set(pixels.ravel());im.pack();images.append(im)

# EDF scene transforms are row-major, with translations in the final column.
# Assembly anchors follow the supplied bike.geom (steering head and swingarm pivot).
assembly=[Matrix.Identity(4),Matrix.Translation((0,.9912,.3372))@Matrix.Rotation(math.radians(-26.1),4,'X')@Matrix.Translation((0,-.3018,.0213)),Matrix.Translation((0,.9912,.3372))@Matrix.Rotation(math.radians(-26.1),4,'X'),Matrix.Translation((0,.47,-.17))]
assembly.extend([Matrix.Translation((0,.47,.72)),Matrix.Translation((0,.45,-.80))])
if options.sahara:
 head=Matrix.Translation((0,1.0276,.319))@Matrix.Rotation(math.radians(-26.5),4,'X')
 assembly=[Matrix.Identity(4),head@Matrix.Translation((0,-.37,.02)),head,Matrix.Translation((0,.47,-.17)), Matrix.Translation((0,.362,.75)),Matrix.Translation((0,.325,-.66))]
parts=['Body','FrontSuspension','Steering','RearSuspension','FrontWheel','RearWheel'];allmeshes=[]
for bi,block in enumerate(blocks):
 nodes=block['nodes'];world={}
 def visit(i,parent):
  world[i]=parent@Matrix(nodes[i]['matrix'].tolist())
  for child in nodes[i]['children']:visit(child,world[i])
 visit(0,assembly[bi])
 materials=[]
 for mi,desc in enumerate(block['mats']):
  m=bpy.data.materials.new(f'{parts[bi]}_Material{mi}');m.diffuse_color=(*desc['color'],1);m.use_nodes=True
  bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=m.diffuse_color;bs.inputs['Roughness'].default_value=.48
  if options.sahara and bi>=4:
   rgb=[(.36,.37,.39),(.018,.018,.019),(.58,.58,.57)][mi];m.diffuse_color=(*rgb,1);bs.inputs['Base Color'].default_value=m.diffuse_color
  elif desc['texture']:
   im=images[desc['texture']-1];t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color'])
  materials.append(m)
 for ni,node in enumerate(nodes):
  for _,mi,start,count,_,_ in node['groups']:
   faces=block['idx'][start:start+count];used,inv=np.unique(faces,return_inverse=True);p=block['pos'][used]
   mat=np.array(world.get(ni,assembly[bi]@Matrix(node['matrix'].tolist())))
   p=p@mat[:3,:3].T+mat[:3,3];p=p[:,[0,2,1]];p[:,1]*=-1
   mesh=bpy.data.meshes.new(node['name']);mesh.from_pydata(p.tolist(),[],inv.reshape(-1,3).tolist());mesh.update()
   obj=bpy.data.objects.new(f'{parts[bi]}_{mi}_{ni}',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(materials[mi]);obj['part']=parts[bi];obj['material_index']=mi
   layer=mesh.uv_layers.new(name='UVMap');coords=block['uv'][used][inv];layer.data.foreach_set('uv',coords.ravel())
   allmeshes.append(obj)
   print(obj.name,'bounds',p.min(0).round(3),p.max(0).round(3),flush=True)

bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('decoded.blend' if options.sahara else 'titan-decoded.blend')))
if options.sahara:sys.exit(0)
scene=bpy.context.scene;bpy.ops.object.camera_add(location=(3,-4,2.3));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.75))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.8;scene.camera=cam
scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
scene.render.resolution_x=1100;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.filepath=str(OUT/'decoded-preview.png');bpy.ops.render.render(write_still=True)
