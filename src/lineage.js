export const beginning=['amoeba','colony']
export const plantPath=['sapling','tree']
export const animalPath=['fish','cleaner','lungfish','worm','snail','spider','bee','bird']
export const finalPath=['ape','human']
export const stages=[...beginning,...plantPath,...animalPath,...finalPath]
export const groups=[['Origin',beginning],['Plant life',plantPath],['Animal life',animalPath],['Toolmaking',finalPath]]
export const endOfLife=id=>id==='bird'||id==='tree'
export const pathOf=id=>plantPath.includes(id)?'plant':animalPath.includes(id)?'animal':null
const valid=id=>stages.includes(id)
const score=n=>Number.isSafeInteger(n)&&n>=0?n:0

export function loadLineage(save){
 const raw=save?.lineage
 const book={first:null,done:new Set(),scores:{amoeba:0},homes:{},seedShed:false,crafted:false}
 if(raw){
  book.first=['plant','animal'].includes(raw.first)?raw.first:null
  for(const id of Array.isArray(raw.done)?raw.done:[])if(valid(id))book.done.add(id)
  for(const [id,n] of Object.entries(raw.scores||{}))if(valid(id))book.scores[id]=score(n)
  for(const [id,h] of Object.entries(raw.homes||{}))if(valid(id)&&h&&['x','z','depth','yaw'].every(k=>Number.isFinite(h[k])))book.homes[id]={x:h.x,z:h.z,depth:h.depth,yaw:h.yaw}
  book.seedShed=!!raw.seedShed;book.crafted=!!raw.crafted
 }else if(save){
  // Earlier saves only identified the current form. Credit unavoidable ancestors in the old routes.
  if(save.form!=='amoeba')book.done.add('amoeba')
  if(!beginning.includes(save.form))book.done.add('colony')
  if(![...beginning,'fish'].includes(save.form))book.done.add('fish')
  if(![...beginning,'fish','lungfish'].includes(save.form))book.done.add('lungfish')
  if(['bird','ape'].includes(save.form))book.done.add('spider')
  if(save.form==='ape')book.done.add('bird')
  if(['cleaner','worm','snail'].includes(save.form))book.done.add('bee')
  if(['worm','snail'].includes(save.form))book.done.add('cleaner')
  if(save.form==='snail')book.done.add('worm')
  if(save.form==='tree'||save.fallen)book.done.add('sapling')
  if(save.fallen){book.done.add('tree');book.seedShed=true}
  book.first=pathOf(save.form)
 }
 if(save&&valid(save.form)){book.scores[save.form]=score(save.kills);book.homes[save.form]=save.checkpoint}
 return book
}
export function bothPaths(book){return [...plantPath,...animalPath].every(id=>book.done.has(id))}
export function availableForms(book){
 const options=new Set([...Object.keys(book.scores),...book.done])
 if(book.done.has('amoeba'))options.add('colony')
 if(book.done.has('colony')){
  if(book.first!=='animal'||book.done.has('bird'))options.add('sapling')
  if(book.first!=='plant'||book.done.has('tree'))options.add('fish')
 }
 for(const path of [plantPath,animalPath])for(let i=1;i<path.length;i++)if(book.done.has(path[i-1]))options.add(path[i])
 if(bothPaths(book))options.add('ape')
 if(bothPaths(book)&&book.done.has('ape')&&book.crafted)options.add('human')
 return stages.filter(id=>options.has(id))
}
export function recordLineage(book){return {...book,done:[...book.done]}}
