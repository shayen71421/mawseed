import json,ctypes,struct
from pathlib import Path
import numpy as np
from PIL import Image
def export(m,kind,out,raster):
 vertex=[];normal=[];colors=[];faces=[];shine=[];offset=0
 groups={}
 for V,N,C,F,rough,group in m.parts:
  groups.setdefault(group,[]).append((V,N,C,F,rough));vertex.append(V);normal.append(N);colors.append(C);faces.append(F+offset);offset+=len(V);shine.extend([1-rough]*len(V))
 f32=lambda v:np.ascontiguousarray(v,dtype='float32');i32=lambda v:np.ascontiguousarray(v,dtype='int32')
 V,N,C,F,S=f32(np.concatenate(vertex)),f32(np.concatenate(normal)),f32(np.concatenate(colors)),i32(np.concatenate(faces)),f32(shine)
 doc={'asset':{'version':'2.0','generator':'Mawseed fauna studio'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'materials':[],'accessors':[],'bufferViews':[],'buffers':[{}]};buf=bytearray()
 def accessor(a,typ,ct,target,minmax=False,normalized=False):
  a=np.ascontiguousarray(a);start=len(buf);buf.extend(a.tobytes());size=len(buf)-start
  while len(buf)%4:buf.append(0)
  v=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':size,'target':target})
  d={'bufferView':v,'componentType':ct,'count':len(a),'type':typ}
  if minmax:d['min']=a.min(axis=0).tolist();d['max']=a.max(axis=0).tolist()
  if normalized:d['normalized']=True
  doc['accessors'].append(d);return len(doc['accessors'])-1
 for g,parts in groups.items():
  vertices=[];normals=[];cols=[];indices=[];o=0
  for v,n,c,ix,r in parts:vertices.append(v);normals.append(n);cols.append(c);indices.append(ix+o);o+=len(v)
  v=f32(np.concatenate(vertices));pivot=np.zeros(3)
  if g in m.pivots:
   pivot=m.pivots[g];v=v-pivot
  elif g in ('tail','dorsal','fins','fin_-1','fin_1','wing_-1','wing_1'):
   # Place hinges at the attachment, so a moving wing or tail stays seated.
   if g.startswith(('wing_', 'fin_')):
    near=np.abs(v[:,0]);band=near<=np.quantile(near,.12)
   elif g=='tail':
    band=v[:,2]>=np.quantile(v[:,2],.90)
   elif g=='dorsal':
    band=v[:,1]<=np.quantile(v[:,1],.15)
   else:
    band=np.abs(v[:,0])<=np.quantile(np.abs(v[:,0]),.15)
   pivot=v[band].mean(axis=0);v=v-pivot
  c=np.concatenate(cols);linear=np.where(c<.04045,c/12.92,((c+.055)/1.055)**2.4)
  idx=np.concatenate(indices).reshape(-1).astype('<u2' if len(v)<65536 else '<u4')
  mat=len(doc['materials']);doc['materials'].append({'name':g,'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'roughnessFactor':float(np.mean([p[4] for p in parts])),'metallicFactor':.04}})
  if g=='photophore':
   doc['materials'][-1]['emissiveFactor']=[.018,.45,.37]
  pr={'attributes':{'POSITION':accessor(f32(v),'VEC3',5126,34962,True),'NORMAL':accessor(f32(np.concatenate(normals)),'VEC3',5126,34962),'COLOR_0':accessor(np.pad(np.round(linear*255).astype('uint8'),((0,0),(0,1)),constant_values=255),'VEC4',5121,34962,normalized=True)},'indices':accessor(idx,'SCALAR',5123 if idx.itemsize==2 else 5125,34963),'material':mat}
  n=len(doc['nodes']);doc['scenes'][0]['nodes'].append(n);doc['meshes'].append({'primitives':[pr]});doc['nodes'].append({'name':g,'mesh':n,'translation':pivot.tolist()})
 doc['buffers'][0]['byteLength']=len(buf);j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
 (out/(kind+'.glb')).write_bytes(struct.pack('<4sII',b'glTF',2,28+len(j)+len(buf))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(buf),b'BIN\0')+buf)
 size=384 if kind=='ape' else 288 if kind in ('amoeba','colony','fish','hunter') else 192
 resolution=size*2
 y=(V[:,1].max()+V[:,1].min())*.5
 center=f32([0,y,0]);rad=np.linalg.norm(V[:,[0,2]],axis=1).max()
 span=float(max(rad*2,(V[:,1].max()-V[:,1].min())+rad*.53)*1.085)
 atlas=Image.new('RGBA',(size*4,size*2));unit=lambda a:a/np.linalg.norm(a)
 def projected(eye,width):
  right=unit(np.cross([0,1,0],eye));up=unit(np.cross(eye,right));return f32((V-center)@np.stack([right,-up,eye],1)*(resolution/width)+[resolution/2,resolution/2,0])
 ptr=lambda a:a.ctypes.data_as(ctypes.c_void_p)
 for i in range(8):
  ang=i*np.pi*.25;eye=f32(unit(np.array([-np.sin(ang),.32,np.cos(ang)])))
  right=unit(np.cross([0,1,0],eye));camup=unit(np.cross(eye,right));key=f32(unit(.72*camup-.56*right+.54*eye));rim=f32(unit(.42*camup+.83*right-.29*eye))
  light=projected(key,span*1.25);screen=projected(eye,span)
  z=np.full((resolution,resolution),-1e6,dtype='float32');lightdepth=z.copy();pixels=np.zeros((resolution,resolution,4),'uint8')
  def draw(proj,bufdepth,shad):
   args=[V,N,C,F,proj,light,lightdepth,eye,key,rim,S,bufdepth,pixels];raster(resolution,len(V),len(F),*[ptr(a) for a in args],shad)
  draw(light,lightdepth,1);draw(screen,z,0);frame=Image.fromarray(pixels).resize((size,size),Image.Resampling.LANCZOS)
  atlas.paste(frame,((i%4)*size,(i//4)*size))
 atlas.save(out/(kind+'.webp'),quality=93,method=4)
 return {'asset':kind,'span':span,'centerY':float(y),'tile':size,'views':8,'nodes':list(groups),'vertices':len(V),'triangles':len(F)}
