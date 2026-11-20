import {ground} from './physics.js'
import {terrainSamples} from './plates.js'

const output=document.createElement('canvas'),ctx=output.getContext('2d')
let rgba,zbuffer,lastKey=''
const sizes=[.29,.32,.35],textures=['bed','shore','moss']
const heights=new Map()
function bed(x,z){const key=x+','+z;if(!heights.has(key)){if(heights.size>22000)heights.clear();heights.set(key,ground(x,z))}return heights.get(key)}
function smooth(n){n=Math.max(0,Math.min(1,n));return n*n*(3-2*n)}
function mix(a,b,u){return a+(b-a)*u}
function sample(levels,u,v,level){
 const tile=levels[Math.min(level,levels.length-1)]
 const x=Math.floor(u*tile.size)&(tile.size-1),z=Math.floor(v*tile.size)&(tile.size-1)
 return tile.colors[z*tile.size+x]
}
function selectMap(name,map,u,v,lod){
 if(map)return sample(map,u,v,lod)
 return name==='bed'?0x60796f:name==='shore'?0x879bab:0x4d6255
}
// Rasterize the coarse height mesh with per-pixel perspective-correct material coordinates.
// Rock, soil and water change across elevation continuously, including within one triangle.
export function drawGround(target,camera,time,width,height,focal,under){
 const w=Math.min(620,Math.max(300,Math.ceil(width*.62))),h=Math.round(w*height/width)
 const maps=['bed','shore','moss'].map(terrainSamples),ready=maps.every(Boolean)
 const signature=[w,h,...[camera.x,camera.y,camera.z,camera.yaw,camera.tilt].map(n=>Math.round(n*160)),under,ready,Math.floor(time*(under?3:1.5))].join('/')
 if(lastKey===signature){target.drawImage(output,0,0,width,height);return}
 lastKey=signature
 if(output.width!==w||output.height!==h||!rgba){output.width=w;output.height=h;rgba=ctx.createImageData(w,h);zbuffer=new Float32Array(w*h)}
 const out=rgba.data;out.fill(0);zbuffer.fill(Infinity)
 const f=focal*w/width,sy=Math.sin(camera.yaw),cy=Math.cos(camera.yaw),ct=Math.cos(camera.tilt),st=Math.sin(camera.tilt)
 function vertex(x,z){
  const y=bed(x,z),ox=x-camera.x,oz=camera.z-z,dy=y-camera.y,forward=oz*cy+ox*sy
  return {x,y,z,h:ox*cy-oz*sy,v:dy*ct+forward*st,d:forward*ct-dy*st}
 }
 function clip(a,b){
  const u=(.14-a.d)/(b.d-a.d)
  return {x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),z:mix(a.z,b.z,u),h:mix(a.h,b.h,u),v:mix(a.v,b.v,u),d:.14}
 }
 function draw(a,b,c){
  const ax=w*.5+f*a.h/a.d,ay=h*.49-f*a.v/a.d,bx=w*.5+f*b.h/b.d,by=h*.49-f*b.v/b.d,cx=w*.5+f*c.h/c.d,yy=h*.49-f*c.v/c.d
  const left=Math.max(0,Math.floor(Math.min(ax,bx,cx))),right=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx)))
  const top=Math.max(0,Math.floor(Math.min(ay,by,yy))),bottom=Math.min(h-1,Math.ceil(Math.max(ay,by,yy)))
  if(left>right||top>bottom)return
  const denom=(by-yy)*(ax-cx)+(cx-bx)*(ay-yy);if(Math.abs(denom)<.001)return
  const ux=(by-yy)/denom,uy=(cx-bx)/denom,vx=(yy-ay)/denom,vy=(ax-cx)/denom
  const az=1/a.d,bz=1/b.d,cz=1/c.d,darkAir=[143,163,150],wetFog=[19,77,78]
  const slopeArea=(b.x-a.x)*(c.z-a.z)-(c.x-a.x)*(b.z-a.z)
  const slopeX=slopeArea?((b.y-a.y)*(c.z-a.z)-(c.y-a.y)*(b.z-a.z))/slopeArea:0
  const slopeZ=slopeArea?((b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y))/slopeArea:0
  const sunlight=Math.max(.42,Math.min(1.03,(.82+.46*slopeX-.34*slopeZ)/Math.sqrt(1+slopeX*slopeX+slopeZ*slopeZ)))
  for(let j=top;j<=bottom;j++){
   let u=(left+.5-cx)*ux+(j+.5-yy)*uy,v=(left+.5-cx)*vx+(j+.5-yy)*vy
   for(let i=left;i<=right;i++,u+=ux,v+=vx){
    const t=1-u-v;if(u<-.00005||v<-.00005||t<-.00005)continue
    const index=j*w+i,depth=1/(u*az+v*bz+t*cz);if(depth>=zbuffer[index])continue
    zbuffer[index]=depth
    const A=u*az*depth,B=v*bz*depth,C=t*cz*depth,x=A*a.x+B*b.x+C*c.x,y=A*a.y+B*b.y+C*c.y,z=A*a.z+B*b.z+C*c.z
    const elevation=y+.12*Math.sin(x*.6)*Math.sin(z*.39)
    const lo=elevation<-.12?0:1,hi=lo+1,blend=lo===0?smooth((elevation+1.55)/1.43):smooth((elevation-.17)/1.41)
    const lod=depth<3?0:depth<7?1:depth<14?2:depth<29?3:depth<58?4:5
    const ca=selectMap(textures[lo],maps[lo],x*sizes[lo],z*sizes[lo],lod),cb=selectMap(textures[hi],maps[hi],x*sizes[hi],z*sizes[hi],lod)
    const ripple=under?(Math.sin(x*1.96+.53*Math.sin(z*1.6+time*.37)+time*.26)+Math.sin(z*2.14+.62*Math.sin(x*.87-time*.32))):2
    const light=(.64+.43*sunlight)*(1+.037*Math.sin(x*.74+z*.41))+(under?.13*Math.pow(Math.max(0,1-Math.abs(ripple)*1.7),3):0)
    let red=mix(ca&255,cb&255,blend)*light,green=mix((ca>>8)&255,(cb>>8)&255,blend)*light,blue=mix((ca>>16)&255,(cb>>16)&255,blend)*light
    const shoreWater=!under&&camera.y>0&&y<0,water=under||shoreWater
    if(water){
     const absorption=under?Math.min(.7,.14+Math.max(0,-y)*.048):Math.min(.9,.32-y*.12)
     red=mix(red,21,absorption);green=mix(green,114,absorption*.60);blue=mix(blue,113,absorption*.7)
     if(shoreWater){
      const k=camera.y/(camera.y-y),sx=camera.x+(x-camera.x)*k,sz=camera.z+(z-camera.z)*k
      const shine=.5+.5*Math.sin(sx*2.2+sz*.46+time*.6+Math.sin(sz*1.74-time*.53))
      const fr=.14+.46*Math.exp(-camera.y*2/Math.max(1,depth))
      red=mix(red,113+shine*38,fr);green=mix(green,156+shine*52,fr);blue=mix(blue,150+shine*48,fr)
     }
    }
    const fog=1-Math.exp(-depth*(under?.030:.014)),color=under?wetFog:darkAir,k=index*4
    out[k]=mix(red,color[0],fog);out[k+1]=mix(green,color[1],fog);out[k+2]=mix(blue,color[2],fog);out[k+3]=255
   }
  }
 }
 function face(a,b,c){
  if(a.d<.14&&b.d<.14&&c.d<.14)return
  if(a.d>=.14&&b.d>=.14&&c.d>=.14){draw(a,b,c);return}
  const verts=[],corners=[a,b,c];for(let i=0;i<3;i++){const p=corners[i],q=corners[(i+1)%3];if(p.d>=.14)verts.push(p);if((p.d>=.14)!==(q.d>=.14))verts.push(clip(p,q))}
  for(let i=1;i<verts.length-1;i++)draw(verts[0],verts[i],verts[i+1])
 }
 const tile=3,radius=under?69:105,span=radius*2/tile,x0=Math.floor(camera.x/tile)*tile-radius,z0=Math.floor(camera.z/tile)*tile-radius
 let previous=Array.from({length:span+1},(_,i)=>vertex(x0+i*tile,z0))
 for(let row=1;row<=span;row++){
  const next=Array.from({length:span+1},(_,i)=>vertex(x0+i*tile,z0+row*tile))
  for(let i=0;i<span;i++){face(previous[i],previous[i+1],next[i]);face(next[i],previous[i+1],next[i+1])}
  previous=next
 }
 ctx.putImageData(rgba,0,0);target.drawImage(output,0,0,width,height)
}

export function maskWithTerrain(ctx,canvasW,canvasH,left,top,right,bottom,depth){
 if(!zbuffer||right<0||left>canvasW||top>canvasH||bottom<0)return
 const scaleX=output.width/canvasW,scaleY=output.height/canvasH
 const from=Math.max(0,left),to=Math.min(canvasW,right),near=depth-Math.max(.35,depth*.035)
 const start=Math.max(0,Math.floor(top*scaleY)),end=Math.min(output.height-1,Math.ceil(bottom*scaleY))
 ctx.beginPath();ctx.moveTo(from,top);ctx.lineTo(to,top)
 for(let n=9;n>=0;n--){
  const sx=from+(to-from)*n/9,x=Math.min(output.width-1,Math.floor(sx*scaleX))
  let sy=end
  for(let row=start;row<=end;row+=2)if(zbuffer[row*output.width+x]<near){sy=row;break}
  ctx.lineTo(sx,Math.max(top,sy/scaleY+1))
 }
 ctx.closePath();ctx.clip()
}
