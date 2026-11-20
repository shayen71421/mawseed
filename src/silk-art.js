import {bodySize} from './physics.js'

const tau = 2 * Math.PI
const unit = value => Math.min(1, Math.max(0, value))

// Discard samples behind the eye or very far outside the viewport. Never join
// across a rejected sample when the line passes through the first-person camera.
function projected(ctx, project, point, firstPerson) {
  const p = project(point.x, point.y, point.z)
  const width = ctx.canvas.clientWidth || ctx.canvas.width
  const height = ctx.canvas.clientHeight || ctx.canvas.height
  const guard = Math.min(width, height) * .22
  if (!p || p.depth < (firstPerson ? .20 : .10) ||
      !Number.isFinite(p.x) || !Number.isFinite(p.y) ||
      p.x < -guard || p.x > width + guard || p.y < -guard || p.y > height + guard) return null
  return p
}

function stroke(ctx, points, color, width) {
  ctx.beginPath()
  let previous = null
  const limit = Math.max(ctx.canvas.clientWidth || ctx.canvas.width, ctx.canvas.clientHeight || ctx.canvas.height) * .49
  for (const point of points) {
    if (point) {
      if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < limit) ctx.lineTo(point.x, point.y)
      else ctx.moveTo(point.x, point.y)
    }
    previous = point
  }
  ctx.lineWidth = width
  ctx.strokeStyle = color
  ctx.stroke()
}

export function drawSilk(ctx, project, hero, web, time, firstPerson) {
  if (!web || hero.form !== 'spider' || time < web.t || time >= web.expires) return
  const caught = (web.phase === 'pinned' || web.phase === 'reel') && web.target?.live !== false && web.target
  const end = caught ? {x: caught.x, y: caught.y + bodySize(caught) * .8, z: caught.z} : (web.tip || web.end)
  if (!end || !web.start) return
  const size = bodySize(hero), yaw = hero.angle
  const start = {
    x: hero.x - Math.sin(yaw) * size * .91,
    y: hero.y + size * .48,
    z: hero.z - Math.cos(yaw) * size * .91
  }
  const age = Math.max(0, time - web.t)
  const fly = web.phase === 'flight', miss = web.phase === 'miss'
  const ex = end.x - start.x, ey = end.y - start.y, ez = end.z - start.z
  const horizontal = Math.hypot(ex, ez), length = Math.hypot(horizontal, ey)
  if (length < .045) return
  const rx = horizontal > .01 ? ez / horizontal : Math.cos(yaw)
  const rz = horizontal > .01 ? -ex / horizontal : -Math.sin(yaw)
  const drag = size * (miss ? .68 : fly ? .19 : .085) + length * (miss ? .115 : .012)
  const fade = miss ? unit((web.expires - time) / .20) : 1
  const segments = Math.max(26, Math.min(74, Math.ceil(length * 6)))
  const primary = [], second = []
  const screen = point => projected(ctx, project, point, firstPerson)

  for (let i = 0; i <= segments; i++) {
    const u = i / segments, bow = Math.sin(Math.PI * u)
    const pulse = Math.sin(10.5 * u - age * (fly ? 21 : 11))
    const sway = size * bow * (fly ? .080 : miss ? .13 : .021) * pulse
    const p = {
      x: start.x + ex * u + rx * sway,
      y: start.y + ey * u - drag * bow,
      z: start.z + ez * u + rz * sway
    }
    primary.push(screen(p))
    const gap = size * bow * (.038 + .023 * Math.sin(tau * u - age * 5))
    second.push(screen({x:p.x + rx * gap, y:p.y - gap * .38, z:p.z + rz * gap}))
  }

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalAlpha *= fade
  stroke(ctx, primary, 'rgba(28,58,59,.57)', firstPerson ? 2.5 : 2.2)
  stroke(ctx, second, 'rgba(186,224,220,.55)', .8)
  stroke(ctx, primary, 'rgba(242,248,232,.95)', firstPerson ? 1.22 : 1.04)
  const tip = screen(end)
  if (caught) {
    const radius = bodySize(caught) * .79
    const shape = (angle, f) => {
      const flutter = 1 + .085 * Math.sin(angle * 3 + age * 4)
      const across = radius * f * Math.cos(angle) * flutter
      const vertical = radius * f * Math.sin(angle) * .76
      const wrap = radius * (.2 - .43 * f * f + .09 * f * Math.sin(2 * angle))
      return screen({x:end.x + across * rx + wrap * rz, y:end.y + vertical, z:end.z + across * rz - wrap * rx})
    }
    for (let n = 0; n < 7; n++) {
      const a = n * tau / 7 + .19
      stroke(ctx, [shape(a, 0), shape(a + .06, .53), shape(a, 1)], 'rgba(226,241,231,.75)', .72)
    }
    for (const f of [.50, .91]) {
      const ring = []
      for (let k = 0; k <= 28; k++) {
        const a = k * tau / 28 + .19
        ring.push(shape(a, f * (1 - .13 * Math.sin(k * Math.PI / 4) ** 2)))
      }
      stroke(ctx, ring, 'rgba(219,239,229,.8)', .83)
    }
  } else if (fly && tip) {
    const r = Math.min(3.0, Math.max(.9, (tip.k || 1) * size * .021))
    ctx.fillStyle = 'rgba(248,255,232,.95)'
    ctx.beginPath(); ctx.arc(tip.x, tip.y, r, 0, tau); ctx.fill()
  }
  ctx.restore()
}
