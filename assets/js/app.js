/* Best Cabo Adventures — progressive enhancement only.
   Everything below is optional: the page works with JS disabled. */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------ sticky header */
  var header = $('.site-header');
  if (header) {
    var solid = function () { header.classList.toggle('is-solid', window.scrollY > 24); };
    solid();
    window.addEventListener('scroll', solid, { passive: true });
  }

  /* -------------------------------------------------------- mobile nav */
  var burger = $('.burger');
  var mnav = $('.mobile-nav');
  if (burger && mnav) {
    var setNav = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      mnav.classList.toggle('is-open', open);
      document.documentElement.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () {
      setNav(burger.getAttribute('aria-expanded') !== 'true');
    });
    mnav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setNav(false);
    });
  }

  /* ------------------------------------------------------- reveal once */
  var reveals = $$('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* --------------------------------------------------- tour catalogue  */
  var grid = $('#tour-grid');
  if (grid) {
    var cards = $$('.card', grid);
    var chips = $$('.chip');
    var sortSel = $('#tour-sort');
    var counter = $('#tour-count');
    var empty = $('#tour-empty');
    var state = { cat: 'all', sort: 'featured' };

    var num = function (el, key) { return parseFloat(el.getAttribute(key)) || 0; };

    var apply = function () {
      var visible = 0;
      cards.forEach(function (c) {
        var ok = state.cat === 'all' || c.getAttribute('data-cat') === state.cat ||
          (c.getAttribute('data-tags') || '').split(' ').indexOf(state.cat) > -1;
        c.hidden = !ok;
        if (ok) visible++;
      });

      var sorted = cards.slice().sort(function (a, b) {
        switch (state.sort) {
          case 'priceAsc': return num(a, 'data-price') - num(b, 'data-price');
          case 'priceDesc': return num(b, 'data-price') - num(a, 'data-price');
          case 'durationAsc': return num(a, 'data-hours') - num(b, 'data-hours');
          case 'durationDesc': return num(b, 'data-hours') - num(a, 'data-hours');
          default: return num(a, 'data-order') - num(b, 'data-order');
        }
      });
      var frag = document.createDocumentFragment();
      sorted.forEach(function (c) { frag.appendChild(c); });
      grid.appendChild(frag);

      if (counter) {
        counter.textContent = visible + ' ' +
          (visible === 1 ? counter.getAttribute('data-one') : counter.getAttribute('data-many'));
      }
      if (empty) empty.hidden = visible !== 0;
    };

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.cat = chip.getAttribute('data-cat');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        apply();
      });
    });
    if (sortSel) {
      sortSel.addEventListener('change', function () { state.sort = sortSel.value; apply(); });
    }
    apply();
  }

  /* ------------------------------------------------------- gallery box */
  var lb = $('#lightbox');
  if (lb && typeof lb.showModal === 'function') {
    var lbImg = $('.lb-img', lb);
    var lbCount = $('.lb-count', lb);
    var shots = $$('.gallery button');
    var idx = 0;

    var show = function (i) {
      idx = (i + shots.length) % shots.length;
      var src = shots[idx].getAttribute('data-full');
      var alt = shots[idx].querySelector('img').alt;
      lbImg.setAttribute('src', src);
      lbImg.setAttribute('alt', alt);
      if (lbCount) lbCount.textContent = (idx + 1) + ' / ' + shots.length;
    };

    shots.forEach(function (b, i) {
      b.addEventListener('click', function () { show(i); lb.showModal(); });
    });
    $('.lb-next', lb).addEventListener('click', function () { show(idx + 1); });
    $('.lb-prev', lb).addEventListener('click', function () { show(idx - 1); });
    $('.lb-close', lb).addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lightbox-in')) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
    });
  }

  /* ------------------------------------------------------ booking form */
  var form = $('#booking-form');
  if (form) {
    var adults = $('#f-adults');
    var kids = $('#f-kids');
    var date = $('#f-date');
    var time = $('#f-time');
    var totalEl = $('#f-total');
    var pAdult = parseFloat(form.getAttribute('data-adult')) || 0;
    var pKid = parseFloat(form.getAttribute('data-kid')) || 0;
    var locale = form.getAttribute('data-locale') || 'es-MX';

    if (date) {
      var t = new Date();
      var iso = new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      date.min = iso;
      if (!date.value) date.value = iso;
    }

    var total = function () {
      return (parseInt(adults.value, 10) || 0) * pAdult + (parseInt(kids.value, 10) || 0) * pKid;
    };
    var render = function () {
      if (totalEl) totalEl.textContent = '$' + total().toFixed(0) + ' USD';
    };

    $$('.stepper button', form).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = $('#' + btn.getAttribute('data-for'));
        var step = parseInt(btn.getAttribute('data-step'), 10);
        var min = parseInt(input.min, 10) || 0;
        var max = parseInt(input.max, 10) || 30;
        input.value = Math.min(max, Math.max(min, (parseInt(input.value, 10) || 0) + step));
        render();
      });
    });
    form.addEventListener('input', render);
    render();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var L = JSON.parse(form.getAttribute('data-labels'));
      var pretty = date && date.value
        ? new Date(date.value + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '—';
      var nA = parseInt(adults.value, 10) || 0;
      var nK = parseInt(kids.value, 10) || 0;
      var pax = [];
      if (nA > 0) pax.push(nA + ' ' + (nA === 1 ? L.adult : L.adults));
      if (nK > 0) pax.push(nK + ' ' + (nK === 1 ? L.kid : L.kids));

      var lines = [
        L.intro,
        '',
        '• ' + L.tour + ': ' + form.getAttribute('data-tour'),
        '• ' + L.date + ': ' + pretty
      ];
      if (time && time.value) lines.push('• ' + L.time + ': ' + time.value);
      lines.push('• ' + L.pax + ': ' + pax.join(' + '));
      lines.push('• ' + L.total + ': $' + total().toFixed(0) + ' USD');
      lines.push('');
      lines.push(L.close);

      window.open(
        'https://wa.me/' + form.getAttribute('data-wa') + '?text=' + encodeURIComponent(lines.join('\n')),
        '_blank',
        'noopener'
      );
    });
  }

  /* ------------------------------------------------------------- year  */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
