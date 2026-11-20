import {render} from './renderer.js'
import {forms,species,traits} from './ecology.js'
import {makeWorld,biomeAt} from './chunks.js'
import {scaleOf,bodySize,modeOf,ground,playerLevel,respiration,levelFor,resolveHabitat,blocked,travel,clearStrike} from './physics.js'
import {hunts,updatePredator} from './combat.js'
const SAVE_KEY='mawseed.lineage.v1'
function readRun(){
 try{
  const keys=[SAVE_KEY,...Object.keys(localStorage).filter(k=>k!==SAVE_KEY&&k.endsWith('.lineage.v1'))]
  for(const key of keys){
   let r;try{r=JSON.parse(localStorage.getItem(key))}catch{continue}
   if(r&&Object.hasOwn(forms,r.form)&&['kills','total','era','life','revision'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)&&['x','z','depth','yaw'].every(k=>Number.isFinite(r.checkpoint?.[k]))&&Array.isArray(r.learned)&&Array.isArray(r.consumed)){
    if(key!==SAVE_KEY)localStorage.setItem(SAVE_KEY,JSON.stringify(r))
    return r
   }
  }
 }catch{}
 return null
}
const savedRun=readRun()
let saveRevision=savedRun?.revision||0
const $=id=>document.getElementById(id),keys=new Set(),world=makeWorld(savedRun?.consumed)
const hero={x:0,z:36,y:0,angle:0,form:'amoeba',player:true,size:scaleOf('amoeba')*.68},partner={x:-4,z:29,y:0,angle:0,form:'amoeba',mode:'scout',timer:24,waypoint:0}
const game={hero,partner,world,intro:true,firstPerson:false,yaw:0,pitch:0,snap:true,fallen:false}
const learned=new Set(),discovered=new Set()
let swimDepth=2.4,damageUntil=0,reserve=1,exposure=0,guideAt=0
let checkpoint={x:hero.x,z:hero.z,yaw:0,depth:swimDepth}
let playing=false,chapter='',health=3,immunity=0,cooldown=0,kills=0,total=0,xp=0,points=0,life=1,clock=0,last=0,signalUntil=0,radioUntil=0,uiAt=0,era=0
const tips={
 amoeba:'Engulf nearby drifting cells. Your short reach makes positioning matter.',
 colony:'Your larger membrane reaches farther. Each meal expands your colony. Finish the hunt to grow fins.',
 fish:'Follow a shoal or use Find prey. Match the fish’s depth before biting.',
 lungfish:'Surface to refill your air. Your fins can carry you across wet sand.',
 spider:'A web strike briefly pins a surviving target in place.',
 bird:'Rise above rocks, then descend to the height of your prey.',
 ape:'A tool strike hits harder against ground-dwelling mites.',
 bee:'Fly just above the plants and sting the mites feeding nearby.',
 cleaner:'Remove leeches in the shallows. Match their depth before you bite.',
 worm:'Follow the damp bank. Land leeches are within reach from the soil.',
 snail:'Your shell absorbs one predator hit each life as a grazer.',
 sapling:'Use your roots to lash blight spores near the ground.',
 tree:'Lash the last blight spores to release the Canopy Heart’s seeds.'
}
let shellGuard=false,formTipUntil=0
function saveRun(){
 try{
  const last=JSON.parse(localStorage.getItem(SAVE_KEY))
  if((last?.revision||0)!==saveRevision)return
  const record={revision:saveRevision+1,form:hero.form,kills,total,era,life,checkpoint,learned:[...learned],consumed:world.consumed(),fallen:game.fallen,defeated:!!game.defeat||chapter==='REBIRTH'}
  localStorage.setItem(SAVE_KEY,JSON.stringify(record));saveRevision=record.revision
 }catch{}
}
function restoreRun(r){
 era=r.era;hero.form=r.form;kills=r.kills;total=r.total;xp=total*10;life=Math.max(1,r.life)+(r.defeated?1:0)
 for(const id of r.learned)if(traits.some(t=>t.id===id))learned.add(id)
 points=Math.max(0,Math.floor(total/3)-learned.size);game.fallen=!!r.fallen
 checkpoint={...r.checkpoint};hero.x=checkpoint.x;hero.z=checkpoint.z;game.yaw=checkpoint.yaw;swimDepth=checkpoint.depth
 hero.size=growthSize();health=maxHealth();shellGuard=hero.form==='snail';immunity=5
 sync();placeForm(hero.form,true);sync();focusPrey()
}
function form(){return forms[hero.form]}
function maxHealth(){return learned.has('shell')?4:3}
function sync(){world.stream(hero.x,hero.z,form().prey);game.items=world.items;game.enemies=world.enemies}
function distance(o){return Math.hypot(hero.x-o.x,hero.z-o.z)}
function bodyDistance(o){
 const preyScale=bodySize(o),heroScale=bodySize(hero)
 return Math.hypot(o.x-hero.x,o.z-hero.z,o.y+preyScale*.7-hero.y-heroScale*.7)
}
function nearest(){
 let closest=null,best=Infinity
 for(const a of game.items){if(!a.live)continue;const d=bodyDistance(a);if(d<best){best=d;closest=a}}
 if(!closest||clearStrike(hero,closest,world.solids))return closest
 let visible=null,limit=best+12
 for(const a of game.items){if(!a.live||a===closest)continue;const d=bodyDistance(a);if(d<limit&&clearStrike(hero,a,world.solids)){visible=a;limit=d}}
 return visible||closest
}
function quota(){return form().quota+Math.min(3,era)}
function maturity(){return Math.min(1,kills/quota())}
function growthSize(){return scaleOf(hero.form)*(.68+.32*maturity())}
function focusPrey(){
 const a=nearest();if(!a)return
 game.guide=a;game.pinnedPrey=a
 const dx=a.x-hero.x,dz=a.z-hero.z
 game.yaw=Math.atan2(dx,-dz)
 const size=bodySize(hero),swimming=hero.y+size*.8<0
 let eye=hero.y+size*(game.firstPerson?1.05:4.05)
 if(swimming)eye=Math.min(-.13,eye)
 const behind=game.firstPerson?0:7.2*Math.sqrt(size),base=game.firstPerson?.055:swimming?.09:.15
 game.pitch=Math.max(-.98,Math.min(.96,Math.atan2(eye-a.y-bodySize(a)*.85,Math.hypot(dx,dz)+behind)-base))
}
function guideReadout(){
 const a=game.guide;if(!a?.live){$('preyCue').textContent='Explore the habitat to find prey.';return}
 const dx=a.x-hero.x,dz=a.z-hero.z,delta=Math.atan2(dx,-dz)-game.yaw
 const turn=Math.atan2(Math.sin(delta),Math.cos(delta)),height=a.y+bodySize(a)*.85-hero.y-bodySize(hero)*.85
 const bearing=Math.abs(turn)<.48?'Ahead':Math.abs(turn)>2.55?'Behind':turn<0?'Left':'Right'
 const vertical=Math.abs(height)>.85?(height>0?' · Above ':' · Below ')+Math.abs(height).toFixed(1)+' m':''
 $('preyCue').textContent=species[a.type].label+' · '+bodyDistance(a).toFixed(1)+' m · '+bearing+vertical
}
function say(s){$('signal').textContent=s;signalUntil=clock+2}
function radio(text){$('radioText').textContent=text;$('radio').hidden=false;radioUntil=clock+6}
function updateHUD(){
 const ready=kills>=quota(),f=form();game.huntComplete=ready
 $('place').textContent=biomeAt(hero.x,hero.z).name;$('form').textContent=f.name
 $('vitals').textContent='Health '+health+' / '+maxHealth()+'   ·   Life '+life
 $('hpbar').max=maxHealth();$('hpbar').value=health
 $('hpbar').classList.toggle('low',health===1)
 $('growth').textContent=(kills>=quota()?'Fully grown':'Growing')+' · '+Math.round(100*growthSize()/scaleOf(hero.form))+'% adult size'
 $('findPrey').hidden=ready;$('preyCue').hidden=ready
 $('objectiveTitle').textContent=ready?'EVOLUTION READY':'HUNT'
 $('task').textContent=ready?(hero.form==='tree'?'Release the seeds':'Choose your next form'):'Consume '+quota()+' '+species[f.prey].name
 $('counter').textContent=Math.min(kills,quota())+' / '+quota()+' kills'
 $('xp').textContent=xp+' XP · Lv '+(1+Math.floor(total/3))
 $('fill').style.width=Math.min(100,100*kills/quota())+'%';$('points').textContent=points
 $('verb').textContent=f.action;$('evolve').hidden=!ready
 $('cameraBtn').textContent=game.firstPerson?'1st person':'3rd person'
}
function button(label,fn){const b=document.createElement('button');b.textContent=label;b.onclick=fn;return b}
function panel(kind,title,body){
 if(game.defeat&&kind!=='REBIRTH')return
 playing=false;keys.clear();chapter=kind
 $('chapter').textContent=kind;$('heading').textContent=title;$('story').textContent=body
 $('actions').replaceChildren();$('panel').replaceChildren();$('close').hidden=kind==='REBIRTH'
 if(!$('dialog').open)$('dialog').showModal()
}
function resume(){if($('dialog').open)$('dialog').close();keys.clear();playing=true;chapter=''}
function evolve(){
 if(!playing||game.defeat||kills<quota())return
 if(hero.form==='tree'){
   game.fallen=true;saveRun();panel('CANOPY HEART','The first seedfall','Your fruit splits open. A cloud of golden seeds lifts from the nursery arch. Start a new lineage with the skills your last one earned.')
   $('actions').append(button('Begin another lineage',()=>{era++;life++;changeForm('amoeba');resume()}));return
 }
 panel('EVOLUTION','Choose your next form','Your kills unlocked this adaptation. You can evolve here.')
 for(const next of form().next)$('actions').append(button(forms[next].name,()=>{changeForm(next);resume();say('Evolved into '+forms[next].name)}))
}
function placeForm(next,safe=false){
 const size=bodySize(hero)
 const clear=(x,z)=>!blocked(x,z,playerLevel(next,x,z,swimDepth,size),size*.6,size*1.65,world.solids)&&(!safe||game.enemies.every(e=>e.live===false||Math.hypot(x-e.x,z-e.z)>10))
 const shifted=resolveHabitat(hero,next,clear)
 hero.y=playerLevel(next,hero.x,hero.z,swimDepth,size);game.snap=true;return shifted
}
function changeForm(next){
 game.swing=null;game.dodge=null
 hero.form=next;kills=0;hero.size=growthSize();shellGuard=next==='snail';swimDepth=next==='lungfish'?.25:2.4
 reserve=1;exposure=0;game.meal=null;game.guide=null;game.pinnedPrey=null;game.pitch=0
 formTipUntil=clock+7;$('fieldTip').textContent=tips[next];health=maxHealth();cooldown=0;immunity=2
 sync();placeForm(next);sync();focusPrey();guideAt=clock+.18
 checkpoint={x:hero.x,z:hero.z,yaw:game.yaw,depth:swimDepth}
 updateHUD();guideReadout();saveRun()
}
function skills(){
 if(game.defeat)return
 panel('ADAPTATIONS','Skill tree',points+' skill point'+(points===1?'':'s')+' available. Earn one point for every three kills. Each trait costs one point.')
 const grid=document.createElement('div');grid.className='branches'
 for(const branch of ['Predation','Motion','Survival']){
   const col=document.createElement('div'),title=document.createElement('div');title.className='branchTitle';title.textContent=branch;col.append(title)
   for(const t of traits.filter(t=>t.branch===branch)){
     const owned=learned.has(t.id),locked=t.parent&&!learned.has(t.parent)
     const b=button('',()=>{if(learned.has(t.id)||!points||(t.parent&&!learned.has(t.parent)))return;learned.add(t.id);points--;if(t.id==='shell')health++;updateHUD();skills();saveRun()})
     b.className='node';b.disabled=owned||locked||!points
     const name=document.createElement('strong'),desc=document.createElement('span'),state=document.createElement('small')
     name.textContent=t.name;desc.textContent=t.desc;state.textContent=owned?'Learned':locked?'Requires '+traits.find(v=>v.id===t.parent).name:'1 point'
     b.append(name,desc,state);col.append(b)
   }grid.append(col)
 }$('panel').append(grid);$('actions').append(button('Back to habitat',resume))
}
const mapBase=new Map()
function chart(canvas,range,large){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,scale=w/(2*range)
 const project=p=>[w/2+(p.x-hero.x)*scale,h/2+(p.z-hero.z)*scale]
 let m=mapBase.get(large)
 const mx=Math.round(hero.x*2)/2,mz=Math.round(hero.z*2)/2
 if(!m||m.x!==mx||m.z!==mz){
  const plate=document.createElement('canvas');plate.width=large?216:96;plate.height=Math.round(plate.width*h/w)
  const surf=plate.getContext('2d'),pixels=surf.createImageData(plate.width,plate.height)
  for(let y=0;y<plate.height;y++)for(let x=0;x<plate.width;x++){
   const wx=mx+(x/plate.width-.5)*2*range,wz=mz+(y/plate.height-.5)*2*range*h/w,z=ground(wx,wz)
   const color=z<-.25?[35,82,88]:z<.42?[171,157,110]:[79,101,74]
   const contour=Math.abs(z/1.4-Math.round(z/1.4))<.08?7:0,n=Math.min(14,Math.max(-12,z*2))
   const k=(y*plate.width+x)*4
   for(let a=0;a<3;a++)pixels.data[k+a]=color[a]+n+contour
   pixels.data[k+3]=255
  }
  surf.putImageData(pixels,0,0);m={x:mx,z:mz,plate};mapBase.set(large,m)
 }
 c.drawImage(m.plate,0,0,w,h)
 c.strokeStyle='rgba(226,219,177,.24)';c.lineWidth=1
 if(!large){for(const r of [.23,.43]){c.beginPath();c.arc(w*.5,h*.5,r*w,0,2*Math.PI);c.stroke()}}
 else{const step=scale*20;for(let x=w*.5-(hero.x%20)*scale;x>-step;x-=step){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let x=w*.5-(hero.x%20)*scale+step;x<w;x+=step){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=h*.5-(hero.z%20)*scale;y<h;y+=step){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}for(let y=h*.5-(hero.z%20)*scale-step;y>0;y-=step){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}}
 function dot(o,color,r){const [x,y]=project(o);c.fillStyle=color;c.strokeStyle='#17343c';c.lineWidth=1.5;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.stroke()}
 for(const p of game.items)if(p.live&&distance(p)<range*1.5)dot(p,'#eedb99',large?2.6:3)
 for(const p of game.enemies)if(p.live!==false)dot(p,'#fa8078',large?4:6)
 dot(partner,'#97f0fc',large?5:6)
 c.save();c.translate(w/2,h/2);c.rotate(game.yaw);c.beginPath();c.moveTo(0,-9);c.lineTo(6,6);c.lineTo(0,4);c.lineTo(-6,6);c.closePath();c.fillStyle='#ffefd1';c.fill();c.strokeStyle='#183335';c.lineWidth=2;c.stroke();c.restore()
}
function atlas(){if(game.defeat)return;panel('EXPLORATION','Habitat atlas','The map follows you. Blue is water, sand marks the shore, and green is land. Gold dots mark prey, red dots mark predators, and cyan marks the lantern scout.')
 const canvas=document.createElement('canvas');canvas.width=520;canvas.height=280;canvas.id='atlas';$('panel').append(canvas);chart(canvas,120,true)
 const p=document.createElement('p');p.textContent='Discovered habitats · '+[...discovered].join(' / ');$('panel').append(p);$('actions').append(button('Return to world',resume))}
function pause(){if(game.defeat)return;panel('PAUSED','Beneath the roots','WASD moves. Drag the world or use Q/R to turn. F rises and C dives while swimming. Space attacks, Shift dodges, E evolves, T opens skills, M opens the atlas, and V switches camera. Drag vertically or use I/K to look up and down. G faces the nearest prey.')
 $('actions').append(button('Resume',resume))}
function switchCamera(){game.firstPerson=!game.firstPerson;game.snap=true;updateHUD();say(game.firstPerson?'First person · Drag or Q/R to look':'Third person')}
function attack(){
 if(!playing||game.defeat||cooldown>0||clock-(game.dodge?.t??-1)<.31)return
 const duration=learned.has('reflex')?.35:.54
 const reach=bodySize(hero)*(learned.has('reach')?4.75:3.4)*(hero.form==='tree'?1.5:1)
 let target=nearest(),best=target?bodyDistance(target):Infinity
 for(const e of game.enemies){
  if(!e.live)continue
  const d=bodyDistance(e)
  if(d<best&&d<=reach&&clearStrike(hero,e,world.solids)){target=e;best=d}
 }
 if(target&&best<=reach)hero.angle=Math.atan2(target.x-hero.x,target.z-hero.z)
 else target=null
 game.swing={t:clock,duration,target,reach,resolved:false,angle:hero.angle}
 cooldown=duration
}
function landAttack(){
 const swing=game.swing,prey=swing.target
 swing.resolved=true
 if(!prey?.live||bodyDistance(prey)>swing.reach*1.1){say('Out of reach');return}
 if(!clearStrike(hero,prey,world.solids)){say('Blocked · move around the obstacle');return}
 prey.hp-=(learned.has('bite')?2:1)+(hero.form==='ape'?1:0);prey.hit=.28
 game.impact={x:prey.x,y:prey.y+bodySize(prey)*.8,z:prey.z,size:bodySize(prey),type:prey.type,t:clock,killed:prey.hp<=0}
 if(hero.form==='spider')prey.pinned=1.3
 if(prey.hp>0){say('Hit · '+prey.hp+' health left');return}
 const hostile=Boolean(prey.predator)
 game.meal={x:prey.x,y:prey.y,z:prey.z,angle:prey.angle,type:prey.type,t:clock,hostile}
 world.kill(prey);if(!hostile)kills++
 total++;xp+=10;guideAt=0
 if(total%3===0)points++
 if(learned.has('heal'))health=Math.min(maxHealth(),health+1)
 say((hostile?'Defeated '+hunts[prey.type].name:'Consumed')+' · +10 XP'+(total%3===0?' · +1 skill point':''));updateHUD();saveRun()
}
function dodge(){
 if(!playing||game.defeat||clock<(game.dodge?.ready??0))return
 const side=Number(keys.has('d'))-Number(keys.has('a')),ahead=Number(keys.has('w'))-Number(keys.has('s'))
 const x=side||ahead?side:1,z=ahead,c=Math.cos(game.yaw),s=Math.sin(game.yaw),length=Math.hypot(x,z)||1
 game.dodge={t:clock,ready:clock+1.85,side:x<0?-1:1,dx:(x*c+z*s)/length,dz:(x*s-z*c)/length}
 game.swing=null
}
function receiveStrike(e,profile){
 if(immunity>0||game.defeat||clock-(game.dodge?.t??-1)<.31)return
 if(shellGuard){shellGuard=false;immunity=1.5;say('Shell absorbed '+profile.move);return}
 health=Math.max(0,health-1);damageUntil=clock+.48;immunity=1.6
 say(profile.name+' · '+profile.move);updateHUD()
 if(!health)die(profile.name+' landed '+profile.move)
}
function die(reason){
 if(game.defeat)return
 game.defeat={reason,t:clock};game.swing=null;game.dodge=null;health=0;keys.clear();updateHUD();saveRun()
}
function finishDefeat(){
 panel('REBIRTH',game.defeat.reason,'Your '+form().name+' returns to its evolution checkpoint with its size, hunt progress and skills.')
 $('actions').append(button('Respawn as '+form().name,newLife));saveRun()
}
function newLife(){
 game.defeat=null;game.dodge=null;game.swing=null
 life++;hero.x=checkpoint.x;hero.z=checkpoint.z;swimDepth=checkpoint.depth;game.yaw=checkpoint.yaw;game.pitch=0
 hero.size=growthSize();health=maxHealth();immunity=5;reserve=1;exposure=0;shellGuard=hero.form==='snail';cooldown=0;damageUntil=0
 game.meal=null;game.impact=null;game.guide=null;game.pinnedPrey=null;guideAt=0
 sync();placeForm(hero.form,true);sync();game.snap=true;updateHUD();resume();saveRun()
}
function breathe(dt,environment){
 if(environment.depleted)reserve=Math.max(0,reserve-dt/environment.capacity)
 else reserve=Math.min(1,reserve+dt*.24)
 exposure=reserve>0?0:exposure+dt
 if(exposure<2)return
 exposure=0;health--;damageUntil=clock+.48;updateHUD()
 if(health<=0)die(environment.mode==='water'?'Stranded on shore':'Out of air')
}
function walkTo(actor,id,x,z,speed,dt,depth){
 const dx=x-actor.x,dz=z-actor.z,d=Math.hypot(dx,dz),step=Math.min(d,speed*dt)
 if(d>.001){actor.angle=Math.atan2(dx,dz);travel(actor,id,dx/d*step,dz/d*step,world.solids,depth)}
 return d
}
function updateScout(dt){
 const r=partner;r.timer-=dt
 if(r.mode==='scout'&&r.timer<=0){r.mode='visit';r.timer=14}
 if(r.mode==='visit'){
   if(distance(r)>45){radio('The scout has found '+species[form().prey].name+'.');r.mode='scout';r.timer=38;return}
   const d=walkTo(r,r.form,hero.x+2,hero.z-2,10,dt,2.4)
   if(d<2||r.timer<=0){radio(kills>=quota()?'Your lineage is ready. Open evolution to choose a form.':'Get close before you strike. Your prey is marked gold on the radar.');r.mode='scout';r.timer=40;r.waypoint++}
 }else{
   const route=[[-12,23],[-24,7],[4,-5],[23,19],[13,42]]
   const dest=route[r.waypoint%route.length]
   if(walkTo(r,r.form,dest[0],dest[1],3.8,dt,2.4)<.7)r.waypoint++
   const next=ground(hero.x,hero.z)<-.65?'fish':'moth';if(next!==r.form){r.form=next;resolveHabitat(r,next);r.y=levelFor(next,r.x,r.z)}
 }
}
function simulation(dt){
 if(game.defeat){
  if(clock-game.defeat.t>=.8)finishDefeat()
  return
 }
 if(game.swing&&!game.swing.resolved&&clock-game.swing.t>=game.swing.duration*.39)landAttack()

 cooldown=Math.max(0,cooldown-dt);immunity=Math.max(0,immunity-dt)
 const turn=Number(keys.has('r')||keys.has('arrowright'))-Number(keys.has('q')||keys.has('arrowleft'))
 game.yaw+=turn*dt*1.9
 game.pitch=Math.max(-.98,Math.min(.96,game.pitch+dt*(Number(keys.has('k'))-Number(keys.has('i')))*1.25))
 const side=Number(keys.has('d'))-Number(keys.has('a')),forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'))
 const len=Math.hypot(side,forward)||1,c=Math.cos(game.yaw),s=Math.sin(game.yaw),dx=(side*c+forward*s)/len,dz=(side*s-forward*c)/len
 const speed=9*(learned.has('swim')?1.25:1)*(hero.form==='bird'?1.35:1)
 const nextSize=hero.size+(growthSize()-hero.size)*(1-Math.exp(-dt*4.5))
 if(!blocked(hero.x,hero.z,playerLevel(hero.form,hero.x,hero.z,swimDepth,nextSize),nextSize*.6,nextSize*1.65,world.solids))hero.size=nextSize
 const size=bodySize(hero),mode=modeOf(hero.form),bottom=ground(hero.x,hero.z)
 const mobility=mode==='water'&&hero.y+size*.85>=0?.25:mode==='land'&&bottom<-1?.48:hero.form==='lungfish'&&bottom>=0?.65:1
 const pace=speed*Math.sqrt(size)*mobility
 if(hero.form==='bird')swimDepth=Math.max(.5,Math.min(8,swimDepth+(Number(keys.has('f'))-Number(keys.has('c')))*dt*3.3))
 else swimDepth=Math.max(.2,Math.min(Math.max(.3,-ground(hero.x,hero.z)),swimDepth+(Number(keys.has('c'))-Number(keys.has('f')))*dt*2.9))
 const evade=game.dodge,evading=evade&&clock-evade.t<.31
 const burst=evading?Math.sqrt(size)*15:0
 travel(hero,hero.form,(dx*pace+(evading?evade.dx*burst:0))*dt,(dz*pace+(evading?evade.dz*burst:0))*dt,world.solids,swimDepth)
 if((side||forward)&&(!game.swing||clock-game.swing.t>game.swing.duration))hero.angle=Math.atan2(dx,dz)
 const environment=respiration(hero.form,hero.x,hero.y,hero.z,size)
 if(environment.wet&&Math.abs(playerLevel(hero.form,hero.x,hero.z,swimDepth,size)-hero.y)>.1)swimDepth=Math.max(.2,environment.depth)
 breathe(dt,environment);if(game.defeat)return
 game.environment=environment
 sync();discovered.add(biomeAt(hero.x,hero.z).name)
 for(const a of game.items){
   if(!a.live||distance(a)>44)continue
   a.hit=Math.max(0,a.hit-dt);if(a.pinned>0){a.pinned-=dt;continue}const d=distance(a),sp=species[a.type]
   const school=a.school!==undefined,panic=school?(a.hit>0?4.7:2.25):2.7*scaleOf(a.type)
   const fleeing=d<panic&&a.type!=='blight'
   const phase=school?a.school:a.seed
   const destX=fleeing?a.x+(a.x-hero.x)/(d||1)*2:a.homeX+Math.cos(clock*.34+phase)*2.7
   const destZ=fleeing?a.z+(a.z-hero.z)/(d||1)*2:a.homeZ+Math.sin(clock*.39+phase)*2.7
   walkTo(a,a.type,destX,destZ,sp.speed*(fleeing?1:.45)*Math.sqrt(scaleOf(a.type)),dt,a.depth+Math.sin(clock*.5+phase)*.32)
 }
 for(const e of game.enemies){
  if(!e.live||distance(e)>45)continue
  e.hit=Math.max(0,(e.hit||0)-dt)
  if(e.pinned>0){e.pinned-=dt;continue}
  updatePredator(e,hero,world.solids,dt,clock,swimDepth,walkTo,receiveStrike)
  if(game.defeat)return
 }
 if(clock>=guideAt||!game.guide?.live){
  if(game.pinnedPrey&&(!game.pinnedPrey.live||distance(game.pinnedPrey)>40||!game.items.includes(game.pinnedPrey)))game.pinnedPrey=null
  game.guide=game.pinnedPrey||nearest();guideAt=clock+.18
 }
 updateScout(dt)
 if(keys.has(' '))attack()
 if(clock>signalUntil)$('signal').textContent=''
 if(clock>radioUntil)$('radio').hidden=true
 $('fieldTip').hidden=clock>formTipUntil
}
if(savedRun)$('start').textContent='Continue as '+forms[savedRun.form].name
$('start').onclick=()=>{
 game.intro=false;game.snap=true;$('intro').hidden=true;$('hud').hidden=false;$('tools').hidden=false;document.body.classList.add('playing');playing=true
 if(savedRun)restoreRun(savedRun)
 else focusPrey()
 updateHUD();if(savedRun){say('Evolution checkpoint restored');guideReadout();saveRun()}else radio('Green drifters ahead. Swim close and press Space to engulf one.')
}
$('attack').onpointerdown=e=>{e.preventDefault();keys.add(' ');e.currentTarget.setPointerCapture(e.pointerId);attack()};$('attack').onlostpointercapture=()=>keys.delete(' ')
$('dodge').onclick=dodge
$('findPrey').onclick=()=>{if(playing)focusPrey();$('findPrey').blur()};$('pause').onclick=pause;$('skillsBtn').onclick=skills;$('mapBtn').onclick=atlas;$('cameraBtn').onclick=switchCamera;$('close').onclick=resume;$('evolve').onclick=evolve
$('dialog').oncancel=e=>{e.preventDefault();if(chapter!=='REBIRTH')resume()}
window.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase()
 if(!playing||game.defeat)return
 if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault()
 keys.add(k);if(e.repeat)return
 if(k==='shift')dodge();if(k===' ')attack();if(k==='g')focusPrey();if(k==='e')evolve();if(k==='m')atlas();if(k==='t')skills();if(k==='v')switchCamera();if(k==='escape')pause()
})
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear())
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key)};b.onlostpointercapture=()=>keys.delete(b.dataset.key)}
let drag=null
$('stage').onpointerdown=e=>{if(!playing)return;drag={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId)}
$('stage').onpointermove=e=>{if(drag!==null){game.yaw+=(e.clientX-drag.x)*.009;game.pitch=Math.max(-.98,Math.min(.96,game.pitch+(e.clientY-drag.y)*.006));drag={x:e.clientX,y:e.clientY}}}
$('stage').onlostpointercapture=()=>drag=null
sync();placeForm(hero.form);partner.y=levelFor(partner.form,partner.x,partner.z)
function frame(timestamp){
 const dt=Math.min(.075,(timestamp-last)/1000);last=timestamp
 if(playing||game.intro)clock+=dt
 if(playing)simulation(dt)
 if(playing||game.snap)render(game,clock,dt)
 document.body.classList.toggle('hit',clock<damageUntil)
 if(playing&&clock>uiAt){
 $('dodge').disabled=clock<(game.dodge?.ready??0)||!!game.defeat
 const bottom=ground(hero.x,hero.z),env=game.environment||respiration(hero.form,hero.x,hero.y,hero.z,bodySize(hero)),wet=env.wet
 $('depthControls').hidden=env.mode!=='air'&&bottom>=0||env.mode==='air'&&hero.form!=='bird'
 $('reserve').hidden=!env.depleted&&reserve>=.995
 $('reserveText').textContent=env.label+' · '+Math.ceil(reserve*env.capacity)+' s'+(env.depleted?(env.mode==='water'?' · Return to water':' · Rise for air'):' · Recovering')
 $('reserveBar').value=reserve;guideReadout()
 $('medium').textContent=wet?'Underwater · '+Math.max(.1,env.depth).toFixed(1)+' m':modeOf(hero.form)==='air'?'Airborne · '+(hero.y-Math.max(0,bottom)).toFixed(1)+' m':bottom<.7?'Shoreline' :env.mode==='water'?'Stranded on land':'On land'
 chart($('map'),34,false);$('place').textContent=biomeAt(hero.x,hero.z).name;uiAt=clock+.22}
 requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
