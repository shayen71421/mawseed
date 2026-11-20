import {animalPlate,habitatPlate,terrainPattern,deepBackground,forestBackground,isReady} from './plates.js'
import {propFor,propHeight,nurseryBeds,feedingPose} from './scenery.js'
import {predatorPose,playerPose} from './combat.js'
import {drawCombat} from './combat-art.js'
import {ground,scaleOf,bodySize} from './physics.js'
const canvas=document.createElement('canvas'),stage=document.querySelector('#stage')
stage.append(canvas);canvas.style.zIndex='1'
let drawGPU=null
import('./gpu-engine.js').then(m=>{drawGPU=m.bootGPU(stage)}).catch(err=>console.warn('Using the painted renderer',err))
let ctx=canvas.getContext('2d');const mainContext=ctx, floorCanvas=document.createElement('canvas'),floorContext=floorCanvas.getContext('2d');let floorKey='';const camera={x:0,y:12,z:20,tilt:.48}
let width,height,focal,commands=[],submergedView=false
export function resize(){
  width=innerWidth;height=innerHeight;const ratio=Math.min(devicePixelRatio,1.5)
  canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0)
  floorCanvas.width=canvas.width;floorCanvas.height=canvas.height;floorContext.setTransform(ratio,0,0,ratio,0,0);floorKey='';focal=Math.min(height*.99,width*1.12)
}
resize();window.addEventListener('resize',resize)
function project(x,y,z){
  const ox=x-camera.x,oz=camera.z-z,yaw=camera.yaw||0,dx=ox*Math.cos(yaw)-oz*Math.sin(yaw),dy=y-camera.y,dz=oz*Math.cos(yaw)+ox*Math.sin(yaw),c=Math.cos(camera.tilt),s=Math.sin(camera.tilt)
  const depth=dz*c-dy*s
  if(depth<.038)return null
  return {x:width/2+dx*focal/depth,y:height*.49-(dy*c+dz*s)*focal/depth,k:focal/depth,depth}
}
const shades=new Map();function shadow(color){if(!shades.has(color)){const n=parseInt(color.slice(1),16);shades.set(color,'rgb('+[n>>16,(n>>8)&255,n&255].map(v=>Math.round(v*.71)).join(',')+')')}return shades.get(color)}
function worldModel(x,y,z,size=1,angle=0){
  const farUnderwater=submergedView&&((ground(x,z)>.3&&Math.hypot(x-camera.x,z-camera.z)>16)||Math.hypot(x-camera.x,z-camera.z)>39)
  if(farUnderwater)return {oval(){},limb(){}}
  const c=Math.cos(angle),s=Math.sin(angle)
  function point(a,b,d){return project(x+size*(a*c+d*s),y+size*b,z+size*(d*c-a*s))}
  return {
    oval(a,b,d,rx,ry,rz,color){
      const p=point(a,b,d);if(!p||p.depth<Math.max(rx,ry,rz)*size*1.65)return
      // Project three local axes to determine the ellipse of the 3D ellipsoid.
      const axis=[point(a+rx,b,d),point(a,b+ry,d),point(a,b,d+rz)]
      if(axis.some(v=>!v))return
      let xx=0,xy=0,yy=0
      for(const v of axis){let u=v.x-p.x,w=v.y-p.y;xx+=u*u;xy+=u*w;yy+=w*w}
      let diff=Math.hypot(xx-yy,2*xy),r=Math.sqrt((xx+yy+diff)/2),q=Math.sqrt(Math.max(.1,(xx+yy-diff)/2))
      if(p.x+r<0||p.x-r>width||p.y+r<0||p.y-r>height)return
      commands.push({depth:p.depth,draw(){ctx.beginPath();ctx.ellipse(p.x,p.y,r,q,Math.atan2(2*xy,xx-yy)/2,0,Math.PI*2);const light=ctx.createLinearGradient(p.x-r*.55,p.y-r*.6,p.x+r*.45,p.y+r*.6);light.addColorStop(0,color);light.addColorStop(.55,color);light.addColorStop(1,shadow(color));ctx.fillStyle=light;ctx.fill();ctx.strokeStyle='#253f465b';ctx.lineWidth=Math.min(2,Math.max(.5,p.k*.045));ctx.stroke()}})
    },
    limb(a,b,d,e,f,g,r,color,end=r*.68){
      const A=point(a,b,d),B=point(e,f,g);if(!A||!B||Math.min(A.depth,B.depth)<Math.max(.05,r*size*1.5))return
      const dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,R=r*A.k*size,S=end*B.k*size
      commands.push({depth:(A.depth+B.depth)/2,draw(){ctx.beginPath();ctx.moveTo(A.x+nx*R,A.y+ny*R);ctx.lineTo(B.x+nx*S,B.y+ny*S);ctx.lineTo(B.x-nx*S,B.y-ny*S);ctx.lineTo(A.x-nx*R,A.y-ny*R);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#3344475c';ctx.lineWidth=1;ctx.stroke()}})
    }
  }
}
let props=[]
function backdrop(time){

  const water=camera.y<0 && ground(camera.x,camera.z)<0
  if(water){
    const g=ctx.createLinearGradient(0,0,0,height);g.addColorStop(0,'#72b3aa');g.addColorStop(.21,'#337f7c');g.addColorStop(.60,'#174e54');g.addColorStop(1,'#0a353b');ctx.fillStyle=g;ctx.fillRect(0,0,width,height)
    if(isReady(deepBackground)){
      const img=deepBackground,scale=Math.max(width/img.width,height/img.height)*1.08,w=img.width*scale,h=img.height*scale
      const turn=camera.yaw/(Math.PI*1.5)+camera.x*.0018
      const scroll=((turn%2)+2)%2,shift=scroll*w,top=(height-h)*.54+Math.min(0,camera.y+2)*2
      for(let i=-1;i<4;i++){
        const x=i*w-shift
        if(x>width||x+w<0)continue
        ctx.save();ctx.translate(x+(i%2?w:0),top);if(i%2)ctx.scale(-1,1);ctx.drawImage(img,0,0,w,h);ctx.restore()
      }
    }
    return
  }
  if(isReady(forestBackground)){
    const im=forestBackground,sc=Math.max(width/im.width,height/im.height)*1.1,w=im.width*sc,h=im.height*sc
    const shift=(((camera.yaw/(Math.PI*1.5)+camera.x*.001)%2+2)%2)*w
    for(let i=-1;i<4;i++){const x=i*w-shift;if(x>width||x+w<0)continue;ctx.save();ctx.translate(x+(i%2?w:0),(height-h)*.28);if(i%2)ctx.scale(-1,1);ctx.drawImage(im,0,0,w,h);ctx.restore()}return
  }
  let grad=ctx.createLinearGradient(0,0,0,height);grad.addColorStop(0,'#4b456f');grad.addColorStop(.4,'#d99790');grad.addColorStop(.64,'#f5cc93');grad.addColorStop(1,'#74897e');ctx.fillStyle=grad;ctx.fillRect(0,0,width,height)
  ctx.fillStyle='#ffe7a8';ctx.beginPath();ctx.arc(width*.76,height*.17,height*.076,0,Math.PI*2);ctx.fill()
  for(let layer=0;layer<3;layer++){
    ctx.fillStyle=['#94859a','#688797','#476c77'][layer];ctx.beginPath();ctx.moveTo(0,height)
    for(let i=0;i<=90;i++){let x=width*i/90,a=i*.21+layer*2+camera.x*.008;ctx.lineTo(x,height*(.29+layer*.052+.045*Math.sin(a)+.027*Math.sin(a*2.6)))}
    ctx.lineTo(width,height);ctx.fill()
  }
}
// Clip the terrain grid at the near plane so a shoreline remains continuous under the camera.
function eyeDepth(v){
 const dx=v[0]-camera.x,dz=camera.z-v[2],forward=dz*Math.cos(camera.yaw)+dx*Math.sin(camera.yaw)
 return forward*Math.cos(camera.tilt)-(v[1]-camera.y)*Math.sin(camera.tilt)
}
function clipPoly(poly,measure){
 const result=[]
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ha=measure(a),hb=measure(b)
   if(ha>=0)result.push(a)
   if((ha<0)!==(hb<0)){const u=ha/(ha-hb);result.push(a.map((v,k)=>v+(b[k]-v)*u))}
 }return result
}
const meshCache=new Map()
function sample(x,z){const k=x+','+z;if(!meshCache.has(k)){if(meshCache.size>14000)meshCache.clear();meshCache.set(k,ground(x,z))}return meshCache.get(k)}
function polygon(points,color,material,depth){
 const v=clipPoly(points,p=>eyeDepth(p)-.16);if(v.length<3)return
 const screen=v.map(p=>project(...p));if(screen.some(p=>!p))return
 if(screen.every(p=>p.x<0)||screen.every(p=>p.x>width)||screen.every(p=>p.y<0)||screen.every(p=>p.y>height))return
 const pattern=material&&terrainPattern(ctx,material)
 function path(pts){ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath()}
 return function(){
  const fade=material&&submergedView?Math.max(0,Math.min(1,(40-depth)/18)):1
  if(fade<=0)return
  ctx.globalAlpha=fade;path(screen);ctx.fillStyle=color;ctx.fill()
  if(pattern&&depth<(submergedView?39:70)){
   const density=material==='moss'?122:112
   for(let i=1;i<screen.length-1;i++){
    const a=v[0],b=v[i],c=v[i+1],A=screen[0],B=screen[i],C=screen[i+1]
    const u=(b[0]-a[0])*density,vv=(b[2]-a[2])*density,w=(c[0]-a[0])*density,h=(c[2]-a[2])*density,det=u*h-w*vv
    if(Math.abs(det)<.001)continue
    const x1=B.x-A.x,x2=C.x-A.x,y1=B.y-A.y,y2=C.y-A.y
    const aa=(x1*h-x2*vv)/det,bb=(y1*h-y2*vv)/det,cc=(u*x2-w*x1)/det,dd=(u*y2-w*y1)/det
    pattern.setTransform(new DOMMatrix([aa,bb,cc,dd,A.x-(aa*a[0]+cc*a[2])*density,A.y-(bb*a[0]+dd*a[2])*density]))
    path([A,B,C]);ctx.fillStyle=pattern;ctx.fill()
   }
   if(submergedView){path(screen);ctx.fillStyle='rgba(11,70,72,'+Math.min(.82,.35+Math.max(0,depth)/76)+')';ctx.fill()}
   else if(depth>18){path(screen);ctx.fillStyle='rgba(119,143,136,'+Math.min(.65,(depth-18)/110)+')';ctx.fill()}
  }
  ctx.globalAlpha=1
 }
}
function terrain(t){
 const cache=[camera.x,camera.y,camera.z,camera.yaw,camera.tilt].map(v=>Math.round(v*250)).join('/')+(terrainPattern(mainContext,'bed')?'r':'')
 if(submergedView){
  if(floorKey===cache){mainContext.drawImage(floorCanvas,0,0,width,height);return}
  floorKey=cache;ctx=floorContext;ctx.clearRect(0,0,width,height)
 }else floorKey=''
 const tile=3,radius=submergedView?39:54,ox=Math.floor(camera.x/tile)*tile,oz=Math.floor(camera.z/tile)*tile
 const floor=[],surface=[]
 for(let z=oz-radius;z<oz+radius;z+=tile)for(let x=ox-radius;x<ox+radius;x+=tile){
  const mid=eyeDepth([x+tile/2,0,z+tile/2]);if(mid< -7)continue
  const heights=[[x,sample(x,z),z],[x+tile,sample(x+tile,z),z],[x+tile,sample(x+tile,z+tile),z+tile],[x,sample(x,z+tile),z+tile]]
  if(submergedView&&heights.every(p=>p[1]>-.47))continue
  const depth=eyeDepth([x+tile/2,heights.reduce((v,p)=>v+p[1],0)/4,z+tile/2])
  for(const [low,high,shade,map] of [[-100,-.55,'#426f68','bed'],[-.55,.82,'#bfa87e','shore'],[.82,100,'#6e7951','moss']]){
   const part=clipPoly(clipPoly(heights,p=>p[1]-low),p=>high-p[1]),draw=polygon(part,shade,map,depth)
   if(draw)floor.push({depth,draw})
  }
  if(!submergedView&&heights.some(p=>p[1]<0)){
   const wet=clipPoly(heights,p=>-p[1]).map(p=>[p[0],0,p[2]])
   const deep=heights.reduce((v,p)=>v+p[1],0)/4
   const draw=polygon(wet,deep<-1.6?'rgba(38,106,108,.91)':'rgba(76,139,131,.65)')
   if(draw)surface.push({depth:mid,draw})
   if(deep<-.45){const wave=project(x+1.3+.18*Math.sin(t*.58+z),.02,z+1.2),side=project(x+1.74,.03,z+1.18)
   if(wave&&side&&wave.x>0&&wave.x<width&&wave.y>0&&wave.y<height)surface.push({depth:mid-.04,draw(){ctx.strokeStyle='rgba(218,225,192,'+(.19+.10*Math.sin(x*3.2+z+t*.7))+')';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(wave.x,wave.y);ctx.lineTo(side.x,side.y);ctx.stroke()}})}
  }
 }
 floor.sort((a,b)=>b.depth-a.depth);for(const p of floor)p.draw()
 if(submergedView){
  const blend=ctx.createLinearGradient(0,0,0,height)
  blend.addColorStop(0,'rgba(0,0,0,0)');blend.addColorStop(.34,'rgba(0,0,0,0)');blend.addColorStop(.53,'rgba(0,0,0,.06)');blend.addColorStop(.72,'rgba(0,0,0,.40)');blend.addColorStop(.88,'rgba(0,0,0,.82)');blend.addColorStop(1,'#000')
  ctx.globalCompositeOperation='destination-in';ctx.fillStyle=blend;ctx.fillRect(0,0,width,height);ctx.globalCompositeOperation='source-over';ctx=mainContext;ctx.drawImage(floorCanvas,0,0,width,height)
 }
 commands.push(...surface)
}
function contact(x,y,z,size,strength){
 const p=project(x,y+.045,z);if(!p||p.depth<.3)return
 const r=p.k*size;if(r<2||r>width*1.3||p.y>height+r||p.x+r<0||p.x-r>width)return
 commands.push({depth:p.depth+.13,draw(){const h=Math.max(1,r*.19);ctx.save();ctx.translate(p.x,p.y);ctx.scale(r,h);const ink=ctx.createRadialGradient(0,0,.01,0,0,1);ink.addColorStop(0,'rgba(12,22,18,'+strength+')');ink.addColorStop(1,'rgba(12,22,18,0)');ctx.fillStyle=ink;ctx.fillRect(-1,-1,2,2);ctx.restore()}})
}
function plant(name,x,y,z,h,phase,t){
 const m=habitatPlate(name);if(!m)return
 const scale=h/m.height,center=project(x,y+h*.46,z),anchor=project(x,y,z);if(!center||!anchor||center.depth<.35)return
 const distance=Math.hypot(x-camera.x,z-camera.z)
 if(submergedView&&(distance>38||(y>.1&&distance>11)))return
 const size=center.k*m.size*scale
 const atX=anchor.x,atY=anchor.y,left=-size*m.anchor[0],top=-size*m.anchor[1]
 if(size<2||atX+left>width||atX+left+size<0||atY+top>height||atY+top+size<0)return
 const baseBlend=Math.max(0,Math.min(1,(atY/height-.48)/.42))
 const alpha=submergedView?Math.min(1,Math.max(0,(39-distance)/19))*baseBlend*baseBlend:Math.min(1,Math.max(.15,(91-distance)/38))
 if(alpha<.025)return
 if(distance<19)contact(x,y,z,h*(name==='rock'?1:.32),.40)
 commands.push({depth:center.depth,draw(){ctx.save();ctx.globalAlpha=alpha;ctx.translate(atX,atY);ctx.scale(Math.sin(phase)<0?-1:1,1)
 if(name==='kelp'||name==='reed')ctx.transform(1,0,.028*Math.sin(t*.9+phase),1,0,0)
 ctx.drawImage(submergedView&&m.submerged?m.submerged:m.img,left,top,size,size);ctx.restore()}})
}
function animal(name,x,y,z,scale,angle,t,hit=0,hero=false,pose={}){
 const m=animalPlate(name);if(!m)return
 const pos=project(x,y+(m.centerY+(pose.lift||0))*scale+Math.sin(t*(hero?3:2.3))*.028*scale,z)
 if(!pos||pos.depth<.17)return
 const size=pos.k*m.span*scale
 if(size<2||pos.x+size/2<0||pos.x-size/2>width||pos.y+size/2<0||pos.y-size/2>height)return
 const view=((Math.round((angle-Math.atan2(camera.x-x,camera.z-z))*4/Math.PI)%8)+8)%8
 const altitude=y-ground(x,z)
 if(altitude<4.5)contact(x,ground(x,z),z,scale*(1.3+altitude*.07),Math.max(.07,.38-altitude*.06))
 const alpha=submergedView?Math.max(.15,Math.min(1,(39-pos.depth)/23)):Math.max(.3,Math.min(1,(65-pos.depth)/25))
 commands.push({depth:pos.depth,draw(){ctx.save();ctx.globalAlpha=alpha;ctx.translate(pos.x,pos.y)
 ctx.rotate((pose.roll||0)+.38*(pose.pitch||0)*Math.cos(angle-camera.yaw));const breath=name==='canopy-heart'?0:Math.sin(t*(name==='bee'?10:3.8))*.019
 ctx.scale((1+breath)*(pose.wide||1)*Math.sqrt(pose.stretch||1),(1-breath*.65)/Math.sqrt(pose.stretch||1))
 if(hit>0){ctx.shadowColor='#ffe0a4';ctx.shadowBlur=7}
 ctx.drawImage(m.img,view%4*m.tile,Math.floor(view/4)*m.tile,m.tile,m.tile,-size/2,-size/2,size,size);ctx.restore()}})
}
function habitat(time,fallen,landmarks){
 for(const item of [...props,...nurseryBeds]){
  const dist=Math.hypot(item.x-camera.x,item.z-camera.z)
  if(dist>(submergedView?38:67)||dist<.42)continue
  const key=propFor(item);plant(key,item.x,ground(item.x,item.z),item.z,propHeight(item,key),item.x*5.1+item.z,time)
 }
 for(const mark of landmarks){const h=ground(mark.x,mark.z);if(Math.hypot(mark.x-camera.x,mark.z-camera.z)<70)plant(h<0?'coral':'tree',mark.x,h,mark.z,7.2,mark.z,time)}
 if(!submergedView){for(let i=0;i<32;i++){const x=-145+i*9,z=-107+Math.sin(i*.7)*8;if(Math.hypot(x-camera.x,z-camera.z)<88)plant('tree',x,ground(x,z),z,13+i%3,i,time)}}
  const web=worldModel(-17,ground(-17,2),2)
  for(let i=0;i<8;i++){let a=i*Math.PI/4;web.limb(0,2,0,Math.cos(a)*3,2+Math.sin(a)*2.1,0,.038,'#e5efd9');let b=a+Math.PI/4;for(let r of [.4,.75,1])web.limb(Math.cos(a)*3*r,2+Math.sin(a)*2.1*r,0,Math.cos(b)*3*r,2+Math.sin(b)*2.1*r,0,.024,'#dfeddc')}
  if(!submergedView&&Math.hypot(camera.x,camera.z+80)<95)animal('canopy-heart',0,ground(0,-80),-80,1,0,time)
  if(fallen&&!submergedView){const canopy=worldModel(0,ground(0,-80),-80);for(let i=0;i<26;i++){const u=(time*.07+i*.618)%1,theta=i*2.4+u;canopy.oval(Math.cos(theta)*u*6,10+u*10,Math.sin(theta)*u*6,.09,.1,.09,'#efc76c')}}
}
export function render(game,time,dt){
  if(game.intro)return
  commands=[];const {hero,intro,partner}=game
  props=game.world.props
  const yaw=game.yaw||0
  const playerSize=bodySize(hero)
  const behind=game.firstPerson?0:7.2*Math.sqrt(playerSize)
  const submerged=hero.y+playerSize*.8<0&&ground(hero.x,hero.z)<0
  let cameraHeight=hero.y+playerSize*(game.firstPerson?1.05:4.05)+Math.sin(game.pitch)*behind*.78
  if(submerged)cameraHeight=Math.min(-.13,cameraHeight)
  const target=intro?{x:-1.7,y:-.46,z:39.5,tilt:.07}:{x:hero.x-Math.sin(yaw)*behind,y:cameraHeight,z:hero.z+Math.cos(yaw)*behind,tilt:(game.firstPerson?.055:submerged?.09:.15)+game.pitch}
  if(!intro){
    // Pull the camera forward before it reaches a bank or a solid obstacle.
    for(let i=1;i<=12;i++){const u=i/12,px=hero.x+(target.x-hero.x)*u,pz=hero.z+(target.z-hero.z)*u,py=hero.y+playerSize+(target.y-hero.y-playerSize)*u
      const hit=ground(px,pz)>py-.08||game.world.solids.some(o=>py>o.base&&py<o.top&&Math.abs(o.x-px)<o.r+.12&&Math.hypot(o.x-px,o.z-pz)<o.r+.12)
      if(hit){const v=Math.max(0,(i-1)/12);target.x=hero.x+(target.x-hero.x)*v;target.z=hero.z+(target.z-hero.z)*v;break}
    }
    target.y=Math.max(target.y,ground(target.x,target.z)+.12)
    if(!game.firstPerson){
     const eyeToBody=Math.atan2(target.y-hero.y-playerSize*.83,Math.max(.12,Math.hypot(target.x-hero.x,target.z-hero.z)))
     const halfFOV=Math.atan(height/(2*focal))
     target.tilt=Math.max(eyeToBody-halfFOV*.8,Math.min(eyeToBody+halfFOV*.72,target.tilt))
    }
  }
  camera.yaw=intro?0:yaw
  const smooth=game.snap?1:Math.min(1,dt*10)
  for(const k of Object.keys(target))camera[k]+=(target[k]-camera[k])*smooth
  game.snap=false
  submergedView=camera.y<0
  let accelerated=false
  if(drawGPU){try{accelerated=drawGPU(game,camera,time)}catch(error){console.warn('Using painted habitats',error);drawGPU=null}}
  if(accelerated)ctx.clearRect(0,0,width,height)
  else{
    backdrop(time);terrain(time);habitat(time,game.fallen,game.world.landmarks)
    for(const a of game.items)if(a.live&&Math.hypot(a.x-camera.x,a.z-camera.z)<42)animal(a.type,a.x,a.y,a.z,scaleOf(a.type),a.angle,time+a.seed,a.hit)
    for(const e of game.enemies)if(e.live&&Math.hypot(e.x-camera.x,e.z-camera.z)<48)animal(e.type,e.x,e.y,e.z,scaleOf(e.type),e.angle,time,e.hit,false,predatorPose(e))
    animal('lantern',partner.x,partner.y,partner.z,scaleOf(partner.form),partner.angle,time)
    if(!game.firstPerson)animal(hero.form,hero.x,hero.y,hero.z,playerSize,hero.angle,time,0,true,playerPose(game,time))
    const meal=feedingPose(game,time)
    if(meal)animal(meal.type,meal.x,meal.y,meal.z,scaleOf(meal.type)*meal.scale,meal.angle,time,0,false,meal.pose)
    commands.sort((a,b)=>b.depth-a.depth);for(const c of commands)c.draw()
    if(submergedView){
      for(let j=0;j<62;j++){
       const px=((j*.6180339*width+Math.sin(time*.24+j)*9-camera.yaw*(14+j%17))%width+width)%width
       const py=((j*83-time*(2+j%5))%height+height)%height
       ctx.fillStyle=j%4?'rgba(209,231,196,.33)':'rgba(229,225,182,.62)';ctx.beginPath();ctx.arc(px,py,.55+j%3*.35,0,6.29);ctx.fill()
      }
    }
  }
  if(!intro){
    const guide=game.guide
    if(guide?.live&&!game.huntComplete){
     const p=project(guide.x,guide.y+bodySize(guide)*1.65,guide.z)
     if(p&&p.depth<38&&p.x>24&&p.x<width-24&&p.y>32&&p.y<height-32){
      const y=p.y-5;ctx.save();ctx.translate(p.x,y);ctx.beginPath();ctx.moveTo(-4,-5);ctx.lineTo(0,0);ctx.lineTo(4,-5);ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=4;ctx.strokeStyle='#19312d';ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#ffe2a1';ctx.stroke();ctx.restore()
     }
    }
    if(game.firstPerson){ctx.beginPath();ctx.arc(width/2,height*.5,3,0,Math.PI*2);ctx.fillStyle='#f2f3c6';ctx.fill()}
    drawCombat(ctx,project,game,time)
    for(const a of [...game.items,...game.enemies]){if(!a.live||a.hp===a.maxHP)continue;const pt=project(a.x,a.y+scaleOf(a.type)*2.1,a.z);if(pt){ctx.fillStyle='#253d43';ctx.fillRect(pt.x-13,pt.y,26,4);ctx.fillStyle='#ffc690';ctx.fillRect(pt.x-13,pt.y,26*a.hp/a.maxHP,4)}}
  }
}
