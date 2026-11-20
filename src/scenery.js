import {ground} from './physics.js'

const heights={rock:1.25,coral:1.95,kelp:3.1,reed:1.75,mushroom:.68,tree:9,shell:.52,sponge:1.68,rainwood:10.7,youngtree:4.65,fern:1.05,tidegarden:3.85}
export function propFor(p){
 if(p.kind)return p.kind
 const h=ground(p.x,p.z)
 if(p.n===7)return 'shell'
 if(p.n===8)return 'sponge'
 if(p.n===0)return 'rock'
 if(Math.abs(h)<.9&&p.n>1)return 'reed'
 if(h<0)return p.n<4?'kelp':'coral'
 return p.n===1?'mushroom':'fern'
}
export function propHeight(p,key){return heights[key]*p.s}


export const propYaw=p=>p.angle??(p.x*3.71+p.z)
export const viewDistance=key=>key==='rainwood'||key==='youngtree'?90:key==='tidegarden'?65:48

// Measured from the mesh ground pivots. Foliage yields; timber and reef rock are solid.
const reefLobes=[[-.2,-.1,1.52,1.75],[-2,-.35,1.13,1],[2.18,.27,.88,.98],[.58,-1.53,.65,.64],[-.93,1.12,.71,.62]]
export function propColliders(p){
 const key=propFor(p),base=ground(p.x,p.z),height=propHeight(p,key),yaw=propYaw(p)
 const solid=(x,z,r,lo,hi)=>({x,z,r,base:base+lo,top:base+hi})
 if(key==='rainwood'||key==='youngtree'){
  const r=height*(key==='rainwood'?.047:.038)
  return [solid(p.x,p.z,r*1.43,0,height*.13),solid(p.x,p.z,r,height*.13,height*.68)]
 }
 if(key==='tidegarden'){
  const s=height/4.079,c=Math.cos(yaw),a=Math.sin(yaw)
  return reefLobes.map(([x,z,r,h])=>solid(p.x+(x*c+z*a)*s,p.z+(z*c-x*a)*s,r*s,0,h*s))
 }
 if(key==='rock')return [solid(p.x,p.z,.96*p.s,0,height),solid(p.x+.68*p.s*Math.cos(yaw),p.z-.68*p.s*Math.sin(yaw),.53*p.s,0,.71*p.s)]
 if(key==='shell'||key==='sponge'||key==='coral')return [solid(p.x,p.z,p.s*({shell:.7,sponge:.60,coral:.72}[key]),0,height*.9)]
 if(key==='mushroom')return [solid(p.x,p.z,.19*height,0,height),solid(p.x,p.z,.43*height,height*.66,height)]
 return []
}

// Groups of tall fronds mark the edge of the small starting channel.
export const nurseryBeds=[[-4,34,1.95],[4.4,31,2.1],[-3.8,30.5,1.6],[5.6,27,2.05],[-6,25,1.7],[3.3,39.7,1.9],[-5.5,42,1.8],[-2.9,18,1.35],[7.5,18,1.65]].map(([x,z,s])=>({x,z,s,n:1}))

// Each animal has a different loss of balance before the feeding motion takes over.
const falls={
 microbe:[.58,.15,.68,.42],minnow:[2.42,.46,.08,.15],shiner:[-2.95,-.37,.15,.24],
 moth:[-2.3,.86,-.39,.2],mite:[2.99,-.81,.52,.11],leech:[-.61,.75,.09,.59],
 blight:[.93,-.41,.42,.69],pike:[-1.84,.44,-.18,.14],hunter:[1.66,.32,-.22,.18],
 mantis:[-.9,1.2,-.19,.32],ape:[1.29,.7,-.22,.18]
}
export function feedingPose(game,time){
 const m=game.meal;if(!m)return null
 const f=(time-m.t)/(m.hostile?.96:.78);if(f<0||f>=1)return null
 const tumble=Math.min(1,f/.58),decay=Math.max(0,(f-.32)/.68),t=decay*decay*(3-2*decay)
 const [roll,pitch,lift,squash]=falls[m.type]||falls.microbe
 const hero=game.hero,reach=hero.size*.58,feed=m.hostile?0:t
 const end=Math.sin(Math.PI*tumble*.52)
 return {type:m.type,angle:m.angle+(m.type==='shiner'?-1.8:m.type==='moth'?1.22:.34)*end,
  x:m.x+(hero.x+Math.sin(hero.angle)*reach-m.x)*feed,z:m.z+(hero.z+Math.cos(hero.angle)*reach-m.z)*feed,
  y:m.y+(hero.y+hero.size*.62-m.y)*feed,scale:Math.max(.03,1-t),
  pose:{roll:roll*end,pitch:pitch*end,lift:lift*Math.sin(Math.PI*tumble),stretch:1-squash*Math.sin(Math.PI*f),wide:m.type==='microbe'?1+.55*Math.sin(Math.PI*f):1,wing:m.type==='moth'?-1.08*end:0}}
}
