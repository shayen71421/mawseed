import {test} from 'node:test'
import assert from 'node:assert/strict'
import {animalPath,plantPath,loadLineage,availableForms,recordLineage,bothPaths} from '../src/lineage.js'
for(const first of ['plant','animal']){
 test(first+' first leaves each junction open for player selection',()=>{
  const book=loadLineage()
  assert.deepEqual(availableForms(book),['amoeba'])
  book.done.add('amoeba');book.done.add('colony')
  assert(availableForms(book).includes('fish')&&availableForms(book).includes('sapling'))
  book.first=first
  const [one,two]=first==='plant'?[plantPath,animalPath]:[animalPath,plantPath]
  for(const id of one){
   assert(availableForms(book).includes(id));assert(!availableForms(book).includes(two[0]))
   book.done.add(id)
  }
  for(const id of two){
   assert(availableForms(book).includes(id));assert(!availableForms(book).includes('ape'))
   book.done.add(id)
  }
  assert(bothPaths(book));assert(availableForms(book).includes('ape'))
  book.done.add('ape');assert(!availableForms(book).includes('human'))
  book.crafted=true;assert(availableForms(book).includes('human'))
 })
}
test('previous lives, points toward a hunt and earned forms survive save and restore',()=>{
 const checkpoint={x:3,yaw:1,z:0,depth:2},book=loadLineage()
 book.done.add('amoeba');book.scores.colony=5;book.homes.colony=checkpoint
 const restored=loadLineage({form:'amoeba',kills:8,checkpoint,lineage:JSON.parse(JSON.stringify(recordLineage(book)))})
 assert.equal(restored.scores.colony,5);assert.deepEqual(restored.homes.colony,checkpoint);assert(availableForms(restored).includes('colony'))
})
test('legacy toolmakers keep their form but cannot skip unplayed stages to become human',()=>{
 const book=loadLineage({form:'ape',kills:9})
 assert(availableForms(book).includes('ape'));assert(!availableForms(book).includes('human'));assert(!bothPaths(book))
})
