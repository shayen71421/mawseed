import {bodySize, ground} from './physics.js'

const tau = Math.PI * 2
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

function seedfall(draw, ctx, hero, size, age) {
  for (let i = 0; i < 7; i++) {
    const branch = 2 * i, height = branch / 13
    const release = age - (.13 + ((i * 3) % 7) * .19)
    if (release < 0) continue

    // Fruit starts under the same alternating branch tips used by the tree mesh.
    const branchAngle = branch * 2.4
    const direction = branchAngle - hero.angle
    const length = .94 * (1 - .57 * height)
    const baseY = 2.5 * (.39 + .55 * height) + .34 * (1 - .32 * height) - .073
    const landing = Math.sqrt(2 * baseY / 3.6)
    const fall = Math.min(release, landing)
    const roll = 1 - Math.exp(-Math.max(0, release - landing) * 4)
    const along = length + .17 * fall + roll * .20
    const x = hero.x + size * (Math.cos(direction) * along + .035 * Math.sin(hero.angle))
    const z = hero.z + size * (Math.sin(direction) * along + .035 * Math.cos(hero.angle))
    const floor = ground(x, z) + size * .085
    const after = Math.max(0, release - landing)
    const bounce = size * .11 * Math.max(0, 1 - 3.1 * after) * Math.abs(Math.sin(13 * after))
    const y = Math.max(floor, hero.y + size * (baseY - 1.8 * fall * fall)) + bounce
    const position = draw(x, y, z)
    if (position) {
      const r = clamp(size * .094 * position.k, 1.15, 12)
      const angle = .25 * Math.sin(i * 5) + fall * (i % 2 ? .94 : -1.12) + roll * .4
      ctx.save(); ctx.translate(position.x, position.y); ctx.rotate(angle)
      const skin = ctx.createRadialGradient(-.29 * r, -.36 * r, 0, 0, 0, 1.2 * r)
      skin.addColorStop(0, '#f5c27e'); skin.addColorStop(.47, '#d88954'); skin.addColorStop(1, '#925443')
      ctx.fillStyle = skin
      ctx.beginPath(); ctx.ellipse(0, 0, r * .87, r * 1.04, 0, 0, tau); ctx.fill()
      ctx.strokeStyle = '#938361'; ctx.lineWidth = Math.max(.65, r * .15)
      ctx.beginPath(); ctx.moveTo(0, -.91 * r); ctx.quadraticCurveTo(-.15 * r, -1.34 * r, .27 * r, -1.48 * r); ctx.stroke()
      ctx.restore()
    }

    // A winged seed drifts out behind each heavier fruit.
    const drift = release - .22
    if (drift < 0) continue
    const angle = direction + .7 * Math.sin(drift * 3 + i)
    const radial = length + .27 + drift * .44
    const sx = hero.x + size * radial * Math.cos(angle), sz = hero.z + size * radial * Math.sin(angle)
    const sy = Math.max(ground(sx, sz) + size * .027, hero.y + size * (baseY - .44 * drift - .30 * drift * drift))
    const seed = draw(sx, sy, sz)
    if (seed) {
      const r = clamp(seed.k * size * .051, .8, 5.5), rotation = i + drift * 4.2
      ctx.save(); ctx.translate(seed.x, seed.y); ctx.rotate(rotation)
      ctx.fillStyle = 'rgba(217,204,139,.88)'; ctx.beginPath()
      ctx.moveTo(0, 0); ctx.quadraticCurveTo(.58 * r, -1.85 * r, 2.86 * r, -1.14 * r)
      ctx.quadraticCurveTo(1.95 * r, -.14 * r, 0, 0); ctx.fill()
      ctx.fillStyle = '#8d603b'; ctx.beginPath(); ctx.ellipse(0, 0, r * .68, r * .43, -.28, 0, tau); ctx.fill()
      ctx.restore()
    }
  }
}

function knapping(draw, ctx, hero, size, rite, elapsed) {
  if (!(elapsed >= 0 && elapsed < .54) || !rite.hits) return
  const yaw = hero.angle, hand = rite.contact || {
    x:hero.x + size * (.70 * Math.cos(yaw) + .49 * Math.sin(yaw)),
    y:hero.y + size * .90,
    z:hero.z + size * (.49 * Math.cos(yaw) - .70 * Math.sin(yaw))
  }
  ctx.globalAlpha *= (1 - elapsed / .54) ** .66
  for (let i = 0; i < 8; i++) {
    const a = yaw + 1.73 * rite.hits + i * 2.39996, speed = .56 + .12 * ((i * 3) % 7)
    const x = hand.x + size * elapsed * speed * Math.cos(a)
    const z = hand.z + size * elapsed * speed * Math.sin(a)
    const y = hand.y + size * elapsed * (1.4 + .16 * (i % 5) - 5.1 * elapsed)
    if (y < ground(x, z)) continue
    const p = draw(x, y, z)
    if (!p) continue
    const width = clamp(p.k * size * (.014 + .005 * (i % 3)), .78, 4.2)
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a + elapsed * (9 + i))
    ctx.beginPath(); ctx.moveTo(-width, -.31 * width); ctx.lineTo(.61 * width, -.58 * width)
    ctx.lineTo(1.28 * width, .28 * width); ctx.lineTo(-.37 * width, .72 * width); ctx.closePath()
    ctx.fillStyle = i % 3 ? '#9d9d87' : '#c8bca4'; ctx.fill()
    ctx.strokeStyle = '#ece2c4'; ctx.lineWidth = .68
    ctx.beginPath(); ctx.moveTo(-width, -.31 * width); ctx.lineTo(.61 * width, -.58 * width); ctx.stroke()
    ctx.restore()
  }
}

function dawn(draw, ctx, hero, size, age) {
  const glow = Math.min(clamp(age / .7, 0, 1), clamp((3.5 - age) / 1.18, 0, 1))
  for (let i = 0; i < 15; i++) {
    const rise = age * (.31 + (i % 4) * .072) + i * .154
    const angle = i * 2.39996 + age * .16, radius = size * (.52 + (i % 6) * .13)
    const x = hero.x + radius * Math.cos(angle), z = hero.z + radius * Math.sin(angle)
    const p = draw(x, ground(x, z) + size * (.12 + rise), z)
    if (!p) continue
    const f = .42 + .23 * Math.cos(i * 2.1 + age * 2.6)
    const r = clamp(size * p.k * (.009 + .004 * (i % 3)), .62, 2.3)
    ctx.fillStyle = 'rgba(249,209,132,' + glow * f + ')'
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * .65, angle, 0, tau); ctx.fill()
  }
}

export function drawLineage(ctx, project, game, time) {
  const rite = game.rite
  if (!rite) return
  const age = time - rite.t
  if (age < 0 || rite.kind === 'seedfall' && age > 3.4 || rite.kind === 'human' && age > 3.5) return
  const width = ctx.canvas.clientWidth || ctx.canvas.width, height = ctx.canvas.clientHeight || ctx.canvas.height
  const draw = (x,y,z) => {
    const p = project(x,y,z)
    return p && p.depth > .18 && p.x >= -8 && p.x <= width + 8 && p.y >= -8 && p.y <= height + 8 ? p : null
  }
  ctx.save()
  const hero = game.hero, size = bodySize(hero)
  if (rite.kind === 'seedfall') seedfall(draw, ctx, hero, size, age)
  else if (rite.kind === 'knap' && rite.lastHit != null) knapping(draw, ctx, hero, size, rite, time - rite.lastHit)
  else if (rite.kind === 'human') dawn(draw, ctx, hero, size, age)
  ctx.restore()
}
