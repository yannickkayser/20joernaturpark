/* ══════════════════════════════════════════════════════════
   timeline.js — Naturpark Our: 60+ Joer Geschicht
   Vanilla JS, no dependencies.

   - Activates timeline items as they scroll past the centre
     of the viewport, swaps the section background image (if the
     item has one), and blurs/dims inactive items.
   - Three-way tier toggle (Meilensteine / Ereignisse / Alles
     entdecken): every .np-item carries a data-tier attribute;
     CSS hides everything that doesn't match the section's
     data-active-tier. This module re-derives the *visible* item
     list whenever the tier changes (nth-child alternation would
     otherwise be thrown off by hidden items), and resets the
     scroll-active state so the new view starts clean.
   - Top-of-page reading progress bar.
   - Scroll-driven rotation for the bottom-right logo badge.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function boot() {
    initProgressBar();
    var timeline = initTimeline();
    initTierToggle(timeline);
    initSpinner();
    initGemModal();
  }

  /* ── Reading progress bar ─────────────────────────────────── */
  function initProgressBar() {
    var bar = document.querySelector('.np-progress');
    if (!bar) return;
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop || window.scrollY) / max : 0;
      bar.style.width = (Math.max(0, Math.min(1, p)) * 100).toFixed(2) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ── Timeline: active-item detection + background swap ────── */
  function initTimeline() {
    var section = document.querySelector('.np-timeline-section');
    if (!section) return null;
    var allItems = Array.prototype.slice.call(section.querySelectorAll('.np-item'));
    if (!allItems.length) return null;

    /* Skip the full-bleed photo backdrop on touch/coarse-pointer devices.
       Swapping a large background-image with a transition on every active-
       item change is a real repaint cost on mobile GPUs; the static colour
       already defined in CSS reads fine without it. */
    var skipBg = window.matchMedia
      && window.matchMedia('(hover: none), (pointer: coarse)').matches;

    function imgSrc(item) {
      var img = item.querySelector('.np-item__img-wrap img');
      return img && img.getAttribute('src') ? img.getAttribute('src') : '';
    }
    function setBg(src) {
      if (skipBg) return;
      if (!src) { section.style.backgroundImage = ''; return; }
      var current = section.style.backgroundImage;
      var next = 'url("' + src + '")';
      if (current !== next) section.style.backgroundImage = next;
    }

    var activeItem = null;
    function setActive(item) {
      if (item === activeItem) return;
      if (activeItem) activeItem.classList.remove('is-active');
      activeItem = item;
      if (!item) return;
      item.classList.add('is-active');
      var src = imgSrc(item);
      if (src) setBg(src);
    }

    /* IntersectionObserver instead of a scroll-driven getBoundingClientRect
       loop: the old approach re-measured every visible item's layout box on
       every animation frame while scrolling, which is expensive on mobile
       (forced layout reads stacked on top of the blur/opacity transitions
       below). The observer only fires when intersection actually changes,
       and the browser computes it off the hot scroll path. rootMargin
       shrinks the effective viewport to a thin band at the centre; among
       items crossing that band we pick the one with the highest overlap.

       Each callback only reports entries for items whose intersection just
       changed — NOT every currently-intersecting item. Picking the "best"
       from only that batch meant we'd switch to whatever item had just
       crossed a threshold even when the already-active item was still more
       centered, which is exactly what showed up as the active tile (and
       its background photo) jumping back and forth near a tile boundary.
       Tracking every item's last-known ratio and re-evaluating the true
       max across all of them on every callback fixes that. */
    var useObserver = typeof window.IntersectionObserver === 'function';
    var visible = allItems;
    var ratios = new Map();

    if (useObserver) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
        });
        var best = null, bestRatio = 0;
        ratios.forEach(function (ratio, el) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = el;
          }
        });
        if (best) setActive(best);
      }, {
        root: null,
        rootMargin: '-45% 0px -45% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
      });
      allItems.forEach(function (it) { observer.observe(it); });
    } else {
      /* Old browsers without IntersectionObserver: just activate the first
         visible item once and leave it, rather than reintroducing the
         expensive per-frame measuring loop. */
      setActive(allItems[0]);
    }

    /* Re-derive the visible-item list and zig-zag alternation after the
       tier toggle changes which items CSS is hiding. offsetParent is a
       cheap, reliable "is this rendered" check (null for display:none). */
    function refresh() {
      visible = allItems.filter(function (it) { return it.offsetParent !== null; });
      visible.forEach(function (it, i) {
        it.classList.remove('np-zig-left', 'np-zig-right');
        it.classList.add(i % 2 === 0 ? 'np-zig-left' : 'np-zig-right');
      });
      /* Items just hidden by the tier toggle keep whatever ratio they had
         the moment they disappeared — clear it so a stale high ratio from
         before the switch can't win the "best" comparison later. */
      allItems.forEach(function (it) {
        if (it.offsetParent === null) ratios.set(it, 0);
      });
      if (activeItem && activeItem.offsetParent === null) {
        activeItem.classList.remove('is-active');
        activeItem = null;
      }
      if (!useObserver && !activeItem) setActive(visible[0]);
    }

    refresh();

    return { allItems: allItems, refresh: refresh, section: section };
  }

  /* ── Tier toggle: Meilensteine / Ereignisse / Alles entdecken ── */
  function initTierToggle(timeline) {
    var section = document.querySelector('.np-timeline-section');
    var toggle = document.querySelector('.np-tier-toggle');
    if (!section || !toggle) return;
    var buttons = Array.prototype.slice.call(toggle.querySelectorAll('.np-tier-btn'));
    if (!buttons.length) return;

    var counts = {};
    if (timeline) {
      timeline.allItems.forEach(function (it) {
        var t = it.getAttribute('data-tier');
        counts[t] = (counts[t] || 0) + 1;
      });
    }
    buttons.forEach(function (btn) {
      var t = btn.getAttribute('data-tier-select');
      var countEl = btn.querySelector('.np-tier-count');
      if (countEl && counts[t] !== undefined) countEl.textContent = '(' + counts[t] + ')';
    });

    function selectTier(tier, opts) {
      section.setAttribute('data-active-tier', tier);
      buttons.forEach(function (btn) {
        var isSelected = btn.getAttribute('data-tier-select') === tier;
        btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });
      if (timeline) timeline.refresh();
      if (opts && opts.scrollToTop) {
        var header = section.querySelector('.np-timeline-header');
        if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tier = btn.getAttribute('data-tier-select');
        if (section.getAttribute('data-active-tier') === tier) return;
        selectTier(tier, { scrollToTop: true });
      });
    });
  }

  /* ── Scroll-driven rotation for the bottom-right logo badge ── */
  function initSpinner() {
    var spinner = document.querySelector('.np-spinner__inner');
    if (!spinner) return;
    var prefersReduced = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    var ticking = false;
    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      spinner.style.transform = 'rotate(' + (y / 3) + 'deg)';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ── Hidden-gem modal: archive finds outside the dated timeline ── */
  function initGemModal() {
    var trigger = document.getElementById('npGemTrigger');
    var modal = document.getElementById('npGemModal');
    if (!trigger || !modal) return;
    var closers = modal.querySelectorAll('[data-gem-close]');
    var lastFocused = null;

    function open() {
      lastFocused = document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      var closeBtn = modal.querySelector('.np-gem-modal__close');
      if (closeBtn) closeBtn.focus();
      document.addEventListener('keydown', onKeydown);
    }
    function close() {
      modal.hidden = true;
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeydown);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }
    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }

    trigger.addEventListener('click', open);
    closers.forEach(function (el) { el.addEventListener('click', close); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
