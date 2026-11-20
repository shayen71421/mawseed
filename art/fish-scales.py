"""Generate a seamless albedo and tangent-space normal tile for fish skin."""
from pathlib import Path
import numpy as np
from PIL import Image
out=Path(__file__).resolve().parents[1]/'dist/assets/fauna'
y,x=np.mgrid[:256,:256]/32
row=np.floor(y);u=(x+row*.5)%1-.5;v=y%1
rim=.23+.53*np.sqrt(np.maximum(0,1-(2*u)**2))
ridge=np.exp(-((v-rim)/.072)**2)
bowl=np.cos(u*np.pi)*np.sin(v*np.pi)
height=.18*bowl+.16*ridge
dx=(np.roll(height,-1,1)-np.roll(height,1,1))*2.7
dy=(np.roll(height,-1,0)-np.roll(height,1,0))*2.7
norm=np.stack([-dx,dy,np.ones_like(dx)],axis=-1)
norm/=np.linalg.norm(norm,axis=2)[:,:,None]
Image.fromarray(np.uint8((norm*.5+.5)*255)).save(out/'scales-normal.webp',lossless=True)
c=236+13*bowl-23*ridge
Image.fromarray(np.uint8(np.stack([c*.986,c*.999,c],2))).save(out/'scales-color.webp',quality=93)
