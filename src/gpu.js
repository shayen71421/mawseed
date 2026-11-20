import * as T from 'three'
import habitatMeta from '../dist/assets/habitat/habitat.json'
import {minnow,shiner,human as humanMeta} from '../dist/assets/fauna/manifest.json'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js'
import {ground,scaleOf,bodySize} from './physics.js'
import {makeGround,makeWater} from './materials.js'
import {propFor,propHeight,propYaw,viewDistance,nurseryBeds,feedingPose} from './scenery.js'
import {createGroveLandmark} from './grove3d.js'
import {predatorPose,playerPose} from './combat.js'
const faunaNames=['amoeba','microbe','lantern','minnow','shiner','hunter']
const propNames=['rock','coral','kelp','reed','mushroom','tree','shell','sponge','rainwood','youngtree','fern','tidegarden']
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
 const mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{wet:{value:1},clock:{value:0}},vertexShader:`
 varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
 `,fragmentShader:`
 varying vec3 ray;uniform float wet,clock;
 float hash(vec2 p){return fract(sin(dot(p,vec2(27.1,53.7)))*4375.27);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){vec3 r=normalize(ray),sunDir=normalize(vec3(-.46,.82,.34));float altitude=max(r.y,0.);
 float sun=max(dot(r,sunDir),0.);
 vec3 sky=mix(vec3(.54,.65,.63),vec3(.185,.385,.51),pow(altitude,.59));
 vec2 c=r.xz/(altitude+.12)+clock*.0005;
 float cloud=noise(c*2.1)*.53+noise(c*4.18)*.28+noise(c*9.2)*.14;
 sky=mix(sky,vec3(.83,.84,.77),smoothstep(.52,.78,cloud)*smoothstep(.01,.2,altitude)*.65);
 sky+=vec3(.30,.22,.11)*pow(sun,11.)+vec3(.5,.46,.32)*smoothstep(.998,.9999,sun);
 vec3 deep=mix(vec3(.069,.269,.285),vec3(.49,.76,.70),pow(altitude,1.25));
 gl_FragColor=vec4(mix(sky,deep,wet*(1.-smoothstep(-.06,.16,r.y))),1.);}`})
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
 const sky=skyDome(),earth=makeGround(),water=makeWater(renderer)
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
 const treeCards=new Map(),distantGeometry=new T.PlaneGeometry(1,1)
 const textureLoader=new T.TextureLoader()
 for(const name of ['rainwood','youngtree']){
  const tex=textureLoader.load('assets/habitat/'+name+'.webp');tex.colorSpace=T.SRGBColorSpace
  const m=new T.MeshBasicMaterial({map:tex,alphaTest:.38,side:T.DoubleSide,color:0xd9e4d6})
  m.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
    vec4 worldBase=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
    float span=length(instanceMatrix[0].xyz);
    vec4 mvPosition=viewMatrix*worldBase;
    mvPosition.xy+=position.xy*span;
    gl_Position=projectionMatrix*mvPosition;`)
  }
  treeCards.set(name,m)
 }
 function buildProps(g,under){
  clearProps()
  const sets=new Map(),distantSets=new Map()
  function addDistant(name,p){
   const meta=habitatMeta[name];if(!meta)return
   const span=propHeight(p,name)*meta.size/meta.height
   if(!distantSets.has(name))distantSets.set(name,[])
   distantSets.get(name).push([p.x,ground(p.x,p.z)+(meta.anchor[1]-.5)*span,p.z,span])
  }
  function add(name,x,y,z,size,angle=0){
   const model=library.get('habitat/'+name);if(!model)return
   const heightFactor=size/Math.max(.01,model.size.y)
   dummy.position.set(x,y-model.minY*heightFactor,z);dummy.rotation.set(0,angle,0);dummy.scale.setScalar(heightFactor);dummy.updateMatrix()
   if(!sets.has(name))sets.set(name,[])
   sets.get(name).push(dummy.matrix.clone())
  }
  for(const p of [...g.world.props,...nurseryBeds]){
    const name=propFor(p),dist=Math.hypot(p.x-g.hero.x,p.z-g.hero.z)
    if(dist>viewDistance(name))continue
    if((name==='rainwood'||name==='youngtree')&&dist>42){addDistant(name,p,dist);continue}
    if(under&&ground(p.x,p.z)>.15&&dist>34)continue
    add(name,p.x,ground(p.x,p.z),p.z,propHeight(p,name),propYaw(p))
  }
  for(const p of g.world.landmarks){
   if(Math.hypot(p.x-g.hero.x,p.z-g.hero.z)>77)continue
   const h=ground(p.x,p.z)
   if(h<0)add('coral',p.x,h,p.z,7.2,p.z)
   else if(!under)add('rainwood',p.x,h,p.z,12.84,p.z)
  }
  for(const [name,entries] of distantSets){
   const batch=new T.InstancedMesh(distantGeometry,treeCards.get(name),entries.length)
   entries.forEach(([x,y,z,w],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(w);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix)})
   batch.instanceMatrix.needsUpdate=true;batch.frustumCulled=false;props.add(batch)
  }

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
   node.traverse(o=>{if((name==='human'&&/^(spine|head|pelvis|shin_|forearm_|hand_)/.test(o.name))||/wing|fin|tail|^arm_|^leg_|^palp_|^grip_|^hallux_|^foot_|^abdomen$|jaw|vine|tendril/i.test(o.name))parts.push({o,base:o.rotation.clone()})})
   const mixer=template.animations.length?new T.AnimationMixer(node):null
   if(mixer)for(const clip of template.animations)mixer.clipAction(clip).play()
   resident={node,template,parts,mixer};residents.set(id,resident);scene.add(node)
  }
  const {node,parts,mixer}=resident
  const moved=resident.lastX===undefined?0:Math.min(.7,Math.hypot(x-resident.lastX,z-resident.lastZ))
  resident.stride=(resident.stride||0)+moved*3.65/size
  resident.walk=(resident.walk||0)*.76+Math.min(1,moved/Math.max(.001,size*.035))*.24
  resident.lastX=x;resident.lastZ=z
  const step=name==='ape'?resident.walk*Math.sin(resident.stride):0
  resident.frame=serial;node.visible=true
  node.position.set(x,y+(Math.sin(t*2.3)*.025+(pose.lift||0))*size,z)
  node.rotation.order='YXZ';node.rotation.set((pose.pitch||0)+Math.abs(step)*.045,angle,(pose.roll||0)+step*.045,'YXZ')
  node.scale.set(size*(pose.wide||1),size/(Math.sqrt(pose.stretch||1)),size*(pose.stretch||1))
  if(name==='human'&&pose.from){
   const mix=pose.mix??0
   const baseY=humanMeta.poseGround[pose.from]||0,endY=humanMeta.poseGround[pose.to]||0
   node.position.y+=size*(baseY+(endY-baseY)*mix)
  }
  if(mixer)mixer.setTime(t)
  for(const {o,base} of parts){
   const key=o.name,side=/-1|left/i.test(key)?-1:1
   o.rotation.copy(base)
   if(name==='human'&&pose.from){
    const a=humanMeta.jointPoses[pose.from]?.[key],b=humanMeta.jointPoses[pose.to]?.[key],u=pose.mix??0
    o.rotation.x+=(a?.[0]||0)*(1-u)+(b?.[0]||0)*u
    o.rotation.y+=(a?.[1]||0)*(1-u)+(b?.[1]||0)*u
    o.rotation.z+=(a?.[2]||0)*(1-u)+(b?.[2]||0)*u
   }else if(name==='human'&&!/^arm_/.test(key))continue
   else if(/jaw/i.test(key))o.rotation.x+=pose.jaw||0
   else if(/^arm_/.test(key)){o.rotation.x-=(side>0?(pose.arm||0):(pose.offArm??pose.arm??0));o.rotation.z+=side*(pose.spread||0);if(!pose.arm)o.rotation.x+=step*.44*side}
   else if(key==='abdomen')o.rotation.x+=pose.abdomen||0
   else if(/^wingtip_/.test(key))o.rotation.y+=side*(pose.tip||0)
   else if(/^foot_/.test(key))o.rotation.x+=.34*(pose.foot||0)
   else if(/^grip_/.test(key))o.rotation.x+=.88*(pose.grip||0)
   else if(/^hallux_/.test(key))o.rotation.x-=.76*(pose.grip||0)
   else if(/^leg_/.test(key)&&name==='bird')o.rotation.x-=1.12*(pose.foot||0)
   else if(/^leg_|^palp_/.test(key)){o.rotation.z+=side*(pose.legs||0);o.rotation.x-=step*.62*side}
   else if(/tail|vine|tendril/i.test(key))o.rotation.y+=Math.sin(t*6)*.13+(pose.bend||0)
   else o.rotation.z+=side*(Math.sin(t*(name==='bee'?30:name==='bird'?6:4))*(name==='bee'?.48:name==='bird'?(pose.tip>.6?.035:.28):.13)+(pose.wing||0))
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
  scene.fog.color.set(under?0x184a4d:0x9aaba1);scene.fog.density=under?.040:.017
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
  story(g.fallen,t);water.capture(renderer,scene,cam,t);renderer.render(scene,cam)
  if(!visible){canvas.style.visibility='visible';visible=true}return true
 }
}
