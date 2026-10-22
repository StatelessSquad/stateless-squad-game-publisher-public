/* The studio page: interactions.
 *
 * Small on purpose: the theme switch, a scroll reveal, a count-up, and demo
 * videos that load and play only while they are on screen. No dependencies,
 * nothing sent anywhere.
 */
(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  root.classList.add('js');

  /* -- light / dark -------------------------------------------------------- */

  const store = (value) => {
    try {
      if (value) localStorage.setItem('theme', value);
      else localStorage.removeItem('theme');
    } catch {}
  };
  const current = () => root.dataset.theme || (system.matches ? 'dark' : 'light');
  document.querySelector('.theme')?.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    // Back to following the system when the choice matches it again.
    if (next === (system.matches ? 'dark' : 'light')) {
      delete root.dataset.theme;
      store(null);
    } else {
      root.dataset.theme = next;
      store(next);
    }
  });

  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    return;
  }

  /* -- reveal on scroll ---------------------------------------------------- */

  const reveals = document.querySelectorAll('.reveal');
  if (reduced) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          setTimeout(() => el.classList.add('in'), Number(el.dataset.delay || 0));
          io.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    );
    reveals.forEach((el, i) => {
      el.dataset.delay = String((i % 4) * 70);
      io.observe(el);
    });
  }

  /* -- count up ------------------------------------------------------------ */

  const count = (el) => {
    const target = Number(el.dataset.count);
    if (reduced) return;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / 1000);
      el.textContent = String(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const co = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      count(entry.target);
      co.unobserve(entry.target);
    }
  });
  document.querySelectorAll('[data-count]').forEach((el) => co.observe(el));

  /* -- demo videos: load when near, play while visible ------------------------ */

  if (reduced) return;
  const vo = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const v = /** @type {HTMLVideoElement} */ (entry.target);
        if (entry.isIntersecting) {
          if (!v.src) v.src = v.dataset.src || '';
          v.play().catch(() => {});
        } else if (!v.paused) {
          v.pause();
        }
      }
    },
    { threshold: 0.35 },
  );
  document.querySelectorAll('video[data-src]').forEach((v) => vo.observe(v));
})();
