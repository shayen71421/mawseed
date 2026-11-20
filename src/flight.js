import {bodySize,ground,blocked} from './physics.js'
import {silkPathClear} from './silk.js'

const profiles={
 bird:{food:'moth',range:26,speed:21,windup:.22,recover:.62,lift:2.2,reach:.83},
 bee:{food:'mite',range:12,speed:12,windup:.14,recover:.48,lift:1.1,reach:.52}
}
export const isFlier=form=>Object.hasOwn(profiles,form)
const center=a=>({x:a.x,y:a.y+bodySize(a)*.75,z:a.z})
const distance3=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)
const floorAt=(x,z)=>Math.max(0,ground(x,z))+.075

// A gap the eye can see through must also fit the creature's body along the dive.
function approachClear(hero,eye,spot,solids){
 const size=bodySize(hero),radius=size*.6
 const left=Math.min(eye.x,spot.x)-radius,right=Math.max(eye.x,spot.x)+radius
 const near=Math.min(eye.z,spot.z)-radius,far=Math.max(eye.z,spot.z)+radius
 const corridor=[]
 for(const o of solids){
  if(o.x+o.r<left||o.x-o.r>right||o.z+o.r<near||o.z-o.r>far)continue
  corridor.push({x:o.x,z:o.z,r:o.r+radius,base:o.base-size*.9,top:o.top+size*.75})
 }
 return silkPathClear(eye,spot,corridor)
}
export function visibleQuarry(hero,items,solids){
 const p=profiles[hero.form],eye=center(hero),near=[]
 for(const a of items){
  if(!a.live||a.type!==p.food||a.predator)continue
  const spot=center(a),d=distance3(eye,spot)
  if(d<=p.range&&approachClear(hero,eye,spot,solids))near.push({actor:a,d})
 }
 return near.sort((a,b)=>a.d-b.d).slice(0,5).map(v=>v.actor)
}
export function chooseQuarry(game,time,cycle=false){
 const targets=visibleQuarry(game.hero,game.items,game.world.solids)
 const previous=game.sight?.until>time?game.sight:null
 // Preserve the scan order even when two moving moths pass each other.
 const order=previous?[...previous.targets.filter(a=>targets.includes(a)),...targets.filter(a=>!previous.targets.includes(a))]:targets
 const i=order.indexOf(previous?.selected)
 const selected=order.length?order[(i<0?0:i+Number(cycle))%order.length]:null
 game.sight={targets:order,selected,until:time+7}
 game.airTarget=selected
 return selected
}
export function beginFlight(hero,target,time){
 const d=distance3(center(hero),center(target))
 return {kind:hero.form,target,start:{x:hero.x,y:hero.y,z:hero.z},since:time,
  phase:'windup',u:0,hit:false,history:[],distance:d,slope:0}
}
function sweep(hero,end,solids){
 const start={x:hero.x,y:hero.y,z:hero.z},d=distance3(start,end),steps=Math.max(1,Math.ceil(d/.12)),size=bodySize(hero)
 for(let i=1;i<=steps;i++){
  const u=i/steps,x=start.x+(end.x-start.x)*u,z=start.z+(end.z-start.z)*u
  const y=Math.max(floorAt(x,z),start.y+(end.y-start.y)*u)
  if(blocked(x,z,y,size*.60,size*1.65,solids))return false
  Object.assign(hero,{x,y,z})
 }
 return true
}
export function stepFlight(game,time,dt){
 const f=game.flight,hero=game.hero,p=profiles[f.kind],a=f.target
 const elapsed=time-f.since
 function recover(hit){
  f.phase='recover';f.since=time;f.hit=hit;f.u=0
  f.recoveryY=hero.y;return hit?'hit':'miss'
 }
 if(f.phase==='recover'){
  f.u=Math.min(1,elapsed/p.recover)
  const ease=1-(1-f.u)**2
  sweep(hero,{x:hero.x,y:f.recoveryY+p.lift*ease,z:hero.z},game.world.solids)
  if(f.u===1)game.flight=null
  return null
 }
 if(!a.live||!game.items.includes(a))return recover(false)
 const end=center(a),here=center(hero),gap=distance3(here,end)
 if(!silkPathClear(here,end,game.world.solids))return recover(false)
 const dx=end.x-here.x,dz=end.z-here.z,h=Math.hypot(dx,dz)
 if(h>.04)hero.angle=Math.atan2(dx,dz)
 f.slope=Math.max(-.7,Math.min(1.25,Math.atan2(here.y-end.y,h)))
 if(f.phase==='windup'){
  f.u=Math.min(1,elapsed/p.windup)
  if(f.u===1){f.phase='dive';f.since=time;f.u=0}
  return null
 }
 if(elapsed>f.distance/p.speed+1.1||gap>p.range+2)return recover(false)
 f.history.push({x:hero.x,y:hero.y,z:hero.z,angle:hero.angle,t:time})
 if(f.history.length>12)f.history.shift()
 const step=Math.min(1,p.speed*dt/Math.max(.001,gap))
 const open=sweep(hero,{x:hero.x+dx*step,y:hero.y+(end.y-here.y)*step,z:hero.z+dz*step},game.world.solids)
 f.u=Math.max(0,Math.min(1,1-distance3(center(hero),end)/Math.max(.01,f.distance)))
 if(!open)return recover(false)
 if(distance3(center(hero),end)<=p.reach)return recover(true)
 return null
}
