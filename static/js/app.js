(function () {
  'use strict';

  /* ---------- data ---------- */
  var gift = {};
  try { gift = JSON.parse(document.getElementById('gift-data').textContent); } catch (e) { gift = {}; }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var timers = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ---------- fill text from config ---------- */
  $$('[data-name]').forEach(function (el) { el.textContent = gift.name || 'Friend'; });
  $$('[data-date]').forEach(function (el) { el.textContent = gift.date || ''; });
  $$('[data-sender]').forEach(function (el) { el.textContent = gift.sender || 'Someone Special'; });
  var pill = $('.pill'); if (pill && !gift.date) pill.classList.add('hidden');

  // letter paragraphs
  var body = $('#letterBody');
  (gift.message || []).forEach(function (t) {
    var p = document.createElement('p'); p.textContent = t; body.appendChild(p);
  });

  // polaroids (photos from config or illustrated placeholders)
  var polBox = $('#polaroids');
  var placeholders = [
    { e: '🧸', c: 'sunny picnic' }, { e: '🌠', c: 'counting stars' },
    { e: '🍰', c: 'the great baking' }, { e: '🎡', c: 'top of the world' }
  ];
  var photos = (gift.photos && gift.photos.length) ? gift.photos : placeholders.map(function (p) { return { emoji: p.e, caption: p.c }; });
  photos.slice(0, 6).forEach(function (ph, i) {
    var d = document.createElement('div');
    d.className = 'polaroid'; d.style.setProperty('--i', i);
    var tape = document.createElement('span'); tape.className = 'tape';
    var img = document.createElement('div'); img.className = 'ph g' + (i % 6);
    if (ph.src) { img.style.backgroundImage = 'url("' + ph.src.replace(/"/g, '%22') + '")'; }
    else { img.textContent = ph.emoji || '💖'; }
    var cap = document.createElement('span'); cap.className = 'cap'; cap.textContent = ph.caption || '';
    d.appendChild(tape); d.appendChild(img); d.appendChild(cap);
    if (i === 0) {
      var pin = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      pin.setAttribute('class', 'pin'); pin.setAttribute('viewBox', '0 0 24 24');
      pin.innerHTML = '<use href="#heart"/>'; d.appendChild(pin);
    }
    polBox.appendChild(d);
  });

  // bunting flags
  (function () {
    var g = $('#flags'), cols = ['#f7d36b', '#a8dcc8', '#f2a0c0', '#c7b6ee', '#f7d36b', '#a8dcc8', '#f2a0c0', '#c7b6ee', '#f7d36b'];
    var NS = 'http://www.w3.org/2000/svg';
    for (var i = 0; i < 9; i++) {
      var x = 22 + i * 44, t = i / 8;
      var y = 6 + 4 * 6 * t * (1 - t) * 2.1; // matches the quadratic curve
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M' + (x - 16) + ' ' + y + ' L' + (x + 16) + ' ' + y + ' L' + x + ' ' + (y + 38) + ' Z');
      p.setAttribute('fill', cols[i]); p.setAttribute('opacity', '.95');
      g.appendChild(p);
      var dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', x); dot.setAttribute('cy', y + 11); dot.setAttribute('r', 2.4);
      dot.setAttribute('fill', '#fff'); dot.setAttribute('opacity', '.8'); g.appendChild(dot);
    }
  })();

  // stars in the dark room
  (function () {
    var box = $('#stars');
    for (var i = 0; i < 70; i++) {
      var s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%';
      s.style.animationDelay = (Math.random() * 3) + 's';
      s.style.opacity = (0.3 + Math.random() * 0.7).toFixed(2);
      box.appendChild(s);
    }
  })();

  // rising balloons in finale
  (function () {
    var box = $('#rise'), cols = ['#f7a58f', '#fbe0a0', '#b9a6e8', '#93d9bf', '#f48fb1'], NS = 'http://www.w3.org/2000/svg';
    for (var i = 0; i < 10; i++) {
      var s = document.createElementNS(NS, 'svg');
      s.setAttribute('viewBox', '0 0 60 100'); s.style.color = cols[i % 5];
      s.style.left = (Math.random() * 92) + '%';
      s.style.animationDuration = (9 + Math.random() * 9) + 's';
      s.style.animationDelay = (-Math.random() * 14) + 's';
      s.style.width = (30 + Math.random() * 28) + 'px';
      s.innerHTML = '<use href="#balloon" width="60" height="100"/>';
      box.appendChild(s);
    }
  })();

  /* ---------- confetti ---------- */
  var cv = $('#confetti'), ctx = cv.getContext('2d'), bits = [], rafOn = false, keepRaining = false;
  function sizeCv() { cv.width = window.innerWidth * (window.devicePixelRatio || 1); cv.height = window.innerHeight * (window.devicePixelRatio || 1); }
  sizeCv(); window.addEventListener('resize', sizeCv);
  var palette = ['#f06fa0', '#ffd24a', '#8ed1c0', '#b9a6e8', '#ff9a76', '#6bb8ff', '#fff'];
  function burst(n, x, y) {
    var dpr = window.devicePixelRatio || 1;
    x = (x == null ? cv.width / 2 : x * dpr); y = (y == null ? cv.height * 0.35 : y * dpr);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = (3 + Math.random() * 7) * dpr;
      bits.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4 * dpr, w: (5 + Math.random() * 6) * dpr, h: (3 + Math.random() * 5) * dpr,
        r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: palette[(Math.random() * palette.length) | 0], life: 0 });
    }
    startRaf();
  }
  function rain() {
    if (!keepRaining) return;
    var dpr = window.devicePixelRatio || 1;
    for (var i = 0; i < 3; i++) {
      bits.push({ x: Math.random() * cv.width, y: -10, vx: (Math.random() - .5) * 1.5 * dpr, vy: (1.5 + Math.random() * 2.5) * dpr,
        w: (5 + Math.random() * 5) * dpr, h: (3 + Math.random() * 4) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .3,
        c: palette[(Math.random() * palette.length) | 0], life: 0 });
    }
  }
  function startRaf() { if (!rafOn) { rafOn = true; requestAnimationFrame(tick); } }
  function tick() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    rain();
    var dpr = window.devicePixelRatio || 1;
    bits = bits.filter(function (b) { return b.y < cv.height + 20 && b.life < 400; });
    bits.forEach(function (b) {
      b.vy += 0.16 * dpr; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.life++;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c;
      ctx.globalAlpha = Math.max(0, 1 - b.life / 400);
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
    });
    if (bits.length || keepRaining) requestAnimationFrame(tick); else { rafOn = false; ctx.clearRect(0, 0, cv.width, cv.height); }
  }

  /* ---------- scene manager ---------- */
  var scenes = $$('.scene'), current = -1, busy = false;
  var prog = $('#progress');
  scenes.forEach(function () { prog.appendChild(document.createElement('i')); });

  function go(i) {
    if (i < 0 || i >= scenes.length) return;
    clearTimers(); keepRaining = false;
    scenes.forEach(function (s, k) { s.classList.toggle('active', k === i); });
    $$('i', prog).forEach(function (d, k) { d.classList.toggle('on', k === i); });
    current = i; busy = false;
    var enter = enters[i]; if (enter) enter();
  }
  function next() { go(current + 1); }

  /* ---------- per-scene behaviour ---------- */
  var enters = {};
  var envelope = $('#envelope'), s2 = scenes[1];

  // 1 envelope
  enters[0] = function () {
    envelope.classList.remove('open', 'peek');
    later(function () { envelope.classList.add('peek'); }, 700);
    $('#btnOpen').classList.add('pulse');
  };
  $('#btnOpen').addEventListener('click', function () {
    if (busy) return; busy = true;
    this.classList.remove('pulse');
    envelope.classList.remove('peek'); envelope.classList.add('open');
    burst(40);
    later(next, 2300);
  });

  // 2 dark room
  enters[1] = function () { s2.classList.remove('lit'); };
  $('#btnLights').addEventListener('click', function () {
    if (busy) return; busy = true;
    s2.classList.add('lit');
    later(function () { burst(60); }, 900);
    later(next, 2500);
  });

  // 3 party
  enters[2] = function () { later(function () { burst(70); }, 500); later(function () { burst(40); }, 1600); };
  $('#btnMore').addEventListener('click', function () { if (!busy) { busy = true; next(); } });

  // 4 cake (swipe down to cut)
  var cakeScene = scenes[3], zone = $('#cakeZone'), cut = false, startY = null, startX = null;
  function resetCake() {
    cut = false; cakeScene.classList.remove('cut'); zone.classList.remove('cut');
    $('#cakeKicker').textContent = 'Cake time';
    $('#cakeTitle').innerHTML = 'Make the first cut <span class="spk">✨</span>';
    $('#cakeSub').textContent = 'Swipe down across the cake, top to bottom.';
    $('#btnWish').classList.add('hidden'); $('#tapCut').classList.add('hidden');
    $('#flames').style.display = '';
  }
  function doCut() {
    if (cut) return; cut = true;
    zone.classList.add('cut');
    $('#cakeTitle').innerHTML = 'You did it! <span class="spk">🎉</span>';
    $('#cakeSub').textContent = 'The first slice is always the sweetest one.';
    $('#tapCut').classList.add('hidden');
    var b = $('#btnWish'); b.classList.remove('hidden'); b.style.animation = 'rise .7s forwards';
    var r = zone.getBoundingClientRect(); burst(60, r.left + r.width / 2, r.top + r.height / 3);
  }
  enters[3] = function () { resetCake(); later(function () { if (!cut) $('#tapCut').classList.remove('hidden'); }, 5000); };
  zone.addEventListener('pointerdown', function (e) { startY = e.clientY; startX = e.clientX; try { zone.setPointerCapture(e.pointerId); } catch (_) {} });
  zone.addEventListener('pointermove', function (e) {
    if (startY === null || cut) return;
    var dy = e.clientY - startY, dx = Math.abs(e.clientX - startX);
    if (dy > 60 && dx < dy * 1.3) doCut();
  });
  function endDrag() { startY = null; }
  zone.addEventListener('pointerup', endDrag); zone.addEventListener('pointercancel', endDrag);
  $('#tapCut').addEventListener('click', doCut);
  zone.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') doCut(); });
  zone.tabIndex = 0;
  $('#btnWish').addEventListener('click', function () { if (!busy) { busy = true; next(); } });

  // 5 close your eyes
  var wishBtn = $('#btnMade');
  enters[4] = function () {
    wishBtn.classList.add('disabled');
    scenes[4].classList.add('dark-eyes');
    later(function () { wishBtn.classList.remove('disabled'); scenes[4].classList.remove('dark-eyes'); }, 3500);
  };
  wishBtn.addEventListener('click', function () {
    if (busy || wishBtn.classList.contains('disabled')) return; busy = true; next();
  });

  // 6 wish sent -> auto advance
  enters[5] = function () { later(function () { burst(30); }, 700); later(next, 3600); };

  // 7 memories
  enters[6] = function () {};
  $('#btnLetter').addEventListener('click', function () { if (!busy) { busy = true; next(); } });

  // 8 letter (paragraphs fade in one by one)
  enters[7] = function () {
    var ps = $$('#letterBody p'); ps.forEach(function (p) { p.classList.remove('show'); });
    $('.s-letter .wrap').scrollTop = 0;
    ps.forEach(function (p, i) { later(function () { p.classList.add('show'); }, 700 + i * 650); });
  };
  $('#btnLast').addEventListener('click', function () { if (!busy) { busy = true; next(); } });

  // 9 finale
  enters[8] = function () {
    burst(120);
    later(function () { keepRaining = true; startRaf(); }, 900);
  };
  $('#btnReplay').addEventListener('click', function () { go(0); });

  /* ---------- music ---------- */
  var bgm = $('#bgm'), sb = $('#soundBtn'), playing = false;
  function setSound(on) {
    if (!bgm.getAttribute('src')) return;
    if (on) { var pr = bgm.play(); if (pr && pr.then) pr.then(function () { playing = true; sb.textContent = '🔊'; }).catch(function () {}); }
    else { bgm.pause(); playing = false; sb.textContent = '🔇'; }
  }
  sb.addEventListener('click', function () { setSound(!playing); });
  document.addEventListener('pointerdown', function first() {   // start music on first tap (browser autoplay rules)
    document.removeEventListener('pointerdown', first); if (bgm.getAttribute('src')) setSound(true);
  });

  /* ---------- keyboard + start ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { var b = $('.scene.active .btn:not(.disabled):not(.dim)'); if (b) b.click(); }
  });
  var startAt = parseInt(new URLSearchParams(location.search).get('scene'), 10);   // handy for testing: ?scene=6
  go(isNaN(startAt) ? 0 : Math.max(0, Math.min(scenes.length - 1, startAt)));
})();
