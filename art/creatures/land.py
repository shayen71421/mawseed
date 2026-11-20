from build import *
def feather(m,A,B,width,color,group):
 A=np.array(A);B=np.array(B);d=B-A;side=unit(np.array([d[2],0,-d[0]]));u=np.linspace(0,1,16)
 half=width*np.sin(PI*u)**.73*(1-u*.35);center=A+u[:,None]*d;center[:,1]+=.075*np.sin(PI*u)
 cross=np.linspace(-1,1,7);V=center[:,None,:]+half[:,None,None]*cross[None,:,None]*side
 V[...,1]+=.024*(1-abs(cross))[None,:]*np.sin(PI*u)[:,None];bands=.95+.065*np.cos(47*u[:,None]-6*abs(cross)[None,:])
 C=rgb(color)*bands[...,None];m.grid(V,C,.53,group,closed=False)
 m.strand([A,(A+B)*.5+[0,.09,0],B],[.014,.012,.002],mix(color,'ffefbf',.32),8,5,group=group)
def bird(m):
 m.loft([(-1.0,.86,.018,.045),(-.7,.86,.20,.19),(-.3,.84,.33,.30),(.03,.88,.39,.38),(.34,.93,.33,.34),(.50,1.02,.19,.20)],lambda z,y,x:rgb('dca461')*(1-np.clip(y+.35,0,1)[...,None])+rgb('36746d')*np.clip(y+.35,0,1)[...,None],rough=.66)
 m.orb((0,1.20,.47),(.30,.29,.32),'357a76',rough=.48,seg=23,ring=14)
 m.orb((0,1.13,.68),(.22,.14,.18),'e8c793')
 m.strand([(0,1.20,.71),(0,1.20,.94),(0,1.17,1.11)],[.108,.077,.003],'3c4644',9,9)
 for s in [-1,1]:
  eyes(m,s*.244,1.24,.59,.075,s)
  m.strand([(s*.24,1.31,.69),(s*.27,1.32,.56),(s*.25,1.32,.41)],[.012,.021,.005],'dfd9a3',8,6)
  W='wing_'+str(s);m.fin([(s*.17,1.00,-.64),(s*.3,1.11,-.17),(s*.31,1.07,.20)],[(s*.53,.95,-.8),(s*1.06,1.07,-.36),(s*.7,1.16,.21)],'2d6d6b',W,6)
  for j in range(10):
   t=j/9;feather(m,(s*(.37+.37*t),1.078,-.52+.60*t),(s*(.79+.87*t),1-.10*t,-1.07+.61*t),.13,'368e89' if j%3 else '27636b',W)
  for j in range(7):
   t=j/6;feather(m,(s*.34,1.12,-.55+.59*t),(s*(.69+.31*t),1.12,-.85+.66*t),.092,'65a398',W)
  for j in range(3):
   feather(m,(s*(.055+j*.042),.90,-.60),(s*(.10+j*.093),.86,-1.55+j*.10),.081,'297071','tail')
  m.strand([(s*.17,.67,.0),(s*.20,.39,.06),(s*.23,.36,.21)],[.035,.026,.016],'b39e73',7,6)
  for k in [-1,1]:m.strand([(s*.23,.36,.16),(s*.23+k*.06,.34,.27)],[.017,.002],'bf9f6d',4,5)
def arthropod(m,k):
 mite=k=='mite';shell='bc6549' if mite else '746979'; dark='743c3e' if mite else '453c48';cream='f5be8e' if mite else 'd9ba9f'
 m.orb((0,.57,-.42),(.48,.42,.65),shell,rough=.42,seg=26,ring=15);m.orb((0,.58,.37),(.36,.32,.40),dark,rough=.41,seg=24,ring=14)
 if mite:
  # Each red dorsal shield carries a pair of shallow black sensory pits and
  # curved guard hairs with ivory tips; the plated silhouette reads from behind.
  for j in range(4):
   z=-.74+j*.235
   for side in (-1,1):
    x=side*(.19+.033*math.sin(j))
    height=.57+.42*math.sqrt(max(.03,1-(x/.48)**2-((z+.42)/.65)**2))
    m.orb((x,height-.019,z),(.097,.043,.13),'ab543e',rot=(0,side*.24,0),rough=.52)
    m.orb((x,height+.016,z+.022),(.023,.015,.030),'593a34',seg=8,ring=5)
    m.strand([(x+side*.053,height,z),(x+side*.105,height+.057,z-.02),
              (x+side*.128,height+.080,z-.065)],[.010,.007,.001],cream,5,5)
 for j in range(7):
  z=-.84+j*.132;w=.45*math.sqrt(max(.01,1-((z+.42)/.65)**2))
  for s in [-1,1]:
   m.strand([(s*.02,.57+.42*math.sqrt(max(.01,1-((z+.42)/.65)**2)),z),(s*w*.4,.57+(w/.48)*.385,z-.055),(s*w*.68,.57+(w/.48)*.29,z-.12)],[.009,.021,.005],cream,7,5)
 for s in [-1,1]:
  for j in range(4):
   start=len(m.parts);t=j/3;A=(s*.25,.57,.44-.62*t);B=(s*(.56+.13*math.sin(t*PI)),.66,.62-1.17*t);C=(s*(.82+.16*math.sin(t*PI)),.83,.83-1.71*t);D=(s*(1.0+.23*math.sin(t*PI)),.26,1.03-2.06*t);E=(s*(1.17+.21*math.sin(t*PI)),.09,1.09-2.23*t)
   m.strand([A,B,C],[.081,.064,.067],dark,9,8);m.orb(C,(.072,.076,.070),cream,seg=12,ring=7)
   m.strand([C,D,E],[.061,.034,.006],shell,9,7)
   if mite:m.joint(start,f'leg_{s}_{j}',A)
  for j in range(3):
   x=s*(.10+.077*j);y=.71-j*.017;z=.755-j*.046;sz=.066 if j==0 else .045
   m.orb((x,y,z),(sz,sz,sz*.72),'182b32',rough=.11);m.orb((x-.009,y+.017,z+.032),(sz*.22,sz*.25,sz*.12),'ceeace',seg=7,ring=5)
  start=len(m.parts)
  m.strand([(s*.135,.48,.61),(s*.16,.40,.86),(s*.124,.27,.96)],[.079,.052,.004],cream,9,7)
  if mite:m.joint(start,f'palp_{s}',(s*.135,.48,.61))
def insect(m,k):
 moth=k=='moth';coat='e8bb72' if moth else 'd9a052'
 m.orb((0,.80,-.20),(.23,.22,.55),coat,rough=.65,seg=23,ring=13);m.orb((0,.86,.2),(.28,.28,.33),'c89c71' if moth else '9b723f',rough=.78);m.orb((0,.90,.52),(.23,.20,.22),'79695e',rough=.47)
 for j in range(5):
  z=-.66+j*.13;w=.23*math.sqrt(max(.03,1-((z+.2)/.55)**2));m.orb((0,.80,z),(w*1.027,w*.98,.054),'a78673' if moth else '665343',rough=.67,ring=8)
 for s in [-1,1]:
  W='wing_'+str(s)
  if moth:
   m.fin([(s*.07,.95,.25),(s*.16,.97,.13),(s*.17,.95,-.17),(s*.10,.89,-.35)],[(s*.24,.99,.41),(s*1.03,1.19,.59),(s*1.27,1.13,-.11),(s*.62,1.01,-.48)],'d7ad7a',W,13)
   m.fin([(s*.13,.93,.08),(s*.17,.94,-.16),(s*.09,.89,-.37)],[(s*.77,1.08,.09),(s*.90,1.02,-.50),(s*.42,.95,-.83)],'b67968',W,9)
   for j in range(2):
    p=(s*(.80-.23*j),1.119-.103*j,.02-.43*j);m.orb(p,(.139,.018,.132),'725965',group=W);m.orb((p[0],p[1]+.014,p[2]),(.080,.014,.071),'f5d39a',group=W)
  else:
   for j in range(2):
    d=-.36*j;m.fin([(s*.12,.95,.26+d),(s*.19,1.0,.13+d),(s*.15,.96,-.07+d)],[(s*.38,1.15,.29+d),(s*(1.05-.20*j),1.34-.12*j,.17+d),(s*(.80-.12*j),1.14-.1*j,-.24+d)],'cad4b8',W,8)
  m.orb((s*.182,.91,.60),(.095,.137,.12),'304348',rough=.22);m.orb((s*.231,.95,.661),(.020,.026,.019),'c9d6ca')
  m.strand([(s*.08,1.04,.66),(s*.14,1.24,.78),(s*.24,1.36,.84)],[.026,.018,.008],'69554b',8,6)
  if moth:
   for j in range(8):
    u=j/9;m.strand([(s*(.14+.1*u),1.24+.12*u,.78+.06*u),(s*(.19+.14*u),1.29+.14*u,.76+.07*u)],[.011,.002],'d7b38d',4,5)
  for j in range(3):
   z=.31-j*.22;m.strand([(s*.14,.72,z),(s*.29,.56,z-.02),(s*(.41+.06*j),.49,z-.15),(s*.50,.44,z-.28)],[.033,.030,.014,.003],'796347',10,6)
def gastropod(m):
 m.loft([(-1.10,.15,.003,.005),(-.79,.18,.18,.093),(-.42,.21,.29,.17),(.10,.25,.34,.18),(.48,.29,.28,.20),(.78,.38,.22,.22),(.93,.43,.12,.12),(.99,.43,.005,.004)],'899b81',rough=.39)
 m.orb((0,.72,-.23),(.43,.58,.59),'b88559',rough=.29,seg=32,ring=20)
 for s in [-1,1]:
  pts=[]
  for a in np.linspace(0,4.6*PI,56):
   r=.025+.497*a/(4.6*PI);pts.append((s*.435*math.sqrt(max(.02,1-(r/.60)**2)),.74+r*math.sin(a),-.23+r*math.cos(a)))
  m.strand(pts,[.020,.038,.059,.084],'90664e',60,8);m.strand([(x+s*.009,y+.018,z+.010) for x,y,z in pts],[.008,.012,.018,.02],'eac598',60,6)
  for j in range(16):
   a=j*2*PI/16;m.strand([(s*.2,.72+.48*math.sin(a),-.23+.51*math.cos(a)),(s*.02,.72+.57*math.sin(a+.07),-.23+.58*math.cos(a+.07))],[.011,.005],'d9aa75',4,5)
  for j in range(2):
   p=(s*(.34-.10*j),.85-.24*j,.96+.11*j);m.strand([(s*.13,.47,.75), (s*.21,.65-.1*j,.86),p],[.041,.029,.019],'8a9d7f',8,7);m.orb(p,(.044,.046,.045),'364342')
def annelid(m,k):
 leech=k=='leech';count=31;phase=.4;col='735b71' if leech else 'bd806b'
 for j in range(count):
  t=j/(count-1);z=(t-.5)*2.26;x=.17*math.sin(t*2.1*PI+.4);y=.22+.12*math.sin(t*1.3*PI)**2;r=.05+.133*(math.sin(PI*t)**.38);r*=1.19 if .65<t<.80 else 1
  m.orb((x,y,z),(r,r*(.69 if leech else .87),.086 if j not in [0,count-1] else .064),mix(col,'e4ac82',.12*(j%2)+(.24 if .65<t<.80 else 0)),rot=(0,.34*math.cos(t*PI*2),0),rough=.33,seg=16,ring=8,group='tail' if j<8 else 'body')
def primate(m,k):
 fur='735845';tan='b48e68';dark='52493f'
 m.orb((0,1.25,-.08),(.48,.69,.37),fur,rough=.79,seg=24,ring=15);m.orb((0,1.57,.04),(.59,.44,.37),fur,rough=.76);m.orb((0,1.39,.24),(.36,.41,.12),tan,rough=.72)
 m.orb((0,2.02,.16),(.34,.40,.30),fur,rough=.71,seg=24,ring=15);m.orb((0,1.99,.38),(.28,.26,.15),tan,rough=.57)
 m.orb((0,1.91,.48),(.20,.13,.14),tan);m.orb((0,2.04,.504),(.12,.075,.066),dark)
 for s in [-1,1]:
  m.orb((s*.325,2.04,.11),(.095,.145,.125),tan);m.orb((s*.35,2.05,.14),(.07,.085,.07),dark)
  m.orb((s*.124,2.14,.457),(.067,.048,.045),'282e29',rough=.2);m.orb((s*.122,2.158,.488),(.016,.014,.01),'eee2c3')
  m.strand([(s*.015,2.18,.46),(s*.13,2.215,.455),(s*.23,2.19,.39)],[.039,.056,.024],fur,8,7)
  arm_start=len(m.parts)
  m.strand([(s*.39,1.70,.015),(s*.63,1.57,.015),(s*.76,1.21,.09),(s*.81,.84,.30)],[.225,.204,.145,.101],fur,14,11)
  m.orb((s*.82,.78,.33),(.123,.13,.109),tan)
  for j in range(4):
   m.strand([(s*(.75+.042*j),.77,.37),(s*(.75+.043*j),.65,.40),(s*(.75+.044*j),.62,.37)],[.025,.023,.012],tan,6,6)
  # Deltoid, forearm and hand have mass behind each knuckle.
  m.orb((s*.522,1.639,.025),(.223,.212,.205),fur,rough=.79)
  m.orb((s*.788,1.068,.20),(.151,.260,.153),fur,rot=(-.32,0,s*-.12),rough=.74)
  m.strand([(s*.748,.799,.326),(s*.708,.749,.39),(s*.71,.698,.405)],[.056,.042,.018],tan,7,7)
  for j in range(3):
   m.orb((s*(.763+j*.042),.762,.409),(.03,.041,.034),mix(tan,'876952',.30),seg=9,ring=6)
  if s==1:m.strand([(.82,.12,.49),(.84,.66,.43),(.83,1.09,.38),(.88,1.61,.39)],[.046,.043,.033,.024],'775a40',12,8,ribs=9)
  m.joint(arm_start,f'arm_{s}',(s*.39,1.70,.015))
  leg_start=len(m.parts)
  m.strand([(s*.28,.99,-.07),(s*.33,.67,.06),(s*.31,.36,-.07),(s*.31,.14,-.09)],[.192,.139,.105,.073],fur,12,10)
  m.orb((s*.31,.13,.036),(.125,.076,.21),tan)
  for j in range(3):
   m.orb((s*(.25+j*.045),.108,.188),(.035,.036,.073),tan,seg=9,ring=6)
  m.joint(leg_start,f'leg_{s}',(s*.28,.99,-.07))
  for j in range(14):
   a=j*.45;m.strand([(s*(.45+.063*math.sin(a)),1.53+.12*math.cos(a),.19*math.sin(a)),(s*(.54+.07*math.sin(a)),1.39+.12*math.cos(a),.22*math.sin(a))],[.021,.003],mix(fur,tan,.32),4,5)
def plant(m,k):
 tree=k=='tree';wood='7b6750';height=2.5 if tree else 1.56;w=.18 if tree else .084
 for j in range(6):
  a=j*PI/3;m.strand([(0,.38,0),(.22*math.cos(a),.14,.22*math.sin(a)),(.59*math.cos(a+.1),.03,.59*math.sin(a+.1))],[w*.76,w*.55,.008],wood,10,8)
 m.strand([(0,.06,0),(.034,.68,0),(-.085,height*.61,.08),(.06,height*.84,-.02),(.11,height,.06)],[w,w*.99,w*.7,w*.44,.015],wood,18,10,ribs=13)
 for i in range(14 if tree else 8):
  a=i*2.4;t=i/(13 if tree else 7);y=height*(.39+.55*t);L=(.94 if tree else .69)*(1-.57*t);d=np.array([math.cos(a),0,math.sin(a)]);root=np.array([-.025,y,.035]);end=root+d*L+[0,.34*(1-.32*t),0]
  m.strand([root,root+d*L*.43+[0,.13,0],end],[w*.48,w*.25,.009],wood,10,7);cross=np.array([-d[2],0,d[0]])
  for j in range(5 if tree else 4):
   q=.38+j*.145;side=(-1)**j;A=root+(end-root)*q;B=A+d*(.15+.10*t)+side*cross*(.28+.05*math.sin(i)) + [0,.15+.05*math.cos(j+i),0]
   feather(m,A,B,.115 if tree else .13,mix('51845a','a8be77',.23+.17*math.sin(i*1.7+j)),'leaves')
  if tree and i%2==0:m.orb(end+[0,-.073,0],(.095,.114,.094),'d98a5e',rough=.36)
def blight(m):
 m.orb((0,.47,0),(.42,.40,.43),'ae6c83',seg=25,ring=15)
 for j in range(29):
  y=1-(j+.5)*2/29;angle=j*2.4;r=math.sqrt(1-y*y);u=np.array([r*math.cos(angle),y,r*math.sin(angle)]);P=np.array([0,.47,0])
  m.strand([P+.36*u,P+.45*u,P+.56*u],[.046,.036,.014],'ad788e',6,7)
  m.orb(P+.56*u,(.042,.043,.046),'dfa7ab',rough=.35,seg=9,ring=6)
def land(m,k):
 if k=='bird':bird(m)
 elif k in ('spider','mite'):arthropod(m,k)
 elif k in ('bee','moth'):insect(m,k)
 elif k=='snail':gastropod(m)
 elif k in ('worm','leech'):annelid(m,k)
 elif k=='ape':primate(m,k)
 elif k in ('tree','sapling'):plant(m,k)
 elif k=='blight':blight(m)
 else:raise ValueError(k)
