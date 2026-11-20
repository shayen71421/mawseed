"""The canopy falcon and amber pollinator, authored along local +Z with Y up."""
import math
import numpy as np
from scipy.interpolate import PchipInterpolator
from build import PI, rgb, mix, unit


def quill(m, a, b, width, colors, name, lean=.0, phase=0., bars=.0, lengthwise=13):
    """Asymmetrical overlapping vanes with a raised rachis and separated barbs."""
    a,b=np.asarray(a,float),np.asarray(b,float)
    shaft=b-a
    side=unit(np.array([shaft[2],0.,-shaft[0]]))
    u=np.linspace(0,1,lengthwise)
    v=np.array([-1.,-.73,-.31,0.,.29,.71,1.])
    width_profile=width*np.sin(PI*u)**.63*(1.09-.28*u)
    center=a+u[:,None]*shaft+side*lean*np.sin(PI*u)[:,None]
    center[:,1]+=.035*np.sin(PI*u)
    vv=center[:,None,:]+(width_profile[:,None]*v[None,:]*(1+.16*np.sign(v))[None,:])[...,None]*side
    ridge=(.040*width+.009)*(1-abs(v)**.59)
    vv[...,1]+=ridge[None,:]*np.sin(PI*u)[:,None]
    striae=.978+.033*np.sin(51*u[:,None]+phase-5.7*abs(v)[None,:])
    tip=np.clip((u-.61)*1.7,0,.58)
    c=rgb(colors[0])[None,:]*(1-tip[:,None])+rgb(colors[1])[None,:]*tip[:,None]
    tide=(.5+.5*np.sin(19*u[:,None]+phase-2.2*abs(v)[None,:]))**7
    c=c[:,None,:]*(1-bars*tide[...,None])+rgb(colors[2])*bars*tide[...,None]
    c=c*striae[...,None]*(1+.047*v[None,:,None])
    m.grid(vv,c,.68,name,False,outward=np.broadcast_to([0,1,0],vv.shape))
    m.strand([a,(a+b)*.5+side*lean+[0,.046,0],b],[width*.054,width*.036,.0008],
             mix(colors[0],colors[2],.34),7,4,rough=.66,group=name)


def wing_core(m,s,stations,name):
    # A closed cambered airfoil supports the leading edge and covers feather roots.
    # The model remains continuous when the falcon banks edge-on.
    sec=np.asarray(stations,float)
    span=np.linspace(sec[0,0],sec[-1,0],20)
    y,leading,trailing,thick=PchipInterpolator(sec[:,0],sec[:,1:],axis=0)(span).T
    a=np.linspace(0,PI*2,25,endpoint=False)
    across=(1-np.cos(a))*.5
    z=leading[:,None]*(1-across)+trailing[:,None]*across
    height=thick[:,None]*np.sin(a)*(1-.69*across)
    Y=y[:,None]+height-.024*across
    X=np.broadcast_to(s*span[:,None],Y.shape)
    V=np.stack([X,Y,z],-1)
    underside=np.clip(-np.sin(a),0,1)[None,:,None]
    colors=rgb('3e5555')*(1-underside)+rgb('838976')*underside
    center=np.stack([s*span,y,(leading+trailing)*.5],-1)
    m.grid(V,colors,.72,name,outward=V-center[:,None,:])


def falcon(m):
    m.parents={};m.poses={}
    back='374f51';rump='546968';pale='dfcba2';primary='30464a'
    def body_ink(z,y,x):
        mantle=np.clip((y+.19)*1.24,0,1)[...,None]
        c=rgb('d3b484')*(1-mantle)+rgb(back)*mantle
        flank=np.exp(-((y+.20)/.47)**2)*np.exp(-((z+.12)/.89)**2)
        marks=(.5+.5*np.cos(z*28-5*y-1.1*np.sin(z*17)))**8
        return c*(1-.40*(flank*marks)[...,None])
    m.loft([(-.96,.93,.025,.05),(-.74,.923,.183,.16),(-.51,.91,.268,.243),
            (-.14,.921,.342,.317),(.136,.958,.373,.377),(.365,1.009,.318,.344),
            (.487,1.085,.238,.233),(.554,1.12,.113,.125)],body_ink,42,35,rough=.65)
    # Scapulars, mantle and rump form one overlapping coat when seen in chase view.
    # Place every feather against the curved dorsal surface to avoid a flat cape.
    body_section=PchipInterpolator([-.96,-.74,-.51,-.14,.136,.365,.487,.554],
        [[.93,.025,.05],[.923,.183,.16],[.91,.268,.243],[.921,.342,.317],
         [.958,.373,.377],[1.009,.318,.344],[1.085,.238,.233],[1.12,.113,.125]],axis=0)
    def mantle_point(z,angle):
        y,w,h=body_section(z)
        return np.array([w*math.sin(angle),y+h*math.cos(angle)+.004,z])
    for row in range(6):
        z=-.42+.131*row
        for k in range(7):
            a=(k-3)*.25+(.077 if row%2 else 0)
            root=mantle_point(z,a);tip=mantle_point(z-.209,a*1.14)
            quill(m,root,tip,.063-.009*abs(a),('526a66','3a5553','a8ab91'),
                  'body',phase=row+k*.3,bars=.16,lengthwise=10)
    # Compact falcon skull, a pale throat and a conspicuous dark malar stripe.
    m.orb((0,1.245,.405),(.254,.276,.266),back,rough=.69,seg=28,ring=17)
    m.orb((0,1.17,.563),(.203,.166,.145),'d4c5a2',rough=.74,seg=21,ring=13)
    for s in (-1,1):
        m.orb((s*.182,1.258,.508),(.074,.129,.123),'a29e81',rot=(0,s*.14,s*.19),rough=.70)
        m.strand([(s*.201,1.298,.543),(s*.215,1.218,.578),(s*.205,1.133,.551),
                  (s*.177,1.076,.506)],[.036,.051,.035,.004],'394849',12,10,rough=.73)
        m.orb((s*.219,1.320,.546),(.052,.066,.070),'b99c51',rot=(0,s*.20,0),rough=.48)
        m.orb((s*.252,1.323,.554),(.032,.052,.059),'292d29',rough=.16,seg=18,ring=12)
        m.orb((s*.274,1.327,.565),(.013,.032,.034),'493c29',rough=.19)
        m.orb((s*.281,1.329,.568),(.008,.023,.024),'202824',rough=.17)
        m.orb((s*.286,1.345,.580),(.003,.008,.008),'f6e8c3',rough=.16,seg=8,ring=5)
        m.strand([(s*.094,1.377,.617),(s*.178,1.384,.604),(s*.241,1.377,.548),
                  (s*.254,1.351,.478)],[.011,.031,.035,.007],'4a5851',12,8,rough=.70)
        m.strand([(s*.178,1.392,.606),(s*.220,1.394,.569),(s*.247,1.382,.521)],
                 [.004,.009,.002],'9eac95',8,5)
        # Short cheek feathers trace the side of the face rather than forming a rigid collar.
        for j in range(7):
            q=j/6
            quill(m,(s*(.159+.065*q),1.31-.09*q,.447-.095*q),
                  (s*(.22+.034*q),1.205-.080*q,.308-.10*q),.027,
                  ('6c7770','9a9d86','d2c69f'),'body',phase=j)
    # Nape chevrons visually connect the hood to the tapering shoulder feathers.
    for row in range(3):
        for k in range(7):
            a=(k-3)*.25;z=.437-.070*row
            x=.192*math.sin(a)
            def crown(zz):
                yy=1.245+.277*math.sqrt(max(.02,1-(x/.254)**2-((zz-.405)/.266)**2))
                return (x,yy+.004,zz)
            quill(m,crown(z),crown(z-.108),.044,('425855','445650','929b87'),
                  'body',bars=.09,phase=row+k*.110,lengthwise=9)
    for s in (-1,1):
        for j in range(15):
            z=-.24+(j%5)*.126;angle=-.20-(j//5)*.23
            yy,w,h=body_section(z)
            A=np.array([s*w*math.cos(angle),yy+h*math.sin(angle),z])
            m.strand([A+[s*.002,.015,.024],A+[s*.005,0,0],A+[s*.003,-.013,-.021]],
                     [.002,.010,.001],'776e56',5,5,rough=.8)
    # A projecting hooked maxilla over a separate lower mandible, ochre cere and nares.
    m.loft([(.547,1.289,.098,.073),(.604,1.283,.119,.076),(.674,1.281,.093,.064),
            (.735,1.265,.074,.055),(.768,1.243,.048,.043),(.785,1.212,.025,.028),
            (.790,1.182,.004,.009)],'434f50',20,20,rough=.39)
    m.loft([(.533,1.236,.078,.038),(.615,1.228,.092,.039),(.681,1.223,.061,.026),
            (.720,1.225,.024,.016),(.732,1.23,.003,.004)],'777872',17,16,rough=.48)
    m.strand([(0,1.242,.748),(0,1.219,.776),(0,1.188,.785),(0,1.158,.776)],
             [.034,.029,.016,.002],'354346',10,8,rough=.40)
    m.orb((0,1.301,.630),(.102,.053,.055),'bca65d',rough=.51)
    for s in (-1,1):
        m.orb((s*.078,1.316,.652),(.016,.012,.014),'534e3d',rough=.62,seg=10,ring=6)
        m.strand([(s*.031,1.235,.727),(s*.072,1.234,.682),(s*.103,1.239,.614)],
                 [.003,.005,.002],'303b3b',6,5)
    m.pivots['tail']=np.array([0.,.943,-.694])
    # A narrow falcon tail that spreads toward a shallow, barred fan.
    for j in range(13):
        f=(j-6)/6
        quill(m,(f*.147,.936+.012*(1-abs(f)),-.675),
              (f*.389,.849+.035*abs(f),-1.601+.17*abs(f)**1.7),.073,
              (rump,'4b5757',pale),'tail',lean=.012*f,phase=j*.2,bars=.40)
    for j in range(9):
        f=(j-4)/4
        quill(m,(f*.14,.986,-.53),(f*.284,.911,-1.10+.05*abs(f)),.077,
              ('485e58','42534e','8e998a'),'tail',lean=.006*f,phase=f,bars=.24)
    for s in (-1,1):
        shoulder=(s*.251,1.071,.236);wrist=(s*1.025,1.102,.167)
        wing=f'wing_{s}';hand=f'wingtip_{s}'
        m.pivots[wing]=np.array(shoulder);m.pivots[hand]=np.array(wrist);m.parents[hand]=wing
        # Leading edge is fleshy at the shoulder and tapers along the pointed hand.
        m.strand([shoulder,(s*.550,1.075,.320),(s*.814,1.114,.308),wrist],
                 [.108,.103,.073,.052],back,16,13,rough=.67,group=wing)
        m.strand([wrist,(s*1.36,1.130,.122),(s*1.58,1.134,-.061),(s*1.817,1.121,-.274)],
                 [.058,.045,.022,.004],back,14,10,rough=.68,group=hand)
        wing_core(m,s,[(.23,1.055,.256,-.332,.050),(.49,1.059,.347,-.505,.061),
                       (.77,1.083,.315,-.580,.047),(1.025,1.084,.194,-.624,.037)],wing)
        wing_core(m,s,[(1.019,1.077,.192,-.618,.037),(1.28,1.088,.131,-.691,.028),
                       (1.58,1.101,-.037,-.736,.020),(1.81,1.102,-.287,-.821,.016),
                       (2.105,1.095,-.815,-.943,.005)],hand)
        # Long secondaries meet pointed, swept primaries at the wrist. Two overlapping
        # covert rows conceal roots when the player banks or folds the hand inward.
        for j in range(11):
            q=j/10
            quill(m,(s*(.25+.74*q),1.073+.041*q,.10+.139*math.sin(q*PI)),
                  (s*(.37+.89*q),1.008+.047*q,-.665-.091*math.sin(q*PI)),
                  .117-.022*q,(back,primary,'aeb3a3'),wing,lean=s*.031,phase=q,bars=.23)
        for j in range(10):
            q=j/9
            quill(m,(s*(.935+.79*q),1.105+.024*q,.135-.24*q),
                  (s*(1.251+.945*q),1.046+.069*q,-.781+.17*q-.43*q*q),.123-.067*q,
                  ('354e53','22373d','a5a9a2'),hand,lean=s*(.039+.025*q),phase=q*1.6,bars=.20)
        for band in range(2):
            for j in range(13):
                q=j/12;attach=wing if q<.59 else hand;z=.247-.20*max(0,(q-.62)/.38)
                quill(m,(s*(.231+1.431*q),1.128+.039*q+band*.024,z+.019*band),
                      (s*(.325+1.539*q),1.092+.027*q+band*.023,
                       z-(.52-.15*band)*(.87+.13*math.sin(q*PI))),.094-.039*q,
                      ('49635f','354d4d','98a28b'),attach,lean=.018*s,phase=j*.23,bars=.16)
        leg=f'leg_{s}';foot=f'foot_{s}';grip=f'grip_{s}';hallux=f'hallux_{s}'
        knee=(s*.166,.755,-.065);ankle=(s*.183,.485,-.255);palm=(s*.194,.370,-.130)
        for key,p in [(leg,knee),(foot,ankle),(grip,palm),(hallux,palm)]:m.pivots[key]=np.array(p)
        m.parents[foot]=leg;m.parents[grip]=foot;m.parents[hallux]=foot
        m.strand([knee,(s*.174,.638,-.139),ankle],[.088,.066,.028],'a89976',9,9,rough=.69,group=leg)
        for j in range(5):
            q=j/4
            quill(m,(s*(.131+.07*q),.731,-.060-.024*q),
                  (s*(.143+.07*q),.562,-.199-.028*q),.030,
                  ('ac9b78','8d8265','cfbd98'),leg,phase=j,bars=.17)
        m.strand([ankle,(s*.187,.427,-.224),palm],[.033,.029,.036],'bd9d55',9,8,rough=.64,group=foot,ribs=7)
        for k in range(4):
            t=(k+.4)/4;p=np.asarray(ankle)*(1-t)+np.asarray(palm)*t
            m.orb(p,(.030,.009,.029),'a48a4e',rough=.67,seg=9,ring=5,group=foot)
        m.orb(palm,(.043,.031,.046),'c3a45c',rough=.62,seg=12,ring=8,group=foot)
        # Three front toes and one opposed hallux. Each nail is a separate hooked cone.
        for digit in (-1,0,1,2):
            rear=digit==2;dest=hallux if rear else grip
            dx=s*(.015 if rear else digit*.072);dz=-.143 if rear else .174-.036*abs(digit)
            P=np.asarray(palm);joint=P+[dx*.57,-.035,dz*.53];pad=P+[dx,-.057,dz]
            m.strand([P,joint,pad],[.023,.021,.013],'caaa61',8,7,rough=.63,group=dest,ribs=4)
            m.orb(pad,(.017,.016,.018),'aa894e',seg=8,ring=5,group=dest)
            m.strand([pad,pad+[dx*.13,-.021,dz*.12],pad+[dx*.18,-.051,dz*.10],
                      pad+[dx*.10,-.067,-dz*.050]],[.016,.014,.008,.0013],
                     '373d37',9,6,rough=.34,group=dest)
    m.poses['upstroke']={}
    m.poses['hunt']={'tail':(-.18,0,0)}
    for s in (-1,1):
        m.poses['upstroke'][f'wing_{s}']=(0,0,s*.44)
        m.poses['upstroke'][f'wingtip_{s}']=(0,s*.08,-s*.27)
        m.poses['hunt'][f'wing_{s}']=(0,-s*.045,s*.15)
        m.poses['hunt'][f'wingtip_{s}']=(0,s*.43,-s*.28)
        m.poses['hunt'][f'leg_{s}']=(-.92,0,s*.16)
        m.poses['hunt'][f'foot_{s}']=(.28,0,0)
        m.poses['hunt'][f'grip_{s}']=(.56,0,0)
        m.poses['hunt'][f'hallux_{s}']=(-.49,0,0)


def velvet(m,center,radii,count,under,tip,name='body'):
    """Short, golden two-tone setae combed away from the thorax collar."""
    rng=m.rng;n=count
    z=rng.uniform(-1,1,n);a=rng.uniform(0,2*PI,n);circ=np.sqrt(1-z*z)
    norm=np.stack([circ*np.cos(a),circ*np.sin(a),z],1)
    p=norm*radii+center
    normal=unit(norm/np.asarray(radii))
    length=rng.uniform(.024,.054,(n,1))*(.84+.22*np.maximum(norm[:,1:2],0))
    flow=unit(normal*.54+np.array([0,.08,-.79]));forward=unit(np.cross(normal,flow))
    w=rng.uniform(.0020,.0045,(n,1));q=p+normal*length*.38+flow*length*.38
    V=np.stack([p-forward*w*.65,p+forward*w*.65,q-forward*w,q+forward*w,
                p+flow*length+normal*length*.58],1)
    idx=np.array([[0,1,3],[0,3,2],[2,3,4]])+np.arange(n)[:,None,None]*5
    colors=rgb(under)*(1-rng.uniform(0,.32,(n,1,1)))+rgb(tip)[None,None,:]*(.16+.08*norm[:,1:2,None])
    colors=colors*np.array([.75,.80,.94,1.05,1.17])[None,:,None]
    m.mesh(V,idx,colors.reshape(-1,3),.90,name,outward=np.repeat(normal[:,None,:],5,axis=1))
    V,N,C,F,R,G=m.parts[-1]
    m.parts[-1]=(V,unit(.22*N+.78*np.repeat(normal,5,axis=0)),C,F,R,G)


def bee_wing(m,s,secondary):
    wing=f'wing_{s}';glass=f'glass_{s}'
    # Outline and cells are specified in local span/chord coordinates. Distinct
    # fore- and hindwings share one hinge and overlap lightly at their hamuli.
    z0=.190 if not secondary else .022
    sx=1.06 if not secondary else .72; chord=.37 if not secondary else .25
    def vec(u,v):
        return np.array([s*(.160+u*sx),.899+.23*u+.055*np.sin(PI*u)-.086*v,
                         z0+.058*np.sin(PI*u)-u*(.087 if not secondary else .34)-chord*v])
    roots=np.array([.0,.14,.32,.56,.77,.92,1])
    leading=np.array([.0,-.12,-.20,-.17,-.095,.04,.18])
    trailing=np.array([.05,.41,.67,.79,.72,.54,.19])
    if secondary:
        leading+=.025;trailing+=np.array([0,.16,.17,.11,.025,-.03,0])
    curve_lo=PchipInterpolator(roots,leading);curve_hi=PchipInterpolator(roots,trailing)
    U,T=np.meshgrid(np.linspace(0,1,24),np.linspace(0,1,8),indexing='ij')
    V=curve_lo(U)*(1-T)+curve_hi(U)*T
    P=np.array([vec(u,v) for u,v in zip(U.flat,V.flat)]).reshape(U.shape+(3,))
    sheen=.5+.5*np.sin(U*9+T*3)
    C=rgb('a5c5c2')*(1-sheen[...,None])+rgb('e5d9ad')*sheen[...,None]
    m.grid(P,C,.19,glass,False,outward=np.broadcast_to([0,1,0],P.shape))
    for edge,weight in [(curve_lo,.0105),(curve_hi,.0056)]:
        points=[vec(u,edge(u)) for u in np.linspace(0,1,18)]
        m.strand(points,[weight,weight*.77,weight*.45],'797655',18,5,rough=.52,group=wing)
    def vein(path,weight=1.):
        points=[vec(u,v)+[0,.006,0] for u,v in path]
        m.strand(points,[.0070*weight,.0055*weight,.0028*weight],'888568',8,5,rough=.55,group=wing)
    vein([(.035,.039),(.26,.116),(.54,.114),(.78,.051),(.972,.143)],1.08)
    vein([(.05,.077),(.25,.279),(.47,.381),(.695,.371),(.94,.27)])
    vein([(.20,.245),(.35,.504),(.56,.616),(.82,.592)],.91)
    for u,a,b in [(.31,.106,.308),(.49,.132,.374),(.63,.103,.376),
                   (.72,.077,.353),(.53,.385,.590),(.68,.382,.607)]:
        vein([(u,a),(u+.035,(a+b)*.5),(u+.060,b)],.73)


def pollinator(m):
    m.parents={};m.poses={}
    amber='bf9447';coal='4d4937';gold='dbad55';cream='e8c684'
    m.orb((0,.792,.090),(.203,.209,.244),amber,rough=.81,seg=24,ring=15)
    velvet(m,np.array((0,.792,.09)),(.204,.209,.244),810,'bf9448','e5c378')
    m.orb((0,.868,.284),(.168,.182,.132),'776444',rough=.72,seg=19,ring=12)
    m.orb((0,.826,.392),(.192,.175,.171),'5f573f',rough=.66,seg=23,ring=14)
    velvet(m,np.array((0,.826,.392)),(.192,.175,.169),290,'807047','c2a562')
    # Dark square jowls under a short golden clypeus; knees bent at the antenna elbow.
    m.orb((0,.778,.527),(.069,.056,.047),'aa915d',rough=.64,seg=16,ring=10)
    for s in (-1,1):
        m.orb((s*.157,.851,.469),(.086,.137,.084),'363d37',rot=(.10,-s*.15,s*-.23),rough=.28,seg=22,ring=15)
        # Ivory reflections and a small patch of true faceting brighten a dark compound eye.
        for row in range(5):
            for j in range(4):
                z=.477+.015*j;y=.816+.022*row+.007*(j%2)
                dx=.084*math.sqrt(max(.03,1-((z-.469)/.084)**2-((y-.851)/.138)**2))
                m.orb((s*(.157+dx),y,z),(.0028,.0041,.0043),'697265' if (row+j)%3 else '778072',
                      rough=.34,seg=6,ring=4)
        m.orb((s*.218,.91,.512),(.004,.011,.009),'c3cfaf',seg=8,ring=5,rough=.23)
        m.strand([(s*.065,.934,.505),(s*.103,1.019,.570),(s*.132,1.057,.601),
                  (s*.195,1.055,.714),(s*.234,1.038,.761)],[.014,.012,.009,.010,.005],
                 coal,13,6,rough=.6,ribs=8)
        m.strand([(s*.071,.734,.501),(s*.085,.699,.566),(s*.046,.690,.590)],
                 [.034,.022,.004],'68573a',8,6)
    m.strand([(0,.728,.512),(0,.706,.546),(0,.685,.578),(0,.660,.581)],
             [.018,.014,.010,.003],'82663e',9,6,rough=.61)
    m.pivots['abdomen']=np.array([0.,.782,-.101])
    # A narrow petiole leads into five overlapping sclerites. The dark pointed
    # sting is visibly continuous with the terminal segment.
    m.strand([(0,.79,-.068),(0,.783,-.136),(0,.761,-.198)],[.080,.061,.096],
             '66573c',8,9,rough=.56,group='abdomen')
    cs=[(-.883,.697,.002,.002),(-.803,.710,.043,.043),(-.718,.726,.101,.096),
        (-.605,.740,.153,.134),(-.461,.757,.179,.153),(-.336,.760,.166,.145),
        (-.231,.760,.116,.112),(-.174,.767,.069,.071),(-.162,.767,.021,.015)]
    profile=PchipInterpolator(np.asarray(cs)[:,0],np.asarray(cs)[:,1:],axis=0)
    def segment(z,y,x):
        bars=.5+.5*np.cos(39*(z+.014*y)+.42)
        bands=np.clip((bars-.39)*3.3,0,1)
        C=rgb('d2a24b')*(1-bands[...,None])+rgb('544d3b')*bands[...,None]
        belly=np.clip((-.48-y)*1.0,0,.50)[...,None]
        return C*(1-belly)+rgb('a8894e')*belly
    m.loft(cs,segment,57,28,group='abdomen',rough=.43)
    for i,z in enumerate((-.753,-.640,-.486,-.328,-.220)):
        cy,w,h=profile(z);points=[]
        for a in np.linspace(-PI,PI,26):
            points.append((w*1.015*math.cos(a),cy+h*1.013*math.sin(a),z+.010*math.sin(a)))
        m.strand(points,[.004,.005,.004],'9f834b',27,5,rough=.62,group='abdomen')
    m.strand([(0,.702,-.817),(0,.694,-.883),(0,.682,-.969),(0,.665,-1.026)],
             [.026,.017,.007,.001],'393b30',10,8,rough=.27,group='abdomen')
    for s in (-1,1):
        hinge=(s*.152,.897,.159)
        m.pivots[f'wing_{s}']=np.array(hinge);m.pivots[f'glass_{s}']=np.array(hinge)
        m.parents[f'glass_{s}']=f'wing_{s}'
        bee_wing(m,s,False);bee_wing(m,s,True)
        for j in range(3):
            g=f'leg_{s}_{j}'
            if j==0:
                P=(s*.117,.716,.254);knee=(s*.266,.647,.393);ankle=(s*.291,.509,.437);toe=(s*.324,.491,.506)
            elif j==1:
                P=(s*.139,.675,.121);knee=(s*.305,.613,.058);ankle=(s*.354,.455,-.066);toe=(s*.383,.405,-.140)
            else:
                P=(s*.125,.674,-.010);knee=(s*.259,.655,-.122);ankle=(s*.327,.443,-.310);toe=(s*.354,.407,-.440)
            m.pivots[g]=np.array(P)
            m.strand([P,(np.array(P)+knee)*.5+[0,-.013,0],knee],[.033,.037,.023],coal,
                     8,8,rough=.65,group=g)
            m.strand([knee,(np.array(knee)+ankle)*.5,ankle],[.026,.039 if j==2 else .021,.019],
                     '83663f',8,8,rough=.7,group=g,ribs=3)
            m.strand([ankle,(np.array(ankle)+toe)*.5, toe],[.016,.012,.006],'6d593d',7,6,rough=.70,group=g,ribs=4)
            if j==2:
                bowl=(s*.323,.521,-.242)
                m.orb(bowl,(.060,.079,.086),'8a703e',rot=(-.55,s*.15,0),rough=.79,group=g)
                m.orb((s*.352,.520,-.245),(.062,.075,.072),'d6a143',rot=(-.46,s*.14,0),rough=.88,group=g)
                # Pollen grains remain visible as a granular mass on both hind tibiae.
                for k in range(44):
                    a=k*2.40;u=m.rng.uniform(-1,1);r=math.sqrt(1-u*u)
                    d=np.array([s*abs(r*math.cos(a)),u,r*math.sin(a)])
                    p=np.array((s*.352,.520,-.245))+d*np.array([.056,.071,.069])
                    R=m.rng.uniform(.006,.012)
                    m.orb(p,(R,R*.87,R),'e1b35a' if k%4 else 'c49236',seg=6,ring=4,group=g,rough=.92)
    m.poses['upstroke']={f'wing_{s}':(.04,0,s*.54) for s in (-1,1)}
    m.poses['sting']={'abdomen':(-1.09,0,0)}
    for s in (-1,1):
        m.poses['sting'][f'wing_{s}']=(0,-.09*s,s*.34)
        for j in range(3):m.poses['sting'][f'leg_{s}_{j}']=(-.25+.22*j,0,s*(.26+.04*j))
