// All heights are relative to the water surface. Negative ground height is the bed.
export function ground(x,z){
 const bend=32+14*Math.sin(x*.029)+5*Math.sin(x*.071)
 const offset=z-bend
 const lateral=Math.abs(offset-Math.round(offset/155)*155)
 const width=19+3.5*Math.cos(x*.038)+1.8*Math.sin(x*.097)
 const shore=lateral-width
 const main=shore<0?Math.max(-8.4,shore*.39):Math.min(2.7,shore*.29)+Math.min(1,shore/16)*(1.5+1.3*Math.sin(x*.071)*Math.cos(z*.075))
 const distance=Math.hypot(x,z-34);if(distance<68)return main
 // Tributaries cross the main channels beyond the nursery. Wider bends form sheltered pools.
 const bendX=28*Math.sin(z*.032)+13*Math.sin(z*.067),cross=x-bendX
 const sideDistance=Math.abs(cross-Math.round(cross/146)*146)
 const sideWidth=5+2*Math.cos(z*.061)+8*Math.pow(.5+.5*Math.cos(z*.040+x*.012),4)
 const sideBed=Math.max(-6.8,(sideDistance-sideWidth)*.46)
 const u=Math.min(1,(distance-68)/42),blend=u*u*(3-2*u)
 return main+(Math.min(main,sideBed)-main)*blend
}
export const scaleOf=id=>({amoeba:.22,colony:.38,microbe:.15,fish:.8,shiner:.39,pike:1.37,mantis:.87,cleaner:.68,minnow:.49,lungfish:.85,hunter:1.25,leech:.4,bee:.54,moth:.46,mite:.43,worm:.48,snail:.55,blight:.49,spider:.72})[id]??1
export const bodySize=actor=>actor.size??scaleOf(actor.form||actor.type)
export function modeOf(id){if(['amoeba','microbe','colony','fish','cleaner','minnow','shiner','pike','hunter'].includes(id))return 'water';if(id==='lungfish'||id==='leech')return 'both';if(['bee','moth','bird'].includes(id))return 'air';return 'land'}
export function fits(id,x,z,size=scaleOf(id)){const mode=modeOf(id),h=ground(x,z);if(mode==='water')return h<-(size*2.05+.25);if(mode==='land')return h>-.12;return true}
export function levelFor(id,x,z,depth=2.4,s=scaleOf(id)){
 const bottom=ground(x,z),mode=modeOf(id)
 if(mode==='air')return Math.max(0,bottom)+(id==='bird'?Math.max(.5,Math.min(8,depth)):id==='moth'?Math.max(.8,Math.min(5.2,depth)):1.2)
 if(mode==='water'||(mode==='both'&&bottom<-.5))return Math.max(bottom+.08,Math.min(-s*2-.09,-depth-s*.7))
 return bottom+.018
}
// The shoreline is traversable. Habitat suitability still governs wildlife and safe spawns.
export function playerLevel(id,x,z,depth,size){
 const bottom=ground(x,z)
 if(modeOf(id)==='air')return levelFor(id,x,z,depth,size)
 return bottom<0?Math.max(bottom+.035,-depth-size*.85):bottom+.018
}
export function respiration(id,x,y,z,size){
 const bottom=ground(x,z),depth=-(y+.85*size),wet=bottom<0&&depth>.015
 const mode=modeOf(id),aquatic=mode==='water'
 const depleted=aquatic?!wet:mode!=='air'&&wet&&depth>.43
 const capacity=aquatic?(id==='amoeba'||id==='colony'?10:14):id==='lungfish'?48:20
 return {wet,depth,capacity,depleted,label:aquatic?'Water reserve':'Air',mode}
}
export function resolveHabitat(actor,id,clear=()=>true){
 const size=actor.size??scaleOf(id)
 if(fits(id,actor.x,actor.z,size)&&clear(actor.x,actor.z))return false
 for(let radius=.5;radius<=128;radius+=1)for(let i=0;i<32;i++){
   const a=i*Math.PI/16,x=actor.x+radius*Math.cos(a),z=actor.z+radius*Math.sin(a)
   if(fits(id,x,z,size)&&clear(x,z)){actor.x=x;actor.z=z;return true}
 }return false
}
export function blocked(x,z,base,radius,bodyHeight,solids){
 for(const ob of solids){if(base>ob.top||base+bodyHeight<ob.base)continue
 if(Math.abs(x-ob.x)>radius+ob.r||Math.abs(z-ob.z)>radius+ob.r)continue
 if((x-ob.x)**2+(z-ob.z)**2<(radius+ob.r)**2)return true}
 return false
}
export function travel(actor,id,dx,dz,solids,depth){
 const size=actor.size??scaleOf(id),radius=size*.6
 const level=actor.player?playerLevel:levelFor
 const at=(x,z)=>level(id,x,z,depth,size)
 const clear=(x,z,y)=>!blocked(x,z,y,radius,size*1.65,solids)
 // A blocked ascent beneath an overhang must still allow travel at the current elevation.
 const heldHeight=(x,z)=>Math.max(ground(x,z)+.035,actor.y)
 const pass=(x,z)=>(actor.player||fits(id,x,z,size))&&(clear(x,z,at(x,z))||(actor.player&&clear(x,z,heldHeight(x,z))))
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/Math.max(.17,radius*.8)))
 for(let i=0;i<steps;i++){
  const x=actor.x+dx/steps,z=actor.z+dz/steps
  if(pass(x,z)){actor.x=x;actor.z=z;continue}
  if(pass(x,actor.z))actor.x=x
  if(pass(actor.x,z))actor.z=z
 }
 const nextY=level(id,actor.x,actor.z,depth,size)
 if(clear(actor.x,actor.z,nextY))actor.y=nextY
 else if(actor.player)actor.y=heldHeight(actor.x,actor.z)
}
export function terrainInk(x,z){const h=ground(x,z);return h< -3?'#287f92':h<-.85?'#4fa8ad':h<.05?'#99cebd':h<1?'#e3cd9e':'#76935e'}

export function clearStrike(from,to,solids){
 const fromHeight=from.y+bodySize(from)*.8,toHeight=to.y+bodySize(to)*.8
 const dx=to.x-from.x,dz=to.z-from.z,denominator=dx*dx+dz*dz
 for(const ob of solids){
   const u=denominator?Math.max(0,Math.min(1,((ob.x-from.x)*dx+(ob.z-from.z)*dz)/denominator)):0
   const y=fromHeight+(toHeight-fromHeight)*u
   if(y<ob.base||y>ob.top)continue
   if((from.x+u*dx-ob.x)**2+(from.z+u*dz-ob.z)**2<ob.r*ob.r)return false
 }return true
}
