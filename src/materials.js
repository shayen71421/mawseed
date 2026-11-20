import * as T from 'three'
import {ground} from './physics.js'

const ROOT='assets/habitat/'
export function terrainMaterial(){
 const loader=new T.TextureLoader()
 const uniforms=T.UniformsUtils.clone(T.UniformsLib.lights)
 uniforms.clock={value:0}
 uniforms.drowned={value:1}
 function tile(name,color){
  const texture=loader.load(ROOT+name+'.webp')
  texture.wrapS=texture.wrapT=T.RepeatWrapping
  texture.anisotropy=6
  if(color)texture.colorSpace=T.SRGBColorSpace
  return texture
 }
 for(const name of ['bed','shore','moss']){
  uniforms[name]={value:tile(name+'-color',true)}
  uniforms[name+'N']={value:tile(name+'-normal',false)}
 }
 return new T.ShaderMaterial({uniforms,lights:true,vertexShader:`
 #include <common>
 #include <shadowmap_pars_vertex>
 varying vec3 point;
 varying vec3 terrainNormal;
 void main(){
  vec4 worldPosition=modelMatrix*vec4(position,1.);
  vec4 mvPosition=viewMatrix*worldPosition;
  vec3 transformedNormal=normalMatrix*normal;
  point=worldPosition.xyz;
  terrainNormal=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*mvPosition;
  #include <shadowmap_vertex>
 }`,fragmentShader:`
 #include <common>
 #include <bsdfs>
 #include <lights_pars_begin>
 #include <shadowmap_pars_fragment>
 #include <shadowmask_pars_fragment>
 uniform sampler2D bed,shore,moss,bedN,shoreN,mossN;
 uniform float clock,drowned;
 varying vec3 point;
 varying vec3 terrainNormal;

 float hash2(vec2 p){
  vec3 t=fract(vec3(p.xyx)*vec3(.1031,.11369,.13787));
  t+=dot(t,t.yzx+19.19);
  return fract((t.x+t.y)*t.z);
 }
 float field(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+1.),f.x),f.y);
 }
 // Offset and rotate successive patches of the same material without a repeating grid.
 // Normals from the rotated UV set have to be brought back to the XZ tangent frame.
 void samples(sampler2D colorMap,sampler2D normalMap,vec2 uv,vec2 variation,out vec3 color,out vec2 detail){
  mat2 rotation=mat2(.8,.6,-.6,.8);
  vec2 duv=rotation*uv*.91+vec2(.33,.72);
  float blend=smoothstep(.31,.68,variation.x);
  color=mix(texture2D(colorMap,uv).rgb,texture2D(colorMap,duv).rgb,blend);
  vec2 n0=texture2D(normalMap,uv).rg*2.-1.;
  vec2 n1=texture2D(normalMap,duv).rg*2.-1.;
  detail=mix(n0,n1*rotation,blend);
 }
 float caustic(vec2 p,float t){
  vec2 w=p+vec2(sin(p.y*.90+t*.61),cos(p.x*.77-t*.56))*.51;
  float a=sin(w.x*3.35+w.y*.33+t*.29)+.83*cos(w.y*3.8-w.x*.38-t*.43);
  return exp(-14.*abs(a));
 }
 void main(){
  vec2 world=point.xz;
  vec2 variation=vec2(field(world*.19),field(world*.066+vec2(51.,9.)));
  vec2 warped=world+.22*vec2(field(world*.29+vec2(19.,0.)),field(world*.31-vec2(0.,7.)));
  float transition=point.y+.46*(variation.x-.5)+.61*(variation.y-.5);
  float sand=smoothstep(-1.34,-.19,transition);
  float green=smoothstep(.52,1.57,transition);
  vec3 c;vec2 d;
  if(sand<1.){
   samples(bed,bedN,warped*.29,variation,c,d);
   if(sand>.001){vec3 shoreC;vec2 shoreD;samples(shore,shoreN,warped*.32,variation,shoreC,shoreD);c=mix(c,shoreC,sand);d=mix(d,shoreD,sand);}
  }else if(green<.999){
   samples(shore,shoreN,warped*.32,variation,c,d);
   if(green>.001){vec3 mossC;vec2 mossD;samples(moss,mossN,warped*.35,variation,mossC,mossD);c=mix(c,mossC,green);d=mix(d,mossD,green);}
  }else{
   samples(moss,mossN,warped*.35,variation,c,d);
  }
  vec3 n=normalize(terrainNormal+vec3(d.x,0.,d.y)*.73);
  vec3 sun=normalize(vec3(-.49,.85,.39));
  float wrappedSun=max(.0,dot(n,sun));
  float shadow=getShadowMask();
  float lowTide=1.-smoothstep(.03,.68,abs(point.y+.12));
  float wet=1.-smoothstep(-.37,.27,point.y);
  float immersion=smoothstep(.22,6.6,-point.y);
  // Cool skylight remains inside shadows. The warm specular wash only reaches wet sand.
  vec3 lit=c*(vec3(.49,.57,.55)+vec3(.84,.74,.57)*wrappedSun*mix(.07,1.,shadow));
  lit*=mix(.85,1.15,variation.y);
  lit*=1.-.19*lowTide;
  lit*=mix(vec3(1.),mix(vec3(.72,.96,.94),vec3(.39,.76,.75),immersion),wet);
  vec3 halfway=normalize(sun+normalize(cameraPosition-point));
  lit+=vec3(.16,.16,.12)*pow(max(0.,dot(n,halfway)),36.)*lowTide*shadow;
  float focused=caustic(world*.67+point.y*.16,clock*.7)*(.5+.5*field(world*.42));
  lit+=vec3(.062,.083,.061)*focused*shadow*wet*(1.-.82*immersion);
  gl_FragColor=vec4(lit,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // Sky and water use display-space horizon colours; blend here after colour conversion.
  float travel=distance(cameraPosition,point);
  float airFog=1.-exp(-.014*travel);
  float waterFog=1.-exp(-.050*travel);
  vec3 horizon=mix(vec3(.54,.65,.63),vec3(.075,.29,.31),drowned);
  gl_FragColor.rgb=mix(gl_FragColor.rgb,horizon,mix(airFog,waterFog,drowned));
 }`})
}

export function makeGround(){
 const extent=192,steps=128
 const geometry=new T.PlaneGeometry(extent,extent,steps,steps)
 geometry.rotateX(-Math.PI/2)
 const positions=geometry.attributes.position
 // Near cells line up with the fixed physics grid. Outlying rows widen into the horizon.
 const extend=v=>v+Math.sign(v)*Math.max(0,Math.abs(v)-54)**2*.066
 for(let i=0;i<positions.count;i++)positions.setXYZ(i,extend(positions.getX(i)),0,extend(positions.getZ(i)))
 const material=terrainMaterial(),obj=new T.Mesh(geometry,material)
 obj.receiveShadow=true
 let lastX=NaN,lastZ=NaN
 function update(px,pz,t,under){
  material.uniforms.clock.value=t
  material.uniforms.drowned.value=under?1:0
  const x=Math.round(px/12)*12,z=Math.round(pz/12)*12
  if(x===lastX&&z===lastZ)return
  lastX=x;lastZ=z;obj.position.set(x,0,z)
  for(let i=0;i<positions.count;i++)positions.setY(i,ground(x+positions.getX(i),z+positions.getZ(i)))
  positions.needsUpdate=true
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
 }
 return {obj,update}
}

export function makeWater(renderer){
 const geometry=new T.PlaneGeometry(270,270,96,96);geometry.rotateX(-Math.PI/2)
 const target=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true})
 const uniforms={clock:{value:0},sceneColor:{value:target.texture},screen:{value:new T.Vector2(1,1)}}
 const mat=new T.ShaderMaterial({side:T.DoubleSide,transparent:false,depthWrite:true,uniforms,vertexShader:`
 varying vec3 wp;uniform float clock;
 void main(){wp=(modelMatrix*vec4(position,1.)).xyz;
 wp.y+=.048*sin(dot(wp.xz,vec2(.45,.68))+clock*.9)+.021*sin(wp.x*.97-wp.z*.22-clock*.71);
 gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}
 `,fragmentShader:`
 uniform float clock;uniform sampler2D sceneColor;uniform vec2 screen;varying vec3 wp;
 void main(){
 vec2 q=wp.xz;float t=clock,distanceToEye=distance(wp,cameraPosition);
 float far=1.-smoothstep(14.,74.,distanceToEye);
 vec2 slope=vec2(.45,.68)*.048*cos(dot(q,vec2(.45,.68))+t*.9)
  +vec2(.97,-.22)*.021*cos(dot(q,vec2(.97,-.22))-t*.71);
 slope+=far*(vec2(.58,.19)*.089*cos(dot(q,vec2(2.17,.76))+sin(q.y*.73+t*.51)+t*1.12)
  +vec2(-.32,.73)*.078*cos(dot(q,vec2(-.89,2.3))+t*.79+sin(q.x*.72)));
 vec3 n=normalize(vec3(-slope.x,1.,-slope.y)),view=normalize(cameraPosition-wp);
 float below=step(cameraPosition.y,0.),cosine=abs(dot(view,n));
 float fresnel=.025+.975*pow(1.-cosine,5.);
 vec2 uv=gl_FragCoord.xy/screen,offset=(mat3(viewMatrix)*vec3(n.x,0.,n.z)).xy;
 vec2 sampleUV=clamp(uv+offset*.047*far,vec2(.001),vec2(.999));
 vec3 scene=texture2D(sceneColor,sampleUV).rgb;
 vec3 sun=normalize(vec3(-.46,.82,.34));
 vec3 reflected=reflect(-view,n);
 float glint=pow(max(0.,dot(reflected,sun)),130.);
 vec3 sky=mix(vec3(.29,.40,.40),vec3(.34,.50,.59),smoothstep(0.,.82,reflected.y));
 vec3 top=mix(scene*vec3(.74,.94,.92),sky,fresnel)+glint*vec3(1.35,1.05,.63);
 float window=smoothstep(.60,.73,cosine);
 float sheen=pow(max(0.,dot(reflect(view,n),sun)),24.);
 vec3 body=vec3(.024,.15,.157);
 vec3 underside=mix(body+sheen*vec3(.20,.25,.12),scene*vec3(.76,.94,.88)+vec3(.022,.087,.08),window);
 underside+=vec3(.09,.16,.096)*far*pow(clamp((n.z+n.x)*4.+.52,0.,1.),4.)*(1.-window*.72);
 gl_FragColor=vec4(mix(top,underside,below),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`})
 const obj=new T.Mesh(geometry,mat);obj.renderOrder=1
 const resolution=new T.Vector2();let lastCapture=-1
 function capture(renderer,scene,camera,t){
  renderer.getDrawingBufferSize(resolution)
  const factor=Math.min(.62,850/resolution.x),w=Math.max(1,Math.floor(resolution.x*factor)),h=Math.max(1,Math.floor(resolution.y*factor))
  const resized=target.width!==w||target.height!==h
  if(resized)target.setSize(w,h)
  uniforms.screen.value.copy(resolution)
  if(!resized&&t-lastCapture<1/35)return
  lastCapture=t;obj.visible=false;const old=renderer.getRenderTarget(),shadowUpdates=renderer.shadowMap.autoUpdate
  try{renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(target);renderer.render(scene,camera)}
  finally{renderer.setRenderTarget(old);renderer.shadowMap.autoUpdate=shadowUpdates;obj.visible=true}
 }
 return {obj,capture,update(px,pz,t){obj.position.set(Math.round(px/10)*10,0,Math.round(pz/10)*10);uniforms.clock.value=t}}
}
