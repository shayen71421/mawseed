"""Sculpt six lightweight botanical/geological props, export glTF, and bake fallback portraits."""
import bpy, math, random, os, json
from PIL import Image
from pathlib import Path
from mathutils import Vector, noise
from bpy_extras.object_utils import world_to_camera_view
from math import sin, cos, pi
D = Path(os.environ.get('HABITAT_OUTPUT', Path(__file__).resolve().parents[1] / 'dist/assets/habitat'))
rng = random.Random(15471)
TAU = 2 * pi
vertices = {}
faces = {}
colors = {}
uvs = {}
mats = {}

def V(x, y, z):
    return Vector((x, y, z))

def shade(color, m):
    return tuple((max(0.003, min(1, v * m)) for v in color))

def material(name, roughness, metal=0, em=0, coat=0, albedo=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n = m.node_tree.nodes
    links = m.node_tree.links
    p = n.get('Principled BSDF')
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metal
    p.inputs['Coat Weight'].default_value = coat
    col = n.new('ShaderNodeVertexColor')
    col.layer_name = 'Pigment'
    if albedo:
        tex = n.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load('/tmp/habitat-' + albedo + '.jpg', check_existing=True)
        tex.image.pack()
        mul = n.new('ShaderNodeMixRGB')
        mul.blend_type = 'MULTIPLY'
        mul.inputs[0].default_value = 0.68
        links.new(col.outputs[0], mul.inputs[1])
        links.new(tex.outputs[0], mul.inputs[2])
        links.new(mul.outputs[0], p.inputs['Base Color'])
    else:
        links.new(col.outputs[0], p.inputs['Base Color'])
    if em:
        links.new(col.outputs[0], p.inputs['Emission Color'])
        p.inputs['Emission Strength'].default_value = em
    mats[name] = m

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    vertices.clear()
    faces.clear()
    colors.clear()
    uvs.clear()
    mats.clear()
    for name, rough, metal, em, coat, tex in [('mineral', 0.79, 0.04, 0, 0.13, 'stone'), ('wood', 0.78, 0, 0, 0.02, 'bark'), ('foliage', 0.49, 0, 0, 0.2, None), ('stem', 0.61, 0, 0, 0.09, None), ('wax', 0.28, 0.07, 0.055, 0.46, None), ('polyp', 0.3, 0.02, 0.55, 0.36, None), ('gill', 0.55, 0, 0.18, 0.13, None)]:
        material(name, rough, metal, em, coat, tex)
        vertices[name] = []
        faces[name] = []
        colors[name] = []
        uvs[name] = []

def add(mat, pt, color, uv=(0, 0)):
    i = len(vertices[mat])
    vertices[mat].append(tuple(pt))
    colors[mat].append((*color, 1))
    uvs[mat].append(uv)
    return i

def fac(mat, *ids):
    faces[mat].append(ids)

def tube(mat, path, radii, palette, sides=7):
    path = list(map(Vector, path))
    rngphase = rng.uniform(0, TAU)
    rings = []
    length = 0
    for i, (pt, r) in enumerate(zip(path, radii)):
        axis = (path[min(len(path) - 1, i + 1)] - path[max(i - 1, 0)]).normalized()
        ref = V(0, 1, 0) if abs(axis.y) < 0.92 else V(1, 0, 0)
        right = axis.cross(ref).normalized()
        up = axis.cross(right).normalized()
        row = []
        if i:
            length += (pt - path[i - 1]).length
        color = palette(i / (len(path) - 1)) if callable(palette) else palette
        for j in range(sides + 1):
            a = TAU * j / sides
            row.append(add(mat, pt + (cos(a) * right + sin(a) * up) * r * (1 + 0.045 * sin(3 * a + rngphase)), shade(color, 0.82 + 0.18 * cos(a - rngphase)), (j / sides, length * 0.5)))
        rings.append(row)
    for i in range(len(rings) - 1):
        for j in range(sides):
            fac(mat, rings[i][j], rings[i][j + 1], rings[i + 1][j + 1], rings[i + 1][j])
    fac(mat, *reversed(rings[0][:-1]))
    fac(mat, *rings[-1][:-1])

def blob(mat, center, r, base, rings=8, segments=14, jag=0):
    center = Vector(center)
    rows = []
    seed = V(*[rng.random() * 12 for _ in range(3)])
    for i in range(rings + 1):
        v = pi * i / rings
        row = []
        for j in range(segments + 1):
            u = TAU * j / segments
            n = V(sin(v) * cos(u), sin(v) * sin(u), cos(v))
            b = noise.noise_vector(n * 2.1 + seed)[0]
            shape = 1 + jag * b
            p = center + V(n.x * r[0], n.y * r[1], n.z * r[2]) * shape
            c = base(n, b) if callable(base) else shade(base, 1 + 0.16 * b)
            row.append(add(mat, p, c, (j / segments * 2, i / rings)))
        rows.append(row)
    for i in range(rings):
        for j in range(segments):
            fac(mat, rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1])

def leaf(base, tip, width, main, mid, flex=0.25, segments=9, ripple=0.07):
    a = Vector(base)
    tip = Vector(tip)
    span = tip - a
    right = span.cross(V(0, 0, 1))
    if right.length < 0.1:
        right = V(1, 0, 0)
    right.normalize()
    normal = right.cross(span).normalized()
    rings = []
    for i in range(segments + 1):
        t = i / segments
        s = sin(pi * t)
        p = a + span * t + normal * (flex * s)
        half = max(0.001, width * s ** 0.67 * (1 + ripple * sin(t * TAU * 3)))
        row = []
        for j in range(5):
            w = (j - 2) * 0.5
            c = mid if j == 2 else shade(main, 0.8 + 0.22 * sin(t * pi) * (1.1 if j % 2 else 0.62))
            row.append(add('foliage', p + right * (half * w) + normal * (0.15 * half * (1 - abs(w))), c, (w * 0.5 + 0.5, t)))
        rings.append(row)
    for i in range(segments):
        for j in range(4):
            fac('foliage', rings[i][j], rings[i + 1][j], rings[i + 1][j + 1], rings[i][j + 1])

def rock():
    for j, (x, y, z, a, b, c) in enumerate([(0, 0.08, 0.43, 1.13, 0.68, 0.64), (-0.73, -0.1, 0.22, 0.71, 0.5, 0.34), (0.82, -0.34, 0.16, 0.57, 0.4, 0.29), (0.31, 0.73, 0.12, 0.51, 0.4, 0.26), (-0.7, -0.7, 0.07, 0.28, 0.22, 0.13)]):

        def mineral(n, q):
            green = max(0, min(0.88, (n.z - 0.27 + 0.65 * q) * 1.25))
            return tuple(((v * (1 - green) + w * green) * (0.82 + 0.2 * q) for v, w in zip((0.29, 0.34, 0.3), (0.22, 0.39, 0.14))))
        blob('mineral', (x, y, z), (a, b, c), mineral, 12, 23, 0.24)
    # Encrusting rock lichen bloom, grouped to read even at low scale
    for i in range(36):
        a = rng.uniform(0, TAU)
        rad = rng.uniform(0.12, 0.72)
        x, y = (cos(a) * rad, sin(a) * rad * 0.59)
        z = 0.43 + 0.62 * math.sqrt(max(0.01, 1 - (x / 1.13) ** 2 - (y / 0.68) ** 2))
        blob('wax', (x, y + 0.08, z), (0.038, 0.032, 0.009), (0.59, 0.6, 0.27), 3, 6, 0.16)

def coral():
    # Planar sea fan: reticulated saffron branches, small pale flowering polyps on terminal tips.
    blob('mineral', (0, 0, 0.1), (0.39, 0.3, 0.16), (0.23, 0.24, 0.19), 6, 11, 0.22)
    levels = [[(0, 0, 0.09)]]
    rows = [1, 3, 5, 7, 9, 11, 13]
    for k, n in enumerate(rows[1:], 1):
        row = []
        for j in range(n):
            q = (j / (n - 1) - 0.5) * 2
            h = k / 6
            x = q * (0.16 + 1.3 * h ** 0.77) + rng.uniform(-0.055, 0.055)
            z = 0.16 + h * (2.15 - 0.67 * q * q) + rng.uniform(-0.035, 0.035)
            y = 0.15 * sin(x * 2 + h * 4) + rng.uniform(-0.055, 0.055)
            row.append((x, y, z))
        levels.append(row)
    for k in range(1, len(levels)):
        prev = levels[k - 1]
        row = levels[k]
        for j, b in enumerate(row):
            parent = round(j / (len(row) - 1) * (len(prev) - 1))
            a = prev[parent]
            A, B = (Vector(a), Vector(b))
            mid = A.lerp(B, 0.48) + V(rng.uniform(-0.07, 0.07), 0.028, rng.uniform(-0.022, 0.03))
            r = 0.12 * (1 - k / 8) ** 1.4 + 0.009
            hue = (0.48 + 0.046 * k, 0.1 + 0.031 * k, 0.038 + 0.018 * k)
            tube('wax', [a, mid, b], [r, r * 0.87, r * 0.7], hue, 7)
            if k > 2 and j > 0 and ((j + k) % 3 != 0):
                N = Vector(row[j - 1])
                mid = (B + N) * 0.5 + V(0.018, 0, -0.104)
                tube('wax', [b, mid, N], [r * 0.52, r * 0.42, r * 0.5], shade(hue, 1.14), 6)
            if k >= 4:
                for l in range(2):
                    p = A.lerp(B, 0.48 + 0.35 * l)
                    end = p + V(rng.choice([-1, 1]) * rng.uniform(0.055, 0.13), -0.024, rng.uniform(0.04, 0.15))
                    tube('wax', [p, end], [0.015, 0.006], (0.82, 0.43, 0.17), 5)
                    blob('polyp', end, (0.023, 0.022, 0.032), (0.93, 0.67, 0.27), 4, 6)

def kelp():
    for g in range(7):
        a = g * TAU / 7
        h = rng.uniform(1.5, 3.3)
        base = V(0.13 * cos(a), 0.13 * sin(a), 0.025)
        direction = V(cos(a), sin(a), 0)
        line = []
        for j in range(13):
            v = j / 12
            line.append(base + V(0.15 * sin(5 * v + a) + 0.32 * v, 0.16 * sin(4 * v + a), h * v) + direction * (0.27 * v))
        tube('stem', line, [0.032 * (1 - 0.66 * j / 12) for j in range(13)], (0.11, 0.21, 0.07), 6)
        for j in range(2, 12):
            v = j / 12
            axis = Vector(line[j])
            vec = V(cos(a + j * 2.55), sin(a + j * 2.55), 0.8)
            tip = axis + vec * (0.28 + 0.32 * sin(v * pi)) + V(0.1, 0.0, 0.25)
            leaf(axis, tip, 0.094 + 0.064 * sin(v * pi), (0.06 + 0.11 * v, 0.26 + 0.15 * v, 0.11 + 0.055 * v), (0.27, 0.44, 0.13), 0.14, 6, 0.12)
        blob('wax', line[9], (0.067, 0.053, 0.09), (0.48, 0.34, 0.11), 6, 9)

def reed():
    for i in range(17):
        a = rng.uniform(0, TAU)
        r = rng.uniform(0, 0.29)
        h = rng.uniform(0.8, 2)
        v = V(cos(a), sin(a), 0)
        b = v * r
        tip = b + v * rng.uniform(0.12, 0.56) + V(0, 0, h)
        leaf(b, tip, rng.uniform(0.032, 0.071), (0.2, 0.31, 0.11), (0.48, 0.54, 0.18), 0.13, 9)
    for i in range(5):
        a = i * 1.25
        r = rng.uniform(0.12, 0.32)
        h = rng.uniform(1.5, 2.45)
        b = V(cos(a) * r, sin(a) * r, 0)
        t = b + V(0.17 * cos(a), 0.16 * sin(a), h)
        tube('stem', [b, b.lerp(t, 0.55) + V(-0.04, 0, 0.06), t], [0.024, 0.021, 0.015], (0.35, 0.44, 0.16), 6)
        blob('wax', t - V(0, 0, 0.11), (0.057, 0.057, 0.21), (0.42, 0.21, 0.072), 10, 12, 0.06)

def mushroom():
    for i, (x, y, h, r) in enumerate([(0, 0.03, 1.56, 0.75), (-0.62, 0.15, 0.86, 0.43), (0.53, -0.16, 0.54, 0.33), (-0.48, -0.38, 0.32, 0.18)]):
        stem = [V(x + 0.13 * sin(t * 2.1 + i) * t, y + 0.06 * t, h * t) for t in [0, 0.22, 0.52, 0.8, 1]]
        tube('stem', stem, [0.112, 0.09, 0.061, 0.061, 0.081], (0.48, 0.53, 0.34), 9)
        c = stem[-1]
        ringids = []
        for ring in range(9):
            f = ring / 8
            rr = sin(f * pi / 2) * r
            row = []
            for k in range(41):
                a = k * TAU / 40
                s = sin(a * 8 + i) + 0.6 * sin(a * 13 + 0.4)
                z = 0.36 * r * (1 - f ** 1.5) + 0.035 * r * s * f ** 2
                color = (0.22 + 0.25 * f, 0.23 + 0.19 * f, 0.4 + 0.17 * f)
                row.append(add('wax', c + V(cos(a) * rr * (1 + 0.037 * s), sin(a) * rr, z), shade(color, 1 + 0.08 * sin(a * 4))))
            ringids.append(row)
        for j in range(8):
            for k in range(40):
                fac('wax', ringids[j][k], ringids[j + 1][k], ringids[j + 1][k + 1], ringids[j][k + 1])
        for k in range(34):
            a = TAU * k / 34
            Z = 0.02 * r * (sin(a * 8) + 0.6 * sin(a * 13 + 0.4))
            side = V(cos(a), sin(a), 0)
            tube('gill', [c + side * 0.065, c + side * r * 0.53 + V(0, 0, -0.06 * r), c + side * r * 0.97 + V(0, 0, Z)], [0.027 * r, 0.022 * r, 0.008 * r], (0.7, 0.63, 0.46), 4)
        for k in range(14):
            a = rng.uniform(0, TAU)
            t = rng.uniform(0.2, 0.83)
            p = c + V(r * cos(a) * t, r * sin(a) * t, 0.36 * r * (1 - (math.asin(t) / (pi / 2)) ** 1.5))
            blob('polyp', p, (r * 0.029, r * 0.024, r * 0.01), (0.83, 0.71, 0.44), 3, 6)

def tree():
    # Wind-shaped grove sentinel: exposed buttress roots support a twisting trunk and flattened crowns.
    trunk = [V(0, 0, 0), V(-0.11, 0.07, 0.6), V(0.07, 0.04, 1.75), V(0.31, 0.07, 2.75), V(0.13, 0, 3.9), V(-0.11, 0.17, 4.85), V(0.04, 0.06, 5.67)]
    tube('wood', trunk, [0.71, 0.49, 0.37, 0.31, 0.24, 0.14, 0.065], (0.53, 0.48, 0.36), 13)
    for i in range(9):
        a = i * TAU / 9 + 0.21 * rng.random()
        s = V(cos(a), sin(a), 0)
        tube('wood', [s * 0.23 + V(0, 0, 1.07), s * 0.57 + V(0, 0, 0.45), s * 1.11 + V(0, 0, 0.13), s * 1.56], [0.28, 0.23, 0.13, 0.023], (0.54, 0.47, 0.35), 8)

    def limb(p, a, L, order):
        end = p + V(cos(a) * L, sin(a) * L, L * 0.36)
        mid = p + V(cos(a + 0.22) * L * 0.45, sin(a + 0.22) * L * 0.45, L * 0.27)
        tube('wood', [p, mid, end], [0.085 * order, 0.055 * order, 0.035 * order], (0.55, 0.49, 0.34), 7)
        if order > 1:
            for d in [-0.74, 0.53]:
                limb(end, a + d, L * 0.54, order - 1)
        else:
            for j in range(7):
                az = a + j * 2.399
                ext = 0.19 + random.Random(j + 4).random() * 0.5
                pt = end + V(cos(az) * ext, sin(az) * ext, 0)
                blob('foliage', pt, (0.59, 0.47, 0.22), lambda n, v: shade((0.17, 0.32, 0.135), 0.94 + 0.3 * n.z + 0.22 * v), 5, 9, 0.27)
            for j in range(12):
                az = j * 2.399
                pt = end + V(0.62 * cos(az), 0.53 * sin(az), 0.13)
                leaf(pt, pt + V(0.27 * cos(az), 0.25 * sin(az), -0.1), 0.063, (0.26, 0.43, 0.16), (0.43, 0.5, 0.17), 0.025, 3)
    for i in range(7):
        a = i * 2.399
        limb(trunk[3 + i % 3], a, 1.05 + 0.39 * sin(i + 1), 2)
    blob('foliage', trunk[-1], (0.95, 0.79, 0.27), (0.25, 0.4, 0.16), 7, 13, 0.23)

def geometry():
    out = []
    for name, verts in vertices.items():
        if not verts:
            continue
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces[name])
        me.update()
        co = me.color_attributes.new(name='Pigment', type='FLOAT_COLOR', domain='POINT')
        co.data.foreach_set('color', [f for c in colors[name] for f in c])
        uv = me.uv_layers.new(name='UVMap')
        for poly in me.polygons:
            poly.use_smooth = True
            for k in poly.loop_indices:
                uv.data[k].uv = uvs[name][me.loops[k].vertex_index]
        ob = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(ob)
        ob.data.materials.append(mats[name])
        out.append(ob)
    return out

def lamp(name, pos, color, power, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.shape = 'DISK'
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = pos
    return obj

def export(name, resolution=384, write_model=True):
    scene = bpy.context.scene
    obs = geometry()
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    if write_model:
        bpy.ops.export_scene.gltf(filepath=str(D / (name + '.glb')), export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_extras=False)
    points = [Vector(p) for Verts in vertices.values() for p in Verts]
    low = Vector([min((p[i] for p in points)) for i in range(3)])
    high = Vector([max((p[i] for p in points)) for i in range(3)])
    mid = (low + high) / 2
    # Fixed-key side portrait, 11 degrees above the horizon to match the game camera.
    camdat = bpy.data.cameras.new('Field camera')
    cam = bpy.data.objects.new('Field camera', camdat)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam
    ray = V(0.34, -1, 0.24).normalized()
    cam.location = mid + ray * 15
    cam.rotation_euler = (mid - cam.location).to_track_quat('-Z', 'Y').to_euler()
    camdat.type = 'ORTHO'
    camdat.clip_end = 100
    bpy.context.view_layer.update()
    right = cam.matrix_world.to_quaternion() @ V(1, 0, 0)
    up = cam.matrix_world.to_quaternion() @ V(0, 1, 0)
    xs = [(p - mid).dot(right) for p in points]
    ys = [(p - mid).dot(up) for p in points]
    span = 1.12 * max(max(xs) - min(xs), max(ys) - min(ys))
    camdat.ortho_scale = span
    cam.location += right * ((max(xs) + min(xs)) / 2) + up * ((max(ys) + min(ys)) / 2)
    size = max(2.5, span)
    target = mid
    for L in [lamp('Key', mid + V(-3.1, -4.5, 5) * size, (1, 0.88, 0.7), size * size * 610, size * 2.7), lamp('Fill', mid + V(3, -2, 1.4) * size, (0.55, 0.84, 1), size * size * 280, size * 2.8), lamp('Rim', mid + V(1.5, 2.9, 3.3) * size, (0.72, 1, 0.88), size * size * 690, size * 2.1)]:
        L.rotation_euler = (target - L.location).to_track_quat('-Z', 'Y').to_euler()
    world = bpy.data.worlds.new('Ambient')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.4, 0.54, 0.55, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.49
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 16
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 3
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 3
    scene.render.film_transparent = True
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = '/tmp/habitat-' + name + '.png'
    scene.view_settings.view_transform = 'AgX'
    bpy.context.view_layer.update()
    anchor = world_to_camera_view(scene, cam, V(0, 0, 0))
    bpy.ops.render.render(write_still=True)
    with Image.open(scene.render.filepath) as portrait:
        portrait.save(D / (name + '.webp'), quality=91, method=6)
    return {'size': round(span, 4), 'anchor': [round(anchor.x, 4), round(1 - anchor.y, 4)], 'width': round(high.x - low.x, 3), 'height': round(high.z - low.z, 3), 'depth': round(high.y - low.y, 3)}
if __name__ == '__main__':
    manifest = D / 'habitat.json'
    results = json.loads(manifest.read_text()) if manifest.exists() else {}
    for key, builder in [('rock', rock), ('coral', coral), ('kelp', kelp), ('reed', reed), ('mushroom', mushroom), ('tree', tree)]:
        reset()
        builder()
        results[key] = export(key)
        manifest.write_text(json.dumps(results, indent=2))
        print('SUBJECT READY', key, flush=True)
