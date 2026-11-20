import * as T from 'three'
import {minnow,shiner} from '../dist/assets/fauna/manifest.json'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js'
import {ground,scaleOf,bodySize} from './physics.js'
import {makeGround,makeWater} from './materials.js'
import {propFor,propHeight,nurseryBeds,feedingPose} from './scenery.js'
import {createGroveLandmark} from './grove3d.js'
import {predatorPose,playerPose} from './combat.js'
const faunaNames=['amoeba','microbe','lantern','minnow','shiner','hunter']
const propNames=['rock','coral','kelp','reed','mushroom','tree','shell','sponge']
const library=new Map(),loader=new GLTFLoader()
let loaded=0
let scales=null
const fishSkins=new Set(['fish','lungfish','cleaner','minnow','shiner','pike','hunter'])
function fishSurface(mesh){
 if(!scales){
  const loader=new T.TextureLoader(),tile=name=>{const tex=loader.load('assets/fauna/scales-'+name+'.webp');tex.wrapS=tex.wrapT=T.RepeatWrapping;return tex}
  scales={map:tile('color'),normal:tile('normal')};scales.map.colorSpace=T.SRGBColorSpace
 }
 const g=mesh.geometry,positions=g.attributes.position,uv=new Float32Array(positions.count*2)
 g.computeBoundingBox();const center=g.boundingBox.getCenter(new T.Vector3())
 for(let i=0;i<positions.count;i++){uv[2*i]=positions.getZ(i)*1.42;uv[2*i+1]=Math.atan2(positions.getX(i)-center.x,positions.getY(i)-center.y)*.54}
 g.setAttribute('uv',new T.BufferAttribute(uv,2))
 const coat=new T.MeshPhysicalMaterial();T.MeshStandardMaterial.prototype.copy.call(coat,mesh.material)
 coat.map=scales.map;coat.normalMap=scales.normal;coat.normalScale.set(.48,.48);coat.roughness=.43;coat.clearcoat=.24;coat.clearcoatRoughness=.34;mesh.material=coat
}
function fetchModel(dir,key){
 const id=dir+'/'+key
 if(library.has(id))return
 library.set(id,null)
 loader.load('assets/'+id+'.glb',gltf=>{
  const root=gltf.scene
  root.updateMatrixWorld(true)
  const bounds=new T.Box3().setFromObject(root)
  const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3())
  const parts=[];root.traverse(o=>{
    if(!o.isMesh)return
    if(dir==='fauna'&&fishSkins.has(key)&&o.name==='body')fishSurface(o)
    if(dir==='fauna'&&/membrane|cilia|fin|wing/i.test(o.name)){
     const original=o.material,coat=new T.MeshPhysicalMaterial();T.MeshStandardMaterial.prototype.copy.call(coat,original)
     coat.clearcoat=/membrane/i.test(o.name)?.58:.27;coat.clearcoatRoughness=.25;coat.iridescence=.18;coat.iridescenceIOR=1.22;o.material=coat
    }
    o.castShadow=true;o.receiveShadow=true
    parts.push({geom:o.geometry,mat:o.material,matrix:o.matrixWorld.clone()})
  })
  library.set(id,{root,parts,size,center,minY:bounds.min.y,animations:gltf.animations})
  loaded++
 },undefined,()=>setTimeout(()=>library.delete(id),3500))
}
function skyDome(){
 const loader=new T.TextureLoader(),lagoon=loader.load('assets/lagoon-depths.webp'),forest=loader.load('assets/canopy-horizon.webp')
 for(const tex of [lagoon,forest])tex.wrapS=T.MirroredRepeatWrapping
 const mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{wet:{value:1},clock:{value:0},lagoon:{value:lagoon},forest:{value:forest}},vertexShader:`
 varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
 `,fragmentShader:`
 varying vec3 ray;uniform float wet,clock;uniform sampler2D lagoon,forest;
 void main(){vec3 r=normalize(ray),s=normalize(vec3(-.4,.72,-.55));float h=clamp(r.y,0.,1.);
 vec3 day=mix(vec3(.73,.77,.69),vec3(.17,.32,.38),pow(h,.56));
 float sun=max(dot(r,s),0.);day+=vec3(.35,.27,.12)*pow(sun,25.)+vec3(.46,.39,.22)*smoothstep(.996,.999,sun);
 vec3 water=mix(vec3(.035,.19,.23),vec3(.35,.69,.65),smoothstep(-.4,1.,r.y));
 water+=vec3(.17,.22,.16)*pow(sun,9.)*(.7+.3*sin(r.x*37.+sin(r.z*29.+clock*.26)));
 vec2 uv=vec2(.5+atan(r.x,-r.z)/1.62,clamp(.49+asin(r.y)*.97,0.005,.995));
 vec3 plate=mix(texture2D(forest,uv).rgb,texture2D(lagoon,uv).rgb,wet);
 gl_FragColor=vec4(mix(mix(day,water,wet),plate,.87),1.);}`})
 const obj=new T.Mesh(new T.SphereGeometry(145,28,16),mat);obj.renderOrder=-2
 return obj
}
export function bootGPU(container){
 const canvas=document.createElement('canvas')
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'})
 if(!gl)return null
 const renderer=new T.WebGLRenderer({canvas,context:gl,alpha:false,antialias:true})
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.65))
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap
 renderer.setSize(innerWidth,innerHeight);canvas.style.visibility='hidden';canvas.style.zIndex='0';container.append(canvas)
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(57,innerWidth/innerHeight,.025,155)
 scene.fog=new T.FogExp2(0x24525a,.036)
 const envGen=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),target=envGen.fromScene(room,.03)
 scene.environment=target.texture;scene.environmentIntensity=.55;room.dispose();envGen.dispose()
 const sky=skyDome(),earth=makeGround(),water=makeWater()
 scene.add(sky,earth.obj,water.obj)
 const hemi=new T.HemisphereLight(0xbfede7,0x29423a,1.35)
 const sun=new T.DirectionalLight(0xffe1ac,3.15);sun.castShadow=true
 sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,far:72});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.camera.updateProjectionMatrix()
 scene.add(hemi,sun,sun.target)
 const rim=new T.DirectionalLight(0x95e4ee,1.45);rim.position.set(8,7,-11);scene.add(rim)
 const particles=new Float32Array(300*3)
 for(let k=0;k<particles.length;k++)particles[k]=(Math.sin(k*37.021+1)*12345%1)*11
 const cloudGeo=new T.BufferGeometry();cloudGeo.setAttribute('position',new T.BufferAttribute(particles,3))
 const cloud=new T.Points(cloudGeo,new T.PointsMaterial({size:.027,color:0xc4e6d4,transparent:true,opacity:.48,depthWrite:false}));scene.add(cloud)
 for(const name of propNames)fetchModel('habitat',name)
 for(const name of faunaNames)fetchModel('fauna',name)
 const props=new T.Group();scene.add(props);let lastTiles=null,lastPatch='',lastLoaded=-1
 const matrix=new T.Matrix4(),dummy=new T.Object3D()
 function clearProps(){while(props.children.length){const child=props.children[0];props.remove(child);child.dispose()}}
 function buildProps(g,under){
  clearProps()
  const sets=new Map()
  function add(name,x,y,z,size,angle=0){
   const model=library.get('habitat/'+name);if(!model)return
   const heightFactor=size/Math.max(.01,model.size.y)
   dummy.position.set(x,y-model.minY*heightFactor,z);dummy.rotation.set(0,angle,0);dummy.scale.setScalar(heightFactor);dummy.updateMatrix()
   if(!sets.has(name))sets.set(name,[])
   sets.get(name).push(dummy.matrix.clone())
  }
  for(const p of [...g.world.props,...nurseryBeds]){
    if(Math.hypot(p.x-g.hero.x,p.z-g.hero.z)>53)continue
    if(under&&ground(p.x,p.z)>.15)continue
    const name=propFor(p)
    add(name,p.x,ground(p.x,p.z),p.z,propHeight(p,name),p.x*3.71+p.z)
  }
  for(const p of g.world.landmarks){if((!under||ground(p.x,p.z)<0)&&Math.hypot(p.x-g.hero.x,p.z-g.hero.z)<78)add(ground(p.x,p.z)<0?'coral':'tree',p.x,ground(p.x,p.z),p.z,7.2,p.z)}
  for(let i=0;i<32;i++){const x=-145+i*9,z=-107+Math.sin(i*.7)*8;if(!under&&Math.hypot(x-g.hero.x,z-g.hero.z)<87)add('tree',x,ground(x,z),z,13+i%3,i)}

  for(const [key,transforms] of sets){const model=library.get('habitat/'+key)
    for(const part of model.parts){
     const instances=new T.InstancedMesh(part.geom,part.mat,transforms.length);instances.castShadow=true;instances.receiveShadow=true
     transforms.forEach((m,i)=>instances.setMatrixAt(i,matrix.multiplyMatrices(m,part.matrix)));instances.instanceMatrix.needsUpdate=true;instances.computeBoundingSphere();props.add(instances)
    }
  }
 }
 const story=createGroveLandmark(scene)
 const stamp=document.createElement('canvas');stamp.width=stamp.height=64;const sc=stamp.getContext('2d'),gr=sc.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(12,20,15,.62)');gr.addColorStop(.54,'rgba(12,20,15,.29)');gr.addColorStop(1,'rgba(12,20,15,0)');sc.fillStyle=gr;sc.fillRect(0,0,64,64)
 const stampMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(stamp),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})
 const contactPatches=new T.InstancedMesh(new T.PlaneGeometry(1,1),stampMat,400);contactPatches.frustumCulled=false;scene.add(contactPatches)
 const shadePose=new T.Object3D();let patchCount=0
 function contact(x,z,size){
  if(patchCount>=400)return
  const h=ground(x,z),sx=(ground(x+.1,z)-h)*10,sz=(ground(x,z+.1)-h)*10
  shadePose.position.set(x,h+.045,z);shadePose.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(-sx,1,-sz).normalize());shadePose.scale.set(size,size*.8,1);shadePose.updateMatrix();contactPatches.setMatrixAt(patchCount++,shadePose.matrix)
 }
 const residents=new Map()
 let serial=0,visible=false
 function actor(id,name,x,y,z,size,angle,t,pose={}){
  fetchModel('fauna',name)
  let template=library.get('fauna/'+name)
  if(!template)return
  let resident=residents.get(id)
  if(!resident||resident.template!==template){
   if(resident)scene.remove(resident.node)
   const node=template.root.clone(true),parts=[]
   node.traverse(o=>{if(/wing|fin|tail|^arm_|^leg_|^palp_|jaw|vine|tendril/i.test(o.name))parts.push({o,base:o.rotation.clone()})})
   const mixer=template.animations.length?new T.AnimationMixer(node):null
   if(mixer)for(const clip of template.animations)mixer.clipAction(clip).play()
   resident={node,template,parts,mixer};residents.set(id,resident);scene.add(node)
  }
  const {node,parts,mixer}=resident
  resident.frame=serial;node.visible=true
  node.position.set(x,y+(Math.sin(t*2.3)*.025+(pose.lift||0))*size,z)
  node.rotation.order='YXZ';node.rotation.set(pose.pitch||0,angle,pose.roll||0,'YXZ')
  node.scale.set(size*(pose.wide||1),size/(Math.sqrt(pose.stretch||1)),size*(pose.stretch||1))
  if(mixer)mixer.setTime(t)
  for(const {o,base} of parts){
   const key=o.name,side=/-1|left/i.test(key)?-1:1
   o.rotation.copy(base)
   if(/jaw/i.test(key))o.rotation.x+=pose.jaw||0
   else if(/^arm_/.test(key)){o.rotation.x-=(side>0?(pose.arm||0):(pose.offArm??pose.arm??0));o.rotation.z+=side*(pose.spread||0)}
   else if(/^leg_|^palp_/.test(key)){o.rotation.z+=side*(pose.legs||0)}
   else if(/tail|vine|tendril/i.test(key))o.rotation.y+=Math.sin(t*6)*.13+(pose.bend||0)
   else o.rotation.z+=side*(Math.sin(t*(name==='bee'?16:4))*.13+(pose.wing||0))
  }
 }
 // Use the same eight baked views for distant shoals; close fish retain their animated meshes.
 const shoalMeta={minnow,shiner},schoolMaterials=new Map()
 function distantFish(a,c,t){
  const meta=shoalMeta[a.type]
  let frames=schoolMaterials.get(a.type)
  if(!frames){
   const sheet=new T.TextureLoader().load('assets/fauna/'+a.type+'.webp',()=>{for(const material of frames)material.map.needsUpdate=true})
   sheet.colorSpace=T.SRGBColorSpace
   frames=Array.from({length:8},(_,i)=>{
    const map=sheet.clone();map.repeat.set(.25,.5);map.offset.set((i%4)*.25,i<4?.5:0)
    return new T.SpriteMaterial({map,transparent:true,depthWrite:false,alphaTest:.09,toneMapped:false})
   })
   // Cloned frames share the image source and need their own UV transforms.
   schoolMaterials.set(a.type,frames)
  }
  const angle=a.angle-Math.atan2(c.x-a.x,c.z-a.z),view=((Math.round(angle*4/Math.PI)%8)+8)%8
  let r=residents.get(a.id)
  if(!r||r.template!==frames){if(r)scene.remove(r.node);const node=new T.Sprite(frames[view]);r={node,template:frames};residents.set(a.id,r);scene.add(node)}
  r.frame=serial;r.node.material=frames[view];r.node.position.set(a.x,a.y+scaleOf(a.type)*meta.centerY+.02*Math.sin(t+a.seed),a.z)
  r.node.scale.setScalar(meta.span*scaleOf(a.type))
 }
 window.addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)})
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();canvas.style.visibility='hidden';visible=false})
 return function draw(g,c,t){
  fetchModel('fauna',g.hero.form)
  const prey=g.guide?.type
  if(prey)fetchModel('fauna',prey)
  if(renderer.getContext().isContextLost()||!library.get('fauna/'+g.hero.form)||(prey&&!library.get('fauna/'+prey))){if(visible){canvas.style.visibility='hidden';visible=false}return false}
  serial++;cam.position.set(c.x,c.y,c.z)
  cam.rotation.order='YXZ';cam.rotation.y=-c.yaw;cam.rotation.x=-c.tilt
  const matchedFOV=2*Math.atan(innerHeight/(2*Math.min(innerHeight*.99,innerWidth*1.12)))*180/Math.PI
  if(Math.abs(matchedFOV-cam.fov)>.01){cam.fov=matchedFOV;cam.updateProjectionMatrix()}
  const under=c.y<0,patch=Number(under)+'/'+Math.floor(g.hero.x/10)+','+Math.floor(g.hero.z/10)
  if(g.world.props!==lastTiles||patch!==lastPatch||loaded!==lastLoaded){buildProps(g,under);lastTiles=g.world.props;lastPatch=patch;lastLoaded=loaded}
  scene.fog.color.set(under?0x205960:0x899b98);scene.fog.density=under?.034:.013
  sky.position.copy(cam.position);sky.material.uniforms.wet.value=under?1:0;sky.material.uniforms.clock.value=t
  earth.update(c.x,c.z,t,under);water.update(c.x,c.z,t);cloud.position.copy(cam.position);cloud.rotation.y=t*.009;cloud.visible=under
  sun.position.set(g.hero.x-13,g.hero.y+23,g.hero.z+12);sun.target.position.set(g.hero.x,g.hero.y,g.hero.z)
  hemi.intensity=under?1.65:1.28;sun.intensity=under?2.15:3.15
  patchCount=0
  for(const p of g.world.props){if(Math.abs(p.x-c.x)>15||Math.abs(p.z-c.z)>15)continue;const name=propFor(p);contact(p.x,p.z,propHeight(p,name)*(name==='rock'?1.95:.56))}
  for(const a of [g.hero,g.partner,...g.items]){if(a.live===false||Math.hypot(a.x-c.x,a.z-c.z)>15)continue;const lift=a.y-ground(a.x,a.z);if(lift<2.8)contact(a.x,a.z,bodySize(a)*(2.6+lift*.14))}
  contactPatches.count=patchCount;contactPatches.instanceMatrix.needsUpdate=true
  if(!g.firstPerson)actor('player',g.hero.form,g.hero.x,g.hero.y,g.hero.z,bodySize(g.hero),g.hero.angle,t,playerPose(g,t))
  const r=g.partner;if(Math.hypot(r.x-c.x,r.z-c.z)<40)actor('scout','lantern',r.x,r.y,r.z,scaleOf(r.form),r.angle,t)
  for(const a of g.items){
   if(!a.live)continue
   const distance=Math.hypot(a.x-c.x,a.z-c.z)
   if(distance>=(under?38:42))continue
   if(shoalMeta[a.type]&&distance>19)distantFish(a,c,t)
   else actor(a.id,a.type,a.x,a.y,a.z,scaleOf(a.type),a.angle,t+a.seed,{roll:a.hit>0?Math.sin(a.hit*22)*.25:0})
  }
  for(const a of g.enemies)if(a.live&&Math.hypot(a.x-c.x,a.z-c.z)<42)actor(a.id,a.type,a.x,a.y,a.z,scaleOf(a.type),a.angle,t,predatorPose(a))
  const meal=feedingPose(g,t)
  if(meal)actor('meal',meal.type,meal.x,meal.y,meal.z,scaleOf(meal.type)*meal.scale,meal.angle,t,meal.pose)
  for(const [id,r] of residents)if(r.frame!==serial){scene.remove(r.node);residents.delete(id)}
  story(g.fallen,t);renderer.render(scene,cam)
  if(!visible){canvas.style.visibility='visible';visible=true}return true
 }
}
