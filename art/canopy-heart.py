"""Sculpt Canopy Heart and render eight software views from the same geometry."""
import json
import math
import struct
import sys
from pathlib import Path

import numpy as np
from scipy.interpolate import CubicSpline

ART = Path(__file__).resolve().parent
sys.path.insert(0, str(ART / 'creatures'))
from build import Sculpt, RASTER, rgb, unit
from export import export

TAU = math.tau
rng = np.random.default_rng(7391)
m = Sculpt()


def shoot(points, radii, color, group='living xylem', steps=19, sides=11, ribs=4):
    m.strand(points, radii, color, steps=steps, sides=sides, rough=.71, group=group, ribs=ribs)


def lance(root, end, width, curl, tone, group='canopy blades'):
    """A swept simple leaf with a raised midrib and rippled margins."""
    root, end = np.array(root), np.array(end)
    span = end-root
    side = unit(np.cross(span, [0, 0, 1]))
    face = unit(np.cross(side, span))
    surface, colors = [], []
    for t in np.linspace(0,1,8):
        envelope = max(.004, math.sin(math.pi*t)**.74)
        center = root + span*t + face*math.sin(math.pi*t)*curl
        line, tint = [], []
        for fraction in [-1,-.45,0,.45,1]:
            crease = (1-abs(fraction))**1.6
            offset = side*width*fraction*envelope + face * width*envelope*(crease*.28 + .07*math.cos(TAU*t*2)*abs(fraction))
            line.append(center+offset)
            hue=rgb(tone)*(.64+.27*t+.13*math.cos(t*11+fraction*4))
            tint.append(hue*(1-crease*.28) + rgb('dcde91')*crease*.28)
        surface.append(line)
        colors.append(tint)
    m.grid(np.array(surface),np.array(colors),.52,group,closed=False)


def arch(points, sizes, offset, hue):
    points = np.array(points,float)
    u = np.linspace(0,1,len(points))
    c = CubicSpline(u, points)
    t = np.linspace(0,1,39)
    path = c(t)
    axial = unit(c(t,1))
    lateral = unit(np.cross(axial,[0,0,1]))
    normal = unit(np.cross(axial,lateral))
    angle = np.arange(18)[None,:]*TAU/18
    rings = np.interp(t,u,sizes)[:,None]
    flutes = np.cos(angle*6+.8*np.sin(t[:,None]*6+offset))
    uneven = 1+flutes*.12+.035*np.cos(3*angle-t[:,None]*5)
    radial = lateral[:,None]*np.cos(angle)[...,None]+normal[:,None]*np.sin(angle)[...,None]
    outer = radial*(rings*uneven)[...,None]
    pigment=(.80+.16*flutes+.12*np.sin(t[:,None]*11+offset))[:,:,None]*rgb(hue)
    m.grid(path[:,None,:]+outer,pigment,.79,'living xylem',outward=outer)
    for j in (2,8,16):
        trace = path+outer[:,j]*1.005
        rr = np.maximum(.035,rings[:,0]*(.043+.014*math.sin(j)))
        shoot(trace[::3],rr[::3],['949663','a0ae6c','77a58b'][j%3],'sap channels',steps=27,sides=5,ribs=1)
    return c


# Two buttressed root arches meet at an oblique crown. The central opening remains clear.
front = arch([(-10,-.35,1.2),(-9.2,3.0,1.15),(-9.1,7.1,.4),(-7.45,11.9,-.4),(-4.15,15.15,-.6),(-.75,16.45,.1),(3,16.25,.7),(5.6,15.6,1.4)], [2.55,1.66,1.23,1.13,.95,.78,.54,.025], .4, '697962')
back = arch([(9.55,-.4,-1.3),(9.45,2.5,-1.48),(8.55,6.45,-1.3),(7.3,10.2,-1.02),(5.4,13.9,-.58),(2.6,16.3,-.15),(.1,17.35,.2),(-2.08,17.54,.05)], [2.4,1.59,1.44,1.13,.91,.68,.35,.03], 2.6, '5a7464')
for sign, anchor in [(-1,np.array([-9.25,1.20,1.15])),(1,np.array([9.65,1.14,-1.3]))]:
    for k in range(6):
        a=TAU*(k+.32*sign)/6
        direction=np.array([math.cos(a),0,math.sin(a)])
        reach=2.6+(k%3)*.67
        end=anchor+direction*reach;end[1]=-.12
        mid=anchor+direction*(reach*.53);mid[1]=.52
        shoot([anchor+[0,1,0],mid,end,end+direction*.76+[0,-.18,0]], [.83,.65,.22,.018], '596e56', steps=12, sides=7)

# Slender branches carry sprays of individual leaves. Avoid a flat circular tree crown.
for c, offsets, phase in [(front,[.36,.52,.60,.72,.86],.4),(back,[.34,.49,.63,.81,.90],2.2)]:
    for k,u in enumerate(offsets):
        p=c(u)
        sign=-1 if p[0]<0 else 1
        azimuth=phase+k*2.34
        reverse = -1 if k == 3 else 1
        reach=1.65+(k%3)*.5
        tip=p+np.array([sign*reach*reverse,1.36+.33*k,2.18*math.sin(azimuth)])
        mid=(p+tip)*.5 + [sign*.32,.16,.35]
        shoot([p,mid,tip], [.29,.16,.025], '738564',steps=10,sides=6)
        for j in range(10):
            v=j/10
            root=mid*(1-v)+tip*v
            side=-1 if j%2 else 1
            drift=np.array([side*(1.15+.6*math.cos(k+v*3)),.58+v*.5,.44+math.sin(v*3+phase)*1.1])
            end=root+drift
            lance(root,end,.24+.08*math.sin(j),.30,['6f9a70','729f85','87aa79','93a875'][j%4])

# Epiphytic bromeliads and aerial roots break up the two different support profiles.
for anchor, radius, rotation in [
    ((-7.98,10.03,-.35),1.54,.9), ((-6.02,13.54,-.25),1.17,1.24),
    ((-3.42,15.72,-.58),1.62,2.7), ((3.42,15.66,.2),1.8,.54),
    ((8.19,7.42,-1.07),1.33,2.72), ((8.99,3.48,-.55),.93,.12),
    ((-9.66,.53,1.8),1.23,1.5), ((9.41,.44,.04),1.58,.35),
]:
    anchor=np.array(anchor)
    for k in range(8):
        heading=k*2.39996+rotation
        reach=radius*(.68+.29*math.sin(heading*3+rotation))
        tip=anchor+np.array([math.cos(heading)*reach, radius*(.56+rng.uniform(.06,.79)), math.sin(heading)*reach])
        lance(anchor,tip,radius*(.105+.02*(k%3)),radius*.33,['589a81','719f70','a0b677','658d60'][k%4])
for k in range(11):
    u=.46+k*.027
    start=front(u)+[.13,.0,.23+(k%4)*.19]
    drop=1.14+2.8*(.5+.5*math.cos(k*2.4))
    bend=math.sin(k*2.1)
    middle=start+np.array([.24*bend,-drop*.50,.19])
    tip=start+np.array([.39*bend,-drop,.25])
    shoot([start,middle,tip],[.062,.036,.01],'899775','sap channels',steps=9,sides=4,ribs=1)
    if k%3==0:
        lance(middle,tip+[.64,.08,.15],.15,.16,'82a373')

# A faceted amber seed hangs from two supple fruit stalks beneath the crown.
shoot([(-.65,16.2,.08),(-.08,15.35,-.22),(.66,14.15,-.13),(.51,13.63,0)], [.28,.195,.135,.08], 'afaf70',steps=14,sides=7,ribs=5)
shoot([(2.12,16.32,.18),(1.21,15.55,-.43),(.45,14.72,-.2),(.51,13.63,0)], [.21,.12,.09,.05], '88ad7c',steps=13,sides=6)
seed = np.array([.51,11.51,0])
u=np.linspace(.01,math.pi-.006,20)[:,None]
v=np.arange(30)[None,:]*TAU/30
swelling=np.sin(u)**.85*(1+.19*np.cos(u))
fins=(1+.104*np.cos(7*v+.58*np.sin(u)))
radial=np.stack(np.broadcast_arrays(1.47*swelling*fins*np.cos(v),2.21*np.cos(u),1.45*swelling*fins*np.sin(v)),-1)
seed_lit = (.43+.42*(.5+.5*np.cos(7*v+.58*np.sin(u)))+.15*np.sin(u))[:,:,None]
m.grid(radial+seed, rgb('cd8c41')*(1-seed_lit) + rgb('fff2a1')*seed_lit,.25,'seed light',outward=radial)
for j in range(7):
    a=j*TAU/7
    line=[]
    for y,r in [(2.05,.36),(1.32,1.26),(.17,1.68),(-1.03,1.34),(-1.98,.79),(-2.80,.46)]:
        bend=a+(y-1)*.11
        line.append(seed+np.array([r*math.cos(bend),y,r*math.sin(bend)]))
    shoot(line,[.14,.16,.18,.13,.065,.012],['729b74','86ac79'][j%2],'seed sepals',steps=17,sides=7,ribs=2)
    begin=line[3]; end=line[-1]+[math.cos(a)*.30,-.48,math.sin(a)*.30]
    lance(begin,end,.25,.28,'82af80','seed sepals')

# A few smaller seeds mark this as a living nursery.
for x,y,z,s in [(-6.1,11.5,.2,.42),(-5.23,12.9,1.18,.31),(6.75,9.5,-.54,.38),(7.42,8.43,-.31,.27)]:
    shoot([(x-.24,y+1.34,z-.1),(x-.10,y+.52,z-.15),(x,y,z)],[.060,.035,.013],'93aa74',steps=7,sides=5)
    m.orb((x,y-.33,z),(s*.53,s*1.12,s*.52),'ddca78',rough=.36,seg=11,ring=7,group='seed light')

out=ART.parent/'dist/assets/fauna'
name='canopy-heart'
meta=export(m,name,out,RASTER)
# Set the light response on the same fruit element that the viewer animates.
asset=out/(name+'.glb')
raw=asset.read_bytes()
length=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+length]); doc['asset']['generator']='Canopy Heart botanical sculpture'
for mat in doc['materials']:
    if mat['name']=='seed light':
        mat['emissiveFactor']=[.78,.43,.11]
packed=json.dumps(doc,separators=(',',':')).encode();packed+=b' '*((-len(packed))%4)
binary=raw[20+length:]
asset.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(packed)+len(binary))+struct.pack('<I4s',len(packed),b'JSON')+packed+binary)
manifest=out/'manifest.json'
entries=json.loads(manifest.read_text())
entries[name]=meta
manifest.write_text(json.dumps(entries,indent=2))
