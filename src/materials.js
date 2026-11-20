import * as T from 'three'
import {ground} from './physics.js'

const ROOT='assets/habitat/'
export function terrainMaterial(){
 const loader=new T.TextureLoader()
 function tile(name){
  const tex=loader.load(ROOT+name+'.webp')
  tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4
  return tex
 }
 const uniforms={clock:{value:0},drowned:{value:1}}
 for(const name of ['bed','shore','moss']){
  uniforms[name]={value:tile(name+'-color')}
  uniforms[name+'N']={value:tile(name+'-normal')}
 }
 return new T.ShaderMaterial({uniforms,vertexShader:`
 varying vec3 point; varying vec3 terrainNormal;
 void main(){point=(modelMatrix*vec4(position,1.)).xyz;terrainNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(point,1.);}
 `,fragmentShader:`
 uniform sampler2D bed,shore,moss,bedN,shoreN,mossN;
 uniform float clock,drowned;varying vec3 point;varying vec3 terrainNormal;
 float lines(vec2 p,float t){vec2 h=p+vec2(sin(p.y*1.8+t)*.37,cos(p.x*1.4-t)*.33);return pow(clamp(1.-abs(sin(h.x*3.7+h.y)+cos(h.y*4.1-h.x))*.8,0.,1.),9.);}
 void main(){
 vec2 uv=point.xz;float broad=.25*sin(uv.x*.41+sin(uv.y*.63))+.15*cos(uv.y*.31);
 float sand=smoothstep(-1.5,.05,point.y+broad),grass=smoothstep(.42,1.8,point.y+broad);
 vec3 c=mix(texture2D(bed,uv*.38).rgb,texture2D(shore,uv*.29).rgb,sand);
 c=mix(c,texture2D(moss,uv*.37).rgb,grass);
 vec3 detail=mix(texture2D(bedN,uv*.38).rgb,texture2D(shoreN,uv*.29).rgb,sand);
 detail=mix(detail,texture2D(mossN,uv*.37).rgb,grass)*2.-1.;
 vec3 n=normalize(terrainNormal+vec3(detail.x,.18*detail.z,detail.y)*.58);
 float sun=max(dot(n,normalize(vec3(-.5,.85,.32))),0.);
 c*=.64+.49*sun+.055*sin(uv.x*.53+uv.y*.22);
 float submerged=1.-smoothstep(-.7,0.,point.y);
 c=mix(c,c*vec3(.49,.88,.91),submerged*.78);
 c+=vec3(.22,.30,.22)*lines(uv*.55,clock*.47)*submerged*(.45+.55*sun);
 float fog=1.-exp(-distance(cameraPosition,point)*mix(.010,.047,drowned));
 c=mix(c,mix(vec3(.44,.55,.55),vec3(.052,.28,.30),drowned),clamp(fog,0.,.96));
 gl_FragColor=vec4(c,1.);
 }`})
}
export function makeGround(){
 const extent=192,steps=128,geo=new T.PlaneGeometry(extent,extent,steps,steps);geo.rotateX(-Math.PI/2)
 const mat=terrainMaterial(),obj=new T.Mesh(geo,mat)
 let bx=NaN,bz=NaN
 function update(px,pz,t,under){
  mat.uniforms.clock.value=t;mat.uniforms.drowned.value=under?1:0
  const x=Math.round(px/12)*12,z=Math.round(pz/12)*12
  if(x===bx&&z===bz)return;bx=x;bz=z;obj.position.set(x,0,z)
  const attr=geo.attributes.position
  for(let i=0;i<attr.count;i++)attr.setY(i,ground(x+attr.getX(i),z+attr.getZ(i)))
  attr.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere()
 }
 return {obj,update}
}
export function makeWater(){
 const geometry=new T.PlaneGeometry(240,240,96,96);geometry.rotateX(-Math.PI/2)
 const mat=new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,uniforms:{clock:{value:0}},vertexShader:`
 varying vec3 wp;
 uniform float clock;
 void main(){wp=(modelMatrix*vec4(position,1.)).xyz;wp.y+=.037*sin(wp.z*.68+wp.x*.45+clock*.9)+.024*sin(wp.x*1.2-clock);gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}
 `,fragmentShader:`
 varying vec3 wp;uniform float clock;
 void main(){vec2 q=wp.xz;float t=clock;
 vec2 slope=vec2(.045*cos(q.x*1.9+q.y*.38+t)+.072*sin(q.y*2.1+t*.78),.05*cos(q.x*.56-q.y*2.7+t*.91)+.07*cos(q.y*.68+q.x*.45+t*.9));
 vec3 n=normalize(vec3(slope.x,1.,slope.y)),v=normalize(cameraPosition-wp);
 float fr=pow(1.-clamp(abs(dot(v,n)),0.,1.),3.);
 vec3 col=mix(vec3(.085,.43,.43),vec3(.67,.79,.72),fr);
 vec3 h=normalize(v+normalize(vec3(-.43,.74,-.36)));
 float glint=pow(max(dot(n,h),0.),135.);
 col+=glint*vec3(1.,.90,.66);
 float below=step(cameraPosition.y,0.);
 col=mix(col,vec3(.40,.76,.73)+vec3(.14)*sin(q.x*4.+sin(q.y*3.+t))*.35,below*.8);
 gl_FragColor=vec4(col,mix(.32+.58*fr,.06+.13*fr,below));
 }`})
 const obj=new T.Mesh(geometry,mat);obj.renderOrder=1
 return {obj,update(px,pz,t){obj.position.set(Math.round(px/10)*10,0,Math.round(pz/10)*10);mat.uniforms.clock.value=t}}
}
