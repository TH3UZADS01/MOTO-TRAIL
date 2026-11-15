"""Unbranded classic Cub, authored in Blender from the user's red/cream reference.
Reuses the Pop mesh primitives/export pipeline; separate animated groups, metres.
"""
from pathlib import Path
source=Path(__file__).with_name('build_pop_blender.py').read_text(encoding='utf-8')
helpers=source.split("wheel('RearWheel',-.619,.285)")[0]
helpers=helpers.replace("'pop110'","'cub'").replace("'202e76'","'c71923'").replace("'34383b'","'b6b6af'")
helpers=helpers.replace('.619','.61').replace('(0,.285,-.61)','(0,.295,-.61)').replace('(0,.305,.61)','(0,.295,.61)')
exec(compile(helpers,str(__file__),'exec'))
cream=material('Cream','e5dfcc',.65)
seatSide=material('SeatSide','bcb8a9',.85)

# Narrow tyres, silver rims and crossed spokes around drum hubs.
for part,z in [('RearWheel',-.61),('FrontWheel',.61)]:
    torus('Tire',(0,.295,z),.255,.04,rubber,part,36)
    torus('Rim',(0,.295,z),.223,.014,alloy,part,36)
    bar('DrumHub',(-.052,.295,z),(.052,.295,z),.065,darkmetal,part,12)
    for side in [-1,1]:
        for i in range(18):
            a=i*math.tau/18+(side+1)*math.pi/36;b=a+side*.32
            bar('Spoke',(side*.035,.295+math.cos(a)*.05,z+math.sin(a)*.05),(side*.012,.295+math.cos(b)*.222,z+math.sin(b)*.222),.0032,steel,part,5)
    bar('Axle',(-.085,.295,z),(.085,.295,z),.014,steel,part,8)

# Pressed steel rear body flowing down into the low step-through frame.
loft('RearPressedBody',[(-.85,.57,.70,.10),(-.67,.48,.75,.145),(-.42,.37,.73,.16),(-.17,.34,.68,.13),(.01,.34,.51,.095),(.14,.35,.44,.085)],paint)
profile('StepFrame',[(-.17,.39),(.13,.37),(.34,.58),(.43,.93),(.50,.96),(.45,.53),(.23,.29),(-.06,.29)],.15,paint)
# Long two-tone bench and central retaining strap; no lettering.
rows=[(-.86,.73,.825,.125),(-.73,.73,.84,.172),(-.41,.72,.83,.18),(-.12,.71,.81,.16),(.00,.71,.79,.115)]
loft('SeatSkirt',rows,seatSide)
loft('SeatCushion',[(z,hi-.012,hi+.045,w) for z,lo,hi,w in rows],seat)
box('SeatStrap',(0,.863,-.46),(.355,.009,.027),black,bevel=.003)
for side in [-1,1]:
    box('SeatStrapSide',(side*.18,.795,-.46),(.007,.12,.027),black,bevel=.002)
    # Cream side covers follow a faceted oval outline.
    outline=[(-.47,.50),(-.45,.59),(-.36,.62),(-.23,.59),(-.19,.52),(-.23,.41),(-.39,.41)]
    verts=[(side*.155,y,z) for z,y in outline]+[(side*.185,.52,-.33)]
    mesh('SideCover',verts,[(i,(i+1)%7,7) for i in range(7)],cream)
    bar('Swingarm',(side*.10,.30,-.03),(side*.10,.295,-.61),.028,paint,'RearSuspension')
    bar('RearShockChrome',(side*.17,.33,-.61),(side*.17,.61,-.49),.019,steel,'RearSuspension')
    bar('RearShockShroud',(side*.17,.54,-.52),(side*.17,.73,-.44),.030,paint,'RearSuspension')
    bar('RearShockLower',(side*.17,.30,-.62),(side*.17,.40,-.58),.025,paint,'RearSuspension')
    for y,z in [(.73,-.44),(.30,-.62)]:bar('ShockBolt',(side*.17,y,z),(side*.20,y,z),.016,steel,'RearSuspension',8)
    bar('RiderPeg',(side*.10,.26,.01),(side*.25,.26,.01),.021,rubber)
    bar('PassengerPeg',(side*.12,.35,-.38),(side*.23,.35,-.38),.019,rubber)

# Sculpted leg shield: wide upper wings taper around the engine; open riding side.
# Separate left/right shells avoid a solid slab filling the step-through space.
for side in [-1,1]:
    rows=[(.15,.245,.09),(.30,.34,.14),(.39,.53,.205),(.43,.73,.205),(.43,.91,.13),(.41,.965,.085)]
    verts=[]
    for z,y,w in rows:
        verts.extend([(side*.045,y,z+.018),(side*w,y,z),(side*(w+.012),y,z-.055)])
    faces=[]
    for i in range(len(rows)-1):
        faces.extend([(i*3,i*3+1,(i+1)*3+1,(i+1)*3),(i*3+1,i*3+2,(i+1)*3+2,(i+1)*3+1)])
    o=mesh('LegShield',verts,faces,cream)
    mod=o.modifiers.new('Shell thickness','SOLIDIFY');mod.thickness=.014
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    # Upper shield curls toward the low central step, characteristic of the Cub.
    mesh('InnerShield',[(side*.065,.43,.11),(side*.17,.44,.23),(side*.205,.53,.39),(side*.205,.73,.43),(side*.12,.63,.28)],[(0,1,4),(1,2,3,4)],cream)

# Exposed horizontal engine and long narrow chrome exhaust.
loft('EngineCrankcase',[(-.12,.22,.40,.09),(-.04,.20,.42,.12),(.10,.22,.40,.115),(.17,.24,.35,.08)],engine)
for side in [-1,1]:
    bar('EngineCover',(side*.10,.31,.015),(side*.145,.31,.015),.082,engine,vertices=12)
    bar('CoverInset',(side*.145,.31,.015),(side*.154,.31,.015),.058,steel,vertices=12)
box('CylinderCore',(0,.31,.20),(.14,.12,.16),darkmetal,bevel=.008)
for i in range(6):box('CoolingFin',(0,.31,.13+i*.022),(.16,.14,.008),engine,bevel=.002)
path('ExhaustHeader',[(.07,.265,.25),(.15,.19,.18),(.20,.19,-.02),(.22,.22,-.18)],.017,steel)
bar('LongSilencer',(.22,.22,-.13),(.22,.31,-.88),.041,steel,vertices=8,r2=.048)
bar('SilencerOutlet',(.22,.31,-.88),(.22,.314,-.91),.024,darkmetal,vertices=10)
path('BrakePedal',[(.15,.26,.02),(.22,.23,.12),(.27,.23,.15)],.008,steel)
path('GearLever',[(-.13,.27,.02),(-.21,.27,.14),(-.25,.27,.14)],.009,darkmetal)
bar('FoldedStand',(-.12,.23,-.03),(-.15,.24,-.36),.011,black)

exec(compile(source[source.index('def fender('):source.index("fender('FrontFender'")],str(__file__),'exec'))
fender('FrontFender',.61,.295,.34,.085,paint,'FrontSuspension',1.15)
fender('RearFender',-.61,.295,.345,.09,paint,'Body',1.05)
profile('RearMudflap',[(-.84,.54),(-.91,.39),(-.88,.35),(-.81,.50)],.13,black)
box('TailHousing',(0,.67,-.89),(.19,.073,.065),black,bevel=.009)
box('TailLamp',(0,.675,-.928),(.16,.05,.015),red,bevel=.006)
for side in [-1,1]:
    bar('RearSignalStem',(side*.07,.665,-.86),(side*.17,.665,-.86),.010,black)
    box('RearSignal',(side*.18,.665,-.87),(.055,.043,.06),amber,bevel=.008)
    # Enclosed leading-link fork with pressed metal covers, not telescopic CG forks.
    a=(side*.072,.30,.61);b=(side*.072,.96,.43)
    bar('ForkCover',a,b,.037,paint,'FrontSuspension',8,r2=.045)
    bar('LeadingLink',(side*.072,.30,.61),(side*.072,.35,.48),.024,paint,'FrontSuspension',8)
    for y,z in [(.30,.61),(.61,.525),(.79,.475)]:bar('ForkBolt',(side*.10,y,z),(side*.12,y,z),.013,steel,'FrontSuspension',8)

# Painted handlebar shell, round chrome lamp and faceted mirrors.
loft('HeadlightShell',[(.40,.91,1.09,.09),(.49,.91,1.10,.12),(.62,.95,1.075,.10),(.69,.96,1.06,.075)],paint,'Steering')
bar('ChromeLampRing',(0,1.01,.68),(0,1.01,.706),.097,steel,'Steering',12)
verts=[(0,1.01,.72)]+[(math.cos(i*math.tau/12)*.083,1.01+math.sin(i*math.tau/12)*.083,.708) for i in range(12)]
mesh('HeadlampLens',verts,[(0,i+1,(i+1)%12+1) for i in range(12)],lens,'Steering')
for side in [-1,1]:
    path('HandlebarShell',[(0,1.045,.46),(side*.15,1.045,.46),(side*.23,1.02,.49)],.035,paint,'Steering')
    bar('Grip',(side*.25,1.02,.49),(side*.36,1.02,.49),.023,rubber,'Steering',10)
    box('Switch',(side*.235,1.025,.49),(.04,.045,.055),steel,'Steering',.006)
    path('Lever',[(side*.23,1.015,.52),(side*.28,1.0,.55),(side*.36,1.0,.54)],.007,steel,'Steering')
    box('FrontSignal',(side*.15,1.0,.60),(.06,.045,.05),amber,'Steering',.007)
    path('MirrorStem',[(side*.24,1.04,.48),(side*.25,1.14,.48),(side*.35,1.22,.47)],.008,black,'Steering')
    box('Mirror',(side*.37,1.245,.47),(.14,.085,.035),black,'Steering',.025)
    box('MirrorGlass',(side*.37,1.245,.448),(.11,.058,.005),steel,'Steering',.017)
box('InstrumentBezel',(0,1.107,.46),(.12,.012,.075),steel,'Steering',.012)
box('InstrumentGlass',(0,1.115,.46),(.10,.005,.055),darkmetal,'Steering',.010)

export=source[source.index('# Recalculate normals'):].replace('pop110','cub').replace('blue low-poly Pop 110','red and cream classic Cub').replace('POP_EXPORT','CUB_EXPORT')
export=export.replace('scene.cycles.samples=24',"scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.render.threads_mode='FIXED';scene.render.threads=4")
export=export.replace('resolution_percentage=100','resolution_percentage=75')
exec(compile(export,str(__file__),'exec'))
