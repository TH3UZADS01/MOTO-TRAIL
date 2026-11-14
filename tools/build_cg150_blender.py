"""CG 150 reference model. Reuses the Pop authoring primitives and export pipeline.
Run with Blender --background --factory-startup --python tools/build_cg150_blender.py.
The source reference is deliberately unbranded; all dimensions are in metres.
"""
from pathlib import Path
source=(Path(__file__).with_name('build_pop_blender.py')).read_text(encoding='utf-8')
helpers=source.split("wheel('RearWheel',-.619,.285)")[0]
helpers=helpers.replace("'pop110'","'cg150'").replace("'202e76'","'17191c'").replace("'34383b'","'b3b8bb'")
helpers=helpers.replace('.619','.66').replace("(0,.285,-.66)","(0,.315,-.66)").replace("(0,.305,.66)","(0,.315,.66)")
exec(compile(helpers,str(__file__),'exec'))

# Slim silver cast wheels with eight spokes, as in the supplied image.
for part,z in [('RearWheel',-.66),('FrontWheel',.66)]:
    r=.315
    torus('Tire',(0,r,z),.268,.047,rubber,part,40)
    torus('SilverRim',(0,r,z),.236,.018,alloy,part,40)
    for x in [-.034,.034]:torus('RimEdge',(x,r,z),.238,.006,steel,part,40)
    bar('DrumHub',(-.058,r,z),(.058,r,z),.086,engine,part,16)
    for i in range(8):
        a=i*math.tau/8
        bar('CastSpoke',(0,r+math.cos(a)*.07,z+math.sin(a)*.07),(0,r+math.cos(a+.08)*.234,z+math.sin(a+.08)*.234),.0105,alloy,part,6)
    bar('Axle',(-.10,r,z),(.10,r,z),.014,steel,part,10)

# Frame triangle, rear swingarm, twin external springs and foot controls.
for side in [-1,1]:
    x=side*.105
    path('Frame',[(x,.38,-.15),(x,.76,-.53),(x,.78,.02),(x,.96,.40),(x,.36,.23),(x,.30,-.05),(x,.38,-.15)],.025,black)
    bar('SeatRail',(x,.76,-.53),(x,.87,-.83),.022,black)
    bar('Swingarm',(x,.36,-.08),(x,.315,-.66),.025,black,'RearSuspension')
    a=Vector((side*.17,.34,-.64));b=Vector((side*.17,.76,-.42))
    bar('ShockBody',a,b,.023,darkmetal,'RearSuspension')
    bar('ShockChrome',a,a.lerp(b,.45),.019,steel,'RearSuspension')
    axis=(b-a).normalized();u=Vector((1,0,0));v=axis.cross(u).normalized()
    points=[tuple(a.lerp(b,.28+.64*i/72)+(u*math.cos(i/72*math.tau*8)+v*math.sin(i/72*math.tau*8))*.032) for i in range(73)]
    path('Spring',points,.006,steel,'RearSuspension',6)
    bar('ShockTopBolt',(side*.17,.76,-.42),(side*.20,.76,-.42),.023,steel,'RearSuspension',8)
    bar('Footpeg',(side*.12,.30,-.04),(side*.27,.30,-.04),.023,rubber)
    path('PassengerBracket',[(x,.59,-.35),(side*.18,.38,-.32),(x,.43,-.10)],.012,steel)
    bar('PassengerPeg',(side*.17,.39,-.32),(side*.24,.39,-.32),.018,rubber)
    path('GrabRail',[(side*.15,.83,-.63),(side*.16,.91,-.83),(side*.12,.92,-.90)],.012,steel)
bar('RearGrabRail',(-.12,.92,-.90),(.12,.92,-.90),.012,steel)

# Full teardrop tank: broad shoulders, narrow saddle junction and low curved sides.
loft('Tank',[(-.18,.72,.85,.105),(-.08,.69,.96,.18),(.12,.68,1.035,.225),(.29,.73,1.04,.205),(.42,.82,.96,.125),(.46,.86,.92,.075)],paint)
bar('FuelCap',(0,1.043,.20),(0,1.054,.20),.047,steel,vertices=12)
loft('Seat',[(-.91,.82,.90,.12),(-.78,.81,.915,.17),(-.54,.77,.875,.185),(-.30,.755,.825,.17),(-.17,.76,.825,.125),(-.10,.78,.835,.09)],seat)
loft('TailFairing',[(-.93,.745,.83,.10),(-.79,.74,.83,.15),(-.57,.69,.79,.165),(-.35,.69,.77,.15)],paint)
for side in [-1,1]:
    mesh('SidePanel',[(side*.16,.75,-.49),(side*.18,.73,-.14),(side*.13,.64,.00),(side*.11,.47,-.23),(side*.13,.60,-.43),(side*.19,.68,-.28)],[(0,1,5),(1,2,3,5),(3,4,5),(4,0,5)],paint)

# Vertical air-cooled single-cylinder engine, crankcase and external fasteners.
loft('Crankcase',[(-.20,.30,.45,.09),(-.12,.26,.50,.14),(.07,.27,.49,.15),(.17,.32,.45,.11)],engine)
for side in [-1,1]:
    bar('EngineCover',(side*.12,.38,-.035),(side*.17,.38,-.035),.108,engine,vertices=12)
    bar('CoverFace',(side*.17,.38,-.035),(side*.181,.38,-.035),.085,steel,vertices=12)
    for i in range(6):
        a=i*math.tau/6
        bar('CoverBolt',(side*.17,.38+math.cos(a)*.089,-.035+math.sin(a)*.089),(side*.187,.38+math.cos(a)*.089,-.035+math.sin(a)*.089),.007,darkmetal,vertices=6)
box('CylinderCore',(0,.56,.13),(.17,.24,.145),darkmetal,bevel=.012)
for i in range(9):box('CoolingFin',(0,.45+i*.025,.10+i*.006),(.215,.009,.18),engine,bevel=.004)
box('CylinderHead',(0,.704,.155),(.20,.072,.18),engine,bevel=.019)
box('ValveCover',(0,.75,.15),(.16,.03,.14),darkmetal,bevel=.011)
path('Intake',[(0,.64,.04),(0,.64,-.09),(0,.70,-.12)],.026,darkmetal)
path('ExhaustHeader',[(.08,.63,.23),(.15,.58,.31),(.20,.43,.30),(.21,.27,.17),(.22,.245,-.04),(.23,.29,-.32)],.023,steel)
bar('ExhaustBody',(.23,.29,-.28),(.23,.43,-.91),.058,black,vertices=10,r2=.047)
bar('SilverHeatShield',(.258,.305,-.29),(.258,.448,-.87),.047,steel,vertices=6,r2=.052)
bar('ExhaustOutlet',(.23,.43,-.91),(.23,.438,-.95),.033,darkmetal,vertices=10)
bar('ExhaustHole',(.23,.438,-.95),(.23,.440,-.953),.023,rubber,vertices=10)
for y,z in [(.33,-.39),(.42,-.77)]:bar('ShieldBolt',(.30,y,z),(.313,y,z),.008,darkmetal,vertices=6)
path('BrakePedal',[(.16,.30,-.04),(.23,.27,.08),(.27,.28,.14)],.009,steel)
path('GearPedal',[(-.17,.32,-.05),(-.21,.29,.11),(-.26,.29,.11)],.009,steel)
bar('FoldedStand',(-.13,.28,-.08),(-.18,.29,-.43),.012,black)

fender_source=source[source.index('def fender('):source.index("fender('FrontFender'")]
exec(compile(fender_source,str(__file__),'exec'))
fender('FrontFender',.66,.315,.369,.085,paint,'FrontSuspension',1.04)
fender('RearInnerFender',-.66,.315,.357,.075,black,'RearSuspension',.7)
profile('RearMudguard',[(-.85,.79),(-.93,.72),(-1.02,.46),(-.95,.44),(-.81,.70)],.13,black)
box('TailHousing',(0,.806,-.922),(.21,.077,.065),black,bevel=.012)
box('TailLamp',(0,.81,-.96),(.175,.056,.015),red,bevel=.008)
for side in [-1,1]:
    bar('RearSignalStem',(side*.09,.72,-.87),(side*.21,.72,-.87),.011,black)
    box('RearSignal',(side*.22,.72,-.89),(.055,.042,.07),amber,bevel=.008)
    x=side*.085
    bar('ForkStanchion',(x,.48,.62),(x,1.02,.46),.020,steel,'FrontSuspension',12)
    bar('ForkSlider',(x,.315,.66),(x,.55,.59),.028,engine,'FrontSuspension',12)
    bar('AxleBolt',(x,.315,.66),(side*.11,.315,.66),.017,steel,'FrontSuspension',8)
    box('ForkClamp',(x,.63,.567),(.065,.045,.065),black,'FrontSuspension',.008)
bar('LowerTripleClamp',(-.11,.87,.505),(.11,.87,.505),.026,black,'FrontSuspension')

# Circular faceted headlight and separate instrument pod; bars match rider grip anchors.
bar('HeadlampBucket',(0,1.01,.53),(0,1.01,.69),.125,black,'Steering',16,r2=.14)
bar('HeadlampRim',(0,1.01,.69),(0,1.01,.71),.143,darkmetal,'Steering',16)
verts=[(0,1.01,.727)]+[(math.cos(i*math.tau/16)*.126,1.01+math.sin(i*math.tau/16)*.126,.715) for i in range(16)]
mesh('HeadlampLens',verts,[(0,i+1,(i+1)%16+1) for i in range(16)],lens,'Steering')
box('InstrumentPod',(0,1.17,.49),(.25,.14,.14),black,'Steering',.036)
box('InstrumentGlass',(0,1.243,.47),(.18,.006,.085),darkmetal,'Steering',.012)
for side in [-1,1]:
    bar('SignalStem',(side*.10,1.0,.60),(side*.20,1.0,.60),.013,black,'Steering')
    box('FrontSignal',(side*.215,1.0,.62),(.065,.052,.057),amber,'Steering',.006)
    path('Handlebar',[(0,1.06,.46),(side*.13,1.08,.48),(side*.23,1.12,.54),(side*.36,1.12,.54)],.016,steel,'Steering')
    bar('Grip',(side*.26,1.12,.54),(side*.36,1.12,.54),.024,rubber,'Steering',12)
    box('Switch',(side*.24,1.12,.54),(.041,.051,.06),black,'Steering',.008)
    path('Lever',[(side*.24,1.11,.57),(side*.29,1.10,.60),(side*.37,1.10,.585)],.007,darkmetal,'Steering')
    path('MirrorStem',[(side*.25,1.14,.54),(side*.27,1.25,.54),(side*.37,1.35,.53)],.009,black,'Steering')
    box('Mirror',(side*.39,1.375,.525),(.145,.092,.042),black,'Steering',.027)
    box('MirrorGlass',(side*.39,1.375,.499),(.115,.065,.006),steel,'Steering',.019)
    path('ControlCable',[(side*.23,1.10,.53),(side*.19,1.02,.41),(side*.07,.96,.43)],.004,black,'Steering',6)

export=source[source.index('# Recalculate normals'):]
export=export.replace('pop110','cg150').replace('blue low-poly Pop 110','black low-poly CG 150').replace('POP_EXPORT','CG_EXPORT')
export=export.replace('xyz((3.2,1.55,2.6))','xyz((3.2,1.65,2.6))').replace('ortho_scale=2.65','ortho_scale=2.8')
export=export.replace("scene.cycles.samples=24","scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.render.threads_mode='FIXED';scene.render.threads=4")
export=export.replace('resolution_percentage=100','resolution_percentage=75')
exec(compile(export,str(__file__),'exec'))
