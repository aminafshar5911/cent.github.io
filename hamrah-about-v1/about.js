(() => {
  'use strict';

  const sections = document.querySelectorAll('.section-reveal');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    sections.forEach(section => section.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    });
  }, {
    threshold: 0.14,
    rootMargin: '0px 0px -8% 0px'
  });

  sections.forEach((section, index) => {
    section.style.transitionDelay = `${Math.min(index * 70, 210)}ms`;
    observer.observe(section);
  });
})();
