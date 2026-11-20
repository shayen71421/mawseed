import {habitats,species} from './ecology.js'
import {ground,fits,levelFor,scaleOf,blocked,resolveHabitat} from './physics.js'
export const SIZE=40
export function hash(x,z,salt=0){
 let n=Math.imul(x|0,1597334677)^Math.imul(z|0,3812015801)^Math.imul(salt+7,2246822519)
 n=Math.imul(n^(n>>>16),2246822519);return ((n^(n>>>13))>>>0)/4294967296
}
export function biomeAt(x,z){
 // Jittered habitat centres span the plane without a rectangular shoreline.
 const scale=76,cx=Math.floor(x/scale),cz=Math.floor(z/scale)
 let best=Infinity,index=0
 for(let a=cx-1;a<=cx+1;a++)for(let b=cz-1;b<=cz+1;b++){
   const px=(a+.18+.64*hash(a,b,1))*scale,pz=(b+.18+.64*hash(a,b,2))*scale,d=(px-x)**2+(pz-z)**2
   if(d<best){best=d;index=a===0&&b===0?0:Math.floor(hash(a,b,5)*habitats.length)}
 }
 const wet=ground(x,z)<0
 return wet?habitats[index%2]:habitats[2+(index%4)]
}
export function makeWorld(consumed=[]){
 const cache=new Map(),removed=new Set(consumed)
 let lastKey=''
 const world={props:[],items:[],enemies:[],landmarks:[],solids:[]}
 function build(x,z,type){
   const props=[],items=[],enemies=[],landmarks=[],solids=[]
   for(let i=0;i<30;i++)props.push({x:(x+hash(x,z,11+i*3))*SIZE,z:(z+hash(x,z,12+i*3))*SIZE,s:.5+hash(x,z,13+i*3)*1.45,n:i%7})
   for(let j=0;j<7;j++){
     const px=(x+hash(x,z,410+j*3))*SIZE,pz=(z+hash(x,z,411+j*3))*SIZE
     if(ground(px,pz)<-1.35)props.push({x:px,z:pz,s:.65+hash(x,z,412+j*3)*.85,n:j%3?7:8})
   }
   function prey(id,px,pz,seed,depth,school,kind=type){
     if(!fits(kind,px,pz))return
     items.push({id,type:kind,x:px,z:pz,homeX:px,homeZ:pz,y:levelFor(kind,px,pz,depth),angle:seed,seed,depth,school,live:!removed.has(id),hp:species[kind].hp,maxHP:species[kind].hp,hit:0})
   }
   if(type==='minnow'){
     // Reproducible small schools forage at different levels of the water column.
     if(x===0&&z===0){
       for(let j=0;j<5;j++){const a=2.39996*j;prey('nursery/minnow/'+j,1.9+1.2*Math.cos(a),29.1+.85*Math.sin(a),1.3+j*.62,6.1+j*.23,1.3,j===4?'shiner':'minnow')}
     }
     const spacing=SIZE/3
     for(let row=0;row<3;row++)for(let col=0;col<3;col++){
       const gx=x*3+col,gz=z*3+row,phase=hash(gx,gz,218)*2*Math.PI
       const cx=(gx+.24+.52*hash(gx,gz,201))*spacing,cz=(gz+.24+.52*hash(gx,gz,202))*spacing
       const water=-ground(cx,cz)
       if(water<1.5)continue
       const band=((gx+gz*2)%3+3)%3,depth=Math.max(1.05,water*[.24,.56,.86][band]-.15)
       const count=3+Math.floor(hash(gx,gz,203)*3)
       for(let j=0;j<count;j++){
         const a=phase+j*2.39996,r=j===0?0:.8+.95*hash(gx,gz,240+j)
         const px=cx+Math.cos(a)*r,pz=cz+Math.sin(a)*r
         prey([gx,gz,type,j].join('/'),px,pz,phase+j*.62,depth+(j%3-1)*.21,phase,hash(gx,gz,204)<.38?'shiner':'minnow')
       }
     }
   }else{
     for(let i=0;i<(type==='microbe'?26:17);i++){
       let px=(x+hash(x,z,130+i))*SIZE,pz=(z+hash(x,z,150+i))*SIZE
       if(x===0&&z===0&&i<3){px=[.13,.42,-.34][i];pz=[35.48,34.2,32.9][i]}
       prey([x,z,type,i].join('/'),px,pz,hash(x,z,110+i)*6.28,2.4)
     }
   }
   for(let k=0;k<2;k++){
     if(hash(x,z,43+k*20)<(k?.46:.22))continue
     const px=(x+.14+.72*hash(x,z,310+k))*SIZE,pz=(z+.14+.72*hash(x,z,320+k))*SIZE
     const water=ground(px,pz)<0,kind=water?(k?'pike':'hunter'):(k?'mantis':hash(x,z,333)>.48?'ape':'mite')
     if(!fits(kind,px,pz)||Math.hypot(px,pz-36)<11)continue
     const depth=water?Math.max(1.4,-ground(px,pz)*(k?.78:.44)):0
     const id=[x,z,'predator',k].join('/'),hp={ape:7,pike:5,hunter:6,mantis:4,mite:3}[kind]
     enemies.push({id,predator:true,live:!removed.has(id),hp,maxHP:hp,type:kind,x:px,z:pz,homeX:px,homeZ:pz,y:levelFor(kind,px,pz,depth),angle:0,depth})
   }
   const biome=biomeAt((x+.5)*SIZE,(z+.5)*SIZE)
   if(hash(x,z,89)>.78)landmarks.push({x:(x+.57)*SIZE,z:(z+.21)*SIZE,type:biome.name})
   function solid(px,pz,r,base,top){solids.push({x:px,z:pz,r,base,top})}
   for(const p of props){const b=ground(p.x,p.z),s=p.s
     if(p.n===7){solid(p.x,p.z,.70*s,b,b+.45*s)}
     else if(p.n===8){solid(p.x,p.z,.60*s,b,b+1.60*s)}
     else if(p.n===0){solid(p.x,p.z,.96*s,b,b+1.25*s);const a=p.x*3.71+p.z;solid(p.x+.68*s*Math.cos(a),p.z-.68*s*Math.sin(a),.53*s,b,b+.71*s)}
     else if(Math.abs(b)<.9&&p.n>1)continue
     else if(b<0&&p.n>=4)solid(p.x,p.z,.72*s,b,b+1.85*s)
     else if(b>=0&&p.n<4){solid(p.x,p.z,.27*s,b,b+2.15*s);solid(p.x,p.z,.83*s,b+1.34*s,b+2.15*s)}
   }
   for(const mark of landmarks){const b=ground(mark.x,mark.z)
    if(b<0){
     const yaw=mark.z;for(let j=-3;j<=3;j++){const side=j*1.05;solid(mark.x+side*Math.cos(yaw),mark.z-side*Math.sin(yaw),.65,b+(j?Math.abs(j)*.56:0),b+7.15-Math.abs(j)*.46)}
    }else solid(mark.x,mark.z,.82,b,b+7.2)}
   return {props,items,enemies,landmarks,solids}
 }
 world.stream=(px,pz,type)=>{
   const x=Math.floor(px/SIZE),z=Math.floor(pz/SIZE),key=[x,z,type].join('/')
   if(key===lastKey)return;lastKey=key
   const needed=new Set(),lists={props:[],items:[],enemies:[],landmarks:[],solids:[]}
   for(let a=x-2;a<=x+2;a++)for(let b=z-2;b<=z+2;b++){
     const k=[a,b,type].join('/');needed.add(k)
     if(!cache.has(k))cache.set(k,build(a,b,type))
     const chunk=cache.get(k);for(const field of Object.keys(lists))lists[field].push(...chunk[field])
   }
   for(const k of cache.keys())if(!needed.has(k))cache.delete(k)
   function trunk(x,z,r,h){const b=ground(x,z);lists.solids.push({x,z,r,base:b,top:b+h})}
   for(const side of [-1,1]){
    trunk(side*9.6,-80-side*1.2,2.05,7)
    const base=ground(0,-80);lists.solids.push({x:side*6.7,z:-80,r:2,base:base+7,top:base+15})
   }
   lists.solids.push({x:0,z:-80,r:3.9,base:ground(0,-80)+14,top:ground(0,-80)+18})
   for(let i=0;i<32;i++)trunk(-145+i*9,-107+Math.sin(i*.7)*8,1.35,15)
   for(const actor of [...lists.items,...lists.enemies]){
     const s=scaleOf(actor.type),depth=actor.depth??(actor.type==='hunter'?3.3:2.4)
     const clear=(x,z)=>!blocked(x,z,levelFor(actor.type,x,z,depth),.6*s,1.65*s,lists.solids)
     if(resolveHabitat(actor,actor.type,clear)){actor.homeX=actor.x;actor.homeZ=actor.z;actor.y=levelFor(actor.type,actor.x,actor.z,depth)}
   }
   Object.assign(world,lists)
 }
 world.kill=a=>{removed.add(a.id);a.live=false}
 world.consumed=()=>Array.from(removed)
 return world
}
