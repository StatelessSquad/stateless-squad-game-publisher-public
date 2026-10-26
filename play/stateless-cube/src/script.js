/*
 * StateLess-Cube — game logic, rendering, effects and input.
 *
 * NOTE FOR AGENTS: this file is loaded by index.html as a *classic* script
 * (no type="module") so the game also works when index.html is opened straight
 * from disk (file://). Do NOT add ES `export`/`import` statements here — they
 * throw a SyntaxError in a classic script and leave the board empty. Test hooks
 * are exposed through the CommonJS guard at the very bottom instead.
 * See AGENTS.md for the architecture notes.
 *
 * Layout of this file:
 *   1. Configuration        6. Rendering
 *   2. Themes               7. Effects
 *   3. Preferences          8. Audio glue
 *   4. State                9. Input
 *   5. Pure game logic     10. Boot
 */

'use strict';

/* ==========================================================================
 * 1. Configuration
 * ========================================================================== */

const SIZE = 4;
const WIN_VALUE = 2048; // the StateLess-Cube tile — reaching it wins the game
const SLIDE_MS = 120; // keep in sync with --slide in style.css
const COMBO_WINDOW_MS = 1400; // merges within this window chain into a combo
const BEST_KEY = 'statelesscube.best';
const THEME_STORAGE_KEY = 'statelesscube.theme';
const THEME_MODE_KEY = 'statelesscube.themeMode';
const MODE_ICONS = { light: '☀️', dark: '🌙', system: '🌗' };
const MODE_LABELS = { light: 'light', dark: 'dark', system: 'system' };

/* -- gamification --------------------------------------------------------- */

// Merge points fill the booster meter; a full meter grants one booster.
const CHARGE_MAX = 500;
// A combo of 3+ pays bonus charge so streaks feel rewarded beyond the score.
const COMBO_CHARGE_BONUS = 60;
// The ×2 booster doubles the points of this many merging moves.
const DOUBLE_MERGES = 5;
// Score milestones that pop a toast when crossed.
const MILESTONES = [500, 1000, 2500, 5000, 10000, 20000, 50000, 100000];
// A gentle score reminder this often while a game is running.
const REMINDER_MS = 40000;
// Tiles at or above this value announce "new tile unlocked".
const UNLOCK_FROM = 16;
// Boosters, in the order they appear in the dock.
const BOOSTERS = {
  hammer: { glyph: '🔨', label: 'Hammer', hint: 'Tap a tile to smash it' },
  shuffle: { glyph: '🔀', label: 'Shuffle', hint: 'The board gets rearranged' },
  double: { glyph: '✨', label: '×2', hint: `Double points for the next ${DOUBLE_MERGES} merges` },
};
const BOOSTER_IDS = Object.keys(BOOSTERS);

/* -- levels --------------------------------------------------------------- */

// Levels run 1..LEVEL_MAX. Each tier says how many points one level-up costs
// while the *current* level is at or below `upTo`: the first ten jumps cost
// 200 each (level 11 at 2,000 points), the next twenty cost 1,000 each
// (level 31 at 22,000), then the climb slows down.
const LEVEL_MAX = 1000;
const LEVEL_TIERS = [
  { upTo: 10, step: 200 },
  { upTo: 30, step: 1000 },
  { upTo: 100, step: 2500 },
  { upTo: LEVEL_MAX - 1, step: 5000 },
];
// Rank names: the highest entry whose `from` the level has reached.
const LEVEL_NAMES = [
  { from: 1, name: 'Newbie' },
  { from: 3, name: 'Rookie' },
];
// Every level-up tops up the booster meter a little.
const LEVEL_CHARGE_BONUS = 100;
const BEST_LEVEL_KEY = 'statelesscube.bestLevel';

/* -- demo build ----------------------------------------------------------- */

// `npm run build:demo` (scripts/build-demo.mjs) writes a free demo to
// dist-demo/: the first levels, then an end card. Its generated
// src/diag-config.js sets window.__CUBE_DEMO__ = { id, stages, unit, page }.
// In the full game it is undefined, and every demo call below does nothing.
// The locked content is cut out of the demo's files at build time: the lines
// between a pair of demo-cut markers are not in dist-demo/.
const DEMO_SPEC = (typeof globalThis !== 'undefined' && globalThis.__CUBE_DEMO__) || null;

// Every saved key goes through these two. A demo keeps its saves in memory:
// on the web it shares an origin with the full game, so it must neither read
// the player's real saves nor leave any behind; every visit starts at level 1.
const demoSaves = new Map();

function readSaved(key) {
  if (DEMO_SPEC) return demoSaves.has(key) ? demoSaves.get(key) : null;
  return localStorage.getItem(key);
}

function writeSaved(key, value) {
  if (DEMO_SPEC) demoSaves.set(key, String(value));
  else localStorage.setItem(key, value);
}

/* ==========================================================================
 * 2. Themes — kid & grownup friendly icon sets with modern duotone ramps.
 *
 * Every theme builds toward the StateLess-Cube. Each tile carries a
 * `from`/`to` gradient pair (candy duotone) plus the foreground colour, so
 * the board reads as one palette instead of a list of flat swatches.
 * Internal values (2, 4, 8, ... 2048) and all game logic stay unchanged.
 * ========================================================================== */

const THEMES = {
  robots: {
    label: 'Robots & AI',
    glyph: '🤖',
    accent: '#7c5cff',
    accent2: '#31d8ff',
    goal: { sym: '🧊', name: 'StateLess-Cube', from: '#a5ecff', to: '#38bdf8' },
    tiles: [
      { sym: '🤖', name: 'Narrow Bot', from: '#ece9ff', to: '#c9c2ff', fg: '#2a2350' },
      { sym: '🧪', name: 'ML Model', from: '#dcf4ff', to: '#a8e4ff', fg: '#123a52' },
      { sym: '🧠', name: 'Neural Net', from: '#ffdcb0', to: '#ffb877', fg: '#4a2a10' },
      { sym: '🗣️', name: 'LLM', from: '#ffbcac', to: '#ff8f7a', fg: '#4d1a12' },
      { sym: '👁️', name: 'Vision', from: '#ffa8a8', to: '#ff6f91', fg: '#4d1024' },
      { sym: '🦾', name: 'Agent', from: '#ff97b2', to: '#f45c8c', fg: '#ffffff' },
      { sym: '🧩', name: 'AGI', from: '#ffeeb6', to: '#ffd35c', fg: '#4a3708' },
      { sym: '🌐', name: 'World', from: '#d0f8ca', to: '#86e8a4', fg: '#14402a' },
      { sym: '🧬', name: 'Recursive', from: '#bdf3de', to: '#63dcb4', fg: '#0d3a2c' },
      { sym: '💫', name: 'Seed', from: '#ddceff', to: '#a78bfa', fg: '#2c1c52' },
    ],
  },
  space: {
    label: 'Space',
    glyph: '🚀',
    accent: '#5b6cff',
    accent2: '#ff5cc8',
    goal: { sym: '💫', name: 'StateLess-Cube', from: '#d9f2ff', to: '#4fd1ff' },
    tiles: [
      { sym: '🌙', name: 'Moon', from: '#ecefff', to: '#c3ccff', fg: '#101a4a' },
      { sym: '🌍', name: 'Earth', from: '#cef6ff', to: '#7ad4f5', fg: '#06304a' },
      { sym: '☄️', name: 'Comet', from: '#e6daff', to: '#b79cff', fg: '#1f1050' },
      { sym: '🔭', name: 'Telescope', from: '#e0e7ff', to: '#adbaf0', fg: '#131a4a' },
      { sym: '🚀', name: 'Rocket', from: '#ffc9c9', to: '#ff8a8a', fg: '#4d1010' },
      { sym: '🌌', name: 'Galaxy', from: '#cfc9ff', to: '#8b84e8', fg: '#14104a' },
      { sym: '🌟', name: 'Star', from: '#fff7cd', to: '#ffd75e', fg: '#4a3508' },
      { sym: '🌠', name: 'Shooting Star', from: '#f4dcff', to: '#c08cff', fg: '#2a1050' },
      { sym: '🌑', name: 'New Moon', from: '#f1f3f7', to: '#c4c9d4', fg: '#26303a' },
      { sym: '🌈', name: 'Rainbow', from: '#ffdced', to: '#b4a8ff', fg: '#2a1040' },
    ],
  },
  candy: {
    label: 'Candy',
    glyph: '🍬',
    accent: '#ff3fa4',
    accent2: '#7c5cff',
    goal: { sym: '🎂', name: 'StateLess-Cube', from: '#fff2cc', to: '#ff7ab8' },
    tiles: [
      { sym: '🍬', name: 'Candy', from: '#ffdcf4', to: '#ff8ad8', fg: '#4a0e3a' },
      { sym: '🍭', name: 'Lollipop', from: '#ffe6ec', to: '#ff9ab5', fg: '#4a0e22' },
      { sym: '🍫', name: 'Chocolate', from: '#ecd9ca', to: '#c4a289', fg: '#3a2418' },
      { sym: '🍩', name: 'Donut', from: '#ffe7d6', to: '#f5b995', fg: '#4a2814' },
      { sym: '🍪', name: 'Cookie', from: '#ffedcd', to: '#e8b978', fg: '#4a3008' },
      { sym: '🧁', name: 'Cupcake', from: '#f4ddff', to: '#c9a4ff', fg: '#2f1350' },
      { sym: '🍰', name: 'Cake', from: '#fff6cc', to: '#ffc978', fg: '#4a3210' },
      { sym: '🍮', name: 'Pudding', from: '#eaffec', to: '#a6ecb0', fg: '#123a1c' },
      { sym: '🍦', name: 'Ice Cream', from: '#e5f7ff', to: '#a2e4ff', fg: '#0c3550' },
      { sym: '🥧', name: 'Pie', from: '#ffe2f2', to: '#ff9ec2', fg: '#4a1030' },
    ],
  },
};

const DEFAULT_THEME = 'candy';

let currentTheme = DEFAULT_THEME;

function themeFor(value) {
  const theme = THEMES[currentTheme] || THEMES[DEFAULT_THEME];
  const idx = Math.log2(value);
  const tile = theme.tiles[idx - 1]; // value 2 -> index 0
  if (value === WIN_VALUE) return theme.goal;
  if (tile) return tile;
  return { sym: String(value), name: String(value), from: theme.accent, to: theme.accent2, fg: '#ffffff' };
}

function tileLabel(value) {
  const t = themeFor(value);
  return { sym: t.sym, name: t.name };
}

/* ==========================================================================
 * 3. Preferences — theme, colour mode, sound, preview overrides
 * ========================================================================== */

function loadTheme() {
  try {
    const saved = readSaved(THEME_STORAGE_KEY);
    if (saved && THEMES[saved]) currentTheme = saved;
  } catch (_) { /* private mode */ }
}

function saveTheme() {
  try { writeSaved(THEME_STORAGE_KEY, currentTheme); } catch (_) { /* private mode */ }
}

function setTheme(id) {
  if (!THEMES[id]) return;
  currentTheme = id;
  saveTheme();
  // render/announce touch the DOM; only run them in the browser.
  if (typeof window !== 'undefined') {
    render();
    themeWave();
    syncThemeRail();
    announce(`Theme: ${THEMES[id].label}`);
  }
}

// A new theme rolls over the board as a wave, from the top-left corner.
let themeWaveTimer = 0;

function themeWave() {
  if (!ui.board || prefersReducedMotion()) return;
  ui.board.classList.remove('theme-swap');
  restyle(ui.board);
  ui.board.classList.add('theme-swap');
  clearTimeout(themeWaveTimer);
  themeWaveTimer = setTimeout(() => ui.board.classList.remove('theme-swap'), 800);
}

/* -- colour mode (light / dark / system) --------------------------------- */

let themeMode = 'system';

function loadThemeMode() {
  try {
    const saved = readSaved(THEME_MODE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') themeMode = saved;
  } catch (_) { /* private mode */ }
}

function saveThemeMode() {
  try { writeSaved(THEME_MODE_KEY, themeMode); } catch (_) { /* private mode */ }
}

function applyThemeMode() {
  const html = typeof document !== 'undefined' ? document.documentElement : null;
  if (!html) return;
  if (themeMode === 'system') {
    delete html.dataset.theme;
  } else {
    html.dataset.theme = themeMode;
  }
  if (typeof window !== 'undefined' && ui.modeGlyph) {
    ui.modeGlyph.textContent = MODE_ICONS[themeMode];
    ui.modeToggle.setAttribute('aria-label', `Colour mode: ${MODE_LABELS[themeMode]}`);
  }
}

function cycleThemeMode() {
  const order = ['system', 'light', 'dark'];
  const i = order.indexOf(themeMode);
  themeMode = order[(i + 1) % order.length];
  saveThemeMode();
  applyThemeMode();
  tap();
  announce(`Colour mode: ${MODE_LABELS[themeMode]}`);
}

/* -- preview overrides (?theme=candy&mode=dark&clean=1) ------------------- */

function applyPreviewParams() {
  if (typeof window === 'undefined' || !window.location) return;
  let params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (_) {
    return;
  }
  const theme = params.get('theme');
  if (theme && THEMES[theme]) {
    currentTheme = theme;
  }
  const mode = params.get('mode');
  if (mode === 'light' || mode === 'dark' || mode === 'system') {
    themeMode = mode;
  }
  if (params.get('sound') === 'off' && typeof Sound !== 'undefined') {
    Sound.setEnabled(false);
  }
  const seed = params.get('seed');
  if (seed && !Number.isNaN(Number(seed))) {
    seedRandom(Number(seed));
  }
  if (params.get('clean') === '1' && typeof document !== 'undefined') {
    document.documentElement.classList.add('clean');
  }
  const config = (typeof window !== 'undefined' && window.__DIAG_ENDPOINT__ !== undefined)
    ? window
    : {};
  const variant = params.get('variant') || config.__DIAG_VARIANT__ || '';
  if (variant && typeof document !== 'undefined') {
    // Several variants can be combined: "no-glass,no-aurora".
    variant.split(',').map((v) => v.trim()).filter(Boolean)
      .forEach((v) => document.documentElement.classList.add(`variant-${v}`));
  }
  // The staged screenshot board would skip ahead: never in a demo.
  if (!DEMO_SPEC && (params.get('demo') === '1' || config.__DIAG_DEMO__)) {
    state.demo = true;
  }
  if (config.__DIAG_THEME__ && THEMES[config.__DIAG_THEME__]) {
    currentTheme = config.__DIAG_THEME__;
  }
}

/* ==========================================================================
 * 4. State
 * ========================================================================== */

// Lightweight context for the diagnostics module (src/diag.js): what the
// game was doing, and how long the last action took. Written on every move,
// so it must stay cheap.
if (typeof window !== 'undefined') {
  window.__GAME_STATS = { actions: 0, particles: 0, toasts: 0, nodes: 0, lastAction: null, lastActionMs: 0 };
}

// A seeded random source (?seed=N) so a run can be reproduced exactly.
// mulberry32 — small, fast, good enough for tile placement.
let randomSource = Math.random;
let randomSeed = 0;

function seedRandom(seed) {
  randomSeed = seed >>> 0;
  let a = randomSeed;
  randomSource = function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rand() {
  return randomSource();
}

const state = {
  grid: [],
  score: 0,
  best: 0,
  won: false,   // reached WIN_VALUE at least once this game
  over: false,  // no moves left
  combo: 0,     // consecutive merging moves
  comboAt: 0,   // timestamp of the last merge
  history: null, // one-step undo snapshot
  demo: false,  // deterministic board for screenshots
  // -- gamification --
  charge: 0,            // booster meter, 0..CHARGE_MAX
  boosters: { hammer: 0, shuffle: 0, double: 0 },
  doubleLeft: 0,        // merging moves still paid double
  highest: 0,           // highest tile seen this game (for unlock toasts)
  level: 1,             // derived from score via levelFor()
  bestLevel: 1,         // highest level ever reached (localStorage)
  bestBeaten: false,    // celebrated "new best" already this game
  moves: 0,             // moves played this game
  // -- timer (ms accumulated while running + the moment it last resumed) --
  elapsed: 0,
  runningSince: 0,
};

function snapshot() {
  return {
    grid: copyGrid(state.grid),
    score: state.score,
    won: state.won,
    charge: state.charge,
    boosters: Object.assign({}, state.boosters),
    doubleLeft: state.doubleLeft,
  };
}

function remember() {
  state.history = snapshot();
}

// Restores a snapshot into the state. Pure state only — no DOM.
function applySnapshot(snap) {
  state.grid = snap.grid;
  state.score = snap.score;
  state.won = snap.won;
  state.combo = 0;
  state.over = false;
  if (snap.charge != null) state.charge = snap.charge;
  if (snap.boosters) state.boosters = Object.assign({}, snap.boosters);
  if (snap.doubleLeft != null) state.doubleLeft = snap.doubleLeft;
  state.level = levelFor(state.score).level;
}

function canUndo() {
  return Boolean(state.history);
}

function undo() {
  if (!state.history || demo.over) return false;
  cancelTargeting();
  applySnapshot(state.history);
  state.history = null;
  hideOverlay();
  render();
  updateUndoButton();
  updateStreak();
  updateMeter();
  updateBoosters();
  updateLevel();
  resumeTimer();
  tap();
  announce('Move undone');
  return true;
}

// Pure: the combo counter for a merge that happens at `now`.
// Consecutive merges inside the window chain into a combo.
function nextCombo(combo, comboAt, now) {
  return now - comboAt <= COMBO_WINDOW_MS ? combo + 1 : 1;
}

// Pure: what a streak of `combo` merging moves looks like. `heat` (0..5)
// drives the badge, the glow around the board, the shockwave and the sound.
function comboTier(combo) {
  if (combo >= 6) return { heat: 5, label: `Stateless ×${combo}!` };
  if (combo === 5) return { heat: 4, label: 'Insane ×5!' };
  if (combo === 4) return { heat: 3, label: 'Great ×4!' };
  if (combo === 3) return { heat: 2, label: 'Combo ×3!' };
  if (combo === 2) return { heat: 1, label: 'Nice!' };
  return { heat: 0, label: '' };
}

// Pure: the hit-stop of a merge, in ms: how long the new tile holds its
// squashed impact pose (white-hot) before it springs out and the effects
// fire. Small merges don't stop; big tiles and long combos hit harder. Input
// is never held: the next move is accepted as soon as the slide ends.
const HIT_STOP_MAX_MS = 80;

function hitStopMs(value, combo) {
  const level = Math.log2(value || 1);
  if (level < 3) return 0; // 2s and 4s: no stop
  const ms = 10 + level * 5 + Math.max(0, (combo || 1) - 1) * 8;
  return Math.min(HIT_STOP_MAX_MS, Math.round(ms));
}

/* -- gamification helpers (pure) ------------------------------------------ */

// "m:ss" for the HUD timer; hours roll into the minutes ("72:05").
function formatTime(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Adds merge points to the meter. Returns { charge, earned } where `earned`
// is how many boosters the player just filled up (usually 0 or 1).
function addCharge(charge, points) {
  const total = Math.max(0, charge) + Math.max(0, points || 0);
  return { charge: total % CHARGE_MAX, earned: Math.floor(total / CHARGE_MAX) };
}

// Picks a booster id. `rng` is injectable so tests stay deterministic.
function pickBooster(rng = Math.random) {
  return BOOSTER_IDS[Math.floor(rng() * BOOSTER_IDS.length) % BOOSTER_IDS.length];
}

// Doubles the points of a merging move while the ×2 booster is active.
// Returns { gained, doubleLeft }.
function applyDouble(gained, doubleLeft) {
  if (!gained || doubleLeft <= 0) return { gained, doubleLeft: Math.max(0, doubleLeft) };
  return { gained: gained * 2, doubleLeft: doubleLeft - 1 };
}

// The score milestones crossed when the score moves from `before` to `after`.
function milestonesCrossed(before, after) {
  return MILESTONES.filter((m) => before < m && after >= m);
}

function highestTile(grid = state.grid) {
  return grid.reduce((max, row) => Math.max(max, ...row), 0);
}

// Hammer: clears one cell. Returns the removed value (0 when the cell was empty).
function removeTile(grid, { r, c }) {
  const value = grid[r][c];
  grid[r][c] = 0;
  return value;
}

// Shuffle: the same tiles, in new places (Fisher–Yates over all 16 cells).
// Mutates `grid` in place and returns it. `rng` is injectable for tests.
function shuffleGrid(grid, rng = Math.random) {
  const values = grid.flat();
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  for (let r = 0; r < SIZE; r++) grid[r] = values.slice(r * SIZE, r * SIZE + SIZE);
  return grid;
}

function countBoosters(boosters) {
  return BOOSTER_IDS.reduce((sum, id) => sum + (boosters[id] || 0), 0);
}

/* -- level helpers (pure) -------------------------------------------------- */

// Points needed to climb from `level` to `level + 1`; Infinity at the cap.
function levelStep(level) {
  if (level >= LEVEL_MAX) return Infinity;
  const tier = LEVEL_TIERS.find((t) => level <= t.upTo);
  return tier ? tier.step : Infinity;
}

// Total score at which `level` is reached (level 1 -> 0).
function levelThreshold(level) {
  let total = 0;
  for (let l = 1; l < Math.min(level, LEVEL_MAX); l++) total += levelStep(l);
  return total;
}

// Where a score sits on the ladder:
//   { level, floor, next, progress } — `next` is null at the cap,
//   `progress` is 0..1 towards the next level.
function levelFor(score) {
  const s = Math.max(0, score || 0);
  let level = 1;
  let floor = 0;
  while (level < LEVEL_MAX && s >= floor + levelStep(level)) {
    floor += levelStep(level);
    level++;
  }
  if (level >= LEVEL_MAX) return { level: LEVEL_MAX, floor, next: null, progress: 1 };
  const next = floor + levelStep(level);
  return { level, floor, next, progress: (s - floor) / (next - floor) };
}

function levelName(level) {
  let name = LEVEL_NAMES[0].name;
  LEVEL_NAMES.forEach((entry) => { if (level >= entry.from) name = entry.name; });
  return name;
}

/* -- demo limit (pure) ------------------------------------------------------ */

// The kit's demo (packages/kit/src/core/demo.ts, kit 1.1.5), copied: this
// game does not use the kit. `reach(n)` says the game moved to stage n (0 =
// the first); reaching the stage after the last ends the demo. The page that
// embeds a demo (an iframe) is told about the start, every stage and the end.
// A page that draws its own end card (the studio's player) says so with
// { source: 'statelesssquad-host', type: 'end-card' }, and `hosted` turns
// true; a hub such as itch.io says nothing, so the game shows its card there.
// Without `options` it is inactive and every call does nothing.
function createDemo(id, options, post = postToParent, listen = listenToParent) {
  const active = Boolean(options);
  const stages = (options && options.stages) || [];
  const ends = [];
  let stage = 0;
  let over = false;
  let hosted = false;
  const send = (type) => post({ source: 'statelesssquad-demo', id, type, stage, stages });
  const demo = {
    active,
    options: options || null,
    get over() { return over; },
    get stage() { return stage; },
    get hosted() { return hosted; },
    reach(n) {
      if (!active || over || !(n > stage)) return;
      stage = Math.min(n, stages.length);
      if (stage >= stages.length) demo.end();
      else send('stage');
    },
    end() {
      if (!active || over) return;
      over = true;
      stage = stages.length;
      send('end');
      ends.forEach((fn) => fn());
    },
    onEnd(fn) { ends.push(fn); },
  };
  if (active) {
    listen((data) => {
      if (data && typeof data === 'object' && data.source === 'statelesssquad-host' && data.type === 'end-card') hosted = true;
    });
    send('start');
  }
  return demo;
}

// Hears the page around the game, if there is one: messages from any other
// window are ignored.
function listenToParent(fn) {
  const self = typeof window !== 'undefined' ? window : globalThis;
  if (!self.parent || self.parent === self || typeof self.addEventListener !== 'function') return;
  self.addEventListener('message', (ev) => { if (ev.source === self.parent) fn(ev.data); });
}

// Tells the page around the game (the studio page's player), if there is one.
function postToParent(message) {
  try {
    const self = typeof window !== 'undefined' ? window : globalThis;
    if (self.parent && self.parent !== self) self.parent.postMessage(message, '*');
  } catch (_) { /* no parent to tell */ }
}

// Stage n is level n + 1: the demo of levels 1–5 ends where level 6 begins.
const demo = createDemo(DEMO_SPEC ? DEMO_SPEC.id : 'stateless-cube', DEMO_SPEC);
demo.onEnd(() => endDemo());

/* ==========================================================================
 * 5. Pure game logic (no DOM). Everything here is unit-testable.
 * ========================================================================== */

function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function copyGrid(grid) {
  return grid.map((row) => row.slice());
}

// Drops zeros: [2, 0, 2, 4] -> [2, 2, 4]
function compress(line) {
  return line.filter((v) => v !== 0);
}

// Merges adjacent equal pairs once, left to right, on a compressed line:
// [2, 2, 4] -> [4, 4]; [2, 2, 2, 2] -> [4, 4]. A tile never merges twice.
// If `trace` is given, every merge is recorded as { to, from: [i, j], value }
// using indices of the input (compressed) line and output line respectively.
function merge(line, trace) {
  const out = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== 0 && line[i] === line[i + 1]) {
      out.push(line[i] * 2);
      if (trace) trace.push({ to: out.length - 1, from: [i, i + 1], value: line[i] * 2 });
      i++;
    } else {
      out.push(line[i]);
    }
  }
  return out;
}

// Slides one line towards index 0. Returns:
//   line   – the new line, zero-padded to the original length
//   moves  – one entry per source tile: { from, to, merged }
//   gained – points earned by merges in this line
function slideLine(line) {
  const trace = [];
  const merged = merge(compress(line), trace);
  const result = merged.concat(Array(line.length - merged.length).fill(0));

  const moves = [];
  let k = 0; // index in the compressed line
  line.forEach((value, from) => {
    if (value === 0) return;
    const hit = trace.find((t) => t.from.includes(k));
    const removedBefore = trace.filter((t) => t.from[1] < k).length;
    moves.push({ from, to: hit ? hit.to : k - removedBefore, merged: Boolean(hit) });
    k++;
  });

  const gained = trace.reduce((sum, t) => sum + t.value, 0);
  return { line: result, moves, gained };
}

// Maps (line index, position along the line) -> grid cell for each direction.
const CELL = {
  left: (i, p) => ({ r: i, c: p }),
  right: (i, p) => ({ r: i, c: SIZE - 1 - p }),
  up: (i, p) => ({ r: p, c: i }),
  down: (i, p) => ({ r: SIZE - 1 - p, c: i }),
};

// Applies a move to `grid` in place. Returns null when nothing changed,
// otherwise { moves, gained } where each move is
// { from: {r, c}, to: {r, c}, value, merged } in grid coordinates.
function move(dir, grid = state.grid) {
  const at = CELL[dir];
  if (!at) throw new Error(`Unknown direction: ${dir}`);

  const next = emptyGrid();
  const moves = [];
  let gained = 0;
  let changed = false;

  for (let i = 0; i < SIZE; i++) {
    const line = [];
    for (let p = 0; p < SIZE; p++) {
      const { r, c } = at(i, p);
      line.push(grid[r][c]);
    }
    const slid = slideLine(line);
    gained += slid.gained;
    slid.line.forEach((v, p) => {
      const { r, c } = at(i, p);
      next[r][c] = v;
      if (v !== grid[r][c]) changed = true;
    });
    slid.moves.forEach((m) => {
      moves.push({ from: at(i, m.from), to: at(i, m.to), value: line[m.from], merged: m.merged });
    });
  }

  if (!changed) return null;
  for (let r = 0; r < SIZE; r++) grid[r] = next[r];
  return { moves, gained };
}

const moveLeft = (grid) => move('left', grid);
const moveRight = (grid) => move('right', grid);
const moveUp = (grid) => move('up', grid);
const moveDown = (grid) => move('down', grid);

// Puts a 2 (90%) or 4 (10%) in a random empty cell. Returns the cell or null.
// With ?seed=N the sequence is deterministic, which makes the performance
// benchmark comparable between runs.
function addRandomTile(grid = state.grid) {
  const empty = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (v === 0) empty.push({ r, c }); }));
  if (empty.length === 0) return null;
  const cell = empty[Math.floor(rand() * empty.length)];
  grid[cell.r][cell.c] = rand() < 0.9 ? 2 : 4;
  return cell;
}

function hasWon(grid = state.grid) {
  return grid.some((row) => row.some((v) => v >= WIN_VALUE));
}

function isGameOver(grid = state.grid) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      if (v === 0) return false;
      if (r < SIZE - 1 && grid[r + 1][c] === v) return false;
      if (c < SIZE - 1 && grid[r][c + 1] === v) return false;
    }
  }
  return true;
}

// A fixed board used for screenshots / demos so the look is reproducible.
// It deliberately contains mergeable pairs (first two columns) so the merge
// effects can be captured.
const DEMO_GRID = [
  [2, 2, 4, 8],
  [4, 4, 8, 16],
  [8, 16, 32, 64],
  [0, 0, 0, 0],
];

// Switches the deterministic demo board on (used for the product page
// capture and for previews).
function setDemoMode(on) {
  state.demo = Boolean(on) && !DEMO_SPEC;
}

function newGame() {
  state.grid = emptyGrid();
  state.score = 0;
  state.won = false;
  state.over = false;
  state.combo = 0;
  state.history = null;
  state.charge = 0;
  state.boosters = { hammer: 0, shuffle: 0, double: 0 };
  state.doubleLeft = 0;
  state.bestBeaten = false;
  state.moves = 0;
  state.elapsed = 0;
  state.runningSince = 0;
  if (state.demo) {
    state.grid = copyGrid(DEMO_GRID);
    state.score = 5120;
    state.charge = 320;
    state.boosters = { hammer: 1, shuffle: 1, double: 1 };
  } else {
    addRandomTile();
    addRandomTile();
  }
  state.highest = highestTile();
  state.level = levelFor(state.score).level;
}

/* ==========================================================================
 * 6. Rendering
 * ========================================================================== */

const ui = {};
let busy = false; // true while tiles are sliding; input is ignored
const tileAt = new Map(); // "r,c" -> tile element from the last render
const droppedTiles = []; // tiles that lost a merge, removed on the next render
let renderedTheme = null; // the theme the tiles were last painted with

const key = ({ r, c }) => `${r},${c}`;

// Write only what changed: setting the same text or attribute again still
// invalidates the style and layout of the element, and the HUD is updated on
// every merge.
function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

function setAttr(el, name, value) {
  if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
}

function setStyle(el, prop, value) {
  if (el && el.style.getPropertyValue(prop) !== value) el.style.setProperty(prop, value);
}

// Restarting a CSS animation needs the style to be resolved between removing
// and re-adding its class — not a layout. `void el.offsetWidth` forced a full
// layout of the page, several times per move; reading a computed property
// that does not depend on layout resolves the style only.
function restyle(el) {
  void getComputedStyle(el).animationName;
}

function setPosition(el, { r, c }) {
  el.style.setProperty('--r', r);
  el.style.setProperty('--c', c);
}

// 64 and up shine, 256 and up twinkle too.
function tileClass(value) {
  return `tile tile-${value <= WIN_VALUE ? value : 'super'} len-${String(value).length}` +
    `${value >= 64 ? ' shiny' : ''}${value >= 256 ? ' sparkly' : ''}`;
}

function createTile(value, cell, extraClass) {
  const { sym, from, to, fg } = themeFor(value);
  const tile = document.createElement('div');
  tile.className = tileClass(value);
  if (extraClass) tile.classList.add(extraClass);
  if (value === WIN_VALUE) tile.classList.add('goal');
  setPosition(tile, cell);
  tile.title = themeFor(value).name; // hover / accessible name

  const inner = document.createElement('div');
  inner.className = 'tile-inner';
  inner.style.setProperty('--tile-a', from);
  inner.style.setProperty('--tile-b', to);
  inner.style.setProperty('--tile-fg', fg);

  const glyph = document.createElement('span');
  glyph.className = 'tile-glyph';
  glyph.textContent = sym;
  inner.appendChild(glyph);
  // The glint and the twinkle (CSS, from 64 / 256 up); each tile has its own
  // phase so the board shimmers rather than flashing in step.
  const shine = document.createElement('span');
  shine.className = 'tile-shine';
  shine.style.setProperty('--glint-delay', `${(Math.random() * 3.8).toFixed(2)}s`);
  inner.appendChild(shine);
  tile.appendChild(inner);
  return tile;
}

// Repaints one tile in place (the value changed: a merge).
function updateTile(tile, value) {
  const { sym, from, to, fg } = themeFor(value);
  tile.className = tileClass(value);
  if (value === WIN_VALUE) tile.classList.add('goal');
  tile.title = themeFor(value).name;
  const inner = tile.firstChild;
  inner.style.setProperty('--tile-a', from);
  inner.style.setProperty('--tile-b', to);
  inner.style.setProperty('--tile-fg', fg);
  inner.firstChild.textContent = sym;
}

// Redraws the board from state — but only the tiles that actually changed.
//
// The old version threw away all 16 tiles and rebuilt them on every move.
// On a phone that meant 16 DOM nodes, 16 style recalculations and 16
// animations per move, and the whole board visibly popped each time. Now the
// existing elements are reused: only the merged tile and the new tile are
// touched, everything else keeps its node, its animation state and its layer.
function render(spawned, mergedCells = [], entering) {
  const mergedKeys = new Set(mergedCells.map(key));
  const themeChanged = renderedTheme !== currentTheme;
  renderedTheme = currentTheme;

  // Apply theme class so the board/palette follows the chosen theme, and
  // publish the accent so the whole UI (HUD, dock, chips) matches it.
  const theme = THEMES[currentTheme];
  if (ui.board) {
    // Swap only the theme class: state classes (boosted, targeting) must survive a redraw.
    Array.from(ui.board.classList)
      .filter((c) => c.indexOf('theme-') === 0)
      .forEach((c) => ui.board.classList.remove(c));
    ui.board.classList.add(`theme-${currentTheme}`);
  }
  if (theme && themeChanged) {
    // Only when the theme really changed: writing a custom property on the
    // root invalidates the style of every element that uses it, which is a
    // full-document style recalculation. Doing that on every move was the
    // single biggest source of jank.
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.style.setProperty('--theme-accent', theme.accent);
      document.documentElement.style.setProperty('--theme-accent-2', theme.accent2);
    }
    if (ui.board) {
      ui.board.style.setProperty('--theme-accent', theme.accent);
      ui.board.style.setProperty('--theme-accent-2', theme.accent2);
    }
  }

  const next = new Map();
  const stale = [];
  // A tile that merges twice in a row must replay its pop: take the class
  // off and resolve its style before it goes back on. The first restyle does
  // the work; the others find the style clean.
  mergedKeys.forEach((k) => {
    const el = tileAt.get(k);
    if (el && el.classList.contains('merged')) { el.classList.remove('merged'); restyle(el); }
  });

  state.grid.forEach((row, r) => row.forEach((value, c) => {
    if (value === 0) return;
    const cell = { r, c };
    const k = key(cell);
    const existing = tileAt.get(k);
    const isNew = spawned && spawned.r === r && spawned.c === c;
    const isMerged = mergedKeys.has(k);

    if (existing && !isNew) {
      // The tile is still there: keep the node, only repaint when the value
      // changed (a merge) or when the theme changed.
      if (themeChanged || existing.dataset.value !== String(value)) {
        updateTile(existing, value);
        existing.dataset.value = String(value);
      }
      existing.classList.toggle('merged', isMerged);
      existing.classList.toggle('new', false);
      existing.classList.toggle('moving', false);
      // The tile normally arrives here already in place (the slide moved it);
      // after an undo it may not be, so only write when it really differs.
      if (existing.style.getPropertyValue('--r') !== String(r) ||
          existing.style.getPropertyValue('--c') !== String(c)) {
        setPosition(existing, cell);
      }
      next.set(k, existing);
      return;
    }

    let cls = '';
    if (isNew) cls = 'new';
    else if (isMerged) cls = 'merged';
    else if (entering) cls = 'new';
    const tile = createTile(value, cell, cls);
    tile.dataset.value = String(value);
    ui.tiles.appendChild(tile);
    next.set(k, tile);
  }));

  // Remove the tiles that are gone (merged away or replaced).
  tileAt.forEach((el, k) => {
    if (!next.has(k)) stale.push(el);
  });
  stale.forEach((el) => el.remove());
  // Tiles that lost a merge were dropped from the map during the slide.
  droppedTiles.forEach((el) => el.remove());
  droppedTiles.length = 0;

  tileAt.clear();
  next.forEach((el, k) => tileAt.set(k, el));

  if (ui.score && ui.score.textContent !== String(state.score)) {
    ui.score.textContent = state.score;
  }
  if (ui.best && ui.best.textContent !== String(state.best)) {
    ui.best.textContent = state.best;
  }
}

// Animates the score from `from` to `to` instead of snapping.
// The number is written at most every ~50ms: a text change invalidates the
// layout of the HUD, and 60 writes a second is not worth the smoothness.
function countUp(el, from, to) {
  if (!el) return;
  if (from === to) { el.textContent = to; return; }
  const start = performance.now();
  const dur = 420;
  let lastPaint = 0;
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    const value = Math.round(from + (to - from) * eased);
    if (now - lastPaint >= 45 || p >= 1) {
      lastPaint = now;
      el.textContent = value;
    }
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function floatScore(points) {
  if (!ui.scoreAdd) return;
  const el = ui.scoreAdd;
  el.textContent = `+${points}`;
  el.classList.remove('go');
  restyle(el);
  el.classList.add('go');
}

function showOverlay(title, sub, buttonLabel, emoji, onClick) {
  ui.overlayTitle.textContent = title;
  ui.overlaySub.textContent = sub || '';
  ui.overlayEmoji.textContent = emoji || '🏆';
  ui.overlayButton.textContent = buttonLabel;
  ui.overlayButton.onclick = onClick;
  ui.overlay.hidden = false;
  ui.overlayButton.focus();
}

function hideOverlay() {
  if (!ui.overlay) return;
  ui.overlay.hidden = true;
  // Do not leave the focus on a button that is now hidden.
  if (typeof document !== 'undefined' && document.activeElement === ui.overlayButton) {
    ui.overlayButton.blur();
  }
  ui.overlayButton.onclick = null;
}

function updateUndoButton() {
  if (ui.undo && ui.undo.disabled !== !canUndo()) ui.undo.disabled = !canUndo();
}

function updateStreak() {
  if (!ui.streakCard) return;
  const show = state.combo >= 2;
  if (ui.streakCard.hidden === show) ui.streakCard.hidden = !show;
  if (ui.scoreBox) ui.scoreBox.classList.toggle('on-fire', state.combo >= 3);
  if (show) {
    setText(ui.streak, `×${state.combo}`);
    ui.streakCard.classList.remove('pop');
    restyle(ui.streakCard);
    ui.streakCard.classList.add('pop');
    // Restart the combo countdown bar: it empties over the combo window.
    if (ui.comboBar) {
      ui.comboBar.classList.remove('run');
      restyle(ui.comboBar);
      ui.comboBar.style.setProperty('--window', `${COMBO_WINDOW_MS}ms`);
      ui.comboBar.classList.add('run');
    }
  }
}

function announce(text) {
  if (ui.status) ui.status.textContent = text;
}

/* -- gamification HUD ----------------------------------------------------- */

function updateMeter() {
  if (!ui.meter) return;
  const pct = Math.round((state.charge / CHARGE_MAX) * 100);
  setStyle(ui.meterFill, 'width', `${pct}%`);
  setAttr(ui.meter, 'aria-valuenow', String(pct));
  setText(ui.meterText, pct >= 100 ? 'Booster ready!' : `Booster charge ${pct}%`);
  ui.meter.classList.toggle('hot', pct >= 75);
}

// Flashes the meter when a booster has just been earned.
function meterBurst() {
  if (!ui.meter) return;
  ui.meter.classList.remove('full');
  restyle(ui.meter);
  ui.meter.classList.add('full');
}

function updateBoosters() {
  if (!ui.boosters) return;
  BOOSTER_IDS.forEach((id) => {
    const btn = ui.boosters.querySelector(`[data-booster="${id}"]`);
    const count = ui.boosters.querySelector(`[data-count="${id}"]`);
    const n = state.boosters[id] || 0;
    setText(count, String(n));
    if (btn) {
      const disabled = n === 0 || state.over || (id === 'double' && state.doubleLeft > 0);
      if (btn.disabled !== disabled) btn.disabled = disabled;
      btn.classList.toggle('has', n > 0);
      btn.classList.toggle('armed', targeting && id === 'hammer');
    }
  });
  if (ui.boostTag) {
    ui.boostTag.hidden = state.doubleLeft <= 0;
    setText(ui.boostLeft, String(state.doubleLeft));
  }
  if (ui.board) ui.board.classList.toggle('boosted', state.doubleLeft > 0);
}

// Pops the count badge of a booster that was just earned.
function boosterPop(id) {
  if (!ui.boosters) return;
  const btn = ui.boosters.querySelector(`[data-booster="${id}"]`);
  if (!btn) return;
  btn.classList.remove('earned');
  restyle(btn);
  btn.classList.add('earned');
}

/* -- level card ------------------------------------------------------------ */

function loadBestLevel() {
  try { state.bestLevel = Math.max(1, Number(readSaved(BEST_LEVEL_KEY)) || 1); } catch (_) { state.bestLevel = 1; }
}

function saveBestLevel() {
  if (state.level <= state.bestLevel) return;
  state.bestLevel = state.level;
  try { writeSaved(BEST_LEVEL_KEY, String(state.bestLevel)); } catch (_) { /* private mode */ }
}

function updateLevel() {
  if (!ui.levelCard) return;
  const info = levelFor(state.score);
  const pct = Math.round(info.progress * 100);
  setText(ui.levelNum, String(info.level));
  setText(ui.levelValue, String(info.level));
  setText(ui.levelName, levelName(info.level));
  setStyle(ui.levelBadge, '--p', String(info.progress));
  if (Date.now() >= levelWrap) setStyle(ui.levelFill, 'width', `${pct}%`);
  setText(ui.levelPct, `${pct}%`);
  if (info.next == null) {
    setText(ui.levelNext, 'Max level — you are Stateless!');
  } else {
    const left = info.next - state.score;
    setText(ui.levelNext, `${left.toLocaleString()} ${left === 1 ? 'point' : 'points'} to Level ${info.level + 1}`);
  }
  const showBest = state.bestLevel > 1;
  if (ui.levelBest.hidden === showBest) ui.levelBest.hidden = !showBest;
  if (showBest) setText(ui.levelBestValue, String(state.bestLevel));
  setAttr(ui.levelCard, 'aria-label', `Level ${info.level}, ${levelName(info.level)}, ${pct}% to the next level`);
}

// A level-up fills the bar to the end and wraps it round to the new level's
// progress, instead of the fill sliding backwards.
let levelWrap = 0;

function wrapLevelBar() {
  if (!ui.levelFill || prefersReducedMotion()) return;
  levelWrap = Date.now() + 340;
  setStyle(ui.levelFill, 'width', '100%');
  setTimeout(() => {
    levelWrap = 0;
    ui.levelFill.classList.add('snap'); // no transition for the jump to 0
    setStyle(ui.levelFill, 'width', '0%');
    restyle(ui.levelFill);
    ui.levelFill.classList.remove('snap');
    updateLevel();
  }, 340);
}

// The celebration for one or more level-ups in a single move.
function celebrateLevel(fromLevel, toLevel) {
  const theme = THEMES[currentTheme] || THEMES[DEFAULT_THEME];
  const jumps = toLevel - fromLevel;
  const newRank = levelName(toLevel) !== levelName(fromLevel);
  if (ui.levelCard) {
    ui.levelCard.classList.remove('pop');
    restyle(ui.levelCard);
    ui.levelCard.classList.add('pop');
  }
  if (ui.levelBanner) {
    ui.levelBannerNum.textContent = String(toLevel);
    ui.levelBannerName.textContent = newRank ? `New rank: ${levelName(toLevel)}` : levelName(toLevel);
    ui.levelBanner.classList.remove('go');
    restyle(ui.levelBanner);
    ui.levelBanner.classList.add('go');
  }
  levelUp();
  flash(theme.accent2, newRank ? 'strong' : '');
  emojiRain(newRank ? '👑' : '⬆️', Math.min(8, 4 + jumps * 2));
  if (newRank || toLevel % 10 === 0) confettiBurst(newRank);
  sfx('levelUp', toLevel);
  haptic([14, 40, 14, 40, 30]);
  // No toast: the banner over the board says it, and a toast here covered
  // the score in the middle of a combo.
  wrapLevelBar();
  announce(`Level ${toLevel}, ${levelName(toLevel)}.`);
}

/* -- toasts ---------------------------------------------------------------- */

const TOAST_MS = 2600;

function toast(text, kind) {
  if (!ui.toasts) return;
  // One toast per kind: a second "new tile" in a combo chain updates the one
  // on screen (and pops it) instead of stacking over the score.
  const same = kind && Array.from(ui.toasts.children)
    .find((el) => el.dataset.kind === kind && !el.classList.contains('out'));
  if (same) {
    same.textContent = text;
    same.classList.remove('again');
    restyle(same);
    same.classList.add('again');
    clearTimeout(same.leaveTimer);
    same.leaveTimer = setTimeout(() => leaveToast(same), TOAST_MS);
    return;
  }
  // Keep the stack short: two at most, the oldest leaves first.
  while (ui.toasts.children.length >= 2) ui.toasts.firstChild.remove();
  const el = document.createElement('div');
  el.className = `toast${kind ? ` toast-${kind}` : ''}`;
  el.dataset.kind = kind || '';
  el.textContent = text;
  ui.toasts.appendChild(el);
  // Stack the toasts with absolute positions: a toast that leaves must not
  // move the ones below it, or the page shifts (CLS).
  layoutToasts();
  // Force the start state, then let the transition run.
  restyle(el);
  el.classList.add('in');
  el.leaveTimer = setTimeout(() => leaveToast(el), TOAST_MS);
}

function leaveToast(el) {
  el.classList.remove('in');
  el.classList.add('out');
  el.addEventListener('transitionend', () => { el.remove(); layoutToasts(); }, { once: true });
  setTimeout(() => { el.remove(); layoutToasts(); }, 600); // safety net
}

// Places every toast on its own row without affecting the others.
function layoutToasts() {
  if (!ui.toasts) return;
  // All reads first, then all writes: one layout instead of one per toast.
  const toasts = Array.from(ui.toasts.children);
  const heights = toasts.map((el) => el.offsetHeight);
  let top = 0;
  toasts.forEach((el, i) => {
    setStyle(el, 'top', `${top}px`);
    top += heights[i] + 8;
  });
}

/* -- timer ----------------------------------------------------------------- */

let timerHandle = null;

function elapsedMs() {
  return state.elapsed + (state.runningSince ? Date.now() - state.runningSince : 0);
}

function renderTimer() {
  if (ui.timer) ui.timer.textContent = formatTime(elapsedMs());
}

function resumeTimer() {
  if (state.over) return;
  if (!state.runningSince) state.runningSince = Date.now();
  if (!timerHandle) timerHandle = setInterval(renderTimer, 1000);
  renderTimer();
}

function pauseTimer() {
  if (state.runningSince) {
    state.elapsed += Date.now() - state.runningSince;
    state.runningSince = 0;
  }
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
  renderTimer();
}

function resetTimer() {
  pauseTimer();
  state.elapsed = 0;
  state.runningSince = 0;
  renderTimer();
}

/* -- score reminders ------------------------------------------------------- */

let reminderHandle = null;
let movesAtReminder = 0;

function scoreReminder() {
  if (state.over || state.moves === movesAtReminder) return; // idle: stay quiet
  movesAtReminder = state.moves;
  const score = state.score.toLocaleString();
  if (state.best > state.score) {
    toast(`📣 Score ${score} · ${(state.best - state.score).toLocaleString()} to beat your best`, 'remind');
  } else if (state.best > 0 && state.score > 0) {
    toast(`📣 Score ${score} · you're setting a new best!`, 'remind');
  } else {
    toast(`📣 Score ${score} · ${formatTime(elapsedMs())} played`, 'remind');
  }
}

function startReminders() {
  stopReminders();
  movesAtReminder = state.moves;
  reminderHandle = setInterval(scoreReminder, REMINDER_MS);
}

function stopReminders() {
  if (reminderHandle) clearInterval(reminderHandle);
  reminderHandle = null;
}

/* ==========================================================================
 * 7. Effects
 * ========================================================================== */

// The size of the effects layer and of one cell, measured once and kept
// until the board is resized. Effects used to read getBoundingClientRect()
// right after a DOM write, which forced a full style + layout pass two or
// three times per merge.
let boardGeometry = null;

function geometry() {
  if (!boardGeometry) {
    const cs = getComputedStyle(ui.fx);
    const w = parseFloat(cs.width);
    const h = parseFloat(cs.height);
    const gap = parseFloat(getComputedStyle(ui.board.querySelector('.cells')).columnGap) || 0;
    boardGeometry = { w, h, gap, cell: (w - (SIZE - 1) * gap) / SIZE };
  }
  return boardGeometry;
}

// The centre of a cell inside #fx — arithmetic, no layout read. The tiles
// and the effects layer share the same box, so this is where the tile sits.
function cellCenter({ r, c }) {
  const g = geometry();
  const step = g.cell + g.gap;
  return { x: c * step + g.cell / 2, y: r * step + g.cell / 2 };
}

// All particles are drawn by the canvas engine in src/fx.js (window.FX): one
// layer for every spark, glint, ring and emoji instead of one DOM element —
// and one compositor layer — per particle. See the notes there.
const hasFX = () => typeof FX !== 'undefined' && Boolean(ui.fxCanvas);

// Explosion: a level-scaled burst. Small merges throw sparks and a
// shockwave; bigger tiles add twinkling glints, a white-hot core, a screen
// flash and a quake.
//   level  – log2 of the merged value (2 -> 1, 4 -> 2, ... 2048 -> 11)
function explode(cell, level, palette, opts) {
  if (!tileAt.get(key(cell))) return;
  const o = opts || {};
  const colors = palette && palette.length ? palette : ['#fff', '#ffd', '#ff9'];
  const power = Math.max(1, Math.min(11, level || 1)); // 1..11
  if (hasFX()) {
    const { x, y } = cellCenter(cell);
    FX.burst(x, y, colors, power, o.extra);
  }
  if (power >= 6 || o.flash) flash(colors[0], power >= 9 ? 'strong' : '');
  if (power >= 7 || o.quake) quake();
}

// A full-screen colour flash for the big moments.
function flash(color, strength) {
  if (!ui.flash) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  ui.flash.style.background = color || '#fff';
  ui.flash.classList.remove('go', 'strong');
  restyle(ui.flash);
  if (strength) ui.flash.classList.add(strength);
  ui.flash.classList.add('go');
}

// The board jolts after a big explosion.
function quake() {
  if (!ui.board) return;
  ui.board.classList.remove('quake');
  restyle(ui.board);
  ui.board.classList.add('quake');
  // The animation runs on the board's children, so the board itself never
  // fires 'animationend' — clear the class on a timer instead.
  setTimeout(() => ui.board && ui.board.classList.remove('quake'), 460);
}

// Tilts the board a touch in the direction of the move — a cheap 3D cue.
function tilt(dir) {
  if (!ui.board) return;
  ['tilt-left', 'tilt-right', 'tilt-up', 'tilt-down'].forEach((c) => ui.board.classList.remove(c));
  restyle(ui.board);
  ui.board.classList.add(`tilt-${dir}`);
  setTimeout(() => ui.board.classList.remove(`tilt-${dir}`), SLIDE_MS + 160);
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia) &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// The axis of the last move, for the squash and stretch of the tiles: they
// stretch along it while they travel and squash along it when they hit.
let moveAxis = '';

function setMoveAxis(dir) {
  if (!ui.board) return;
  const axis = dir === 'left' || dir === 'right' ? 'move-x' : 'move-y';
  if (axis === moveAxis) return;
  if (moveAxis) ui.board.classList.remove(moveAxis);
  ui.board.classList.add(axis);
  moveAxis = axis;
}

// A move that goes nowhere: the tiles squash against the wall they pushed.
function bumpWall(dir) {
  if (!ui.board) return;
  const cls = `bump-${dir}`;
  ['bump-left', 'bump-right', 'bump-up', 'bump-down'].forEach((c) => ui.board.classList.remove(c));
  restyle(ui.board);
  ui.board.classList.add(cls);
  setTimeout(() => ui.board && ui.board.classList.remove(cls), 260);
}

// Combo heat (0..5): a glow inside the board that grows with the streak and
// dies with the combo window. Opacity only, on a layer of its own.
let heatTimer = 0;

function setHeat(heat) {
  if (!ui.board) return;
  setAttr(ui.board, 'data-heat', String(heat));
  clearTimeout(heatTimer);
  if (heat > 0) heatTimer = setTimeout(() => setAttr(ui.board, 'data-heat', '0'), COMBO_WINDOW_MS);
}

// Emoji rain: the merged symbol (or any glyph) rises out of the board.
function emojiRain(sym, count) {
  if (hasFX()) FX.rain(sym, count || 8);
}

// The board glows when a new highest tile appears.
function levelUp() {
  if (!ui.board) return;
  ui.board.classList.remove('levelup');
  restyle(ui.board);
  ui.board.classList.add('levelup');
  ui.board.addEventListener('animationend', () => ui.board.classList.remove('levelup'), { once: true });
}

// A soft ring that expands from the merged tile.
function ripple(cell, color, soft) {
  if (!hasFX()) return;
  const { x, y } = cellCenter(cell);
  FX.ring(x, y, color, soft);
}

// A short "nope" shake when the move is not legal.
function shake() {
  if (!ui.board) return;
  ui.board.classList.remove('shake');
  restyle(ui.board);
  ui.board.classList.add('shake');
  setTimeout(() => ui.board && ui.board.classList.remove('shake'), 360);
}

// Floating combo badge above the board; it grows and heats up with the tier.
function comboBadge(text, heat) {
  if (!ui.combo) return;
  const el = ui.combo;
  el.textContent = text;
  setAttr(el, 'data-heat', String(heat || 0));
  el.classList.remove('go');
  restyle(el);
  el.classList.add('go');
}

// Confetti: canvas-confetti (src/vendor/canvas-confetti.js) on its own
// full-screen canvas, drawn in a worker where the browser allows it — so the
// main thread stays free while it rains.
let confettiCannon = null;

function confettiBurst(big) {
  if (!confettiCannon) {
    if (typeof window === 'undefined' || typeof window.confetti !== 'function' || !ui.confettiCanvas) return;
    confettiCannon = window.confetti.create(ui.confettiCanvas, {
      resize: true,
      useWorker: true,
      disableForReducedMotion: true,
    });
  }
  const theme = THEMES[currentTheme] || THEMES[DEFAULT_THEME];
  const colors = [theme.accent, theme.accent2, '#ffd166', '#ff6b9d', '#8ef6c0', '#ffffff'];
  const shot = {
    colors,
    shapes: ['square', 'circle', 'star'],
    particleCount: big ? 90 : 55,
    spread: 62,
    startVelocity: big ? 62 : 52,
    gravity: 0.95,
    ticks: 240,
    scalar: 1.05,
    disableForReducedMotion: true,
  };
  // Two cannons from the bottom corners, crossing over the board.
  confettiCannon(Object.assign({}, shot, { angle: 62, origin: { x: 0, y: 0.82 } }));
  confettiCannon(Object.assign({}, shot, { angle: 118, origin: { x: 1, y: 0.82 } }));
  if (big) {
    // ...and a shower of stars from the top for the big moments.
    confettiCannon(Object.assign({}, shot, {
      shapes: ['star'], particleCount: 40, angle: 270, spread: 140, startVelocity: 18,
      gravity: 0.6, scalar: 1.3, origin: { x: 0.5, y: -0.05 },
    }));
  }
}

/* ==========================================================================
 * 8. Audio glue — the engine lives in sound.js and may be absent.
 * ========================================================================== */

function sfx(name, ...args) {
  if (typeof Sound === 'undefined' || !Sound || !Sound.isEnabled()) return;
  try {
    Sound[name](...args);
  } catch (_) { /* audio must never break the game */ }
}

function tap() {
  sfx('tap');
}

function haptic(ms) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(ms); } catch (_) { /* not supported */ }
  }
}

/* ==========================================================================
 * 9. Input
 * ========================================================================== */

function saveBest() {
  if (state.score <= state.best) return;
  state.best = state.score;
  try { writeSaved(BEST_KEY, String(state.best)); } catch (_) { /* private mode etc. */ }
}

function loadBest() {
  try { state.best = Number(readSaved(BEST_KEY)) || 0; } catch (_) { state.best = 0; }
}

function checkEnd() {
  if (demo.over) return; // the demo's end card is up
  const goal = themeFor(WIN_VALUE);
  if (!state.won && hasWon()) {
    state.won = true;
    confettiBurst(true);
    sfx('win');
    haptic([12, 40, 12, 40, 24]);
    announce(`You built the ${goal.name}!`);
    showOverlay(
      `You built the ${goal.name}!`,
      `Score ${state.score} — keep going?`,
      'Keep going',
      goal.sym,
      hideOverlay
    );
    comboBadge('StateLess!', 5);
  } else if (isGameOver()) {
    state.over = true;
    pauseTimer();
    stopReminders();
    cancelTargeting();
    updateBoosters();
    sfx('lose');
    haptic(60);
    announce(`Game over. Final score ${state.score}.`);
    const sub = `Level ${state.level} ${levelName(state.level)} · ${state.score} points · ${formatTime(elapsedMs())}${state.bestBeaten ? ' · New best!' : ''}`;
    showOverlay('Game over', sub, 'Play again', '🧊', start);
  }
}

// Score bookkeeping shared by moves and boosters: best, milestones, toasts.
function creditScore(gained) {
  const before = state.score;
  state.score += gained;
  const theme = THEMES[currentTheme] || THEMES[DEFAULT_THEME];

  // Beat the best score (once per game): celebrate.
  if (!state.bestBeaten && state.best > 0 && before <= state.best && state.score > state.best) {
    state.bestBeaten = true;
    toast('🏆 New best score!', 'best');
    emojiRain('🏆', 6);
    flash(theme.accent2);
    sfx('combo', 4);
  }
  saveBest();

  // Milestones: 500, 1,000, 2,500 ...
  milestonesCrossed(before, state.score).forEach((m) => {
    toast(`🎯 ${m.toLocaleString()} points!`, 'milestone');
  });

  // Levels: celebrate the climb; every level-up tops up the booster meter.
  const level = levelFor(state.score).level;
  // A demo stops where its last level ends: no level 6, no celebration of it.
  if (level > state.level) demo.reach(level - 1);
  if (demo.over) return before;
  let levelBonus = 0;
  if (level > state.level) {
    const from = state.level;
    state.level = level;
    saveBestLevel();
    levelBonus = LEVEL_CHARGE_BONUS * (level - from);
    celebrateLevel(from, level);
  }
  updateLevel();

  // Booster meter.
  const charged = addCharge(state.charge, gained + levelBonus + (state.combo >= 3 ? COMBO_CHARGE_BONUS : 0));
  state.charge = charged.charge;
  for (let i = 0; i < charged.earned; i++) {
    const id = pickBooster();
    state.boosters[id] += 1;
    toast(`🎁 Booster earned: ${BOOSTERS[id].glyph} ${BOOSTERS[id].label}`, 'booster');
    boosterPop(id);
    meterBurst();
    sfx('spawn');
  }
  updateMeter();
  if (charged.earned) updateBoosters();
  return before;
}

// The end of a demo: the game stops for good. state.over blocks every move,
// booster and timer; the CSS loops pause. A page that said it draws the end
// card (the studio's player) gets it; anywhere else (on its own, or in a
// hub's iframe such as itch.io's) the game shows one.
function endDemo() {
  state.over = true;
  pauseTimer();
  stopReminders();
  cancelTargeting();
  updateBoosters();
  updateUndoButton();
  // The level strip would count down to a level the demo does not have.
  setText(ui.levelNext, 'Demo complete');
  setText(ui.levelPct, '100%');
  setStyle(ui.levelFill, 'width', '100%');
  setStyle(ui.levelBadge, '--p', '1');
  if (typeof document === 'undefined') return;
  document.documentElement.classList.add('demo-over');
  // Nothing outside the board answers any more (theme, sound, the dock).
  document.querySelectorAll('.app > :not(.board-wrap)').forEach((el) => { el.inert = true; });
  // Checked after the pause, so a page that answers `end` still counts.
  setTimeout(() => { if (!demo.hosted) showDemoEnd(); }, 400);
}

function showDemoEnd() {
  const o = demo.options;
  const played = o.stages.length === 1 ? o.stages[0] : `the first ${o.stages.length} ${o.unit}`;
  announce("That's the demo.");
  showOverlay("That's the demo", `You played ${played}. The full game has the rest.`,
    'Get the full game', '🔒', () => window.open(o.page, '_blank', 'noopener'));
  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'pill demo-again';
  again.textContent = 'Play again';
  again.addEventListener('click', () => location.reload());
  ui.overlayButton.after(again);
}

// Announces a new highest tile ("new tile unlocked") with a board glow.
function checkUnlock() {
  const top = highestTile();
  if (top <= state.highest) return;
  state.highest = top;
  if (top < UNLOCK_FROM) return;
  const t = themeFor(top);
  levelUp();
  if (top >= 128) emojiRain(t.sym, 5 + Math.log2(top));
  toast(top === WIN_VALUE ? `${t.sym} ${t.name} built!` : `${t.sym} New tile: ${t.name}!`, 'unlock');
}

function play(dir) {
  if (busy || state.over || targeting) return;
  const started = performance.now(); // for the diagnostics: how long the move took
  remember();
  const result = move(dir);
  if (!result) {
    state.history = null; // nothing happened, nothing to undo
    updateUndoButton();
    sfx('invalid');
    shake();
    bumpWall(dir);
    haptic(18);
    return;
  }
  busy = true;
  state.moves += 1;
  resumeTimer();
  sfx('move');
  tilt(dir);
  setMoveAxis(dir);

  // 1. Slide the existing tiles to their destinations (CSS transition) and
  //    keep the cell -> element map in step, so the next render can reuse the
  //    nodes instead of rebuilding them.
  result.moves.forEach((m) => {
    const from = key(m.from);
    const to = key(m.to);
    const el = tileAt.get(from);
    if (!el) return;
    tileAt.delete(from);
    const landed = tileAt.get(to);
    if (landed) {
      // Two tiles landed on the same cell: one of them disappears in the
      // merge. Keep the one that was already there and drop the newcomer.
      droppedTiles.push(el);
      return;
    }
    // Tiles that travel stretch along the way (squash and stretch).
    if (from !== to) el.classList.add('moving');
    setPosition(el, m.to);
    tileAt.set(to, el);
  });

  // 2. Meanwhile update the score and pick the new tile.
  const before = state.score;
  const merged = result.moves.filter((m) => m.merged);
  const mergedCells = merged.map((m) => m.to);
  let doubled = false;
  if (result.gained) {
    const boosted = applyDouble(result.gained, state.doubleLeft);
    doubled = boosted.gained !== result.gained;
    state.doubleLeft = boosted.doubleLeft;
    // Update the combo first so the charge bonus sees the current streak.
    const now = Date.now();
    state.combo = nextCombo(state.combo, state.comboAt, now);
    state.comboAt = now;
    creditScore(boosted.gained);
    floatScore(boosted.gained);
    ui.scoreBox.classList.remove('bump');
    restyle(ui.scoreBox);
    ui.scoreBox.classList.add('bump');
    if (doubled) {
      if (ui.boostLeft) ui.boostLeft.textContent = String(state.doubleLeft);
      if (state.doubleLeft === 0) toast('✨ ×2 booster used up', 'booster');
    }
  }
  const spawned = addRandomTile();

  // 3. After the slide, redraw from state: merged tiles pulse, the new one pops.
  setTimeout(() => {
    render(spawned, mergedCells);

    if (merged.length) {
      updateStreak();

      const level = Math.log2(merged[0].value);
      const top = Math.max(...merged.map((m) => m.value)) * 2; // the biggest new tile
      const topLevel = Math.log2(top);
      const tier = comboTier(state.combo);
      // The hit: the new tiles hold a squashed, white-hot pose for a beat
      // (the CSS reads --hold), the particles in the air nearly stop, and
      // only then does everything burst. Input is not held.
      const hold = prefersReducedMotion() ? 0 : hitStopMs(top, state.combo);
      mergedCells.forEach((cell) => setStyle(tileAt.get(key(cell)), '--hold', `${hold}ms`));
      if (hold) {
        if (hasFX()) FX.hitstop(hold);
        sfx('impact', topLevel, state.combo);
      }
      setHeat(tier.heat);

      const theme = THEMES[currentTheme] || THEMES[DEFAULT_THEME];
      const palette = [theme.accent, theme.accent2, '#ffffff', theme.goal.to];
      const burst = () => {
        sfx('merge', level, state.combo);
        haptic(state.combo > 1 ? 14 + tier.heat * 4 : 12);
        merged.forEach((m) => {
          explode(m.to, Math.log2(m.value) + 1, palette, { extra: (doubled ? 8 : 0) + tier.heat * 3 });
          ripple(m.to, theme.accent);
          // 128 and up: the new tile glitters for a moment.
          if (m.value * 2 >= 128 && hasFX()) {
            const { x, y } = cellCenter(m.to);
            FX.sparkle(x, y, geometry().cell * 0.62, ['#ffffff', theme.accent2, theme.goal.to], 4 + Math.log2(m.value * 2) - 6);
          }
        });
        if (tier.heat) {
          comboBadge(tier.label, tier.heat);
          sfx('combo', state.combo);
          haptic([10, 30, 10 + tier.heat * 6]);
        }
        // From ×3 a shockwave rolls out of the first merge, bigger every step.
        if (tier.heat >= 2 && hasFX() && tileAt.get(key(merged[0].to))) {
          const { x, y } = cellCenter(merged[0].to);
          FX.shock(x, y, [theme.accent, theme.accent2, '#ffffff'], tier.heat);
        }
        if (state.combo >= 3) {
          emojiRain(themeFor(merged[0].value * 2).sym, Math.min(16, 4 + state.combo * 2));
        }
        if (topLevel >= 8 || tier.heat >= 4) flash(theme.accent); // 256 and up light the room
        checkUnlock();
      };
      if (hold) setTimeout(burst, hold);
      else burst();
    } else {
      state.combo = 0;
      updateStreak();
      setHeat(0);
      sfx('spawn');
    }

    if (before !== state.score) countUp(ui.score, before, state.score);
    if (doubled) updateBoosters();
    if (spawned) {
      if (tileAt.get(key(spawned))) ripple(spawned, null, true);
    }

    updateUndoButton();
    busy = false;
    announce(`Score ${state.score}`);
    checkEnd();

    if (typeof window !== 'undefined' && window.__GAME_STATS) {
      const g = window.__GAME_STATS;
      g.actions++;
      g.lastAction = dir;
      g.lastActionMs = Math.round(performance.now() - started);
      g.nodes = document.getElementsByTagName('*').length;
    }
  }, SLIDE_MS);
}

function start() {
  if (demo.over) return; // only "Play again" (a reload) starts over
  hideOverlay();
  cancelTargeting();
  newGame();
  resetTimer();
  setHeat(0);
  render();
  updateUndoButton();
  updateStreak();
  updateMeter();
  updateBoosters();
  updateLevel();
  startReminders();
  tap();
  announce('New game. Score 0.');
}

/* -- boosters -------------------------------------------------------------- */

let targeting = false; // hammer armed: the next tap on a tile smashes it

function setTargeting(on) {
  targeting = Boolean(on);
  if (ui.board) ui.board.classList.toggle('targeting', targeting);
  if (ui.targetHint) ui.targetHint.hidden = !targeting;
  updateBoosters();
}

function cancelTargeting() {
  if (targeting) setTargeting(false);
}

function useBooster(id) {
  if (busy || state.over || !BOOSTERS[id] || (state.boosters[id] || 0) <= 0) return false;
  if (id === 'hammer') {
    // Arm (or disarm) the hammer; the tile tap does the rest.
    setTargeting(!targeting);
    tap();
    announce(targeting ? 'Hammer armed. Tap a tile to smash it.' : 'Hammer put away.');
    return true;
  }
  cancelTargeting();
  if (id === 'shuffle') {
    remember();
    state.boosters.shuffle -= 1;
    const theme = THEMES[currentTheme] || THEMES[DEFAULT_THEME];
    busy = true;
    if (ui.board) ui.board.classList.add('shuffling');
    sfx('combo', 3);
    haptic([10, 20, 10, 20, 10]);
    setTimeout(() => {
      shuffleGrid(state.grid);
      state.combo = 0;
      render();
      if (ui.board) ui.board.classList.remove('shuffling');
      state.grid.forEach((row, r) => row.forEach((v, c) => { if (v) ripple({ r, c }, theme.accent2); }));
      flash(theme.accent2);
      busy = false;
      updateUndoButton();
      updateStreak();
      updateBoosters();
      toast('🔀 Shuffled!', 'booster');
      announce('Board shuffled.');
      checkEnd();
    }, 360);
    return true;
  }
  if (id === 'double') {
    if (state.doubleLeft > 0) return false;
    state.boosters.double -= 1;
    state.doubleLeft = DOUBLE_MERGES;
    const theme = THEMES[currentTheme] || THEMES[DEFAULT_THEME];
    flash(theme.accent);
    emojiRain('✨', 10);
    sfx('win');
    haptic([12, 30, 12]);
    toast(`✨ ×2 points for the next ${DOUBLE_MERGES} merges!`, 'booster');
    announce('Double points activated.');
    updateBoosters();
    return true;
  }
  return false;
}

// Hammer: smash the tapped tile.
function smash(cell) {
  if (!targeting || busy || state.over) return;
  const value = state.grid[cell.r][cell.c];
  if (!value) return;
  remember();
  state.boosters.hammer -= 1;
  const theme = THEMES[currentTheme] || THEMES[DEFAULT_THEME];
  const t = themeFor(value);
  explode(cell, Math.log2(value) + 3, [theme.accent, theme.accent2, '#ffffff', t.to], { flash: true, quake: true });
  emojiRain(t.sym, 6);
  sfx('merge', Math.log2(value), 3);
  haptic([20, 30, 40]);
  removeTile(state.grid, cell);
  state.combo = 0;
  setTargeting(false);
  busy = true;
  // Let the explosion read before the tile vanishes.
  const el = tileAt.get(key(cell));
  if (el) el.classList.add('smashed');
  setTimeout(() => {
    render();
    busy = false;
    updateUndoButton();
    updateStreak();
    updateBoosters();
    toast(`🔨 Smashed ${t.sym} ${t.name}`, 'booster');
    announce(`Smashed ${t.name}.`);
  }, 260);
}

function onTileTap(e) {
  if (!targeting) return;
  const tile = e.target.closest('.tile');
  if (!tile) return;
  e.stopPropagation();
  const r = Number(tile.style.getPropertyValue('--r'));
  const c = Number(tile.style.getPropertyValue('--c'));
  if (Number.isNaN(r) || Number.isNaN(c)) return;
  smash({ r, c });
}

const KEYS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down',
};

const BOOSTER_KEYS = { 1: 'hammer', 2: 'shuffle', 3: 'double' };

function onKeyDown(e) {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'Enter' && ui.overlay && !ui.overlay.hidden) {
    e.preventDefault();
    ui.overlayButton.click();
    return;
  }
  if (e.key === 'Escape' && targeting) {
    e.preventDefault();
    cancelTargeting();
    return;
  }
  if (BOOSTER_KEYS[e.key]) {
    e.preventDefault();
    useBooster(BOOSTER_KEYS[e.key]);
    return;
  }
  const dir = KEYS[e.key];
  if (!dir) return;
  e.preventDefault();
  play(dir);
}

// Swipe support: pointer events cover touch, pen and mouse.
function attachSwipe(el) {
  let origin = null;
  // Prevent page scroll while swiping on the board (mobile).
  el.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
  el.addEventListener('pointerdown', (e) => { origin = { x: e.clientX, y: e.clientY }; });
  el.addEventListener('pointerup', (e) => {
    if (!origin) return;
    if (targeting) { origin = null; return; } // taps go to the hammer
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    origin = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  el.addEventListener('pointercancel', () => { origin = null; });
}

/* -- theme rail ----------------------------------------------------------- */

function buildThemeRail() {
  if (!ui.themeRail) return;
  ui.themeRail.textContent = '';
  Object.keys(THEMES).forEach((id) => {
    const theme = THEMES[id];
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.theme = id;
    chip.setAttribute('role', 'radio');
    chip.setAttribute('aria-checked', String(id === currentTheme));

    const swatch = document.createElement('span');
    swatch.className = 'chip-swatch';
    swatch.style.background = `linear-gradient(135deg, ${theme.tiles[0].from}, ${theme.accent}, ${theme.accent2})`;

    const glyph = document.createElement('span');
    glyph.className = 'chip-glyph';
    glyph.textContent = theme.glyph;
    swatch.appendChild(glyph);

    const label = document.createElement('span');
    label.className = 'chip-label';
    label.textContent = theme.label;

    chip.appendChild(swatch);
    chip.appendChild(glyph);
    chip.appendChild(label);
    chip.addEventListener('click', () => {
      setTheme(id);
      tap();
    });
    ui.themeRail.appendChild(chip);
  });
  syncThemeRail();
}

function syncThemeRail() {
  if (!ui.themeRail) return;
  let active = null;
  Array.from(ui.themeRail.children).forEach((chip) => {
    const isActive = chip.dataset.theme === currentTheme;
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-checked', String(isActive));
    if (isActive) active = chip;
  });
  // Keep the selected theme visible in the rail.
  if (active && active.scrollIntoView) {
    active.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
}

/* ==========================================================================
 * 10. Boot
 * ========================================================================== */

// A tiny public API, used by the diagnostics module and by tooling that
// drives the game (the product page capture, the device benchmark).
if (typeof window !== 'undefined') {
  window.StateLessCube = {
    setDemoMode,
    start,
    get state() { return state; },
  };
}

function boot() {
  const $ = (id) => document.getElementById(id);
  Object.assign(ui, {
    board: $('game-container'),
    tiles: $('tiles'),
    fx: $('fx'),
    fxCanvas: $('fx-canvas'),
    confettiCanvas: $('confetti'),
    score: $('score'),
    best: $('best'),
    scoreAdd: $('score-add'),
    scoreBox: $('score-box'),
    status: $('status'),
    overlay: $('overlay'),
    overlayTitle: $('overlay-title'),
    overlaySub: $('overlay-sub'),
    overlayEmoji: $('overlay-emoji'),
    overlayButton: $('overlay-button'),
    themeRail: $('theme-rail'),
    streakCard: $('streak-card'),
    streak: $('streak'),
    combo: $('combo-badge'),
    undo: $('undo'),
    modeToggle: $('theme-mode-toggle'),
    modeGlyph: $('mode-glyph'),
    soundToggle: $('sound-toggle'),
    soundGlyph: $('sound-glyph'),
    hint: $('hint'),
    instructions: $('instructions'),
    // gamification
    timer: $('timer'),
    comboBar: $('combo-bar'),
    meter: $('booster-meter'),
    meterFill: $('meter-fill'),
    meterText: $('meter-text'),
    boosters: $('boosters'),
    boostTag: $('boost-tag'),
    boostLeft: $('boost-left'),
    targetHint: $('target-hint'),
    targetCancel: $('target-cancel'),
    toasts: $('toasts'),
    flash: $('flash'),
    // levels
    levelCard: $('level-card'),
    levelBadge: $('level-badge'),
    levelNum: $('level-num'),
    levelValue: $('level-value'),
    levelName: $('level-name'),
    levelFill: $('level-fill'),
    levelNext: $('level-next'),
    levelPct: $('level-pct'),
    levelBest: $('level-best'),
    levelBestValue: $('level-best-value'),
    levelBanner: $('level-banner'),
    levelBannerNum: $('level-banner-num'),
    levelBannerName: $('level-banner-name'),
  });

  // Static 4x4 background cells.
  const cells = ui.board.querySelector('.cells');
  for (let i = 0; i < SIZE * SIZE; i++) cells.appendChild(document.createElement('div'));
  if (ui.fxCanvas && typeof FX !== 'undefined') FX.attach(ui.fxCanvas);
  // The effects measure the board once; a resize (rotation, split view)
  // measures it again.
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => { boardGeometry = null; }).observe(ui.fx);
  } else {
    window.addEventListener('resize', () => { boardGeometry = null; });
  }

  loadBest();
  loadBestLevel();
  loadTheme();
  loadThemeMode();
  // URL overrides win over the stored preferences (preview / screenshot links).
  applyPreviewParams();
  applyThemeMode();
  buildThemeRail();
  if (ui.soundToggle) {
    const syncSound = () => {
      const on = typeof Sound !== 'undefined' && Sound.isEnabled();
      ui.soundGlyph.textContent = on ? '🔊' : '🔇';
      ui.soundToggle.setAttribute('aria-pressed', String(on));
      ui.soundToggle.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    };
    ui.soundToggle.addEventListener('click', () => {
      if (typeof Sound === 'undefined') return;
      Sound.toggle();
      syncSound();
      tap();
      announce(Sound.isEnabled() ? 'Sound on' : 'Sound off');
    });
    syncSound();
  }

  if (ui.modeToggle) {
    ui.modeToggle.addEventListener('click', cycleThemeMode);
  }
  if (ui.hint && ui.instructions) {
    ui.hint.addEventListener('click', () => {
      const expanded = ui.instructions.classList.toggle('expanded');
      ui.hint.setAttribute('aria-expanded', String(expanded));
      tap();
    });
  }
  if (ui.undo) {
    ui.undo.addEventListener('click', undo);
  }
  document.addEventListener('keydown', onKeyDown);
  attachSwipe(ui.board);
  $('new-game').addEventListener('click', start);

  // Boosters: dock buttons, the hammer target mode and its cancel link.
  if (ui.boosters) {
    ui.boosters.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-booster]');
      if (btn) useBooster(btn.dataset.booster);
    });
  }
  if (ui.tiles) ui.tiles.addEventListener('click', onTileTap);
  if (ui.targetCancel) ui.targetCancel.addEventListener('click', cancelTargeting);

  // The timer only counts while the tab is visible.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseTimer();
    else if (state.moves > 0 && !state.over) resumeTimer();
  });

  // A gesture unlocks the audio (browsers only allow sound after one). The
  // listeners are on window in the capture phase, so they run before the
  // game's own handlers and the first move already has its sound. They stay
  // until the context really runs: on iOS a touch's pointerdown may not
  // count as a gesture, its touchend or click does.
  const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'];
  const unlock = () => {
    if (typeof Sound === 'undefined') return;
    Sound.unlock();
    if (Sound.running()) UNLOCK_EVENTS.forEach((t) => window.removeEventListener(t, unlock, true));
  };
  UNLOCK_EVENTS.forEach((t) => window.addEventListener(t, unlock, true));

  maybeAutoplay();
  start();

  // Some webviews focus the first focusable element on load — the board then
  // carries a focus ring on a fresh game. Drop it.
  if (typeof document !== 'undefined' && document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
}

// Preview helper: ?autoplay=left plays one move after a moment so screenshots
// can catch the merge effects mid-flight.
function maybeAutoplay() {
  if (typeof window === 'undefined' || !window.location) return;
  let dir = '';
  try {
    dir = new URLSearchParams(window.location.search).get('autoplay') || '';
  } catch (_) {
    return;
  }
  if (!dir || ['left', 'right', 'up', 'down'].indexOf(dir) === -1 || DEMO_SPEC) return;
  setTimeout(() => play(dir), 500);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}

// Test hooks (Node / CommonJS). The browser ignores this block.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SIZE, WIN_VALUE, state,
    emptyGrid, copyGrid, compress, merge, slideLine, move,
    moveLeft, moveRight, moveUp, moveDown,
    addRandomTile, hasWon, isGameOver, newGame,
    THEMES, themeFor, tileLabel, setTheme, currentTheme,
    THEME_MODE_KEY, themeMode, loadThemeMode, saveThemeMode,
    applyThemeMode, cycleThemeMode,
    snapshot, remember, applySnapshot, undo, canUndo, COMBO_WINDOW_MS, nextCombo,
    comboTier, hitStopMs, HIT_STOP_MAX_MS,
    setDemoMode,
    // gamification
    CHARGE_MAX, COMBO_CHARGE_BONUS, DOUBLE_MERGES, MILESTONES, BOOSTERS, BOOSTER_IDS,
    formatTime, addCharge, pickBooster, applyDouble, milestonesCrossed, highestTile,
    removeTile, shuffleGrid, countBoosters,
    LEVEL_MAX, LEVEL_TIERS, LEVEL_NAMES, LEVEL_CHARGE_BONUS,
    levelStep, levelThreshold, levelFor, levelName,
    // demo build
    createDemo, demo, creditScore, start, readSaved, writeSaved,
  };
}
