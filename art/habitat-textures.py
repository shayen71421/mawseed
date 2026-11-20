"""Build repeatable 512² mineral, sediment and forest materials. All fields are periodic."""
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image
D = Path(__file__).resolve().parents[1] / 'dist/assets/habitat'
D.mkdir(exist_ok=True, parents=True)
N = 512
rng = np.random.default_rng(17280)
Y, X = np.indices((N, N)) / N
TAU = np.pi * 2

def noise(scale):
    a = gaussian_filter(rng.normal(size=(N, N)), scale, mode='wrap')
    return a / (a.std() + 1e-09)

def smooth(a):
    return np.clip(a, 0, 1) ** 2 * (3 - 2 * np.clip(a, 0, 1))

def mix(a, b, t):
    t = np.clip(t, 0, 1)[:, :, None]
    return np.array(a) * (1 - t) + np.array(b) * t

def earth():
    return 0.67 * noise(36) + 0.3 * noise(11) + 0.15 * noise(3) + 0.09 * noise(0.75)

def grains(count, rmin, rmax):
    heights = np.zeros((N, N))
    flecks = np.zeros((N, N))
    for _ in range(count):
        rx, ry = rng.uniform(rmin, rmax, 2)
        x, y = rng.integers(N, size=2)
        ang = rng.uniform(0, TAU)
        side = int(max(rx, ry) + 2)
        ys, xs = np.mgrid[-side:side + 1, -side:side + 1]
        u = (xs * np.cos(ang) + ys * np.sin(ang)) / rx
        v = (-xs * np.sin(ang) + ys * np.cos(ang)) / ry
        cap = np.sqrt(np.clip(1 - u * u - v * v, 0, 1))
        ind = np.ix_((y + ys[:, 0]) % N, (x + xs[0]) % N)
        amp = rng.uniform(0.45, 1.15)
        heights[ind] = np.maximum(heights[ind], cap * amp)
        val = rng.uniform(-1, 1) * cap
        flecks[ind] = np.where(cap > 0, val, flecks[ind])
    return (heights, flecks)

def save(key, rgb, h, strength):
    fine = noise(0.3)
    rgb = np.array(rgb) + fine[:, :, None] * 2
    Image.fromarray(np.uint8(np.clip(rgb, 0, 255))).save(D / f'{key}-color.webp', quality=92, method=5)
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    n = np.stack([-dx, dy, np.ones_like(dx)], 2)
    n /= np.linalg.norm(n, axis=2)[:, :, None]
    Image.fromarray(np.uint8((n * 0.5 + 0.5) * 255)).save(D / f'{key}-normal.webp', quality=95, method=5)
    if key in ('stone', 'bark'):
        Image.fromarray(np.uint8(np.clip(rgb, 0, 255))).save('/tmp/habitat-' + key + '.jpg', quality=90)
for key in ['bed', 'shore']:
    low = earth()
    fine = noise(0.42)
    shape = noise(22)
    rip = 0.5 + 0.5 * np.cos(TAU * (Y * (10 if key == 'bed' else 6) + X * 2) + 0.73 * shape + 2.5 * np.sin(TAU * X))
    crest = rip ** 2.8
    grit, fleck = grains(1100 if key == 'bed' else 650, 1.0, 4.0)
    # Clear bed alternates dark organic silt, grey-green grit and thin amber ridges.
    colors = ((42, 65, 62), (136, 147, 111)) if key == 'bed' else ((151, 132, 103), (218, 206, 166))
    rgb = mix(*colors, 0.46 + 0.13 * low + 0.19 * crest + 0.045 * fine)
    mica = np.maximum(0, noise(0.36) - 1.34) * 0.15
    rgb += np.expand_dims(11 * noise(1.45) + fleck * 38 + mica * 70, 2)
    save(key, rgb, 0.13 * fine + 0.38 * grit + 0.67 * crest + 0.15 * noise(3), 1.1)
rock = earth()
crystal = noise(1.45)
grit, fleck = grains(370, 1.1, 5.5)
# Sparse quartz inclusions follow distorted bedding.
veins = np.exp(-np.abs(np.sin(TAU * (X * 2 - Y * 3) + 1.1 * noise(21) + 0.22 * noise(4))) * 18)
rgb = mix((47, 59, 61), (126, 126, 109), 0.45 + 0.2 * rock + 0.1 * crystal)
rgb = mix(rgb, (167, 166, 137), veins * 0.49)
rgb += (fleck * 20 + 7 * noise(0.5))[:, :, None]
save('stone', rgb, 0.93 * rock + 0.29 * crystal + 0.17 * noise(0.4) + 0.21 * grit + 0.29 * veins, 0.97)
broad = earth()
clumps = noise(6)
spor = noise(0.9)
under = smooth(-broad * 0.65 + 0.18)
rgb = mix((43, 56, 32), (138, 151, 69), 0.37 + 0.12 * broad + 0.14 * clumps + 0.14 * spor)
rgb = mix(rgb, (87, 70, 47), under * 0.76)
twigs = np.exp(-np.abs(np.sin(TAU * (X * 6 - Y * 4) + 2.1 * noise(16))) * 27) * np.clip(under + 0.15, 0, 0.75)
rgb = mix(rgb, (147, 125, 72), twigs)
save('moss', rgb, 0.54 * clumps + 0.18 * noise(1) + 0.33 * spor + 0.56 * twigs, 1.55)
coarse = noise(26)
fine = noise(2)
phase = TAU * X * 20 + 0.78 * np.sin(TAU * Y * 2) + 0.43 * coarse
ridge = (0.5 + 0.5 * np.cos(phase)) ** 0.55
split = np.exp(-np.abs(np.sin(phase * 0.5)) * (7 + 2 * np.sin(TAU * Y)))
fibers = np.sin(TAU * X * 95 + 1.2 * coarse + 0.27 * fine)
rgb = mix((52, 46, 38), (133, 120, 82), 0.17 + 0.52 * ridge + 0.08 * coarse + 0.05 * fibers + 0.05 * fine)
rgb = mix(rgb, (40, 39, 33), split * 0.68)
rgb = mix(rgb, (102, 122, 81), smooth(0.18 + coarse * 0.35) * 0.42)
save('bark', rgb, 1.45 * ridge - 0.6 * split + 0.19 * fibers + 0.1 * noise(1.25), 1.3)
