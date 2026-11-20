"""Build original creature meshes, PBR glTFs and lit eight-view sprite sheets."""
from pathlib import Path
import array, ctypes, json, math, struct, subprocess, sys
import numpy as np
from scipy.interpolate import PchipInterpolator, CubicSpline
from scipy.spatial.transform import Rotation
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'dist/assets/fauna'; OUT.mkdir(parents=True,exist_ok=True)
HERE=Path(__file__).resolve().parent
SO=Path('/tmp/mawseed-fauna-raster.so')
if not SO.exists() or SO.stat().st_mtime<(HERE/'raster.c').stat().st_mtime:subprocess.run(['gcc','-O3','-shared','-fPIC',str(HERE/'raster.c'),'-o',str(SO),'-lm'],check=True)
RASTER=ctypes.CDLL(str(SO)).paint
PI=math.pi
def rgb(c):return np.array([int(c[i:i+2],16)/255 for i in (0,2,4)]) if isinstance(c,str) else np.array(c)
def mix(a,b,t):return rgb(a)*(1-t)+rgb(b)*t
def unit(v): return v/np.maximum(1.e-8,np.linalg.norm(v,axis=-1,keepdims=True))
class Sculpt:
 def __init__(self):
  self.parts=[];self.rng=np.random.default_rng(419);self.pivots={}
 def joint(self,start,name,pivot):
  self.pivots[name]=np.array(pivot)
  for i in range(start,len(self.parts)):
   self.parts[i]=(*self.parts[i][:-1],name)
 def mesh(self,V,F,C,rough=.45,group='body',outward=None):
  V=np.asarray(V,float).reshape(-1,3);F=np.asarray(F,'i4').reshape(-1,3);C=np.broadcast_to(rgb(C) if isinstance(C,str) else C,V.shape).copy()
  N=np.zeros(V.shape);faces=np.cross(V[F[:,1]]-V[F[:,0]],V[F[:,2]]-V[F[:,0]])
  if outward is not None and (faces*np.array(outward).reshape(-1,3)[F[:,0]]).sum()<0:F=F[:,::-1];faces=-faces
  for k in range(3):np.add.at(N,F[:,k],faces)
  self.parts.append((V,unit(N),np.clip(C,0,1),F,rough,group))
 def grid(self,V,C,rough,group,closed=True,outward=None):
  rows,cols=V.shape[:2];i,j=np.meshgrid(np.arange(rows-1),np.arange(cols if closed else cols-1),indexing='ij')
  a=i*cols+j;b=i*cols+(j+1)%cols
  F=np.stack([a,b,a+cols,b,b+cols,a+cols],-1).reshape(-1,3)
  self.mesh(V,F,C if isinstance(C,str) else np.broadcast_to(C,V.shape).reshape(-1,3),rough,group,outward)
 def orb(self,p,scale,c,rot=None,rough=.39,seg=16,ring=10,group='body',fleck=.035):
  u=np.linspace(.001,PI-.001,ring+1)[:,None];v=np.arange(seg)[None,:]*2*PI/seg
  D=np.stack(np.broadcast_arrays(np.sin(u)*np.cos(v),np.cos(u),np.sin(u)*np.sin(v)),-1)
  V=D*np.asarray(scale)
  if rot is not None:V=Rotation.from_euler('xyz',rot).apply(V.reshape(-1,3)).reshape(V.shape)
  shade=1+fleck*(np.sin(D[...,2]*18+np.sin(D[...,0]*11))*np.cos(D[...,1]*15))
  C=rgb(c)*shade[...,None];self.grid(V+p,C,rough,group,outward=V)
 def strand(self,pts,rad,col,steps=9,sides=6,rough=.48,group='body',ribs=0):
  pts=np.array(pts,float);q=np.linspace(0,1,len(pts));u=np.linspace(0,1,max(steps,len(pts)))
  P=CubicSpline(q,pts)(u) if len(pts)>2 else pts[0]+u[:,None]*(pts[-1]-pts[0])
  T=unit(np.gradient(P,axis=0));ref=np.array([0.,0.,1.]) if abs(T[0,2])<.8 else np.array([1.,0.,0.]);Y=unit(np.cross(T,np.broadcast_to(ref,T.shape)));X=unit(np.cross(Y,T))
  angle=2*PI*np.arange(sides)/sides;radius=np.interp(u,np.linspace(0,1,len(rad)),rad)*(1+.046*np.cos(u*ribs*2*PI))
  D=(Y[:,None,:]*np.cos(angle)[None,:,None]+X[:,None,:]*np.sin(angle)[None,:,None])*radius[:,None,None]
  C=rgb(col)*(1+.062*np.sin(u*ribs*2*PI))[:,None,None]
  self.grid(P[:,None,:]+D,C,rough,group,outward=D)
 def loft(self,sections,skin,steps=35,sides=32,group='body',rough=.45):
  # sections are (z centre, y centre, width, height); individual rings form one continuous silhouette.
  a=np.array(sections,float);z=np.linspace(a[0,0],a[-1,0],steps);yc,w,h=PchipInterpolator(a[:,0],a[:,1:],axis=0)(z).T
  t=np.arange(sides)[None,:]*2*PI/sides;x=w[:,None]*np.cos(t);y=h[:,None]*np.sin(t)
  Z=np.broadcast_to(z[:,None],x.shape);D=np.stack([x,y,0*Z],-1);V=D.copy();V[...,1]+=yc[:,None];V[...,2]=Z
  C=skin(Z,np.broadcast_to(np.sin(t),x.shape),np.broadcast_to(np.cos(t),x.shape)) if callable(skin) else skin
  self.grid(V,C,rough,group,outward=D);return V
 def fin(self,root,edge,col,group='fins',rays=7):
  root,edge=np.array(root),np.array(edge);u=np.linspace(0,1,19);t=np.linspace(0,1,len(root));A=CubicSpline(t,root)(u);B=CubicSpline(t,edge)(u)
  v=np.linspace(0,1,9);D=A[:,None,:]*(1-v[None,:,None])+B[:,None,:]*v[None,:,None]
  D[...,1]+=.035*np.sin(PI*v)[None,:]*np.cos(PI*u)[:,None]
  phase=(.77+.18*v[None,:]+.09*np.cos(PI*2*u*rays)[:,None]);self.grid(D,rgb(col)*phase[...,None],.47,group,closed=False)
  for i in np.round(np.linspace(0,18,rays)).astype(int):
   self.strand([A[i],(A[i]+B[i])*.5+[0,.02,0],B[i]],[.017,.011,.002],mix(col,'fff0d1',.38),6,5,group=group)
def eyes(m,x,y,z,size,side=1):
 p=np.array([x,y,z]);s=side
 m.orb(p,(size*.48,size*1.20,size*1.27),'192d35',rough=.48)
 m.orb(p+[s*size*.20,0,.01],(size*.43,size*.96,size*.99),'e3ae52',rough=.19)
 m.orb(p+[s*size*.48,0,.013],(size*.25,size*.72,size*.70),'10232c',rough=.09)
 m.orb(p+[s*size*.67,size*.30,size*.24],(size*.14,size*.17,size*.16),'f9fff0',rough=.08,seg=8,ring=6)
def cell(m,kind):
 tiny=kind=='microbe';colony='colony' in kind
 base='77ce99' if tiny else 'ebad88';warm='acde96' if tiny else 'ffd59a'
 u=np.linspace(.004,PI-.004,31)[:,None];v=np.arange(66)[None,:]*2*PI/66
 r=1+(.12*np.cos(5*v+.6)+.065*np.sin(3*v-.9)+.04*np.sin(8*v+.7))*np.sin(u)**2
 D=np.stack(np.broadcast_arrays(.84*r*np.sin(u)*np.cos(v),.41*r*np.cos(u),1.05*r*np.sin(u)*np.sin(v)),-1)
 V=D+[0,.54,0];grain=.023*np.sin(v*23+u*22)+.04*np.sin(4*v-5*u)
 # Pigment pools under the surface, capillary-like folds and a bright refractive lip.
 radial=np.sin(u);ridge=.10*np.exp(-((radial-.975)/.014)**2)
 folds=(.5+.5*np.sin(9*v+5*u+1.7*np.sin(3*v-u)))**8
 mottling=np.cos(9*v-6*u)*np.sin(4*v+5*u)*.045
 C=rgb(base)*(1+(grain+mottling-.14*folds*radial)[...,None])
 C+=ridge[...,None]*rgb(warm)+(.055*np.cos(2*u))[...,None]*rgb('98dcdf')
 m.grid(V,C,.24,'membrane',outward=D)
 # A submembrane reticulum, divided into meandering branches around the core.
 for j in range(12 if not tiny else 8):
  a=j*.5236+.17;points=[]
  for t in np.linspace(0,1,7):
   r=.32+.52*t;b=a+.12*math.sin(4.6*t+j)
   R=1+.12*math.cos(5*b+.6)+.065*math.sin(3*b-.9)+.04*math.sin(8*b+.7)
   points.append((r*(1+(R-1)*r*r)*.84*math.cos(b),.55+.41*(1+(R-1)*r*r)*math.sqrt(1-r*r),r*(1+(R-1)*r*r)*1.05*math.sin(b)))
  m.strand(points,[.013,.017,.011,.002],mix(base,'9a697d' if not tiny else '6d9894',.39),15,5,rough=.39,group='membrane')
 for j in range(82 if not tiny else 52):
  a=j*2*PI/(82 if not tiny else 52);R=1+.12*math.cos(5*a+.6)+.065*math.sin(3*a-.9)+.04*math.sin(8*a+.7)
  x,z=math.cos(a)*R*.84,math.sin(a)*R*1.05;l=.08+.095*(.5+.5*math.cos(a*13));y=.53+.065*math.sin(a*9)
  m.strand([(x*.95,y,z*.95),(x*(1+l*.55),y+.024,z*(1+l*.55)),(x*(1+l)+.035*math.sin(a),y+.046*math.sin(a*3),z*(1+l))],[.015,.012,.003],warm,4,5,rough=.27,group='cilia')
 # A contractile vacuole with a chromatin core, and elongated mitochondria.
 m.orb((-.12,.864,-.13),(.39,.21,.44),'799c92' if tiny else 'be807e',rough=.21,seg=30,ring=16)
 m.orb((-.14,.993,-.12),(.21,.105,.235),'a8d292' if tiny else 'a95d72',rough=.15)
 for j in range(11):
  a=j*2.4;m.orb((-.14+.16*math.cos(a),1.067+.018*math.sin(a),-.12+.14*math.sin(a)),(.037,.023,.035),warm,rough=.4,seg=8,ring=6)
 for j in range(8):
  a=j*.785+.2;x,z=.48*math.cos(a),.68*math.sin(a);m.orb((x,.86,z),(.09,.065,.17),mix(base,'4e807c',.49),rot=(0,a,0),seg=13,ring=7)
  for k in range(3):m.orb((x+.035*math.cos(a)*math.sin(k*2),.917,z+(k-1)*.045),(.032,.013,.018),warm,seg=7,ring=5)
 for j in range(38):
  a=m.rng.uniform(0,2*PI);r=m.rng.uniform(.36,.9)
  x=r*.73*math.cos(a);z=r*.86*math.sin(a);y=.55+.405*math.sqrt(1-min(.98,r*r));sz=m.rng.uniform(.014,.049)
  m.orb((x,y,z),(sz,sz*.58,sz),mix(base,'fff9ca',m.rng.uniform(.1,.6)),seg=7,ring=5)
 # Cytoskeletal tracks and a distinctive asymmetric pair of trailing flagella.
 for s in [-1,1]:
  m.strand([(s*.21,.48,-.83),(s*.27,.46,-1.10),(s*.36,.43,-1.36),(s*.31,.48,-1.56)],[.033,.024,.014,.002],warm,13,6,group='tail')
  if not tiny:eyes(m,s*.47,.72,.69,.105,s)
 if colony:
  for j in range(3):
   a=j*2.1;x=.78*math.cos(a);z=.94*math.sin(a);m.orb((x,.47,z),(.43,.31,.48),base,rough=.22)
   m.orb((x,.70,z),(.18,.1,.18),'bb7282',rough=.25)
def fish(m,kind):
 shark=kind=='hunter';minnow=kind=='minnow';cleaner=kind=='cleaner';lung=kind=='lungfish'
 back='70445b' if shark else '286b75' if not cleaner else '246f8d';flank='ac6c70' if shark else '78b5ac' if minnow else '5aa69e';belly='f6c28b' if not cleaner else 'b2dfb8';fin='cf846d' if shark else 'dba96a'
 def skin(z,y,x):
  k=np.clip((y+.5)*1.25,0,1);C=rgb(belly)*(1-k[...,None])+rgb(flank)*k[...,None];t=np.clip((y-.10)*1.25,0,1);C=C*(1-t[...,None])+rgb(back)*t[...,None]
  if cleaner:
   stripe=np.exp(-((y-.10)*6)**2);C=C*(1-stripe[...,None]) + rgb('314757')*stripe[...,None]
   yellow=np.exp(-((y-.52)*4.2)**2);C=C*(1-yellow[...,None]*.83)+rgb('eabd73')*yellow[...,None]*.83
  if minnow:
   silver=np.clip(1-np.abs(y+.12)*1.4,0,1)*.64;C=C*(1-silver[...,None])+rgb('e7cfab')*silver[...,None]
  spots=(.5+.5*np.sin(z*16+y*4+.6*np.sin(z*9)))**5*np.clip((y+.15)*1.4,0,1)
  lateral=np.exp(-((y-.05)*16)**2)*np.clip(1-(z+1.2)*.18,0,1)
  return C*(1-.22*spots[...,None])+rgb('f9d899')*.28*lateral[...,None]
 sec=[(-1.55,.94,.02,.05),(-1.34,.94,.09,.14),(-1.0,.91,.18,.23),(-.65,.89,.30,.36),(-.1,.88,.42,.49),(.34,.87,.46,.48),(.68,.88,.39,.38),(.92,.87,.26,.24),(1.17,.84,.06,.085),(1.20,.84,.015,.035)]
 if shark:sec=[(z,y,w*1.17,h*1.16) for z,y,w,h in sec]
 m.loft(sec,skin,55,40,rough=.30)
 m.fin([(-.012,.95,-1.48),(-.03,.94,-1.33),(.028,.9,-1.37),(.026,.88,-1.47)],[(0,1.73,-2.05),(0,1.28,-1.84),(0,.64,-1.77),(0,.35,-1.99)],fin,'tail',9)
 m.fin([(0,1.18,-.65),(0,1.29,-.29),(0,1.31,.06),(0,1.23,.32)],[(0,1.28,-.79),(0,1.56,-.53),(0,1.99,-.25),(0,1.32,.27)],back,'dorsal',8)
 m.fin([(0,.53,-.8),(0,.48,-.52),(0,.44,-.23)],[(0,.21,-1.06),(0,.16,-.86),(0,.48,-.25)],fin,'fins',5)
 for s in [-1,1]:
  mult=1.15 if shark else 1
  m.fin([(s*.37*mult,.86,.49),(s*.417*mult,.81,.37),(s*.415*mult,.71,.24)],[(s*.49,.84,.48),(s*.99,.44,-.3),(s*.55,.47,-.43)],fin,'fin_'+str(s),6)
  m.fin([(s*.22,.49,-.11),(s*.26,.46,-.22),(s*.18,.46,-.43)],[(s*.24,.46,-.11),(s*.53,.20,-.55),(s*.30,.30,-.73)],fin,'fins',4)
  for j in range(3):
   x=s*(.42*mult-j*.022);z=.47-j*.095;m.strand([(x*.85,1.16,z),(x,1.0,z-.055),(x,.80,z-.08),(x*.83,.68,z-.02)],[.009,.016,.016,.006],mix(back,'203d44',.5),11,6)
  eyes(m,s*.323*mult,.999,.78,.132 if shark else .143,s)
  m.strand([(s*.06,.82,1.175),(s*.20,.76,1.045),(s*.275,.75,.92),(s*.32,.77,.83)],[.012,.023,.024,.005],'503935',9,5)
  for j in range(14):
   z=-1.16+j*.10;xx=np.interp(z,[q[0] for q in sec],[q[2] for q in sec]);m.orb((s*xx*.99,.94+.033*math.sin(j*.8),z),(.013,.016,.027),'c4ce9e',seg=7,ring=4)
  if lung:
   m.strand([(s*.36,.72,.26),(s*.57,.47,.17),(s*.67,.23,.34),(s*.72,.14,.55)],[.13,.095,.07,.035],flank,13,9)
   m.strand([(s*.24,.64,-.65),(s*.45,.32,-.87),(s*.52,.15,-.61)],[.11,.09,.033],flank,12,8)
  if shark:
   for j in range(6):
    x=s*(.15+j*.025);z=1.08-j*.049;m.strand([(x,.80,z),(x,.70-.02*math.sin(j),z+.012)],[.026,.001],'f8e7bf',3,5)
 # Scales as anisotropic overlapping slivers on the upper flanks.
 for j in range(11):
  z=-.91+j*.114;w=np.interp(z,[q[0] for q in sec],[q[2] for q in sec]);h=np.interp(z,[q[0] for q in sec],[q[3] for q in sec])
  for k in range(5):
   a=.33+k*.274
   for sign in [-1,1]:
    X=sign*w*math.cos(a);Y=.89+h*math.sin(a);Z=z+.037*(k%2)
    m.strand([(X*.99,Y-.014,Z+.035),(X*1.014,Y,Z),(X*.99,Y+.017,Z-.039)],[.004,.008,.003],mix(flank,'c1ccb0',.18+k*.035),4,4)

 if shark:
  # A thrusting lower jaw, backward fangs and horned orbital ridges.
  m.loft([(.43,.73,.13,.14),(.68,.69,.26,.14),(.96,.69,.21,.095),(1.30,.70,.11,.09),(1.49,.73,.024,.045),(1.51,.74,.002,.005)],'d6a580',26,20,group='jaw',rough=.46)
  m.pivots['jaw']=np.asarray((0,.74,.55))
  m.loft([(.76,.90,.29,.16),(.99,.90,.20,.125),(1.30,.88,.11,.07),(1.4,.83,.018,.03),(1.42,.82,.002,.005)],'976d76',22,22)
  for s in [-1,1]:
   for j in range(6):
    z=.94+j*.068;x=s*(.196-j*.020);m.strand([(x,.77,z),(x,.83+.03*math.cos(j),z-.012)],[.022,.001],'f4dec1',4,5,group='jaw')
   m.strand([(s*.23,1.06,.92),(s*.37,1.18,.73),(s*.37,1.20,.52),(s*.30,1.27,.41)],[.015,.055,.042,.006],back,12,7)
  for j in range(3):
   z=-.68-j*.14;m.fin([(0,1.20-j*.047,z+.09),(0,1.22-j*.047,z),(0,1.20-j*.047,z-.10)],[(0,1.21-j*.047,z+.09),(0,1.43-j*.075,z-.09),(0,1.20-j*.047,z-.1)],'ae7379','dorsal',3)
 elif minnow:
  m.fin([(0,1.34,-.10),(0,1.35,.06),(0,1.28,.25)],[(0,1.70,-.72),(0,2.10,-.40),(0,1.30,.24)],'deb67b','dorsal',6)
  for s in [-1,1]:
   m.orb((s*.307,1.04,.72),(.028,.068,.050),'dca95c',rough=.29)
 factors=(1.04,.88,1.38) if shark else (.82,1.06,.72) if minnow else (.70,.72,1.06) if cleaner else (1.13,.83,1.13) if lung else (1,1,1)
 S=np.asarray(factors)
 for name,p in m.pivots.items():m.pivots[name]=p*S+[0,.85*(1-S[1]),0]
 for idx,(v,n,c,f,r,g) in enumerate(m.parts):
  v=v*S;v[:,1]+=.85*(1-S[1]);m.parts[idx]=(v,unit(n/S),c,f,r,g)
