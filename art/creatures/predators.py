"""Two habitat-specific predators. The Z axis runs from tail to head."""
import math
import numpy as np
from build import PI, mix, rgb
from scipy.interpolate import PchipInterpolator


def pike(model):
    profile = [
        (-1.59,.77,.009,.010), (-1.46,.77,.068,.106), (-1.24,.76,.104,.15),
        (-.92,.76,.19,.224), (-.50,.76,.257,.290), (.04,.75,.306,.317),
        (.40,.75,.269,.264), (.62,.74,.238,.218), (.85,.744,.194,.146),
        (1.11,.734,.160,.076), (1.39,.72,.135,.044), (1.48,.706,.012,.014)
    ]

    def skin(z, vertical, side):
        dorsal = np.clip((vertical+.48)*.82,0,1)[...,None]
        dark = np.clip((vertical-.3)*1.38,0,1)[...,None]
        flesh = rgb('c6b27c')*(1-dorsal) + rgb('667761')*dorsal
        flesh = flesh*(1-dark) + rgb('405e55')*dark
        reeds = np.cos(17*z - 3.6*vertical + .9*np.sin(6*z))
        bands = np.clip((reeds-.06)*1.5,0,1)*np.exp(-((vertical-.20)/.52)**4)
        bands *= np.clip((.85-z)*2.5,.0,1)*np.clip((z+1.35)*4,.0,1)
        return flesh*(1-bands[...,None]*.95)+rgb('e9b461')*bands[...,None]*.95

    model.loft(profile,skin,73,32,rough=.36)
    # Broad, low-set duckbill meshing into the operculum.
    model.loft([(.53,.64,.17,.10),(.74,.632,.203,.073),(.97,.641,.164,.044),
                (1.23,.648,.153,.04),(1.45,.647,.114,.028),(1.54,.664,.016,.011)],
               'c7ae77',27,24,group='jaw',rough=.42)
    model.pivots['jaw']=np.array([0,.67,.53])
    model.fin([(0,.80,-1.53),(.015,.77,-1.39),(-.012,.74,-1.40),(0,.71,-1.52)],
              [(0,1.29,-2.00),(.009,.98,-1.80),(.007,.56,-1.81),(0,.26,-2.01)],
              'a78648','tail',10)
    model.fin([(0,.924,-1.21),(0,1.01,-.95),(0,1.047,-.72),(0,1.04,-.59)],
              [(0,1.19,-1.41),(0,1.40,-1.24),(0,1.46,-.92),(0,1.059,-.59)],
              'a38447','dorsal',10)
    model.fin([(0,.585,-1.16),(0,.531,-1.0),(0,.50,-.72)],
              [(0,.37,-1.39),(0,.28,-1.16),(0,.48,-.72)],
              'b9884f','fins',6)
    sample = PchipInterpolator(np.asarray(profile)[:,0],np.asarray(profile)[:,1:],axis=0)
    for side in (-1,1):
        for z,w in ((.39,.30),(-.38,.238)):
            model.fin([(side*w*.84,.76,z+.084),(side*w,.72,z),(side*w*.93,.66,z-.05)],
                      [(side*w*.91,.77,z+.09),(side*(w+.31),.55,z-.18),
                       (side*(w+.23),.46,z-.30)],'bc914d','fin_'+str(side),5)
        # Oblique hard rays rise above each gill cover.
        model.strand([(side*.18,.923,.63),(side*.247,.81,.56),(side*.242,.70,.51),
                      (side*.185,.611,.54)],[.008,.023,.018,.004],'594f3f',12,6)
        model.strand([(side*.174,.903,.67),(side*.252,.766,.59),(side*.213,.665,.61)],
                     [.006,.013,.003],'c0a56a',9,6)
        model.orb((side*.188,.832,.846),(.038,.070,.074),'302e28',rough=.36)
        model.orb((side*.212,.835,.847),(.028,.058,.064),'e3ae50',rough=.24)
        model.orb((side*.234,.833,.854),(.012,.044,.039),'20292b',rough=.14)
        model.orb((side*.244,.849,.870),(.004,.012,.012),'f4e9c0',seg=8,ring=5)
        model.strand([(side*.18,.866,.951),(side*.205,.902,.844),(side*.191,.916,.74)],
                     [.008,.019,.008],'796d4f',9,6)
        for j in range(7):
            z=.93+j*.069
            x=side*(.173-.048*(j/6))
            model.strand([(x,.689,z),(x,.661-.012*(j%2),z-.01)],[.010,.001],
                         'f0deaf',3,4)
        # Small raised scales break highlights over the pigmented flank.
        for j in range(14):
            z=-1.15+.105*j
            for row, angle in enumerate((.14,.46,.76)):
                zz=z+.04*(row%2)
                y,w,h=sample(zz)
                x=side*w*math.cos(angle)
                y+=h*math.sin(angle)
                model.strand([(x*.99,y-.008,zz+.033),(x*1.025,y,zz),
                              (x*.991,y+.008,zz-.038)],
                             [.0015,.006,.002],mix('789283','c8bc83',row*.14),4,4)


def mantis(model):
    bark='9d8254'
    green='7f915d'
    umber='655a42'
    # Abdomen bulges at the center and narrows into the thorax.
    def abdomen_skin(z, vertical, side):
        joint=(.5+.5*np.cos(z*31))**8
        k=np.clip((vertical+.4)*.88,0,1)[...,None]
        return (rgb('b2a06e')*(1-k)+rgb('748352')*k) * (1-.18*joint[...,None])
    model.loft([(-1.18,.64,.009,.008),(-1.03,.66,.123,.09),(-.79,.699,.224,.140),
                (-.48,.76,.239,.15),(-.18,.79,.173,.12),(.04,.82,.101,.093)],
               abdomen_skin,38,24,rough=.60)
    model.strand([(0,.79,-.13),(0,.89,.14),(0,1.21,.36),(0,1.51,.48)],
                 [.137,.125,.063,.079],green,18,12,rough=.51,ribs=7)
    model.orb((0,1.09,.298),(.150,.22,.096),'82975e',rot=(.45,0,0),rough=.56)
    # A broad triangular head tapering down into short opposed mandibles.
    model.loft([(.36,1.49,.047,.048),(.431,1.545,.222,.113),(.535,1.538,.254,.135),
                (.624,1.49,.165,.107),(.683,1.444,.065,.065),(.697,1.44,.006,.004)],
               '9ca46b',25,20,rough=.5)
    for s in (-1,1):
        group='wing_'+str(s)
        model.fin([(s*.028,.858,-.96),(s*.070,.93,-.56),(s*.057,.927,-.22),(s*.054,.904,-.049)],
                  [(s*.028,.858,-.97),(s*.174,.863,-.77),(s*.249,.918,-.36),(s*.121,.934,-.065)],
                  '8c9562',group,6)
        model.strand([(s*.052,.909,-.061),(s*.146,.936,-.34),(s*.122,.9,-.65),
                      (s*.027,.856,-1.00)],[.008,.014,.009,.001],'b7ad78',11,5,group=group)
        # Rear and middle legs have a ridged femur, a fine tibia and a three-jointed foot.
        for rear in (False,True):
            limb_start=len(model.parts)
            z=-.38 if rear else .046
            knee=(s*(.865 if rear else .65),.76 if rear else .73,z-(.47 if rear else -.045))
            ankle=(s*(1.03 if rear else .84),.135,z-(.75 if rear else .11))
            model.strand([(s*.114,.78,z), (s*.44,.71,z-.09),knee],
                         [.060,.056,.036],green,10,8,rough=.60)
            model.orb(knee,(.043,.049,.046),bark,seg=10,ring=6)
            model.strand([knee,((knee[0]+ankle[0])*.5,.46,(knee[2]+ankle[2])*.5),ankle],
                         [.032,.02,.012],umber,8,6)
            model.strand([ankle,(ankle[0]+s*.063,.089,ankle[2]+.05),
                          (ankle[0]+s*.134,.079,ankle[2]+.089)],
                         [.014,.013,.002],bark,6,5)
            model.joint(limb_start,f'leg_{s}_{int(rear)}',(s*.114,.78,z))
        # The raptorial arms fold back on themselves. The triangular gap remains
        # visible from above and behind, with stout femoral spines along its lower edge.
        arm_start=len(model.parts)
        shoulder=(s*.081,1.25,.367)
        elbow=(s*.465,1.04,.617)
        wrist=(s*.673,1.55,.978)
        tip=(s*.629,1.156,.791)
        model.strand([shoulder,(s*.26,1.12,.51),elbow],[.070,.055,.062],
                     bark,11,8,rough=.56)
        model.strand([elbow,(s*.527,1.23,.754),(s*.61,1.418,.88),wrist],
                     [.066,.090,.073,.034],green,14,11,rough=.47)
        model.strand([wrist,(s*.684,1.39,.931),tip,(s*.590,1.075,.757)],
                     [.040,.038,.026,.003],umber,11,7,rough=.51)
        for j in range(6):
            f=(j+.7)/7
            A=np.array(elbow)*(1-f)+np.array(wrist)*f
            A+=np.array([s*.033,0,.034])
            model.strand([A,A+[s*.016,-.055-.03*(j%2),.057]],
                         [.014,.001],'d1b57c',3,5)
        model.joint(arm_start,f'arm_{s}',shoulder)
        model.orb((s*.217,1.576,.528),(.10,.116,.101),'b1b87c',
                  rot=(.04,0,s*-.27),rough=.31,seg=18,ring=12,fleck=.13)
        model.orb((s*.249,1.59,.613),(.032,.035,.015),'494d35',rough=.29)
        model.orb((s*.246,1.606,.624),(.008,.010,.004),'ece4bc',seg=8,ring=5)
        for j in range(8):
            a=2*PI*j/8
            model.orb((s*(.233+.051*math.cos(a)),1.574+.063*math.sin(a),.609),
                      (.008,.006,.004),'88965f',seg=6,ring=4)
        model.strand([(s*.097,1.615,.575),(s*.15,1.79,.59),(s*.265,1.945,.64),
                      (s*.359,2.022,.725)],[.017,.012,.007,.0017],umber,12,5)
        model.strand([(s*.068,1.423,.617),(s*.075,1.376,.675),(s*.021,1.39,.711)],
                     [.026,.020,.002],bark,7,6)


def shiner(model):
    # Short, laterally compressed body distinct from the pennant-finned minnow.
    sections=[
        (-.93,.73,.017,.038),(-.78,.732,.068,.106),(-.53,.746,.134,.212),
        (-.22,.761,.205,.315),(.11,.771,.232,.335),(.30,.785,.213,.285),
        (.47,.795,.166,.211),(.628,.794,.106,.115),(.701,.789,.016,.014)
    ]
    def silver(z,y,x):
        k=np.clip((y+.39)*1.30,0,1)[...,None]
        col=rgb('e5ddd0')*(1-k)+rgb('95acaa')*k
        darkback=np.clip((y-.43)*1.6,0,1)[...,None]
        col=col*(1-darkback)+rgb('546e74')*darkback
        band=np.exp(-((y+.015-.14*z)*8.0)**4)[...,None]
        col=col*(1-band*.95)+rgb('303e4a')*band*.95
        lip=np.exp(-((y-.17-.12*z)*15)**2)[...,None]
        return col*(1-lip*.87)+rgb('f7dc98')*(lip*.87)
    model.loft(sections,silver,49,42,rough=.24)
    model.fin([(0,.76,-.90),(0,.73,-.79),(0,.72,-.79),(0,.70,-.90)],
              [(0,1.075,-1.29),(0,.826,-1.045),(0,.663,-1.036),(0,.442,-1.29)],
              'bbc1ac','tail',8)
    model.fin([(0,1.035,-.37),(0,1.067,-.22),(0,1.067,-.087),(0,1.038,.034)],
              [(0,1.070,-.52),(0,1.257,-.461),(0,1.367,-.248),(0,1.049,.032)],
              '9baba1','dorsal',6)
    model.fin([(0,.533,-.54),(0,.481,-.355),(0,.459,-.185)],
              [(0,.38,-.66),(0,.302,-.499),(0,.443,-.186)],
              'c4bea1','fins',5)
    interp=PchipInterpolator(np.asarray(sections)[:,0],np.asarray(sections)[:,1:],axis=0)
    for s in (-1,1):
        model.fin([(s*.190,.776,.329),(s*.198,.726,.286),(s*.177,.693,.256)],
                  [(s*.206,.775,.330),(s*.342,.622,.089),(s*.267,.558,.02)],
                  'd5c89e','fin_'+str(s),5)
        model.strand([(s*.125,.957,.423),(s*.201,.863,.33),(s*.211,.756,.284),
                      (s*.167,.651,.301)],[.006,.011,.012,.004],'798f91',9,6)
        model.orb((s*.156,.866,.482),(.032,.083,.084),'59615d',rough=.28)
        model.orb((s*.177,.867,.485),(.033,.074,.074),'e3d6a2',rough=.19)
        model.orb((s*.202,.868,.495),(.018,.057,.055),'26313a',rough=.15)
        model.orb((s*.216,.887,.508),(.006,.013,.013),'eef0dc',seg=8,ring=5)
        for i in range(10):
            for j,a in enumerate((-.73,-.47,.35,.64,.91)):
                z=-.65+i*.102+.038*(j%2)
                cy,w,h=interp(z);x=s*w*math.cos(a);y=cy+h*math.sin(a)
                model.strand([(x*.995,y-.013,z+.033),(x*1.021,y,z),
                              (x*.99,y+.012,z-.034)],[.001,.0055,.001],
                             'c3cdc2' if j!=2 else 'f3dba7',4,4)
