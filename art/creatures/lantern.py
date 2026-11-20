"""A free-swimming lantern animal with a luminous bell and trailing ribbons."""
import math
import numpy as np
from build import PI, rgb


def lantern(model):
    cap_center=.82
    u=np.linspace(.002,PI-.002,23)[:,None]
    a=np.arange(48)[None,:]*PI/24
    bell=np.sin(u)**.80*(1+.055*np.cos(8*a))
    D=np.stack(np.broadcast_arrays(.432*bell*np.cos(a),
               .46*np.cos(u)+np.zeros_like(bell),
               .519*bell*np.sin(a)),-1)
    V=D.copy();V[...,1]+=cap_center
    stripe=(.5+.5*np.cos(8*a+.4*np.sin(u)))**7
    depth=np.clip((.3+np.cos(u))*.8,0,1)[:,:,None]
    C=rgb('317c83')*(1-depth)+rgb('acddc9')*depth
    C=C*(1-.29*stripe[...,None])+rgb('71e6cf')*.26*stripe[...,None]
    model.grid(V,C,.24,'bell',outward=D)
    # Eight ribs carry pearled comb rows down the bell.
    for j in range(8):
        angle=2*PI*j/8
        points=[]
        for k in range(12):
            phi=.23+k*.19
            radius=(math.sin(phi)**.80)*1.055
            points.append((.437*radius*math.cos(angle),
                           cap_center+.468*math.cos(phi),
                           .522*radius*math.sin(angle)))
        model.strand(points,[.006,.018,.023,.009],'87cec2',17,6,rough=.26)
        for k in (3,5,7,9):
            x,y,z=points[k]
            model.orb((x*1.019,y,z*1.019),(.016,.025,.017),'a3ffdf',rough=.23,
                      seg=8,ring=5,group='photophore')
    # A ring of luminous bulbs flanks the mantle. Its two strongest bulbs face aft.
    for s in (-1,1):
        model.orb((s*.338,.84,.331),(.103,.125,.104),'244d62',rough=.34)
        model.orb((s*.396,.874,.373),(.064,.078,.070),'a9ffe3',rough=.17,
                  group='photophore')
        model.orb((s*.43,.876,.398),(.024,.053,.025),'245060',rough=.20)
        paddle=f'fin_{s}'
        model.fin([(s*.272,.73,-.19),(s*.29,.79,.004),(s*.293,.80,.218)],
                  [(s*.65,.685,-.62),(s*.77,.70,-.33),(s*.56,.729,.04)],
                  '65bfb3',paddle,6)
        model.orb((s*.20,.695,-.407),(.055,.05,.042),'a0fbdc',group='photophore')
        points=[(s*.217,.596,-.23),(s*.231,.491,-.51),
                (s*.263,.403,-.75),(s*.243,.372,-.94),(s*.187,.437,-1.069)]
        model.strand(points,[.049,.036,.021,.014,.002],'75c5b5',15,7,group='tail',ribs=6)
    model.orb((0,.718,.431),(.169,.075,.072),'538c91',rough=.40)
    # The upright photophore is visible from both chase cameras.
    model.strand([(0,1.19,-.03),(0,1.37,-.13),(.012,1.51,-.12),(.014,1.56,-.049)],
                 [.045,.029,.018,.014],'5ea5a3',11,8,rough=.34)
    model.orb((.014,1.605,-.04),(.073,.085,.069),'c0ffe2',group='photophore',rough=.19)
