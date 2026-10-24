/* StateLess-Cube — product page interactions.
 *
 * Tiny on purpose: a scroll reveal, a count-up and lazy video. No dependencies, no build step.
 */
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The reveal animation hides the content with CSS — but only when there is
  // JavaScript to bring it back. Without it the page would be blank.
  document.documentElement.classList.add('js');

  /* -- reveal on scroll -------------------------------------------------- */

  const reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = Number(el.dataset.delay || 0);
        setTimeout(() => el.classList.add('in'), delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

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
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        co.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
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
        video.play().then(() => { playButton.hidden = true; }).catch(() => {});
      });
    }
  } else if (video && 'IntersectionObserver' in window) {
    // Only fetch the video when the hero is close to the viewport.
    const vo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { rootMargin: '200px' });
    vo.observe(video);
  }
})();
