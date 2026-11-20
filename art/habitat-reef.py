"""Build the shell bed and tube sponge. Run with Blender --background --python art/habitat-reef.py."""
import importlib.util
import json
import math
import tempfile
from pathlib import Path

import bpy
import numpy as np
from PIL import Image
from mathutils import Vector

source = Path(__file__).with_name('habitat-props.py')
spec = importlib.util.spec_from_file_location('habitat_props', source)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
V = base.V
TAU = math.tau


def blend(a, b, amount):
    amount = max(0, min(1, amount))
    return tuple(x + (y - x) * amount for x, y in zip(a, b))


def prepare(materials):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for table in (base.vertices, base.faces, base.colors, base.uvs, base.mats):
        table.clear()
    for name, roughness, metallic, coat in materials:
        base.material(name, roughness, metallic, coat=coat)
        for table in (base.vertices, base.faces, base.colors, base.uvs):
            table[name] = []


def normal_texture(material, height, path, strength):
    """Pack a periodic tangent-space microrelief map into the exported material."""
    dx = np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)
    dy = np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)
    normals = np.stack((-dx, dy, np.ones_like(dx)), axis=2)
    normals /= np.linalg.norm(normals, axis=2, keepdims=True)
    Image.fromarray(np.uint8((normals * .5 + .5) * 255)).save(path)
    image = bpy.data.images.load(str(path))
    image.colorspace_settings.name = 'Non-Color'
    image.pack()
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = image
    relief = nodes.new('ShaderNodeNormalMap')
    relief.inputs['Strength'].default_value = strength
    links.new(texture.outputs['Color'], relief.inputs['Color'])
    links.new(relief.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])


def quad_grid(material, rows):
    for low, high in zip(rows, rows[1:]):
        for j in range(len(low) - 1):
            base.fac(material, low[j], low[j+1], high[j+1], high[j])


def shell_valve(origin, length, yaw, pitch, palette, ribs, columns, rows, phase):
    """Build both surfaces of a fluted valve, joined around its scalloped lip."""
    hinge = Vector(origin)
    side = V(math.cos(yaw), math.sin(yaw), 0)
    direction = V(-math.sin(yaw) * math.cos(pitch), math.cos(yaw) * math.cos(pitch), math.sin(pitch))
    normal = side.cross(direction).normalized()
    layers = []
    for inner in (False, True):
        material = 'nacre' if inner else 'fluted calcite'
        grid = []
        radial_steps = max(4, rows // 2) if inner else rows
        for i in range(radial_steps + 1):
            t = .035 + .965 * i / radial_steps
            ring = []
            for j in range(columns + 1):
                u = j / columns
                theta = (2*u - 1) * 1.14
                rib = (.5 + .5 * math.cos(TAU * (u * ribs + .075 * math.sin(t * 3.7 + phase)))) ** 1.7
                rim = 1 - .20 * abs(2*u - 1)**2 + .032 * rib
                fan = math.sin(theta) * t * rim * .99
                radial = math.cos(theta) * t * rim
                dome = .22 * math.sin(math.pi*t)**.87 * (.65 + .35*math.cos(theta))
                thickness = .021 + .022 * math.sin(math.pi*t)
                z = dome + t**.73 * rib * (.053 if not inner else .031)
                if inner:
                    z -= thickness
                point = hinge + length * (side*fan + direction*radial + normal*z)
                band = (.5 + .5*math.sin(TAU*(3.45*t+.22*math.cos(theta*4+phase))))**6
                if inner:
                    color = blend((.38,.34,.34),(.79,.73,.57),.36+.52*t+.065*math.sin(5*theta+phase))
                else:
                    color = blend(palette, (.91,.72,.47), .1 + .36 * rib + .23 * band + .23*t**5)
                    color = base.shade(color,.86+.12*math.cos(theta*3+phase))
                ring.append(base.add(material, point, color, (u, t)))
            grid.append(ring)
        # u travels toward +x and t travels away from the hinge.
        quad_grid(material, list(reversed(grid)) if inner else grid)
        layers.append(grid)
    rim_outer, rim_inner = layers[0][-1], layers[1][-1]
    for j in range(columns):
        ids = []
        for mat, idx in [('fluted calcite',rim_outer[j]),('nacre',rim_inner[j]),('nacre',rim_inner[j+1]),('fluted calcite',rim_outer[j+1])]:
            ids.append(base.add('nacre',base.vertices[mat][idx],(.75,.57,.37)))
        base.fac('nacre',*ids)


def shells(directory):
    prepare([('fluted calcite',.46,.035,.14),('nacre',.29,.13,.35),('shell gravel',.84,.014,.035)])
    y,x = np.indices((160,160))/160
    grain = np.random.default_rng(715).normal(0,.055,x.shape)
    layer = np.sin(TAU * (y * 31 + .17*np.sin(TAU*x*3) + .06*np.sin(TAU*x*7)))
    growth = ((layer + 1)*.5)**5 + .16*np.sin(TAU*x*51) + grain
    normal_texture(base.mats['fluted calcite'], growth, directory/'shell-lamellae.png', .42)
    specs = [
        ((-.29,.025,.11),1.42,-.18,1.03,(.42,.084,.041),13,52,11,.2),
        ((.43,-.17,.09),1.01,-.84,.55,(.35,.18,.083),10,40,10,1.8),
        ((.47,-.13,.10),.95,-.80,1.17,(.53,.23,.12),10,40,9,1.5),
        ((-.91,-.10,.07),.73,1.09,.49,(.23,.18,.219),9,36,8,3.1),
        ((.06,-.57,.07),.68,-2.22,.23,(.39,.105,.078),10,40,8,.6),
        ((.93,.10,.035),.51,-1.08,.38,(.46,.26,.11),8,32,7,2.5),
    ]
    for spec_ in specs:
        shell_valve(*spec_)

    # A low, uneven calcareous bed catches the shell hinges and scattered fragments.
    stone = (.082,.123,.093)
    for x,y,rx,ry,rz in [(0,.07,1.15,.61,.13),(-.82,-.16,.48,.32,.11),(.75,.02,.55,.38,.10),(.0,-.43,.45,.34,.085)]:
        base.blob('shell gravel',(x,y,.018),(rx,ry,rz),stone,5,13,.23)
    scatter = np.random.default_rng(242)
    for _ in range(27):
        angle = scatter.uniform(0,TAU)
        spread = scatter.uniform(.62,1)
        x = 1.18*spread*math.cos(angle)
        y = .54*spread*math.sin(angle)
        z = .012+.115*math.sqrt(max(0,1-spread**2))
        radius = scatter.uniform(.027,.076)
        shade = blend(stone,(.44,.36,.245),scatter.uniform(.19,.84))
        base.blob('shell gravel',(x,y,z),(radius,radius*.81,radius*.51),shade,3,6,.24)


def sponge_relief(directory):
    """A wrapping field of minute ostia and raised circular filaments."""
    n = 192
    y,x = np.indices((n,n))
    rng = np.random.default_rng(4191)
    h = rng.normal(0,.07,(n,n))
    for _ in range(530):
        cx,cy = rng.uniform(0,n,2)
        rx = rng.uniform(1.1,4.6)
        ry = rx*rng.uniform(.62,1.3)
        dx = (x-cx+n/2)%n-n/2
        dy = (y-cy+n/2)%n-n/2
        dist = np.sqrt((dx/rx)**2+(dy/ry)**2)
        h += .48*np.exp(-((dist-.94)/.22)**2) - 1.2*np.exp(-(dist/.62)**2)
    normal_texture(base.mats['spongin'], h, directory/'sponge-ostia.png', .65)


def chimney(root, tip, radius, palette, phase):
    root,tip = Vector(root),Vector(tip)
    axis = (tip-root).normalized()
    right = axis.cross(V(0,-1,0)).normalized()
    up = axis.cross(right).normalized()
    bend = V(.085*math.cos(phase),.10*math.sin(phase),0)
    def frame(t):
        return root.lerp(tip,t)+bend*math.sin(math.pi*t)
    # Tuck the upper walls inward below the bright rounded rim. Their dark throat is actual geometry.
    cross_sections = [(0,.73),(.08,.94),(.24,.82),(.40,.91),(.56,.86),(.72,.90),(.84,.98),(.94,1.09),(1,1.10),(.99,.88),(.94,.77),(.86,.74),(.70,.66),(.57,.52),(.55,.025)]
    grid = []
    for i,(t,width) in enumerate(cross_sections):
        row = []
        for j in range(21):
            u = j/20
            a = TAU*u
            radial = right*math.cos(a)+up*math.sin(a)
            irregular = 1 + .068*math.sin(3*a+phase+t*2)+.027*math.cos(7*a-phase+1.7*t)
            lip = axis*(radius*.10*math.cos(3*a+phase)*t**4)
            point = frame(t)+radius*width*irregular*radial+lip
            if i < 9:
                rim = .66*t**8
                color = blend(palette,(.85,.54,.18),rim)
                fleck = .88+.13*math.sin(6*a-3*t+phase)*math.cos(8*t+phase)+.058*math.sin(11*a+18*t+phase)
                color = base.shade(color, fleck * (.64+.36*math.sqrt(t)))
            else:
                color = blend((.027,.009,.007),base.shade(palette,.9),t**11)
            row.append(base.add('spongin', point, color, (u*2.25,t*2.2)))
        grid.append(row)
    quad_grid('spongin',grid)
    base.fac('spongin',*grid[-1][:-1])


def sponges(directory):
    prepare([('spongin',.71,0,.045)])
    sponge_relief(directory)
    base.blob('spongin',(0,.02,.095),(.68,.40,.17),(.216,.068,.035),7,17,.18)
    chimneys = [
        ((-.10,.05,.10),(-.22,.07,1.63),.234,(.48,.15,.052),.4),
        ((-.18,.058,.59),(-.79,-.03,1.14),.199,(.48,.125,.042),1.7),
        ((-.17,.08,.87),(.12,.27,1.40),.15,(.43,.126,.065),2.9),
        ((.23,.10,.08),(.65,.09,1.21),.25,(.52,.198,.051),3.1),
        ((.34,.11,.49),(.92,.03,.74),.159,(.55,.17,.054),4.4),
        ((-.30,-.04,.045),(-.55,-.30,.74),.208,(.44,.116,.055),.8),
        ((.18,-.06,.08),(.20,-.48,.68),.202,(.42,.09,.05),5.4),
        ((.44,-.09,.055),(.69,-.36,.49),.115,(.50,.138,.054),1.9),
    ]
    for values in chimneys:
        chimney(*values)


with tempfile.TemporaryDirectory(prefix='habitat-reef-') as temp:
    manifest = base.D / 'habitat.json'
    entries = json.loads(manifest.read_text()) if manifest.exists() else {}
    for name, build in [('shell', shells), ('sponge', sponges)]:
        build(Path(temp))
        entries[name] = base.export(name)
    manifest.write_text(json.dumps(entries, indent=2))
