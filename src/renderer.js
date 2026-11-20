import {drawGround,maskWithTerrain} from './ground-raster.js'
import {lagoonLight} from './atmosphere.js'
import {animalPlate,habitatPlate} from './plates.js'
import {propFor,propHeight,propYaw,viewDistance,nurseryBeds,feedingPose} from './scenery.js'
import {predatorPose,playerPose} from './combat.js'
import {drawFlight} from './flight-art.js'
import {drawSilk} from './silk-art.js'
import {drawCombat} from './combat-art.js'
import {ground,scaleOf,bodySize} from './physics.js'
const canvas=document.createElement('canvas'),stage=document.querySelector('#stage')
stage.append(canvas);canvas.style.zIndex='1'
let drawGPU=null
import('./gpu-engine.js').then(m=>{drawGPU=m.bootGPU(stage)}).catch(err=>console.warn('Using the painted renderer',err))
const ctx=canvas.getContext('2d');const camera={x:0,y:12,z:20,tilt:.48}
let width,height,focal,commands=[],submergedView=false
export function resize(){
  width=innerWidth;height=innerHeight;const ratio=Math.min(devicePixelRatio,1.5)
  canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0)
  focal=Math.min(height*.99,width*1.12)
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
 const under=camera.y<0&&ground(camera.x,camera.z)<0
 if(under){lagoonLight(ctx,camera,time,width,height,focal);return}
 const sky=ctx.createLinearGradient(0,0,0,height)
 sky.addColorStop(0,'#5d879d');sky.addColorStop(.56,'#c3cdbb');sky.addColorStop(1,'#98aaa0')
 ctx.fillStyle=sky;ctx.fillRect(0,0,width,height)
 const sun=project(camera.x-43,camera.y+76,camera.z+32)
 if(sun){const r=height*(under?.44:.24),light=ctx.createRadialGradient(sun.x,sun.y,1,sun.x,sun.y,r)
  light.addColorStop(0,under?'rgba(242,255,222,.68)':'rgba(255,245,202,.9)');light.addColorStop(.2,'rgba(248,238,191,.24)');light.addColorStop(1,'rgba(248,238,191,0)')
  ctx.fillStyle=light;ctx.fillRect(sun.x-r,sun.y-r,2*r,2*r)}
}
function contact(x,y,z,size,strength){
 const p=project(x,y+.045,z);if(!p||p.depth<.3)return
 const r=p.k*size;if(r<2||r>width*1.3||p.y>height+r||p.x+r<0||p.x-r>width)return
 commands.push({depth:p.depth+.13,draw(){const h=Math.max(1,r*.19);ctx.save();ctx.translate(p.x,p.y);ctx.scale(r,h);const ink=ctx.createRadialGradient(0,0,.01,0,0,1);ink.addColorStop(0,'rgba(12,22,18,'+strength+')');ink.addColorStop(1,'rgba(12,22,18,0)');ctx.fillStyle=ink;ctx.fillRect(-1,-1,2,2);ctx.restore()}})
}
// Cast the baked silhouette across the actual receiving slope. All four corners are
// projected from world space, so the footprint follows the trunk as the camera moves.
function plantShadow(p){
 const name=propFor(p),m=habitatPlate(name)
 if(!m?.shade||!(name==='rainwood'||name==='youngtree'||name==='fern'||name==='tidegarden'))return
 const d=Math.hypot(p.x-camera.x,p.z-camera.z);if(d>33)return
 const span=propHeight(p,name)*m.size/m.height
 const point=(u,v)=>{
  const across=(u-m.anchor[0])*span,high=(m.anchor[1]-v)*span
  const x=p.x+across*.62+high*.56,z=p.z+across*.78-high*.44
  return project(x,ground(x,z)+.028,z)
 }
 const A=point(0,0),B=point(1,0),C=point(0,1),D=point(1,1)
 if(!A||!B||!C||!D||[A,B,C,D].every(v=>v.y<0||v.y>height+160))return
 ctx.save();ctx.globalAlpha=(submergedView?.15:.34)*Math.min(1,(33-d)/12)
 const im=m.shade
 function tri(a,b,c,flip){
  ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.clip()
  ctx.transform((b.x-a.x)/im.width,(b.y-a.y)/im.width,(c.x-a.x)/im.height,(c.y-a.y)/im.height,a.x,a.y)
  if(flip){ctx.translate(im.width,im.height);ctx.scale(-1,-1)}
  ctx.drawImage(im,0,0);ctx.restore()
 }
 tri(A,B,C,false);tri(D,C,B,true);ctx.restore()
}
function plant(name,x,y,z,h,phase,t){
 const m=habitatPlate(name);if(!m)return
 const scale=h/m.height,center=project(x,y+h*.46,z),anchor=project(x,y,z);if(!center||!anchor||center.depth<.35)return
 const distance=Math.hypot(x-camera.x,z-camera.z)
 if(submergedView&&distance>(y>.1?35:47))return
 const size=center.k*m.size*scale
 const atX=anchor.x,atY=anchor.y,left=-size*m.anchor[0],top=-size*m.anchor[1]
 if(size<2||atX+left>width||atX+left+size<0||atY+top>height||atY+top+size<0)return
 const alpha=submergedView?Math.min(1,Math.max(0,(47-distance)/26)):Math.min(1,Math.max(.18,(93-distance)/36))
 if(alpha<.025)return
 if(distance<19)contact(x,y,z,h*(name==='rock'?1:.32),.40)
 commands.push({depth:center.depth,draw(){ctx.save();if(distance>12)maskWithTerrain(ctx,width,height,atX+left,atY+top,atX+left+size,atY+top+size,center.depth);ctx.globalAlpha=alpha;ctx.translate(atX,atY);ctx.scale(Math.sin(phase)<0?-1:1,1)
 if(name==='kelp'||name==='reed'||name==='fern')ctx.transform(1,0,.028*Math.sin(t*.9+phase),1,0,0)
 ctx.drawImage(submergedView&&m.submerged?m.submerged:m.img,left,top,size,size);ctx.restore()}})
}
function animal(name,x,y,z,scale,angle,t,hit=0,hero=false,pose={}){
 const flier=name==='bird'||name==='bee',flap=Math.sin(t*(name==='bee'?30:6))>.35
 const m=animalPlate(name,pose.plate||(flier&&flap?'upstroke':undefined));if(!m)return
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
  const key=propFor(item);if(dist>viewDistance(key)||dist<.42)continue
  plant(key,item.x,ground(item.x,item.z),item.z,propHeight(item,key),propYaw(item),time)
 }
 for(const mark of landmarks){const h=ground(mark.x,mark.z);if(Math.hypot(mark.x-camera.x,mark.z-camera.z)<70)plant(h<0?'coral':'rainwood',mark.x,h,mark.z,h<0?7.2:12.84,mark.z,time)}
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
  const behind=game.firstPerson?0:7.2*Math.sqrt(playerSize)*(game.zoom||1)
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
    backdrop(time);drawGround(ctx,camera,time,width,height,focal,submergedView);for(const p of props)plantShadow(p);habitat(time,game.fallen,game.world.landmarks)
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
    if(guide?.live&&!game.huntComplete&&hero.form!=='bird'&&hero.form!=='bee'){
     const p=project(guide.x,guide.y+bodySize(guide)*1.65,guide.z)
     if(p&&p.depth<38&&p.x>24&&p.x<width-24&&p.y>32&&p.y<height-32){
      const y=p.y-5;ctx.save();ctx.translate(p.x,y);ctx.beginPath();ctx.moveTo(-4,-5);ctx.lineTo(0,0);ctx.lineTo(4,-5);ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=4;ctx.strokeStyle='#19312d';ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#ffe2a1';ctx.stroke();ctx.restore()
     }
    }
    if(game.firstPerson){ctx.beginPath();ctx.arc(width/2,height*.5,3,0,Math.PI*2);ctx.fillStyle='#f2f3c6';ctx.fill()}
    drawCombat(ctx,project,game,time)
    drawFlight(ctx,project,game,time)
    if(game.web)drawSilk(ctx,project,hero,game.web,time,game.firstPerson)
    for(const a of [...game.items,...game.enemies]){if(!a.live||a.hp===a.maxHP)continue;const pt=project(a.x,a.y+scaleOf(a.type)*2.1,a.z);if(pt){ctx.fillStyle='#253d43';ctx.fillRect(pt.x-13,pt.y,26,4);ctx.fillStyle='#ffc690';ctx.fillRect(pt.x-13,pt.y,26*a.hp/a.maxHP,4)}}
  }
}
