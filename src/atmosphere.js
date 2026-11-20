// Low-resolution radiance pass for browsers without WebGL. Rays intersect the animated
// water surface at world coordinates, so the overhead ripples move with the swimmer.
const sheet=document.createElement('canvas'),context=sheet.getContext('2d')
let cached=null,pixels=null
const clamp=x=>Math.max(0,Math.min(1,x))
function smooth(x){x=clamp(x);return x*x*(3-2*x)}
export function lagoonLight(ctx,camera,time,w,h,focal){
 const key=[Math.round(time*10),Math.round(camera.x*18),Math.round(camera.z*18),Math.round(camera.y*22),Math.round(camera.yaw*260),Math.round(camera.tilt*260),w,h].join('/')
 if(key!==cached){
  cached=key
  const sw=Math.min(320,Math.ceil(w/3.5)),sh=Math.ceil(sw*h/w)
  if(sheet.width!==sw||sheet.height!==sh){sheet.width=sw;sheet.height=sh;pixels=context.createImageData(sw,sh)}
  if(!pixels)pixels=context.createImageData(sw,sh)
  const rgba=pixels.data,s=Math.sin(camera.yaw),c=Math.cos(camera.yaw),ct=Math.cos(camera.tilt),st=Math.sin(camera.tilt)
  const sin=Math.sin,cos=Math.cos
  for(let j=0,k=0;j<sh;j++){
   const v=(.49*h-(j+.5)*h/sh)/focal,forward=ct+v*st,vertical=v*ct-st
   for(let i=0;i<sw;i++,k+=4){
    const u=((i+.5)*w/sw-w/2)/focal,inv=1/Math.sqrt(1+u*u+v*v)
    const dx=(u*c+forward*s)*inv,dz=(u*s-forward*c)*inv,dy=vertical*inv
    const sun=Math.max(0,-dx*.39+dy*.61-dz*.69)
    const height=smooth((dy+.46)*1.15)
    let red=13+height*18,green=66+height*44,blue=70+height*37
    // Broken paths of sunlight stretch across the water column beneath travelling swells.
    for(const length of [8.4,19.6]){
     const y=Math.min(0,camera.y+dy*length),x=camera.x+dx*length+y*.52,z=camera.z+dz*length+y*.76
     const beam=smooth((sin(.62*x+.37*z+sin(.38*z+time*.14)*.94+sin(x*.26)*.5)-.56)*2.2)*(.53+.47*cos(.16*z+time*.10))
     const L=beam*(.42+.58*sun)*(.68+.32*height)
     red+=L*18;green+=L*22;blue+=L*14
    }
    if(dy>.018){
     const range=-camera.y/dy,x=camera.x+range*dx,z=camera.z+range*dz
     const fade=(1-smooth((range-16)/68))*smooth((dy-.02)/.14)
     const a=x*.91+z*1.24+time*.83+sin(z*.53+time*.29)*.94
     const b=-x*1.76+z*.56-time*.76+sin(x*.45+z*.38)*.78
     const m=cos(a)*.16+cos(b)*.12,n=cos(a)*.19-cos(b)*.16
     const incidence=clamp((dy+m*dx+n*dz)/Math.sqrt(1+m*m+n*n)),window=smooth((incidence-.58)/.24)
     const folds=sin(a+sin(b)*.82)+.59*sin(b+sin(a*.9))
     const crease=smooth(1-Math.abs(folds)*3.4),broad=.5+.5*folds/1.6
     const swell=(19*broad+crease*32)*fade
     red+=swell*.67+window*65*fade;green+=swell+window*72*fade;blue+=swell*.82+window*56*fade
     const gleam=Math.pow(Math.max(0,sun+.08*m+.13*n),14)*fade
     red+=gleam*92;green+=gleam*83;blue+=gleam*48
    }
    rgba[k]=red;rgba[k+1]=green;rgba[k+2]=blue;rgba[k+3]=255
   }
  }
  context.putImageData(pixels,0,0)
 }
 ctx.drawImage(sheet,0,0,w,h)
}
