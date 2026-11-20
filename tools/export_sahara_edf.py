"""Run in Blender after import_titan_edf.py --sahara. Export the rig in game metres."""
import bpy, bmesh, json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'artifacts/sahara/decoded.blend'))
bpy.context.preferences.filepaths.save_version=0
def xyz(v): return [round(v.x,5),round(v.z,5),round(-v.y,5)]
parts={'Body':(None,(0,0,0)), 'Steering':('Body',(0,-.276,1.003)), 'FrontSuspension':('Steering',(0,-.276,1.003)), 'RearSuspension':('Body',(0,0,0)), 'FrontWheel':('Steering',(0,-.7125,.362)), 'RearWheel':('Body',(0,.7125,.325))}
# Rebuild the front assembly around its axle. The EDF front rim contains faces
# spanning the spoke openings. All profile coordinates are in axle-local metres.
from math import sin, cos, pi
for obj in list(bpy.data.objects):
 if obj.get('part')=='FrontWheel': bpy.data.objects.remove(obj,do_unlink=True)
axle=Vector((0,-.75,.362))
def wheel_part(name,color,verts,faces):
 mesh=bpy.data.meshes.new(name)
 mesh.from_pydata([Vector(v)+axle for v in verts],[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
 mesh.materials.append(mat);obj['part']='FrontWheel';obj['material_index']=0
def ring(name,color,profile,n=64):
 verts=[(x,r*cos(2*pi*j/n),r*sin(2*pi*j/n)) for x,r in profile for j in range(n)]
 faces=[]
 for k in range(len(profile)):
  for j in range(n):
   a=k*n;b=((k+1)%len(profile))*n;h=(j+1)%n
   faces.append((a+j,a+h,b+h,b+j))
 wheel_part(name,color,verts,faces)
ring('FrontTyre',(.019,.019,.021),[(-.027,.276),(-.043,.303),(-.044,.331),(-.033,.352),(-.014,.362),(.014,.362),(.033,.352),(.044,.331),(.043,.303),(.027,.276)])
ring('FrontRim',(.34,.35,.36),[(-.03,.28),(.03,.28),(.029,.26),(.019,.253),(-.019,.253),(-.029,.26)])
ring('FrontHub',(.25,.26,.27),[(-.052,.017),(-.052,.048),(-.032,.054),(.032,.054),(.052,.048),(.052,.017)],32)
ring('FrontBrakeDisc',(.45,.46,.47),[(.054,.05),(.054,.127),(.058,.127),(.058,.05)],48)
verts=[];faces=[]
for j in range(36):
 a=2*pi*j/36;b=a+(.27 if j%4<2 else -.27);side=1 if j%2 else -1
 ends=[Vector((side*.036,.05*cos(b),.05*sin(b))),Vector((side*.014,.259*cos(a),.259*sin(a)))]
 axis=(ends[1]-ends[0]).normalized();u=axis.cross(Vector((1,0,0))).normalized();v=axis.cross(u)
 start=len(verts)
 for end in ends:
  for k in range(5):verts.append(end+.002*(u*cos(2*pi*k/5)+v*sin(2*pi*k/5)))
 for k in range(5):faces.append((start+k,start+(k+1)%5,start+5+(k+1)%5,start+5+k))
wheel_part('FrontSpokes',(.5,.51,.52),verts,faces)
# Build suspension in assembled coordinates: the EDF stores its linkage at a
# different rest angle. All four axle ends must coincide with the wheel pivots.
for obj in list(bpy.data.objects):
 if obj.get('part') in ('FrontSuspension','RearSuspension'):bpy.data.objects.remove(obj,do_unlink=True)
def hardware(part,name,color,verts,faces):
 wheel_part(name,color,[Vector(v)-axle for v in verts],faces)
 obj=bpy.data.objects[name];obj['part']=part;obj['assembled']=True
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
# Curved mudguard above the tyre, steering with the fork.
verts=[]
for j in range(21):
 t=-.94+j*.10
 for x,r in [(-.068,.376),(0,.396),(.068,.376)]:
  verts.append((x,-.7125+r*sin(t),.362+r*cos(t)))
hardware(front,'Mudguard',dark,verts,[(3*j+k,3*j+k+1,3*j+k+4,3*j+k+3) for j in range(20) for k in (0,1)])
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
  if part!='FrontWheel' and len(o.data.polygons)>300:
   dec=o.modifiers.new('Web','DECIMATE');dec.ratio=.24;bpy.ops.object.modifier_apply(modifier=dec.name)
  mesh=o.data;mesh.calc_loop_triangles()
  rec=batches.setdefault(m.name,dict(material=m.name,positions=[],normals=[],indices=[]))
  offset=len(rec['positions'])//3
  for v in mesh.vertices:rec['positions']+=xyz(v.co);rec['normals']+=xyz(v.normal)
  for t in mesh.loop_triangles:rec['indices'].extend(offset+i for i in t.vertices)
  data['materials'][m.name]=dict(color='#'+''.join('%02x'%round(255*c**(1/2.2)) for c in m.diffuse_color[:3]),metalness=.12,roughness=.55)
 data['parts'].append(dict(name=part,parent=parent,position=xyz(g.location),meshes=list(batches.values())))
(root/'src/assets/sahara-model.json').write_text(json.dumps(data,separators=(',',':')))
bpy.ops.wm.save_as_mainfile(filepath=str(root/'assets/sahara/sahara.blend'))
bpy.ops.export_scene.gltf(filepath=str(root/'public/models/sahara.glb'),export_format='GLB')
