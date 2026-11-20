"""Bake seamless, metre-scale forest, tidal and lagoon materials for Mawseed.
The painted deposits and their relief share the same deterministic masks.
"""
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image

RES = 1024
TAU = 2 * np.pi
OUT = Path(__file__).resolve().parents[1] / 'dist/assets/habitat'
Y, X = np.mgrid[:RES, :RES].astype(np.float32)
rng = np.random.default_rng(80419)


def field(radius):
    values = rng.standard_normal((RES, RES), dtype=np.float32)
    if radius:
        values = gaussian_filter(values, radius, mode='wrap')
    return values / (values.std() + 1e-7)


def smooth(v):
    u = np.clip(v, 0, 1)
    return u * u * (3 - 2 * u)


def mix(a, b, mask):
    w = np.clip(mask, 0, 1)[..., None]
    return np.asarray(a) * (1 - w) + np.asarray(b) * w


def brush(x, y, width):
    offsets = np.arange(-width, width + 1)
    ix = np.floor(x).astype(int) + offsets
    iy = np.floor(y).astype(int) + offsets
    dx, dy = np.meshgrid(ix - x, iy - y)
    return np.ix_(iy % RES, ix % RES), dx, dy


class Ground:
    def __init__(self, color, level):
        self.color = color.astype(np.float32)
        self.level = level.astype(np.float32)

    def layer(self, region, mask, color, relief):
        self.color[region] = mix(self.color[region], color, mask)
        self.level[region] += relief * np.clip(mask, 0, 1)

    def save(self, name):
        local = self.level - gaussian_filter(self.level, 3.7, mode='wrap')
        occlusion = 0.97 - .052 * np.clip(-local, 0, 1.5)
        rgb = np.clip(self.color * occlusion[..., None], 0, 255).astype('uint8')
        dx = (np.roll(self.level, -1, axis=1) - np.roll(self.level, 1, axis=1)) * .56
        dy = (np.roll(self.level, -1, axis=0) - np.roll(self.level, 1, axis=0)) * .56
        normal = np.stack([-dx, dy, np.ones_like(dx)], axis=2)
        normal /= np.linalg.norm(normal, axis=2)[..., None]
        encoded = np.clip(127.5 * (normal + 1), 0, 255).astype('uint8')
        Image.fromarray(rgb).save(OUT / f'{name}-color.webp', quality=90, method=6)
        Image.fromarray(encoded).save(OUT / f'{name}-normal.webp', quality=90, method=6)


def pebble(surface, x, y, length, width, palette, relief):
    angle = rng.uniform(0, TAU)
    region, dx, dy = brush(x, y, int(length + 3))
    a = (dx * np.cos(angle) + dy * np.sin(angle)) / length
    b = (-dx * np.sin(angle) + dy * np.cos(angle)) / width
    theta = np.arctan2(b, a)
    rad = np.hypot(a, b) * (1 + .085 * np.sin(3*theta+angle) + .045*np.cos(5*theta))
    alpha = np.clip((1 - rad) * width + .45, 0, 1)
    cap = np.sqrt(np.clip(1 - rad**2, 0, 1))
    mineral = np.array(palette[rng.integers(len(palette))])
    face = (.69 + .30 * cap - .095 * a - .06 * b)
    vein = np.exp(-abs(b + .32 * a + rng.uniform(-.4,.4)) * width * 1.1)
    color = mineral * face[..., None] + (vein * rng.uniform(0, 18))[..., None]
    surface.layer(region, alpha, color, cap * relief)


def twig(surface, start, end, bend, width, color):
    start, end = np.asarray(start), np.asarray(end)
    delta = end - start
    length = np.linalg.norm(delta)
    if length < 1:
        return
    unit = delta / length
    ix, dx, dy = brush(*(0.5 * (start + end)), int(length*.51 + abs(bend) + width + 3))
    t = (dx*unit[0] + dy*unit[1]) / length + .5
    u = np.clip(t, 0, 1)
    side = dy*unit[0] - dx*unit[1] - np.sin(np.pi*u)*bend
    radius = width * (.86 - .63*u) * (1 + .07*np.cos(u*30))
    distance = np.hypot(side, length * np.abs(t-u))
    alpha = np.clip(radius - distance + .65, 0, 1)
    ridge = np.sqrt(np.clip(1 - (side / (radius+.001))**2,0,1))
    tint = .62 + .42 * ridge + .13 * np.sin(u*28 + side) - .105 * side/(radius+.03)
    surface.layer(ix, alpha, np.asarray(color)*tint[...,None], ridge*(1.1+.45*width))


def leaf(surface, x, y, length, width, color, angle, damage):
    region, dx, dy = brush(x,y,int(length*.56 + width + 3))
    ca, sa = np.cos(angle), np.sin(angle)
    t = (dx*ca + dy*sa) / length + .5
    along = np.clip(t,.00001,.99999)
    curve = width * rng.uniform(-.46,.46) * np.sin(along*np.pi)
    v = -dx*sa + dy*ca - curve
    shape = np.sin(np.pi * along**rng.uniform(.7,1.18))**rng.uniform(.74,1.25)
    edge = width * shape * (1 - .14*along) * (1 + .035*np.sin(54*along+1.7))
    cut = np.maximum(0., np.sin(33*along + .74 * v))**7
    edge -= cut * damage * width * .24
    alpha = np.clip(edge - np.abs(v) + .5,0,1) * np.clip(np.minimum(t,1-t)*length+.25,0,1)
    # Cast a fine contact shadow under the curl before placing the blade.
    shade = gaussian_filter(alpha,1.5)
    shade = np.roll(shade, (2,2), (0,1)) * .33
    surface.color[region] *= 1 - shade[...,None]
    rel = np.clip(np.abs(v)/(edge+.07),0,1)
    rib = np.exp(-np.abs(v)*1.5) * (1-along*.44)
    veinPhase = along * (7.4 + damage*2) - rel*(.57+.31*along)
    veins = np.exp(-np.abs(np.sin(np.pi*veinPhase))*width*.72) * (1-rel)*.75
    tip = (1 - shape) * .31
    brightness = .70+.22*(1-rel)+.10*np.sign(v)*np.sin(along*np.pi) + .16*tip
    stain = .17*np.sin(along*16.1+v*.36)*np.cos(along*23-v*.28)
    color = np.asarray(color) * (brightness + stain)[...,None]
    color += (rib*.76+veins*.64)[...,None] * np.array([33,28,12])
    color += np.clip(rel-.81,0,1)[...,None] * np.array([46,28,14])
    relief = .65 + 1.45*(1-rel)*np.sin(np.pi*along)**.6 + .56*rib + .3*veins
    surface.layer(region,alpha,color,relief)


def forest():
    large, middle, loam, fibre, fine = field(62),field(15),field(3.3),field(.85),field(0)
    patches=smooth(.53+large*.29+middle*.17+loam*.1)
    earth=mix((43,35,27),(100,78,49),.51+loam*.13+fibre*.16)
    moss=mix((48,60,35),(117,125,70),.47+loam*.12+fibre*.17+middle*.07)
    base=mix(earth,moss,patches)
    s=Ground(base+(fine*3.3)[...,None],.59*loam+.46*fibre+.22*fine+2.4*patches)
    palette=[(125,113,93),(82,79,67),(110,102,80),(156,144,109)]
    for _ in range(1550):
        x,y=rng.uniform(0,RES,2);size=rng.uniform(1.4,6)**1.08
        pebble(s,x,y,size,size*rng.uniform(.46,.82),palette,rng.uniform(.8,2.3))
    # Fine stems in open patches and natural clusters around fallen branches.
    for _ in range(68):
        x,y=rng.uniform(0,RES,2);angle=rng.uniform(0, TAU);length=rng.uniform(23,89)
        twig(s,[x,y],[x+length*np.cos(angle),y+length*np.sin(angle)],rng.uniform(-5,5),rng.uniform(.8,2.4),(118,100,66))
    leaves=[(181,113,59),(165,131,69),(118,90,54),(135,108,52),(92,89,53),(95,107,54),(155,119,71),(174,133,75)]
    for _ in range(425):
        x,y=rng.uniform(0,RES,2)
        if rng.random() < .58*patches[int(y),int(x)]:
            continue
        length=rng.uniform(15,51)*rng.choice([.93,1.14,1.4],p=[.67,.25,.08])
        width=length*rng.uniform(.095,.215)
        a=rng.uniform(0,TAU)
        leaf(s,x,y,length,width,leaves[rng.integers(len(leaves))],a,rng.random())
    roots=[(113,83,56),(99,81,57),(96,74,53),(133,113,69)]
    for _ in range(13):
        x,y=rng.uniform(0,RES,2);a=rng.uniform(0,TAU);color=roots[rng.integers(len(roots))]
        width=rng.uniform(2.6,5.6);n=rng.integers(2,5)
        for i in range(n):
            a+=rng.uniform(-.45,.45);length=rng.uniform(19,48)
            end=[x+length*np.cos(a),y+length*np.sin(a)]
            twig(s,[x,y],end,rng.uniform(-3.5,3.5),width*(1-.37*i/n),color)
            if i==1:
                a2=a+rng.choice([-.73,.64]);twig(s,end,[end[0]+28*np.cos(a2),end[1]+28*np.sin(a2)],3,width*.42,color)
            x,y=end
    s.save('moss')


def coast(submerged):
    long,middle,grains,fine=field(55),field(13),field(.83),field(0)
    phase=TAU*(9*Y/RES+2*X/RES)+.91*long+.63*middle+1.55*np.sin(TAU*X/RES)
    ridge=(.5+.5*np.cos(phase))**(2.8 if submerged else 1.9)
    current=smooth(.58+.25*long)
    trough=(1-ridge)*current
    if submerged:
        rgb=mix((92,105,95),(187,173,135),.52+.13*long+.058*middle+.16*ridge+.065*grains)
        gravel=[(97,111,103),(194,176,135),(121,132,117),(142,141,116),(177,170,142),(83,97,89)]
    else:
        rgb=mix((119,111,89),(223,200,155),.54+.10*long+.06*middle+.10*ridge+.065*grains)
        gravel=[(188,175,146),(148,138,109),(123,122,106),(173,161,136),(204,191,155),(117,117,99)]
    soil=Ground(rgb+(3*grains+3.1*fine)[...,None],ridge*(4.2 if submerged else 1.8)*current+.3*grains+.19*fine+.61*middle)
    for i in range(3450 if submerged else 2350):
        x,y=rng.uniform(0,RES,2)
        pool=trough[int(y),int(x)]
        if rng.random() < (.42 if not submerged else .48)*(1-pool):continue
        size=rng.uniform(.9,3.4)*(rng.uniform(1.75,3.75) if rng.random()<.17+.19*pool else 1)
        pebble(soil,x,y,size,size*rng.uniform(.48,.91),gravel,rng.uniform(.5,2.6))
    for _ in range(32 if submerged else 53):
        x,y=rng.uniform(0,RES,2);a=rng.uniform(0,TAU);l=rng.uniform(8,32)
        twig(soil,[x,y],[x+np.cos(a)*l,y+np.sin(a)*l],rng.uniform(-3.2,3.2),rng.uniform(.8,1.8),(121,108,76))
    for _ in range(19 if submerged else 31):
        x,y=rng.uniform(0,RES,2)
        length=rng.uniform(13,34);width=length*rng.uniform(.10,.22)
        leaf(soil,x,y,length,width,(137,126,86) if submerged else (154,128,80),rng.uniform(0,TAU),.8)
    soil.save('bed' if submerged else 'shore')


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True, parents=True)
    coast(True)
    coast(False)
    forest()
