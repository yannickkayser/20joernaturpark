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

    var visible = allItems;

    function imgSrc(item) {
      var img = item.querySelector('.np-item__img-wrap img');
      return img && img.getAttribute('src') ? img.getAttribute('src') : '';
    }
    function setBg(src) {
      if (!src) { section.style.backgroundImage = ''; return; }
      var current = section.style.backgroundImage;
      var next = 'url("' + src + '")';
      if (current !== next) section.style.backgroundImage = next;
    }
    function setActive(idx) {
      allItems.forEach(function (it) { it.classList.remove('is-active'); });
      var it = visible[idx];
      if (!it) return;
      it.classList.add('is-active');
      var src = imgSrc(it);
      if (src) setBg(src);
    }

    var ticking = false;
    function update() {
      var centre = window.scrollY + window.innerHeight / 2;
      var best = 0, bestDist = Infinity;
      for (var i = 0; i < visible.length; i++) {
        var r = visible[i].getBoundingClientRect();
        var top = r.top + window.scrollY;
        var mid = top + r.height / 2;
        var d = Math.abs(mid - centre);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      setActive(best);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', update);

    /* Re-derive the visible-item list and zig-zag alternation after the
       tier toggle changes which items CSS is hiding. offsetParent is a
       cheap, reliable "is this rendered" check (null for display:none). */
    function refresh() {
      visible = allItems.filter(function (it) { return it.offsetParent !== null; });
      visible.forEach(function (it, i) {
        it.classList.remove('np-zig-left', 'np-zig-right');
        it.classList.add(i % 2 === 0 ? 'np-zig-left' : 'np-zig-right');
      });
      update();
    }

    refresh();
    setTimeout(update, 60);

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
