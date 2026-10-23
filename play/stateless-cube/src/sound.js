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

  // The AudioContext must be created/resumed inside a user gesture on iOS.
  function unlock() {
    // Creating an AudioContext is expensive (it blocked the first touch for
    // ~180ms on a throttled CPU). A muted game does not need one; turning the
    // sound on calls unlock() again from that tap.
    if (unlocked || !enabled) return;
    const c = audio();
    if (!c) return;
    unlocked = true;
    if (c.state === 'suspended') c.resume();
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
      master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      master.gain.exponentialRampToValueAtTime(0.34, ctx.currentTime + 0.25);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function ready() {
    if (!enabled) return null;
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
    // A soft swish + low body for every slide.
    move() {
      noise({ freq: 620, sweep: 380, dur: 0.16, gain: 0.05, q: 0.8 });
      tone(150, { type: 'sine', dur: 0.12, gain: 0.09, glide: 110 });
    },

    // Merge: a bell pluck that climbs the pentatonic ladder with the tile
    // level, and jumps an octave for every extra merge in the combo.
    merge(level, combo) {
      const step = Math.min(LADDER.length - 1, Math.max(0, (level || 1) - 1));
      const lift = Math.min(12, (combo || 1) - 1) * 2;
      const freq = BASE * Math.pow(2, (LADDER[step] + lift) / 12);

      noise({ freq: 3200, dur: 0.05, gain: 0.035, q: 2 });
      tone(freq, { type: 'triangle', dur: 0.3, gain: 0.3 });
      tone(freq * 2, { type: 'sine', dur: 0.42, gain: 0.12, delay: 0.012 });
      tone(freq * 3, { type: 'sine', dur: 0.22, gain: 0.05, delay: 0.02 });
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
    combo(n) {
      const c = ready();
      if (!c) return;
      noise({ freq: 500, sweep: 4200, dur: 0.4, gain: 0.07, q: 3 });
      tone(330 * Math.pow(2, Math.min(4, n - 2) / 12), {
        type: 'sawtooth', dur: 0.4, gain: 0.07, glide: 660,
      });
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
