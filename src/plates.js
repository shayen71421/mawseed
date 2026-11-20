const directory='assets/'
const fauna=new Map(),habitat=new Map(),textures=new Map()
const queued=new Map()
function asset(file){
 if(queued.has(file))return queued.get(file)
 const img=new Image();img.decoding='async';img.src=directory+file
 queued.set(file,img);return img
}
const ready=img=>img&&img.complete&&img.naturalWidth>0
for(const [dir,map] of [['fauna',fauna],['habitat',habitat]]){
 fetch(directory+dir+'/'+(dir==='fauna'?'manifest':'habitat')+'.json').then(r=>r.json()).then(data=>{
  for(const [key,meta] of Object.entries(data)){const img=asset(dir+'/'+key+'.webp'),entry={...meta,img};map.set(key,entry)
   if(dir==='habitat'){const grade=()=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-atop';const tint=g.createLinearGradient(0,0,0,c.height);tint.addColorStop(0,'rgba(13,63,52,.29)');tint.addColorStop(.53,'rgba(13,61,49,.44)');tint.addColorStop(1,'rgba(6,43,41,.72)');g.fillStyle=tint;g.fillRect(0,0,c.width,c.height);entry.submerged=c};if(ready(img))grade();else img.addEventListener('load',grade,{once:true})}}
 }).catch(()=>{})
}
for(const name of ['bed','shore','moss'])textures.set(name,asset('habitat/'+name+'-color.webp'))
const patterns=new Map()
export function terrainPattern(ctx,name){
 if(patterns.has(name))return patterns.get(name)
 const img=textures.get(name);if(!ready(img))return
 const pattern=ctx.createPattern(img,'repeat');patterns.set(name,pattern);return pattern
}
export function animalPlate(name){const model=fauna.get(name);return model&&ready(model.img)?model:null}
export function habitatPlate(name){const model=habitat.get(name);return model&&ready(model.img)?model:null}
export const deepBackground=asset('lagoon-depths.webp')
export const forestBackground=asset('canopy-horizon.webp')
export const isReady=ready
