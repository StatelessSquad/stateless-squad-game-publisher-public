/*
 * StateLess-Cube — the effects engine.
 *
 * Every particle on the board (sparks, glints, debris, shockwaves, ripples,
 * the emoji rain) is drawn on ONE canvas over the tiles. The DOM version gave
 * every particle its own element and its own compositor layer: a combo could
 * keep 40+ glyph layers and a dozen rings alive at once, and on iOS that was
 * where the dropped frames came from. One canvas is one layer, however many
 * particles it holds, so the effects can be richer and still cheaper:
 *
 *   - sparks and glints are pre-rendered glow sprites drawn additively
 *     ('lighter'), which is what makes them shine;
 *   - every sprite (glow, star, emoji with its shadow) is rendered once and
 *     cached — a frame is only drawImage calls, no gradients, no blur;
 *   - the loop runs only while something is alive: an idle board costs
 *     nothing;
 *   - the pixel ratio is capped at 2 (a 3x phone would draw 2.25x the pixels
 *     for no visible gain).
 *
 * Loaded as a classic script before script.js and exposed as `window.FX`.
 * Browsers only: the game checks for it, and everything bails out under
 * prefers-reduced-motion.
 */

(function (global) {
  'use strict';

  const MAX_DPR = 2;
  const MAX_PARTICLES = 480;
  const GRAVITY = 900; // px/s²

  let canvas = null;
  let ctx = null;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let last = 0;
  const parts = [];

  const glowCache = new Map();
  const starCache = new Map();
  const glyphCache = new Map();

  function reducedMotion() {
    return Boolean(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function disabled() {
    return !ctx || reducedMotion() ||
      document.documentElement.classList.contains('variant-no-effects');
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  /* -- sprites (rendered once, then only drawn) ---------------------------- */

  function sprite(size, paint) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    paint(c.getContext('2d'), size);
    return c;
  }

  // A soft round glow: white-hot centre, the colour, then nothing.
  function glow(color) {
    let s = glowCache.get(color);
    if (!s) {
      s = sprite(64, (g, n) => {
        const r = n / 2;
        const grad = g.createRadialGradient(r, r, 0, r, r, r);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.14, 'rgba(255,255,255,0.9)');
        grad.addColorStop(0.3, color);
        grad.addColorStop(0.62, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, n, n);
      });
      glowCache.set(color, s);
    }
    return s;
  }

  // A four-pointed glint with a coloured halo — the "shiny" bit.
  function star(color) {
    let s = starCache.get(color);
    if (!s) {
      s = sprite(96, (g, n) => {
        const r = n / 2;
        const halo = g.createRadialGradient(r, r, 0, r, r, r);
        halo.addColorStop(0, color);
        halo.addColorStop(0.35, 'rgba(0,0,0,0)');
        g.globalAlpha = 0.7;
        g.fillStyle = halo;
        g.fillRect(0, 0, n, n);
        g.globalAlpha = 1;
        g.fillStyle = '#ffffff';
        g.beginPath();
        const arm = r * 0.96;
        const waist = r * 0.13;
        g.moveTo(r, r - arm);
        g.quadraticCurveTo(r + waist, r - waist, r + arm, r);
        g.quadraticCurveTo(r + waist, r + waist, r, r + arm);
        g.quadraticCurveTo(r - waist, r + waist, r - arm, r);
        g.quadraticCurveTo(r - waist, r - waist, r, r - arm);
        g.fill();
      });
      starCache.set(color, s);
    }
    return s;
  }

  // An emoji with its soft shadow, drawn once at the largest size used.
  function glyph(sym) {
    let s = glyphCache.get(sym);
    if (!s) {
      s = sprite(Math.ceil(56 * dpr), (g, n) => {
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `${Math.round(40 * dpr)}px -apple-system, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        g.shadowColor = 'rgba(40, 10, 70, 0.35)';
        g.shadowBlur = 4 * dpr;
        g.shadowOffsetY = 2 * dpr;
        g.fillText(sym, n / 2, n / 2);
      });
      glyphCache.set(sym, s);
    }
    return s;
  }

  /* -- the canvas ---------------------------------------------------------- */

  function size(cw, ch) {
    if (!canvas) return;
    w = cw;
    h = ch;
    dpr = Math.min(MAX_DPR, global.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    glyphCache.clear(); // emoji bitmaps are rendered for the pixel ratio
  }

  function attach(el) {
    canvas = el;
    ctx = el.getContext('2d');
    // ResizeObserver reports the size after layout: no forced layout here.
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver((entries) => {
        const box = entries[0].contentRect;
        size(box.width, box.height);
      }).observe(el);
    } else {
      size(el.clientWidth, el.clientHeight);
      global.addEventListener('resize', () => size(el.clientWidth, el.clientHeight));
    }
  }

  function add(p) {
    if (parts.length >= MAX_PARTICLES) parts.shift();
    parts.push(p);
    if (!raf) {
      last = 0;
      raf = global.requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let alive = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.age += dt;
      if (p.age < 0) { parts[alive++] = p; continue; } // delayed start
      const t = p.age / p.life;
      if (t >= 1) continue;
      const drag = p.drag === 1 ? 1 : Math.pow(p.drag, dt * 60); // per 1/60 s, frame-rate independent
      p.vx *= drag;
      p.vy = p.vy * drag + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      draw(p, t);
      parts[alive++] = p;
    }
    parts.length = alive;

    if (alive) {
      raf = global.requestAnimationFrame(tick);
    } else {
      raf = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function draw(p, t) {
    const c = ctx;
    switch (p.kind) {
      case 'spark': {
        // A streak: the glow stretched along its velocity, so fast sparks
        // leave a short trail and slow ones round off into dots.
        const s = p.size * (1 - t * 0.6);
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const len = s * (1 + Math.min(3.5, speed / 160));
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = (t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92) * 0.95;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(Math.atan2(p.vy, p.vx));
        c.drawImage(p.img, -len * 0.75, -s / 2, len, s);
        c.restore();
        break;
      }
      case 'glint': {
        // Pops in, twinkles, fades.
        const pulse = 0.65 + 0.35 * Math.sin(p.age * p.twinkle);
        const grow = t < 0.2 ? t / 0.2 : 1;
        const s = p.size * grow * pulse * (1 - t * 0.5);
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.drawImage(p.img, -s / 2, -s / 2, s, s);
        c.restore();
        break;
      }
      case 'debris': {
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55;
        const s = 1 - t * 0.8;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.color;
        c.fillRect((-p.dw / 2) * s, (-p.dh / 2) * s, p.dw * s, p.dh * s);
        c.restore();
        break;
      }
      case 'ring': {
        const e = 1 - Math.pow(1 - t, 3); // ease-out
        const r = p.r0 + (p.r1 - p.r0) * e;
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = p.alpha * (1 - t);
        c.strokeStyle = p.color;
        c.lineWidth = Math.max(0.5, p.w0 + (p.w1 - p.w0) * e);
        c.beginPath();
        c.arc(p.x, p.y, r, 0, Math.PI * 2);
        c.stroke();
        break;
      }
      case 'core': {
        const e = 1 - Math.pow(1 - t, 2);
        const s = p.size * (0.3 + 0.7 * e);
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.85 * (1 - t);
        c.drawImage(p.img, p.x - s / 2, p.y - s / 2, s, s);
        break;
      }
      case 'emoji': {
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = t < 0.15 ? t / 0.15 : 1 - Math.max(0, t - 0.6) / 0.4;
        const s = p.size;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.drawImage(p.img, -s / 2, -s / 2, s, s);
        c.restore();
        break;
      }
      default:
        break;
    }
    c.globalAlpha = 1;
  }

  function base(kind, x, y, life) {
    return { kind, x, y, vx: 0, vy: 0, g: 0, drag: 1, rot: 0, spin: 0, age: 0, life, size: 10 };
  }

  /* -- effects ------------------------------------------------------------- */

  // A merge: sparks, debris, glints, a shockwave, and a hot core for big tiles.
  //   power – log2 of the merged value (2 -> 1 ... 2048 -> 11)
  function burst(x, y, colors, power, extra) {
    if (disabled()) return;
    const pw = Math.max(1, Math.min(12, power || 1));
    const cols = colors && colors.length ? colors : ['#ffffff', '#ffd166'];
    const reach = 30 + pw * 12;

    // Sparks: additive glows thrown out with a little gravity.
    const sparks = Math.min(40, Math.round(10 + pw * 2 + (extra || 0)));
    for (let i = 0; i < sparks; i++) {
      const p = base('spark', x, y, rand(0.45, 0.75) + pw * 0.02);
      const a = (Math.PI * 2 * i) / sparks + rand(-0.25, 0.25);
      const v = reach * rand(4.5, 8);
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v - reach * 0.8;
      p.g = GRAVITY * 0.55;
      p.drag = 0.9;
      p.size = rand(7, 12) + pw * 0.5;
      p.img = glow(cols[i % cols.length]);
      add(p);
    }

    // Debris: squares and slivers in the theme colours, spinning, falling.
    const debris = Math.min(16, 4 + pw);
    for (let i = 0; i < debris; i++) {
      const p = base('debris', x, y, rand(0.6, 1.0));
      const a = rand(0, Math.PI * 2);
      const v = reach * rand(3, 5.5);
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v - reach * 2.2;
      p.g = GRAVITY * 1.4;
      p.drag = 0.94;
      p.spin = rand(-12, 12);
      p.color = cols[i % cols.length];
      if (i % 2) { p.dw = 4; p.dh = 13; } else { p.dw = 8; p.dh = 8; }
      add(p);
    }

    // Glints: twinkling stars that hang in the air — from 16 up.
    if (pw >= 3) {
      const glints = Math.min(10, 1 + Math.floor(pw * 0.8));
      for (let i = 0; i < glints; i++) {
        const p = base('glint', x + rand(-reach, reach) * 0.6, y + rand(-reach, reach) * 0.6, rand(0.7, 1.2));
        p.vx = rand(-30, 30);
        p.vy = rand(-60, -10);
        p.drag = 0.97;
        p.size = rand(16, 26) + pw * 1.2;
        p.spin = rand(-1.5, 1.5);
        p.twinkle = rand(14, 24);
        p.age = -rand(0, 0.25);
        p.img = star(cols[i % cols.length]);
        add(p);
      }
    }

    // The shockwave: thick and bright at first, thin and wide at the end.
    const wave = base('ring', x, y, 0.42 + pw * 0.04);
    wave.r0 = 6;
    wave.r1 = 30 * (1.4 + pw * 0.25);
    wave.w0 = 5;
    wave.w1 = 1;
    wave.alpha = 0.95;
    wave.color = cols[0];
    add(wave);

    // Big tiles: a white-hot core.
    if (pw >= 5) {
      const core = base('core', x, y, 0.38 + pw * 0.03);
      core.size = 60 + pw * 14;
      core.img = glow(cols[0]);
      add(core);
    }
  }

  // A soft ring from a cell (a merge or a new tile).
  function ring(x, y, color, soft) {
    if (disabled()) return;
    const p = base('ring', x, y, 0.62);
    p.r0 = 3;
    p.r1 = 44;
    p.w0 = soft ? 1 : 2;
    p.w1 = soft ? 1 : 2;
    p.alpha = soft ? 0.55 : 0.85;
    p.color = color || 'rgba(255,255,255,0.8)';
    add(p);
  }

  // A few glints around a cell: a new tile worth looking at.
  function sparkle(x, y, radius, colors, count) {
    if (disabled()) return;
    const cols = colors && colors.length ? colors : ['#ffffff'];
    for (let i = 0; i < (count || 5); i++) {
      const a = rand(0, Math.PI * 2);
      const d = radius * rand(0.5, 1.05);
      const p = base('glint', x + Math.cos(a) * d, y + Math.sin(a) * d, rand(0.6, 1.0));
      p.size = rand(12, 22);
      p.spin = rand(-2, 2);
      p.twinkle = rand(16, 26);
      p.vy = -12;
      p.age = -rand(0, 0.3);
      p.img = star(cols[i % cols.length]);
      add(p);
    }
  }

  // Emoji rising out of the board.
  function rain(sym, count) {
    if (disabled()) return;
    const img = glyph(sym);
    for (let i = 0; i < (count || 8); i++) {
      const p = base('emoji', rand(0, w), h + 20, rand(1.1, 1.8));
      p.vy = -(h + 80) / p.life * rand(0.9, 1.15);
      p.vx = rand(-30, 30);
      p.size = rand(18, 36);
      p.spin = rand(-2, 2);
      p.age = -rand(0, 0.3);
      p.img = img;
      add(p);
    }
  }

  global.FX = {
    attach,
    burst,
    ring,
    sparkle,
    rain,
    count() { return parts.length; },
    clear() { parts.length = 0; },
  };
})(typeof window !== 'undefined' ? window : this);
