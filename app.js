/* Lokahi Outrigger Canoe Club — site behavior. No dependencies. */

(function () {
  'use strict';

  // ---- Mobile nav toggle ----
  const burger = document.querySelector('.hamburger');
  if (burger) {
    burger.addEventListener('click', () => {
      document.body.classList.toggle('nav-open');
      const open = document.body.classList.contains('nav-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    // Close nav on link click
    document.querySelectorAll('.nav a').forEach(a => {
      a.addEventListener('click', () => document.body.classList.remove('nav-open'));
    });
  }

  // ---- Header hide on scroll-down, show on scroll-up ----
  const header = document.querySelector('.site-header');
  if (header) {
    let lastY = window.scrollY;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          if (document.body.classList.contains('nav-open')) {
            header.classList.remove('is-hidden');
          } else if (y > lastY && y > 200) {
            header.classList.add('is-hidden');
          } else {
            header.classList.remove('is-hidden');
          }
          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ---- Active nav link from current section in viewport ----
  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    const linkFor = id => navLinks.find(a => a.getAttribute('href') === '#' + id);
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          navLinks.forEach(a => a.classList.remove('is-active'));
          const link = linkFor(e.target.id);
          if (link) link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(s => obs.observe(s));
  }

  // ---- Fade-in on scroll ----
  if ('IntersectionObserver' in window) {
    const fade = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          fade.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in').forEach(el => fade.observe(el));
  } else {
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('is-visible'));
  }

  // ---- Lightbox for gallery ----
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox && lightbox.querySelector('img');
  const galleryLinks = [...document.querySelectorAll('.gallery a[data-full]')];
  let currentIndex = 0;

  function showAt(i) {
    if (!galleryLinks.length) return;
    currentIndex = ((i % galleryLinks.length) + galleryLinks.length) % galleryLinks.length;
    const link = galleryLinks[currentIndex];
    lightboxImg.src = link.dataset.full;
    lightboxImg.alt = link.querySelector('img')?.alt || '';
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeBox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  galleryLinks.forEach((link, i) => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showAt(i);
    });
  });
  if (lightbox) {
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) closeBox();
      else if (e.target.classList.contains('lightbox-prev')) showAt(currentIndex - 1);
      else if (e.target.classList.contains('lightbox-next')) showAt(currentIndex + 1);
    });
    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeBox();
      else if (e.key === 'ArrowLeft') showAt(currentIndex - 1);
      else if (e.key === 'ArrowRight') showAt(currentIndex + 1);
    });
  }
})();
