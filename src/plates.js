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
   if(dir==='habitat'){const grade=()=>{
    if(['rainwood','youngtree','fern','tidegarden'].includes(key)){
     const shade=document.createElement('canvas');shade.width=shade.height=192
     const ink=shade.getContext('2d');ink.drawImage(img,0,0,192,192);ink.globalCompositeOperation='source-in';ink.fillStyle='#19291c';ink.fillRect(0,0,192,192);entry.shade=shade
    }
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-atop';const tint=g.createLinearGradient(0,0,0,c.height);tint.addColorStop(0,'rgba(13,63,52,.29)');tint.addColorStop(.53,'rgba(13,61,49,.44)');tint.addColorStop(1,'rgba(6,43,41,.72)');g.fillStyle=tint;g.fillRect(0,0,c.width,c.height);entry.submerged=c};if(ready(img))grade();else img.addEventListener('load',grade,{once:true})}}
 }).catch(()=>{})
}
for(const name of ['bed','shore','moss'])textures.set(name,asset('habitat/'+name+'-color.webp'))
const samples=new Map()
export function terrainSamples(name){
 if(samples.has(name))return samples.get(name)
 const img=textures.get(name);if(!ready(img))return null
 const levels=[],tile=document.createElement('canvas')
 for(let size=1024;size>=16;size/=2){
  tile.width=tile.height=size;const c=tile.getContext('2d',{willReadFrequently:true})
  c.drawImage(img,0,0,size,size);const pixels=c.getImageData(0,0,size,size)
  levels.push({size,colors:new Uint32Array(pixels.data.buffer)})
 }
 samples.set(name,levels);return levels
}
export function animalPlate(name){const model=fauna.get(name);return model&&ready(model.img)?model:null}
export function habitatPlate(name){const model=habitat.get(name);return model&&ready(model.img)?model:null}
