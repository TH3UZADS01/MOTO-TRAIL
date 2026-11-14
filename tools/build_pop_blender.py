"""Author the unbranded Pop reference in Blender; export editable source, GLB and game mesh data.
Run: blender --background --factory-startup --python tools/build_pop_blender.py
Coordinates used by the helpers: X across the bike, Y up, Z forward (metres).
"""
import bpy, math, json
bpy.context.preferences.filepaths.save_version=0
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'pop110'
PUBLIC = ROOT / 'public' / 'models'
OUT.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def xyz(p): return Vector((p[0], -p[2], p[1]))
def linear(v): return v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4
materials = {}
def material(name, color, rough=.55, metallic=0):
    rgb = tuple(int(color[i:i+2], 16) / 255 for i in (0,2,4))
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*map(linear, rgb), 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = m.diffuse_color
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metallic
    materials[name] = (m, {'color':'#'+color, 'roughness':rough, 'metalness':metallic})
    return m
paint=material('Paint','202e76',.4,.12)
rubber=material('Rubber','171a1c',.93)
black=material('BlackPlastic','25282c',.7)
seat=material('Seat','303235',.96)
alloy=material('WheelAlloy','34383b',.43,.45)
steel=material('Steel','aeb8bc',.32,.72)
engine=material('Engine','858e91',.58,.55)
darkmetal=material('DarkMetal','44494a',.52,.6)
lens=material('Headlamp','d9e5e7',.2,.25)
amber=material('Indicators','f49a15',.3)
red=material('TailLens','bd2428',.27)

groups={}
origins={}
def group(name, origin=(0,0,0), parent=None):
    g=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(g)
    g.location=xyz(origin)
    if parent:
        g.parent=groups[parent];g.location=xyz(origin)-xyz(origins[parent])
    g.empty_display_size=.06
    groups[name]=g;origins[name]=origin
    return g
group('Body')
group('Steering',(0,0,.619),'Body')
group('FrontSuspension',(0,0,.619),'Steering')
group('RearSuspension',(0,0,0),'Body')
group('RearWheel',(0,.285,-.619),'Body')
group('FrontWheel',(0,.305,.619),'Steering')

def finish(o,name,mat,part):
    o.name=name;o.data.materials.append(mat)
    bpy.context.view_layer.update()
    world=o.matrix_world.copy();o.parent=groups[part];o.matrix_world=world
    return o
def mesh(name,verts,faces,mat,part='Body'):
    m=bpy.data.meshes.new(name);m.from_pydata([xyz(v) for v in verts],[],faces);m.update()
    o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o)
    return finish(o,name,mat,part)
def box(name,p,size,mat,part='Body',bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object
    o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,mat,part)
def bar(name,a,b,r,mat,part='Body',vertices=10,r2=None):
    av,bv=xyz(a),xyz(b)
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=(bv-av).length,location=(av+bv)/2)
    o=bpy.context.object;o.rotation_euler=(bv-av).to_track_quat('Z','Y').to_euler()
    return finish(o,name,mat,part)
def path(name,points,r,mat,part='Body',vertices=8):
    for i in range(len(points)-1):bar(name,points[i],points[i+1],r,mat,part,vertices)
def profile(name,outline,width,mat,part='Body'):
    # Side silhouettes extruded symmetrically; chamfered faces remain deliberately low-poly.
    verts=[(side*width/2,y,z) for side in (-1,1) for z,y in outline];n=len(outline)
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,verts,faces,mat,part)
def loft(name,rows,mat,part='Body'):
    # z, lower y, upper y, half width. Eight-sided cross-section avoids box-like fairings.
    verts=[]
    for z,lo,hi,w in rows:
        for x,y in [(-w*.72,lo),(-w,lo+(hi-lo)*.24),(-w,lo+(hi-lo)*.7),(-w*.72,hi),
                    (w*.72,hi),(w,lo+(hi-lo)*.7),(w,lo+(hi-lo)*.24),(w*.72,lo)]:verts.append((x,y,z))
    faces=[tuple(range(7,-1,-1)),tuple(range((len(rows)-1)*8,len(rows)*8))]
    for j in range(len(rows)-1):
        for i in range(8):faces.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
    return mesh(name,verts,faces,mat,part)
def torus(name,center,major,minor,mat,part,segments=32):
    bpy.ops.mesh.primitive_torus_add(major_segments=segments,minor_segments=8,location=xyz(center),major_radius=major,minor_radius=minor,rotation=(0,math.pi/2,0))
    return finish(bpy.context.object,name,mat,part)
def wheel(part,z,r):
    c=(0,r,z)
    torus('Tire',c,r-.043,.043,rubber,part)
    torus('TireShoulder',c,r-.049,.035,rubber,part)
    torus('AlloyRim',c,r-.082,.018,alloy,part)
    for x in (-.043,.043):torus('RimLip',(x,r,z),r-.083,.007,darkmetal,part)
    bar('Hub',(-.055,r,z),(.055,r,z),.073,alloy,part,16)
    for i in range(5):
        a=i*2*math.pi/5
        # Broad, slightly swept cast spokes, matching the supplied reference.
        for side in (-1,1):
            x=side*.018
            mesh('CastSpoke',[(x,r+math.cos(a)*.055,z+math.sin(a)*.055),
                 (x,r+math.cos(a+.13)*(r-.088),z+math.sin(a+.13)*(r-.088)),
                 (x,r+math.cos(a+.30)*(r-.088),z+math.sin(a+.30)*(r-.088)),
                 (x,r+math.cos(a+.5)*.055,z+math.sin(a+.5)*.055)],[(0,1,2,3)],alloy,part)
    bar('Axle',(-.085,r,z),(.085,r,z),.014,steel,part,10)
wheel('RearWheel',-.619,.285);wheel('FrontWheel',.619,.305)

# Frame, swingarm, rear shocks, foot rests and exposed horizontal motor.
for side in (-1,1):
    x=side*.105
    path('Frame',[(x,.34,-.09),(x,.69,-.55),(x,.76,-.72),(x,.73,-.13),(x,.88,.44)],.025,black)
    bar('Swingarm',(x,.32,.0),(x,.285,-.619),.025,black,'RearSuspension')
    a=Vector((side*.19,.31,-.61));b=Vector((side*.19,.69,-.46))
    bar('ShockBody',a,b,.024,darkmetal,'RearSuspension')
    bar('ShockRod',a.lerp(b,.3),b,.014,steel,'RearSuspension')
    axis=(b-a).normalized();u=Vector((1,0,0));v=axis.cross(u).normalized()
    points=[]
    for i in range(65):
        t=i/64;angle=t*math.pi*14
        points.append(tuple(a.lerp(b,.2+.7*t)+(u*math.cos(angle)+v*math.sin(angle))*.032))
    path('ShockSpring',points,.0065,steel,'RearSuspension',6)
    bar('RiderFootpeg',(side*.12,.29,.02),(side*.265,.29,.02),.022,darkmetal)
    bar('FootRubber',(side*.19,.29,.02),(side*.265,.29,.02),.027,rubber)
    bar('PassengerFootpeg',(side*.13,.38,-.36),(side*.23,.38,-.36),.021,rubber)
    bar('GrabRail',(side*.17,.79,-.46),(side*.17,.81,-.81),.013,darkmetal)
bar('RearGrabRail',(-.17,.81,-.81),(.17,.81,-.81),.013,darkmetal)
loft('EngineCrankcase',[(-.14,.25,.44,.09),(-.08,.23,.46,.125),(.08,.25,.44,.13),(.16,.28,.41,.10)],engine)
bar('ClutchCover',(.11,.35,-.005),(.154,.35,-.005),.093,engine,vertices=12)
bar('ClutchCoverInset',(.154,.35,-.005),(.164,.35,-.005),.072,steel,vertices=12)
bar('LeftEngineCover',(-.14,.35,-.03),(-.158,.35,-.03),.078,engine,vertices=12)
box('CylinderBlock',(0,.37,.205),(.18,.16,.18),darkmetal,bevel=.018)
for i in range(7):box('CoolingFin',(0,.37,.13+i*.025),(.205,.18,.009),engine,bevel=.003)
box('CylinderHead',(0,.37,.315),(.16,.145,.055),engine,bevel=.015)
path('Intake',[(0,.46,.18),(0,.52,.11),(0,.54,-.03)],.025,darkmetal)
path('ExhaustHeader',[(.08,.30,.29),(.16,.21,.23),(.20,.20,-.04),(.22,.28,-.22)],.019,steel)
bar('Silencer',(.22,.28,-.20),(.22,.34,-.83),.049,black,vertices=10,r2=.042)
bar('ExhaustTip',(.22,.34,-.83),(.22,.344,-.85),.028,darkmetal)
bar('ExhaustHole',(.22,.344,-.85),(.22,.345,-.853),.019,rubber)
bar('HeatShield',(.255,.32,-.28),(.255,.365,-.76),.036,black,vertices=8)
for z,y in [(-.34,.326),(-.69,.358)]:bar('ShieldBolt',(.284,y,z),(.294,y,z),.009,steel,vertices=6)
path('BrakePedal',[(.16,.28,.02),(.20,.25,.14),(.26,.25,.17)],.008,steel)
bar('GearLever',(-.17,.29,.01),(-.20,.27,.16),.009,steel)
bar('GearToe',(-.20,.27,.16),(-.26,.27,.16),.015,rubber)
# Stand folded up for riding (no permanent leg clipping the terrain).
bar('FoldedSideStand',(-.14,.26,-.04),(-.17,.27,-.39),.012,darkmetal)

# Long sculpted saddle and characteristic low step-through body panels.
loft('RearFairing',[(-.86,.63,.72,.10),(-.72,.55,.75,.15),(-.43,.48,.72,.17),(-.13,.49,.68,.135),(.10,.53,.64,.09)],paint)
loft('Seat',[(-.85,.73,.82,.115),(-.72,.75,.86,.165),(-.46,.73,.845,.17),(-.13,.715,.815,.155),(.08,.70,.79,.115),(.12,.70,.755,.07)],seat)
profile('UnderSeatBlack',[(-.57,.49),(-.14,.46),(.08,.39),(.10,.59),(-.18,.65),(-.52,.64)],.24,black)
profile('StepSpine',[(-.10,.58),(.08,.57),(.32,.78),(.43,.97),(.54,.92),(.42,.54),(.24,.40),(.08,.44)],.185,paint)
for side in (-1,1):
    # Folded side fins give the front leg shield its deep angular sculpting.
    verts=[(side*.10,.55,.08),(side*.17,.65,.28),(side*.16,.94,.43),(side*.10,.97,.52),
           (side*.19,.70,.47),(side*.13,.43,.31),(side*.08,.39,.21)]
    mesh('LegShieldFold',verts,[(0,1,4,5,6),(1,2,3,4),(4,3,5)],paint)
    bar('RearIndicatorStem',(side*.09,.65,-.82),(side*.17,.65,-.82),.012,black)
    box('RearIndicator',(side*.18,.65,-.83),(.055,.042,.06),amber,bevel=.013)
profile('RearMudguard',[(-.80,.67),(-.87,.63),(-.96,.31),(-.91,.30),(-.78,.59)],.12,black)
box('TailHousing',(0,.685,-.854),(.22,.085,.075),black,bevel=.018)
box('TailLamp',(0,.695,-.894),(.18,.055,.018),red,bevel=.009)

def fender(name,z,y,r,width,mat,part,frontAngle=1.08):
    verts=[];steps=12
    for i in range(steps+1):
        a=-.9+(frontAngle+.9)*i/steps
        for x,dr in [(-width,0),(0,.024),(width,0)]:verts.append((x,y+(r+dr)*math.cos(a),z+(r+dr)*math.sin(a)))
    faces=[]
    for i in range(steps):
        for j in range(2):faces.append((i*3+j,i*3+j+1,(i+1)*3+j+1,(i+1)*3+j))
    o=mesh(name,verts,faces,mat,part)
    mod=o.modifiers.new('Fender thickness','SOLIDIFY');mod.thickness=.008
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
fender('FrontFender',.619,.305,.35,.095,paint,'FrontSuspension')
fender('RearInnerFender',-.619,.285,.325,.07,black,'RearSuspension',.8)
for side in (-1,1):
    x=side*.078
    bar('ForkChrome',(x,.48,.585),(x,.94,.47),.019,steel,'FrontSuspension',12)
    bar('ForkLower',(x,.305,.619),(x,.53,.57),.028,darkmetal,'FrontSuspension',10)
    bar('ForkAxleBolt',(side*.08,.305,.619),(side*.095,.305,.619),.015,steel,'FrontSuspension',6)
bar('LowerYoke',(-.1,.74,.51),(.1,.74,.51),.025,black,'FrontSuspension')

# Angular headlamp and visor, without any lettering or logos.
loft('HeadlightCowl',[(.43,.86,1.08,.10),(.54,.84,1.10,.16),(.68,.88,1.06,.145),(.75,.92,1.035,.09)],paint,'Steering')
mesh('BlackVisor',[(-.13,1.015,.69),(.13,1.015,.69),(.10,1.115,.52),(-.10,1.115,.52)],[(0,1,2,3)],black,'Steering')
outline=[(-.095,1.035),(.095,1.035),(.115,.977),(.065,.90),(-.065,.90),(-.115,.977)]
verts=[(x,y,.758) for x,y in outline]+[(0,.979,.789)]
mesh('HeadlightFacets',verts,[(i,(i+1)%6,6) for i in range(6)],lens,'Steering')
for i in range(6):
    a=outline[i];b=outline[(i+1)%6];bar('LampSeal',(a[0],a[1],.758),(b[0],b[1],.758),.009,black,'Steering')
for side in (-1,1):
    bar('FrontIndicatorStem',(side*.12,.94,.60),(side*.19,.94,.63),.012,black,'Steering')
    box('FrontIndicator',(side*.20,.94,.64),(.06,.05,.055),amber,'Steering',.014)
    path('Handlebar',[(0,1.04,.49),(side*.15,1.04,.49),(side*.23,1.0,.49),(side*.35,1.0,.499)],.014,darkmetal,'Steering')
    bar('HandGrip',(side*.26,1,.499),(side*.36,1,.499),.023,rubber,'Steering',12)
    box('SwitchHousing',(side*.235,1,.49),(.043,.045,.052),black,'Steering',.006)
    path('BrakeLever',[(side*.24,.992,.52),(side*.29,.982,.555),(side*.365,.977,.545)],.007,darkmetal,'Steering')
    path('MirrorStem',[(side*.25,1.015,.49),(side*.27,1.105,.49),(side*.36,1.19,.48)],.008,black,'Steering')
    box('MirrorHousing',(side*.37,1.215,.475),(.135,.075,.035),black,'Steering',.02)
    box('MirrorGlass',(side*.37,1.215,.454),(.11,.053,.005),steel,'Steering',.014)
box('InstrumentHousing',(0,1.065,.465),(.16,.055,.10),black,'Steering',.018)
box('InstrumentGlass',(0,1.097,.46),(.12,.006,.067),darkmetal,'Steering',.009)
path('ControlCable',[(.23,.98,.48),(.18,.92,.40),(0,.91,.44),(-.08,.95,.47)],.0045,black,'Steering',6)

# Recalculate normals and join by material per animated part to keep draw calls bounded.
for o in list(bpy.data.objects):
    if o.type=='MESH':
        bpy.context.view_layer.objects.active=o;o.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
for part,g in groups.items():
    for matname,(mat,_) in materials.items():
        objects=[o for o in list(g.children) if o.type=='MESH' and o.active_material==mat]
        if not objects:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
        o=bpy.context.object;o.name=part+'_'+matname

# Export exact Blender meshes for synchronous use with the existing game factory.
# The companion GLB remains available for other engines and future asset pipelines.
data={'materials':{n:props for n,(_,props) in materials.items()},'parts':[]}
triangles=0
for name,g in groups.items():
    part={'name':name,'parent':g.parent.name if g.parent else None,'position':[round(v,6) for v in (g.location.x,g.location.z,-g.location.y)],'meshes':[]}
    for o in g.children:
        if o.type!='MESH':continue
        deps=bpy.context.evaluated_depsgraph_get();evaluated=o.evaluated_get(deps);m=evaluated.to_mesh();m.calc_loop_triangles()
        transform=g.matrix_world.inverted()@o.matrix_world;normal=transform.to_3x3().inverted().transposed()
        positions=[];normals=[];indices=[];unique={}
        for tri in m.loop_triangles:
            n=(normal@tri.normal).normalized()
            for vi in tri.vertices:
                v=transform@m.vertices[vi].co
                key=tuple(round(c,6) for c in (v.x,v.z,-v.y,n.x,n.z,-n.y))
                if key not in unique:
                    unique[key]=len(positions)//3;positions.extend(key[:3]);normals.extend(key[3:])
                indices.append(unique[key])
        triangles+=len(m.loop_triangles)
        part['meshes'].append({'material':o.active_material.name,'positions':positions,'normals':normals,'indices':indices})
        evaluated.to_mesh_clear()
    data['parts'].append(part)
generated=ROOT/'src'/'assets';generated.mkdir(exist_ok=True)
(generated/'pop110-model.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
scene=bpy.context.scene
scene['Reference']='User supplied blue low-poly Pop 110. No lettering or logos.'
scene['Game axes']='Blender X = game X; Blender Y = -game Z; Blender Z = game Y.'
scene['Triangle count']=triangles
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(PUBLIC/'pop110.glb'),export_format='GLB',use_selection=True,export_yup=True)

# Studio preview objects are kept in a separate collection and excluded from exports.
studio=bpy.data.collections.new('PreviewStudio');scene.collection.children.link(studio)
def studio_object(o):
    for coll in list(o.users_collection):coll.objects.unlink(o)
    studio.objects.link(o)
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='PreviewGround';floor.data.materials.append(material('PreviewGround','9b9a91',.95));studio_object(floor)
world=bpy.data.worlds.new('StudioWorld');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.23,.28,.35,1);world.node_tree.nodes['Background'].inputs[1].default_value=.55
for name,pos,power,size in [('Key',(3,-4,5),550,4),('Fill',(-3,-1,3),380,3),('Rim',(1,4,4),650,3)]:
    light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size;o=bpy.data.objects.new(name,light);studio.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.55))-o.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('PreviewCamera');cam=bpy.data.objects.new('PreviewCamera',camdata);studio.objects.link(cam);scene.camera=cam
cam.location=xyz((3.2,1.55,2.6));cam.rotation_euler=(xyz((0,.62,0))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=2.65
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'pop110-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'pop110.blend'))
print('POP_EXPORT',json.dumps({'triangles':triangles,'parts':len(data['parts']),'drawCalls':sum(len(p['meshes']) for p in data['parts'])}))
bpy.ops.render.render(write_still=True)
