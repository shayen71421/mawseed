from build import *
from export import export
from predators import pike, mantis, shiner
from lantern import lantern
import os
try:from land import land
except ImportError:land=None
for name in sys.argv[1:]:
 model=Sculpt()
 if name in ['amoeba','colony','microbe']:cell(model,name)
 elif name in ['fish','minnow','hunter','cleaner','lungfish']:fish(model,name)
 elif name=='lantern':lantern(model)
 elif name=='shiner':shiner(model)
 elif name=='pike':pike(model)
 elif name=='mantis':mantis(model)
 else:land(model,name)
 record=export(model,name,OUT,RASTER)
 if name=='ape':
  from macaque import embed_coat
  embed_coat(model,OUT/'ape.glb')
 manifest=OUT/'manifest.json';d=json.loads(manifest.read_text()) if manifest.exists() else {};d[name]=record
 tmp=manifest.with_suffix('.tmp');tmp.write_text(json.dumps(d,indent=2));os.replace(tmp,manifest)
 print(name,record['vertices'],record['triangles'],flush=True)
