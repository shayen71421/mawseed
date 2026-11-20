// Distances use the same world units as movement, combat, habitat art and the map.
export const LIMIT=155
export const habitats=[
 {name:'Primordial lagoon',x:0,z:42,tint:'#348993',accent:'#77ede4'},
 {name:'Glassfin reef',x:82,z:85,tint:'#477ea3',accent:'#f8a59f'},
 {name:'Silkwood hollow',x:-77,z:5,tint:'#716389',accent:'#b5a2ff'},
 {name:'Amber meadow',x:85,z:-40,tint:'#949755',accent:'#ffd07d'},
 {name:'Seedfall grove',x:0,z:-88,tint:'#58795a',accent:'#bdd87c'},
 {name:'Spore marsh',x:-87,z:102,tint:'#487a70',accent:'#a6f0ba'}
]
export function habitat(x,z){let best=habitats[0],distance=Infinity;for(const h of habitats){let d=(h.x-x)**2+(h.z-z)**2;if(d<distance){best=h;distance=d}}return best}
export const forms={
 amoeba:{name:'Amoeba',prey:'microbe',quota:8,action:'Engulf'},
 colony:{name:'Cell colony',prey:'microbe',quota:12,action:'Engulf'},
 fish:{name:'Glassfin',prey:'minnow',quota:14,action:'Bite'},
 lungfish:{name:'Lungfish',prey:'minnow',quota:14,action:'Snap'},
 spider:{name:'Silk hunter',prey:'moth',quota:10,action:'Cast web'},
 bird:{name:'Canopy bird',prey:'moth',quota:12,action:'Talon dive'},
 ape:{name:'Toolmaker',prey:'mite',quota:12,action:'Strike'},
 bee:{name:'Pollinator',prey:'mite',quota:10,action:'Drop sting'},
 cleaner:{name:'Cleaner fish',prey:'leech',quota:12,action:'Pluck'},
 worm:{name:'Earthworm',prey:'leech',quota:10,action:'Pinch'},
 snail:{name:'Shell grazer',prey:'mite',quota:12,action:'Crush'},
 sapling:{name:'Rooted shoot',prey:'blight',quota:12,action:'Root lash'},
 human:{name:'Human',prey:'mite',quota:0,action:'Handaxe'},
 tree:{name:'Fruit tree',prey:'blight',quota:16,action:'Vine lash'}
}
export const species={
 microbe:{label:'Drifter',name:'drifter cells',color:'#c9f68a',hp:1,speed:1.8},
 shiner:{label:'Silver shiner',name:'silver shiners',color:'#c6dede',hp:2,speed:3.6},
 minnow:{label:'Glass minnow',name:'shoal fish',color:'#ffb585',hp:3,speed:3.1},
 moth:{label:'Lantern moth',name:'lantern moths',color:'#ffe098',hp:2,speed:2.7},
 mite:{label:'Red mite',name:'red mites',color:'#fa9279',hp:2,speed:3.4},
 leech:{label:'Marsh leech',name:'marsh leeches',color:'#c4a1e8',hp:2,speed:2.5},
 blight:{label:'Blight spore',name:'blight spores',color:'#f39aab',hp:3,speed:1.9}
}
export const traits=[
 {id:'bite',branch:'Predation',name:'Serrated bite',desc:'+1 damage per strike'},
 {id:'reach',branch:'Predation',name:'Lunging strike',desc:'Extend strike range by 40%',parent:'bite'},
 {id:'swim',branch:'Motion',name:'Streamlined body',desc:'Move 25% faster'},
 {id:'reflex',branch:'Motion',name:'Quick reflex',desc:'Strike again 35% sooner',parent:'swim'},
 {id:'shell',branch:'Survival',name:'Tough membrane',desc:'Gain one heart immediately'},
 {id:'heal',branch:'Survival',name:'Regeneration',desc:'Recover one heart after each kill',parent:'shell'}
]
export function moveToward(actor,x,z,speed,dt){const dx=x-actor.x,dz=z-actor.z,d=Math.hypot(dx,dz);if(d<.05)return d;const step=Math.min(d,dt*speed);actor.x+=dx/d*step;actor.z+=dz/d*step;actor.angle=Math.atan2(dx,dz);return d}
