"""Sculpt the nursery reef and bake its transparent portrait.

Run from the project root with blender --background --python art/tidegarden.py.
All anatomy is generated in metres, in Blender's Z-up frame.
"""
import importlib.util
import json
import math
from pathlib import Path
import random
import tempfile
import struct

import bpy
import numpy as np
from mathutils import Vector, noise
from PIL import Image

ART = Path(__file__).parent
spec = importlib.util.spec_from_file_location('habitat_props', ART / 'habitat-props.py')
mesh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mesh)
V, TAU, PI = mesh.V, math.tau, math.pi
rng = random.Random(43109)
rng_np = np.random.default_rng(407)
sin, cos = math.sin, math.cos
STONE, WEED, CORAL, SPONGE = 'Algae limestone', 'Kelp laminae', 'Sea fan and cup coral', 'Ochre sponge'
stone_low = np.array([.056,.089,.078])
stone_high = np.array([.29,.33,.202])
lichen = np.array([.20,.30,.065])


def normal_map(material, height, file, strength):
    dx = np.roll(height,-1,1)-np.roll(height,1,1)
    dy = np.roll(height,-1,0)-np.roll(height,1,0)
    n = np.stack((-dx,dy,np.ones_like(dy)),2)
    n /= np.linalg.norm(n,axis=2,keepdims=True)
    Image.fromarray(np.uint8(255*(.5+.5*n))).save(file)
    img = bpy.data.images.load(str(file))
    img.colorspace_settings.name = 'Non-Color'
    img.pack()
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = img
    normal = nodes.new('ShaderNodeNormalMap')
    normal.inputs['Strength'].default_value = strength
    links.new(tex.outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])


def materials(temp):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for key in (mesh.vertices,mesh.faces,mesh.colors,mesh.uvs,mesh.mats):
        key.clear()
    for name,rough,coat in ((STONE,.82,.045),(WEED,.54,.19),(CORAL,.72,.035),(SPONGE,.8,.02)):
        mesh.material(name,rough,coat=coat)
        for key in (mesh.vertices,mesh.faces,mesh.colors,mesh.uvs):
            key[name] = []
    n=256
    y,x=np.indices((n,n)); px,py=x/n*TAU,y/n*TAU
    strata=py*11+.34*np.sin(px*3)+.24*np.cos(px*2+py*4)
    relief=.49*np.sin(strata)+.19*np.sin(2*strata+px*5)+.13*np.sin(px*23-py*9)+rng_np.normal(0,.11,(n,n))
    for _ in range(460):
        cx,cy=rng_np.uniform(0,n,2)
        radius=rng_np.uniform(1.,5.7)
        dis=(((x-cx+n/2)%n-n/2)/radius)**2+(((y-cy+n/2)%n-n/2)/radius*1.6)**2
        relief-=np.exp(-2*dis)*rng_np.uniform(.28,1.3)
    normal_map(mesh.mats[STONE],relief,temp/'tidal-strata.png',.72)
    lichen_patch=.5+.5*np.sin(px*2+.7*np.cos(py*4))*np.sin(py*3-.9*np.cos(px))
    chalk=.84+.12*np.tanh(relief*1.6)+.06*lichen_patch
    pigment=np.stack([chalk*.90+.04*lichen_patch, chalk*.93+.06*lichen_patch, chalk*.84+.03*(1-lichen_patch)],axis=2)
    albedo=temp/'tidal-patina.jpg'
    Image.fromarray(np.uint8(255*np.clip(pigment,0,1))).save(albedo,quality=87)
    mat=mesh.mats[STONE]; nodes=mat.node_tree.nodes; links=mat.node_tree.links
    tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(albedo));tex.image.pack()
    tint=nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1
    links.new(next(n for n in nodes if n.type=='VERTEX_COLOR').outputs[0],tint.inputs[1])
    links.new(tex.outputs[0],tint.inputs[2]);links.new(tint.outputs[0],nodes.get('Principled BSDF').inputs['Base Color'])

    ridges=.27*np.cos(px*18+.15*np.sin(py*4+2*np.cos(px)))+rng_np.normal(0,.036,(n,n))
    normal_map(mesh.mats[WEED],ridges,temp/'kelp-ridges.png',.44)
    body=rng_np.normal(0,.105,(n,n))
    for _ in range(980):
        cx,cy=rng_np.uniform(0,n,2)
        rx,ry=rng_np.uniform(1,5,2)
        d=np.sqrt((((x-cx+n/2)%n-n/2)/rx)**2+(((y-cy+n/2)%n-n/2)/ry)**2)
        body+=.44*np.exp(-((d-.94)/.22)**2) -1.3*np.exp(-(d/.58)**2)
    normal_map(mesh.mats[SPONGE],body,temp/'sponge-mouths.png',.76)


def connect(mat, rows):
    for lo,hi in zip(rows,rows[1:]):
        for i in range(len(lo)-1):
            mesh.fac(mat,lo[i],lo[i+1],hi[i+1],hi[i])


def rock(x,y,radius_x,radius_y,base_z,height,phase):
    # Erosion undercuts the dark lower bands. Uneven concentric upper rings
    # continue the texture across the horizontal shelf where the plants attach.
    bands=[(0,.69),(.14,.97),(.24,1),(.31,.94),(.33,.86),(.39,.85),
           (.43,.96),(.56,.96),(.62,.91),(.65,.80),(.69,.81),(.73,.90),
           (.83,.885),(.88,.82),(.9,.72),(.95,.69),(.98,.48),(1,.24),(1,.003)]
    rows=[]; count=34
    for k,(alt,r) in enumerate(bands):
        row=[]
        for j in range(count+1):
            a=j*TAU/count
            irregular=1+.092*sin(3*a+phase)+.073*sin(5*a-phase*.41)+.047*cos(8*a+.63*phase)
            # Fractures pinch out around the sides; cleavage planes fall across
            # individual blocks at different angles instead of forming doughnut rings.
            fractured=(.5+.5*cos(2*a+phase))**1.45
            blend=max(0,min(1,(alt-.10)/.12))*max(0,min(1,(.99-alt)/.095))
            rshape=r+blend*(1-fractured)*(.93+.075*sin(phase+alt*3.9)-r)
            rshape*=1+.085*sin(a*4.0+phase+alt*3.7)*blend

            scallop=.022*cos(11*a+phase+alt*1.5)
            px=x+radius_x*rshape*(irregular+scallop)*cos(a)-.13*alt*radius_x
            py=y+radius_y*rshape*(irregular+scallop)*sin(a)+.043*alt*radius_y
            undulation=(.13*cos(a+phase*.81)+.074*cos(2*a+phase)+.043*sin(5*a-1.5*alt))*r*min(1,.28+alt*3)
            pz=base_z+height*(alt+undulation)
            grain=noise.noise(Vector((px*1.44,py*1.44,3.5*pz+.8)))
            rim=(1-.44*fractured if k in (3,4,8,9,13,14) else 1)
            lit=.59+.43*grain+.22*alt+.16*cos(a-1.8)
            topcoat=min(1,max(0,(alt-.47)*1.22+.59*grain))
            paint=(stone_low*(1-alt*.64)+stone_high*(alt*.64))*(1-topcoat)+lichen*topcoat
            uv=(j*4/count,alt*1.48) if r>.69 else (px*.55,py*.55)
            silt=np.array([.36,.267,.161])*(.10+.29*max(0,grain))*(1-topcoat)
            row.append(mesh.add(STONE,(px,py,pz),tuple((paint+silt)*lit*rim),uv))
        rows.append(row)
    connect(STONE,rows)
    mesh.fac(STONE,*reversed(rows[0][:-1]))


def blade(origin,azimuth,length,width,lift,pigment,phase):
    # The central midrib stands proud. Both margins undulate independently.
    origin=Vector(origin);along=V(cos(azimuth),sin(azimuth),0);across=V(-sin(azimuth),cos(azimuth),0)
    rows=[]
    for i in range(9):
        t=i/8;span=max(.006,sin(PI*t)**.79*(.79+.32*t))
        bend=length*.14*sin(PI*t)*sin(phase+2.3*t)
        h=lift*(.42*t+.58*sin(PI*t*.89))-.18*length*t*t
        center=origin+along*length*t+across*bend+V(0,0,h)
        row=[]
        for j,side in enumerate((-1.,-.42,0.,.42,1.)):
            twist=.34*sin(phase+t*3)
            edge=width*span*side*(1+.10*sin(phase+t*20+side))
            p=center+across*edge+V(0,0,edge*twist-width*span*abs(side)*.35+.06*width*side*sin(t*17.6+phase))
            ridge=1.18 if j==2 else .87+.07*(side+1)
            c=tuple(np.array(pigment)*ridge*(.66+.52*t))
            row.append(mesh.add(WEED,p,c,(j*.25,t)))
        rows.append(row)
    connect(WEED,rows)


def thallus(root,height,azimuth,shade,branch_count=4):
    root=Vector(root);d=V(cos(azimuth),sin(azimuth),0);perp=V(-d.y,d.x,0)
    def spine(t):
        return root+d*(height*(.16*t*t+.065*sin(t*3.1)))+perp*(.09*height*sin(t*4.1+.6)*t)+V(0,0,height*t)
    mesh.tube(WEED,[spine(i/7) for i in range(8)],[height*(.013*(1-i/7)+.002) for i in range(8)],(.085,.154,.042),6)
    for j in range(branch_count):
        t=.30+j*(.65/max(1,branch_count-1))
        scale=height*(.31-.07*t)
        leaves=4 if j==branch_count-1 else 3
        for k in range(leaves):
            a=azimuth+j*2.38+TAU*k/leaves+rng.uniform(-.15,.15)
            blade(spine(t),a,scale*rng.uniform(.73,1.19),scale*.095,scale*rng.uniform(.40,.78),shade,a*1.4)


def fan(root,height,direction,phase):
    lateral=V(cos(direction),sin(direction),0); face=V(-lateral.y,lateral.x,0)
    root=Vector(root)
    def node(p,span,radius,heading,level):
        d=lateral*sin(heading)+V(0,0,cos(heading))
        mid=p+d*(span*.51)+face*(span*.046*sin(phase+heading))
        tip=p+d*span+lateral*(span*.11*sin(phase+2*heading))
        warm=.65+.14*(4-level)
        c=(.54*warm,.126*warm,.050*warm)
        mesh.tube(CORAL,[p,mid,tip],[radius, .80*radius,.66*radius],c,5)
        if level<1:
            mesh.blob(CORAL,tip,(radius*.86,radius*.85,radius*1.25),(.64,.315,.144),3,5)
            return
        node(tip,span*.75,radius*.69,min(1.29,heading+rng.uniform(.16,.36)),level-1)
        node(mid,span*.79,radius*.65,max(-1.22,heading-rng.uniform(.26,.65)),level-1)
    for i in range(3):
        node(root+face*.017*i,height*(.35+.029*i),height*.036,(-.66,.11,.69)[i],3)


def chimney(root,height,radius,direction,phase):
    root=Vector(root);d=V(cos(direction),sin(direction),0)
    steps=[(0,.66),(.18,.99),(.42,.84),(.67,.85),(.88,.97),(.98,1.09),(1,.98),(.97,.70),(.87,.68),(.66,.52),(.60,.02)]
    rows=[]
    for k,(t,scale) in enumerate(steps):
        row=[]
        for j in range(17):
            a=j*TAU/16; w=radius*scale*(1+.09*sin(a*4+phase+t))
            p=root+d*(.34*height*t*t)+V(w*cos(a),w*sin(a),height*t+w*.11*cos(3*a+phase))
            color=(.43,.212,.052) if k<5 else (.67,.39,.116) if k<8 else (.044,.043,.016)
            row.append(mesh.add(SPONGE,p,mesh.shade(color,.82+.17*cos(a+phase)+.12*t),(j/16,t)))
        rows.append(row)
    connect(SPONGE,rows)


def plates(root,length,direction,phase):
    root=Vector(root);along=V(cos(direction),sin(direction),0);side=V(-along.y,along.x,0)
    for layer in range(4):
        reach=length*(.94-.105*layer);center=root+V(.1*layer,0,.13*layer)
        rings=[]
        for i in range(5):
            r=.005+.995*i/4;row=[]
            for j in range(23):
                a=-1.7+j*3.4/22;edge=1+.071*cos(a*8+phase+layer)+.035*sin(a*13+phase)
                p=center+reach*edge*r*(along*cos(a)+side*sin(a)*.87)
                p.z+=reach*(.09*r+.16*r*r+.049*sin(5*a+phase)*r)
                c=(.44,.167,.08) if i<4 else (.57,.272,.143)
                row.append(mesh.add(CORAL,p,mesh.shade(c,.64+.39*r+.11*sin(a*7+phase)),(j/22,r)))
            rings.append(row)
        connect(CORAL,list(reversed(rings)))


def garden():
    rock(-.18,.13,2.61,1.72,-.13,1.48,1.3)
    rock(-2.02,.36,1.65,1.31,-.16,1.00,2.6)
    rock(2.21,-.27,1.35,1.05,-.14,.99,4.05)
    rock(.58,1.53,1.58,.78,-.14,.65,6.12)
    rock(-.93,-1.12,1.50,.85,-.12,.66,3.3)
    rock(-.63,.21,1.54,1.18,1.10,.62,.17)
    rock(1.13,.35,1.02,.78,.98,.52,2.72)
    # A patchwork of crustose moss, algae tufts and holdfasts bridges the ledge seams.
    beds=[(-.65,.11,1.69,.68,.48),(-2.15,.44,.86,.65,.5),(1.12,.40,1.46,.40,.28),(2.29,-.22,.84,.61,.40),(-.94,-1.12,.50,.66,.40)]
    for x,y,z,a,b in beds:
        for _ in range(13):
            theta=rng.uniform(0,TAU);rad=rng.uniform(.16,.93);w=rng.uniform(.10,.23)
            px=x+a*rad*cos(theta);py=y+b*rad*sin(theta)
            mesh.blob(WEED,(px,py,z-.13*rad), (w,w*rng.uniform(.62,1.04),w*.29),(.115+rng.uniform(0,.045),.205+rng.uniform(0,.09),.060),3,8,.19)
    # Distinct canopy heights produce open water between the long silhouettes.
    for x,y,z,h,a in [(-.69,.35,1.67,1.93,.25),(-.16,.20,1.58,1.42,1.3),(-1.09,.11,1.63,1.44,1.85),
                      (.71,.50,1.33,1.48,.76),(1.25,.51,1.43,1.32,.13),(-1.95,.57,.83,1.23,3.3),
                      (2.16,-.06,.84,.84,2.04),(-2.37,.01,.80,.73,2.77)]:
        thallus((x,y,z),h,a,(.154,.29,.077),4 if h>1 else 3)
    for i,(x,y,z,h,az) in enumerate([(-2.65,-.30,.51,.86,.19),(-1.88,-.69,.68,.81,-.31),
                                      (.93,-.87,.99,.76,.27),(1.66,-.47,.93,1.10,.16),(-1.32,-.15,1.52,.98,-.22),(-.05,-.54,1.50,.58,.36)]):
        fan((x,y,z),h,az,2.3*i)
    for i,(x,y,z) in enumerate([(-1.08,-1.27,.47),(-2.44,.62,.69),(2.19,-.58,.73)]):
        for q in range(4):
            a=q*2.4+i;sz=rng.uniform(.115,.175)
            chimney((x+.21*cos(a),y+.20*sin(a),z-.06),rng.uniform(.29,.56),sz,a,a+.27)
    for x,y,z,size,angle in [(-1.89,-.83,.53,.55,-1.9),(1.64,-.73,.59,.56,-.84),(.49,-1.06,.69,.48,-1.61)]:
        plates((x,y,z),size,angle,x+.52)
    # Broken stones, young russet fans, and lush feather algae settle into sheltered pockets.
    for x,y,z,rx,ry,rz in [(-2.84,-.53,.13,.65,.45,.43),(-1.96,-1.05,.12,.51,.45,.36),
            (-1.38,-1.62,.13,.61,.32,.30),(.16,-1.47,.13,.7,.4,.37),(.61,-1.33,.23,.41,.40,.44),
            (2.85,-.61,.15,.65,.38,.33),(3.15,.22,.08,.48,.3,.28),(-1.14,.74,1.52,.45,.30,.29)]:
        mesh.blob(STONE,(x,y,z),(rx,ry,rz),(.135,.162,.098),5,10,.42)
    for j in range(24):
        a=rng.uniform(0,TAU);x=rng.uniform(-2.85,2.65);y=-1.7+.17*sin(x)+rng.uniform(-.16,.13);r=rng.uniform(.035,.14)
        mesh.blob(STONE,(x,y,.025),(r,r*.78,r*.46),(.202,.208,.136),3,6,.34)
    for x,y,z,h,az in [(-2.41,-.51,.69,.76,2.7),(-1.45,-.69,.74,.91,3.14),(.53,-.75,1.00,.70,2.2),(1.62,-.16,1.11,1.7,.35)]:
        along=V(cos(az),sin(az),0);perp=V(-sin(az),cos(az),0);root=V(x,y,z)
        def spine(t):
            return root+along*h*(.52*t+.1*sin(PI*t))+V(0,0,h*(.81*t+.12*sin(t*PI)))
        mesh.tube(WEED,[spine(i/7) for i in range(8)],[h*(.014*(1-i/7)+.0015) for i in range(8)],(.14,.252,.057),5)
        for k in range(10):
            t=.10+.83*k/10
            for sign in [-1,1]:
                angle=az+sign*(1.35-.55*t)
                l=h*(.28+.09*sin(t*PI))*(1-t)**.45
                blade(spine(t),angle,l,.033*h,.26*l,(.181,.29,.053),angle+t)
    for x,y,z,spread in [(-1.30,-.13,1.50,.31),(-.81,-.48,1.47,.33),(.28,-.66,1.24,.26),(1.62,-.31,1.07,.42),(-2.26,-.39,.67,.32),(-2.69,.18,.75,.32),(-.64,-.26,1.65,.33),(2.34,.09,.75,.34),(.89,.30,1.44,.25),(-1.46,-.85,.50,.30)]:
        for j in range(16):
            a=j*2.41;rad=rng.uniform(0,spread);l=rng.uniform(.18,.48)
            blade((x+rad*cos(a),y+rad*sin(a),z-.04),a,l,l*.14,l*.92,(.22,.32,.080),a+.22)


def pack_pigment(path):
    # Blender exports a white primary color set for mixed color nodes; glTF PBR
    # expects the mesh pigment in COLOR_0 when multiplying it by the patina map.
    data=path.read_bytes()
    length=struct.unpack_from('<I',data,12)[0]
    doc=json.loads(data[20:20+length])
    binary=data[28+length:]
    views=doc['bufferViews']
    chunks=[binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']] for v in views]
    for obj in doc['meshes']:
        for primitive in obj['primitives']:
            attrib=primitive['attributes']
            if 'COLOR_1' in attrib:
                attrib['COLOR_0']=attrib.pop('COLOR_1')
            access=doc['accessors'][attrib['COLOR_0']]
            i=access['bufferView']
            channels={'VEC3':3,'VEC4':4}[access['type']]
            dtype={5121:'u1',5123:'<u2',5126:'<f4'}[access['componentType']]
            color=np.frombuffer(chunks[i],dtype=dtype,count=access['count']*channels,offset=access.get('byteOffset',0)).reshape(-1,channels)
            if color.dtype.kind!='f':
                color=color/np.iinfo(color.dtype).max
            # Four components keep each normalized color vertex 4-byte aligned.
            if channels==3:
                color=np.column_stack((color,np.ones(len(color))))
            chunks[i]=np.rint(np.clip(color,0,1)*255).astype('uint8').tobytes()
            access.update(componentType=5121,normalized=True,type='VEC4',byteOffset=0)
            views[i].pop('byteStride',None)
    result=bytearray()
    for v,c in zip(views,chunks):
        result.extend(b'\x00'*(-len(result)%4))
        v['byteOffset']=len(result);v['byteLength']=len(c);result.extend(c)
    doc['buffers'][0]['byteLength']=len(result)
    result.extend(b'\x00'*(-len(result)%4))
    header=json.dumps(doc,separators=(',',':')).encode()
    header+=b' '*(-len(header)%4)
    path.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(header)+len(result))+struct.pack('<I4s',len(header),b'JSON')+header+struct.pack('<I4s',len(result),b'BIN\x00')+result)


if __name__=='__main__':
    with tempfile.TemporaryDirectory(prefix='mawseed-tidegarden-') as directory:
        materials(Path(directory))
        garden()
        entry=mesh.export('tidegarden')
        pack_pigment(mesh.D/'tidegarden.glb')
    manifest=mesh.D/'habitat.json'
    contents=json.loads(manifest.read_text())
    contents['tidegarden']=entry
    manifest.write_text(json.dumps(contents,indent=2)+'\n')
    print('TIDEGARDEN',entry)
