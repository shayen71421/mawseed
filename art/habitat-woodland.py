"""Fractured shale and cinnamon woodland fungi. Run with Blender in background mode."""
import importlib.util
import json
import math
from pathlib import Path
import random
from tempfile import TemporaryDirectory

import bpy
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from mathutils import Vector

spec = importlib.util.spec_from_file_location('habitat_props', Path(__file__).with_name('habitat-props.py'))
geo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(geo)
V, TAU = geo.V, math.tau
rng = random.Random(1582)
prng = np.random.default_rng(1582)


def reset(names):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for table in (geo.vertices, geo.faces, geo.colors, geo.uvs, geo.mats):
        table.clear()
    for name, roughness in names:
        geo.material(name, roughness)
        nodes = geo.mats[name].node_tree.nodes
        nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.23
        for table in (geo.vertices, geo.faces, geo.colors, geo.uvs):
            table[name]=[]


def field(size, sigma):
    f=np.fft.fftfreq(size)
    filt=np.exp(-2*math.pi**2*sigma**2*(f[:,None]**2+f[None,:]**2))
    noise=np.fft.ifft2(np.fft.fft2(prng.normal(size=(size,size)))*filt).real
    return noise/(noise.std()+1e-8)


def fit(extents, ground):
    all_points=np.array([p for group in geo.vertices.values() for p in group]);low=all_points.min(0);high=all_points.max(0)
    scale=np.array(extents)/(high-low)
    for name,points in geo.vertices.items():
        for i,point in enumerate(points):
            p=np.array(point);p[:2]-=(high[:2]+low[:2])*.5;p[2]-=low[2];p*=scale;p[2]+=ground
            points[i]=tuple(p)


def texture(name, directory, color, height, normal_scale):
    material=geo.mats[name];nodes=material.node_tree.nodes;links=material.node_tree.links
    surface=nodes.get('Principled BSDF');pixel_color=Image.fromarray(np.uint8(np.clip(color,0,255)))
    color_file=directory/(name+'-color.jpg');pixel_color.save(color_file,quality=90)
    dx=np.roll(height,-1,axis=1)-np.roll(height,1,axis=1);dy=np.roll(height,-1,axis=0)-np.roll(height,1,axis=0)
    vector=np.stack((-dx,dy,np.ones_like(dx)),axis=2);vector/=np.linalg.norm(vector,axis=2)[:,:,None]
    normal_file=directory/(name+'-relief.png');Image.fromarray(np.uint8(255*(.5+vector*.5))).save(normal_file)
    color_node=nodes.new('ShaderNodeTexImage');color_node.image=bpy.data.images.load(str(color_file));color_node.image.pack()
    pigment=nodes.new('ShaderNodeMixRGB');pigment.blend_type='MULTIPLY';pigment.inputs[0].default_value=1
    links.new(color_node.outputs[0],pigment.inputs[1]);links.new(nodes.get('Color Attribute').outputs[0],pigment.inputs[2]);links.new(pigment.outputs[0],surface.inputs['Base Color'])
    normal=nodes.new('ShaderNodeTexImage');normal.image=bpy.data.images.load(str(normal_file));normal.image.colorspace_settings.name='Non-Color';normal.image.pack()
    bump=nodes.new('ShaderNodeNormalMap');bump.inputs['Strength'].default_value=normal_scale
    links.new(normal.outputs[0],bump.inputs['Color']);links.new(bump.outputs['Normal'],surface.inputs['Normal'])


def lithology(directory):
    n=320;y,x=np.indices((n,n))/n
    quartz=field(n,2.5);jitter=field(n,8);fine=field(n,.65);grain=field(n,.17);swirl=field(n,28)
    phase=TAU*(13*y-3*x)+.70*np.sin(TAU*x)+.48*jitter+.55*swirl
    bed=(.5+.5*np.cos(phase))**5;vein=np.exp(-np.abs(np.sin(phase*.54+quartz*.19))*24)
    # Dark iron oxides concentrate between quartz laminae; orange inclusions stay sparse.
    light=74+9*swirl+6*jitter+8*quartz+6*fine+4*grain+8*bed+31*vein
    iron=np.clip((quartz+1.2*swirl-1.9)*.7,0,1)
    lithic=np.stack((light*1.12+iron*13,light*1.03+iron*2,light*.88-iron*5),axis=2)
    h=.17*grain+.24*fine+.25*quartz+.45*bed+.24*vein
    texture('layered shale',directory,lithic,h,.62)
    cover=np.clip((swirl*.78+field(n,13)*.55+fine*.17-.1)*1.45,0,.94)
    moss_tone=np.stack((68+quartz*7+fine*8,77+quartz*9+fine*11,45+quartz*5+fine*5),axis=2)
    moss_tone+=np.clip(fine-1.5,0,2)[:,:,None]*np.array([10,11,6])
    texture('moss and shale',directory,lithic*(1-cover[:,:,None])+moss_tone*cover[:,:,None],h+cover*(.37*fine+.24*quartz),.64)


def polygon(mat,points,color,normal=None):
    if normal is None:normal=(points[1]-points[0]).cross(points[2]-points[0]).normalized()
    if normal.z>.61:uv=lambda v:(v.x*.81+v.y*.14,v.y*.91-v.x*.11)
    else:
        tangent=Vector((-normal.y,normal.x,0)).normalized()
        uv=lambda v:(tangent.dot(v)*.92,.91*v.z+.14*v.x+.085*v.y)
    ids=[geo.add(mat,p,color,uv(p)) for p in points];geo.fac(mat,*ids)


def fragment(x,y,z,length,width,height,angle,cap_lichen):
    # An irregular polygonal fracture outline, offset across sheared bedding ledges.
    outline=[(-.92,-.44),(-.52,-.92),(.48,-1),(.98,-.57),(1,.34),(.58,.92),(-.42,.97),(-.97,.46)]
    ca,sa=math.cos(angle),math.sin(angle);jag=[rng.uniform(.82,1.04) for _ in outline]
    per=[rng.uniform(-.075,.075) for _ in outline];rows=[]
    layers=[(-.035,.86),(.23,1),(.53,.95),(.58,.88),(.68,.93),(.83,.86),(1,.72)]
    for k,(t,scale) in enumerate(layers):
        row=[]
        for j,(u,v) in enumerate(outline):
            fracture=scale+.035*math.sin(j*2.33+k*.89)*math.sin(t*math.pi)
            a=length*(u*jag[j]*fracture+t*.18);b=width*(v*jag[j]*fracture+t*.06)
            p=V(x+a*ca-b*sa,y+a*sa+b*ca,z+height*(t + (.045+.13*t)*u+(.035-.13*t)*v+per[j]*(.50+.84*t)))
            row.append(p)
        rows.append(row)
    for k,(a,b) in enumerate(zip(rows,rows[1:])):
        for j in range(len(outline)):
            end=(j+1)%len(outline)
            pts=[a[j],a[end],b[end],b[j]]
            color=np.array([.82,.77,.69])*rng.uniform(.85,1.09)
            if k==2:color*=.58
            polygon('layered shale',pts,color)
    top=rows[-1]
    center=sum(top[1:],top[0].copy())/len(top)+V(-.05,.08,height*.023)
    for j in range(len(top)):
        # Top planes meet along shallow, offset fracture ridges. Each triangle owns its flat normal.
        pigment=np.array([.87,.88,.79])*rng.uniform(.91,1.07)
        polygon('moss and shale' if cap_lichen else 'layered shale',[center,top[j],top[(j+1)%len(top)]],pigment)


def rock(directory):
    reset([('layered shale',.92),('moss and shale',.95)]);lithology(directory)
    for f in [(-.17,.18,.03,.95,.62,.98,-.24,True),(.60,-.15,.015,.69,.52,.61,.25,True),(-.83,-.21,.028,.57,.39,.41,-.32,False),(.22,.66,.016,.55,.40,.53,.29,True),(-.45,-.53,.01,.38,.23,.23,.39,False),(.87,-.52,-.005,.32,.20,.16,-.48,False),(-1.03,.22,.012,.25,.21,.17,.5,False)]:
        fragment(*f)
    fit((2.892,2.071,1.341),-.1)


def cap_texture(directory):
    n=256;y,x=np.indices((n,n))/n
    grain=field(n,.4);mottle=field(n,6);bloom=field(n,16);fibers=(.5+.5*np.cos(TAU*x*49+.9*mottle+.18*grain))**5
    drape=(.5+.5*np.cos(TAU*(x*7+y*2)+bloom))**3
    # Rust and ochre gradients, weather freckles and short radial fibers.
    color=np.stack((125+10*mottle+10*bloom+15*drape+8*fibers,57+7*mottle+9*bloom+9*drape+6*fibers,24+5*mottle+5*bloom+6*drape+3*fibers),axis=2)
    freckle=np.clip((field(n,1.4)-1.38)*.72,0,1)
    color+=grain[:,:,None]*3.3-freckle[:,:,None]*np.array([26,19,10]);h=.16*grain+.34*fibers-.27*freckle
    texture('russet cuticle',directory,color,h,.38)


def bonnet(x,y,h,r,yaw,lean,saturation):
    fx,fy=math.cos(yaw),math.sin(yaw);base=V(x,y,.005)
    def stalk(t):return base+V(fx*lean*(.55*t+.45*t*t)+.025*math.sin(t*4+yaw),fy*lean*t*t,h*t)
    support=[stalk(t) for t in [0,.14,.40,.66,.88,1]]
    geo.tube('fibrous stipe', support,[r*f for f in [.24,.19,.125,.12,.14,.13]],lambda t:(.17+.23*t,.10+.105*t,.056+.06*t),12)
    tip=stalk(1);steps=40 if r>.39 else 28 if r>.28 else 22
    rows=[]
    # A raised central umbo slopes down onto a wavy, striate cinnamon margin.
    profile=[(0,.42),(.14,.44),(.26,.37),(.43,.30),(.66,.20),(.82,.13),(.96,.03),(1,-.008),(.99,-.064)]
    for i,(rad,lift) in enumerate(profile):
        row=[]
        for j in range(steps+1):
            a=TAU*j/steps
            irregular=1+.054*math.sin(3*a+yaw)+.021*math.sin(7*a)+.011*math.cos(13*a+yaw)
            w=rad*r*irregular
            z=r*(lift+.039*math.cos(3*a-yaw)*rad**2+.037*math.sin(2*a+yaw)*rad+.011*math.cos(17*a)*rad**3)
            p=tip+V(w*math.cos(a),w*math.sin(a)*.92,z)
            factor=saturation*(.82+.20*rad+.045*math.cos(6*a+yaw));tone=(factor,min(1,factor*(.77+.15*rad)),factor*.74)
            row.append(geo.add('russet cuticle',p,tone,(j/steps,rad*.98)))
        rows.append(row)
    for low,high in zip(rows,rows[1:]):
        for j in range(steps):geo.fac('russet cuticle',low[j],high[j],high[j+1],low[j+1])
    # Real gill folds are visible in silhouette; the warm lamellae remain in shadow.
    rings=[]
    for k,rr in enumerate([.12,.30,.59,.80,.97]):
        row=[]
        for j in range(steps*2+1):
            a=TAU*j/(steps*2);rim=1+.054*math.sin(3*a+yaw)+.021*math.sin(7*a)+.011*math.cos(13*a+yaw)
            rib=j%2;depth=(-.073-.098*math.sin(math.pi*rr)*rib+.06*(1-rr))
            lift=.039*math.cos(3*a-yaw)*rr**2+.037*math.sin(2*a+yaw)*rr
            shade=.79+.22*rib
            color=(.105*shade,.056*shade,.024*shade)
            row.append(geo.add('dark lamellae',tip+V(rr*r*rim*math.cos(a),rr*r*rim*math.sin(a)*.92,r*(depth+lift)),color,(j/(steps*2),rr)))
        rings.append(row)
    for low,high in zip(rings,rings[1:]):
        for j in range(steps*2):geo.fac('dark lamellae',low[j],low[j+1],high[j+1],high[j])
    strands=5 if r>.32 else 3
    for i in range(strands):
        a=i*TAU/strands+.15*yaw
        line=[]
        for t,rad in [(.03,.23),(.30,.15),(.51,.122),(.77,.12)]:line.append(stalk(t)+V(r*rad*math.cos(a),r*rad*math.sin(a),0))
        geo.tube('fibrous stipe',line,[.004,.005,.003,.001],(.19,.11,.059),4)


def mushrooms(directory):
    reset([('russet cuticle',.72),('fibrous stipe',.89),('dark lamellae',.89)]);cap_texture(directory)
    # The tallest cap is small relative to the colony footprint, and the bases form a loose tuft.
    for row in [(-.11,.13,1.14,.46,1.24,.088,.93),(.33,.14,.83,.37,.44,.12,1.12),(-.46,-.11,.67,.33,3.30,.12,.99),(.14,-.24,.56,.27,5.82,.12,.82),(.47,-.23,.30,.18,5.55,.07,1.05),(-.53,.19,.36,.20,2.12,.09,1.16)]:bonnet(*row)
    fit((1.944,1.5,1.853),-.024)


def contact(name, meta, width, depth):
    path=geo.D/(name+'.webp');subject=Image.open(path).convert('RGBA')
    pixels=subject.width/meta['size'];cx,cy=[v*subject.width for v in meta['anchor']]
    mask=Image.new('L',subject.size);pen=ImageDraw.Draw(mask)
    rx,ry=width*pixels,depth*pixels
    pen.ellipse((cx-rx,cy-ry,cx+rx,cy+ry),fill=58)
    mask=mask.filter(ImageFilter.GaussianBlur(max(2,ry*.56)))
    shade=Image.new('RGBA',subject.size,(34,31,21));shade.putalpha(mask)
    Image.alpha_composite(shade,subject).save(path,quality=92,method=6)


with TemporaryDirectory(prefix='woodland-materials-') as tmp:
    for name,builder in [('rock',rock),('mushroom',mushrooms)]:
        builder(Path(tmp));meta=geo.export(name,resolution=512)
        contact(name,meta,1.21 if name=='rock' else .68,.19 if name=='rock' else .13)
        manifest=geo.D/'habitat.json';entries=json.loads(manifest.read_text());entries[name]=meta;manifest.write_text(json.dumps(entries,indent=2))
        print(name,meta,flush=True)
