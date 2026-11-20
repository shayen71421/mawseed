import {bodySize,travel,clearStrike} from './physics.js'

// Distances are measured from the attacker's feet along its locked heading.
export const hunts={
 hunter:{name:'Reef hunter',move:'Hook bite',wind:.65,strike:.34,rest:1.05,start:2.75,drive:2.15,reach:1.12,width:.83,speed:3.4},
 pike:{name:'Needle pike',move:'Spear rush',wind:.56,strike:.29,rest:1.32,start:4.2,drive:4.05,reach:1.04,width:.46,speed:3.2},
 mite:{name:'Ember mite',move:'Spring kick',wind:.53,strike:.42,rest:.96,start:1.85,drive:1.48,reach:.65,width:.49,speed:2.8},
 mantis:{name:'Sickle mantis',move:'Scissor cut',wind:.74,strike:.38,rest:1.12,start:2.1,drive:.83,reach:1.62,width:.72,speed:3.15},
 ape:{name:'Stoneback ape',move:'Hammerfall',wind:.94,strike:.47,rest:1.5,start:2.65,drive:.8,reach:1.89,width:.93,speed:3.5}
}
const clamp01=n=>Math.max(0,Math.min(1,n))
const ease=n=>n*n*(3-2*n)
export function updatePredator(e,hero,solids,dt,time,depth,walk,hit){
 const h=hunts[e.type],s=bodySize(e),playerRadius=bodySize(hero)*.55
 const dx=hero.x-e.x,dz=hero.z-e.z,d=Math.hypot(dx,dz),dy=Math.abs(e.y+s*.8-hero.y-bodySize(hero)*.8)
 const phase=e.phase||'stalk'
 if(phase==='stalk'){
  const near=d<10+s*2&&Math.hypot(e.x-e.homeX,e.z-e.homeZ)<20
  if(near&&d<h.start+playerRadius&&dy<1+s*.6&&clearStrike(e,hero,solids)){
   e.phase='windup';e.age=0;e.aim=d>.03?Math.atan2(dx,dz):e.angle;e.angle=e.aim;e.landed=false;e.strikeDepth=depth
  }else if(near)walk(e,e.type,hero.x,hero.z,h.speed,dt,depth)
  else walk(e,e.type,e.homeX+2.6*Math.cos(time*.31+e.homeX),e.homeZ+2.6*Math.sin(time*.31+e.homeX),1.2,dt,e.depth)
  return
 }
 const previous=e.age;e.age+=dt
 const duration=phase==='windup'?h.wind:phase==='strike'?h.strike:h.rest
 const u=clamp01(e.age/duration),old=clamp01(previous/duration)
 const ax=Math.sin(e.aim),az=Math.cos(e.aim)
 if(phase==='strike'){
  const distance=h.drive*(ease(u)-ease(old)),beforeX=e.x,beforeZ=e.z
  travel(e,e.type,ax*distance,az*distance,solids,e.strikeDepth)
  const start=e.type==='ape'?.39:e.type==='mite'?.34:.13
  if(!e.landed&&u>=start&&old<.94){
   const forward=(hero.x-beforeX)*ax+(hero.z-beforeZ)*az
   const across=Math.abs((hero.x-beforeX)*az-(hero.z-beforeZ)*ax)
   const moved=(e.x-beforeX)*ax+(e.z-beforeZ)*az
   if(forward>=-playerRadius&&forward<=moved+h.reach+playerRadius&&across<h.width+playerRadius&&dy<.68+s*.66+playerRadius&&clearStrike(e,hero,solids)){
    e.landed=true;hit(e,h)
   }
  }
 }else if(phase==='recover'){
  // A missed lunge carries past the target; then the hunter makes room to attack again.
  const step=(e.type==='pike'?.95:.68)*(ease(u)-ease(old))
  travel(e,e.type,-ax*step,-az*step,solids,e.strikeDepth)
 }
 if(u>=1){e.phase=phase==='windup'?'strike':phase==='strike'?'recover':'stalk';e.age=0}
}
export function predatorPose(e){
 const h=hunts[e.type];if(!h||!e.phase||e.phase==='stalk')return {}
 const w=e.phase==='windup',a=e.phase==='strike',r=e.phase==='recover'
 const u=clamp01(e.age/(w?h.wind:a?h.strike:h.rest)),wind=w?ease(u):a?1-ease(Math.min(1,u*2.1)):0
 const strike=a?Math.sin(u*Math.PI):0,follow=a?ease(u):r?1-ease(u):0
 switch(e.type){
  case 'ape':return {arm:1.95*wind-1.12*follow,offArm:1.27*wind-.65*follow,pitch:-.24*wind+.64*follow,roll:.12*wind-.16*strike,stretch:1-.11*wind,lift:.14*strike}
  case 'mantis':return {arm:1.18*wind-1.33*strike,offArm:1.48*wind-1.55*strike,pitch:-.22*wind+.29*strike,spread:.45*wind-.42*strike}
  case 'mite':return {lift:Math.sin(Math.PI*u)*(a?.82:0),pitch:-.26*wind+.52*strike,roll:.26*strike,stretch:1-.33*wind+.22*strike,legs:.88*wind-.55*strike}
  case 'pike':return {roll:.5*wind-.36*strike,bend:.63*wind-.27*strike,jaw:.42*wind-.14*strike,stretch:1-.12*wind+.26*strike}
  default:return {jaw:.94*wind+.32*strike,roll:-.5*wind+.7*strike,bend:-.49*wind+.72*strike,pitch:-.11*wind}
 }
}
export const moves={
 amoeba:'engulf',colony:'divide',fish:'snap',lungfish:'heave',spider:'silk',bird:'stoop',ape:'hammer',
 bee:'sting',cleaner:'pluck',worm:'coil',snail:'crush',sapling:'root',tree:'vine'
}
export function playerPose(game,t){
 if(game.defeat){const u=ease(clamp01((t-game.defeat.t)/.78)),aquatic=['amoeba','colony','fish','cleaner','lungfish'].includes(game.hero.form);return {roll:u*(aquatic?1.67:1.25),pitch:u*(aquatic?.18:.55),stretch:1-.28*u,lift:-.24*u}}
 if(game.dodge&&t-game.dodge.t<.31){const u=clamp01((t-game.dodge.t)/.31);return {roll:Math.sin(Math.PI*u)*game.dodge.side*.83,pitch:-Math.sin(Math.PI*u)*.22,stretch:1+.14*Math.sin(Math.PI*u)}}
 const a=game.swing;if(!a)return {}
 const u=clamp01((t-a.t)/a.duration);if(u>=1)return {}
 const draw=Math.sin(Math.min(1,u/.38)*Math.PI*.5)*(1-ease(clamp01((u-.38)/.24)))
 const cut=Math.sin(Math.PI*clamp01((u-.33)/.67))
 switch(moves[game.hero.form]){
  case 'engulf':return {stretch:1-.27*draw+.38*cut,wide:1+.32*cut,pitch:.12*cut}
  case 'divide':return {wide:1+.39*draw,stretch:1-.18*draw+.38*cut,roll:.2*cut}
  case 'snap':return {jaw:.85*draw,bend:-.36*draw+.44*cut,roll:.24*cut,stretch:1+.19*cut}
  case 'heave':return {jaw:1.05*draw,lift:.23*cut,pitch:-.35*draw+.48*cut}
  case 'silk':return {arm:1.05*draw-.88*cut,spread:.65*draw,pitch:-.2*draw+.34*cut}
  case 'stoop':return {wing:.92*draw-.87*cut,pitch:-.48*draw+.76*cut,lift:.48*draw}
  case 'hammer':return {arm:2.05*draw-1.17*cut,offArm:.93*draw-.65*cut,pitch:-.28*draw+.52*cut,roll:.23*draw}
  case 'sting':return {pitch:-.65*draw+.92*cut,roll:.49*cut,bend:.65*cut,wing:.39*draw}
  case 'pluck':return {jaw:.65*draw,pitch:.29*draw-.38*cut,stretch:1+.26*cut}
  case 'coil':return {bend:.9*draw-.5*cut,stretch:1-.42*draw+.49*cut}
  case 'crush':return {lift:.68*draw,pitch:-.52*draw+.57*cut,stretch:1-.25*cut}
  case 'root':return {roll:-.37*draw+.45*cut,bend:.67*cut,stretch:1+.15*cut}
  case 'vine':return {roll:.33*draw-.49*cut,bend:-.8*draw+.96*cut,wide:1+.16*cut}
  default:return {}
 }
}
