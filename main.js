/* A & J Automotive preview, motion and small behaviours (v3, 2026-10-29)
   No framework. Jobs: theme toggle, the hero wheel (peels out on load, turns
   as you scroll), reveal on scroll, count-up, vehicle listings from
   vehicles.json with a detail sheet. Everything respects prefers-reduced-motion. */
(function () {
  'use strict';
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = mq.matches;
  if (reduced) root.classList.add('reduced');
  if (mq.addEventListener) mq.addEventListener('change', function (e) { reduced = e.matches; root.classList.toggle('reduced', reduced); });

  /* 1. theme toggle: forces light or dark, remembered per browser */
  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var forced = root.getAttribute('data-theme');
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var isDark = forced ? forced === 'dark' : systemDark;
      var next = isDark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('aj-theme', next); } catch (e) {}
    });
  }

  /* 2. the wheel: it peels out on load (one fast turn that settles while the
        skid marks are laid, CSS), then turns with the scroll, clockwise, the way
        it would roll toward the page. One transform on one group per frame. */
  var spin = document.querySelector('.hero[data-wheel] .wheel-spin');
  if (spin && !reduced) {
    var scrollDeg = 0, introDeg = 0, ticking = false;
    /* SVG transform attribute, user-space centre (200,200): works on iOS Safari, where a CSS rotate on an
       SVG group turned around the wrong point (v3.1, 2026-10-29). */
    var paint = function () { spin.setAttribute('transform', 'rotate(' + (scrollDeg + introDeg).toFixed(2) + ' 200 200)'); };
    var apply = function () { ticking = false; scrollDeg = (window.scrollY || 0) * 0.3; paint(); };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(apply); } }, { passive: true });
    var t0 = null, delay = 450, dur = 1500, from = -540;
    introDeg = from; apply();
    var intro = function (ts) {
      if (t0 === null) t0 = ts;
      var p = Math.max(0, Math.min(1, (ts - t0 - delay) / dur));
      introDeg = from * Math.pow(1 - p, 3);
      paint();
      if (p < 1) window.requestAnimationFrame(intro);
    };
    window.requestAnimationFrame(intro);
  }

  /* 3. reveal on scroll: add .in once, when 15% of the block is visible */
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduced) {
    for (var i = 0; i < items.length; i++) items[i].classList.add('in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    for (var j = 0; j < items.length; j++) io.observe(items[j]);
  }

  /* 4. count-up on numbers, once, when seen */
  var counters = document.querySelectorAll('[data-count]');
  var runCount = function (el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var dur = 1100, t0 = null;
    var step = function (ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = (end * e).toFixed(dec);
      if (p < 1) window.requestAnimationFrame(step); else el.textContent = end.toFixed(dec);
    };
    window.requestAnimationFrame(step);
  };
  if (counters.length && !reduced && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { runCount(en.target); co.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    for (var k = 0; k < counters.length; k++) co.observe(counters[k]);
  }

  /* 5. vehicles: cards from vehicles.json; a detail sheet on the vehicles page */
  var holders = document.querySelectorAll('[data-vehicles]');
  var sheet = document.getElementById('vsheet');
  var TEL = 'tel:+12899930040';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function title(v) { return [v.year, v.make, v.model, v.trim].filter(Boolean).join(' '); }
  function km(v) { return v.km ? v.km.toLocaleString('en-CA') + ' km' : 'Kilometres: call'; }
  function metaLine(v) { return [v.colour, v.body, v.drive].filter(Boolean).concat([km(v)]).join(' · '); }
  function chip(v) {
    if (v.status === 'sample') return '<span class="chip chip-sample">Sample listing</span>';
    if (v.status === 'sold') return '<span class="chip">Sold</span>';
    return '<span class="chip chip-accent">On the lot</span>';
  }
  function emptyFrame(cls) { return '<div class="frame frame-empty ' + (cls || '') + '"><svg aria-hidden="true"><use href="#road"/></svg><span class="frame-cap">Photos coming</span></div>'; }
  function frame(v, p, cls, big) {
    if (!p) return emptyFrame(cls);
    var src = big ? p.src : (p.thumb || p.src);
    var dim = big ? 'width="960" height="1280"' : 'width="640" height="853"';
    return '<div class="frame ' + (cls || '') + '"><img src="' + esc(src) + '" alt="' + esc(title(v) + ', ' + p.caption) + '" ' + dim + ' loading="lazy" decoding="async"><span class="frame-cap">' + esc(p.caption) + '</span></div>';
  }
  function cardHTML(v) {
    var open = sheet ? '<button type="button" class="vcard" data-open="' + esc(v.id) + '">' : '<a class="vcard" href="vehicles.html#v-' + esc(v.id) + '">';
    var close = sheet ? '</button>' : '</a>';
    return open + frame(v, (v.photos || [])[0]) +
      '<div class="vcard-body"><h3 class="vcard-title">' + esc(title(v)) + '</h3><p class="vcard-meta">' + esc(metaLine(v)) + '</p>' +
      '<div class="vcard-row"><span class="vcard-price">' + (v.price === 'Ask' ? 'Price: ask' : esc(v.price)) + '</span>' + chip(v) + '</div></div>' + close;
  }
  function specs(v) {
    var rows = [['Year', v.year || 'Call'], ['Make', v.make], ['Model', v.model], ['Trim', v.trim || 'Call'], ['Colour', v.colour || 'Call'],
      ['Body', v.body || 'Call'], ['Drive', v.drive || 'Call'], ['Kilometres', v.km ? v.km.toLocaleString('en-CA') + ' km' : 'Call'], ['Price', v.price === 'Ask' ? 'Ask' : v.price]];
    return rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
  }
  function openSheet(v) {
    var photos = v.photos || [];
    var thumbs = photos.length > 1
      ? '<div class="thumbs">' + photos.map(function (p, i) { return '<button type="button" class="frame" data-i="' + i + '" aria-current="' + (i === 0) + '" aria-label="Photo ' + (i + 1) + '"><img src="' + esc(p.thumb || p.src) + '" alt="" width="640" height="853" loading="lazy" decoding="async"></button>'; }).join('') + '</div>'
      : (photos.length ? '' : '<div class="thumbs">' + new Array(7).join('<div class="frame frame-empty"></div>') + '</div>');
    sheet.innerHTML =
      '<button class="sheet-close" type="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<div class="sheet-in"><div class="gallery">' + frame(v, photos[0], 'main', true) + thumbs + '</div>' +
      '<div>' + chip(v) + '<h2 class="h2 sheet-title">' + esc(title(v)) + '</h2><p class="meta">' + esc(v.note || '') + '</p>' +
      '<dl class="specs">' + specs(v) + '</dl>' +
      '<div class="sheet-cta"><a class="btn btn-primary" href="' + TEL + '"><svg aria-hidden="true"><use href="#phone"/></svg>Call about this car</a><a class="btn btn-ghost" href="index.html#visit">See it at the shop</a></div></div></div>';
    sheet.querySelector('.sheet-close').addEventListener('click', function () { sheet.close(); });
    var tb = sheet.querySelectorAll('.thumbs button');
    tb.forEach(function (t) {
      t.addEventListener('click', function () {
        var p = photos[parseInt(t.getAttribute('data-i'), 10)];
        sheet.querySelector('.gallery .main').outerHTML = frame(v, p, 'main', true);
        tb.forEach(function (x) { x.setAttribute('aria-current', String(x === t)); });
      });
    });
    if (typeof sheet.showModal === 'function') { if (!sheet.open) sheet.showModal(); } else { sheet.setAttribute('open', ''); }
    try { history.replaceState(null, '', '#v-' + v.id); } catch (e) {}
  }
  if (sheet) {
    sheet.addEventListener('click', function (ev) { if (ev.target === sheet) sheet.close(); });
    sheet.addEventListener('close', function () { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} });
  }
  if (holders.length) {
    fetch('vehicles.json').then(function (r) { return r.json(); }).then(function (list) {
      var byId = {};
      list.forEach(function (v) { byId[v.id] = v; });
      holders.forEach(function (h) {
        var lim = h.getAttribute('data-vehicles');
        var set = lim === 'all' ? list : list.slice(0, parseInt(lim, 10) || 3);
        h.innerHTML = set.map(cardHTML).join('');
      });
      if (sheet) {
        document.addEventListener('click', function (ev) {
          var b = ev.target.closest && ev.target.closest('[data-open]');
          if (!b) return;
          var v = byId[b.getAttribute('data-open')];
          if (v) openSheet(v);
        });
        if (location.hash.indexOf('#v-') === 0) { var v0 = byId[location.hash.slice(3)]; if (v0) openSheet(v0); }
      }
    }).catch(function () {
      holders.forEach(function (h) { h.innerHTML = '<p class="meta">The listings did not load. Call <a href="' + TEL + '">(289) 993-0040</a> to ask what is on the lot.</p>'; });
    });
  }

  /* the call bar stays put: Nishan 2026-10-29 saw it vanish and come back on his phone and read it as a glitch */
  /* footer year */
  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();
