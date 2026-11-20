import {ground} from './physics.js'

const heights={rock:1.25,coral:1.95,kelp:3.1,reed:1.75,mushroom:2.15,tree:9,shell:.52,sponge:1.68}
export function propFor(p){
 const h=ground(p.x,p.z)
 if(p.n===7)return 'shell'
 if(p.n===8)return 'sponge'
 if(p.n===0)return 'rock'
 if(Math.abs(h)<.9&&p.n>1)return 'reed'
 if(h<0)return p.n<4?'kelp':'coral'
 return p.n<4?'mushroom':'reed'
}
export function propHeight(p,key){return heights[key]*p.s}

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
