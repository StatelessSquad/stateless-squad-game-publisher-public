/* The beta arcade: play a slice of every game, right on the page.
 *
 * A card's "Play demo" opens the player: the game's demo build in a frame,
 * full screen on a phone, in a phone-sized frame on a computer. The demo ends
 * after its last stage and shows the end card. Clearing a demo stamps the
 * Beta Pass, which lives in this browser only (nothing is sent anywhere).
 *
 * The page learns the stage from the demo itself: a demo build (kit 1.1+,
 * or StateLess-Cube's) posts
 *   { source: 'statelesssquad-demo', type: 'start' | 'stage' | 'end', stage }
 * to the page around it. The page answers `start` with
 *   { source: 'statelesssquad-host', type: 'end-card' }
 * ("this page draws the end card"), so a demo on kit 1.1.5+ leaves its own
 * out here, and still shows it anywhere else (on its own, or on itch.io).
 */
(() => {
  const dialog = /** @type {HTMLDialogElement | null} */ (document.querySelector('.player'));
  if (!dialog) return;
  const frame = /** @type {HTMLIFrameElement} */ (dialog.querySelector('iframe'));
  const end = dialog.querySelector('.player-end');
  const cards = [...document.querySelectorAll('.cart[data-game]')];
  const games = cards.map((c) => JSON.parse(c.getAttribute('data-game') || '{}'));
  const byId = new Map(games.map((g) => [g.id, g]));
  const $ = (sel) => dialog.querySelector(sel);

  /* -- the pass: this browser only ------------------------------------------ */

  const KEY = 'beta-pass';
  const read = () => {
    try {
      const p = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (p && Array.isArray(p.cleared)) return p;
    } catch {}
    return { no: String(1000 + Math.floor(Math.random() * 9000)), cleared: [] };
  };
  let pass = read();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(pass));
    } catch {}
  };
  save();

  function paintPass(fresh) {
    const n = pass.cleared.length;
    for (const el of document.querySelectorAll('[data-pass-no]')) el.textContent = pass.no;
    for (const el of document.querySelectorAll('[data-pass-count]')) el.textContent = String(n);
    for (const stamp of document.querySelectorAll('.stamp[data-id]')) {
      const done = pass.cleared.includes(stamp.getAttribute('data-id'));
      stamp.classList.toggle('done', done);
      stamp.classList.toggle('fresh', done && stamp.getAttribute('data-id') === fresh);
    }
    for (const card of cards) card.classList.toggle('cleared', pass.cleared.includes(card.getAttribute('data-id')));
    document.querySelector('.pass')?.classList.toggle('full', n === games.length);
    const meter = /** @type {HTMLElement | null} */ (document.querySelector('.pass-meter i'));
    if (meter) meter.style.transform = `scaleX(${n / games.length})`;
  }
  paintPass();

  /* -- the player ----------------------------------------------------------- */

  /** @type {any} */ let game = null;
  let stage = 0;
  let finished = false;
  /** Clears the finished game's frame once the end card covers it; a new game cancels it. */
  let unload = 0;

  function paintStages() {
    const list = $('.player-stages');
    list.replaceChildren(
      ...game.stages.map((name, i) => {
        const li = document.createElement('li');
        li.textContent = name;
        li.className = i < stage ? 'past' : i === stage ? 'now' : '';
        return li;
      }),
      ...Array.from({ length: game.locked }, () => {
        const li = document.createElement('li');
        li.className = 'locked';
        li.innerHTML = '<span aria-hidden="true">🔒</span><span class="redact"></span>';
        li.setAttribute('aria-label', 'Locked: in the full game');
        return li;
      }),
    );
    if (game.more) {
      const li = document.createElement('li');
      li.className = 'more';
      li.textContent = game.more;
      list.append(li);
    }
    $('.player-count').textContent = `${Math.min(stage + 1, game.stages.length)} / ${game.stages.length}`;
  }

  function open(id, push = true) {
    game = byId.get(id);
    if (!game) return;
    stage = 0;
    finished = false;
    clearTimeout(unload);
    dialog.setAttribute('style', game.vars);
    dialog.dataset.id = id;
    $('.player-name').textContent = game.name;
    $('.player-unit').textContent = `Demo: the first ${game.stages.length} ${game.unit}`;
    $('.player-hint').textContent = game.hint;
    end.hidden = true;
    dialog.classList.remove('over');
    paintStages();
    const next = games[(games.indexOf(game) + 1) % games.length];
    for (const b of dialog.querySelectorAll('[data-next]')) {
      b.setAttribute('data-next', next.id);
      b.querySelector('b').textContent = next.name;
    }
    frame.src = game.play;
    frame.title = `${game.name} demo`;
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add('playing');
    if (push) history.pushState({ play: id }, '', `#play-${id}`);
  }

  function close(pop = false) {
    clearTimeout(unload);
    frame.src = 'about:blank';
    if (dialog.open) dialog.close();
    document.documentElement.classList.remove('playing');
    if (!pop && history.state?.play) history.back();
  }

  /** @param {number} n the stage the game is on, 0 = the first */
  function onStage(n) {
    if (finished || n === stage) return;
    if (n >= game.stages.length) return finish();
    stage = n;
    paintStages();
    const toast = $('.player-toast');
    toast.textContent = `${game.unit.replace(/s$/, '')} ${n + 1}: ${game.stages[n]}`;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
  }

  function finish() {
    if (finished) return;
    finished = true;
    stage = game.stages.length;
    paintStages();
    // Stop the game: the demo is over. The end card sits on its last frame.
    try {
      frame.contentWindow?.dispatchEvent(new Event('blur'));
    } catch {}
    frame.setAttribute('inert', '');
    const fresh = !pass.cleared.includes(game.id);
    if (fresh) pass.cleared.push(game.id);
    save();
    paintPass(game.id);
    $('.end-cleared').textContent = `You cleared ${game.stages.join(', ')}.`;
    $('.end-next').textContent = game.teaser;
    $('.end-page').setAttribute('href', game.page);
    $('.end-pass').textContent = pass.cleared.length === games.length
      ? 'All demos cleared. Your Beta Pass is complete.'
      : `Beta Pass: ${pass.cleared.length} of ${games.length} demos cleared.`;
    end.hidden = false;
    requestAnimationFrame(() => dialog.classList.add('over'));
    unload = window.setTimeout(() => frame.setAttribute('src', 'about:blank'), 1600);
  }

  /* The demo tells the page where it is. */
  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (!game || ev.source !== frame.contentWindow || !d || d.source !== 'statelesssquad-demo') return;
    if (d.type === 'start') frame.contentWindow?.postMessage({ source: 'statelesssquad-host', type: 'end-card' }, '*');
    else if (d.type === 'end') finish();
    else if (d.type === 'stage') onStage(Number(d.stage));
  });

  frame.addEventListener('load', () => {
    frame.removeAttribute('inert');
    try {
      frame.contentWindow?.focus();
    } catch {}
  });

  /* -- wiring --------------------------------------------------------------- */

  document.addEventListener('click', (ev) => {
    const t = /** @type {HTMLElement} */ (ev.target);
    const play = t.closest('[data-play]');
    if (play) {
      ev.preventDefault();
      open(play.getAttribute('data-play'));
      return;
    }
    const next = t.closest('[data-next]');
    if (next) return open(next.getAttribute('data-next'), false);
    if (t.closest('[data-again]')) return open(game.id, false);
    if (t.closest('[data-close]')) return close();
  });
  dialog.addEventListener('cancel', (ev) => {
    ev.preventDefault();
    close();
  });
  window.addEventListener('popstate', () => {
    const id = location.hash.match(/^#play-(.+)$/)?.[1];
    if (id && byId.has(id)) open(id, false);
    else if (dialog.open) close(true);
  });
  const start = location.hash.match(/^#play-(.+)$/)?.[1];
  if (start && byId.has(start)) {
    history.replaceState({ play: start }, '', location.href);
    open(start, false);
  }
})();
