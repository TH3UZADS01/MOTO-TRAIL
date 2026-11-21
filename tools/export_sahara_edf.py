"""Run in Blender after import_titan_edf.py --sahara. Export the rig in game metres."""
import bpy, bmesh, json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'artifacts/sahara/decoded.blend'))
bpy.context.preferences.filepaths.save_version=0
def xyz(v): return [round(v.x,5),round(v.z,5),round(-v.y,5)]
parts={'Body':(None,(0,0,0)), 'Steering':('Body',(0,-.276,1.003)), 'FrontSuspension':('Steering',(0,-.276,1.003)), 'RearSuspension':('Body',(0,0,0)), 'FrontWheel':('Steering',(0,-.7125,.362)), 'RearWheel':('Body',(0,.7125,.325))}
# Keep the front assembly imported from rodasahara300j/f_tyre.edf.
from math import sin, cos, pi, hypot
# The moulded fender and fork legs share one EDF mesh. The nose is the
# forwardmost vertex of this object; keep its whole welded component.
fork=bpy.data.objects['FrontSuspension_1_1']
guard=fork.copy();guard.data=fork.data.copy();bpy.context.collection.objects.link(guard)
guard.name='Mudguard';guard['assembled']=True
bm=bmesh.new();bm.from_mesh(guard.data)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
nose=min(bm.verts,key=lambda v:v.co.y)
shell={nose};pending=[nose]
while pending:
 v=pending.pop()
 for edge in v.link_edges:
  other=edge.other_vert(v)
  if other not in shell:shell.add(other);pending.append(other)
bmesh.ops.delete(bm,geom=[v for v in bm.verts if v not in shell],context='VERTS')
# Fit the original moulding and fork mounts around the assembled front axle.
for v in bm.verts:
 v.co.x*=.78
 v.co.y-=.021
 v.co.z-=.152
 # Give the trailing skirt more room behind the tread. Flare the lower
 # sidewalls outboard of the tyre while retaining the fork mounting tabs.
 trailing=max(0,v.co.y+.67)
 v.co.y+=.14*trailing
 radial=hypot(v.co.y+.7125,v.co.z-.362)
 if radial<.39 and abs(v.co.x)>.022:
  inset=min(.014,max(0,.070-abs(v.co.x)))
  v.co.x+=(1 if v.co.x>0 else -1)*inset*min(1,(.39-radial)/.030)
bm.to_mesh(guard.data);bm.free()
plastic=guard.active_material.copy();plastic.name='Mudguard'
plastic.diffuse_color=(.026,.028,.03,1);guard.data.materials[0]=plastic

# Fit the front wheel design to the existing rear axle. The rim and spokes
# shrink together; above the bead, the tyre grows to the full rolling radius.
for wheel in list(bpy.data.objects):
 if wheel.get('part')=='RearWheel':bpy.data.objects.remove(wheel,do_unlink=True)
for wheel in list(bpy.data.objects):
 if wheel.get('part')!='FrontWheel':continue
 back=wheel.copy();back.data=wheel.data.copy();bpy.context.collection.objects.link(back)
 back.name=wheel.name.replace('FrontWheel','RearWheel');back['part']='RearWheel';back['assembled']=True
 back.data.materials[0]=bpy.data.materials[wheel.active_material.name.replace('FrontWheel','RearWheel')]
 for v in back.data.vertices:
  # Turn the assembly around so the rear brake runs opposite the chain.
  x,y,z=-v.co.x,-(v.co.y+.75),v.co.z-.362
  r=hypot(y,z)
  rim=.289
  rear_rim=rim*17/21
  radius=r*17/21 if r<=rim else rear_rim+(r-rim)*(.325-rear_rim)/(.362-rim)
  scale=radius/r if r else 1
  width=1+.30*min(1,max(0,(r-.14)/(rim-.14)))
  v.co=(x*width,.7125+y*scale,.325+z*scale)

# Assemble the suspension in bike coordinates. Its ends meet the imported wheel pivots.
for obj in list(bpy.data.objects):
 if obj!=guard and obj.get('part') in ('FrontSuspension','RearSuspension'):bpy.data.objects.remove(obj,do_unlink=True)
def hardware(part,name,color,verts,faces):
 mesh=bpy.data.meshes.new(name)
 mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
 mesh.materials.append(mat);obj['part']=part;obj['material_index']=0;obj['assembled']=True
def rod(part,name,color,a,b,r,n=12):
 a,b=Vector(a),Vector(b);axis=(b-a).normalized()
 u=axis.cross(Vector((0,0,1)) if abs(axis.z)<.94 else Vector((1,0,0))).normalized()
 v=axis.cross(u)
 verts=[end+r*(cos(2*pi*j/n)*u+sin(2*pi*j/n)*v) for end in [a,b] for j in range(n)]
 faces=[(j,(j+1)%n,n+(j+1)%n,n+j) for j in range(n)]+[tuple(reversed(range(n))),tuple(range(n,2*n))]
 hardware(part,name,color,verts,faces)
front='FrontSuspension';rear='RearSuspension';metal=(.39,.41,.43);dark=(.065,.07,.075)
for side in (-1,1):
 x=side*.088;a=Vector((x,-.7125,.362));b=Vector((x,-.38,.98));mid=a.lerp(b,.55)
 rod(front,'ForkLower'+str(side),dark,a,mid,.027)
 rod(front,'ForkStanchion'+str(side),metal,mid,b,.019)
 rod(rear,'Swingarm'+str(side),dark,(side*.104,.7125,.325),(side*.104,.14,.50),.032,8)
# Chain wraps both sprockets on their common external tangents.
from math import atan2,acos
ay,az=.7125,.325;by,bz=.12,.46;ra,rb=.104,.044
ang=atan2(bz-az,by-ay);spread=acos((ra-rb)/((by-ay)**2+(bz-az)**2)**.5)
track=[]
for cy,cz,r,start,end in [(ay,az,ra,ang+spread,ang+2*pi-spread),(by,bz,rb,ang-spread,ang+spread)]:
 for i in range(19):
  t=start+(end-start)*i/18;track.append((cy+r*cos(t),cz+r*sin(t)))
for i,(cy,cz,r) in enumerate([(ay,az,ra),(by,bz,rb)]):
 rod(rear,'Sprocket'+str(i),metal,(-.117,cy,cz),(-.108,cy,cz),r,32)
verts=[]
for y,z in track:
 verts.extend([(-.12,y,z-.004),(-.106,y,z-.004),(-.106,y,z+.004),(-.12,y,z+.004)])
hardware(rear,'DriveChain',(.13,.135,.14),verts,[(4*i+k,4*i+(k+1)%4,4*((i+1)%len(track))+(k+1)%4,4*((i+1)%len(track))+k) for i in range(len(track)) for k in range(4)])
objects=[o for o in bpy.data.objects if o.type=='MESH']
groups={}; data={'parts':[],'materials':{}}
for part,(parent,origin) in parts.items():
 g=bpy.data.objects.new(part,None);bpy.context.collection.objects.link(g);groups[part]=g
 if parent:g.parent=groups[parent]
 g.location=Vector(origin)-(Vector(parts[parent][1]) if parent else Vector())
 batches={}
 for o in objects:
  if o['part']!=part:continue
  mi=o['material_index'];m=o.active_material
  if part in ('FrontWheel','RearWheel'):
   # Uniform sRGB swatches from the wheel pack: cinza, dark rubber and fosco.
   swatch=[(124,121,124),(24,24,24),(23,23,23)][mi]
   m.diffuse_color=(*[(c/255)**2.2 for c in swatch],1)
  if o.name=='Body_13_6':m.name='TailLens';m.diffuse_color=(.5,.015,.01,1)
  if part=='Body' and mi==5 and o.name.endswith('_5'):m.name='Paint';m.diffuse_color=(.45,.025,.02,1)
  if part=='Body' and mi==9:m.name='Windshield'
  m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=m.diffuse_color
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
  for v in bm.verts:
   p=v.co
   if o.get('assembled'):pass
   elif 'Wheel' in part:p.y+=(-.7125+.75 if part=='FrontWheel' else .7125-.66)
   else:
    p.y=(p.y+.045)*1.425/1.41
    p.z-=.025
    if part=='RearSuspension':p.z-=.17*max(0,min(1,(p.y-.17)/.50))
   p-=Vector(origin)
  bm.to_mesh(o.data);bm.free();o.parent=g
  bpy.context.view_layer.objects.active=o
  if part not in ('FrontWheel','RearWheel') and o!=guard and len(o.data.polygons)>300:
   dec=o.modifiers.new('Web','DECIMATE');dec.ratio=.24;bpy.ops.object.modifier_apply(modifier=dec.name)
  mesh=o.data;mesh.calc_loop_triangles()
  rec=batches.setdefault(m.name,dict(material=m.name,positions=[],normals=[],indices=[]))
  offset=len(rec['positions'])//3
  for v in mesh.vertices:rec['positions']+=xyz(v.co);rec['normals']+=xyz(v.normal)
  for t in mesh.loop_triangles:rec['indices'].extend(offset+i for i in t.vertices)
  data['materials'][m.name]=dict(color='#'+''.join('%02x'%round(255*c**(1/2.2)) for c in m.diffuse_color[:3]),metalness=.12,roughness=.55)
 data['parts'].append(dict(name=part,parent=parent,position=xyz(g.location),meshes=list(batches.values())))
# Body_9_5 contains the headlamp cover in front of the separate upper screen.
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from headlamp_glass import split_front_glass
split_front_glass(data,'Body','Windshield',.474,'Headlamp')
(root/'src/assets/sahara-model.json').write_text(json.dumps(data,separators=(',',':')))
bpy.ops.wm.save_as_mainfile(filepath=str(root/'assets/sahara/sahara.blend'))
bpy.ops.export_scene.gltf(filepath=str(root/'public/models/sahara.glb'),export_format='GLB')
