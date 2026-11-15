"""Classic NX350 Sahara, reference-inspired unbranded Blender model (metres)."""
from pathlib import Path
source=Path(__file__).with_name('build_pop_blender.py').read_text(encoding='utf-8')
helpers=source.split("wheel('RearWheel',-.619,.285)")[0]
helpers=helpers.replace("'pop110'","'sahara'").replace("'202e76'","'c91e2c'").replace("'34383b'","'a7adae'")
helpers=helpers.replace('.619','.698').replace('(0,.285,-.698)','(0,.33,-.698)').replace('(0,.305,.698)','(0,.343,.698)')
exec(compile(helpers,str(__file__),'exec'))
white=material('Ivory','e7e5dc',.48)
blue=material('BlueGraphics','27317d',.5)
blueSeat=material('BlueSeat','262e69',.9)
screen=material('Windshield','293137',.85,0)

# 21-inch front/17-inch rear proportions, with the simplified spokes of the reference.
for part,z,r,rim in [('RearWheel',-.698,.33,.216),('FrontWheel',.698,.343,.267)]:
    torus('TrailTire',(0,r,z),r-.044,.044,rubber,part,32)
    torus('SilverRim',(0,r,z),rim,.015,alloy,part,32)
    bar('Hub',(-.055,r,z),(.055,r,z),.070,darkmetal,part,12)
    for i in range(10):
        a=i*math.tau/10
        bar('Spoke',(0,r+math.cos(a)*.05,z+math.sin(a)*.05),(0,r+math.cos(a+.05)*rim,z+math.sin(a+.05)*rim),.009,alloy,part,6)
    for i in range(24):
        a=i*math.tau/24
        o=box('Tread',(0,r+math.cos(a)*(r-.003),z+math.sin(a)*(r-.003)),(.06,.008,.024),rubber,part)
        o.rotation_euler.x=-a
    bar('Axle',(-.10,r,z),(.10,r,z),.015,steel,part,8)
    if part=='FrontWheel':
        torus('BrakeDisc',(-.055,r,z),.105,.022,engine,part,24)

# Tall cradle and central Pro-Link-style shock; no twin exposed rear shocks.
for side in [-1,1]:
    x=side*.11
    path('Frame',[(x,.32,-.17),(x,.79,-.49),(x,.86,-.06),(x,1.02,.42),(x,.36,.27),(x,.28,.04),(x,.32,-.17)],.026,black)
    bar('Swingarm',(x,.38,-.04),(x,.33,-.698),.035,engine,'RearSuspension',6)
    bar('SeatRail',(x,.81,-.39),(x,.91,-.88),.021,black)
    bar('Footpeg',(side*.13,.33,-.03),(side*.27,.33,-.03),.025,rubber)
    bar('PassengerPeg',(side*.12,.47,-.39),(side*.24,.47,-.39),.021,rubber)
bar('Monoshock',(0,.39,-.30),(0,.77,-.15),.030,steel,'RearSuspension')
for i in range(11):
    torus('SpringCoil',(0,.47+i*.021,-.27+i*.008),.034,.006,black,'RearSuspension',12).rotation_euler=(0,0,0)
loft('Crankcase',[(-.17,.28,.48,.11),(-.08,.26,.53,.16),(.09,.28,.50,.16),(.19,.33,.47,.10)],darkmetal)
bar('EngineCover',(.14,.40,-.03),(.185,.40,-.03),.106,engine,vertices=10)
box('Cylinder',(0,.61,.13),(.20,.28,.18),black,bevel=.015)
for i in range(9):box('EngineFin',(0,.49+i*.027,.10+i*.006),(.235,.012,.20),darkmetal,bevel=.004)
box('Head',(0,.76,.16),(.22,.075,.19),engine,bevel=.014)
box('OilCooler',(0,.87,.35),(.23,.16,.05),black,bevel=.008)
for i in range(6):bar('CoolerFin',(-.11,.81+i*.025,.38),(.11,.81+i*.025,.38),.004,darkmetal)
path('ExhaustHeader',[(.09,.68,.25),(.18,.61,.32),(.21,.36,.23),(.22,.32,-.03),(.24,.58,-.34),(.24,.72,-.52)],.024,darkmetal)
bar('HighSilencer',(.24,.69,-.45),(.24,.81,-.96),.065,steel,vertices=8)
bar('SilencerCap',(.24,.81,-.96),(.24,.82,-1.00),.05,black,vertices=8)
profile('SkidPlate',[(-.16,.28),(.10,.24),(.25,.31),(.28,.40),(.23,.40),(.19,.31),(-.16,.30)],.29,engine)
for z in [.01,.08,.15]:box('SkidVent',(.148,.30,z),(.008,.033,.027),black,bevel=.008)
bar('FoldedStand',(-.14,.28,-.08),(-.18,.29,-.44),.012,black)

# Continuous blue saddle, high tail and broad white tank/fairing with red/blue inlays.
loft('Tank',[(-.17,.67,.86,.12),(.03,.62,1.00,.16),(.24,.66,1.09,.16),(.43,.80,1.12,.12),(.51,.91,1.10,.12)],white)
loft('Saddle',[(-.88,.85,.93,.12),(-.69,.83,.94,.165),(-.35,.79,.88,.175),(-.12,.80,.88,.14),(.02,.86,.94,.10)],blueSeat)
loft('Tail',[(-1.01,.84,.96,.09),(-.84,.78,.89,.155),(-.54,.71,.84,.17),(-.34,.68,.81,.15)],paint)
for side in [-1,1]:
    # Side panels are independent surfaces, rather than text decals or textures.
    mesh('SidePanel',[(side*.17,.80,-.75),(side*.18,.79,-.34),(side*.14,.69,-.12),(side*.12,.51,-.31),(side*.17,.63,-.70)],[(0,1,2,3,4)],white)
    mesh('TailRed',[(side*.176,.80,-.80),(side*.186,.79,-.43),(side*.17,.67,-.48),(side*.176,.70,-.77)],[(0,1,2,3)],paint)
    mesh('TailBlue',[(side*.18,.70,-.77),(side*.174,.67,-.48),(side*.155,.60,-.42),(side*.173,.64,-.70)],[(0,1,2,3)],blue)
    for z in [-.23,-.30]:bar('SideVent',(side*.151,.58,z),(side*.18,.72,z+.05),.014,black)
    mesh('FrontFairing',[(side*.19,1.08,.22),(side*.22,1.06,.47),(side*.19,.89,.57),(side*.16,.57,.27),(side*.19,.60,.10),(side*.245,.86,.14)],[(0,1,2,5),(2,3,4,5),(5,4,0)],white)
    mesh('RedFairing',[(side*.249,.99,.19),(side*.226,1.00,.43),(side*.199,.86,.51),(side*.171,.62,.26),(side*.199,.65,.13)],[(0,1,2,3,4)],paint)
    mesh('BlueStripe',[(side*.196,1.085,.22),(side*.226,1.065,.47),(side*.230,.99,.45),(side*.251,1.00,.19)],[(0,1,2,3)],blue)
    bar('FairingVent',(side*.201,.67,.30),(side*.220,.88,.43),.014,black)
    box('FrontSignal',(side*.25,1.02,.50),(.055,.05,.07),amber,bevel=.006)
    box('RearSignal',(side*.19,.84,-.94),(.055,.05,.07),amber,bevel=.006)
box('TailHousing',(0,.85,-1.005),(.21,.07,.055),black,bevel=.009)
box('TailLamp',(0,.85,-1.038),(.17,.05,.015),red,bevel=.006)
profile('Mudflap',[(-.92,.83),(-1.02,.70),(-1.05,.51),(-.98,.51),(-.86,.76)],.13,black)

# Fixed rally cockpit/fairing; only the forks and handlebars steer.
loft('Cockpit',[(.40,1.00,1.28,.12),(.58,1.01,1.23,.17),(.71,1.04,1.19,.115)],white)
for side in [-1,1]:
    mesh('CockpitRed',[(side*.125,1.26,.42),(side*.172,1.20,.58),(side*.173,1.08,.60),(side*.13,1.12,.44)],[(0,1,2,3)],paint)
    mesh('CockpitBlue',[(side*.13,1.27,.41),(side*.14,1.25,.43),(side*.137,1.12,.44),(side*.12,1.13,.41)],[(0,1,2,3)],blue)
box('HeadlampRim',(0,1.115,.72),(.19,.18,.026),steel,bevel=.014)
box('HeadlampLens',(0,1.115,.739),(.155,.145,.012),lens,bevel=.012)
mesh('Windshield',[(-.13,1.23,.59),(.13,1.23,.59),(.105,1.47,.43),(.06,1.51,.40),(-.075,1.50,.40),(-.12,1.40,.45),(0,1.36,.52)],[(0,1,6),(1,2,6),(2,3,6),(3,4,6),(4,5,6),(5,0,6)],screen)
exec(compile(source[source.index('def fender('):source.index("fender('FrontFender'")],str(__file__),'exec'))
fender('FrontFender',.698,.343,.405,.10,white,'FrontSuspension',1.0)
fender('RearInnerFender',-.698,.33,.38,.08,black,'RearSuspension',.75)
for side in [-1,1]:
    x=side*.085
    bar('ForkSlider',(x,.343,.698),(x,.62,.61),.032,engine,'FrontSuspension',8)
    bar('ForkTube',(x,.56,.63),(x,1.12,.47),.023,steel,'FrontSuspension',12)
    bar('ForkGaiter',(x,.73,.58),(x,1.10,.48),.033,black,'FrontSuspension',10)
    path('Handlebar',[(0,1.10,.46),(side*.15,1.12,.49),(side*.25,1.12,.578),(side*.38,1.12,.578)],.017,darkmetal,'Steering')
    bar('Grip',(side*.26,1.12,.578),(side*.37,1.12,.578),.025,rubber,'Steering',10)
    box('Handguard',(side*.30,1.12,.63),(.17,.075,.045),white,'Steering',.012)
    path('MirrorStem',[(side*.25,1.15,.57),(side*.27,1.28,.57),(side*.36,1.36,.54)],.008,black,'Steering')
    box('Mirror',(side*.38,1.38,.54),(.14,.09,.04),black,'Steering',.025)
    box('MirrorGlass',(side*.38,1.38,.516),(.11,.06,.005),steel,'Steering',.018)
box('Instruments',(0,1.15,.39),(.24,.08,.12),black,bevel=.018)

export=source[source.index('# Recalculate normals'):].replace('pop110','sahara').replace('blue low-poly Pop 110','classic NX350 Sahara').replace('POP_EXPORT','SAHARA_EXPORT')
export=export.replace('scene.cycles.samples=24',"scene.cycles.samples=48;scene.cycles.use_denoising=False;scene.render.threads_mode='FIXED';scene.render.threads=4")
export=export.replace('resolution_percentage=100','resolution_percentage=75').replace('ortho_scale=2.65','ortho_scale=2.9')
exec(compile(export,str(__file__),'exec'))
