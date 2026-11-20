"""Sculpt buttressed rainwood, juvenile rainwood and a pinnate fern. Run through Blender."""
from pathlib import Path
from tempfile import TemporaryDirectory
import importlib.util
import json
import math
import os
import random

import bpy
from mathutils import Vector
from PIL import Image, ImageDraw, ImageFilter

spec = importlib.util.spec_from_file_location('habitat_props', Path(__file__).with_name('habitat-props.py'))
mesh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mesh)
V, TAU = mesh.V, 2*math.pi
rng = random.Random(7653)


def atlas(directory, is_fern):
    """Paint compound shoots with distinct blades, pigment gradients and secondary veins."""
    size = 640
    pigment = Image.new('RGBA',(size,size))
    pen = ImageDraw.Draw(pigment)
    def color(rgb, intensity):
        return tuple(max(0,min(255,round(v*intensity))) for v in rgb)+(255,)
    def blade(start, end, girth, tone, turn, veining):
        dx,dy=end[0]-start[0],end[1]-start[1]
        length=math.hypot(dx,dy)
        nx,ny=-dy/length,dx/length
        def location(t,w):
            mid=turn*math.sin(t*math.pi)
            blade_width=math.sin(max(.0001,min(.9999,t))*math.pi)**.82*(.9+.25*t)*girth
            return (start[0]+dx*t+(mid+blade_width*w)*nx,start[1]+dy*t+(mid+blade_width*w)*ny)
        steps=13 if veining else 7
        for i in range(steps):
            t=i/steps
            for low,high in [(-1,-.38),(-.38,0),(0,.41),(.41,1)]:
                w=(low+high)/2
                shade=.80+.16*math.sin(t*math.pi)+.12*t-.095*w + .05*math.cos(t*13+w*3)
                points=[location(t,low),location(t,high),location((i+1)/steps,high),location((i+1)/steps,low)]
                pen.polygon(points,fill=color(tone,shade))
        for point in ([.15,.27,.39,.51,.64,.77] if veining else [.35,.6]):
            for side in [-1,1]:
                line=[location(point,0),location(point+.039,side*.43),location(point+.105,side*.88)]
                pen.line(line,fill=color(tuple(v*.7+d*.3 for v,d in zip(tone,(186,184,111))),.95),width=1)
        pen.line([location(i/12,0) for i in range(13)], fill=color(tuple(v*.52+d*.48 for v,d in zip(tone,(185,192,112))),1),width=2 if veining else 1)
    def rachis(t):
        return (size*(.49+.034*math.sin(t*4.5)),size*(.975-.925*t))
    pen.line([rachis(i/24) for i in range(25)],fill=(115,123,58,255),width=4 if is_fern else 6)
    n = 14 if is_fern else 7
    for i in range(n):
        for side in [-1,1]:
            t = .07 + (.84/n)*(i+(.19 if side==-1 else 0))
            start = rachis(t)
            envelope = math.sin(math.pi*(.16+.84*t))**.76
            width=size*(.37 if is_fern else .36)*envelope*rng.uniform(.91,1.04)
            tip=(start[0]+side*width,start[1]-width*(.28 if is_fern else .53)-size*.028)
            if is_fern:
                pen.line([start,tip],fill=(134,151,69,255),width=2)
                jmax = 6 + int(4*envelope)
                for j in range(jmax):
                    s=j/(jmax+1)
                    point=(start[0]*(1-s)+tip[0]*s,start[1]*(1-s)+tip[1]*s)
                    for branch in [-1,1]:
                        reach=(.9-.53*s)*size*(.032+.025*envelope)
                        end=(point[0]+side*reach*(.61+.25*branch),point[1]+branch*reach)
                        tone=(rng.uniform(75,98)+i*.9,rng.uniform(130,150)+i*.5,rng.uniform(56,73)+i*.29)
                        blade(point,end,reach*.30,tone,branch*reach*.08,False)
                blade((tip[0]-side*8,tip[1]+2),(tip[0]+side*8,tip[1]-2),2.5,(115,154,73),1,False)
            else:
                stem=(start[0]+side*width*.12,start[1]-width*.035)
                pen.line([start,stem],fill=(109,127,60,255),width=3)
                tone=(rng.uniform(68,98)+t*12,rng.uniform(116,145)+t*16,rng.uniform(62,87)+t*9)
                blade(stem,tip,width*(.143+rng.uniform(.0,.035)),tone,side*width*.064,True)
    tip=rachis(1)
    blade(rachis(.84), (tip[0]+6,5),size*.036,(128,162,78) if is_fern else (112,160,86),7,not is_fern)
    name='fern-pinnae' if is_fern else 'rainwood-branchlets'
    p=directory/(name+'.png')
    pigment.resize((384,384),Image.Resampling.LANCZOS).save(p)
    return p


def texture(material, path, alpha=False, normal=False):
    nodes,links=material.node_tree.nodes,material.node_tree.links
    image=bpy.data.images.load(str(path),check_existing=True)
    if normal: image.colorspace_settings.name='Non-Color'
    image.pack()
    tex=nodes.new('ShaderNodeTexImage'); tex.image=image
    surface=nodes.get('Principled BSDF')
    if normal:
        relief=nodes.new('ShaderNodeNormalMap');relief.inputs['Strength'].default_value=.56
        links.new(tex.outputs[0],relief.inputs['Color']);links.new(relief.outputs[0],surface.inputs['Normal'])
        return
    mult=nodes.new('ShaderNodeMixRGB');mult.blend_type='MULTIPLY';mult.inputs[0].default_value=1
    links.new(tex.outputs[0],mult.inputs[1]);links.new(nodes.get('Color Attribute').outputs[0],mult.inputs[2]);links.new(mult.outputs[0],surface.inputs['Base Color'])
    if alpha:
        clip=nodes.new('ShaderNodeMath');clip.operation='GREATER_THAN';clip.inputs[1].default_value=.34
        links.new(tex.outputs['Alpha'],clip.inputs[0]);links.new(clip.outputs[0],surface.inputs['Alpha'])
        material.use_backface_culling=False


def setup(directory, foliage, fern=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for table in (mesh.vertices,mesh.faces,mesh.colors,mesh.uvs,mesh.mats): table.clear()
    names=[('leaflets',.51)] if fern else [('rainwood bark',.83),('leaflets',.50)]
    for mat,roughness in names:
        mesh.material(mat,roughness,coat=.06 if mat=='leaflets' else .01)
        for table in (mesh.vertices,mesh.faces,mesh.colors,mesh.uvs):table[mat]=[]
    texture(mesh.mats['leaflets'],foliage,alpha=True)
    if not fern:
        for label in ['color','normal']:
            img=Image.open(mesh.D/f'bark-{label}.webp').convert('RGB').resize((288,288),Image.Resampling.LANCZOS)
            # Lift bark highlights enough to retain the ridges on the forest floor.
            if label=='color': img=img.point(lambda x:min(255,round(x*.99+18)))
            file=directory/f'rainwood-bark-{label}.jpg';img.save(file,quality=86)
            texture(mesh.mats['rainwood bark'],file,normal=label=='normal')


def ribbon(points,widths,side,colors):
    """A curved, cambered shoot card. Longitudinal UVs follow its central vein."""
    rows=[]
    for i,(mid,width) in enumerate(zip(points,widths)):
        t=i/(len(points)-1)
        direction=(points[min(i+1,len(points)-1)]-points[max(i-1,0)]).normalized()
        right=side - direction*side.dot(direction)
        right.normalize()
        normal=right.cross(direction).normalized()
        color=colors(t)
        rows.append([mesh.add('leaflets',mid+right*(width*u)+normal*(width*.105*(1-abs(u))),color,((u+1)/2,t)) for u in [-1,0,1]])
    for low,high in zip(rows,rows[1:]):
        for i in range(2):mesh.fac('leaflets',low[i],low[i+1],high[i+1],high[i])


def wood(points,radii,color=(.84,.88,.76),sides=8):
    mesh.tube('rainwood bark',points,radii,color,sides)


def buttress(angle,extent,height,width):
    radial=V(math.cos(angle),math.sin(angle),0);side=V(-radial.y,radial.x,0)
    rows=[]
    for i in range(8):
        t=i/7
        p=radial*(.215+extent*t)+side*.12*math.sin(t*math.pi)
        h=.015+height*(1-t)**1.63
        w=.045+width*(1-t)**.59
        row=[]
        for u,v in [(-1,-.07),(-.83,.12),(-.37,.64),(0,1),(.39,.65),(.87,.09),(1,-.07)]:
            pigment=(.72+.10*v,.77+.14*v,.65+.12*v)
            row.append(mesh.add('rainwood bark',p+side*w*u+V(0,0,v*h),pigment,(u*.42+t*.42,v*h*.4)))
        rows.append(row)
    for a,b in zip(rows,rows[1:]):
        for j in range(6):mesh.fac('rainwood bark',a[j],b[j],b[j+1],a[j+1])


def canopy_spray(start, heading, run, rise, girth, roll, warmth):
    forward=V(math.cos(heading),math.sin(heading),0)
    side=V(-forward.y,forward.x,0)*math.cos(roll)+V(0,0,math.sin(roll))
    drop=run*rng.uniform(.12,.28)
    points=[start+forward*(t*run)+V(0,0,rise*t + drop*math.sin(t*math.pi)) for t in [0,.33,.67,1]]
    # The paint includes the silhouette; the geometry carries the leaf's angle, curve and occlusion.
    ribbon(points,[girth*.91,girth,girth*.96,girth*.90],side,lambda t:(.79+warmth*.18+.08*t,.83+warmth*.10+.08*t,.73-warmth*.08+.12*t))


def bough(origin,a,length,climb,young,collector):
    forward=V(math.cos(a),math.sin(a),0);side=V(-forward.y,forward.x,0)
    bend=rng.uniform(-.22,.22)*length
    def axis(t):return origin+forward*(length*t)+side*(bend*math.sin(t*math.pi))+V(0,0,climb*(.25*t+.75*t**.75))
    wood([axis(t) for t in [0,.23,.50,.75,1]],[length*.105,length*.078,length*.054,length*.030,.018],sides=8)
    for j in range(6 if not young else 5):
        t=.29+j*.115
        start=axis(t);sign=-1 if j%2==0 else 1
        az=a+sign*rng.uniform(.43,1.24)
        reach=length*rng.uniform(.30,.51)*(1.14-.29*t)
        out=V(math.cos(az),math.sin(az),0)
        tip=start+out*reach+V(0,0,reach*rng.uniform(.19,.55));mid=start.lerp(tip,.53)+V(0,0,-.08)
        wood([start,mid,tip],[length*.038,length*.022,.008],sides=5)
        for k in range(3):
            bud=mid.lerp(tip,k*.45)
            collector.append((bud,az+(k-1)*.72))
    collector.append((axis(.95),a))


def rainwood(young):
    height=3.4 if young else 8.2
    radius=.18 if young else .49
    def stem_axis(t):
        lean=.30 if young else .54
        return V(lean*(math.sin(t*6.2-.3)*.51+1.32*t-.15*math.cos(t*9)),lean*(.73*math.sin(t*5.3)*t+.34*t),height*t-.03)
    trunk=[stem_axis(t) for t in [0,.045,.105,.22,.36,.52,.68,.81,.92,1]]
    wood(trunk,[radius*s for s in [1.62,1.27,1.0,.87,.79,.63,.50,.41,.27,.055]],sides=14 if not young else 10)
    for i in range(7 if not young else 5):
        a=i*2.399+rng.uniform(-.25,.25)
        if not young:buttress(a,rng.uniform(1.24,1.79),rng.uniform(1.35,2.45),rng.uniform(.19,.29))
        else:
            edge=V(math.cos(a),math.sin(a),0)*rng.uniform(.38,.59)
            wood([V(0,0,.33),edge*.62+V(0,0,.09),edge],[.15,.105,.025],sides=6)
    sites=[]
    total=11 if not young else 7
    for i in range(total):
        t=i/(total-1)
        origin=stem_axis((.40 if young else .45)+(.57 if young else .52)*t)
        a=i*2.3999+rng.uniform(-.25,.25)
        length=height*(.43-.21*t+.065*math.sin(t*5))*(rng.uniform(.91,1.09))
        climb=height*(.105+.085*math.sin(t*math.pi))
        bough(origin,a,length,climb,young,sites)
    spraylen=.58 if young else 1.22
    for bud,az in sites:
        cluster=3 if not young else 2
        for j in range(cluster):
            a=az+(j-(cluster-1)/2)*1.08+rng.uniform(-.25,.25)
            run=spraylen*rng.uniform(.62,1.21)
            rise=spraylen*rng.uniform(-.23,.47)
            origin=bud+V(math.cos(a)*.025,math.sin(a)*.025,rng.uniform(-.12,.12))
            canopy_spray(origin,a,run,rise,run*rng.uniform(.40,.58),rng.uniform(-1.03,1.01),rng.random())


def fern():
    for i in range(22):
        a=i*2.39996+rng.uniform(-.21,.21)
        spread=rng.uniform(.64,1.25)*(1 if i<16 else .60)
        height=rng.uniform(.63,1.02)*(1 if i<16 else 1.25)
        forward=V(math.cos(a),math.sin(a),0);across=V(-forward.y,forward.x,0)
        roll=rng.uniform(-.48,.48);side=across*math.cos(roll)+V(0,0,math.sin(roll))
        center=V(0,0,.01)+forward*rng.uniform(.023,.072)
        points=[];width=[]
        for j in range(10):
            t=j/9
            points.append(center+forward*(spread*t**1.35)+across*(.035*math.sin(t*4+i))+V(0,0,height*(1.96*t-1.33*t*t)))
            width.append(.30*spread*rng.uniform(.98,1.01))
        warmth=rng.uniform(.71,1.0)
        ribbon(points,width,side,lambda t:(warmth+.11*t,.88+.11*t,.74+.17*t))
    # True 3D coiled fiddleheads rise from the central rhizome.
    # They share the leaf material and sample a fully painted point on the central vein.
    for i in range(3):
        a=i*2.39+.30;f=V(math.cos(a),math.sin(a),0)
        root=f*.036;stem=root+f*.12+V(0,0,.67+.085*i)
        path=[root,root+f*.04+V(0,0,.29),stem]
        radii=[.028,.022,.019]
        for j in range(17):
            t=j/16;angle=t*TAU*1.43;r=.112*(1-.79*t)
            path.append(stem+f*(.115-r*math.cos(angle))+V(0,0,r*math.sin(angle)))
            radii.append(.018-.009*t)
        first=len(mesh.vertices['leaflets']); mesh.tube('leaflets',path,radii,(.99,.85,.60),5)
        for j in range(first,len(mesh.vertices['leaflets'])):mesh.uvs['leaflets'][j]=(.49,.029)


def contact_plate(name,meta,width,depth):
    """Bake a hovering-leaf penumbra and a tighter contact band beneath the origin."""
    path=mesh.D/(name+'.webp');im=Image.open(path).convert('RGBA');pixels=im.width/meta['size']
    cx,cy=[im.width*a for a in meta['anchor']];shade=Image.new('RGBA',im.size)
    for factor,alpha in [(1,.14),(.53,.27)]:
        mask=Image.new('L',im.size);draw=ImageDraw.Draw(mask);rx=width*pixels*factor;ry=depth*pixels*factor
        draw.ellipse((cx-rx,cy-ry,cx+rx,cy+ry),fill=round(alpha*255))
        mask=mask.filter(ImageFilter.GaussianBlur(max(.9,ry*.63)))
        layer=Image.new('RGBA',im.size,(29,40,27));layer.putalpha(mask);shade=Image.alpha_composite(shade,layer)
    Image.alpha_composite(shade,im).save(path,quality=92,method=6)


with TemporaryDirectory(prefix='forest-atlas-') as directory:
    work=Path(directory)
    leaves=atlas(work,False);pinnae=atlas(work,True)
    for key,young,is_fern in [('rainwood',False,False),('youngtree',True,False),('fern',False,True)]:
        setup(work,pinnae if is_fern else leaves,is_fern)
        if is_fern:fern()
        else:rainwood(young)
        # Several overlapping cutout shoots can lie on one sight line at the rhizome.
        # Let transparent rays pass through the complete crown in the portrait render.
        def render_cutouts(scene):
            scene.cycles.transparent_max_bounces=64
            scene.cycles.max_bounces=8
            scene.cycles.samples=32
        bpy.app.handlers.render_pre.append(render_cutouts)
        try:
            meta=mesh.export(key, resolution=512 if is_fern else 768, write_model=not os.getenv('HABITAT_PORTRAITS_ONLY'))
        finally:
            bpy.app.handlers.render_pre.remove(render_cutouts)
        contact_plate(key,meta,.37 if is_fern else .67 if young else 1.58,.075 if is_fern else .14 if young else .30)
        manifest=mesh.D/'habitat.json';entries=json.loads(manifest.read_text());entries[key]=meta
        manifest.write_text(json.dumps(entries,indent=2))
        print(key,meta,flush=True)
