import {groups,availableForms,plantPath,animalPath} from './lineage.js'
import {forms} from './ecology.js'

function element(tag,cls,text){
 const node=document.createElement(tag);node.className=cls
 if(text)node.textContent=text
 return node
}
export function drawLineageMenu(host,book,current,select){
 const open=new Set(availableForms(book)),grid=element('div','lineage-grid')
 for(const [title,ids] of groups){
  const group=element('section','lineage-group')
  group.append(element('h3','',title))
  for(const id of ids){
   const lived=Object.hasOwn(book.scores,id)||book.done.has(id),accessible=open.has(id)
   const state=!accessible?'Locked':id===current?'Current form':book.done.has(id)?'Completed':lived?'Previously lived':'Newly unlocked'
   const row=element(select?'button':'div','lineage-form '+(!accessible?'locked':id===current?'current':lived?'lived':'new'))
   row.append(element('span','form-name',forms[id].name),element('small','form-state',state))
   if(select){row.disabled=!accessible;row.onclick=()=>{if(accessible)select(id)}}
   group.append(row)
  }
  grid.append(group)
 }
 host.append(grid)
 const completed=[...plantPath,...animalPath].filter(id=>book.done.has(id)).length
 host.append(element('p','lineage-foot',completed+' / 10 path stages complete · Toolmaker opens after both paths.'))
}
