"""Create the Vale rider in Blender. Shapes use X right, Y up, Z forward in rig-local units."""
import bpy, json, math
from mathutils import Vector
from pathlib import Path
from math import sin,cos,pi
root=Path(__file__).resolve().parents[1]
out=root/'assets/rider'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
palette={'canvas':'506e5f','shade':'374f43','stitch':'a29b78','zip':'b5a580','shirt':'e0cba1','jeans':'364c62','denim':'435c73','leather':'684430','sole':'312d2c','cream':'ebddbc','rim':'49433b','skin':'b97d55','lip':'915638','eye':'392f29','stripe':'b6633e'}
data={}; mats={}
def linear(c):
 c=int(c,16)/255
 return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
for k,h in palette.items():
 m=bpy.data.materials.new(k);m.diffuse_color=(*[linear(h[i:i+2]) for i in (0,2,4)],1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=m.diffuse_color;bs.inputs['Roughness'].default_value=.8;mats[k]=m
def part(k):
 global v,f,colors,key
 key=k;v=[];f=[];colors=[]
def face(ids,c):
 f.append(ids);colors.append(c)
def loft(rows,c,n=12,arc=None):
 # rows: height, half-width, half-depth, fore-aft offset
 ids=[]
 for y,w,d,z in rows:
  row=[]
  for j in range(n+(arc is not None)):
   a=2*pi*j/n if arc is None else arc[0]+(arc[1]-arc[0])*j/n
   row.append(len(v));v.append((w*sin(a),y,z+d*cos(a)))
  ids.append(row)
 for r,s in zip(ids,ids[1:]):
  for j in range(n):
   t=(j+1)%len(r);face([r[j],r[t],s[t],s[j]],c)
 if arc is None:
  face(ids[0][::-1],c);face(ids[-1],c)
def box(x,y,z,w,h,d,c):
 i=len(v)
 for a,b,e in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:v.append((x+a*w/2,y+b*h/2,z+e*d/2))
 for q in [[3,2,1,0],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]]:face([i+j for j in q],c)
def save(pos,scale):
 me=bpy.data.meshes.new(key);me.from_pydata([(x,-z,y) for x,y,z in v],[],f);me.update()
 ob=bpy.data.objects.new(key,me);bpy.context.collection.objects.link(ob);ob.location=(pos[0],-pos[2],pos[1]);ob.scale=(scale[0],scale[2],scale[1])
 slots=list(dict.fromkeys(colors))
 for c in slots:me.materials.append(mats[c])
 for p,c in zip(me.polygons,colors):p.material_index=slots.index(c)
 me.calc_loop_triangles()
 data[key]=dict(positions=[round(a,5) for p in v for a in p],triangles=[list(t.vertices)+[slots.index(colors[t.polygon_index])] for t in me.loop_triangles],colors=[palette[c] for c in slots])
 return ob
part('torso')
loft([(-1,.69,.74,0),(-.78,.85,.84,0),(-.1,.97,.98,0),(.55,1.03,1,0),(.78,.90,.82,0),(.94,.44,.55,0)],'canvas')
loft([(-.98,.71,.78,0),(-.84,.84,.85,0)],'shade')
loft([(.81,.48,.55,0),(1,.44,.48,0)],'shade')
loft([(.99,.38,.41,0),(1.04,.33,.37,0)],'shirt')
box(0,.05,.995,.037,1.10,.035,'zip')
for side in (-1,1):
 box(side*.43,.23,.84,.37,.34,.15,'shade');box(side*.43,.41,.88,.40,.09,.13,'canvas')
 box(side*.43,.39,.956,.047,.042,.025,'zip')
save((0,1.11,0),(.15,.21,.111))
part('helmet')
loft([(-.93,.43,.52,.08),(-.77,.66,.70,.10),(-.41,.78,.84,.075),(.20,.80,.83,.055),(.49,.66,.69,.05)],'skin')
for x in (-.32,.32):
 box(x,-.055,.83,.17,.055,.06,'eye');box(x,.041,.82,.23,.046,.065,'rim')
box(0,-.24,.90,.17,.20,.15,'skin');box(0,-.54,.82,.26,.035,.045,'lip')
loft([(.14,1.01,.99,0),(.39,.98,.99,-.015),(.69,.82,.89,-.035),(.90,.58,.63,-.04),(1.01,.22,.25,-.04)],'cream',20)
for lo,hi,c in [(-.63,-.53,'rim'),(-.53,-.28,'cream'),(-.28,-.18,'stripe'),(-.18,.16,'cream')]:
 loft([(lo,.99,.97,-.02),(hi,1.01,.99,0)],c,16,(1.05,2*pi-1.05))
loft([(.12,1.019,1.05,0),(.20,1.025,1.095,0)],'rim',20)
for side in (-1,1):box(side*.63,-.62,.29,.082,.50,.10,'rim')
save((0,1.411,.012),(.12,.14,.12))
for name,cols,rows in [('upperArm',('canvas','canvas'),[(-.5,.81),(-.40,1.14),(0,1.12),(.44,.90),(.50,.80)]),('forearm',('canvas','shade'),[(-.5,1),(-.38,1.12),(.27,.87),(.33,.83),(.5,.80)]),('thigh',('jeans','denim'),[(-.5,.88),(-.29,1.10),(.20,.94),(.44,.83),(.5,.80)]),('shin',('jeans','denim'),[(-.5,.92),(-.30,1.04),(.29,.80),(.40,.83),(.5,.78)])]:
 part(name)
 for i,(a,b) in enumerate(zip(rows,rows[1:])):loft([(y,w,w*.95,0) for y,w in (a,b)],cols[int(i==len(rows)-2)])
 arm='arm' in name.lower();upper=name in ('upperArm','thigh');length=(.27 if arm else .37);r=.045 if arm else .055
 ob=save((.155 if arm else .10,(1.10 if arm else .74)-(0 if upper else length),0),(r,length,r))
 ob.rotation_euler.x=pi
 mirror=ob.copy();bpy.context.collection.objects.link(mirror);mirror.location.x*=-1
part('boot')
loft([(-1,.87,.95,.06),(-.73,1,1,.09)],'sole')
loft([(-.74,1,1,.09),(-.19,.98,.96,.07),(.34,.83,.70,-.10),(.95,.72,.53,-.24),(1.18,.69,.50,-.24)],'leather')
for y,z in [(0,.64),(.20,.55)]:box(0,y,z,.85,.10,.12,'stitch')
ob=save((.10,.17,.025),(.052,.037,.084));mirror=ob.copy();bpy.context.collection.objects.link(mirror);mirror.location.x*=-1
part('hips');loft([(-1,.71,.65,0),(-.62,1,.95,0),(.50,.97,.95,0),(.86,.83,.83,0)],'jeans');loft([(.74,.90,.91,0),(.98,.85,.84,0)],'leather');save((0,.87,0),(.12,.096,.11))
part('glove')
loft([(-.75,.59,.60,.06),(-.48,.90,.88,.04),(.17,.97,.96,0),(.66,.80,.80,-.04)],'leather')
for j in range(4):box((j-1.5)*.44,-.35,.65,.37,.61,.81,'leather')
box(.79,.02,-.16,.47,.52,.98,'leather')
ob=save((.16,.69,0),(.038,.038,.047));mirror=ob.copy();bpy.context.collection.objects.link(mirror);mirror.location.x*=-1;mirror.scale.x*=-1
(root/'src/assets/traveller.json').write_text(json.dumps(data,separators=(',',':')))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'viajante.blend'))

# Small studio portrait of the editable character.
scene=bpy.context.scene
bpy.ops.object.camera_add(location=(1.55,-3.8,1.59))
cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.85))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=1.69;scene.camera=cam
for pos,energy,size in [((1.4,-3.4,3),280,3),((-2,-1,2),140,2),((0,2,3),240,2)]:
 bpy.ops.object.light_add(type='AREA',location=pos);lamp=bpy.context.object;lamp.data.energy=energy;lamp.data.shape='DISK';lamp.data.size=size
 lamp.rotation_euler=(Vector((0,0,.9))-lamp.location).to_track_quat('-Z','Y').to_euler()
scene.world=bpy.data.worlds.new('Studio');scene.world.color=(.20,.25,.23)
scene.render.engine='CYCLES';scene.cycles.samples=8
scene.render.resolution_x=540;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.render.filepath=str(out/'viajante.png');bpy.ops.render.render(write_still=True)
