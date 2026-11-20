import {bodySize,ground,blocked} from './physics.js'

export const silkLength=extended=>extended?15:11
const separation=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)
const thorax=a=>({x:a.x,y:a.y+bodySize(a)*.83,z:a.z})
function between(a,b,u){return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,z:a.z+(b.z-a.z)*u}}
export function silkPathClear(a,b,solids){
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,horizontal=dx*dx+dz*dz
 for(const o of solids){
  if(Math.max(a.y,b.y)<o.base||Math.min(a.y,b.y)>o.top)continue
  let low=0,high=1
  if(Math.abs(dy)>.0001){
   const first=(o.base-a.y)/dy,last=(o.top-a.y)/dy
   low=Math.max(0,Math.min(first,last));high=Math.min(1,Math.max(first,last))
  }
  const u=horizontal?Math.min(high,Math.max(low,((o.x-a.x)*dx+(o.z-a.z)*dz)/horizontal)):low
  if(Math.hypot(a.x+dx*u-o.x,a.z+dz*u-o.z)<o.r+.018)return false
 }
 const steps=Math.ceil(Math.sqrt(horizontal)/.55)
 for(let i=1;i<steps;i++){const p=between(a,b,i/steps);if(p.y<ground(p.x,p.z)+.025)return false}
 return true
}
export function aimSilk(hero,items,solids,yaw,pitch,length){
 const start=thorax(hero);let best=null,score=Infinity
 for(const a of items){
  if(!a.live||a.type!=='moth')continue
  const end=thorax(a),dx=end.x-start.x,dz=end.z-start.z,dy=end.y-start.y,d=separation(start,end)
  if(d>length)continue
  const horizontal=Math.hypot(dx,dz),delta=Math.atan2(dx,-dz)-yaw
  const azimuth=horizontal<.75?0:Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)))
  const elevation=Math.abs(Math.atan2(dy,horizontal)+pitch)
  if(azimuth>.87||(elevation>1.49&&horizontal>.8))continue
  const rank=azimuth*5+elevation*1.4+d*.19
  if(rank<score&&silkPathClear(start,end,solids)){best=a;score=rank}
 }
 return best
}
export function castSilk(hero,target,yaw,pitch,length,time){
 const start=thorax(hero),incline=Math.max(-1.36,Math.min(1.36,-pitch))
 const end=target?thorax(target):{x:start.x+Math.sin(yaw)*Math.cos(incline)*length,y:start.y+Math.sin(incline)*length,z:start.z-Math.cos(yaw)*Math.cos(incline)*length}
 return {target,start,tip:{...start},end,t:time,since:time,phase:'flight',length,expires:time+4.7}
}
export function stepSilk(web,hero,solids,time,dt){
 if(!web)return null
 const origin=thorax(hero),a=web.target
 function release(){
  if(a)a.pinned=0
  web.target=null;web.phase='miss';web.since=time;web.expires=time+.16
  return web
 }
 if(web.phase==='miss')return time>=web.expires?null:web
 if(a&&(!a.live||separation(origin,thorax(a))>web.length+1.2))return release()
 if(web.phase==='flight'){
  // Aim assistance follows a visible moth during the short flight. The silk tip still
  // travels the distance and checks the actual segment between frames.
  if(a)web.end=thorax(a)
  const distance=separation(web.tip,web.end),tip=between(web.tip,web.end,Math.min(1,dt*23/Math.max(.001,distance)))
  if(!silkPathClear(web.tip,tip,solids)||!silkPathClear(origin,tip,solids))return release()
  web.tip=tip
  if(distance<=dt*23+.001){
   if(!a)return release()
   web.phase='reel';web.since=time;a.pinned=4
  }
  return web
 }
 const head=thorax(a)
 if(time>web.expires||!silkPathClear(origin,head,solids))return release()
 if(web.phase==='reel'){
  const reach=.89*bodySize(hero)+.4
  const hook={x:hero.x+reach*Math.sin(hero.angle),z:hero.z+reach*Math.cos(hero.angle)}
  hook.y=Math.max(ground(hook.x,hook.z)+.08,hero.y+bodySize(hero)*.39)
  const dist=separation(a,hook),next=between(a,hook,Math.min(1,dt*8.8/Math.max(.01,dist)))
  if(blocked(next.x,next.z,next.y,bodySize(a)*.35,bodySize(a)*.9,solids))return release()
  a.x=next.x;a.z=next.z;a.y=Math.max(next.y,ground(a.x,a.z)+.06);web.tip=thorax(a)
  if(dist<.21){web.phase='pinned';web.since=time;web.expires=time+3.3}
 }else{
  web.tip=head
  if(separation(origin,head)>2.4*bodySize(hero)+.6)return release()
 }
 a.pinned=.3
 return web
}
