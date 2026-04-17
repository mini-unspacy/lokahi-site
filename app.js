/* Lokahi Outrigger Canoe Club — site behavior. No dependencies. */

(function () {
  'use strict';

  // ---- Reduced-motion preference (respected by smooth-scroll; parallax is intentional) ----
  const reducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  // ---- Shared scroll-lock: overlays toggle a counter so they can't clobber each other ----
  let scrollLockCount = 0;
  function lockScroll() {
    scrollLockCount++;
    document.body.classList.add('is-locked');
  }
  function unlockScroll() {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) document.body.classList.remove('is-locked');
  }

  // ---- Parallax: shift bg-position-y of tagged sections at a fraction of scroll.
  //      CSS handles the prefers-reduced-motion override; JS runs unconditionally
  //      so the class is present (CSS then pins bg-position-y to 50% if reduced). ----
  const PARALLAX_SELECTOR = '.hero, .banner, .section--parallax, .section--parallax-dark, .section--parallax-bare, .parallax-divider';
  const PARALLAX_RATE = 0.5;
  const layers = [...document.querySelectorAll(PARALLAX_SELECTOR)];
  layers.forEach(el => el.classList.add('parallax-layer'));
  let ticking = false;
  function updateParallax() {
    const vH = window.innerHeight;
    const viewMid = vH / 2;
    layers.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -vH || rect.top > vH * 2) return;
      const elMid = rect.top + rect.height / 2;
      const offset = Math.round((elMid - viewMid) * PARALLAX_RATE * -1);
      el.style.setProperty('--parallax-offset', offset + 'px');
    });
    ticking = false;
  }
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateParallax();

  // ---- Mobile nav toggle ----
  const burger = document.querySelector('.hamburger');
  const navPanel = document.getElementById('primary-nav');
  if (burger) {
    burger.addEventListener('click', () => {
      document.body.classList.toggle('nav-open');
      const open = document.body.classList.contains('nav-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    // Close mobile nav when tapping outside of it
    document.addEventListener('click', (e) => {
      if (!document.body.classList.contains('nav-open')) return;
      if (!burger.contains(e.target) && !(navPanel && navPanel.contains(e.target))) {
        document.body.classList.remove('nav-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---- Smooth-scroll on anchor clicks (more reliable than scroll-behavior: smooth) ----
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      if (!hash || hash === '#') return;
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      e.preventDefault();
      if (document.body.classList.contains('nav-open')) {
        document.body.classList.remove('nav-open');
        if (burger) burger.setAttribute('aria-expanded', 'false');
      }
      const navH = document.querySelector('.site-header')?.offsetHeight || 70;
      const y = target.getBoundingClientRect().top + window.scrollY - navH - 10;
      window.scrollTo({ top: y, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      // replaceState keeps in-page nav out of the history stack so Back leaves the site
      history.replaceState(null, '', hash);
    });
  });

  // ---- Header hide on scroll-down, show on scroll-up ----
  const header = document.querySelector('.site-header');
  if (header) {
    let lastY = window.scrollY;
    let headerTicking = false;
    window.addEventListener('scroll', () => {
      if (!headerTicking) {
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
          headerTicking = false;
        });
        headerTicking = true;
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

  // ---- Lightbox for gallery (images + video) ----
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox && lightbox.querySelector('.lightbox-img');
  const lightboxVideo = lightbox && lightbox.querySelector('.lightbox-video');
  const lightboxCounter = lightbox && lightbox.querySelector('.lightbox-counter');
  const lightboxClose = lightbox && lightbox.querySelector('.lightbox-close');
  const galleryLinks = [...document.querySelectorAll('.gallery .gallery-item')];
  let currentIndex = 0;
  let lightboxIsOpen = false;
  let lightboxReturnFocus = null;

  function stopVideo() {
    if (!lightboxVideo) return;
    try { lightboxVideo.pause(); } catch (_) {}
    lightboxVideo.removeAttribute('src');
    lightboxVideo.load();
  }
  function clearImage() {
    if (!lightboxImg) return;
    lightboxImg.removeAttribute('src');
    lightboxImg.alt = '';
  }

  function showAt(i) {
    if (!galleryLinks.length) return;
    currentIndex = ((i % galleryLinks.length) + galleryLinks.length) % galleryLinks.length;
    const link = galleryLinks[currentIndex];
    const videoSrc = link.dataset.video;
    const imgSrc = link.dataset.full;

    lightbox.classList.remove('is-image', 'is-video');
    stopVideo();
    clearImage();

    if (videoSrc) {
      lightboxVideo.src = videoSrc;
      if (link.dataset.poster) lightboxVideo.poster = link.dataset.poster;
      lightbox.classList.add('is-video');
      // Kick off loading, then auto-play — user already clicked the play icon once.
      lightboxVideo.load();
      const tryPlay = () => {
        const p = lightboxVideo.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      };
      // If already buffered (HAVE_FUTURE_DATA), play immediately; else wait for canplay.
      if (lightboxVideo.readyState >= 3) {
        tryPlay();
      } else {
        lightboxVideo.addEventListener('canplay', tryPlay, { once: true });
        // Fallback: attempt play right away too (works in many browsers within gesture)
        tryPlay();
      }
    } else if (imgSrc) {
      lightboxImg.src = imgSrc;
      lightboxImg.alt = link.querySelector('img')?.alt || '';
      lightbox.classList.add('is-image');
    }

    if (lightboxCounter) {
      lightboxCounter.textContent = (currentIndex + 1) + ' / ' + galleryLinks.length;
    }
    if (!lightboxIsOpen) {
      lightboxReturnFocus = document.activeElement;
      lightbox.classList.add('is-open');
      lockScroll();
      lightboxIsOpen = true;
      if (lightboxClose) {
        // Defer so the browser finishes layout before focusing
        requestAnimationFrame(() => lightboxClose.focus());
      }
    }
  }
  function closeBox() {
    if (!lightbox || !lightboxIsOpen) return;
    lightbox.classList.remove('is-open');
    stopVideo();
    clearImage();
    unlockScroll();
    lightboxIsOpen = false;
    if (lightboxReturnFocus && typeof lightboxReturnFocus.focus === 'function') {
      lightboxReturnFocus.focus();
    }
    lightboxReturnFocus = null;
  }

  galleryLinks.forEach((link, i) => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showAt(i);
    });
  });
  if (lightbox) {
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox ||
          e.target.classList.contains('lightbox-stage') ||
          e.target.classList.contains('lightbox-close')) closeBox();
      else if (e.target.closest('.lightbox-prev')) showAt(currentIndex - 1);
      else if (e.target.closest('.lightbox-next')) showAt(currentIndex + 1);
    });
    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeBox();
      else if (e.key === 'ArrowLeft') showAt(currentIndex - 1);
      else if (e.key === 'ArrowRight') showAt(currentIndex + 1);
    });

    // Touch swipe navigation
    let touchStartX = 0, touchStartY = 0, touchStartT = 0;
    lightbox.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartT = Date.now();
    }, { passive: true });
    lightbox.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const dt = Date.now() - touchStartT;
      // Horizontal swipe: at least 50px, mostly horizontal, < 600ms
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) {
        showAt(currentIndex + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
  }
  // ---- Cheat Sheet modal ----
  const csOverlay = document.getElementById('cheatsheet');
  const csOpen = document.getElementById('cheatsheet-open');
  if (csOverlay && csOpen) {
    const csClose = csOverlay.querySelector('.cheatsheet-close');
    let csReturnFocus = null;
    let csIsOpen = false;
    function openCheatsheet(e) {
      e.preventDefault();
      if (csIsOpen) return;
      csReturnFocus = document.activeElement;
      csOverlay.classList.add('is-open');
      lockScroll();
      csIsOpen = true;
      if (csClose) csClose.focus();
    }
    function closeCheatsheet() {
      if (!csIsOpen) return;
      csOverlay.classList.remove('is-open');
      unlockScroll();
      csIsOpen = false;
      if (csReturnFocus && typeof csReturnFocus.focus === 'function') {
        csReturnFocus.focus();
      }
      csReturnFocus = null;
    }
    csOpen.addEventListener('click', openCheatsheet);
    csClose.addEventListener('click', closeCheatsheet);
    csOverlay.addEventListener('click', function (e) {
      if (e.target === csOverlay) closeCheatsheet();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && csIsOpen) closeCheatsheet();
    });
  }

})();
