import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {ground} from './physics.js'

function makeWeb() {
  const vertices = []
  const spokes = 10
  const point = (ray, radius) => {
    const angle = (ray / spokes) * Math.PI * 2 + .08
    return [Math.cos(angle) * radius * 3.1, Math.sin(angle) * radius * 2.18, .08 * radius]
  }
  for (let ray = 0; ray < spokes; ray++) {
    vertices.push(0, 0, 0, ...point(ray, 1))
    for (let ring = 1; ring < 7; ring++) {
      const radius = ring / 7
      const start = point(ray, radius)
      const end = point(ray + 1, radius)
      const middle = [(start[0]+end[0])*.5, (start[1]+end[1])*.5-.038, -.055]
      vertices.push(...start, ...middle, ...middle, ...end)
    }
  }
  const shape = new THREE.BufferGeometry()
  shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  const silk = new THREE.LineBasicMaterial({color:0xcbddd4, transparent:true, opacity:.51})
  const web = new THREE.LineSegments(shape, silk)
  web.position.set(-17, ground(-17,2)+2, 2)
  return web
}

function makePollen() {
  const count = 70
  const positions = new Float32Array(count * 3)
  const geometry = new THREE.BufferGeometry()
  const points = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', points)
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 10, 0), 15)
  const material = new THREE.ShaderMaterial({
    vertexShader: `
      varying float light;
      void main() {
        vec4 p = modelViewMatrix * vec4(position,1.0);
        light = .65 + .3 * sin(position.y*1.8);
        gl_PointSize = clamp(92.0 / max(1.0,-p.z), 1.0, 5.0);
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: `
      varying float light;
      void main() {
        float d = length(gl_PointCoord - .5) * 2.;
        float alpha = 1.0 - smoothstep(.08, 1.0, d);
        gl_FragColor = vec4(vec3(1.0,.77,.34), alpha*light);
      }`,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
  })
  const object = new THREE.Points(geometry,material)
  function drift(time) {
    for (let i = 0; i < count; i++) {
      const phase = (i * .61803398875 + time * (.047 + (i%5) * .002)) % 1
      const yaw = i * 2.39996 + time * .14 + phase * .8
      const radius = .51 + phase * (3 + i%7)
      points.setXYZ(i, .51 + radius*Math.cos(yaw), 11.2 + phase*9, radius*Math.sin(yaw))
    }
    points.needsUpdate = true
  }
  return {object, drift}
}

export function createGroveLandmark(scene) {
  const nursery = new THREE.Group()
  nursery.name = 'Canopy Heart'
  nursery.position.set(0, ground(0,-80), -80)
  const pollen = makePollen()
  pollen.object.visible = false
  nursery.add(pollen.object)
  scene.add(nursery, makeWeb())
  let amber
  new GLTFLoader().load('assets/fauna/canopy-heart.glb', ({scene:model}) => {
    model.traverse(node => {
      if (!node.isMesh) return
      node.castShadow = true
      node.receiveShadow = true
      if (node.material.name === 'seed light') amber = node.material
    })
    nursery.add(model)
  })
  return (restored, time) => {
    if (amber) amber.emissiveIntensity = (restored ? .94 : .46) + .11 * Math.sin(time * 1.2)
    pollen.object.visible = Boolean(restored)
    if (restored) pollen.drift(time)
  }
}
