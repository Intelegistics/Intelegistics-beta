/* Phone-only device categories: slowly slide the row, never fade the cards. */
(function () {
  document.querySelectorAll('[data-device-slideshow]').forEach((slideshow) => {
    const track = slideshow.querySelector('.device-grid');
    const cards = Array.from(track.children);
    const controls = slideshow.querySelector('.device-controls');
    const status = slideshow.querySelector('[data-device-status]');
    const count = slideshow.querySelector('[data-device-count]');
    const rotation = slideshow.querySelector('[data-device-rotation]');
    const pauseIcon = rotation.querySelector('[data-device-pause]');
    const playIcon = rotation.querySelector('[data-device-play]');
    const mobile = window.matchMedia('(max-width: 640px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = false;
    let inView = !('IntersectionObserver' in window);
    let automatic = !reducedMotion.matches;
    let index = 0;
    let frame = null;
    let timer;
    let scrollTimer;
    let clones = [];
    let pointerActive = false;

    const leftAt = (position) => track.children[position].getBoundingClientRect().left - track.children[0].getBoundingClientRect().left;
    const realIndex = (position) => (position - 1 + cards.length) % cards.length;
    const nearestPosition = () => Math.max(0, Math.min(cards.length + 1, Math.round(track.scrollLeft / (leftAt(1) || 1))));
    const canPlay = () => active && inView && automatic && !document.hidden && !document.body.classList.contains('nav-open');

    const stop = () => {
      window.clearTimeout(timer);
      window.clearTimeout(scrollTimer);
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
    };

    const update = () => {
      const text = `${index + 1} / ${cards.length}`;
      if (count.textContent !== text) count.textContent = text;
      status.setAttribute('aria-live', automatic ? 'off' : 'polite');
      rotation.setAttribute('aria-label', automatic ? 'Pause automatic slideshow' : 'Resume automatic slideshow');
      pauseIcon.hidden = !automatic;
      playIcon.hidden = automatic;
    };

    const schedule = () => {
      window.clearTimeout(timer);
      if (canPlay()) timer = window.setTimeout(() => move(index + 2, 5000, true), 1400);
    };

    const move = (position, duration, autoMove = false) => {
      stop();
      if (!active) return;
      track.classList.add('is-moving');
      const from = track.scrollLeft;
      const to = leftAt(position);
      const started = performance.now();
      const finish = () => {
        index = realIndex(position);
        // Rebase a boundary clone onto its identical original before snapping resumes.
        track.scrollLeft = leftAt(index + 1);
        frame = null;
        track.classList.remove('is-moving');
        update();
        schedule();
      };
      if (!duration || Math.abs(to - from) < 1) { finish(); return; }
      const tick = (now) => {
        if (!active) return;
        if (autoMove && !canPlay()) {
          move(nearestPosition(), 0);
          return;
        }
        const progress = Math.min(1, (now - started) / duration);
        const eased = autoMove ? progress : 1 - Math.pow(1 - progress, 3);
        track.scrollLeft = from + (to - from) * eased;
        if (progress < 1) frame = window.requestAnimationFrame(tick);
        else finish();
      };
      frame = window.requestAnimationFrame(tick);
    };

    const pause = () => {
      automatic = false;
      if (!active) return;
      stop();
      // Freeze at the current horizontal position; no jump or fade on Pause.
      update();
    };

    const navigate = (direction) => {
      if (!active) return;
      pause();
      const position = nearestPosition();
      index = realIndex(position);
      // Normalize a frozen boundary clone before moving in either direction.
      if (position === 0 || position === cards.length + 1) {
        const fractionalOffset = track.scrollLeft - leftAt(position);
        track.classList.add('is-moving');
        track.scrollLeft = leftAt(index + 1) + fractionalOffset;
      }
      move(index + 1 + direction, reducedMotion.matches ? 0 : 650);
    };

    const configure = () => {
      if (mobile.matches === active) return;
      stop();
      active = mobile.matches;
      controls.hidden = !active;
      slideshow.classList.toggle('is-enhanced', active);
      if (active) {
        const before = cards[cards.length - 1].cloneNode(true);
        const after = cards[0].cloneNode(true);
        clones = [before, after];
        clones.forEach((clone) => { clone.setAttribute('aria-hidden', 'true'); clone.inert = true; });
        track.prepend(before);
        track.append(after);
        track.setAttribute('tabindex', '0');
        track.setAttribute('aria-label', 'Device categories. Use left and right arrow keys to browse.');
        slideshow.setAttribute('role', 'group');
        slideshow.setAttribute('aria-roledescription', 'carousel');
        slideshow.setAttribute('aria-label', 'Device categories, alphabetically ordered');
        cards.forEach((card, cardIndex) => {
          card.setAttribute('role', 'group');
          card.setAttribute('aria-roledescription', 'slide');
          card.setAttribute('aria-label', `${cardIndex + 1} of ${cards.length}`);
        });
        move(index + 1, 0);
      } else {
        pointerActive = false;
        track.classList.remove('is-moving');
        clones.forEach((clone) => clone.remove());
        clones = [];
        track.scrollLeft = 0;
        ['tabindex', 'aria-label'].forEach((name) => track.removeAttribute(name));
        ['role', 'aria-roledescription', 'aria-label'].forEach((name) => slideshow.removeAttribute(name));
        cards.forEach((card) => ['role', 'aria-roledescription', 'aria-label'].forEach((name) => card.removeAttribute(name)));
      }
    };

    slideshow.querySelector('[data-device-prev]').addEventListener('click', () => navigate(-1));
    slideshow.querySelector('[data-device-next]').addEventListener('click', () => navigate(1));
    rotation.addEventListener('click', () => {
      if (automatic) pause();
      else { automatic = true; move(nearestPosition(), reducedMotion.matches ? 0 : 650); }
    });
    slideshow.addEventListener('focusin', (event) => {
      if (event.target !== rotation && !rotation.contains(event.target)) pause();
    });
    slideshow.addEventListener('keydown', (event) => {
      if (!active || event.altKey || event.ctrlKey || event.metaKey) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') navigate(event.key === 'ArrowLeft' ? -1 : 1);
      else { pause(); move(event.key === 'Home' ? 1 : cards.length, reducedMotion.matches ? 0 : 650); }
    });
    track.addEventListener('pointerdown', () => { pointerActive = true; pause(); track.classList.remove('is-moving'); });
    track.addEventListener('wheel', () => { pause(); track.classList.remove('is-moving'); }, { passive: true });
    const synchronizeScroll = () => {
      if (!active || track.classList.contains('is-moving')) return;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => { if (active && !pointerActive) move(nearestPosition(), 0); }, 180);
    };
    track.addEventListener('scroll', synchronizeScroll, { passive: true });
    ['pointerup', 'pointercancel'].forEach((name) => window.addEventListener(name, () => {
      if (!pointerActive) return;
      pointerActive = false;
      synchronizeScroll();
    }));
    document.addEventListener('visibilitychange', () => {
      if (!active) return;
      if (document.hidden) move(nearestPosition(), 0);
      else schedule();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .35;
        if (active && !inView) move(nearestPosition(), 0);
        else schedule();
      }, { threshold: .35 }).observe(slideshow);
    }
    mobile.addEventListener('change', configure);
    reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) pause(); });
    if ('MutationObserver' in window) {
      new MutationObserver(() => {
        if (!active) return;
        if (document.body.classList.contains('nav-open')) move(nearestPosition(), 0);
        else schedule();
      }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    configure();
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (active) move(index + 1, 0); }).observe(track);
    else window.addEventListener('resize', () => { if (active) move(index + 1, 0); });
  });
})();
