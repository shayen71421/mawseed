(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/plates.js
  var directory = "assets/";
  var fauna = /* @__PURE__ */ new Map();
  var habitat = /* @__PURE__ */ new Map();
  var textures = /* @__PURE__ */ new Map();
  var queued = /* @__PURE__ */ new Map();
  function asset(file) {
    if (queued.has(file)) return queued.get(file);
    const img = new Image();
    img.decoding = "async";
    img.src = directory + file;
    queued.set(file, img);
    return img;
  }
  var ready = (img) => img && img.complete && img.naturalWidth > 0;
  for (const [dir, map] of [["fauna", fauna], ["habitat", habitat]]) {
    fetch(directory + dir + "/" + (dir === "fauna" ? "manifest" : "habitat") + ".json").then((r) => r.json()).then((data) => {
      for (const [key, meta] of Object.entries(data)) {
        const img = asset(dir + "/" + key + ".webp"), entry = { ...meta, img };
        map.set(key, entry);
        if (dir === "habitat") {
          const grade = () => {
            const c = document.createElement("canvas");
            c.width = img.width;
            c.height = img.height;
            const g = c.getContext("2d");
            g.drawImage(img, 0, 0);
            g.globalCompositeOperation = "source-atop";
            const tint = g.createLinearGradient(0, 0, 0, c.height);
            tint.addColorStop(0, "rgba(13,63,52,.29)");
            tint.addColorStop(0.53, "rgba(13,61,49,.44)");
            tint.addColorStop(1, "rgba(6,43,41,.72)");
            g.fillStyle = tint;
            g.fillRect(0, 0, c.width, c.height);
            entry.submerged = c;
          };
          if (ready(img)) grade();
          else img.addEventListener("load", grade, { once: true });
        }
      }
    }).catch(() => {
    });
  }
  for (const name of ["bed", "shore", "moss"]) textures.set(name, asset("habitat/" + name + "-color.webp"));
  var patterns = /* @__PURE__ */ new Map();
  function terrainPattern(ctx2, name) {
    if (patterns.has(name)) return patterns.get(name);
    const img = textures.get(name);
    if (!ready(img)) return;
    const pattern = ctx2.createPattern(img, "repeat");
    patterns.set(name, pattern);
    return pattern;
  }
  function animalPlate(name) {
    const model = fauna.get(name);
    return model && ready(model.img) ? model : null;
  }
  function habitatPlate(name) {
    const model = habitat.get(name);
    return model && ready(model.img) ? model : null;
  }
  var deepBackground = asset("lagoon-depths.webp");
  var forestBackground = asset("canopy-horizon.webp");
  var isReady = ready;

  // src/physics.js
  function ground(x, z) {
    const bend = 32 + 14 * Math.sin(x * 0.029) + 5 * Math.sin(x * 0.071);
    const offset = z - bend;
    const lateral = Math.abs(offset - Math.round(offset / 155) * 155);
    const width2 = 19 + 3.5 * Math.cos(x * 0.038) + 1.8 * Math.sin(x * 0.097);
    const shore = lateral - width2;
    const main = shore < 0 ? Math.max(-8.4, shore * 0.39) : Math.min(2.7, shore * 0.29) + Math.min(1, shore / 16) * (1.5 + 1.3 * Math.sin(x * 0.071) * Math.cos(z * 0.075));
    const distance2 = Math.hypot(x, z - 34);
    if (distance2 < 68) return main;
    const bendX = 28 * Math.sin(z * 0.032) + 13 * Math.sin(z * 0.067), cross = x - bendX;
    const sideDistance = Math.abs(cross - Math.round(cross / 146) * 146);
    const sideWidth = 5 + 2 * Math.cos(z * 0.061) + 8 * Math.pow(0.5 + 0.5 * Math.cos(z * 0.04 + x * 0.012), 4);
    const sideBed = Math.max(-6.8, (sideDistance - sideWidth) * 0.46);
    const u = Math.min(1, (distance2 - 68) / 42), blend = u * u * (3 - 2 * u);
    return main + (Math.min(main, sideBed) - main) * blend;
  }
  var scaleOf = (id) => ({ amoeba: 0.22, colony: 0.38, microbe: 0.15, fish: 0.8, shiner: 0.39, pike: 1.37, mantis: 0.87, cleaner: 0.68, minnow: 0.49, lungfish: 0.85, hunter: 1.25, leech: 0.4, bee: 0.54, moth: 0.46, mite: 0.43, worm: 0.48, snail: 0.55, blight: 0.49, spider: 0.72 })[id] ?? 1;
  var bodySize = (actor) => actor.size ?? scaleOf(actor.form || actor.type);
  function modeOf(id) {
    if (["amoeba", "microbe", "colony", "fish", "cleaner", "minnow", "shiner", "pike", "hunter"].includes(id)) return "water";
    if (id === "lungfish" || id === "leech") return "both";
    if (["bee", "moth", "bird"].includes(id)) return "air";
    return "land";
  }
  function fits(id, x, z, size = scaleOf(id)) {
    const mode = modeOf(id), h = ground(x, z);
    if (mode === "water") return h < -(size * 2.05 + 0.25);
    if (mode === "land") return h > -0.12;
    return true;
  }
  function levelFor(id, x, z, depth = 2.4, s = scaleOf(id)) {
    const bottom = ground(x, z), mode = modeOf(id);
    if (mode === "air") return Math.max(0, bottom) + (id === "bird" ? Math.max(0.5, Math.min(8, depth)) : 1.2);
    if (mode === "water" || mode === "both" && bottom < -0.5) return Math.max(bottom + 0.08, Math.min(-s * 2 - 0.09, -depth - s * 0.7));
    return bottom + 0.018;
  }
  function playerLevel(id, x, z, depth, size) {
    const bottom = ground(x, z);
    if (modeOf(id) === "air") return levelFor(id, x, z, depth, size);
    return bottom < 0 ? Math.max(bottom + 0.035, -depth - size * 0.85) : bottom + 0.018;
  }
  function respiration(id, x, y, z, size) {
    const bottom = ground(x, z), depth = -(y + 0.85 * size), wet = bottom < 0 && depth > 0.015;
    const mode = modeOf(id), aquatic = mode === "water";
    const depleted = aquatic ? !wet : mode !== "air" && wet && depth > 0.43;
    const capacity = aquatic ? id === "amoeba" || id === "colony" ? 10 : 14 : id === "lungfish" ? 48 : 20;
    return { wet, depth, capacity, depleted, label: aquatic ? "Water reserve" : "Air", mode };
  }
  function resolveHabitat(actor, id, clear = () => true) {
    const size = actor.size ?? scaleOf(id);
    if (fits(id, actor.x, actor.z, size) && clear(actor.x, actor.z)) return false;
    for (let radius = 0.5; radius <= 128; radius += 1) for (let i = 0; i < 32; i++) {
      const a = i * Math.PI / 16, x = actor.x + radius * Math.cos(a), z = actor.z + radius * Math.sin(a);
      if (fits(id, x, z, size) && clear(x, z)) {
        actor.x = x;
        actor.z = z;
        return true;
      }
    }
    return false;
  }
  function blocked(x, z, base, radius, bodyHeight, solids) {
    for (const ob of solids) {
      if (base > ob.top || base + bodyHeight < ob.base) continue;
      if (Math.abs(x - ob.x) > radius + ob.r || Math.abs(z - ob.z) > radius + ob.r) continue;
      if ((x - ob.x) ** 2 + (z - ob.z) ** 2 < (radius + ob.r) ** 2) return true;
    }
    return false;
  }
  function travel(actor, id, dx, dz, solids, depth) {
    const size = actor.size ?? scaleOf(id), radius = size * 0.6;
    const level = actor.player ? playerLevel : levelFor;
    const at = (x, z) => level(id, x, z, depth, size);
    const clear = (x, z, y) => !blocked(x, z, y, radius, size * 1.65, solids);
    const heldHeight = (x, z) => Math.max(ground(x, z) + 0.035, actor.y);
    const pass = (x, z) => (actor.player || fits(id, x, z, size)) && (clear(x, z, at(x, z)) || actor.player && clear(x, z, heldHeight(x, z)));
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.max(0.17, radius * 0.8)));
    for (let i = 0; i < steps; i++) {
      const x = actor.x + dx / steps, z = actor.z + dz / steps;
      if (pass(x, z)) {
        actor.x = x;
        actor.z = z;
        continue;
      }
      if (pass(x, actor.z)) actor.x = x;
      if (pass(actor.x, z)) actor.z = z;
    }
    const nextY = level(id, actor.x, actor.z, depth, size);
    if (clear(actor.x, actor.z, nextY)) actor.y = nextY;
    else if (actor.player) actor.y = heldHeight(actor.x, actor.z);
  }
  function clearStrike(from, to, solids) {
    const fromHeight = from.y + bodySize(from) * 0.8, toHeight = to.y + bodySize(to) * 0.8;
    const dx = to.x - from.x, dz = to.z - from.z, denominator = dx * dx + dz * dz;
    for (const ob of solids) {
      const u = denominator ? Math.max(0, Math.min(1, ((ob.x - from.x) * dx + (ob.z - from.z) * dz) / denominator)) : 0;
      const y = fromHeight + (toHeight - fromHeight) * u;
      if (y < ob.base || y > ob.top) continue;
      if ((from.x + u * dx - ob.x) ** 2 + (from.z + u * dz - ob.z) ** 2 < ob.r * ob.r) return false;
    }
    return true;
  }

  // src/scenery.js
  var heights = { rock: 1.25, coral: 1.95, kelp: 3.1, reed: 1.75, mushroom: 2.15, tree: 9, shell: 0.52, sponge: 1.68 };
  function propFor(p) {
    const h = ground(p.x, p.z);
    if (p.n === 7) return "shell";
    if (p.n === 8) return "sponge";
    if (p.n === 0) return "rock";
    if (Math.abs(h) < 0.9 && p.n > 1) return "reed";
    if (h < 0) return p.n < 4 ? "kelp" : "coral";
    return p.n < 4 ? "mushroom" : "reed";
  }
  function propHeight(p, key) {
    return heights[key] * p.s;
  }
  var nurseryBeds = [[-4, 34, 1.95], [4.4, 31, 2.1], [-3.8, 30.5, 1.6], [5.6, 27, 2.05], [-6, 25, 1.7], [3.3, 39.7, 1.9], [-5.5, 42, 1.8], [-2.9, 18, 1.35], [7.5, 18, 1.65]].map(([x, z, s]) => ({ x, z, s, n: 1 }));
  var falls = {
    microbe: [0.58, 0.15, 0.68, 0.42],
    minnow: [2.42, 0.46, 0.08, 0.15],
    shiner: [-2.95, -0.37, 0.15, 0.24],
    moth: [-2.3, 0.86, -0.39, 0.2],
    mite: [2.99, -0.81, 0.52, 0.11],
    leech: [-0.61, 0.75, 0.09, 0.59],
    blight: [0.93, -0.41, 0.42, 0.69],
    pike: [-1.84, 0.44, -0.18, 0.14],
    hunter: [1.66, 0.32, -0.22, 0.18],
    mantis: [-0.9, 1.2, -0.19, 0.32],
    ape: [1.29, 0.7, -0.22, 0.18]
  };
  function feedingPose(game2, time) {
    const m = game2.meal;
    if (!m) return null;
    const f = (time - m.t) / (m.hostile ? 0.96 : 0.78);
    if (f < 0 || f >= 1) return null;
    const tumble = Math.min(1, f / 0.58), decay = Math.max(0, (f - 0.32) / 0.68), t = decay * decay * (3 - 2 * decay);
    const [roll, pitch, lift, squash] = falls[m.type] || falls.microbe;
    const hero2 = game2.hero, reach = hero2.size * 0.58, feed = m.hostile ? 0 : t;
    const end = Math.sin(Math.PI * tumble * 0.52);
    return {
      type: m.type,
      angle: m.angle + (m.type === "shiner" ? -1.8 : m.type === "moth" ? 1.22 : 0.34) * end,
      x: m.x + (hero2.x + Math.sin(hero2.angle) * reach - m.x) * feed,
      z: m.z + (hero2.z + Math.cos(hero2.angle) * reach - m.z) * feed,
      y: m.y + (hero2.y + hero2.size * 0.62 - m.y) * feed,
      scale: Math.max(0.03, 1 - t),
      pose: { roll: roll * end, pitch: pitch * end, lift: lift * Math.sin(Math.PI * tumble), stretch: 1 - squash * Math.sin(Math.PI * f), wide: m.type === "microbe" ? 1 + 0.55 * Math.sin(Math.PI * f) : 1, wing: m.type === "moth" ? -1.08 * end : 0 }
    };
  }

  // src/combat.js
  var hunts = {
    hunter: { name: "Reef hunter", move: "Hook bite", wind: 0.65, strike: 0.34, rest: 1.05, start: 2.75, drive: 2.15, reach: 1.12, width: 0.83, speed: 3.4 },
    pike: { name: "Needle pike", move: "Spear rush", wind: 0.56, strike: 0.29, rest: 1.32, start: 4.2, drive: 4.05, reach: 1.04, width: 0.46, speed: 3.2 },
    mite: { name: "Ember mite", move: "Spring kick", wind: 0.53, strike: 0.42, rest: 0.96, start: 1.85, drive: 1.48, reach: 0.65, width: 0.49, speed: 2.8 },
    mantis: { name: "Sickle mantis", move: "Scissor cut", wind: 0.74, strike: 0.38, rest: 1.12, start: 2.1, drive: 0.83, reach: 1.62, width: 0.72, speed: 3.15 },
    ape: { name: "Stoneback ape", move: "Hammerfall", wind: 0.94, strike: 0.47, rest: 1.5, start: 2.65, drive: 0.8, reach: 1.89, width: 0.93, speed: 3.5 }
  };
  var clamp01 = (n) => Math.max(0, Math.min(1, n));
  var ease = (n) => n * n * (3 - 2 * n);
  function updatePredator(e, hero2, solids, dt, time, depth, walk, hit) {
    const h = hunts[e.type], s = bodySize(e), playerRadius = bodySize(hero2) * 0.55;
    const dx = hero2.x - e.x, dz = hero2.z - e.z, d = Math.hypot(dx, dz), dy = Math.abs(e.y + s * 0.8 - hero2.y - bodySize(hero2) * 0.8);
    const phase = e.phase || "stalk";
    if (phase === "stalk") {
      const near = d < 10 + s * 2 && Math.hypot(e.x - e.homeX, e.z - e.homeZ) < 20;
      if (near && d < h.start + playerRadius && dy < 1 + s * 0.6 && clearStrike(e, hero2, solids)) {
        e.phase = "windup";
        e.age = 0;
        e.aim = d > 0.03 ? Math.atan2(dx, dz) : e.angle;
        e.angle = e.aim;
        e.landed = false;
        e.strikeDepth = depth;
      } else if (near) walk(e, e.type, hero2.x, hero2.z, h.speed, dt, depth);
      else walk(e, e.type, e.homeX + 2.6 * Math.cos(time * 0.31 + e.homeX), e.homeZ + 2.6 * Math.sin(time * 0.31 + e.homeX), 1.2, dt, e.depth);
      return;
    }
    const previous = e.age;
    e.age += dt;
    const duration = phase === "windup" ? h.wind : phase === "strike" ? h.strike : h.rest;
    const u = clamp01(e.age / duration), old = clamp01(previous / duration);
    const ax = Math.sin(e.aim), az = Math.cos(e.aim);
    if (phase === "strike") {
      const distance2 = h.drive * (ease(u) - ease(old)), beforeX = e.x, beforeZ = e.z;
      travel(e, e.type, ax * distance2, az * distance2, solids, e.strikeDepth);
      const start = e.type === "ape" ? 0.39 : e.type === "mite" ? 0.34 : 0.13;
      if (!e.landed && u >= start && old < 0.94) {
        const forward = (hero2.x - beforeX) * ax + (hero2.z - beforeZ) * az;
        const across = Math.abs((hero2.x - beforeX) * az - (hero2.z - beforeZ) * ax);
        const moved = (e.x - beforeX) * ax + (e.z - beforeZ) * az;
        if (forward >= -playerRadius && forward <= moved + h.reach + playerRadius && across < h.width + playerRadius && dy < 0.68 + s * 0.66 + playerRadius && clearStrike(e, hero2, solids)) {
          e.landed = true;
          hit(e, h);
        }
      }
    } else if (phase === "recover") {
      const step = (e.type === "pike" ? 0.95 : 0.68) * (ease(u) - ease(old));
      travel(e, e.type, -ax * step, -az * step, solids, e.strikeDepth);
    }
    if (u >= 1) {
      e.phase = phase === "windup" ? "strike" : phase === "strike" ? "recover" : "stalk";
      e.age = 0;
    }
  }
  function predatorPose(e) {
    const h = hunts[e.type];
    if (!h || !e.phase || e.phase === "stalk") return {};
    const w = e.phase === "windup", a = e.phase === "strike", r = e.phase === "recover";
    const u = clamp01(e.age / (w ? h.wind : a ? h.strike : h.rest)), wind = w ? ease(u) : a ? 1 - ease(Math.min(1, u * 2.1)) : 0;
    const strike = a ? Math.sin(u * Math.PI) : 0, follow = a ? ease(u) : r ? 1 - ease(u) : 0;
    switch (e.type) {
      case "ape":
        return { arm: 1.95 * wind - 1.12 * follow, offArm: 1.27 * wind - 0.65 * follow, pitch: -0.24 * wind + 0.64 * follow, roll: 0.12 * wind - 0.16 * strike, stretch: 1 - 0.11 * wind, lift: 0.14 * strike };
      case "mantis":
        return { arm: 1.18 * wind - 1.33 * strike, offArm: 1.48 * wind - 1.55 * strike, pitch: -0.22 * wind + 0.29 * strike, spread: 0.45 * wind - 0.42 * strike };
      case "mite":
        return { lift: Math.sin(Math.PI * u) * (a ? 0.82 : 0), pitch: -0.26 * wind + 0.52 * strike, roll: 0.26 * strike, stretch: 1 - 0.33 * wind + 0.22 * strike, legs: 0.88 * wind - 0.55 * strike };
      case "pike":
        return { roll: 0.5 * wind - 0.36 * strike, bend: 0.63 * wind - 0.27 * strike, jaw: 0.42 * wind - 0.14 * strike, stretch: 1 - 0.12 * wind + 0.26 * strike };
      default:
        return { jaw: 0.94 * wind + 0.32 * strike, roll: -0.5 * wind + 0.7 * strike, bend: -0.49 * wind + 0.72 * strike, pitch: -0.11 * wind };
    }
  }
  var moves = {
    amoeba: "engulf",
    colony: "divide",
    fish: "snap",
    lungfish: "heave",
    spider: "silk",
    bird: "stoop",
    ape: "hammer",
    bee: "sting",
    cleaner: "pluck",
    worm: "coil",
    snail: "crush",
    sapling: "root",
    tree: "vine"
  };
  function playerPose(game2, t) {
    if (game2.defeat) {
      const u2 = ease(clamp01((t - game2.defeat.t) / 0.78)), aquatic = ["amoeba", "colony", "fish", "cleaner", "lungfish"].includes(game2.hero.form);
      return { roll: u2 * (aquatic ? 1.67 : 1.25), pitch: u2 * (aquatic ? 0.18 : 0.55), stretch: 1 - 0.28 * u2, lift: -0.24 * u2 };
    }
    if (game2.dodge && t - game2.dodge.t < 0.31) {
      const u2 = clamp01((t - game2.dodge.t) / 0.31);
      return { roll: Math.sin(Math.PI * u2) * game2.dodge.side * 0.83, pitch: -Math.sin(Math.PI * u2) * 0.22, stretch: 1 + 0.14 * Math.sin(Math.PI * u2) };
    }
    const a = game2.swing;
    if (!a) return {};
    const u = clamp01((t - a.t) / a.duration);
    if (u >= 1) return {};
    const draw = Math.sin(Math.min(1, u / 0.38) * Math.PI * 0.5) * (1 - ease(clamp01((u - 0.38) / 0.24)));
    const cut = Math.sin(Math.PI * clamp01((u - 0.33) / 0.67));
    switch (moves[game2.hero.form]) {
      case "engulf":
        return { stretch: 1 - 0.27 * draw + 0.38 * cut, wide: 1 + 0.32 * cut, pitch: 0.12 * cut };
      case "divide":
        return { wide: 1 + 0.39 * draw, stretch: 1 - 0.18 * draw + 0.38 * cut, roll: 0.2 * cut };
      case "snap":
        return { jaw: 0.85 * draw, bend: -0.36 * draw + 0.44 * cut, roll: 0.24 * cut, stretch: 1 + 0.19 * cut };
      case "heave":
        return { jaw: 1.05 * draw, lift: 0.23 * cut, pitch: -0.35 * draw + 0.48 * cut };
      case "silk":
        return { arm: 1.05 * draw - 0.88 * cut, spread: 0.65 * draw, pitch: -0.2 * draw + 0.34 * cut };
      case "stoop":
        return { wing: 0.92 * draw - 0.87 * cut, pitch: -0.48 * draw + 0.76 * cut, lift: 0.48 * draw };
      case "hammer":
        return { arm: 2.05 * draw - 1.17 * cut, offArm: 0.93 * draw - 0.65 * cut, pitch: -0.28 * draw + 0.52 * cut, roll: 0.23 * draw };
      case "sting":
        return { pitch: -0.65 * draw + 0.92 * cut, roll: 0.49 * cut, bend: 0.65 * cut, wing: 0.39 * draw };
      case "pluck":
        return { jaw: 0.65 * draw, pitch: 0.29 * draw - 0.38 * cut, stretch: 1 + 0.26 * cut };
      case "coil":
        return { bend: 0.9 * draw - 0.5 * cut, stretch: 1 - 0.42 * draw + 0.49 * cut };
      case "crush":
        return { lift: 0.68 * draw, pitch: -0.52 * draw + 0.57 * cut, stretch: 1 - 0.25 * cut };
      case "root":
        return { roll: -0.37 * draw + 0.45 * cut, bend: 0.67 * cut, stretch: 1 + 0.15 * cut };
      case "vine":
        return { roll: 0.33 * draw - 0.49 * cut, bend: -0.8 * draw + 0.96 * cut, wide: 1 + 0.16 * cut };
      default:
        return {};
    }
  }

  // src/combat-art.js
  var curves = {
    silk: (u) => [Math.sin(u * 6.28) * 0.07, 0.82 + 0.24 * Math.sin(u * 3.14), 0.58 + u * 2.65],
    root: (u) => [0.25 * Math.sin(u * 5), 0.12 + Math.sin(u * 5.6) * 0.18, 0.35 + u * 3.1],
    vine: (u) => [0.9 * Math.sin(u * 5.1), 0.9 + 0.57 * Math.cos(u * 4), 0.32 + u * 3.6],
    hammer: (u) => [0.42 - 0.75 * u, 2.66 - 2.42 * u * u, 0.19 + 1.67 * u],
    sting: (u) => [-0.25 + 0.34 * u, 0.63 + 0.1 * Math.sin(u * 3.14), 0.6 + 2.09 * u],
    stoop: (u) => [0.57 - 0.6 * u, 1.7 - 1.48 * u, 0.45 + 2.2 * u],
    crush: (u) => [0.56 * Math.sin(u * 3.14), 1.84 - 1.61 * u, 0.45 + 0.77 * u],
    pluck: (u) => [0.12 * Math.sin(u * 6), 0.59 + 0.41 * u, 0.83 + 1.55 * u],
    heave: (u) => [0.36 - 0.57 * u, 0.26 + 0.7 * Math.sin(u * 3.14), 0.45 + 1.89 * u],
    snap: (u) => [0.72 - 0.93 * u, 0.47 + 0.43 * Math.sin(u * 3.14), 0.9 + 0.96 * Math.sin(u * 2.5)],
    coil: (u) => [Math.sin(u * 7) * 0.25, 0.33 + 0.21 * Math.cos(u * 4), 0.38 + 2.2 * u],
    engulf: (u) => [Math.cos(u * 3.2) * 0.72, 0.72 + 0.41 * Math.sin(u * 3.2), 0.24 + 1.18 * Math.sin(u * 3.2)],
    divide: (u) => [Math.cos(u * 4.2) * 0.87, 0.66 + Math.sin(u * 5) * 0.2, 0.4 + 1.28 * Math.sin(u * 2.65)]
  };
  var colors = { silk: "#c7f5e9", root: "#d1d788", vine: "#c1e395", hammer: "#e8bd88", sting: "#efcf79", stoop: "#d6ddd9", coil: "#cbbacc", engulf: "#c4edbd", divide: "#decbaa" };
  function sweep(ctx2, project2, actor, shape, fraction, alpha, color, size, doubled = false) {
    const start = Math.max(0, fraction - 0.59), sa = Math.sin(actor.angle), ca = Math.cos(actor.angle), curve = curves[shape];
    if (!curve || fraction <= start) return;
    ctx2.strokeStyle = color;
    ctx2.lineCap = "round";
    ctx2.lineJoin = "round";
    for (const side of doubled ? [-1, 1] : [1]) {
      ctx2.beginPath();
      let n = 0, scale = 1;
      for (let k = 0; k <= 11; k++) {
        const u = start + (fraction - start) * k / 11, [raw, y, z] = curve(u), x = raw * side;
        const p = project2(actor.x + size * (x * ca + z * sa), actor.y + y * size, actor.z + size * (z * ca - x * sa));
        if (!p || p.depth < 0.11) {
          n = 0;
          continue;
        }
        if (n++) ctx2.lineTo(p.x, p.y);
        else ctx2.moveTo(p.x, p.y);
        scale = p.k;
      }
      ctx2.globalAlpha = alpha * 0.2;
      ctx2.lineWidth = Math.max(2, Math.min(13, scale * size * 0.09));
      ctx2.stroke();
      ctx2.globalAlpha = alpha;
      ctx2.lineWidth = Math.max(1, Math.min(4, scale * size * 0.032));
      ctx2.stroke();
    }
  }
  var debris = {
    microbe: ["#b2ec95", "bubble", 12],
    minnow: ["#f8cc91", "scale", 10],
    shiner: ["#c1eeee", "scale", 14],
    leech: ["#ccb0c7", "drop", 8],
    moth: ["#f3d597", "dust", 19],
    mite: ["#cf9573", "chip", 9],
    blight: ["#e7a0b5", "dust", 21],
    ape: ["#bc966e", "chip", 13],
    mantis: ["#c0cf88", "chip", 11],
    hunter: ["#e4bcb0", "scale", 14],
    pike: ["#a2d1b4", "scale", 12]
  };
  function drawCombat(ctx2, project2, game2, time) {
    ctx2.save();
    const hero2 = game2.hero, swing = game2.swing;
    if (swing) {
      const u = (time - swing.t) / swing.duration, move = moves[hero2.form];
      if (u > 0.24 && u < 1) {
        const v = (u - 0.24) / 0.76;
        sweep(ctx2, project2, { ...hero2, angle: swing.angle }, move, v, Math.sin(Math.PI * v), colors[move] || "#e7dfb9", bodySize(hero2), ["engulf", "divide", "silk", "snap", "stoop"].includes(move));
      }
    }
    for (const e of game2.enemies) {
      if (!e.live || !e.phase || e.phase === "stalk" || Math.hypot(e.x - hero2.x, e.z - hero2.z) > 13 || !clearStrike(hero2, e, game2.world.solids)) continue;
      const h = hunts[e.type], size = bodySize(e);
      if (e.phase === "windup") {
        const u = Math.min(1, e.age / h.wind), p = project2(e.x, e.y + size * 2.35, e.z);
        if (p && p.depth > 0.17) {
          ctx2.globalAlpha = 0.68 + 0.31 * u;
          ctx2.lineCap = "round";
          ctx2.lineWidth = 2;
          ctx2.strokeStyle = "#ffbe89";
          ctx2.beginPath();
          ctx2.arc(p.x, p.y, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u);
          ctx2.stroke();
          ctx2.font = "600 12px system-ui";
          ctx2.textAlign = "center";
          ctx2.lineWidth = 3;
          ctx2.strokeStyle = "#243330";
          ctx2.strokeText(h.move, p.x, p.y - 11);
          ctx2.fillStyle = "#ffe2b7";
          ctx2.fillText(h.move, p.x, p.y - 11);
        }
      } else if (e.phase === "strike") {
        const u = Math.min(1, e.age / h.strike), move = { ape: "hammer", pike: "sting", hunter: "snap", mite: "stoop", mantis: "snap" }[e.type];
        sweep(ctx2, project2, e, move, u, 0.94 * Math.sin(Math.PI * u), "#ffc39e", size, e.type === "mantis");
      }
    }
    const hit = game2.impact;
    if (hit) {
      const f = (time - hit.t) / 0.59, p = project2(hit.x, hit.y, hit.z);
      if (p && f >= 0 && f < 1) {
        const [color, shape, count] = debris[hit.type] || debris.mite;
        ctx2.fillStyle = ctx2.strokeStyle = color;
        ctx2.lineWidth = 1.2;
        ctx2.globalAlpha = 1 - f;
        for (let i = 0; i < (hit.killed ? count : 5); i++) {
          const a = i * 2.39996, d = (0.1 + f * (0.64 + i % 7 * 0.14)) * p.k * hit.size, x = p.x + d * Math.cos(a), y = p.y + d * Math.sin(a) * 0.72 + p.k * hit.size * (shape === "chip" ? 0.57 * f * f : -0.41 * f);
          const r = Math.max(0.65, Math.min(4, p.k * hit.size * (0.023 + 8e-3 * (i % 3)) * (1 - f * 0.66)));
          ctx2.beginPath();
          if (shape === "scale" || shape === "chip") {
            ctx2.moveTo(x - r, y);
            ctx2.lineTo(x + 0.3 * r, y - r * 1.8);
            ctx2.lineTo(x + r * 1.4, y + r * 0.4);
            ctx2.closePath();
            ctx2.fill();
          } else {
            ctx2.arc(x, y, r, 0, Math.PI * 2);
            if (shape === "bubble") ctx2.stroke();
            else ctx2.fill();
          }
        }
      }
    }
    ctx2.restore();
  }

  // src/renderer.js
  var canvas = document.createElement("canvas");
  var stage = document.querySelector("#stage");
  stage.append(canvas);
  canvas.style.zIndex = "1";
  var drawGPU = null;
  import("./gpu-engine.js").then((m) => {
    drawGPU = m.bootGPU(stage);
  }).catch((err) => console.warn("Using the painted renderer", err));
  var ctx = canvas.getContext("2d");
  var mainContext = ctx;
  var floorCanvas = document.createElement("canvas");
  var floorContext = floorCanvas.getContext("2d");
  var floorKey = "";
  var camera = { x: 0, y: 12, z: 20, tilt: 0.48 };
  var width;
  var height;
  var focal;
  var commands = [];
  var submergedView = false;
  function resize() {
    width = innerWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio, 1.5);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    floorCanvas.width = canvas.width;
    floorCanvas.height = canvas.height;
    floorContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    floorKey = "";
    focal = Math.min(height * 0.99, width * 1.12);
  }
  resize();
  window.addEventListener("resize", resize);
  function project(x, y, z) {
    const ox = x - camera.x, oz = camera.z - z, yaw = camera.yaw || 0, dx = ox * Math.cos(yaw) - oz * Math.sin(yaw), dy = y - camera.y, dz = oz * Math.cos(yaw) + ox * Math.sin(yaw), c = Math.cos(camera.tilt), s = Math.sin(camera.tilt);
    const depth = dz * c - dy * s;
    if (depth < 0.038) return null;
    return { x: width / 2 + dx * focal / depth, y: height * 0.49 - (dy * c + dz * s) * focal / depth, k: focal / depth, depth };
  }
  var shades = /* @__PURE__ */ new Map();
  function shadow(color) {
    if (!shades.has(color)) {
      const n = parseInt(color.slice(1), 16);
      shades.set(color, "rgb(" + [n >> 16, n >> 8 & 255, n & 255].map((v) => Math.round(v * 0.71)).join(",") + ")");
    }
    return shades.get(color);
  }
  function worldModel(x, y, z, size = 1, angle = 0) {
    const farUnderwater = submergedView && (ground(x, z) > 0.3 && Math.hypot(x - camera.x, z - camera.z) > 16 || Math.hypot(x - camera.x, z - camera.z) > 39);
    if (farUnderwater) return { oval() {
    }, limb() {
    } };
    const c = Math.cos(angle), s = Math.sin(angle);
    function point(a, b, d) {
      return project(x + size * (a * c + d * s), y + size * b, z + size * (d * c - a * s));
    }
    return {
      oval(a, b, d, rx, ry, rz, color) {
        const p = point(a, b, d);
        if (!p || p.depth < Math.max(rx, ry, rz) * size * 1.65) return;
        const axis = [point(a + rx, b, d), point(a, b + ry, d), point(a, b, d + rz)];
        if (axis.some((v) => !v)) return;
        let xx = 0, xy = 0, yy = 0;
        for (const v of axis) {
          let u = v.x - p.x, w = v.y - p.y;
          xx += u * u;
          xy += u * w;
          yy += w * w;
        }
        let diff = Math.hypot(xx - yy, 2 * xy), r = Math.sqrt((xx + yy + diff) / 2), q = Math.sqrt(Math.max(0.1, (xx + yy - diff) / 2));
        if (p.x + r < 0 || p.x - r > width || p.y + r < 0 || p.y - r > height) return;
        commands.push({ depth: p.depth, draw() {
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, r, q, Math.atan2(2 * xy, xx - yy) / 2, 0, Math.PI * 2);
          const light = ctx.createLinearGradient(p.x - r * 0.55, p.y - r * 0.6, p.x + r * 0.45, p.y + r * 0.6);
          light.addColorStop(0, color);
          light.addColorStop(0.55, color);
          light.addColorStop(1, shadow(color));
          ctx.fillStyle = light;
          ctx.fill();
          ctx.strokeStyle = "#253f465b";
          ctx.lineWidth = Math.min(2, Math.max(0.5, p.k * 0.045));
          ctx.stroke();
        } });
      },
      limb(a, b, d, e, f, g, r, color, end = r * 0.68) {
        const A = point(a, b, d), B = point(e, f, g);
        if (!A || !B || Math.min(A.depth, B.depth) < Math.max(0.05, r * size * 1.5)) return;
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, R = r * A.k * size, S = end * B.k * size;
        commands.push({ depth: (A.depth + B.depth) / 2, draw() {
          ctx.beginPath();
          ctx.moveTo(A.x + nx * R, A.y + ny * R);
          ctx.lineTo(B.x + nx * S, B.y + ny * S);
          ctx.lineTo(B.x - nx * S, B.y - ny * S);
          ctx.lineTo(A.x - nx * R, A.y - ny * R);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = "#3344475c";
          ctx.lineWidth = 1;
          ctx.stroke();
        } });
      }
    };
  }
  var props = [];
  function backdrop(time) {
    const water = camera.y < 0 && ground(camera.x, camera.z) < 0;
    if (water) {
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, "#72b3aa");
      g.addColorStop(0.21, "#337f7c");
      g.addColorStop(0.6, "#174e54");
      g.addColorStop(1, "#0a353b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      if (isReady(deepBackground)) {
        const img = deepBackground, scale = Math.max(width / img.width, height / img.height) * 1.08, w = img.width * scale, h = img.height * scale;
        const turn = camera.yaw / (Math.PI * 1.5) + camera.x * 18e-4;
        const scroll = (turn % 2 + 2) % 2, shift = scroll * w, top = (height - h) * 0.54 + Math.min(0, camera.y + 2) * 2;
        for (let i = -1; i < 4; i++) {
          const x = i * w - shift;
          if (x > width || x + w < 0) continue;
          ctx.save();
          ctx.translate(x + (i % 2 ? w : 0), top);
          if (i % 2) ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, w, h);
          ctx.restore();
        }
      }
      return;
    }
    if (isReady(forestBackground)) {
      const im = forestBackground, sc = Math.max(width / im.width, height / im.height) * 1.1, w = im.width * sc, h = im.height * sc;
      const shift = ((camera.yaw / (Math.PI * 1.5) + camera.x * 1e-3) % 2 + 2) % 2 * w;
      for (let i = -1; i < 4; i++) {
        const x = i * w - shift;
        if (x > width || x + w < 0) continue;
        ctx.save();
        ctx.translate(x + (i % 2 ? w : 0), (height - h) * 0.28);
        if (i % 2) ctx.scale(-1, 1);
        ctx.drawImage(im, 0, 0, w, h);
        ctx.restore();
      }
      return;
    }
    let grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#4b456f");
    grad.addColorStop(0.4, "#d99790");
    grad.addColorStop(0.64, "#f5cc93");
    grad.addColorStop(1, "#74897e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffe7a8";
    ctx.beginPath();
    ctx.arc(width * 0.76, height * 0.17, height * 0.076, 0, Math.PI * 2);
    ctx.fill();
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ["#94859a", "#688797", "#476c77"][layer];
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i <= 90; i++) {
        let x = width * i / 90, a = i * 0.21 + layer * 2 + camera.x * 8e-3;
        ctx.lineTo(x, height * (0.29 + layer * 0.052 + 0.045 * Math.sin(a) + 0.027 * Math.sin(a * 2.6)));
      }
      ctx.lineTo(width, height);
      ctx.fill();
    }
  }
  function eyeDepth(v) {
    const dx = v[0] - camera.x, dz = camera.z - v[2], forward = dz * Math.cos(camera.yaw) + dx * Math.sin(camera.yaw);
    return forward * Math.cos(camera.tilt) - (v[1] - camera.y) * Math.sin(camera.tilt);
  }
  function clipPoly(poly, measure) {
    const result = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], ha = measure(a), hb = measure(b);
      if (ha >= 0) result.push(a);
      if (ha < 0 !== hb < 0) {
        const u = ha / (ha - hb);
        result.push(a.map((v, k) => v + (b[k] - v) * u));
      }
    }
    return result;
  }
  var meshCache = /* @__PURE__ */ new Map();
  function sample(x, z) {
    const k = x + "," + z;
    if (!meshCache.has(k)) {
      if (meshCache.size > 14e3) meshCache.clear();
      meshCache.set(k, ground(x, z));
    }
    return meshCache.get(k);
  }
  function polygon(points2, color, material, depth) {
    const v = clipPoly(points2, (p) => eyeDepth(p) - 0.16);
    if (v.length < 3) return;
    const screen = v.map((p) => project(...p));
    if (screen.some((p) => !p)) return;
    if (screen.every((p) => p.x < 0) || screen.every((p) => p.x > width) || screen.every((p) => p.y < 0) || screen.every((p) => p.y > height)) return;
    const pattern = material && terrainPattern(ctx, material);
    function path(pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
    }
    return function() {
      const fade = material && submergedView ? Math.max(0, Math.min(1, (40 - depth) / 18)) : 1;
      if (fade <= 0) return;
      ctx.globalAlpha = fade;
      path(screen);
      ctx.fillStyle = color;
      ctx.fill();
      if (pattern && depth < (submergedView ? 39 : 70)) {
        const density = material === "moss" ? 122 : 112;
        for (let i = 1; i < screen.length - 1; i++) {
          const a = v[0], b = v[i], c = v[i + 1], A = screen[0], B = screen[i], C = screen[i + 1];
          const u = (b[0] - a[0]) * density, vv = (b[2] - a[2]) * density, w = (c[0] - a[0]) * density, h = (c[2] - a[2]) * density, det = u * h - w * vv;
          if (Math.abs(det) < 1e-3) continue;
          const x1 = B.x - A.x, x2 = C.x - A.x, y1 = B.y - A.y, y2 = C.y - A.y;
          const aa = (x1 * h - x2 * vv) / det, bb = (y1 * h - y2 * vv) / det, cc = (u * x2 - w * x1) / det, dd = (u * y2 - w * y1) / det;
          pattern.setTransform(new DOMMatrix([aa, bb, cc, dd, A.x - (aa * a[0] + cc * a[2]) * density, A.y - (bb * a[0] + dd * a[2]) * density]));
          path([A, B, C]);
          ctx.fillStyle = pattern;
          ctx.fill();
        }
        if (submergedView) {
          path(screen);
          ctx.fillStyle = "rgba(11,70,72," + Math.min(0.82, 0.35 + Math.max(0, depth) / 76) + ")";
          ctx.fill();
        } else if (depth > 18) {
          path(screen);
          ctx.fillStyle = "rgba(119,143,136," + Math.min(0.65, (depth - 18) / 110) + ")";
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };
  }
  function terrain(t) {
    const cache = [camera.x, camera.y, camera.z, camera.yaw, camera.tilt].map((v) => Math.round(v * 250)).join("/") + (terrainPattern(mainContext, "bed") ? "r" : "");
    if (submergedView) {
      if (floorKey === cache) {
        mainContext.drawImage(floorCanvas, 0, 0, width, height);
        return;
      }
      floorKey = cache;
      ctx = floorContext;
      ctx.clearRect(0, 0, width, height);
    } else floorKey = "";
    const tile = 3, radius = submergedView ? 39 : 54, ox = Math.floor(camera.x / tile) * tile, oz = Math.floor(camera.z / tile) * tile;
    const floor = [], surface = [];
    for (let z = oz - radius; z < oz + radius; z += tile) for (let x = ox - radius; x < ox + radius; x += tile) {
      const mid = eyeDepth([x + tile / 2, 0, z + tile / 2]);
      if (mid < -7) continue;
      const heights2 = [[x, sample(x, z), z], [x + tile, sample(x + tile, z), z], [x + tile, sample(x + tile, z + tile), z + tile], [x, sample(x, z + tile), z + tile]];
      if (submergedView && heights2.every((p) => p[1] > -0.47)) continue;
      const depth = eyeDepth([x + tile / 2, heights2.reduce((v, p) => v + p[1], 0) / 4, z + tile / 2]);
      for (const [low, high, shade, map] of [[-100, -0.55, "#426f68", "bed"], [-0.55, 0.82, "#bfa87e", "shore"], [0.82, 100, "#6e7951", "moss"]]) {
        const part = clipPoly(clipPoly(heights2, (p) => p[1] - low), (p) => high - p[1]), draw = polygon(part, shade, map, depth);
        if (draw) floor.push({ depth, draw });
      }
      if (!submergedView && heights2.some((p) => p[1] < 0)) {
        const wet = clipPoly(heights2, (p) => -p[1]).map((p) => [p[0], 0, p[2]]);
        const deep = heights2.reduce((v, p) => v + p[1], 0) / 4;
        const draw = polygon(wet, deep < -1.6 ? "rgba(38,106,108,.91)" : "rgba(76,139,131,.65)");
        if (draw) surface.push({ depth: mid, draw });
        if (deep < -0.45) {
          const wave = project(x + 1.3 + 0.18 * Math.sin(t * 0.58 + z), 0.02, z + 1.2), side = project(x + 1.74, 0.03, z + 1.18);
          if (wave && side && wave.x > 0 && wave.x < width && wave.y > 0 && wave.y < height) surface.push({ depth: mid - 0.04, draw() {
            ctx.strokeStyle = "rgba(218,225,192," + (0.19 + 0.1 * Math.sin(x * 3.2 + z + t * 0.7)) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(wave.x, wave.y);
            ctx.lineTo(side.x, side.y);
            ctx.stroke();
          } });
        }
      }
    }
    floor.sort((a, b) => b.depth - a.depth);
    for (const p of floor) p.draw();
    if (submergedView) {
      const blend = ctx.createLinearGradient(0, 0, 0, height);
      blend.addColorStop(0, "rgba(0,0,0,0)");
      blend.addColorStop(0.34, "rgba(0,0,0,0)");
      blend.addColorStop(0.53, "rgba(0,0,0,.06)");
      blend.addColorStop(0.72, "rgba(0,0,0,.40)");
      blend.addColorStop(0.88, "rgba(0,0,0,.82)");
      blend.addColorStop(1, "#000");
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = blend;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
      ctx = mainContext;
      ctx.drawImage(floorCanvas, 0, 0, width, height);
    }
    commands.push(...surface);
  }
  function contact(x, y, z, size, strength) {
    const p = project(x, y + 0.045, z);
    if (!p || p.depth < 0.3) return;
    const r = p.k * size;
    if (r < 2 || r > width * 1.3 || p.y > height + r || p.x + r < 0 || p.x - r > width) return;
    commands.push({ depth: p.depth + 0.13, draw() {
      const h = Math.max(1, r * 0.19);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(r, h);
      const ink = ctx.createRadialGradient(0, 0, 0.01, 0, 0, 1);
      ink.addColorStop(0, "rgba(12,22,18," + strength + ")");
      ink.addColorStop(1, "rgba(12,22,18,0)");
      ctx.fillStyle = ink;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    } });
  }
  function plant(name, x, y, z, h, phase, t) {
    const m = habitatPlate(name);
    if (!m) return;
    const scale = h / m.height, center = project(x, y + h * 0.46, z), anchor = project(x, y, z);
    if (!center || !anchor || center.depth < 0.35) return;
    const distance2 = Math.hypot(x - camera.x, z - camera.z);
    if (submergedView && (distance2 > 38 || y > 0.1 && distance2 > 11)) return;
    const size = center.k * m.size * scale;
    const atX = anchor.x, atY = anchor.y, left = -size * m.anchor[0], top = -size * m.anchor[1];
    if (size < 2 || atX + left > width || atX + left + size < 0 || atY + top > height || atY + top + size < 0) return;
    const baseBlend = Math.max(0, Math.min(1, (atY / height - 0.48) / 0.42));
    const alpha = submergedView ? Math.min(1, Math.max(0, (39 - distance2) / 19)) * baseBlend * baseBlend : Math.min(1, Math.max(0.15, (91 - distance2) / 38));
    if (alpha < 0.025) return;
    if (distance2 < 19) contact(x, y, z, h * (name === "rock" ? 1 : 0.32), 0.4);
    commands.push({ depth: center.depth, draw() {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(atX, atY);
      ctx.scale(Math.sin(phase) < 0 ? -1 : 1, 1);
      if (name === "kelp" || name === "reed") ctx.transform(1, 0, 0.028 * Math.sin(t * 0.9 + phase), 1, 0, 0);
      ctx.drawImage(submergedView && m.submerged ? m.submerged : m.img, left, top, size, size);
      ctx.restore();
    } });
  }
  function animal(name, x, y, z, scale, angle, t, hit = 0, hero2 = false, pose = {}) {
    const m = animalPlate(name);
    if (!m) return;
    const pos = project(x, y + (m.centerY + (pose.lift || 0)) * scale + Math.sin(t * (hero2 ? 3 : 2.3)) * 0.028 * scale, z);
    if (!pos || pos.depth < 0.17) return;
    const size = pos.k * m.span * scale;
    if (size < 2 || pos.x + size / 2 < 0 || pos.x - size / 2 > width || pos.y + size / 2 < 0 || pos.y - size / 2 > height) return;
    const view = (Math.round((angle - Math.atan2(camera.x - x, camera.z - z)) * 4 / Math.PI) % 8 + 8) % 8;
    const altitude = y - ground(x, z);
    if (altitude < 4.5) contact(x, ground(x, z), z, scale * (1.3 + altitude * 0.07), Math.max(0.07, 0.38 - altitude * 0.06));
    const alpha = submergedView ? Math.max(0.15, Math.min(1, (39 - pos.depth) / 23)) : Math.max(0.3, Math.min(1, (65 - pos.depth) / 25));
    commands.push({ depth: pos.depth, draw() {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(pos.x, pos.y);
      ctx.rotate((pose.roll || 0) + 0.38 * (pose.pitch || 0) * Math.cos(angle - camera.yaw));
      const breath = name === "canopy-heart" ? 0 : Math.sin(t * (name === "bee" ? 10 : 3.8)) * 0.019;
      ctx.scale((1 + breath) * (pose.wide || 1) * Math.sqrt(pose.stretch || 1), (1 - breath * 0.65) / Math.sqrt(pose.stretch || 1));
      if (hit > 0) {
        ctx.shadowColor = "#ffe0a4";
        ctx.shadowBlur = 7;
      }
      ctx.drawImage(m.img, view % 4 * m.tile, Math.floor(view / 4) * m.tile, m.tile, m.tile, -size / 2, -size / 2, size, size);
      ctx.restore();
    } });
  }
  function habitat2(time, fallen, landmarks) {
    for (const item of [...props, ...nurseryBeds]) {
      const dist = Math.hypot(item.x - camera.x, item.z - camera.z);
      if (dist > (submergedView ? 38 : 67) || dist < 0.42) continue;
      const key = propFor(item);
      plant(key, item.x, ground(item.x, item.z), item.z, propHeight(item, key), item.x * 5.1 + item.z, time);
    }
    for (const mark of landmarks) {
      const h = ground(mark.x, mark.z);
      if (Math.hypot(mark.x - camera.x, mark.z - camera.z) < 70) plant(h < 0 ? "coral" : "tree", mark.x, h, mark.z, 7.2, mark.z, time);
    }
    if (!submergedView) {
      for (let i = 0; i < 32; i++) {
        const x = -145 + i * 9, z = -107 + Math.sin(i * 0.7) * 8;
        if (Math.hypot(x - camera.x, z - camera.z) < 88) plant("tree", x, ground(x, z), z, 13 + i % 3, i, time);
      }
    }
    const web = worldModel(-17, ground(-17, 2), 2);
    for (let i = 0; i < 8; i++) {
      let a = i * Math.PI / 4;
      web.limb(0, 2, 0, Math.cos(a) * 3, 2 + Math.sin(a) * 2.1, 0, 0.038, "#e5efd9");
      let b = a + Math.PI / 4;
      for (let r of [0.4, 0.75, 1]) web.limb(Math.cos(a) * 3 * r, 2 + Math.sin(a) * 2.1 * r, 0, Math.cos(b) * 3 * r, 2 + Math.sin(b) * 2.1 * r, 0, 0.024, "#dfeddc");
    }
    if (!submergedView && Math.hypot(camera.x, camera.z + 80) < 95) animal("canopy-heart", 0, ground(0, -80), -80, 1, 0, time);
    if (fallen && !submergedView) {
      const canopy = worldModel(0, ground(0, -80), -80);
      for (let i = 0; i < 26; i++) {
        const u = (time * 0.07 + i * 0.618) % 1, theta = i * 2.4 + u;
        canopy.oval(Math.cos(theta) * u * 6, 10 + u * 10, Math.sin(theta) * u * 6, 0.09, 0.1, 0.09, "#efc76c");
      }
    }
  }
  function render(game2, time, dt) {
    if (game2.intro) return;
    commands = [];
    const { hero: hero2, intro, partner: partner2 } = game2;
    props = game2.world.props;
    const yaw = game2.yaw || 0;
    const playerSize = bodySize(hero2);
    const behind = game2.firstPerson ? 0 : 7.2 * Math.sqrt(playerSize);
    const submerged = hero2.y + playerSize * 0.8 < 0 && ground(hero2.x, hero2.z) < 0;
    let cameraHeight = hero2.y + playerSize * (game2.firstPerson ? 1.05 : 4.05) + Math.sin(game2.pitch) * behind * 0.78;
    if (submerged) cameraHeight = Math.min(-0.13, cameraHeight);
    const target = intro ? { x: -1.7, y: -0.46, z: 39.5, tilt: 0.07 } : { x: hero2.x - Math.sin(yaw) * behind, y: cameraHeight, z: hero2.z + Math.cos(yaw) * behind, tilt: (game2.firstPerson ? 0.055 : submerged ? 0.09 : 0.15) + game2.pitch };
    if (!intro) {
      for (let i = 1; i <= 12; i++) {
        const u = i / 12, px = hero2.x + (target.x - hero2.x) * u, pz = hero2.z + (target.z - hero2.z) * u, py = hero2.y + playerSize + (target.y - hero2.y - playerSize) * u;
        const hit = ground(px, pz) > py - 0.08 || game2.world.solids.some((o) => py > o.base && py < o.top && Math.abs(o.x - px) < o.r + 0.12 && Math.hypot(o.x - px, o.z - pz) < o.r + 0.12);
        if (hit) {
          const v = Math.max(0, (i - 1) / 12);
          target.x = hero2.x + (target.x - hero2.x) * v;
          target.z = hero2.z + (target.z - hero2.z) * v;
          break;
        }
      }
      target.y = Math.max(target.y, ground(target.x, target.z) + 0.12);
      if (!game2.firstPerson) {
        const eyeToBody = Math.atan2(target.y - hero2.y - playerSize * 0.83, Math.max(0.12, Math.hypot(target.x - hero2.x, target.z - hero2.z)));
        const halfFOV = Math.atan(height / (2 * focal));
        target.tilt = Math.max(eyeToBody - halfFOV * 0.8, Math.min(eyeToBody + halfFOV * 0.72, target.tilt));
      }
    }
    camera.yaw = intro ? 0 : yaw;
    const smooth = game2.snap ? 1 : Math.min(1, dt * 10);
    for (const k of Object.keys(target)) camera[k] += (target[k] - camera[k]) * smooth;
    game2.snap = false;
    submergedView = camera.y < 0;
    let accelerated = false;
    if (drawGPU) {
      try {
        accelerated = drawGPU(game2, camera, time);
      } catch (error) {
        console.warn("Using painted habitats", error);
        drawGPU = null;
      }
    }
    if (accelerated) ctx.clearRect(0, 0, width, height);
    else {
      backdrop(time);
      terrain(time);
      habitat2(time, game2.fallen, game2.world.landmarks);
      for (const a of game2.items) if (a.live && Math.hypot(a.x - camera.x, a.z - camera.z) < 42) animal(a.type, a.x, a.y, a.z, scaleOf(a.type), a.angle, time + a.seed, a.hit);
      for (const e of game2.enemies) if (e.live && Math.hypot(e.x - camera.x, e.z - camera.z) < 48) animal(e.type, e.x, e.y, e.z, scaleOf(e.type), e.angle, time, e.hit, false, predatorPose(e));
      animal("lantern", partner2.x, partner2.y, partner2.z, scaleOf(partner2.form), partner2.angle, time);
      if (!game2.firstPerson) animal(hero2.form, hero2.x, hero2.y, hero2.z, playerSize, hero2.angle, time, 0, true, playerPose(game2, time));
      const meal = feedingPose(game2, time);
      if (meal) animal(meal.type, meal.x, meal.y, meal.z, scaleOf(meal.type) * meal.scale, meal.angle, time, 0, false, meal.pose);
      commands.sort((a, b) => b.depth - a.depth);
      for (const c of commands) c.draw();
      if (submergedView) {
        for (let j = 0; j < 62; j++) {
          const px = ((j * 0.6180339 * width + Math.sin(time * 0.24 + j) * 9 - camera.yaw * (14 + j % 17)) % width + width) % width;
          const py = ((j * 83 - time * (2 + j % 5)) % height + height) % height;
          ctx.fillStyle = j % 4 ? "rgba(209,231,196,.33)" : "rgba(229,225,182,.62)";
          ctx.beginPath();
          ctx.arc(px, py, 0.55 + j % 3 * 0.35, 0, 6.29);
          ctx.fill();
        }
      }
    }
    if (!intro) {
      const guide = game2.guide;
      if (guide?.live && !game2.huntComplete) {
        const p = project(guide.x, guide.y + bodySize(guide) * 1.65, guide.z);
        if (p && p.depth < 38 && p.x > 24 && p.x < width - 24 && p.y > 32 && p.y < height - 32) {
          const y = p.y - 5;
          ctx.save();
          ctx.translate(p.x, y);
          ctx.beginPath();
          ctx.moveTo(-4, -5);
          ctx.lineTo(0, 0);
          ctx.lineTo(4, -5);
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#19312d";
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#ffe2a1";
          ctx.stroke();
          ctx.restore();
        }
      }
      if (game2.firstPerson) {
        ctx.beginPath();
        ctx.arc(width / 2, height * 0.5, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#f2f3c6";
        ctx.fill();
      }
      drawCombat(ctx, project, game2, time);
      for (const a of [...game2.items, ...game2.enemies]) {
        if (!a.live || a.hp === a.maxHP) continue;
        const pt = project(a.x, a.y + scaleOf(a.type) * 2.1, a.z);
        if (pt) {
          ctx.fillStyle = "#253d43";
          ctx.fillRect(pt.x - 13, pt.y, 26, 4);
          ctx.fillStyle = "#ffc690";
          ctx.fillRect(pt.x - 13, pt.y, 26 * a.hp / a.maxHP, 4);
        }
      }
    }
  }

  // src/ecology.js
  var habitats = [
    { name: "Primordial lagoon", x: 0, z: 42, tint: "#348993", accent: "#77ede4" },
    { name: "Glassfin reef", x: 82, z: 85, tint: "#477ea3", accent: "#f8a59f" },
    { name: "Silkwood hollow", x: -77, z: 5, tint: "#716389", accent: "#b5a2ff" },
    { name: "Amber meadow", x: 85, z: -40, tint: "#949755", accent: "#ffd07d" },
    { name: "Seedfall grove", x: 0, z: -88, tint: "#58795a", accent: "#bdd87c" },
    { name: "Spore marsh", x: -87, z: 102, tint: "#487a70", accent: "#a6f0ba" }
  ];
  var forms = {
    amoeba: { name: "Amoeba", prey: "microbe", quota: 8, action: "Engulf", next: ["colony"] },
    colony: { name: "Cell colony", prey: "microbe", quota: 12, action: "Engulf", next: ["fish"] },
    fish: { name: "Glassfin", prey: "minnow", quota: 14, action: "Bite", next: ["lungfish"] },
    lungfish: { name: "Lungfish", prey: "minnow", quota: 14, action: "Snap", next: ["spider", "bee"] },
    spider: { name: "Silk hunter", prey: "moth", quota: 10, action: "Web strike", next: ["bird"] },
    bird: { name: "Canopy bird", prey: "moth", quota: 12, action: "Swoop", next: ["ape"] },
    ape: { name: "Toolmaker", prey: "mite", quota: 12, action: "Strike", next: ["bee"] },
    bee: { name: "Pollinator", prey: "mite", quota: 10, action: "Sting", next: ["cleaner", "sapling"] },
    cleaner: { name: "Cleaner fish", prey: "leech", quota: 12, action: "Pluck", next: ["worm"] },
    worm: { name: "Earthworm", prey: "leech", quota: 10, action: "Pinch", next: ["snail"] },
    snail: { name: "Shell grazer", prey: "mite", quota: 12, action: "Crush", next: ["sapling"] },
    sapling: { name: "Rooted shoot", prey: "blight", quota: 12, action: "Root lash", next: ["tree"] },
    tree: { name: "Fruit tree", prey: "blight", quota: 16, action: "Vine lash", next: [] }
  };
  var species = {
    microbe: { label: "Drifter", name: "drifter cells", color: "#c9f68a", hp: 1, speed: 1.8 },
    shiner: { label: "Silver shiner", name: "silver shiners", color: "#c6dede", hp: 2, speed: 3.6 },
    minnow: { label: "Glass minnow", name: "shoal fish", color: "#ffb585", hp: 3, speed: 3.1 },
    moth: { label: "Lantern moth", name: "lantern moths", color: "#ffe098", hp: 2, speed: 2.7 },
    mite: { label: "Red mite", name: "red mites", color: "#fa9279", hp: 2, speed: 3.4 },
    leech: { label: "Marsh leech", name: "marsh leeches", color: "#c4a1e8", hp: 2, speed: 2.5 },
    blight: { label: "Blight spore", name: "blight spores", color: "#f39aab", hp: 3, speed: 1.9 }
  };
  var traits = [
    { id: "bite", branch: "Predation", name: "Serrated bite", desc: "+1 damage per strike" },
    { id: "reach", branch: "Predation", name: "Lunging strike", desc: "Extend strike range by 40%", parent: "bite" },
    { id: "swim", branch: "Motion", name: "Streamlined body", desc: "Move 25% faster" },
    { id: "reflex", branch: "Motion", name: "Quick reflex", desc: "Strike again 35% sooner", parent: "swim" },
    { id: "shell", branch: "Survival", name: "Tough membrane", desc: "Gain one heart immediately" },
    { id: "heal", branch: "Survival", name: "Regeneration", desc: "Recover one heart after each kill", parent: "shell" }
  ];

  // src/chunks.js
  var SIZE = 40;
  function hash(x, z, salt = 0) {
    let n = Math.imul(x | 0, 1597334677) ^ Math.imul(z | 0, 3812015801) ^ Math.imul(salt + 7, 2246822519);
    n = Math.imul(n ^ n >>> 16, 2246822519);
    return ((n ^ n >>> 13) >>> 0) / 4294967296;
  }
  function biomeAt(x, z) {
    const scale = 76, cx = Math.floor(x / scale), cz = Math.floor(z / scale);
    let best = Infinity, index = 0;
    for (let a = cx - 1; a <= cx + 1; a++) for (let b = cz - 1; b <= cz + 1; b++) {
      const px = (a + 0.18 + 0.64 * hash(a, b, 1)) * scale, pz = (b + 0.18 + 0.64 * hash(a, b, 2)) * scale, d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < best) {
        best = d;
        index = a === 0 && b === 0 ? 0 : Math.floor(hash(a, b, 5) * habitats.length);
      }
    }
    const wet = ground(x, z) < 0;
    return wet ? habitats[index % 2] : habitats[2 + index % 4];
  }
  function makeWorld(consumed = []) {
    const cache = /* @__PURE__ */ new Map(), removed = new Set(consumed);
    let lastKey = "";
    const world2 = { props: [], items: [], enemies: [], landmarks: [], solids: [] };
    function build(x, z, type) {
      const props2 = [], items = [], enemies = [], landmarks = [], solids = [];
      for (let i = 0; i < 30; i++) props2.push({ x: (x + hash(x, z, 11 + i * 3)) * SIZE, z: (z + hash(x, z, 12 + i * 3)) * SIZE, s: 0.5 + hash(x, z, 13 + i * 3) * 1.45, n: i % 7 });
      for (let j = 0; j < 7; j++) {
        const px = (x + hash(x, z, 410 + j * 3)) * SIZE, pz = (z + hash(x, z, 411 + j * 3)) * SIZE;
        if (ground(px, pz) < -1.35) props2.push({ x: px, z: pz, s: 0.65 + hash(x, z, 412 + j * 3) * 0.85, n: j % 3 ? 7 : 8 });
      }
      function prey(id, px, pz, seed, depth, school, kind = type) {
        if (!fits(kind, px, pz)) return;
        items.push({ id, type: kind, x: px, z: pz, homeX: px, homeZ: pz, y: levelFor(kind, px, pz, depth), angle: seed, seed, depth, school, live: !removed.has(id), hp: species[kind].hp, maxHP: species[kind].hp, hit: 0 });
      }
      if (type === "minnow") {
        if (x === 0 && z === 0) {
          for (let j = 0; j < 5; j++) {
            const a = 2.39996 * j;
            prey("nursery/minnow/" + j, 1.9 + 1.2 * Math.cos(a), 29.1 + 0.85 * Math.sin(a), 1.3 + j * 0.62, 6.1 + j * 0.23, 1.3, j === 4 ? "shiner" : "minnow");
          }
        }
        const spacing = SIZE / 3;
        for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
          const gx = x * 3 + col, gz = z * 3 + row, phase = hash(gx, gz, 218) * 2 * Math.PI;
          const cx = (gx + 0.24 + 0.52 * hash(gx, gz, 201)) * spacing, cz = (gz + 0.24 + 0.52 * hash(gx, gz, 202)) * spacing;
          const water = -ground(cx, cz);
          if (water < 1.5) continue;
          const band = ((gx + gz * 2) % 3 + 3) % 3, depth = Math.max(1.05, water * [0.24, 0.56, 0.86][band] - 0.15);
          const count = 3 + Math.floor(hash(gx, gz, 203) * 3);
          for (let j = 0; j < count; j++) {
            const a = phase + j * 2.39996, r = j === 0 ? 0 : 0.8 + 0.95 * hash(gx, gz, 240 + j);
            const px = cx + Math.cos(a) * r, pz = cz + Math.sin(a) * r;
            prey([gx, gz, type, j].join("/"), px, pz, phase + j * 0.62, depth + (j % 3 - 1) * 0.21, phase, hash(gx, gz, 204) < 0.38 ? "shiner" : "minnow");
          }
        }
      } else {
        for (let i = 0; i < (type === "microbe" ? 26 : 17); i++) {
          let px = (x + hash(x, z, 130 + i)) * SIZE, pz = (z + hash(x, z, 150 + i)) * SIZE;
          if (x === 0 && z === 0 && i < 3) {
            px = [0.13, 0.42, -0.34][i];
            pz = [35.48, 34.2, 32.9][i];
          }
          prey([x, z, type, i].join("/"), px, pz, hash(x, z, 110 + i) * 6.28, 2.4);
        }
      }
      for (let k = 0; k < 2; k++) {
        if (hash(x, z, 43 + k * 20) < (k ? 0.46 : 0.22)) continue;
        const px = (x + 0.14 + 0.72 * hash(x, z, 310 + k)) * SIZE, pz = (z + 0.14 + 0.72 * hash(x, z, 320 + k)) * SIZE;
        const water = ground(px, pz) < 0, kind = water ? k ? "pike" : "hunter" : k ? "mantis" : hash(x, z, 333) > 0.48 ? "ape" : "mite";
        if (!fits(kind, px, pz) || Math.hypot(px, pz - 36) < 11) continue;
        const depth = water ? Math.max(1.4, -ground(px, pz) * (k ? 0.78 : 0.44)) : 0;
        const id = [x, z, "predator", k].join("/"), hp = { ape: 7, pike: 5, hunter: 6, mantis: 4, mite: 3 }[kind];
        enemies.push({ id, predator: true, live: !removed.has(id), hp, maxHP: hp, type: kind, x: px, z: pz, homeX: px, homeZ: pz, y: levelFor(kind, px, pz, depth), angle: 0, depth });
      }
      const biome = biomeAt((x + 0.5) * SIZE, (z + 0.5) * SIZE);
      if (hash(x, z, 89) > 0.78) landmarks.push({ x: (x + 0.57) * SIZE, z: (z + 0.21) * SIZE, type: biome.name });
      function solid(px, pz, r, base, top) {
        solids.push({ x: px, z: pz, r, base, top });
      }
      for (const p of props2) {
        const b = ground(p.x, p.z), s = p.s;
        if (p.n === 7) {
          solid(p.x, p.z, 0.7 * s, b, b + 0.45 * s);
        } else if (p.n === 8) {
          solid(p.x, p.z, 0.6 * s, b, b + 1.6 * s);
        } else if (p.n === 0) {
          solid(p.x, p.z, 0.96 * s, b, b + 1.25 * s);
          const a = p.x * 3.71 + p.z;
          solid(p.x + 0.68 * s * Math.cos(a), p.z - 0.68 * s * Math.sin(a), 0.53 * s, b, b + 0.71 * s);
        } else if (Math.abs(b) < 0.9 && p.n > 1) continue;
        else if (b < 0 && p.n >= 4) solid(p.x, p.z, 0.72 * s, b, b + 1.85 * s);
        else if (b >= 0 && p.n < 4) {
          solid(p.x, p.z, 0.27 * s, b, b + 2.15 * s);
          solid(p.x, p.z, 0.83 * s, b + 1.34 * s, b + 2.15 * s);
        }
      }
      for (const mark of landmarks) {
        const b = ground(mark.x, mark.z);
        if (b < 0) {
          const yaw = mark.z;
          for (let j = -3; j <= 3; j++) {
            const side = j * 1.05;
            solid(mark.x + side * Math.cos(yaw), mark.z - side * Math.sin(yaw), 0.65, b + (j ? Math.abs(j) * 0.56 : 0), b + 7.15 - Math.abs(j) * 0.46);
          }
        } else solid(mark.x, mark.z, 0.82, b, b + 7.2);
      }
      return { props: props2, items, enemies, landmarks, solids };
    }
    world2.stream = (px, pz, type) => {
      const x = Math.floor(px / SIZE), z = Math.floor(pz / SIZE), key = [x, z, type].join("/");
      if (key === lastKey) return;
      lastKey = key;
      const needed = /* @__PURE__ */ new Set(), lists = { props: [], items: [], enemies: [], landmarks: [], solids: [] };
      for (let a = x - 2; a <= x + 2; a++) for (let b = z - 2; b <= z + 2; b++) {
        const k = [a, b, type].join("/");
        needed.add(k);
        if (!cache.has(k)) cache.set(k, build(a, b, type));
        const chunk = cache.get(k);
        for (const field of Object.keys(lists)) lists[field].push(...chunk[field]);
      }
      for (const k of cache.keys()) if (!needed.has(k)) cache.delete(k);
      function trunk(x2, z2, r, h) {
        const b = ground(x2, z2);
        lists.solids.push({ x: x2, z: z2, r, base: b, top: b + h });
      }
      for (const side of [-1, 1]) {
        trunk(side * 9.6, -80 - side * 1.2, 2.05, 7);
        const base = ground(0, -80);
        lists.solids.push({ x: side * 6.7, z: -80, r: 2, base: base + 7, top: base + 15 });
      }
      lists.solids.push({ x: 0, z: -80, r: 3.9, base: ground(0, -80) + 14, top: ground(0, -80) + 18 });
      for (let i = 0; i < 32; i++) trunk(-145 + i * 9, -107 + Math.sin(i * 0.7) * 8, 1.35, 15);
      for (const actor of [...lists.items, ...lists.enemies]) {
        const s = scaleOf(actor.type), depth = actor.depth ?? (actor.type === "hunter" ? 3.3 : 2.4);
        const clear = (x2, z2) => !blocked(x2, z2, levelFor(actor.type, x2, z2, depth), 0.6 * s, 1.65 * s, lists.solids);
        if (resolveHabitat(actor, actor.type, clear)) {
          actor.homeX = actor.x;
          actor.homeZ = actor.z;
          actor.y = levelFor(actor.type, actor.x, actor.z, depth);
        }
      }
      Object.assign(world2, lists);
    };
    world2.kill = (a) => {
      removed.add(a.id);
      a.live = false;
    };
    world2.consumed = () => Array.from(removed);
    return world2;
  }

  // src/game.js
  var SAVE_KEY = "mawseed.lineage.v1";
  function readRun() {
    try {
      const keys2 = [SAVE_KEY, ...Object.keys(localStorage).filter((k) => k !== SAVE_KEY && k.endsWith(".lineage.v1"))];
      for (const key of keys2) {
        let r;
        try {
          r = JSON.parse(localStorage.getItem(key));
        } catch {
          continue;
        }
        if (r && Object.hasOwn(forms, r.form) && ["kills", "total", "era", "life", "revision"].every((k) => Number.isSafeInteger(r[k]) && r[k] >= 0) && ["x", "z", "depth", "yaw"].every((k) => Number.isFinite(r.checkpoint?.[k])) && Array.isArray(r.learned) && Array.isArray(r.consumed)) {
          if (key !== SAVE_KEY) localStorage.setItem(SAVE_KEY, JSON.stringify(r));
          return r;
        }
      }
    } catch {
    }
    return null;
  }
  var savedRun = readRun();
  var saveRevision = savedRun?.revision || 0;
  var $ = (id) => document.getElementById(id);
  var keys = /* @__PURE__ */ new Set();
  var world = makeWorld(savedRun?.consumed);
  var hero = { x: 0, z: 36, y: 0, angle: 0, form: "amoeba", player: true, size: scaleOf("amoeba") * 0.68 };
  var partner = { x: -4, z: 29, y: 0, angle: 0, form: "amoeba", mode: "scout", timer: 24, waypoint: 0 };
  var game = { hero, partner, world, intro: true, firstPerson: false, yaw: 0, pitch: 0, snap: true, fallen: false };
  var learned = /* @__PURE__ */ new Set();
  var discovered = /* @__PURE__ */ new Set();
  var swimDepth = 2.4;
  var damageUntil = 0;
  var reserve = 1;
  var exposure = 0;
  var guideAt = 0;
  var checkpoint = { x: hero.x, z: hero.z, yaw: 0, depth: swimDepth };
  var playing = false;
  var chapter = "";
  var health = 3;
  var immunity = 0;
  var cooldown = 0;
  var kills = 0;
  var total = 0;
  var xp = 0;
  var points = 0;
  var life = 1;
  var clock = 0;
  var last = 0;
  var signalUntil = 0;
  var radioUntil = 0;
  var uiAt = 0;
  var era = 0;
  var tips = {
    amoeba: "Engulf nearby drifting cells. Your short reach makes positioning matter.",
    colony: "Your larger membrane reaches farther. Each meal expands your colony. Finish the hunt to grow fins.",
    fish: "Follow a shoal or use Find prey. Match the fish\u2019s depth before biting.",
    lungfish: "Surface to refill your air. Your fins can carry you across wet sand.",
    spider: "A web strike briefly pins a surviving target in place.",
    bird: "Rise above rocks, then descend to the height of your prey.",
    ape: "A tool strike hits harder against ground-dwelling mites.",
    bee: "Fly just above the plants and sting the mites feeding nearby.",
    cleaner: "Remove leeches in the shallows. Match their depth before you bite.",
    worm: "Follow the damp bank. Land leeches are within reach from the soil.",
    snail: "Your shell absorbs one predator hit each life as a grazer.",
    sapling: "Use your roots to lash blight spores near the ground.",
    tree: "Lash the last blight spores to release the Canopy Heart\u2019s seeds."
  };
  var shellGuard = false;
  var formTipUntil = 0;
  function saveRun() {
    try {
      const last2 = JSON.parse(localStorage.getItem(SAVE_KEY));
      if ((last2?.revision || 0) !== saveRevision) return;
      const record = { revision: saveRevision + 1, form: hero.form, kills, total, era, life, checkpoint, learned: [...learned], consumed: world.consumed(), fallen: game.fallen, defeated: !!game.defeat || chapter === "REBIRTH" };
      localStorage.setItem(SAVE_KEY, JSON.stringify(record));
      saveRevision = record.revision;
    } catch {
    }
  }
  function restoreRun(r) {
    era = r.era;
    hero.form = r.form;
    kills = r.kills;
    total = r.total;
    xp = total * 10;
    life = Math.max(1, r.life) + (r.defeated ? 1 : 0);
    for (const id of r.learned) if (traits.some((t) => t.id === id)) learned.add(id);
    points = Math.max(0, Math.floor(total / 3) - learned.size);
    game.fallen = !!r.fallen;
    checkpoint = { ...r.checkpoint };
    hero.x = checkpoint.x;
    hero.z = checkpoint.z;
    game.yaw = checkpoint.yaw;
    swimDepth = checkpoint.depth;
    hero.size = growthSize();
    health = maxHealth();
    shellGuard = hero.form === "snail";
    immunity = 5;
    sync();
    placeForm(hero.form, true);
    sync();
    focusPrey();
  }
  function form() {
    return forms[hero.form];
  }
  function maxHealth() {
    return learned.has("shell") ? 4 : 3;
  }
  function sync() {
    world.stream(hero.x, hero.z, form().prey);
    game.items = world.items;
    game.enemies = world.enemies;
  }
  function distance(o) {
    return Math.hypot(hero.x - o.x, hero.z - o.z);
  }
  function bodyDistance(o) {
    const preyScale = bodySize(o), heroScale = bodySize(hero);
    return Math.hypot(o.x - hero.x, o.z - hero.z, o.y + preyScale * 0.7 - hero.y - heroScale * 0.7);
  }
  function nearest() {
    let closest = null, best = Infinity;
    for (const a of game.items) {
      if (!a.live) continue;
      const d = bodyDistance(a);
      if (d < best) {
        best = d;
        closest = a;
      }
    }
    if (!closest || clearStrike(hero, closest, world.solids)) return closest;
    let visible = null, limit = best + 12;
    for (const a of game.items) {
      if (!a.live || a === closest) continue;
      const d = bodyDistance(a);
      if (d < limit && clearStrike(hero, a, world.solids)) {
        visible = a;
        limit = d;
      }
    }
    return visible || closest;
  }
  function quota() {
    return form().quota + Math.min(3, era);
  }
  function maturity() {
    return Math.min(1, kills / quota());
  }
  function growthSize() {
    return scaleOf(hero.form) * (0.68 + 0.32 * maturity());
  }
  function focusPrey() {
    const a = nearest();
    if (!a) return;
    game.guide = a;
    game.pinnedPrey = a;
    const dx = a.x - hero.x, dz = a.z - hero.z;
    game.yaw = Math.atan2(dx, -dz);
    const size = bodySize(hero), swimming = hero.y + size * 0.8 < 0;
    let eye = hero.y + size * (game.firstPerson ? 1.05 : 4.05);
    if (swimming) eye = Math.min(-0.13, eye);
    const behind = game.firstPerson ? 0 : 7.2 * Math.sqrt(size), base = game.firstPerson ? 0.055 : swimming ? 0.09 : 0.15;
    game.pitch = Math.max(-0.98, Math.min(0.96, Math.atan2(eye - a.y - bodySize(a) * 0.85, Math.hypot(dx, dz) + behind) - base));
  }
  function guideReadout() {
    const a = game.guide;
    if (!a?.live) {
      $("preyCue").textContent = "Explore the habitat to find prey.";
      return;
    }
    const dx = a.x - hero.x, dz = a.z - hero.z, delta = Math.atan2(dx, -dz) - game.yaw;
    const turn = Math.atan2(Math.sin(delta), Math.cos(delta)), height2 = a.y + bodySize(a) * 0.85 - hero.y - bodySize(hero) * 0.85;
    const bearing = Math.abs(turn) < 0.48 ? "Ahead" : Math.abs(turn) > 2.55 ? "Behind" : turn < 0 ? "Left" : "Right";
    const vertical = Math.abs(height2) > 0.85 ? (height2 > 0 ? " \xB7 Above " : " \xB7 Below ") + Math.abs(height2).toFixed(1) + " m" : "";
    $("preyCue").textContent = species[a.type].label + " \xB7 " + bodyDistance(a).toFixed(1) + " m \xB7 " + bearing + vertical;
  }
  function say(s) {
    $("signal").textContent = s;
    signalUntil = clock + 2;
  }
  function radio(text) {
    $("radioText").textContent = text;
    $("radio").hidden = false;
    radioUntil = clock + 6;
  }
  function updateHUD() {
    const ready2 = kills >= quota(), f = form();
    game.huntComplete = ready2;
    $("place").textContent = biomeAt(hero.x, hero.z).name;
    $("form").textContent = f.name;
    $("vitals").textContent = "Health " + health + " / " + maxHealth() + "   \xB7   Life " + life;
    $("hpbar").max = maxHealth();
    $("hpbar").value = health;
    $("hpbar").classList.toggle("low", health === 1);
    $("growth").textContent = (kills >= quota() ? "Fully grown" : "Growing") + " \xB7 " + Math.round(100 * growthSize() / scaleOf(hero.form)) + "% adult size";
    $("findPrey").hidden = ready2;
    $("preyCue").hidden = ready2;
    $("objectiveTitle").textContent = ready2 ? "EVOLUTION READY" : "HUNT";
    $("task").textContent = ready2 ? hero.form === "tree" ? "Release the seeds" : "Choose your next form" : "Consume " + quota() + " " + species[f.prey].name;
    $("counter").textContent = Math.min(kills, quota()) + " / " + quota() + " kills";
    $("xp").textContent = xp + " XP \xB7 Lv " + (1 + Math.floor(total / 3));
    $("fill").style.width = Math.min(100, 100 * kills / quota()) + "%";
    $("points").textContent = points;
    $("verb").textContent = f.action;
    $("evolve").hidden = !ready2;
    $("cameraBtn").textContent = game.firstPerson ? "1st person" : "3rd person";
  }
  function button(label, fn) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = fn;
    return b;
  }
  function panel(kind, title, body) {
    if (game.defeat && kind !== "REBIRTH") return;
    playing = false;
    keys.clear();
    chapter = kind;
    $("chapter").textContent = kind;
    $("heading").textContent = title;
    $("story").textContent = body;
    $("actions").replaceChildren();
    $("panel").replaceChildren();
    $("close").hidden = kind === "REBIRTH";
    if (!$("dialog").open) $("dialog").showModal();
  }
  function resume() {
    if ($("dialog").open) $("dialog").close();
    keys.clear();
    playing = true;
    chapter = "";
  }
  function evolve() {
    if (!playing || game.defeat || kills < quota()) return;
    if (hero.form === "tree") {
      game.fallen = true;
      saveRun();
      panel("CANOPY HEART", "The first seedfall", "Your fruit splits open. A cloud of golden seeds lifts from the nursery arch. Start a new lineage with the skills your last one earned.");
      $("actions").append(button("Begin another lineage", () => {
        era++;
        life++;
        changeForm("amoeba");
        resume();
      }));
      return;
    }
    panel("EVOLUTION", "Choose your next form", "Your kills unlocked this adaptation. You can evolve here.");
    for (const next of form().next) $("actions").append(button(forms[next].name, () => {
      changeForm(next);
      resume();
      say("Evolved into " + forms[next].name);
    }));
  }
  function placeForm(next, safe = false) {
    const size = bodySize(hero);
    const clear = (x, z) => !blocked(x, z, playerLevel(next, x, z, swimDepth, size), size * 0.6, size * 1.65, world.solids) && (!safe || game.enemies.every((e) => e.live === false || Math.hypot(x - e.x, z - e.z) > 10));
    const shifted = resolveHabitat(hero, next, clear);
    hero.y = playerLevel(next, hero.x, hero.z, swimDepth, size);
    game.snap = true;
    return shifted;
  }
  function changeForm(next) {
    game.swing = null;
    game.dodge = null;
    hero.form = next;
    kills = 0;
    hero.size = growthSize();
    shellGuard = next === "snail";
    swimDepth = next === "lungfish" ? 0.25 : 2.4;
    reserve = 1;
    exposure = 0;
    game.meal = null;
    game.guide = null;
    game.pinnedPrey = null;
    game.pitch = 0;
    formTipUntil = clock + 7;
    $("fieldTip").textContent = tips[next];
    health = maxHealth();
    cooldown = 0;
    immunity = 2;
    sync();
    placeForm(next);
    sync();
    focusPrey();
    guideAt = clock + 0.18;
    checkpoint = { x: hero.x, z: hero.z, yaw: game.yaw, depth: swimDepth };
    updateHUD();
    guideReadout();
    saveRun();
  }
  function skills() {
    if (game.defeat) return;
    panel("ADAPTATIONS", "Skill tree", points + " skill point" + (points === 1 ? "" : "s") + " available. Earn one point for every three kills. Each trait costs one point.");
    const grid = document.createElement("div");
    grid.className = "branches";
    for (const branch of ["Predation", "Motion", "Survival"]) {
      const col = document.createElement("div"), title = document.createElement("div");
      title.className = "branchTitle";
      title.textContent = branch;
      col.append(title);
      for (const t of traits.filter((t2) => t2.branch === branch)) {
        const owned = learned.has(t.id), locked = t.parent && !learned.has(t.parent);
        const b = button("", () => {
          if (learned.has(t.id) || !points || t.parent && !learned.has(t.parent)) return;
          learned.add(t.id);
          points--;
          if (t.id === "shell") health++;
          updateHUD();
          skills();
          saveRun();
        });
        b.className = "node";
        b.disabled = owned || locked || !points;
        const name = document.createElement("strong"), desc = document.createElement("span"), state = document.createElement("small");
        name.textContent = t.name;
        desc.textContent = t.desc;
        state.textContent = owned ? "Learned" : locked ? "Requires " + traits.find((v) => v.id === t.parent).name : "1 point";
        b.append(name, desc, state);
        col.append(b);
      }
      grid.append(col);
    }
    $("panel").append(grid);
    $("actions").append(button("Back to habitat", resume));
  }
  var mapBase = /* @__PURE__ */ new Map();
  function chart(canvas2, range, large) {
    const c = canvas2.getContext("2d"), w = canvas2.width, h = canvas2.height, scale = w / (2 * range);
    const project2 = (p) => [w / 2 + (p.x - hero.x) * scale, h / 2 + (p.z - hero.z) * scale];
    let m = mapBase.get(large);
    const mx = Math.round(hero.x * 2) / 2, mz = Math.round(hero.z * 2) / 2;
    if (!m || m.x !== mx || m.z !== mz) {
      const plate = document.createElement("canvas");
      plate.width = large ? 216 : 96;
      plate.height = Math.round(plate.width * h / w);
      const surf = plate.getContext("2d"), pixels = surf.createImageData(plate.width, plate.height);
      for (let y = 0; y < plate.height; y++) for (let x = 0; x < plate.width; x++) {
        const wx = mx + (x / plate.width - 0.5) * 2 * range, wz = mz + (y / plate.height - 0.5) * 2 * range * h / w, z = ground(wx, wz);
        const color = z < -0.25 ? [35, 82, 88] : z < 0.42 ? [171, 157, 110] : [79, 101, 74];
        const contour = Math.abs(z / 1.4 - Math.round(z / 1.4)) < 0.08 ? 7 : 0, n = Math.min(14, Math.max(-12, z * 2));
        const k = (y * plate.width + x) * 4;
        for (let a = 0; a < 3; a++) pixels.data[k + a] = color[a] + n + contour;
        pixels.data[k + 3] = 255;
      }
      surf.putImageData(pixels, 0, 0);
      m = { x: mx, z: mz, plate };
      mapBase.set(large, m);
    }
    c.drawImage(m.plate, 0, 0, w, h);
    c.strokeStyle = "rgba(226,219,177,.24)";
    c.lineWidth = 1;
    if (!large) {
      for (const r of [0.23, 0.43]) {
        c.beginPath();
        c.arc(w * 0.5, h * 0.5, r * w, 0, 2 * Math.PI);
        c.stroke();
      }
    } else {
      const step = scale * 20;
      for (let x = w * 0.5 - hero.x % 20 * scale; x > -step; x -= step) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h);
        c.stroke();
      }
      for (let x = w * 0.5 - hero.x % 20 * scale + step; x < w; x += step) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h);
        c.stroke();
      }
      for (let y = h * 0.5 - hero.z % 20 * scale; y < h; y += step) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
      }
      for (let y = h * 0.5 - hero.z % 20 * scale - step; y > 0; y -= step) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
      }
    }
    function dot(o, color, r) {
      const [x, y] = project2(o);
      c.fillStyle = color;
      c.strokeStyle = "#17343c";
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    for (const p of game.items) if (p.live && distance(p) < range * 1.5) dot(p, "#eedb99", large ? 2.6 : 3);
    for (const p of game.enemies) if (p.live !== false) dot(p, "#fa8078", large ? 4 : 6);
    dot(partner, "#97f0fc", large ? 5 : 6);
    c.save();
    c.translate(w / 2, h / 2);
    c.rotate(game.yaw);
    c.beginPath();
    c.moveTo(0, -9);
    c.lineTo(6, 6);
    c.lineTo(0, 4);
    c.lineTo(-6, 6);
    c.closePath();
    c.fillStyle = "#ffefd1";
    c.fill();
    c.strokeStyle = "#183335";
    c.lineWidth = 2;
    c.stroke();
    c.restore();
  }
  function atlas() {
    if (game.defeat) return;
    panel("EXPLORATION", "Habitat atlas", "The map follows you. Blue is water, sand marks the shore, and green is land. Gold dots mark prey, red dots mark predators, and cyan marks the lantern scout.");
    const canvas2 = document.createElement("canvas");
    canvas2.width = 520;
    canvas2.height = 280;
    canvas2.id = "atlas";
    $("panel").append(canvas2);
    chart(canvas2, 120, true);
    const p = document.createElement("p");
    p.textContent = "Discovered habitats \xB7 " + [...discovered].join(" / ");
    $("panel").append(p);
    $("actions").append(button("Return to world", resume));
  }
  function pause() {
    if (game.defeat) return;
    panel("PAUSED", "Beneath the roots", "WASD moves. Drag the world or use Q/R to turn. F rises and C dives while swimming. Space attacks, Shift dodges, E evolves, T opens skills, M opens the atlas, and V switches camera. Drag vertically or use I/K to look up and down. G faces the nearest prey.");
    $("actions").append(button("Resume", resume));
  }
  function switchCamera() {
    game.firstPerson = !game.firstPerson;
    game.snap = true;
    updateHUD();
    say(game.firstPerson ? "First person \xB7 Drag or Q/R to look" : "Third person");
  }
  function attack() {
    if (!playing || game.defeat || cooldown > 0 || clock - (game.dodge?.t ?? -1) < 0.31) return;
    const duration = learned.has("reflex") ? 0.35 : 0.54;
    const reach = bodySize(hero) * (learned.has("reach") ? 4.75 : 3.4) * (hero.form === "tree" ? 1.5 : 1);
    let target = nearest(), best = target ? bodyDistance(target) : Infinity;
    for (const e of game.enemies) {
      if (!e.live) continue;
      const d = bodyDistance(e);
      if (d < best && d <= reach && clearStrike(hero, e, world.solids)) {
        target = e;
        best = d;
      }
    }
    if (target && best <= reach) hero.angle = Math.atan2(target.x - hero.x, target.z - hero.z);
    else target = null;
    game.swing = { t: clock, duration, target, reach, resolved: false, angle: hero.angle };
    cooldown = duration;
  }
  function landAttack() {
    const swing = game.swing, prey = swing.target;
    swing.resolved = true;
    if (!prey?.live || bodyDistance(prey) > swing.reach * 1.1) {
      say("Out of reach");
      return;
    }
    if (!clearStrike(hero, prey, world.solids)) {
      say("Blocked \xB7 move around the obstacle");
      return;
    }
    prey.hp -= (learned.has("bite") ? 2 : 1) + (hero.form === "ape" ? 1 : 0);
    prey.hit = 0.28;
    game.impact = { x: prey.x, y: prey.y + bodySize(prey) * 0.8, z: prey.z, size: bodySize(prey), type: prey.type, t: clock, killed: prey.hp <= 0 };
    if (hero.form === "spider") prey.pinned = 1.3;
    if (prey.hp > 0) {
      say("Hit \xB7 " + prey.hp + " health left");
      return;
    }
    const hostile = Boolean(prey.predator);
    game.meal = { x: prey.x, y: prey.y, z: prey.z, angle: prey.angle, type: prey.type, t: clock, hostile };
    world.kill(prey);
    if (!hostile) kills++;
    total++;
    xp += 10;
    guideAt = 0;
    if (total % 3 === 0) points++;
    if (learned.has("heal")) health = Math.min(maxHealth(), health + 1);
    say((hostile ? "Defeated " + hunts[prey.type].name : "Consumed") + " \xB7 +10 XP" + (total % 3 === 0 ? " \xB7 +1 skill point" : ""));
    updateHUD();
    saveRun();
  }
  function dodge() {
    if (!playing || game.defeat || clock < (game.dodge?.ready ?? 0)) return;
    const side = Number(keys.has("d")) - Number(keys.has("a")), ahead = Number(keys.has("w")) - Number(keys.has("s"));
    const x = side || ahead ? side : 1, z = ahead, c = Math.cos(game.yaw), s = Math.sin(game.yaw), length = Math.hypot(x, z) || 1;
    game.dodge = { t: clock, ready: clock + 1.85, side: x < 0 ? -1 : 1, dx: (x * c + z * s) / length, dz: (x * s - z * c) / length };
    game.swing = null;
  }
  function receiveStrike(e, profile) {
    if (immunity > 0 || game.defeat || clock - (game.dodge?.t ?? -1) < 0.31) return;
    if (shellGuard) {
      shellGuard = false;
      immunity = 1.5;
      say("Shell absorbed " + profile.move);
      return;
    }
    health = Math.max(0, health - 1);
    damageUntil = clock + 0.48;
    immunity = 1.6;
    say(profile.name + " \xB7 " + profile.move);
    updateHUD();
    if (!health) die(profile.name + " landed " + profile.move);
  }
  function die(reason) {
    if (game.defeat) return;
    game.defeat = { reason, t: clock };
    game.swing = null;
    game.dodge = null;
    health = 0;
    keys.clear();
    updateHUD();
    saveRun();
  }
  function finishDefeat() {
    panel("REBIRTH", game.defeat.reason, "Your " + form().name + " returns to its evolution checkpoint with its size, hunt progress and skills.");
    $("actions").append(button("Respawn as " + form().name, newLife));
    saveRun();
  }
  function newLife() {
    game.defeat = null;
    game.dodge = null;
    game.swing = null;
    life++;
    hero.x = checkpoint.x;
    hero.z = checkpoint.z;
    swimDepth = checkpoint.depth;
    game.yaw = checkpoint.yaw;
    game.pitch = 0;
    hero.size = growthSize();
    health = maxHealth();
    immunity = 5;
    reserve = 1;
    exposure = 0;
    shellGuard = hero.form === "snail";
    cooldown = 0;
    damageUntil = 0;
    game.meal = null;
    game.impact = null;
    game.guide = null;
    game.pinnedPrey = null;
    guideAt = 0;
    sync();
    placeForm(hero.form, true);
    sync();
    game.snap = true;
    updateHUD();
    resume();
    saveRun();
  }
  function breathe(dt, environment) {
    if (environment.depleted) reserve = Math.max(0, reserve - dt / environment.capacity);
    else reserve = Math.min(1, reserve + dt * 0.24);
    exposure = reserve > 0 ? 0 : exposure + dt;
    if (exposure < 2) return;
    exposure = 0;
    health--;
    damageUntil = clock + 0.48;
    updateHUD();
    if (health <= 0) die(environment.mode === "water" ? "Stranded on shore" : "Out of air");
  }
  function walkTo(actor, id, x, z, speed, dt, depth) {
    const dx = x - actor.x, dz = z - actor.z, d = Math.hypot(dx, dz), step = Math.min(d, speed * dt);
    if (d > 1e-3) {
      actor.angle = Math.atan2(dx, dz);
      travel(actor, id, dx / d * step, dz / d * step, world.solids, depth);
    }
    return d;
  }
  function updateScout(dt) {
    const r = partner;
    r.timer -= dt;
    if (r.mode === "scout" && r.timer <= 0) {
      r.mode = "visit";
      r.timer = 14;
    }
    if (r.mode === "visit") {
      if (distance(r) > 45) {
        radio("The scout has found " + species[form().prey].name + ".");
        r.mode = "scout";
        r.timer = 38;
        return;
      }
      const d = walkTo(r, r.form, hero.x + 2, hero.z - 2, 10, dt, 2.4);
      if (d < 2 || r.timer <= 0) {
        radio(kills >= quota() ? "Your lineage is ready. Open evolution to choose a form." : "Get close before you strike. Your prey is marked gold on the radar.");
        r.mode = "scout";
        r.timer = 40;
        r.waypoint++;
      }
    } else {
      const route = [[-12, 23], [-24, 7], [4, -5], [23, 19], [13, 42]];
      const dest = route[r.waypoint % route.length];
      if (walkTo(r, r.form, dest[0], dest[1], 3.8, dt, 2.4) < 0.7) r.waypoint++;
      const next = ground(hero.x, hero.z) < -0.65 ? "fish" : "moth";
      if (next !== r.form) {
        r.form = next;
        resolveHabitat(r, next);
        r.y = levelFor(next, r.x, r.z);
      }
    }
  }
  function simulation(dt) {
    if (game.defeat) {
      if (clock - game.defeat.t >= 0.8) finishDefeat();
      return;
    }
    if (game.swing && !game.swing.resolved && clock - game.swing.t >= game.swing.duration * 0.39) landAttack();
    cooldown = Math.max(0, cooldown - dt);
    immunity = Math.max(0, immunity - dt);
    const turn = Number(keys.has("r") || keys.has("arrowright")) - Number(keys.has("q") || keys.has("arrowleft"));
    game.yaw += turn * dt * 1.9;
    game.pitch = Math.max(-0.98, Math.min(0.96, game.pitch + dt * (Number(keys.has("k")) - Number(keys.has("i"))) * 1.25));
    const side = Number(keys.has("d")) - Number(keys.has("a")), forward = Number(keys.has("w") || keys.has("arrowup")) - Number(keys.has("s") || keys.has("arrowdown"));
    const len = Math.hypot(side, forward) || 1, c = Math.cos(game.yaw), s = Math.sin(game.yaw), dx = (side * c + forward * s) / len, dz = (side * s - forward * c) / len;
    const speed = 9 * (learned.has("swim") ? 1.25 : 1) * (hero.form === "bird" ? 1.35 : 1);
    const nextSize = hero.size + (growthSize() - hero.size) * (1 - Math.exp(-dt * 4.5));
    if (!blocked(hero.x, hero.z, playerLevel(hero.form, hero.x, hero.z, swimDepth, nextSize), nextSize * 0.6, nextSize * 1.65, world.solids)) hero.size = nextSize;
    const size = bodySize(hero), mode = modeOf(hero.form), bottom = ground(hero.x, hero.z);
    const mobility = mode === "water" && hero.y + size * 0.85 >= 0 ? 0.25 : mode === "land" && bottom < -1 ? 0.48 : hero.form === "lungfish" && bottom >= 0 ? 0.65 : 1;
    const pace = speed * Math.sqrt(size) * mobility;
    if (hero.form === "bird") swimDepth = Math.max(0.5, Math.min(8, swimDepth + (Number(keys.has("f")) - Number(keys.has("c"))) * dt * 3.3));
    else swimDepth = Math.max(0.2, Math.min(Math.max(0.3, -ground(hero.x, hero.z)), swimDepth + (Number(keys.has("c")) - Number(keys.has("f"))) * dt * 2.9));
    const evade = game.dodge, evading = evade && clock - evade.t < 0.31;
    const burst = evading ? Math.sqrt(size) * 15 : 0;
    travel(hero, hero.form, (dx * pace + (evading ? evade.dx * burst : 0)) * dt, (dz * pace + (evading ? evade.dz * burst : 0)) * dt, world.solids, swimDepth);
    if ((side || forward) && (!game.swing || clock - game.swing.t > game.swing.duration)) hero.angle = Math.atan2(dx, dz);
    const environment = respiration(hero.form, hero.x, hero.y, hero.z, size);
    if (environment.wet && Math.abs(playerLevel(hero.form, hero.x, hero.z, swimDepth, size) - hero.y) > 0.1) swimDepth = Math.max(0.2, environment.depth);
    breathe(dt, environment);
    if (game.defeat) return;
    game.environment = environment;
    sync();
    discovered.add(biomeAt(hero.x, hero.z).name);
    for (const a of game.items) {
      if (!a.live || distance(a) > 44) continue;
      a.hit = Math.max(0, a.hit - dt);
      if (a.pinned > 0) {
        a.pinned -= dt;
        continue;
      }
      const d = distance(a), sp = species[a.type];
      const school = a.school !== void 0, panic = school ? a.hit > 0 ? 4.7 : 2.25 : 2.7 * scaleOf(a.type);
      const fleeing = d < panic && a.type !== "blight";
      const phase = school ? a.school : a.seed;
      const destX = fleeing ? a.x + (a.x - hero.x) / (d || 1) * 2 : a.homeX + Math.cos(clock * 0.34 + phase) * 2.7;
      const destZ = fleeing ? a.z + (a.z - hero.z) / (d || 1) * 2 : a.homeZ + Math.sin(clock * 0.39 + phase) * 2.7;
      walkTo(a, a.type, destX, destZ, sp.speed * (fleeing ? 1 : 0.45) * Math.sqrt(scaleOf(a.type)), dt, a.depth + Math.sin(clock * 0.5 + phase) * 0.32);
    }
    for (const e of game.enemies) {
      if (!e.live || distance(e) > 45) continue;
      e.hit = Math.max(0, (e.hit || 0) - dt);
      if (e.pinned > 0) {
        e.pinned -= dt;
        continue;
      }
      updatePredator(e, hero, world.solids, dt, clock, swimDepth, walkTo, receiveStrike);
      if (game.defeat) return;
    }
    if (clock >= guideAt || !game.guide?.live) {
      if (game.pinnedPrey && (!game.pinnedPrey.live || distance(game.pinnedPrey) > 40 || !game.items.includes(game.pinnedPrey))) game.pinnedPrey = null;
      game.guide = game.pinnedPrey || nearest();
      guideAt = clock + 0.18;
    }
    updateScout(dt);
    if (keys.has(" ")) attack();
    if (clock > signalUntil) $("signal").textContent = "";
    if (clock > radioUntil) $("radio").hidden = true;
    $("fieldTip").hidden = clock > formTipUntil;
  }
  if (savedRun) $("start").textContent = "Continue as " + forms[savedRun.form].name;
  $("start").onclick = () => {
    game.intro = false;
    game.snap = true;
    $("intro").hidden = true;
    $("hud").hidden = false;
    $("tools").hidden = false;
    document.body.classList.add("playing");
    playing = true;
    if (savedRun) restoreRun(savedRun);
    else focusPrey();
    updateHUD();
    if (savedRun) {
      say("Evolution checkpoint restored");
      guideReadout();
      saveRun();
    } else radio("Green drifters ahead. Swim close and press Space to engulf one.");
  };
  $("attack").onpointerdown = (e) => {
    e.preventDefault();
    keys.add(" ");
    e.currentTarget.setPointerCapture(e.pointerId);
    attack();
  };
  $("attack").onlostpointercapture = () => keys.delete(" ");
  $("dodge").onclick = dodge;
  $("findPrey").onclick = () => {
    if (playing) focusPrey();
    $("findPrey").blur();
  };
  $("pause").onclick = pause;
  $("skillsBtn").onclick = skills;
  $("mapBtn").onclick = atlas;
  $("cameraBtn").onclick = switchCamera;
  $("close").onclick = resume;
  $("evolve").onclick = evolve;
  $("dialog").oncancel = (e) => {
    e.preventDefault();
    if (chapter !== "REBIRTH") resume();
  };
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (!playing || game.defeat) return;
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    keys.add(k);
    if (e.repeat) return;
    if (k === "shift") dodge();
    if (k === " ") attack();
    if (k === "g") focusPrey();
    if (k === "e") evolve();
    if (k === "m") atlas();
    if (k === "t") skills();
    if (k === "v") switchCamera();
    if (k === "escape") pause();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());
  for (const b of document.querySelectorAll("[data-key]")) {
    b.onpointerdown = (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      keys.add(b.dataset.key);
    };
    b.onlostpointercapture = () => keys.delete(b.dataset.key);
  }
  var drag = null;
  $("stage").onpointerdown = (e) => {
    if (!playing) return;
    drag = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  $("stage").onpointermove = (e) => {
    if (drag !== null) {
      game.yaw += (e.clientX - drag.x) * 9e-3;
      game.pitch = Math.max(-0.98, Math.min(0.96, game.pitch + (e.clientY - drag.y) * 6e-3));
      drag = { x: e.clientX, y: e.clientY };
    }
  };
  $("stage").onlostpointercapture = () => drag = null;
  sync();
  placeForm(hero.form);
  partner.y = levelFor(partner.form, partner.x, partner.z);
  function frame(timestamp) {
    const dt = Math.min(0.075, (timestamp - last) / 1e3);
    last = timestamp;
    if (playing || game.intro) clock += dt;
    if (playing) simulation(dt);
    if (playing || game.snap) render(game, clock, dt);
    document.body.classList.toggle("hit", clock < damageUntil);
    if (playing && clock > uiAt) {
      $("dodge").disabled = clock < (game.dodge?.ready ?? 0) || !!game.defeat;
      const bottom = ground(hero.x, hero.z), env = game.environment || respiration(hero.form, hero.x, hero.y, hero.z, bodySize(hero)), wet = env.wet;
      $("depthControls").hidden = env.mode !== "air" && bottom >= 0 || env.mode === "air" && hero.form !== "bird";
      $("reserve").hidden = !env.depleted && reserve >= 0.995;
      $("reserveText").textContent = env.label + " \xB7 " + Math.ceil(reserve * env.capacity) + " s" + (env.depleted ? env.mode === "water" ? " \xB7 Return to water" : " \xB7 Rise for air" : " \xB7 Recovering");
      $("reserveBar").value = reserve;
      guideReadout();
      $("medium").textContent = wet ? "Underwater \xB7 " + Math.max(0.1, env.depth).toFixed(1) + " m" : modeOf(hero.form) === "air" ? "Airborne \xB7 " + (hero.y - Math.max(0, bottom)).toFixed(1) + " m" : bottom < 0.7 ? "Shoreline" : env.mode === "water" ? "Stranded on land" : "On land";
      chart($("map"), 34, false);
      $("place").textContent = biomeAt(hero.x, hero.z).name;
      uiAt = clock + 0.22;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
