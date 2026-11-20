import {bodySize,clearStrike} from './physics.js'
import {hunts,moves} from './combat.js'

// Curves are in body space (right, up, forward). Both camera modes see the same attack.
const curves={
 silk:u=>[Math.sin(u*6.28)*.07,.82+.24*Math.sin(u*3.14),.58+u*2.65],
 root:u=>[.25*Math.sin(u*5),.12+Math.sin(u*5.6)*.18,.35+u*3.1],
 vine:u=>[.9*Math.sin(u*5.1),.9+.57*Math.cos(u*4),.32+u*3.6],
 hammer:u=>[.42-.75*u,2.66-2.42*u*u,.19+1.67*u],
 sting:u=>[-.25+.34*u,.63+.1*Math.sin(u*3.14),.6+2.09*u],
 stoop:u=>[.57-.6*u,1.7-1.48*u,.45+2.2*u],
 crush:u=>[.56*Math.sin(u*3.14),1.84-1.61*u,.45+.77*u],
 pluck:u=>[.12*Math.sin(u*6),.59+.41*u,.83+1.55*u],
 heave:u=>[.36-.57*u,.26+.7*Math.sin(u*3.14),.45+1.89*u],
 snap:u=>[.72-.93*u,.47+.43*Math.sin(u*3.14),.9+.96*Math.sin(u*2.5)],
 coil:u=>[Math.sin(u*7)*.25,.33+.21*Math.cos(u*4),.38+2.2*u],
 engulf:u=>[Math.cos(u*3.2)*.72,.72+.41*Math.sin(u*3.2),.24+1.18*Math.sin(u*3.2)],
 divide:u=>[Math.cos(u*4.2)*.87,.66+Math.sin(u*5)*.2,.4+1.28*Math.sin(u*2.65)]
}
const colors={silk:'#c7f5e9',root:'#d1d788',vine:'#c1e395',hammer:'#e8bd88',sting:'#efcf79',stoop:'#d6ddd9',coil:'#cbbacc',engulf:'#c4edbd',divide:'#decbaa'}
function sweep(ctx,project,actor,shape,fraction,alpha,color,size,doubled=false){
 const start=Math.max(0,fraction-.59),sa=Math.sin(actor.angle),ca=Math.cos(actor.angle),curve=curves[shape]
 if(!curve||fraction<=start)return
 ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round'
 for(const side of doubled?[-1,1]:[1]){
  ctx.beginPath();let n=0,scale=1
  for(let k=0;k<=11;k++){
   const u=start+(fraction-start)*k/11,[raw,y,z]=curve(u),x=raw*side
   const p=project(actor.x+size*(x*ca+z*sa),actor.y+y*size,actor.z+size*(z*ca-x*sa))
   if(!p||p.depth<.11){n=0;continue}
   if(n++)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y)
   scale=p.k
  }
  ctx.globalAlpha=alpha*.2;ctx.lineWidth=Math.max(2,Math.min(13,scale*size*.09));ctx.stroke()
  ctx.globalAlpha=alpha;ctx.lineWidth=Math.max(1,Math.min(4,scale*size*.032));ctx.stroke()
 }
}
const debris={
 microbe:['#b2ec95','bubble',12],minnow:['#f8cc91','scale',10],shiner:['#c1eeee','scale',14],
 leech:['#ccb0c7','drop',8],moth:['#f3d597','dust',19],mite:['#cf9573','chip',9],
 blight:['#e7a0b5','dust',21],ape:['#bc966e','chip',13],mantis:['#c0cf88','chip',11],
 hunter:['#e4bcb0','scale',14],pike:['#a2d1b4','scale',12]
}
export function drawCombat(ctx,project,game,time){
 ctx.save()
 const hero=game.hero,swing=game.swing
 if(swing){
  const u=(time-swing.t)/swing.duration,move=moves[hero.form]
  if(u>.24&&u<1){const v=(u-.24)/.76;sweep(ctx,project,{...hero,angle:swing.angle},move,v,Math.sin(Math.PI*v),colors[move]||'#e7dfb9',bodySize(hero),['engulf','divide','silk','snap','stoop'].includes(move))}
 }
 for(const e of game.enemies){
  if(!e.live||!e.phase||e.phase==='stalk'||Math.hypot(e.x-hero.x,e.z-hero.z)>13||!clearStrike(hero,e,game.world.solids))continue
  const h=hunts[e.type],size=bodySize(e)
  if(e.phase==='windup'){
   const u=Math.min(1,e.age/h.wind),p=project(e.x,e.y+size*2.35,e.z)
   if(p&&p.depth>.17){ctx.globalAlpha=.68+.31*u;ctx.lineCap='round';ctx.lineWidth=2;ctx.strokeStyle='#ffbe89'
    ctx.beginPath();ctx.arc(p.x,p.y,5,-Math.PI/2,-Math.PI/2+Math.PI*2*u);ctx.stroke()
    ctx.font='600 12px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#243330';ctx.strokeText(h.move,p.x,p.y-11);ctx.fillStyle='#ffe2b7';ctx.fillText(h.move,p.x,p.y-11)
   }
  }else if(e.phase==='strike'){
   const u=Math.min(1,e.age/h.strike),move={ape:'hammer',pike:'sting',hunter:'snap',mite:'stoop',mantis:'snap'}[e.type]
   sweep(ctx,project,e,move,u,.94*Math.sin(Math.PI*u),'#ffc39e',size,e.type==='mantis')
  }
 }
 const hit=game.impact
 if(hit){const f=(time-hit.t)/.59,p=project(hit.x,hit.y,hit.z)
  if(p&&f>=0&&f<1){const [color,shape,count]=debris[hit.type]||debris.mite
   ctx.fillStyle=ctx.strokeStyle=color;ctx.lineWidth=1.2;ctx.globalAlpha=1-f
   for(let i=0;i<(hit.killed?count:5);i++){
    const a=i*2.39996,d=(.1+f*(.64+(i%7)*.14))*p.k*hit.size,x=p.x+d*Math.cos(a),y=p.y+d*Math.sin(a)*.72+p.k*hit.size*(shape==='chip'?.57*f*f:-.41*f)
    const r=Math.max(.65,Math.min(4,p.k*hit.size*(.023+.008*(i%3))*(1-f*.66)))
    ctx.beginPath()
    if(shape==='scale'||shape==='chip'){ctx.moveTo(x-r,y);ctx.lineTo(x+.3*r,y-r*1.8);ctx.lineTo(x+r*1.4,y+r*.4);ctx.closePath();ctx.fill()}
    else {ctx.arc(x,y,r,0,Math.PI*2);if(shape==='bubble')ctx.stroke();else ctx.fill()}
   }
  }
 }
 ctx.restore()
}
