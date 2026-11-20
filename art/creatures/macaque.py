"""Mawseed's adult forest macaque. Dimensions are in local game units."""
import io
import json
import math
import struct
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.interpolate import PchipInterpolator
from build import PI, rgb, mix, unit


def groom(model, sections, palette, group='body', count=290, length=.090, width=.012,
          phase=0., mask=None):
    """Sweep an anatomical cross-section and comb short overlapping fur along its surface."""
    sections=np.asarray(sections,float)
    pos=sections[:,:3]
    knots=np.r_[0,np.cumsum(np.linalg.norm(np.diff(pos,axis=0),axis=1))]
    arc=knots[-1]
    curve=PchipInterpolator(knots/arc,sections,axis=0)
    derivative=curve.derivative()

    def sample(t,a):
        t,a=np.broadcast_arrays(t,a)
        s=curve(t);T=unit(derivative(t)[...,:3])
        ref=np.broadcast_to(np.array([1.,.013,0.]),T.shape)
        W=unit(ref-(ref*T).sum(-1,keepdims=True)*T)
        H=unit(np.cross(W,T))
        w,h=s[...,3:4],s[...,4:5]
        ca=np.cos(a)[...,None];sa=np.sin(a)[...,None]
        d=W*w*ca+H*h*sa
        n=unit(W/np.maximum(.007,w)*ca+H/np.maximum(.007,h)*sa)
        across=unit(-W*w*sa+H*h*ca)
        return s[...,:3]+d,n,across

    def pigment(t,a):
        brow,flank,guard=[rgb(x) for x in palette]
        k=.44+.29*np.sin(a+.75*np.sin(t*4+phase))+.14*np.sin(5*t+phase)
        k=np.clip(k,0,1)[...,None]
        base=brow*(1-k)+flank*k
        tips=(.16+.14*np.sin(a*3+t*15+phase))*(.65+.35*np.cos(t*9))
        return base*(1-tips[...,None])+guard*tips[...,None]

    nt,na=20,28
    t,a=np.meshgrid(np.linspace(0,1,nt),np.linspace(0,PI*2,na+1),indexing='ij')
    v,n,x=sample(t,a)
    band=1+.035*np.cos(a*15+t*17)+.018*np.sin(a*9-t*22)
    c=pigment(t,a)*band[...,None]
    model.grid(v,c,.88,group,False,outward=n)
    model.fur_uv[id(model.parts[-1][0])]=np.stack([a/(PI*2)*4.0, t*max(1.1,arc*2.6)],-1).reshape(-1,2)
    for ring_index, direction in [(0,-1),(-1,1)]:
        # Close the sweep at its respective attachment and distal ends.
        r=v[ring_index,:-1];p=r.mean(axis=0);tangent=unit(derivative(float(ring_index!=0))[:3])*direction
        vv=np.vstack([r,p]);f=np.array([(na,i,(i+1)%na) for i in range(na)])
        col=np.vstack([c[ring_index,:-1],c[ring_index,:-1].mean(axis=0)])
        model.mesh(vv,f,col,.86,group,outward=np.broadcast_to(tangent,vv.shape))
    # Each seven-vertex lock has a central highlight ridge, shaded roots and
    # a fine point. Flow follows the changing tangent of the particular body part.
    rng=model.rng
    count=int(count*1.32)
    t=rng.uniform(.018,.94,count);a=rng.uniform(0,2*PI,count)
    if mask is not None:
        keep=mask(t,a);t=t[keep];a=a[keep]
    count=len(t)
    if count==0:return
    ll=length*rng.uniform(.62,1.25,count)
    dt=np.minimum(.995-t,ll/(arc+.001));swing=.071*np.sin(a*3+t*10+phase)+rng.uniform(-.083,.083,count)
    p,n,side=sample(t,a);q,nq,sq=sample(t+dt*.46,a+swing*.48);r,nr,sr=sample(t+dt,a+swing)
    w=(width*rng.uniform(.36,.87,count))[:,None]
    bend=ll[:,None]*rng.uniform(.07,.15,(count,1))
    P=p-n*.001;Q=q+nq*bend*.81;R=r+nr*(bend*.51+.002)
    V=np.stack([P-side*w*.55,P+side*w*.55,Q-sq*w,Q+nq*w*.45,
                Q+sq*w,R-sr*w*.22+nr*.004,R+nr*.005+sr*w*.11],1)
    pattern=np.array([[0,1,3],[0,3,2],[1,4,3],[2,3,5],[3,4,6],[3,6,5]])
    F=pattern[None,:,:]+np.arange(count)[:,None,None]*7
    col=pigment(t,a)
    shades=rng.uniform(.76,1.07,(count,1))
    tip=mix(palette[1],palette[2],.42)
    tint=np.array([.04,.06,.12,.17,.10,.27,.34])[None,:,None]
    C=(col[:,None,:]*(1-tint)+tip*tint)*shades[:,None,:]
    C*=np.array([.82,.85,.94,1.05,.91,1.04,1.08])[None,:,None]
    N=np.stack([n,n,nq,nq,nq,nr,nr],1)
    model.mesh(V,F,C.reshape(-1,3),.91,group,outward=N)
    # Smooth hair normals toward the body; all cards retain a broad anisotropic highlight.
    A,B,C,F,R,G=model.parts[-1]
    model.parts[-1]=(A,unit(B*.26+N.reshape(-1,3)*.74),C,F,R,G)


def skin_texture(model):
    vertices=model.parts[-1][0]
    model.skin_uv[id(vertices)]=np.stack([vertices[:,0]*2.75+vertices[:,2]*1.64,
                                          vertices[:,1]*2.4+vertices[:,2]*.76],-1)


def face(model):
    orb=model.orb;line=model.strand
    # Skull, hairline and ears are separate from the pigmented facial skin.
    groom(model,[(0,2.08,.402,.025,.07),(0,2.045,.418,.155,.171),
                 (0,1.952,.417,.227,.20),(0,1.810,.353,.244,.187),
                 (0,1.679,.245,.188,.15),(0,1.604,.215,.084,.076)],
          ('534b3b','a08051','d4bb87'),count=690,length=.045,width=.0058,
          mask=lambda t,a: np.sin(a)>.025)
    groom(model,[(0,1.996,.514,.122,.021),(0,2.040,.466,.167,.040),
                 (0,2.052,.389,.160,.044),(0,2.015,.300,.115,.034)],
          ('72634b','9d885e','c8b585'),count=390,length=.047,width=.0060,phase=1.4,
          mask=lambda t,a: np.sin(a)>-.35)
    for s in (-1,1):
        # Rounded pinna, raised helix, inner concha and curled antihelix.
        orb((s*.231,1.887,.382),(.072,.112,.075),'aa7965',
            rot=(.18,0,s*.12),rough=.72,seg=18,ring=13)
        orb((s*.271,1.888,.404),(.030,.077,.048),'6f5045',rough=.76,seg=14,ring=9)
        points=[]
        for a in np.linspace(0,2*PI,17):
            points.append((s*(.273+.015*math.cos(a)),1.889+.086*math.cos(a),
                           .401+.056*math.sin(a)))
        line(points,[.010,.014,.011],'be9272',22,6,rough=.67)
        line([(s*.294,1.852,.42),(s*.299,1.882,.392),(s*.291,1.92,.419)],
             [.012,.015,.005],'a6755f',9,6)
        # Cheek ruff fans down and back from the temple.
        groom(model,[(s*.162,1.987,.46,.020,.036),(s*.196,1.922,.485,.082,.091),
                     (s*.209,1.829,.456,.102,.106),(s*.207,1.733,.401,.079,.081),
                     (s*.219,1.64,.307,.026,.037)],
              ('70644b','b59a6c','e0c89a'),count=265,length=.063,width=.0068,
              phase=s*.9)
    # The face is a single continuous, tapering muzzle. Its cheek pads and
    # nasal bridge merge into the skull at the orbital rims.
    def skin(z,y,x):
        base=rgb('896a5c');t=np.clip((z-.51)*2.95,0,.78)[...,None]
        mottling=1+.045*np.sin(z*83-y*4)*np.cos(y*16+x*3)
        shade=.88+.12*np.clip((y+.6),0,1)
        pigment=base*(1-t)+rgb('977760')*t
        bridge=np.exp(-((x/.59)**2))*np.clip((y+.1)*1.45,0,1)
        pigment=pigment*(1-.37*bridge[...,None])+rgb('6f6455')*.37*bridge[...,None]
        blush=np.exp(-((z-.61)/.075)**2)*(1-np.abs(y))
        return (pigment*(1-.19*blush[...,None])+rgb('aa786a')*.19*blush[...,None])*(mottling*shade)[...,None]
    model.loft([(.377,1.845,.089,.114),(.483,1.857,.180,.169),(.552,1.850,.172,.157),
                (.615,1.824,.150,.130),(.676,1.794,.130,.103),(.737,1.769,.108,.077),
                (.785,1.760,.072,.051),(.805,1.761,.026,.027),(.810,1.762,.001,.002)],
               skin,41,36,rough=.72)
    skin_texture(model)
    model.loft([(.509,1.754,.114,.072),(.585,1.736,.128,.066),(.686,1.722,.119,.051),
                (.752,1.717,.084,.034),(.772,1.724,.027,.021),(.778,1.723,.002,.002)],
               '886a56',23,22,rough=.72)
    skin_texture(model)
    for s in (-1,1):
        # The eye lens is actually cut to an almond profile by both lids.
        # Pigment and iris are painted within that surface, avoiding exposed white spheres.
        orb((s*.089,1.938,.566),(.102,.070,.043),'715c4f',rot=(0,s*.19,s*-.075),rough=.74)
        u,v=np.meshgrid(np.linspace(-1,1,51),np.linspace(-1,1,22),indexing='ij')
        aperture=np.maximum(.0001,1-u*u)**.70
        X=s*(.093+.061*u)
        Y=1.931+.005*u+v*.022*aperture
        Z=.609-.015*u+.012*aperture*(1-.78*v*v)
        radius=np.sqrt(((X-s*.088)/.035)**2+((Y-1.932)/.035)**2)
        iris=np.clip((1.03-radius)*12,0,1)
        pupil=np.clip((.50-radius)*15,0,1)
        fibers=.96+.07*np.cos(21*np.arctan2(Y-1.932,X-s*.088))
        color=rgb('71685a')*(1-iris[...,None])+rgb('806039')*iris[...,None]*fibers[...,None]
        color=color*(1-pupil[...,None])+rgb('211f1a')*pupil[...,None]
        limbus=np.exp(-((radius-.98)/.11)**2)
        color*=1-.28*limbus[...,None]
        vv=np.stack([X,Y,Z],-1);model.grid(vv,color,.20,'body',False,outward=np.broadcast_to([0,0,1],vv.shape))
        line([(s*.033,1.926,.620),(s*.066,1.952,.628),(s*.105,1.956,.615),
              (s*.149,1.941,.596)],[.004,.008,.008,.002],'624c3e',12,6)
        line([(s*.034,1.924,.614),(s*.088,1.909,.618),(s*.133,1.915,.602),
              (s*.153,1.938,.590)],[.002,.0038,.004,.001],'967960',10,5)
        orb((s*.087-.006,1.940,.623),(.0048,.0058,.003),'f3dbad',rough=.21,seg=9,ring=5)
        # Wide, low supraorbital shelves with a skin-to-hair transition.
        line([(s*.014,1.976,.574),(s*.076,1.980,.588),(s*.137,1.972,.574),
              (s*.179,1.954,.525)],[.021,.025,.022,.010],'836d51',13,9,rough=.84)
        for j in range(13):
            u=j/13
            line([(s*(.016+.144*u),1.988-.014*u,.580-.018*u),
                  (s*(.036+.147*u),1.997-.022*u,.567-.029*u)],
                 [.0031,.0005],'aa9067' if j%3 else '705f49',3,4,rough=.88)
        # Dark nostril flares and lip seam visibly wrap the face.
        orb((s*.035,1.795,.780),(.040,.021,.018),'805f52',rot=(s*.12,s*.15,s*.1),
            rough=.63,seg=15,ring=9)
        orb((s*.041,1.794,.800),(.016,.008,.005),'3f352c',rot=(0,0,s*.24),rough=.84)
        line([(s*.014,1.740,.796),(s*.059,1.738,.779),(s*.107,1.740,.727),
              (s*.124,1.757,.653)],[.004,.006,.005,.002],'604a40',11,5,rough=.86)
        for j in range(8):
            z=.656+j%4*.028;y=1.778+j//4*.014
            x=s*(.132-(z-.65)*.27)
            orb((x,y,z),(.0035,.004,.005),'84654e',seg=6,ring=4)
        # Crow's feet, a broken nasolabial crease and stubble follow the cheek plane.
        for j in range(3):
            line([(s*(.153+.007*j),1.927-.008*j,.559),(s*(.164+.003*j),1.929-.014*j,.543),
                  (s*.173,1.935-.017*j,.518)],[.001,.003,.001],'846c58',5,5,rough=.78)
        line([(s*.097,1.790,.755),(s*.116,1.773,.714),(s*.119,1.753,.676)],
             [.001,.0028,.001],'836a56',7,5,rough=.80)
        for j in range(34):
            z=.628+.11*model.rng.random(); yy=.005+.045*model.rng.random()
            x=.145-(z-.625)*.31
            line([(s*x,1.757+yy,z),(s*(x+.004),1.755+yy,z+.002),
                  (s*(x+.0068),1.753+yy,z+.003)],[.0019,.0014,.0003],
                 '87765d' if j%4 else 'c1ae88',3,4,rough=.85)
        # Short whiskers sprout from the flanks, not the mouth.
        for j in range(6):
            z=.65+.015*j;y=1.787+.020*math.sin(j*2)
            line([(s*.134,y,z),(s*(.145+.005*j),y-.008,z+.009),
                  (s*(.156+.008*j),y-.018+.005*j,z+.015)],[.0022,.0013,.0003],
                 'd7bc8e',4,4,rough=.8)
    orb((0,1.900,.598),(.031,.059,.030),'99745c',rough=.66)
    line([(0,1.766,.803),(0,1.752,.803),(0,1.742,.797)],
         [.003,.003,.001],'866350',4,5)


def club(model):
    g='arm_1'
    pts=np.array([(.566,.397,.550),(.612,.615,.591),(.679,.932,.671),
                  (.772,1.287,.757),(.857,1.491,.816),(.885,1.569,.819)])
    radius=[.047,.041,.049,.079,.114,.073]
    model.strand(pts,radius,'776348',33,23,rough=.83,group=g,ribs=8)
    # Bark ridges spiral irregularly toward a lighter, splintered striking end.
    for j in range(11):
        a=2*PI*j/11
        ridge=[]
        for k,p in enumerate(pts):
            rr=radius[k]*(1.03+.052*math.cos(k*3+j));aa=a+.19*math.sin(k*.64+j)
            ridge.append(p+rr*np.array([math.cos(aa),-.24*math.cos(aa),math.sin(aa)]))
        model.strand(ridge,[.003,.004,.005,.007,.009,.002],
                     '9a7c53' if j%4==0 else '6e5941',22,5,rough=.86,group=g)
    model.orb(pts[-1],(.071,.035,.073),'c09d69',rot=(.14,0,-.21),
              rough=.86,group=g,seg=17,ring=8)
    for j in range(3):
        model.strand([(.822+j*.016,1.50,.819),(.863+j*.012,1.555,.841),
                      (.896+j*.009,1.596-j*.016,.85)],[.012,.009,.001],
                     'c5a16a',7,5,group=g)
    model.strand([(.791,1.349,.787),(.885,1.385,.825),(.932,1.421,.858)],
                 [.065,.046,.023],'796447',11,12,group=g,rough=.84)
    model.orb((.931,1.421,.858),(.025,.025,.017),'a08058',rot=(.08,.63,-.48),group=g,rough=.84)
    # Worn grip sits immediately below the fingers.
    for j in range(3):
        a=np.linspace(0,2*PI,17);y=.512+j*.028
        x=.566+(y-.397)*.20;z=.55+(y-.397)*.215
        knots=[(x+.046*math.cos(i),y-.009*math.cos(i)+.009*i/(2*PI),
                z+.045*math.sin(i)) for i in a]
        model.strand(knots,[.0075,.008,.0065],'b1a579',18,5,group=g,rough=.84)


def hand(model,s,p,grip):
    g=f'arm_{s}';p=np.array(p)
    skin='896b56';pad='ac8970';nail='6d6250'
    def O(q,sc,c,**kw):model.orb(p+np.array(q),sc,c,group=g,**kw)
    def S(points,rs,c):model.strand([p+np.array(q) for q in points],rs,c,9,7,group=g,rough=.68)
    O((0,0,0),(.082,.105,.058) if grip else (.090,.078,.065),skin,
      rot=(-.36 if grip else -.66,0,s*-.15),rough=.68)
    for i in range(4):
        if grip:
            # Flexed phalanges wrap the handle from the outside toward its front face.
            yy=.070-i*.039
            A=(.030,yy,.012);B=(.065,yy-.015,.051);C=(.043,yy-.024,.098);D=(-.003,yy-.025,.103)
        else:
            xx=s*(-.052+i*.034);L=.146-.022*abs(i-1.35)
            A=(xx,-.024,.034);B=(xx+s*.014,-.078,.063);C=(xx+s*.010,-L,.086);D=(xx,-L-.009,.069)
        S([A,B,C,D],[.024,.022,.018,.011],pad)
        O(D,(.014,.015,.008),nail,rough=.66,seg=9,ring=5)
    if grip:
        S([(-.046,.044,.024),(-.064,.011,.063),(-.036,-.023,.092),(.001,-.043,.089)],
          [.034,.026,.020,.011],pad)
    else:
        S([(s*-.069,.018,.02),(s*-.103,-.023,.052),(s*-.119,-.048,.06)],
          [.028,.021,.013],pad)


def macaque(model):
    model.fur_uv={};model.skin_uv={}
    # Neck and shoulders sit well ahead of the bent hips. The tawny saddle is strongest
    # on the viewer-facing rear quarter while the flank and belly stay warm grey.
    groom(model,[(0,1.652,.170,.205,.15),(0,1.593,.125,.387,.24),
                 (0,1.433,.041,.405,.27),(0,1.230,-.111,.329,.276),
                 (0,1.024,-.205,.294,.251),(0,.873,-.257,.178,.172)],
          ('594d39','a88d62','d1b888'),count=1300,length=.108,width=.0095)
    groom(model,[(0,1.793,.320,.182,.14),(0,1.704,.194,.282,.19),
                 (0,1.594,.088,.374,.203),(0,1.494,-.014,.313,.184)],
          ('675942','a99773','d8c49b'),count=550,length=.093,width=.011)
    # Tail arcs off the rump and drops. Its tip turns back into the silhouette.
    g='tail'
    tail_start=len(model.parts)
    groom(model,[(0,1.064,-.411,.089,.09),(-.014,1.020,-.567,.093,.084),
                 (-.068,.884,-.759,.071,.066),(-.146,.639,-.875,.061,.055),
                 (-.255,.435,-.929,.047,.041),(-.384,.309,-.861,.034,.030),
                 (-.462,.304,-.731,.021,.020),(-.478,.337,-.644,.006,.006)],
          ('645540','9c815c','c8b68a'),g,240,.048,.005)
    model.joint(tail_start,g,(0,1.064,-.411))
    face(model)
    for s in (-1,1):
        g=f'arm_{s}';root=(s*.288,1.589,.133);start=len(model.parts)
        if s==-1:
            arm=[(*root,.142,.127),(-.410,1.499,.138,.148,.146),
                 (-.483,1.284,.177,.113,.111),(-.498,1.149,.204,.092,.089),
                 (-.530,1.048,.244,.102,.099),(-.546,.888,.322,.085,.079),
                 (-.558,.708,.397,.067,.063),(-.559,.596,.431,.052,.053)]
            wrist=(-.562,.567,.447)
        else:
            arm=[(*root,.140,.134),(.418,1.491,.13,.151,.143),
                 (.498,1.306,.087,.124,.113),(.562,1.118,.111,.096,.091),
                 (.607,1.045,.179,.104,.103),(.638,.944,.320,.088,.082),
                 (.65,.832,.467,.071,.065),(.641,.744,.552,.056,.056)]
            wrist=(.640,.700,.557)
        groom(model,arm,('68543c','927c5a','c1ad81'),g,405,.067,.0075,phase=s)
        hand(model,s,wrist,s==1)
        if s==1:club(model)
        model.joint(start,g,root)
        # Flexed knee and backward heel keep the mass over the two spreading feet.
        g=f'leg_{s}';hip=(s*.196,.992,-.20);start=len(model.parts)
        z=.071 if s==-1 else -.051
        groom(model,[(s*.184,1.059,-.23,.151,.166),(s*.224,.952,-.181,.180,.185),
                     (s*.259,.801,-.038+z,.158,.141),(s*.268,.694,.042+z,.111,.112),
                     (s*.288,.579,-.019+z,.101,.098),(s*.298,.427,-.138+z,.105,.093),
                     (s*.299,.285,-.21+z,.072,.068),(s*.294,.137,-.254+z,.052,.053)],
              ('675642','9e8562','c8b38b'),g,370,.070,.0073,phase=s*1.5)
        p=np.array([s*.292,.114,-.159+z])
        model.orb(p,(.083,.066,.159),'88725d',rot=(.16,0,-s*.07),rough=.71,group=g)
        for j in range(4):
            x=s*(-.044+j*.034)
            A=p+[x,-.010,.088];B=p+[x+s*.005,-.028,.147]
            C=p+[x+s*.010,-.036,.194-.021*abs(j-1)]
            model.strand([A,B,C],[.024,.020,.014],'a28667',8,7,rough=.70,group=g)
            model.orb(C,(.014,.009,.020),'786d58',group=g,seg=9,ring=5)
        model.strand([p+[-s*.051,-.004,-.020],p+[-s*.091,-.027,.034],
                      p+[-s*.115,-.029,.075]],[.034,.027,.015],'a28667',8,7,group=g,rough=.70)
        model.joint(start,g,hip)


def coat_images():
    """Seamless close-range agouti fibers with a shallow tangent-space normal map."""
    from scipy.ndimage import gaussian_filter, map_coordinates
    rng=np.random.default_rng(6009)
    n=256
    y,x=np.mgrid[0:n,0:n]
    drift=2.7*np.sin(2*PI*y/n)+1.28*np.sin(2*PI*(x+2*y)/n)
    def field(sigma):
        f=gaussian_filter(rng.normal(size=(n,n)),sigma=sigma,mode='wrap')
        return f/(f.std()+1e-9)
    h=map_coordinates(.60*field((6.8,.50))+.28*field((2.4,.63))+.12*field((11,.9)),
                      [y,x+drift],order=1,mode='grid-wrap')
    ticks=field((1.7,.56))
    lum=np.clip(239+7.5*h+2.2*ticks,207,255)
    diffuse=np.stack([lum,lum*.995,lum*.984],-1).astype('uint8')
    dx=(np.roll(h,-1,1)-np.roll(h,1,1))*.33
    dy=(np.roll(h,-1,0)-np.roll(h,1,0))*.33
    normal=unit(np.stack([-dx,dy,np.ones_like(h)],-1))
    pictures=[]
    for data,fmt in [(diffuse,'JPEG'),(np.uint8((normal*.5+.5)*255),'PNG')]:
        out=io.BytesIO();Image.fromarray(data).save(out,format=fmt,quality=94)
        pictures.append(out.getvalue())
    pores=field((.50,.6));flecks=field((2.5,1.8));age=field((9,12))
    creases=np.exp(-((np.sin(2*PI*(y/36+x/213))+.38*flecks+.4*age)/.16)**2)
    l=np.clip(237+pores*3.8+flecks*2.8+age*6.5-6.5*creases,192,254)
    skin=np.stack([l*1.0,l*.989-age*.9,l*.981-age*1.7],-1).astype('uint8')
    height=.38*pores-.31*creases
    dx=(np.roll(height,-1,1)-np.roll(height,1,1))*.51
    dy=(np.roll(height,-1,0)-np.roll(height,1,0))*.51
    normal=unit(np.stack([-dx,dy,np.ones_like(height)],-1))
    for data,fmt in [(skin,'JPEG'),(np.uint8((normal*.5+.5)*255),'PNG')]:
        out=io.BytesIO();Image.fromarray(data).save(out,format=fmt,quality=94)
        pictures.append(out.getvalue())
    return pictures


def embed_coat(model,path):
    """Attach the coat maps only to follicle-bearing surfaces; leave face, feet and club bare."""
    data=Path(path).read_bytes();jl=struct.unpack_from('<I',data,12)[0]
    doc=json.loads(data[20:20+jl]);buf=bytearray(data[28+jl:])
    def view(blob,target=None):
        offset=len(buf);buf.extend(blob)
        while len(buf)%4:buf.append(0)
        entry={'buffer':0,'byteOffset':offset,'byteLength':len(blob)}
        if target:entry['target']=target
        doc['bufferViews'].append(entry)
        return len(doc['bufferViews'])-1
    def access(value,type_name,component,target):
        v=view(np.ascontiguousarray(value).tobytes(),target)
        doc['accessors'].append({'bufferView':v,'componentType':component,'count':len(value),'type':type_name})
        return len(doc['accessors'])-1
    doc['images']=[]
    for name,mime,blob in zip(('Agouti fibers','Combed fiber normals','Facial pigmentation','Skin pores'),('image/jpeg','image/png','image/jpeg','image/png'),coat_images()):
        doc['images'].append({'name':name,'bufferView':view(blob),'mimeType':mime})
    doc['samplers']=[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]
    doc['textures']=[{'sampler':0,'source':i} for i in range(4)]
    fur=len(doc['materials']);doc['materials'].append({'name':'Agouti guard coat','doubleSided':True,
        'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.86},
        'normalTexture':{'index':1,'scale':.52}})
    skin=len(doc['materials']);doc['materials'].append({'name':'Muzzle skin','doubleSided':True,
        'pbrMetallicRoughness':{'baseColorTexture':{'index':2},'metallicFactor':0,'roughnessFactor':.69},
        'normalTexture':{'index':3,'scale':.44}})
    gloss=len(doc['materials']);doc['materials'].append({'name':'Moist eyes',
        'doubleSided':True,'pbrMetallicRoughness':{'roughnessFactor':.24,'metallicFactor':0}})
    for node in doc['nodes']:
        mesh=doc['meshes'][node['mesh']]
        old=mesh['primitives'][0];count=0;uvs=[];subsets={}
        for verts,n,c,faces,roughness,group in model.parts:
            if group!=node['name']:continue
            uv=model.fur_uv.get(id(verts))
            material=fur if uv is not None else gloss if roughness<.47 else old['material']
            if id(verts) in model.skin_uv:
                uv=model.skin_uv[id(verts)];material=skin
            subsets.setdefault(material,[]).append(faces+count)
            uvs.append(uv if uv is not None else np.zeros((len(verts),2)))
            count+=len(verts)
        uv=access(np.concatenate(uvs).astype('<f4'),'VEC2',5126,34962)
        primitives=[]
        for material,faces in subsets.items():
            faces=np.concatenate(faces).ravel()
            dtype='<u2' if count<65536 else '<u4';component=5123 if count<65536 else 5125
            indices=access(faces.astype(dtype),'SCALAR',component,34963)
            attrs=dict(old['attributes'])
            if material in (fur,skin):attrs['TEXCOORD_0']=uv
            primitives.append({'attributes':attrs,'indices':indices,'material':material})
        mesh['primitives']=primitives
    # Drop the original all-material index streams once the joint meshes have
    # been divided into coat, eye and bare-surface draw calls.
    old_accessors=doc['accessors'];old_views=doc['bufferViews']
    access_ids={};view_ids={};packed=bytearray()
    doc['accessors']=[];doc['bufferViews']=[]
    def keep_view(i):
        if i not in view_ids:
            entry=old_views[i].copy();start=entry['byteOffset']
            entry['byteOffset']=len(packed)
            packed.extend(buf[start:start+entry['byteLength']])
            while len(packed)%4:packed.append(0)
            view_ids[i]=len(doc['bufferViews']);doc['bufferViews'].append(entry)
        return view_ids[i]
    def keep_accessor(i):
        if i not in access_ids:
            entry=old_accessors[i].copy();entry['bufferView']=keep_view(entry['bufferView'])
            access_ids[i]=len(doc['accessors']);doc['accessors'].append(entry)
        return access_ids[i]
    for mesh in doc['meshes']:
        for pr in mesh['primitives']:
            pr['indices']=keep_accessor(pr['indices'])
            pr['attributes']={name:keep_accessor(i) for name,i in pr['attributes'].items()}
    for img in doc['images']:img['bufferView']=keep_view(img['bufferView'])
    buf=packed
    doc['buffers'][0]['byteLength']=len(buf)
    j=json.dumps(doc,separators=(',',':')).encode()
    j+=b' '*((-len(j))%4)
    Path(path).write_bytes(struct.pack('<4sII',b'glTF',2,28+len(j)+len(buf))
        +struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(buf),b'BIN\0')+buf)
