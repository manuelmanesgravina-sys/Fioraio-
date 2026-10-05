/* =========================================================
   Il Portico Fiori — script del sito
   Approccio "zero-bundle": JavaScript nativo, nessuna libreria,
   nessun passaggio di build. Ogni blocco è indipendente.
   ========================================================= */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Visualizzatore Spline caricato solo se serve (vedi data-spline-scene in index.html) */
  var SPLINE_VIEWER_URL = 'https://unpkg.com/@splinetool/viewer/build/spline-viewer.js';

  /* ---------------------------------------------------------
     Rilevamento dispositivi lenti / risparmio dati
     --------------------------------------------------------- */
  function isLowPower() {
    var c = navigator.connection || {};
    if (reduceMotion) return true;
    if (c.saveData) return true;
    if (/(^|slow-)2g|3g/.test(c.effectiveType || '')) return true;
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) return true;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return true;
    return false;
  }

  /* ---------------------------------------------------------
     Menu mobile e intestazione
     --------------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.querySelector('[data-nav]');
    var header = document.querySelector('[data-header]');
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.sr-only').textContent = open ? 'Chiudi il menu' : 'Apri il menu';
    }
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });

    if (header) {
      var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  /* ---------------------------------------------------------
     Comparsa morbida degli elementi sotto la piega
     --------------------------------------------------------- */
  function initReveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    var els = document.querySelectorAll('.section-head, .service, .gallery-item, .step, .card, .atelier-copy');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('reveal'); io.observe(el); }
    });
  }

  /* ---------------------------------------------------------
     Orari: legge la tabella e mostra "Aperto ora / Chiuso"
     (fuso orario di Roma, indipendente dal dispositivo)
     --------------------------------------------------------- */
  function initHours() {
    var table = document.querySelector('[data-hours]');
    var status = document.querySelector('[data-open-status]');
    if (!table || !status) return;

    var days = {};
    table.querySelectorAll('tr[data-day]').forEach(function (tr) {
      var d = Number(tr.getAttribute('data-day'));
      var text = tr.querySelector('td').textContent;
      var re = /(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})/g;
      var m, slots = [];
      while ((m = re.exec(text))) slots.push([+m[1] * 60 + +m[2], +m[3] * 60 + +m[4]]);
      days[d] = { row: tr, name: tr.querySelector('th').textContent.trim().toLowerCase(), slots: slots };
    });

    var fmt;
    try {
      fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
    } catch (e) { return; }
    var WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    var hhmm = function (min) { return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); };

    function update() {
      var p = {};
      fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      var day = WD[p.weekday];
      var now = (+p.hour % 24) * 60 + +p.minute;
      var today = days[day];
      if (!today) return;

      Object.keys(days).forEach(function (k) { days[k].row.classList.toggle('is-today', +k === day); });

      var open = today.slots.find(function (s) { return now >= s[0] && now < s[1]; });
      if (open) {
        status.textContent = 'Aperto ora · chiude alle ' + hhmm(open[1]);
        status.className = 'open-status is-open';
        return;
      }
      var later = today.slots.find(function (s) { return s[0] > now; });
      var msg = null;
      if (later) msg = 'Chiuso ora · riapre oggi alle ' + hhmm(later[0]);
      else {
        for (var i = 1; i <= 7; i++) {
          var nd = days[(day + i) % 7];
          if (nd && nd.slots.length) {
            msg = 'Chiuso ora · riapre ' + (i === 1 ? 'domani' : nd.name) + ' alle ' + hhmm(nd.slots[0][0]);
            break;
          }
        }
      }
      status.textContent = msg || '';
      status.className = 'open-status is-closed';
    }
    update();
    setInterval(update, 60 * 1000);
  }

  /* ---------------------------------------------------------
     Galleria: filtri, cornici 3D (tilt) e visualizzatore
     --------------------------------------------------------- */
  function initGallery() {
    var gallery = document.querySelector('[data-gallery]');
    if (!gallery) return;
    var items = Array.prototype.slice.call(gallery.querySelectorAll('.gallery-item'));

    // Filtri
    var filters = document.querySelector('[data-filters]');
    if (filters) {
      filters.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-filter]');
        if (!btn) return;
        var cat = btn.getAttribute('data-filter');
        filters.querySelectorAll('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        var apply = function () {
          items.forEach(function (it) { it.hidden = !(cat === 'tutti' || it.getAttribute('data-categoria') === cat); });
        };
        if (document.startViewTransition && !reduceMotion) document.startViewTransition(apply);
        else apply();
      });
    }

    // Cornici con inclinazione 3D (mouse, penna e tocco)
    if (!reduceMotion) {
      gallery.querySelectorAll('[data-tilt]').forEach(function (frame) {
        var raf = 0, last = null;
        function paint() {
          raf = 0;
          if (!last) return;
          var r = frame.getBoundingClientRect();
          var x = Math.min(Math.max((last.x - r.left) / r.width, 0), 1);
          var y = Math.min(Math.max((last.y - r.top) / r.height, 0), 1);
          frame.style.setProperty('--ry', ((x - 0.5) * 14).toFixed(2) + 'deg');
          frame.style.setProperty('--rx', ((0.5 - y) * 12).toFixed(2) + 'deg');
          frame.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
          frame.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
          frame.style.setProperty('--glare', '1');
        }
        function move(e) {
          last = { x: e.clientX, y: e.clientY };
          frame.classList.add('is-tilting');
          if (!raf) raf = requestAnimationFrame(paint);
        }
        function reset() {
          last = null;
          frame.classList.remove('is-tilting');
          ['--rx', '--ry', '--glare'].forEach(function (p) { frame.style.removeProperty(p); });
        }
        frame.addEventListener('pointermove', move);
        frame.addEventListener('pointerdown', move);
        frame.addEventListener('pointerleave', reset);
        frame.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') reset(); });
        frame.addEventListener('pointercancel', reset);
        frame.addEventListener('blur', reset);
      });
    }

    // Visualizzatore (dialog nativo); senza supporto il link apre l'immagine
    var box = document.querySelector('[data-lightbox]');
    if (!box || typeof box.showModal !== 'function') return;
    var img = box.querySelector('[data-lightbox-img]');
    var cap = box.querySelector('[data-lightbox-caption]');
    var current = 0;
    var visible = function () { return items.filter(function (it) { return !it.hidden; }); };

    function show(index) {
      var list = visible();
      if (!list.length) return;
      current = (index + list.length) % list.length;
      var link = list[current].querySelector('.frame');
      var thumb = link.querySelector('img');
      img.src = link.getAttribute('href');
      img.alt = thumb.alt;
      var title = link.querySelector('.caption strong');
      cap.textContent = title ? title.textContent : '';
    }
    gallery.addEventListener('click', function (e) {
      var link = e.target.closest('.frame');
      if (!link) return;
      e.preventDefault();
      show(visible().indexOf(link.closest('.gallery-item')));
      box.showModal();
    });
    box.querySelector('[data-lightbox-close]').addEventListener('click', function () { box.close(); });
    box.querySelector('[data-lightbox-prev]').addEventListener('click', function () { show(current - 1); });
    box.querySelector('[data-lightbox-next]').addEventListener('click', function () { show(current + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }

  /* ---------------------------------------------------------
     Mappa: niente iFrame finché il visitatore non la chiede
     --------------------------------------------------------- */
  function initMap() {
    var facade = document.querySelector('[data-map]');
    if (!facade) return;
    var btn = facade.querySelector('[data-map-load]');
    btn.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = facade.getAttribute('data-map-src');
      iframe.title = 'Mappa: Il Portico Fiori, Strada Genova 108/D, Moncalieri';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.allowFullscreen = true;
      facade.replaceChildren(iframe);
      iframe.focus();
    });
  }

  /* ---------------------------------------------------------
     Modulo contatti: prepara l'email nel client di posta
     --------------------------------------------------------- */
  function initForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;
    var date = form.querySelector('input[type="date"]');
    if (date) {
      var d = new Date();
      date.min = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var v = function (n) { return (form.elements[n].value || '').trim(); };
      var to = form.getAttribute('action').replace(/^mailto:/, '');
      var subject = 'Richiesta dal sito – ' + v('occasione');
      var dataIt = v('data') ? v('data').split('-').reverse().join('/') : '';
      var body = [
        'Nome: ' + v('nome'),
        v('telefono') ? 'Telefono: ' + v('telefono') : '',
        'Occasione: ' + v('occasione'),
        dataIt ? 'Data desiderata: ' + dataIt : '',
        '',
        v('messaggio')
      ].filter(function (l, i, a) { return l !== '' || (i > 0 && a[i - 1] !== ''); }).join('\n');
      window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  /* ---------------------------------------------------------
     HERO 3D
     1) Scena Spline (se configurata e il dispositivo lo consente)
     2) Altrimenti scena 3D integrata su canvas
     3) Su dispositivi lenti: immagine WebP fissa con parallasse
     --------------------------------------------------------- */
  function initHero() {
    var stage = document.querySelector('[data-hero-stage]');
    if (!stage) return;

    if (isLowPower()) { staticMode(stage); return; }

    var scene = (stage.getAttribute('data-spline-scene') || '').trim();
    if (scene) loadSpline(stage, scene, function () { startPetals(stage); });
    else startPetals(stage);
  }

  function staticMode(stage) {
    stage.classList.remove('is-3d');
    stage.classList.add('is-static');
    if (reduceMotion) return;
    var ticking = false;
    function update() {
      ticking = false;
      var r = stage.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var offset = (r.top + r.height / 2 - window.innerHeight / 2) * -0.08;
      stage.style.setProperty('--parallax', offset.toFixed(1) + 'px');
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  function loadSpline(stage, url, onFail) {
    var done = false;
    var viewer = document.createElement('spline-viewer');
    viewer.setAttribute('url', url);
    viewer.setAttribute('loading-anim-type', 'none');
    viewer.setAttribute('aria-hidden', 'true');
    function ok() { if (!done) { done = true; stage.classList.add('is-3d'); } }
    function fail() { if (!done) { done = true; viewer.remove(); onFail(); } }
    viewer.addEventListener('load-complete', ok);
    var s = document.createElement('script');
    s.type = 'module';
    s.src = SPLINE_VIEWER_URL;
    s.onerror = fail;
    document.head.appendChild(s);
    stage.insertBefore(viewer, stage.querySelector('.hero-hint'));
    setTimeout(fail, 10000); // se la scena non arriva in 10 s, si usa la scena integrata
  }

  /* --- Scena 3D integrata: peonia a petali + petali in orbita (Canvas 2D, nessuna libreria) --- */
  function startPetals(stage) {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    var ctx = canvas.getContext('2d');
    if (!ctx) { staticMode(stage); return; }
    stage.insertBefore(canvas, stage.querySelector('.hero-hint'));

    var W = 0, H = 0, S = 0;
    function resize() {
      var r = stage.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, W < 500 ? 1.5 : 2);
      W = r.width; H = r.height; S = Math.min(W, H);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);

    // Colori
    var PINK = [[226, 138, 143], [255, 236, 232]];
    var PINK_IN = [[214, 112, 122], [252, 214, 210]];
    var GREEN = [[62, 90, 65], [143, 175, 140]];

    // Geometria del fiore: anelli di petali (lunghezza e inclinazione relative)
    var petals = [];
    var rings = [
      { n: 7, len: 0.47, wid: 0.11, elev: -0.12, col: GREEN, r0: 0.02 },
      { n: 6, len: 0.36, wid: 0.19, elev: 0.18, col: PINK, r0: 0.03 },
      { n: 8, len: 0.32, wid: 0.17, elev: 0.42, col: PINK, r0: 0.03 },
      { n: 8, len: 0.27, wid: 0.15, elev: 0.68, col: PINK, r0: 0.025 },
      { n: 7, len: 0.21, wid: 0.13, elev: 0.92, col: PINK_IN, r0: 0.02 },
      { n: 6, len: 0.15, wid: 0.1, elev: 1.12, col: PINK_IN, r0: 0.015 },
      { n: 5, len: 0.09, wid: 0.07, elev: 1.3, col: PINK_IN, r0: 0.01 }
    ];
    rings.forEach(function (ring, i) {
      for (var k = 0; k < ring.n; k++) {
        var a = (k / ring.n) * Math.PI * 2 + i * 0.55;
        petals.push({ a: a, elev: ring.elev, len: ring.len * 0.82, wid: ring.wid * 0.82, col: ring.col, r0: ring.r0, z0: i * 0.012 });
      }
    });

    // Petali sciolti in orbita
    var loose = [];
    for (var i = 0; i < 26; i++) {
      loose.push({
        R: 0.3 + Math.random() * 0.17,
        tilt: (Math.random() - 0.5) * 0.9,
        phase: Math.random() * Math.PI * 2,
        speed: (0.12 + Math.random() * 0.22) * (Math.random() < 0.5 ? 1 : -1),
        h: 0.05 + Math.random() * 0.25,
        s1: Math.random() * 6, s2: Math.random() * 6,
        v1: 0.6 + Math.random() * 1.2, v2: 0.4 + Math.random(),
        len: 0.05 + Math.random() * 0.04,
        col: Math.random() < 0.8 ? PINK : GREEN
      });
    }

    // Matematica 3D minima
    function rot(p, yaw, pitch, spin) {
      var x = p[0], y = p[1], z = p[2], c, s, t;
      c = Math.cos(spin); s = Math.sin(spin); t = x * c - y * s; y = x * s + y * c; x = t;     // asse del fiore
      c = Math.cos(pitch); s = Math.sin(pitch); t = y * c - z * s; z = y * s + z * c; y = t;   // inclinazione
      c = Math.cos(yaw); s = Math.sin(yaw); t = x * c + z * s; z = -x * s + z * c; x = t;      // rotazione orizzontale
      return [x, y, z];
    }
    var F = 2.4;
    function proj(p) {
      var k = F / (F - p[2]);
      return [W / 2 + p[0] * k * S, H * 0.52 - p[1] * k * S];
    }
    function add(a, b, k) { return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]; }
    function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    var LIGHT = (function () { var l = [-0.45, 0.6, 0.66], m = Math.hypot(l[0], l[1], l[2]); return [l[0] / m, l[1] / m, l[2] / m]; })();
    function shade(c, k) { return 'rgb(' + Math.round(c[0] * k) + ',' + Math.round(c[1] * k) + ',' + Math.round(c[2] * k) + ')'; }

    // Prepara un petalo (punti già ruotati) per il disegno ordinato per profondità
    var items = [];
    function pushPetal(B, d, w, len, wid, col, view, cup) {
      var up = [0, 0, 1];
      var T = add(add(B, d, len), up, cup || 0);
      var pts = [
        B,
        add(add(B, d, len * 0.35), w, wid),
        add(add(T, d, -len * 0.05), w, wid * 0.7),
        T,
        add(add(T, d, -len * 0.05), w, -wid * 0.7),
        add(add(B, d, len * 0.35), w, -wid)
      ].map(function (p) { return rot(p, view.yaw, view.pitch, view.spin); });
      var n = rot(cross(w, d), view.yaw, view.pitch, 0);
      var nm = Math.hypot(n[0], n[1], n[2]) || 1;
      var lit = Math.abs((n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / nm);
      var back = n[2] < 0;
      items.push({ z: (pts[0][2] + pts[3][2]) / 2, pts: pts, col: col, k: 0.8 + 0.25 * lit - (back ? 0.08 : 0) });
    }
    function drawItem(it) {
      var p = it.pts.map(proj);
      var g = ctx.createLinearGradient(p[0][0], p[0][1], p[3][0], p[3][1]);
      g.addColorStop(0, shade(it.col[0], it.k));
      g.addColorStop(1, shade(it.col[1], Math.min(1.05, it.k + 0.1)));
      ctx.beginPath();
      ctx.moveTo(p[0][0], p[0][1]);
      ctx.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]);
      ctx.bezierCurveTo(p[4][0], p[4][1], p[5][0], p[5][1], p[0][0], p[0][1]);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,50,60,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Interazione: il fiore segue puntatore e dito
    var view = { yaw: 0, pitch: -0.85, spin: 0 };
    var target = { yaw: 0, pitch: -0.85 };
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      target.yaw = ((e.clientX - r.left) / r.width - 0.5) * 1.0;
      target.pitch = -0.85 + ((e.clientY - r.top) / r.height - 0.5) * 0.6;
    });
    stage.addEventListener('pointerdown', function () { stage.classList.add('is-touched'); });
    stage.addEventListener('pointerleave', function () { target.yaw = 0; target.pitch = -0.85; });

    // Ciclo di animazione con controllo prestazioni
    var running = true, inView = true, rafId = 0, last = 0, t = 0;
    var perf = { frames: 0, time: 0, checked: false };
    function frame(now) {
      rafId = 0;
      var dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
      last = now;
      t += dt;

      if (!perf.checked && t > 0.5) {               // ignora il primo mezzo secondo
        perf.frames++; perf.time += dt;
        if (perf.time > 2) {
          perf.checked = true;
          if (perf.frames / perf.time < 24) { stop(); canvas.remove(); staticMode(stage); return; }
        }
      }

      view.yaw += (target.yaw - view.yaw) * Math.min(1, dt * 4);
      view.pitch += (target.pitch - view.pitch) * Math.min(1, dt * 4);
      view.spin = t * 0.18;
      var breathe = 1 + Math.sin(t * 1.2) * 0.02;

      items.length = 0;
      petals.forEach(function (p) {
        var ce = Math.cos(p.elev * breathe), se = Math.sin(p.elev * breathe);
        var d = [Math.cos(p.a) * ce, Math.sin(p.a) * ce, se];
        var w = [-Math.sin(p.a), Math.cos(p.a), 0];
        var B = [Math.cos(p.a) * p.r0, Math.sin(p.a) * p.r0, p.z0];
        pushPetal(B, d, w, p.len, p.wid, p.col, view, p.len * 0.12);
      });
      loose.forEach(function (l) {
        var th = l.phase + t * l.speed;
        var pos = [Math.cos(th) * l.R, Math.sin(th) * l.R, l.h + Math.sin(th * 2 + l.phase) * 0.06];
        var ct = Math.cos(l.tilt), st = Math.sin(l.tilt);
        pos = [pos[0], pos[1] * ct - pos[2] * st, pos[1] * st + pos[2] * ct];
        var a1 = l.s1 + t * l.v1, a2 = l.s2 + t * l.v2;
        var d = [Math.cos(a1) * Math.cos(a2), Math.sin(a1) * Math.cos(a2), Math.sin(a2)];
        var w = cross(d, [0, 0, 1]);
        var m = Math.hypot(w[0], w[1], w[2]) || 1;
        w = [w[0] / m, w[1] / m, w[2] / m];
        pushPetal(add(pos, d, -l.len / 2), d, w, l.len, l.len * 0.45, l.col, view, 0);
      });
      items.sort(function (a, b) { return a.z - b.z; });

      ctx.clearRect(0, 0, W, H);
      items.forEach(drawItem);

      // Stami al centro
      var c = proj(rot([0, 0, 0.12], view.yaw, view.pitch, view.spin));
      ctx.fillStyle = '#f0c75e';
      for (var j = 0; j < 9; j++) {
        var aa = j * 0.7 + t * 0.3;
        ctx.beginPath();
        ctx.arc(c[0] + Math.cos(aa) * S * 0.012 * (j % 3), c[1] + Math.sin(aa) * S * 0.01 * (j % 3), S * 0.006, 0, Math.PI * 2);
        ctx.fill();
      }

      if (t > 0.05) stage.classList.add('is-3d');
      if (running && inView) rafId = requestAnimationFrame(frame);
    }
    function start() { if (!rafId && running && inView && !document.hidden) { last = 0; rafId = requestAnimationFrame(frame); } }
    function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { inView = en[0].isIntersecting; start(); }).observe(stage);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = 0; } else start();
    });
    start();
  }

  /* --------------------------------------------------------- */
  function init() {
    doc.classList.add('js');
    var y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
    initNav();
    initHero();
    initGallery();
    initHours();
    initMap();
    initForm();
    initReveal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
