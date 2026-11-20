import {bodySize} from './physics.js'
import {silkPathClear} from './silk.js'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

function birdRibbon(ctx, screen, history, size, side, opacity, time) {
  let prior
  for (let i = 0; i < history.length; i++) {
    const p = history[i], age = time - p.t, strength = 1 - clamp(age / .31, 0, 1)
    if (strength === 0) { prior = null; continue }
    const across = side * size * (1.26 + age * .25), aft = size * .46
    const point = screen(p.x + Math.cos(p.angle) * across - Math.sin(p.angle) * aft,
      p.y + size * (.88 + age * .75), p.z - Math.sin(p.angle) * across - Math.cos(p.angle) * aft)
    if (prior && point && Math.hypot(prior.x - point.x, prior.y - point.y) < 125) {
      ctx.beginPath(); ctx.moveTo(prior.x, prior.y); ctx.lineTo(point.x, point.y)
      ctx.lineWidth = clamp(point.k * size * .012, .7, 2.4) * (.66 + .34 * strength)
      ctx.strokeStyle = 'rgba(195,229,231,' + (opacity * strength * .66) + ')'
      ctx.stroke()
    }
    prior = point
  }
}

function pollen(ctx, screen, history, size, opacity, time) {
  for (let i = 0; i < history.length; i++) {
    const p = history[i], age = time - p.t
    if (age < 0 || age > .38) continue
    const phase = p.t * 27.4
    const spread = size * (.19 + age * .95), up = size * (.78 + age * 2)
    const sx = Math.cos(phase) * spread, sz = Math.sin(phase) * spread
    const px = p.x + sx, py = p.y + up, pz = p.z + sz
    const mote = screen(px, py, pz)
    if (!mote) continue
    const tail = screen(px + sx * .16, py + size * .14, pz + sz * .16)
    const strength = opacity * (1 - age / .38)
    if (tail && Math.hypot(mote.x - tail.x, mote.y - tail.y) < 24) {
      ctx.beginPath(); ctx.moveTo(mote.x, mote.y); ctx.lineTo(tail.x, tail.y)
      ctx.lineWidth = .96; ctx.strokeStyle = 'rgba(239,191,94,' + (strength * .48) + ')'; ctx.stroke()
    }
    const radius = clamp(mote.k * size * (.018 + .007 * Math.sin(phase)), .72, 2.3)
    ctx.beginPath(); ctx.arc(mote.x, mote.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,218,123,' + (strength * .78) + ')'; ctx.fill()
  }
}

function targetMark(ctx, point, target, selected, bee, alpha) {
  const radius = clamp(point.k * bodySize(target) * (bee ? .91 : 1.14), bee ? 5 : 7, bee ? 23 : 34)
  const corner = Math.min(6, radius * .42), yRadius = radius * .77
  ctx.beginPath()
  for (const side of [-1, 1]) {
    if (bee) {
      const y = point.y + yRadius
      ctx.moveTo(point.x + side * (radius + 1), y - 3)
      ctx.lineTo(point.x + side * radius, y)
      ctx.lineTo(point.x + side * (radius - corner), y + 2)
    } else {
      for (const up of [-1, 1]) {
        const x = point.x + side * radius, y = point.y + up * yRadius
        ctx.moveTo(x - side * corner, y); ctx.lineTo(x, y); ctx.lineTo(x, y - up * corner)
      }
    }
  }
  if (selected && !bee) {
    ctx.moveTo(point.x - 2.5, point.y - yRadius - 3.8)
    ctx.lineTo(point.x, point.y - yRadius - 1.2)
    ctx.lineTo(point.x + 2.5, point.y - yRadius - 3.8)
  }
  ctx.lineWidth = selected ? 3.4 : 2.7
  ctx.strokeStyle = 'rgba(24,40,38,' + (.7 * alpha) + ')'; ctx.stroke()
  ctx.lineWidth = selected ? 1.37 : 1.05
  ctx.strokeStyle = (bee || selected ? 'rgba(255,215,135,' : 'rgba(201,232,217,') + alpha + ')'; ctx.stroke()
}

export function drawFlight(ctx, project, game, time) {
  const hero = game.hero, bee = hero.form === 'bee'
  if (!bee && hero.form !== 'bird') return
  const width = ctx.canvas.clientWidth || ctx.canvas.width, height = ctx.canvas.clientHeight || ctx.canvas.height
  const screen = (x, y, z) => {
    const p = project(x, y, z)
    return p && p.depth > .19 && p.x > 3 && p.x < width - 3 && p.y > 3 && p.y < height - 3 ? p : null
  }
  const size = bodySize(hero), eye = {x:hero.x, y:hero.y + size * 1.05, z:hero.z}
  const strokeTarget = (actor, selected, alpha) => {
    if (!actor || actor.live === false || actor.hp <= 0) return false
    const center = {x:actor.x, y:actor.y + bodySize(actor) * .85, z:actor.z}
    const p = screen(center.x, center.y, center.z)
    if (!p || p.x < 16 || p.x > width - 16 || p.y < 17 || p.y > height - 17) return false
    if (!silkPathClear(eye, center, game.world.solids)) return false
    targetMark(ctx, p, actor, selected, bee, alpha)
    return true
  }

  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const flight = game.flight
  if (flight?.phase === 'dive' && flight.history?.length > 1) {
    const opacity = .42 + .58 * Math.sin(Math.PI * clamp(flight.u, 0, 1))
    if (bee) pollen(ctx, screen, flight.history, size, opacity, time)
    else for (const side of [-1, 1]) birdRibbon(ctx, screen, flight.history, size, side, opacity, time)
  }

  const sight = game.sight, scan = !bee && sight && sight.until > time
  const selected = flight?.target?.live ? flight.target : scan && sight.selected?.live ? sight.selected : game.airTarget
  let count = strokeTarget(selected, true, .92) ? 1 : 0
  if (scan) {
    const alpha = .76 * clamp((sight.until - time) / .28, 0, 1)
    const seen = new Set([selected])
    for (const target of sight.targets) {
      if (count >= 5) break
      if (seen.has(target)) continue
      seen.add(target)
      if (strokeTarget(target, false, alpha)) count++
    }
  }
  ctx.restore()
}
