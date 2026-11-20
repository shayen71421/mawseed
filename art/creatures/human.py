"""Upright hide-clad forager, local +Z forward and +Y up."""
import io
import json
import math
import struct
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.interpolate import PchipInterpolator
from build import PI, rgb, mix, unit

SKIN='a16e52'
SHADOW='7e5642'
LIGHT='ba8766'


def shape(m,sections,color,group,steps=22,sides=24,hide=False,rough=.70):
    """Sectional sculpture, with a sewn-hide variant along the same circular contour."""
    sections=np.asarray(sections)
    x=PchipInterpolator(np.linspace(0,1,len(sections)),sections,axis=0)
    t=np.linspace(0,1,steps);a=np.linspace(0,2*PI,sides+1)
    c=x(t);A=a[None,:];T=t[:,None]
    w=c[:,3:4];h=c[:,4:5]
    relief=1+.013*np.sin(A*3.0+T*2.5)*np.sin(PI*T)
    if hide:
        relief+=(.022*np.cos(A*11-.99*np.sin(T*3.2))+.010*np.cos(A*19+T*4))*(.5+.5*T)
    X=w*relief*np.cos(A);Z=h*relief*np.sin(A);Y=0*X
    if hide:
        Y+=.010*np.sin(A*7.0+T)*np.sin(T*PI)
        if group=='wrap':Y+=T**6*(.031*np.sin(A*3+.7)+.012*np.sin(A*11+.9))
    N=np.stack([X,Y,Z],-1);V=c[:,None,:3]+N
    hue=np.asarray(rgb(color))*(1+.042*np.sin(A*3+T*7)+.018*np.sin(A*11-T*3))[...,None]
    if hide:
        hue*=1+(.035*np.cos(A*9+.9*np.sin(T*4))+.016*np.sin(A*23-T*6))[...,None]
    m.grid(V,hue,rough,group,False,outward=N)
    if hide:m.leather_uv[id(m.parts[-1][0])]=np.stack(np.broadcast_arrays(A/(PI*2)*2.8,T*1.4),-1).reshape(-1,2)
    # Cap the section at its attachment; exposed seams have full thickness.
    for i,sgn in ((0,-1),(-1,1)):
        r=V[i,:-1];vc=np.vstack([r,r.mean(0)]);f=np.array([(sides,j,(j+1)%sides) for j in range(sides)])
        outward=np.broadcast_to(unit(x.derivative()(float(i!=0))[:3])*sgn,vc.shape)
        m.mesh(vc,f,color,rough,group,outward=outward)


def ellipse_line(m,center,rx,rz,y_wobble,radius,ink,g='spine',phase=0.,sides=52):
    a=np.linspace(0,2*PI,sides)
    x,y,z=center
    pts=np.stack([x+rx*np.cos(a),y+y_wobble*np.sin(a+phase),z+rz*np.sin(a)],1)
    m.strand(pts,[radius,radius,radius],ink,sides,6,rough=.82,group=g)


def costume(m):
    shape(m,[(0,1.526,-.008,.092,.092),(0,1.491,-.002,.173,.114),
             (0,1.444,.002,.208,.134),(0,1.365,.010,.190,.125),
             (0,1.257,.012,.160,.115),(0,1.140,.009,.147,.109),
             (0,1.084,.002,.152,.116),(0,1.038,-.004,.151,.115)],
          '906d4a','jerkin',42,52,True,.85)
    # Two wrap-around apron panels sit below the waist. The uneven cut and fringe
    # expose each leg individually while leaving the outer silhouette intact.
    shape(m,[(0,1.065,-.005,.144,.108),(0,.998,-.004,.170,.126),
             (0,.919,-.013,.210,.146),(0,.835,-.008,.211,.152),
             (0,.767,-.010,.211,.158)],
          '806043','wrap',26,52,True,.87)
    for j in range(47):
        a=j*2*PI/47;y=.766+.031*math.sin(a*3+.7)+.012*math.sin(a*11+.9)
        xa=.209*math.cos(a);za=-.01+.157*math.sin(a)
        m.strand([(xa,y+.014,za),(xa*1.014,y-.014,za*1.012),
                  (xa*1.015+.004*math.sin(a*13),y-.025-.012*(j%4),za*1.030)],
                 [.0045,.0042,.0016],mix('987452','ae8960',.18*(j%4)),5,4,group='pelvis',rough=.90)
    # A second dark row of seam stitches follows the irregular hem, giving
    # the wrap a clear border in both strong sun and muted cave light.
    for j in range(38):
        a=j*2*PI/38
        def seam(b,y):
            return (.212*math.cos(b),y+.029*math.sin(3*b+.7),-.010+.157*math.sin(b))
        m.strand([seam(a,.804),seam(a+.065,.796),seam(a+.121,.805)],
                 [.0023,.0027,.0017],'b69562' if j%3 else '624e36',5,4,
                 group='pelvis',rough=.87)
    # Upper mantle covers the left shoulder, its scalloped edge crossing the back.
    a,t=np.meshgrid(np.linspace(0,PI*2,62),np.linspace(0,1,16),indexing='ij')
    left=(1-np.cos(a))*.5
    length=.07+.155*left+.031*(1-np.sin(a))*.5
    r=.086+.148*t*(.53+.47*left)
    V=np.stack([r*np.cos(a),1.516-length*t-.011*np.sin(a*7)*t*t,
                -.002+(.085+.064*t)*np.sin(a)],-1)
    C=rgb('a48e66')*(.89+.10*np.sin(a*6+t*3)+.031*np.sin(a*15-9*t))[...,None]
    m.grid(V,C,.90,'spine',False,outward=V-[0,1.41,0])
    for j in range(84):
        i=int(j/84*(len(V)-1));A=V[i,-2];P=V[i,-1];d=P-A
        m.strand([A,P,P+d*1.1+[0,-.006-.008*(j%4),0]], [.0037,.0031,.0006],
                 'bca781' if j%4==0 else '937c5b',5,4,rough=.90,group='spine')
    # Slender leather belt, braided retainers and a darker cross-body carrying strap.
    for j in range(3):
        ellipse_line(m,(0,1.040+j*.012,.002),.158,.120,.015,.009,
                     '584a38' if j!=1 else '76603f','pelvis',phase=.52)
    for s in (-1,1):
        m.strand([(s*.057,1.067,.103),(s*.047,1.011,.127),(s*.056,.964,.129)],
                 [.007,.006,.002],'a78a5b',7,5,group='pelvis',rough=.78)
    strap=[(-.137,1.492,.070),(-.112,1.441,.119),(-.067,1.375,.139),
           (.014,1.277,.134),(.085,1.179,.110),(.140,1.099,.062)]
    back=[(-.135,1.489,-.075),(-.098,1.416,-.126),(-.025,1.337,-.128),
          (.057,1.244,-.101),(.106,1.167,-.088),(.141,1.092,-.064)]
    for points in (strap,back):
        A=np.asarray(points);T=np.linspace(0,1,len(A));P=PchipInterpolator(T,A,axis=0)(np.linspace(0,1,26))
        edges=np.array([-.013,0,.013])
        U=np.broadcast_to(P[:,None,:],(len(P),3,3)).copy()
        U[:,:,0]+=edges[None,:];U[:,:,1]+=edges[None,:]*.70
        m.grid(U,'60503a',.82,'spine',False)
        for edge in (-1,0):
            m.strand(U[:,edge,:],[.0021,.0029,.0021],'a28960',26,4,rough=.80,group='spine')
    # A small folded hide pouch with leather laces. The back view shows the
    # over-shoulder strap returning to this pouch at the belt.
    m.orb((.156,1.011,-.053),(.058,.077,.064),'6f543b',rot=(.06,.16,-.19),
          seg=17,ring=10,rough=.88,group='pelvis')
    m.orb((.164,1.048,-.060),(.054,.025,.057),'977550',rot=(.06,.16,-.14),
          seg=15,ring=7,rough=.85,group='pelvis')
    for j in range(3):
        m.strand([(.193,1.067-j*.006,-.075),(.201,1.027-j*.004,-.066),
                  (.201,1.016-j*.004,-.055)], [.003,.003,.0013],'ccb183',6,4,group='pelvis')
    # A few stone, bone and amber-colored beads, staggered along one cord.
    cord=[(-.080,1.515,.064),(-.060,1.472,.093),(-.018,1.448,.120),
          (.023,1.447,.122),(.068,1.471,.096),(.082,1.511,.068)]
    m.strand(cord,[.003,.003,.0026],'594530',15,5,group='spine')
    for i,(x,y,z) in enumerate([(-.043,1.459,.110),(-.025,1.451,.118),
                                (.002,1.438,.126),(.031,1.450,.120),(.049,1.459,.110)]):
        q=.009 if i!=2 else .013
        m.orb((x,y,z),(q,.012 if i!=2 else .022,q*.75),('ae9470','b99c69','d5c3a0')[i%3],
              rough=.64,group='spine',seg=9,ring=6)


def coiffure(m):
    # A hand-parted cap with an irregular front hairline, exposing the brow.
    a,t=np.meshgrid(np.linspace(0,2*PI,64),np.linspace(.006,1,22),indexing='ij')
    line=1.76-.083*(1-np.sin(a))*.5+.005*np.sin(6*a)+.002*np.cos(11*a)
    cap_y=1.746;ry=.096
    phi=np.arccos(np.clip((line-cap_y)/ry,-.94,.79))*t
    X=.094*np.sin(phi)*np.cos(a);Y=cap_y+ry*np.cos(phi);Z=.004+.102*np.sin(phi)*np.sin(a)
    V=np.stack([X,Y,Z],-1);D=V-[0,cap_y,.004]
    C=rgb('3f342a')*(1+.14*np.cos(12*a+4*t)+.065*np.sin(39*a-4*t))[...,None]
    m.grid(V,C,.82,'head',False,outward=D)
    def point(a,t):
        end=1.76-.083*(1-math.sin(a))*.5+.005*math.sin(6*a)+.002*math.cos(11*a)
        phi=math.acos((end-cap_y)/ry)*t
        return np.array([.095*math.sin(phi)*math.cos(a),cap_y+.097*math.cos(phi),
                         .004+.103*math.sin(phi)*math.sin(a)])
    for j in range(94):
        a=j*2*PI/94;q=.11+.18*((j*23)%29)/29;end=.886+.111*((j*71)%31)/31
        points=[point(a+.095*math.sin((1-t)*2.9+j*.17),t) for t in np.linspace(q,end,8)]
        ink=['584535','483b2c','69503a','3e342b'][j%4]
        # Flat overlapping locks catch the light along the curve without cord-like ridges.
        P=np.array(points);tangent=unit(np.gradient(P,axis=0));normal=unit(P-[0,cap_y,.004])
        across=unit(np.cross(normal,tangent));w=np.linspace(.0014,.0003,len(P))
        vv=np.stack([P-across*w[:,None],P+normal*.00055,P+across*w[:,None]],1)
        m.grid(vv,ink,.87,'head',False,outward=np.broadcast_to(normal[:,None,:],vv.shape))
    for side in (-1,1):
        # Wisps over the temple break the hard cap silhouette.
        for j in range(12):
            a=.03+j*.073 if side==1 else PI-.03-j*.073
            start=point(a,.90);end=point(a,1)
            m.strand([start,end,end+[side*.004,-.013-j%3*.005,-.003],
                     end+[side*.002,-.021-j%3*.007,-.009]],
                     [.0022,.0027,.0018,.0004],'47392c' if j%3 else '64523d',
                     6,4,rough=.86,group='head')
    # Gathered hair above the nape, then three interlaced tresses to the shoulders.
    m.orb((-.010,1.741,-.094),(.063,.057,.051),'44382a',rough=.86,group='head')
    for p in range(3):
        points=[]
        for j in range(16):
            t=j/15;angle=2*PI*(t*1.92+p/3)
            points.append((-.010+(.022-.010*t)*math.cos(angle)+.025*t,
                           1.728-.186*t, -.107-.034*math.sin(t*PI)+(.013-.005*t)*math.sin(angle)))
        m.strand(points,[.019,.016,.010,.006],'4c3e2f' if p==0 else '58432e' if p==1 else '42372b',
                 24,7,rough=.86,group='head')
    for j in range(4):
        ellipse_line(m,(-.009,1.729-j*.004,-.107),.032,.026,.001,.0022,
                     '947a56','head',sides=19)
    ellipse_line(m,(.014,1.557,-.111),.021,.019,.002,.003,'ad8b59','head',sides=18)


def face(m):
    first=len(m.parts)
    shape(m,[(0,1.574,.024,.028,.037),(0,1.589,.022,.052,.053),
             (0,1.613,.016,.073,.065),(0,1.641,.018,.077,.068),
             (0,1.670,.017,.086,.073),(0,1.699,.010,.087,.079),
             (0,1.731,.011,.087,.081),(0,1.764,.009,.086,.080),
             (0,1.790,.003,.078,.074),(0,1.812,-.004,.052,.052),
             (0,1.821,-.005,.014,.015)],SKIN,'visage',50,64)
    # Raise the malar and chin planes; inset both orbits and the nasolabial folds.
    # These broad transitions are in the continuous head surface, not attached spheres.
    verts,_,base,faces,rough,group=m.parts[first];V=verts.copy()
    x,y,z=V.T;xx=np.abs(x);front=np.clip((z-.017)/.044,0,1)
    def patch(cx,cy,wx,wy):
        return np.exp(-((xx-cx)/wx)**2-((y-cy)/wy)**2)*front
    cheek=patch(.058,1.664,.031,.020);orbital=patch(.039,1.695,.027,.013)
    jaw=patch(.022,1.598,.037,.016);brow=patch(.035,1.714,.036,.012)
    folds=patch(.027,1.645,.011,.017);mouth=patch(.008,1.625,.036,.020)
    V[:,2]+=.0094*cheek-.0065*orbital+.0060*brow+.0085*jaw-.0035*folds+.003*mouth
    V[:,0]+=np.sign(x)*.0030*cheek
    C=base*(1-.065*orbital[:,None]-.04*folds[:,None])
    C+=cheek[:,None]*np.array([.014,-.007,-.009])
    m.mesh(V,faces,C,rough,group,outward=V-[0,1.69,.006]);m.parts[first]=m.parts.pop()
    uv=np.stack([V[:,0]*3.8+V[:,2]*1.14,V[:,1]*4.1+V[:,2]*.11],-1)
    m.leather_uv[id(m.parts[first][0])]=uv
    # Ear, lobe, concha and helix follow the skull instead of facing the camera.
    for s in (-1,1):
        m.orb((s*.083,1.671,.011),(.015,.032,.020),SKIN,rot=(.05,s*.05,-s*.10),group='head')
        m.orb((s*.094,1.672,.010),(.006,.021,.013),'865c47',seg=12,ring=8,group='head')
        pts=[]
        for a in np.linspace(0,2*PI,19):
            pts.append((s*(.095+.002*math.sin(a)),1.673+.027*math.cos(a),.01+.017*math.sin(a)))
        m.strand(pts,[.0028,.0026,.0022],'b48262',19,5,group='head')
        m.strand([(s*.099,1.662,.013),(s*.100,1.674,.005),(s*.098,1.685,.010)],
                 [.0026,.0037,.0012],'b5815f',6,5,group='head')
        # An almond eye plane, painted iris, catchlight and modeled eyelid folds.
        u,v=np.meshgrid(np.linspace(-1,1,29),np.linspace(-1,1,10),indexing='ij')
        lid=np.maximum(0,1-u*u)**.72
        X=s*(.039+.024*u);Y=1.694+.0018*u+.0078*v*lid
        Z=.081-.010*u+.0035*lid*(1-v*v)
        r=np.hypot((X-s*.039)/.0097,(Y-1.694)/.0100)
        iris=np.clip((1-r)*12,0,1);pupil=np.clip((.52-r)*15,0,1)
        c=rgb('a49c85')*(1-iris[...,None])+rgb('624d32')*iris[...,None]
        c=c*(1-pupil[...,None])+rgb('292823')*pupil[...,None]
        vv=np.stack([X,Y,Z],-1);m.grid(vv,c,.25,'head',False,outward=np.broadcast_to([0,0,1],vv.shape))
        # Skin continues from the lens edge into upper/lower lids and the socket.
        phi,t=np.meshgrid(np.linspace(0,2*PI,37),np.linspace(0,1,6),indexing='ij')
        co,si=np.cos(phi),np.sin(phi)
        rr=.024*(1+.38*t);vvx=s*(.039+rr*co)
        vvy=1.694+.0018*co+si*(.0078+.009*t)
        vvz=.0818-.010*co+.0025*(1-t)+.0019*si*(1-t)-.0085*t
        vv=np.stack([vvx,vvy,vvz],-1);lidcolor=rgb('a3785b')*(1-.10*np.maximum(0,-si)*(1-t))[...,None]
        m.grid(vv,lidcolor,.74,'head',False,outward=np.broadcast_to([0,0,1],vv.shape))
        m.orb((s*.040-.003,1.697,.085),(.0022,.0023,.0015),'eee1bb',seg=7,ring=4,group='head')
        m.strand([(s*.015,1.693,.090),(s*.034,1.703,.085),(s*.050,1.701,.079),(s*.063,1.696,.071)],
                 [.0016,.0030,.0028,.0012],'604936',8,5,group='head')
        m.strand([(s*.017,1.690,.088),(s*.040,1.685,.082),(s*.059,1.690,.072)],
                 [.0013,.0021,.0010],LIGHT,7,5,group='head')
        m.strand([(s*.012,1.709,.090),(s*.035,1.714,.088),(s*.058,1.712,.077),
                  (s*.071,1.705,.061)],[.0019,.0033,.0029,.0009],'564131',10,6,group='head')
        for k in range(12):
            q=k/12
            A=(s*(.012+.052*q),1.710+.004*math.sin(PI*q),.091-.020*q)
            m.strand([A,(A[0]+s*.003,A[1]+.003,A[2]-.001)], [.0009,.00025],
                     '564336' if k%3 else '796447',3,4,group='head',rough=.80)
        m.strand([(s*.027,1.683,.085),(s*.042,1.680,.080),(s*.056,1.684,.072)],
                 [.0004,.0011,.0004],'936d57',5,4,group='head')
        # A discreet double stripe of mineral pigment lives high on the right cheek.
        if s==1:
            for j in range(2):
                m.strand([(.058,1.670-j*.004,.071),(.068,1.672-j*.004,.065),
                          (.077,1.674-j*.004,.054)],[.0011,.0022,.0008],'a4593d',7,4,group='head')
    # The bridge widens into a rounded nose tip with two recessed nostrils.
    shape(m,[(0,1.710,.075,.010,.008),(0,1.696,.081,.011,.009),
             (0,1.674,.093,.013,.013),(0,1.659,.104,.017,.014),
             (0,1.650,.103,.019,.010),(0,1.647,.093,.008,.004)],'a97859','head',14,16)
    for s in (-1,1):
        m.orb((s*.0155,1.652,.099),(.0108,.0078,.010),SKIN,group='head',seg=12,ring=8)
        m.orb((s*.016,1.648,.106),(.0045,.0027,.0031),'60493c',group='head',seg=8,ring=5)
    m.strand([(-.027,1.625,.079),(-.011,1.629,.093),(0,1.628,.094),(.011,1.629,.093),(.027,1.625,.079)],
             [.0017,.0033,.0030,.0033,.0017],'92624f',10,6,group='head')
    m.strand([(-.024,1.624,.082),(0,1.622,.095),(.024,1.624,.082)],[.0014,.0023,.0012],'674c40',8,5,group='head')
    m.strand([(-.018,1.621,.088),(0,1.619,.092),(.018,1.621,.088)],[.0015,.003,.0015],'b57f66',7,5,group='head')
    coiffure(m)


def biface(m,p):
    """Asymmetric chert biface with an unpolished cortex and visible flake facets."""
    # Coordinates are across the stone, along its length and through its thickness.
    outline=np.array([[-.014,.105],[-.040,.092],[-.050,.065],[-.051,.028],
                      [-.046,-.011],[-.037,-.044],[-.023,-.075],[.002,-.115],
                      [.017,-.084],[.029,-.061],[.044,-.025],[.052,.019],
                      [.049,.052],[.038,.078],[.016,.099]])
    def transform(u,v,h):
        return np.asarray(p)+np.array([.54*u+.84*h,.80*v+.14*u,-.60*v+.82*u-.56*h])
    V=[];F=[];C=[];rng=m.rng
    def facet(a,b,c,color):
        n=len(V);V.extend([a,b,c]);F.append((n,n+1,n+2));C.extend([color,color,color])
    for s in (-1,1):
        rim=[];mid=[]
        for j,(u,v) in enumerate(outline):
            rim.append(transform(u,v,.0015*math.cos(j*3.6)))
            mid.append(transform(u*.56+.005*math.sin(j),v*.70+.003*math.cos(j*2),s*(.018+.004*math.sin(j*2))))
        center=transform(.004,.021,s*.026)
        for j in range(len(rim)):
            k=(j+1)%len(rim)
            bas=mix('5d6864','aba48d',rng.uniform(.15,.64))
            facet(rim[j],mid[j],rim[k],bas)
            facet(mid[j],mid[k],rim[k],bas*rng.uniform(.84,1.06))
            facet(mid[j],center,mid[k],bas*rng.uniform(.80,.98))
    m.mesh(V,F,C,.44,'hand_1')


def limb(m,s):
    arm=f'arm_{s}';fore=f'forearm_{s}';hand=f'hand_{s}'
    sh=np.array([s*.170,1.450,.003]);el=np.array([s*.261,1.206,.002])
    wr=np.array([s*.286,.990,.071])
    m.pivots[arm]=sh;m.pivots[fore]=el;m.pivots[hand]=wr
    m.parents[arm]='spine';m.parents[fore]=arm;m.parents[hand]=fore
    shape(m,[(*sh,.050,.056),(s*.204,1.428,-.002,.065,.070),
             (s*.232,1.383,.002,.061,.061),(s*.244,1.322,.007,.052,.054),
             (s*.255,1.262,.009,.046,.050),(*el,.037,.040),
             (s*.261,1.198,.003,.030,.032)],SKIN,arm,20,23)
    m.orb(el,(.040,.041,.038),'96694f',group=fore,rough=.72)
    shape(m,[(*el,.038,.038),(s*.270,1.178,.012,.047,.046),
             (s*.278,1.131,.029,.046,.043),(s*.284,1.075,.049,.036,.033),
             (s*.287,1.021,.063,.028,.028),(*wr,.025,.027)],
          'a57356',fore,18,22)
    # Two narrow wrist wraps mark the striking hand.
    if s<0:
        for j in range(3):
            ellipse_line(m,(s*.286,1.005+j*.007,.066-j*.002),.028,.029,.002,
                         .004,'71563d' if j!=1 else 'aa8357',fore,sides=16)
    palm=wr+np.array([s*.005,-.043,.018])
    m.orb(palm,(.025,.054,.042),SKIN,rot=(-.18,0,s*-.15),seg=16,ring=11,group=hand,rough=.70)
    # Four flexed fingers cross the grip; the opposed thumb seats against it.
    for j in range(4):
        z=.023-j*.017;dy=-.016-j*.003
        pts=[palm+[s*.011,dy,z],palm+[s*.023,dy-.026,z+.005],
             palm+[s*.015,dy-.044,z+.015],palm+[-s*.005,dy-.040,z+.019]]
        m.strand(pts,[.0097,.010,.008,.0056],LIGHT,8,7,rough=.72,group=hand)
        m.orb(pts[-1],(.004,.003,.006),'ad8b6f',group=hand,seg=6,ring=4)
    m.strand([palm+[-s*.011,.020,.022],palm+[-s*.023,.004,.038],palm+[-s*.019,-.016,.042],
              palm+[-s*.008,-.027,.037]],[.014,.012,.010,.006],LIGHT,8,7,rough=.72,group=hand)
    if s>0:
        biface(m,palm+[-.006,-.059,.016])
    else:
        m.orb(palm+[.003,-.017,.024],(.034,.041,.032),'796f5d',rot=(.47,.2,.17),
              seg=13,ring=9,group=hand,rough=.87,fleck=.12)
    hip=np.array([s*.106,.899,-.006]);knee=np.array([s*.118,.491,.011]);ankle=np.array([s*.123,.119,-.022])
    leg=f'leg_{s}';shin=f'shin_{s}';foot=f'foot_{s}'
    m.pivots[leg]=hip;m.pivots[shin]=knee;m.pivots[foot]=ankle
    m.parents[leg]='pelvis';m.parents[shin]=leg;m.parents[foot]=shin
    shape(m,[(*hip,.085,.089),(s*.109,.852,-.005,.091,.094),
             (s*.113,.755,-.003,.080,.084),(s*.119,.644,.001,.066,.068),
             (s*.119,.547,.009,.052,.055),(*knee,.044,.047),
             (s*.120,.481,.007,.036,.039)],'9b6b50',leg,23,24)
    m.orb(knee,(.046,.047,.047),SKIN,seg=14,ring=9,group=shin)
    shape(m,[(*knee,.043,.044),(s*.119,.446,-.003,.047,.049),
             (s*.122,.391,-.020,.055,.064),(s*.123,.339,-.025,.054,.059),
             (s*.123,.260,-.028,.043,.041),(s*.123,.177,-.028,.028,.032),
             (*ankle,.028,.030)],'9a6c50',shin,23,24)
    # Soft hide gaiters, calf ties, an instep seam and a recognizable leather sole.
    shape(m,[(s*.123,.264,-.027,.045,.043),(s*.123,.239,-.028,.044,.042),
             (s*.123,.191,-.027,.033,.035),(s*.123,.145,-.025,.031,.033),
             (s*.123,.116,-.022,.031,.034)],'7d6749',shin,13,20,.0,.86)
    for j in range(3):
        y=.228+j*.009
        ellipse_line(m,(s*.123,y,-.028),.042+.001*j,.041+.001*j,.004,.004,
                     'b39a72' if j==1 else '65533d',shin,sides=19)
    p=np.array([s*.124,.071,.024])
    m.orb(p,(.048,.055,.103),'826847',rot=(.14,0,s*-.025),rough=.84,group=foot,seg=19,ring=10)
    m.orb(p+[0,-.024,.017],(.049,.024,.107),'534936',rough=.91,group=foot,seg=19,ring=8)
    m.strand([p+[0,.035,-.038],p+[s*.010,.043,.002],p+[s*.011,.029,.061],
              p+[s*.006,.009,.094]],[.003,.004,.003,.0016],'b79b71',9,5,group=foot,rough=.85)


def place_knapping_hands(m,pose,targets):
    from scipy.optimize import least_squares
    from scipy.spatial.transform import Rotation
    def matrix(joint,angles):
        pivot=m.pivots[joint];r=Rotation.from_euler('XYZ',angles).as_matrix()
        T=np.eye(4);T[:3,:3]=r;T[:3,3]=pivot-r@pivot
        return T
    torso=matrix('pelvis',pose.get('pelvis',(0,0,0)))@matrix('spine',pose.get('spine',(0,0,0)))
    for s in (-1,1):
        arm=f'arm_{s}';fore=f'forearm_{s}';hand=f'hand_{s}'
        # Native contact positions of the stone heel and rounded hammerstone.
        point=m.pivots[hand]+[s*.003,-.062,.042]
        target=np.asarray(targets[s]);rest=np.array([-.44,0,-s*.20,-.85,0,-s*.14])
        def loss(v):
            T=torso@matrix(arm,v[:3])@matrix(fore,v[3:])
            reached=(T@np.r_[point,1])[:3]
            return np.r_[(reached-target)*14,(v-rest)*.10]
        result=least_squares(loss,rest,
            bounds=([-1.7,-.8,-1.2,-2.0,-.75,-1.3],[.8,.8,1.2,-.12,.75,1.3]),max_nfev=90)
        pose[arm]=tuple(result.x[:3]);pose[fore]=tuple(result.x[3:])


def forager(m):
    m.parents={};m.poses={};m.leather_uv={};m.ground_poses=True
    for g,c in [('pelvis',(0,.899,-.006)),('spine',(0,1.071,0)),('head',(0,1.535,.004))]:m.pivots[g]=np.array(c)
    m.parents['spine']='pelvis';m.parents['head']='spine';m.parents['visage']='head';m.pivots['visage']=m.pivots['head']
    for g,parent in [('jerkin','spine'),('wrap','pelvis')]:
        m.parents[g]=parent;m.pivots[g]=m.pivots[parent]
    # The neck and modest base undergarment remain covered in deep squats.
    m.orb((0,.903,-.013),(.157,.129,.118),'786044',group='pelvis',rough=.85)
    shape(m,[(0,1.574,.014,.046,.049),(0,1.548,.010,.055,.055),
             (0,1.508,.009,.062,.063),(0,1.483,.005,.082,.070)],'9c6c54','spine',12,20)
    costume(m);face(m)
    for s in (-1,1):limb(m,s)
    for fast,label in [(False,'walk'),(True,'run')]:
        for stance,suffix in [(1,'a'),(-1,'b')]:
            pose={'spine':(.17 if fast else .035,stance*.055,0),'head':(-.082 if fast else -.010,-stance*.028,0)}
            for s in (-1,1):
                f=s*stance
                pose[f'leg_{s}']=(-f*(.69 if fast else .40),0,s*.018)
                pose[f'shin_{s}']=((.23 if f>0 else 1.10) if fast else (.12 if f>0 else .47),0,0)
                pose[f'foot_{s}']=((.19 if f>0 else -.63) if fast else (.10 if f>0 else -.32),0,0)
                pose[f'arm_{s}']=(f*(.68 if fast else .39),0,s*.055)
                pose[f'forearm_{s}']=(-.82 if fast else -.34,0,0)
            m.poses[label+'-'+suffix]=pose
    crouch={'spine':(.34,0,0),'head':(-.18,0,0)}
    for s in (-1,1):
        crouch[f'leg_{s}']=(-.93,0,s*.12);crouch[f'shin_{s}']=(1.72,0,0)
        crouch[f'foot_{s}']=(-.76,0,0)
        crouch[f'arm_{s}']=(-.38,0,s*.09);crouch[f'forearm_{s}']=(-.66,0,0)
    m.poses['crouch']=crouch
    for key,lift in [('knap-a',.13),('knap-b',.012)]:
        pose=dict(crouch);pose['spine']=(.40,.02,0);pose['head']=(.15,.0,0)
        place_knapping_hands(m,pose,{1:(.001,1.22,.400),-1:(-.013-.46*lift,1.235+lift,.424-.16*lift)})
        m.poses[key]=pose


def embed_hide(m,path):
    """Embed seamless grain and fold relief only on the hide garments."""
    from scipy.ndimage import gaussian_filter,map_coordinates
    rng=np.random.default_rng(27139);n=256;y,x=np.mgrid[:n,:n]
    def field(sigma):
        a=gaussian_filter(rng.normal(size=(n,n)),sigma=sigma,mode='wrap')
        return a/max(.0001,a.std())
    p=field((.70,.70));mottle=field((8.1,7.5));nap=field((2.8,.64))
    warp=2.7*np.sin(2*PI*y/n)+1.4*np.sin(2*PI*(2*x+y)/n)
    nap=map_coordinates(nap,[y,x+warp],order=1,mode='grid-wrap')
    folds=np.exp(-((np.sin(PI*2*(x*3+y)/n)+.21*field((12.5,11)))/.105)**2)
    height=.31*p+.39*nap-.61*folds+.09*mottle
    l=np.clip(241+5.3*mottle+4.9*nap+3.6*p-6.8*folds,204,255)
    albedo=np.uint8(np.stack([l,l*(.996+.003*mottle),l*(.977+.006*mottle)],-1).clip(0,255))
    gradients=[(np.roll(height,-1,k)-np.roll(height,1,k))*.46 for k in (1,0)]
    normal=np.uint8((unit(np.stack([-gradients[0],gradients[1],np.ones_like(p)],-1))*.5+.5)*255)
    raw=Path(path).read_bytes();jl=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+jl]);buf=bytearray(raw[28+jl:])
    def add_view(data,target=None):
        off=len(buf);buf.extend(data)
        while len(buf)%4:buf.append(0)
        entry={'buffer':0,'byteOffset':off,'byteLength':len(data)}
        if target:entry['target']=target
        doc['bufferViews'].append(entry);return len(doc['bufferViews'])-1
    doc['images']=[];doc['textures']=[];doc['samplers']=[{'minFilter':9987,'magFilter':9729,'wrapS':10497,'wrapT':10497}]
    pores=.45*field((.60,.63))+.18*field((2.5,1.1))
    spots=field((4.4,5.1));tone=field((11,9))
    l=np.clip(242+3.0*p+5.2*tone+2.6*spots-3.0*np.maximum(spots-.7,0),208,255)
    skin=np.uint8(np.stack([l*(.997+.003*spots),l*.99,l*(.98-.003*tone)],-1).clip(0,255))
    dp=[(np.roll(pores,-1,k)-np.roll(pores,1,k))*.39 for k in (1,0)]
    skin_normal=np.uint8((unit(np.stack([-dp[0],dp[1],np.ones_like(l)],-1))*.5+.5)*255)
    for label,pixels,fmt,mime in [('Oiled hide',albedo,'JPEG','image/jpeg'),('Suede grain',normal,'PNG','image/png'),
                                   ('Facial pigmentation',skin,'JPEG','image/jpeg'),('Skin pores',skin_normal,'PNG','image/png')]:
        s=io.BytesIO();Image.fromarray(pixels).save(s,format=fmt,quality=94)
        ix=len(doc['images']);doc['images'].append({'name':label,'bufferView':add_view(s.getvalue()),'mimeType':mime})
        doc['textures'].append({'sampler':0,'source':ix})
    for node in doc['nodes']:
        if node['name'] not in ('jerkin','wrap','visage'):continue
        uv=[]
        for v,_,_,_,_,name in m.parts:
            if name==node['name']:uv.append(m.leather_uv.get(id(v),np.zeros((len(v),2))))
        uv=np.ascontiguousarray(np.concatenate(uv),dtype='<f4');ix=len(doc['accessors'])
        doc['accessors'].append({'bufferView':add_view(uv.tobytes(),34962),'componentType':5126,'count':len(uv),'type':'VEC2'})
        pr=doc['meshes'][node['mesh']]['primitives'][0];pr['attributes']['TEXCOORD_0']=ix
        material=doc['materials'][pr['material']]
        ix=2 if node['name']=='visage' else 0
        material['pbrMetallicRoughness']['baseColorTexture']={'index':ix};material['pbrMetallicRoughness']['metallicFactor']=.0
        material['normalTexture']={'index':ix+1,'scale':.33 if ix==2 else .51}
    doc['buffers'][0]['byteLength']=len(buf)
    s=json.dumps(doc,separators=(',',':')).encode();s+=b' '*((-len(s))%4)
    Path(path).write_bytes(struct.pack('<4sII',b'glTF',2,28+len(s)+len(buf))+struct.pack('<I4s',len(s),b'JSON')+s
                         +struct.pack('<I4s',len(buf),b'BIN\0')+buf)
