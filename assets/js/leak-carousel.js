/* Hidden-cost cards: native touch scrolling, responsive pages, and manual looping. */
(function () {
  document.querySelectorAll('[data-leak-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('.leak-grid');
    const cards = Array.from(track.children);
    const controls = carousel.querySelector('.leak-controls');
    const pagination = carousel.querySelector('.leak-pagination');
    const count = carousel.querySelector('[data-leak-count]');
    const announcement = carousel.querySelector('[data-leak-announcement]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = 0;
    let page = 0;
    let pages = 0;
    let scrollTimer;

    cards.forEach((card, index) => {
      card.setAttribute('role', 'group');
      card.setAttribute('aria-roledescription', 'slide');
      card.setAttribute('aria-label', `${index + 1} of ${cards.length}`);
    });

    // Rect differences stay relative to the track, including when its ancestor reveals.
    const targetLeft = (index) => cards[index].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;

    const update = () => {
      const first = page * visible + 1;
      const last = Math.min(first + visible - 1, cards.length);
      const text = first === last ? `${first} / ${cards.length}` : `${first}–${last} / ${cards.length}`;
      if (count.textContent !== text) count.textContent = text;
      const spoken = first === last ? `Showing card ${first} of ${cards.length}.` : `Showing cards ${first} to ${last} of ${cards.length}.`;
      if (announcement.textContent !== spoken) announcement.textContent = spoken;
      Array.from(pagination.children).forEach((button, index) => {
        if (index === page) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
    };

    const goTo = (requestedPage, animate = true) => {
      window.clearTimeout(scrollTimer);
      page = (requestedPage + pages) % pages;
      track.scrollTo({ left: targetLeft(page * visible), behavior: animate && !reducedMotion.matches ? 'smooth' : 'auto' });
      update();
    };

    const resize = () => {
      const firstIndex = page * visible;
      const nextVisible = Math.max(1, Number.parseInt(getComputedStyle(track).getPropertyValue('--leak-visible'), 10) || 1);
      const changed = visible !== nextVisible;
      visible = nextVisible;
      pages = Math.ceil(cards.length / visible);
      if (changed) {
        pagination.replaceChildren();
        for (let index = 0; index < pages; index++) {
          const button = document.createElement('button');
          const first = index * visible + 1;
          const last = Math.min(first + visible - 1, cards.length);
          button.type = 'button';
          button.className = 'leak-page';
          button.setAttribute('aria-controls', track.id);
          button.setAttribute('aria-label', first === last ? `Show card ${first}` : `Show cards ${first} to ${last}`);
          button.addEventListener('click', () => goTo(index));
          pagination.append(button);
        }
      }
      goTo(Math.min(pages - 1, Math.floor(firstIndex / visible)), false);
      controls.hidden = pages < 2;
    };

    carousel.querySelector('[data-leak-prev]').addEventListener('click', () => goTo(page - 1));
    carousel.querySelector('[data-leak-next]').addEventListener('click', () => goTo(page + 1));
    carousel.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') goTo(0);
      else if (event.key === 'End') goTo(pages - 1);
      else goTo(page + (event.key === 'ArrowRight' ? 1 : -1));
    });

    track.addEventListener('scroll', () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        let nearest = 0;
        let distance = Infinity;
        for (let index = 0; index < pages; index++) {
          const candidate = Math.abs(track.scrollLeft - targetLeft(index * visible));
          if (candidate < distance) { nearest = index; distance = candidate; }
        }
        page = nearest;
        update();
      }, 150);
    }, { passive: true });

    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(track);
    else window.addEventListener('resize', resize);
  });
})();
