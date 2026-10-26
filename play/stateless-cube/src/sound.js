/*
 * StateLess-Cube — sound engine.
 *
 * Every sound is synthesised with the Web Audio API: no audio files, no
 * build step, no network requests. The palette is deliberately "candy" —
 * short plucks, bell-like merges that climb with the combo, soft swishes.
 *
 * Loaded as a classic script before script.js and exposed as `window.Sound`.
 * Browsers only: the game never calls into it when it is missing.
 */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'statelesscube.sound';

  // Pentatonic ladder (semitones) used by the merge sound — always consonant.
  const LADDER = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const BASE = 261.63; // C4

  let ctx = null;
  let master = null;
  let enabled = true;
  let unlocked = false;

  // A demo build (window.__CUBE_DEMO__) saves nothing: see script.js.
  const demo = typeof window !== 'undefined' && Boolean(window.__CUBE_DEMO__);

  function load() {
    if (demo) return;
    try {
      enabled = localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch (_) { /* private mode */ }
  }

  function save() {
    if (demo) return;
    try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch (_) { /* private mode */ }
  }

  // The AudioContext is created and resumed inside a user gesture, never
  // before: a context created at page load (the game's start() plays a tap)
  // stayed silent in Chrome even after the first click resumed it, so the
  // game had no sound at all. Until the first gesture every sound is
  // skipped. Creating a context is also expensive (it blocked the first
  // touch for ~180ms on a throttled CPU), and a muted game doesn't need one;
  // turning the sound on calls unlock() again from that tap.
  function unlock() {
    if (!enabled) return;
    const c = audio();
    if (!c) return;
    unlocked = true;
    if (c.state !== 'running') c.resume().catch(() => {});
  }

  function running() {
    return Boolean(ctx) && ctx.state === 'running';
  }

  function audio() {
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
      } catch (_) {
        ctx = null;
        return null;
      }
      // Full level at once: the context is born in the player's gesture,
      // and that gesture's own sound plays straight away (a fade-in from
      // silence swallowed the first move).
      master = ctx.createGain();
      master.gain.value = 0.34;
      // A gentle compressor glues the layers together and lets the
      // transients punch without the big combos clipping.
      const glue = ctx.createDynamicsCompressor();
      glue.threshold.value = -16;
      glue.knee.value = 10;
      glue.ratio.value = 4;
      glue.attack.value = 0.002;
      glue.release.value = 0.12;
      master.connect(glue);
      glue.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function ready() {
    if (!enabled || !unlocked) return null;
    return audio();
  }

  /* -- primitives -------------------------------------------------------- */

  function tone(freq, opts) {
    const c = ready();
    if (!c) return;
    const o = opts || {};
    const t = c.currentTime + (o.delay || 0);
    const dur = o.dur || 0.25;
    const gain = o.gain == null ? 0.3 : o.gain;

    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.glide), t + dur);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);

    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + (o.attack || 0.008));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(env);
    env.connect(o.bus || master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // A fading burst of white noise per duration, built once and reused: a
  // move plays two or three noises, and filling a fresh buffer with random
  // samples every time was garbage on every move.
  const noiseBuffers = {};

  function noiseBuffer(c, dur) {
    const frames = Math.max(1, Math.floor(c.sampleRate * dur));
    if (!noiseBuffers[frames]) {
      const buffer = c.createBuffer(1, frames, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) {
        const fall = 1 - i / frames;
        data[i] = (Math.random() * 2 - 1) * fall;
      }
      noiseBuffers[frames] = buffer;
    }
    return noiseBuffers[frames];
  }

  function noise(opts) {
    const c = ready();
    if (!c) return;
    const o = opts || {};
    const t = c.currentTime + (o.delay || 0);
    const dur = o.dur || 0.18;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, dur);

    const filter = c.createBiquadFilter();
    filter.type = o.filter || 'bandpass';
    filter.frequency.setValueAtTime(o.freq || 900, t);
    if (o.sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(60, o.sweep), t + dur);
    filter.Q.value = o.q == null ? 1 : o.q;

    const env = c.createGain();
    env.gain.setValueAtTime(o.gain == null ? 0.12 : o.gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter);
    filter.connect(env);
    env.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /* -- the palette ------------------------------------------------------- */

  const Sound = {
    // A short swish for the slide, then a soft wooden tick when the tiles
    // land (the slide is 120 ms).
    move() {
      noise({ freq: 700, sweep: 420, dur: 0.11, gain: 0.05, q: 0.8 });
      tone(150, { type: 'sine', dur: 0.1, gain: 0.08, glide: 110 });
      noise({ filter: 'bandpass', freq: 1800, dur: 0.03, gain: 0.05, q: 3, delay: 0.115 });
      tone(240, { type: 'triangle', dur: 0.05, gain: 0.06, glide: 180, delay: 0.115 });
    },

    // Merge: a bell pluck that climbs the pentatonic ladder with the tile
    // level, and jumps an octave for every extra merge in the combo.
    merge(level, combo) {
      const step = Math.min(LADDER.length - 1, Math.max(0, (level || 1) - 1));
      const lift = Math.min(12, (combo || 1) - 1) * 2;
      const freq = BASE * Math.pow(2, (LADDER[step] + lift) / 12);
      // A few cents of drift, so a long chain doesn't sound like a loop.
      const drift = (Math.random() - 0.5) * 14;

      // The click: a very short bright transient in front of the bell.
      tone(freq * 4, { type: 'square', dur: 0.018, gain: 0.04, attack: 0.001 });
      noise({ freq: 4200, dur: 0.035, gain: 0.04, q: 2.5 });
      tone(freq, { type: 'triangle', dur: 0.3, gain: 0.3, detune: drift, attack: 0.004 });
      tone(freq * 2, { type: 'sine', dur: 0.42, gain: 0.12, delay: 0.012, detune: drift });
      tone(freq * 3, { type: 'sine', dur: 0.22, gain: 0.05, delay: 0.02 });
    },

    // The hit before a big merge (the hit-stop): a low thump and a snap,
    // heavier for bigger tiles and longer combos.
    impact(level, combo) {
      const weight = Math.min(1, ((level || 3) - 2) / 9 + Math.max(0, (combo || 1) - 1) * 0.08);
      tone(95, { type: 'sine', dur: 0.14 + weight * 0.08, gain: 0.18 + weight * 0.14, glide: 48, attack: 0.002 });
      noise({ filter: 'lowpass', freq: 900, dur: 0.06, gain: 0.06 + weight * 0.06 });
      noise({ freq: 5200, dur: 0.02, gain: 0.03 + weight * 0.03, q: 1.5 });
    },

    // A tiny blip when a new tile appears.
    spawn() {
      tone(880, { type: 'sine', dur: 0.08, gain: 0.05, glide: 1180 });
    },

    // Thud for an illegal move.
    invalid() {
      noise({ filter: 'lowpass', freq: 420, dur: 0.16, gain: 0.12 });
      tone(104, { type: 'sine', dur: 0.2, gain: 0.16, glide: 78 });
    },

    // Rising riser when a combo streaks.
    // Each step of a streak climbs higher (a whole tone per step), and from
    // ×4 a bright arpeggio sparkles on top.
    combo(n) {
      const c = ready();
      if (!c) return;
      const steps = Math.min(10, Math.max(0, n - 2));
      const from = 330 * Math.pow(2, (steps * 2) / 12);
      noise({ freq: 500, sweep: 4200 + steps * 400, dur: 0.36, gain: 0.06 + steps * 0.006, q: 3 });
      tone(from, { type: 'sawtooth', dur: 0.36, gain: 0.06, glide: from * 2 });
      if (n >= 4) {
        [0, 4, 7, 12].forEach((semi, i) => {
          tone(from * 2 * Math.pow(2, semi / 12), { type: 'triangle', dur: 0.14, gain: 0.07, delay: 0.05 + i * 0.045 });
        });
      }
    },

    // UI click.
    tap() {
      noise({ freq: 2400, dur: 0.04, gain: 0.05, q: 1.5 });
    },

    // Win fanfare.
    win() {
      const notes = [0, 4, 7, 12, 16, 19, 24];
      notes.forEach((semi, i) => {
        const freq = BASE * 2 * Math.pow(2, semi / 12);
        tone(freq, { type: 'triangle', dur: 0.55, gain: 0.22, delay: i * 0.075 });
        tone(freq * 2, { type: 'sine', dur: 0.4, gain: 0.06, delay: i * 0.075 + 0.01 });
      });
      noise({ freq: 6000, sweep: 900, dur: 0.9, gain: 0.05, q: 0.6, delay: 0.1 });
    },

    // Level up: a quick rising arpeggio that lands on a bright chord.
    levelUp(level) {
      const lift = Math.min(7, Math.floor((level || 1) / 10)); // higher levels sit a bit higher
      const notes = [0, 4, 7, 12];
      notes.forEach((semi, i) => {
        const freq = BASE * Math.pow(2, (semi + lift) / 12);
        tone(freq, { type: 'triangle', dur: 0.26, gain: 0.22, delay: i * 0.055 });
      });
      [12, 16, 19].forEach((semi) => {
        const freq = BASE * Math.pow(2, (semi + lift) / 12);
        tone(freq, { type: 'sine', dur: 0.7, gain: 0.12, delay: 0.24 });
        tone(freq * 2, { type: 'sine', dur: 0.5, gain: 0.04, delay: 0.25 });
      });
      noise({ freq: 4000, sweep: 1200, dur: 0.5, gain: 0.04, q: 0.8, delay: 0.22 });
    },

    // Game over: a small descending figure.
    lose() {
      const notes = [12, 7, 3, 0];
      notes.forEach((semi, i) => {
        tone(BASE * Math.pow(2, semi / 12), {
          type: 'sine', dur: 0.42, gain: 0.2, delay: i * 0.16, glide: BASE * Math.pow(2, semi / 12) * 0.97,
        });
      });
    },

    /* -- settings --------------------------------------------------------- */

    unlock,
    running,
    isEnabled() { return enabled; },
    setEnabled(on) {
      enabled = Boolean(on);
      save();
      if (enabled) unlock();
      return enabled;
    },
    toggle() { return Sound.setEnabled(!enabled); },
  };

  load();
  global.Sound = Sound;
})(typeof window !== 'undefined' ? window : this);
