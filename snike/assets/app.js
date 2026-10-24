/* The product page: interactions.
 *
 * Small on purpose: a scroll reveal, a count-up and lazy video, plus the
 * immersive layout's effects (light motes, a pointer glow, the pinned
 * sequence, parallax). No dependencies, no build step.
 */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The reveal animation hides the content with CSS — but only when there is
  // JavaScript to bring it back. Without it the page would be blank.
  document.documentElement.classList.add('js');

  /* -- reveal on scroll -------------------------------------------------- */

  const reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = Number(el.dataset.delay || 0);
          setTimeout(() => el.classList.add('in'), delay);
          io.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    reveals.forEach((el, i) => {
      el.dataset.delay = String((i % 4) * 70);
      io.observe(el);
    });
  }

  /* -- count up ---------------------------------------------------------- */

  const counters = document.querySelectorAll('[data-count]');
  const animate = (el) => {
    const target = Number(el.dataset.count);
    if (reduced) {
      el.textContent = String(target);
      return;
    }
    const start = performance.now();
    const dur = 1100;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - p) ** 3;
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animate(entry.target);
          co.unobserve(entry.target);
        });
      },
      { threshold: 0.6 },
    );
    counters.forEach((el) => co.observe(el));
  } else {
    counters.forEach(animate);
  }

  /* -- the demo video ---------------------------------------------------- */

  const video = document.querySelector('video');
  const playButton = document.getElementById('video-play');

  // A phone that asks to save data (or is on a slow link) gets the poster and
  // a button, not a video it did not ask for.
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const stingy = Boolean(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));

  if (video && stingy) {
    video.removeAttribute('autoplay');
    video.preload = 'none';
    if (playButton) {
      playButton.hidden = false;
      playButton.addEventListener('click', () => {
        video.preload = 'auto';
        video
          .play()
          .then(() => {
            playButton.hidden = true;
          })
          .catch(() => {});
      });
    }
  } else if (video && 'IntersectionObserver' in window) {
    // Only fetch the video when the hero is close to the viewport.
    const vo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { rootMargin: '200px' },
    );
    vo.observe(video);
  }

  if (video) video.addEventListener('playing', () => video.classList.add('playing'), { once: true });

  /* == the immersive layout ============================================== */

  if (!document.body.classList.contains('immersive')) return;

  const nav = document.querySelector('.nav');
  const hero = document.querySelector('.hero-x');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* -- light motes over the hero: the pointer eats the ones it touches --- */

  const canvas = document.querySelector('.fx');
  if (canvas && hero && !reduced) {
    const ctx = canvas.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const colours = ['--accent', '--accent2', '--accent3'].map((v) => css.getPropertyValue(v).trim());
    // One soft sprite per colour, drawn once: no shadowBlur per frame.
    const sprites = colours.map((c) => {
      const sp = document.createElement('canvas');
      sp.width = sp.height = 64;
      const g = sp.getContext('2d');
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.18, c);
      grad.addColorStop(1, 'transparent');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return sp;
    });
    let w = 0;
    let h = 0;
    let motes = [];
    const pointer = { x: -1e4, y: -1e4 };
    const spawn = (m, anywhere) => {
      m.x = Math.random() * w;
      m.y = anywhere ? Math.random() * h : h + 20;
      m.r = 4 + Math.random() * 10;
      m.vy = -(8 + Math.random() * 22);
      m.phase = Math.random() * 6.28;
      m.sprite = sprites[Math.floor(Math.random() * sprites.length)];
      m.eaten = 0;
      return m;
    };
    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(Math.min(70, (w * h) / 22000));
      motes = Array.from({ length: count }, () => spawn({}, true));
    };
    resize();
    window.addEventListener('resize', resize);
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', () => {
      pointer.x = pointer.y = -1e4;
    });

    let visible = true;
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const m of motes) {
        m.phase += dt;
        m.y += m.vy * dt;
        m.x += Math.sin(m.phase * 0.9) * 10 * dt;
        const dx = pointer.x - m.x;
        const dy = pointer.y - m.y;
        const d = Math.hypot(dx, dy);
        if (!m.eaten && d < 150) {
          // drawn in, like light to the worm
          m.x += (dx / d) * 120 * dt;
          m.y += (dy / d) * 120 * dt;
          if (d < 16) m.eaten = 1;
        }
        if (m.eaten) m.eaten += dt * 3;
        if (m.eaten > 1.6 || m.y < -30) spawn(m, false);
        const size = m.r * (m.eaten ? 1 + (m.eaten - 1) * 4 : 1);
        ctx.globalAlpha =
          (m.eaten ? Math.max(0, 1.6 - m.eaten) : 1) * (0.55 + 0.45 * Math.sin(m.phase * 2.2));
        ctx.drawImage(m.sprite, m.x - size * 2, m.y - size * 2, size * 4, size * 4);
      }
      ctx.globalAlpha = 1;
      if (visible) requestAnimationFrame(frame);
    };
    new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting && !document.hidden;
      if (visible && !was) {
        last = performance.now();
        requestAnimationFrame(frame);
      }
    }).observe(hero);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !visible) {
        visible = true;
        last = performance.now();
        requestAnimationFrame(frame);
      }
    });
    requestAnimationFrame(frame);
  }

  /* -- a soft light under the pointer ---------------------------------- */

  const glow = document.querySelector('.hero-x-glow');
  if (glow && hero && finePointer && !reduced) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      glow.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px) translate(-50%, -50%)`;
      glow.classList.add('on');
    });
    hero.addEventListener('pointerleave', () => glow.classList.remove('on'));
  }

  /* -- on scroll: the nav, the pinned sequences, parallax ---------------- */

  const sequences = [...document.querySelectorAll('.evolve')].map((el) => ({
    el,
    shots: [...el.querySelectorAll('.evolve-art img')],
    steps: [...el.querySelectorAll('.steps li')],
    bar: el.querySelector('.evolve-bar'),
    at: -1,
  }));
  const parallax = [...document.querySelectorAll('.chapter-art img')];
  let queued = false;
  const onScroll = () => {
    queued = false;
    const vh = window.innerHeight;
    nav?.classList.toggle('scrolled', window.scrollY > vh * 0.5);
    for (const q of sequences) {
      const r = q.el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
      const at = Math.min(q.shots.length - 1, Math.floor(p * q.shots.length));
      q.bar?.style.setProperty('--progress', p.toFixed(3));
      if (at === q.at) continue;
      q.at = at;
      q.shots.forEach((img, i) => img.classList.toggle('on', i === at));
      q.steps.forEach((li, i) => li.classList.toggle('on', i <= at));
    }
    if (!reduced) {
      for (const img of parallax) {
        const r = img.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        img.style.setProperty('--p', p.toFixed(3));
      }
    }
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );
  onScroll();
})();
