/* Sonset home page. The page behaves like an instrument reading media.
   Everything is readable without this file; it only adds the frame readouts, the motion and the questionnaire. */
(function () {
  'use strict';
  var w = window, d = document, root = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var pad = function (n, len) { var s = String(n); while (s.length < len) s = '0' + s; return s; };
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var RELAY = 'https://vjzemixladuomhvwlqpp.supabase.co/functions/v1/sonset-request';
  var SUBJECT = 'New request from thesonset.com';

  var t0 = Date.now();
  var reduce = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var still = reduce || /[?&]still\b/.test(location.search);
  var gsap = w.gsap, ST = w.ScrollTrigger;
  var motion = !!(gsap && ST) && !still && root.classList.contains('js');
  w.__sonset = true;
  if (!motion) { root.classList.remove('js'); root.classList.add('still'); }
  else { gsap.registerPlugin(ST); }

  var barH = function () { return parseFloat(getComputedStyle(root).getPropertyValue('--bar')) || 48; };

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (motion && w.Lenis) {
    try {
      lenis = new w.Lenis({ lerp: 0.11 });
      w.lenis = lenis;
      lenis.on('scroll', ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } catch (e) { lenis = null; }
  }
  var locks = 0;
  function lock(on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    if (lenis) { if (locks) lenis.stop(); else lenis.start(); }
    else root.style.overflow = locks ? 'hidden' : '';
  }

  /* ---------- frame: scroll progress in digits, Toronto clock ---------- */
  var fill = $('[data-fill]'), fillX = $('[data-fill-x]'), pcts = $$('[data-pct]');
  var maxY = 1, lastPct = -1, ticking = false;
  function sizeUp() { maxY = Math.max(1, root.scrollHeight - w.innerHeight); progress(); }
  function progress() {
    ticking = false;
    var p = clamp((w.pageYOffset || root.scrollTop || 0) / maxY);
    if (fill) fill.style.clipPath = 'inset(0 ' + ((1 - p) * 100).toFixed(2) + '% 0 0)';
    if (fillX) fillX.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    var n = Math.round(p * 100);
    if (n !== lastPct) { lastPct = n; pcts.forEach(function (el) { el.textContent = pad(n, 3); }); }
  }
  w.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(progress); } }, { passive: true });
  w.addEventListener('resize', sizeUp);
  w.addEventListener('load', sizeUp);
  sizeUp();
  setInterval(function () { maxY = Math.max(1, root.scrollHeight - w.innerHeight); }, 2000);

  var clock = $('[data-clock]');
  if (clock && w.Intl) {
    try {
      var fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
      clock.innerHTML = '<i class="sq"></i><span>Toronto</span><time></time>';
      var timeEl = clock.lastChild;
      var tick = function () { timeEl.textContent = fmt.format(new Date()); };
      tick();
      setInterval(tick, 1000);
      clock.hidden = false;
    } catch (e) { /* no clock */ }
  }

  /* ---------- menu (below 900px) ---------- */
  var menuBtn = $('.bar-menu'), menu = $('#menu'), menuOpen = false;
  function openMenu() {
    if (menuOpen || !menu) return;
    menuOpen = true; menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Close');
    lock(true);
    var first = $('a', menu); if (first) first.focus();
  }
  function closeMenu(refocus) {
    if (!menuOpen) return;
    menuOpen = false; menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Menu');
    lock(false);
    if (refocus) menuBtn.focus();
  }
  if (menuBtn && menu) {
    menuBtn.hidden = false;
    menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-modal', 'true'); menu.setAttribute('aria-label', 'Menu');
    menuBtn.addEventListener('click', function () { if (menuOpen) closeMenu(true); else openMenu(); });
    d.addEventListener('keydown', function (e) {
      if (!menuOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
      if (e.key !== 'Tab') return;
      var f = [menuBtn].concat($$('a', menu)), a = d.activeElement, i = f.indexOf(a);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
    });
    if (w.matchMedia) {
      var mq = w.matchMedia('(min-width: 900px)');
      var onMq = function () { if (mq.matches) closeMenu(false); };
      if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    }
  }

  /* ---------- anchors and calls to action ---------- */
  function goTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    else {
      var y = target.getBoundingClientRect().top + (w.pageYOffset || 0) - barH() + 1;
      w.scrollTo(0, y);
    }
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  d.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if (a.hasAttribute('data-q')) { e.preventDefault(); closeMenu(false); openQ(a); return; }
    var m = /^\/?#([\w-]+)$/.exec(a.getAttribute('href') || '');
    if (!m || !/^\/(index\.html)?$/.test(location.pathname)) return;
    var target = d.getElementById(m[1]);
    if (!target) return;
    e.preventDefault();
    closeMenu(false);
    goTo(target);
    if (history.replaceState) history.replaceState(null, '', '#' + m[1]);
  });
  d.addEventListener('keydown', function (e) {
    if ((e.key === ' ' || e.key === 'Spacebar') && e.target && e.target.hasAttribute && e.target.hasAttribute('data-q')) { e.preventDefault(); closeMenu(false); openQ(e.target); }
  });

  /* ---------- where each picture runs ---------- */
  var fd = $('[data-fd]');
  if (fd) {
    var fdBtns = $$('[data-fd-b]', fd), fdRatio = $('[data-fd-r]', fd), fdCur = 'wide', fdTimer = 0;
    var setFd = function (to) {
      clearTimeout(fdTimer);
      fdCur = to;
      fdBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-fd-b') === to)); });
      if (fdRatio) fdRatio.textContent = to === 'wide' ? '21:9' : '9:16';
      if (!motion) { fd.setAttribute('data-s', to); return; }
      /* first the bad crop: the other picture forced into this shape. Then the picture framed for the place. */
      fd.setAttribute('data-s', to + 'bad');
      fdTimer = setTimeout(function () { fd.setAttribute('data-s', to); }, 1300);
    };
    fdBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var to = b.getAttribute('data-fd-b');
        if (to !== fdCur) setFd(to);
      });
    });
    if (motion) {
      fd.setAttribute('data-s', 'widebad');
      ST.create({ trigger: $('.fd-stage', fd), start: 'top 72%', once: true, onEnter: function () {
        fdTimer = setTimeout(function () { if (fdCur === 'wide') fd.setAttribute('data-s', 'wide'); }, 650);
      } });
    }
  }

  /* ---------- motion ---------- */
  function split(el) {
    var i = 0, frag = d.createDocumentFragment();
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (t) {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(d.createTextNode(' ')); return; }
          var s = d.createElement('span'); s.className = 'w'; s.textContent = t; s.style.setProperty('--i', i++); frag.appendChild(s);
        });
      } else if (n.nodeType === 1) { n.classList.add('w'); n.style.setProperty('--i', i++); frag.appendChild(n); }
    });
    el.textContent = '';
    el.appendChild(frag);
    return $$('.w', el);
  }
  function countUp(el) {
    var parts = el.textContent.split(/(\d+)/), t0 = 0, dur = 1000;
    var step = function (now) {
      if (!t0) t0 = now;
      var k = clamp((now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = parts.map(function (p) { return /^\d+$/.test(p) ? pad(Math.round(+p * e), p.length) : p; }).join('');
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  if (motion) {
    /* intro: under a second and a half, never blocking */
    var h1 = $('.hero-h');
    if (h1) split(h1);
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      root.classList.add('go');
      var hn = $('.hero [data-n]'); if (hn) setTimeout(function () { countUp(hn); }, 500);
    }); });

    /* reveals, and readouts that count to the real size of each picture */
    if ('IntersectionObserver' in w) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          io.unobserve(el);
          if (el.hasAttribute('data-n')) countUp(el); else el.classList.add('in');
        });
      }, { rootMargin: '0px 0px -7% 0px', threshold: 0.05 });
      $$('[data-r]').forEach(function (el) { io.observe(el); });
      $$('[data-n]').forEach(function (el) { if (!el.closest('.hero')) io.observe(el); });
    } else {
      $$('[data-r]').forEach(function (el) { el.classList.add('in'); });
    }

    /* statement: the sentence lights as it is read */
    var rest = $('[data-words]');
    if (rest) {
      var words = split(rest), lit = 0;
      var light = function (self) {
        var n = Math.round(clamp(self.progress) * words.length);
        if (n === lit) return;
        for (var i = Math.min(n, lit); i < Math.max(n, lit); i++) words[i].classList.toggle('lit', i < n);
        lit = n;
      };
      ST.create({ trigger: rest, start: 'top 80%', end: 'bottom 52%', onUpdate: light, onRefresh: light });
    }

    /* specification rows: the row on the reading line is lit */
    $$('[data-spec] .row').forEach(function (r) {
      ST.create({ trigger: r, start: 'top 58%', end: 'bottom 58%', toggleClass: 'on' });
    });

    /* the frame bar shows which section is being read */
    $$('.bar-nav a').forEach(function (a) {
      var sec = d.getElementById((a.getAttribute('href') || '').split('#')[1] || '');
      if (sec) ST.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', toggleClass: { targets: a, className: 'on' } });
    });

    var mm = gsap.matchMedia();

    /* hero depth */
    mm.add('(min-width: 900px)', function () {
      var img = $('.hero-ph img');
      if (img) gsap.to(img, { yPercent: 4.5, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    });

    /* the label: one photograph being read */
    var lab = $('[data-lab]');
    if (lab) {
      var labPh = $('.lab-ph', lab), scan = $('[data-lab-scan]', lab), dim = $('[data-lab-dim]', lab);
      var labRows = $$('.lab-rows li', lab), labN = $('[data-lab-n]', lab), labPct = $('[data-lab-pct]', lab);
      var H = 1, marks = [], lastN = -1, lastP = -1;
      var measure = function (held) {
        H = labPh.clientHeight || 1;
        marks = labRows.map(function (li, i) {
          if (!held) return (i + 1) / (labRows.length + 1);
          var op = li.offsetParent, y = li.offsetTop + (op ? op.offsetTop : 0) + li.offsetHeight / 2;
          return Math.min(0.985, y / H);
        });
      };
      var draw = function (s) {
        scan.style.transform = 'translate3d(0,' + (s * (H - 1)).toFixed(1) + 'px,0)';
        dim.style.clipPath = 'inset(' + (s * 100).toFixed(2) + '% 0 0 0)';
        var n = 0, i;
        for (i = 0; i < marks.length; i++) if (s >= marks[i]) n = i + 1;
        if (n !== lastN) {
          lastN = n;
          labRows.forEach(function (li, k) { li.classList.toggle('on', k < n); li.classList.toggle('cur', k === n - 1); });
          labN.textContent = pad(n, 2);
        }
        var p = Math.round(s * 100);
        if (p !== lastP) { lastP = p; labPct.textContent = pad(p, 3); }
        lab.classList.toggle('done', s >= 1);
      };
      mm.add('(min-width: 900px)', function () {
        var at = function (self) { return clamp((self.progress - 0.04) / 0.88); };
        ST.create({
          trigger: lab, start: function () { return 'top top+=' + barH(); }, end: 'bottom bottom',
          onUpdate: function (self) { draw(at(self)); },
          onRefresh: function (self) { measure(true); lastN = -1; draw(at(self)); }
        });
      });
      mm.add('(max-width: 899px)', function () {
        var tw = null, o = { s: 0 };
        measure(false); lastN = -1; draw(0);
        ST.create({ trigger: labPh, start: 'top 58%', once: true, onEnter: function () {
          measure(false);
          tw = gsap.to(o, { s: 1, duration: 3.2, ease: 'none', onUpdate: function () { draw(o.s); } });
        } });
        return function () { if (tw) tw.kill(); };
      });
    }

    var refresh = function () { ST.refresh(); sizeUp(); };
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(refresh);
    w.addEventListener('load', refresh);
  }

  /* ---------- the questionnaire ---------- */
  var q = $('#q'), openQ = function () {};
  if (q) {
    var form = $('.q-f', q), steps = $$('.q-s', q), body = $('.q-body', q);
    var goBtn = $('[data-q-go]', q), backBtn = $('[data-q-back]', q), qN = $('[data-q-n]', q), qProg = $('[data-q-prog]', q), mailA = $('[data-q-mail]', q);
    var at = 0, sending = false, opener = null, LAST = 4;
    var stepEl = function (k) { return steps.filter(function (s) { return s.getAttribute('data-step') === String(k); })[0]; };
    var field = function (n) { return form.elements[n]; };

    var show = function (k, focus) {
      at = k;
      steps.forEach(function (s) { s.hidden = s.getAttribute('data-step') !== String(k); });
      q.setAttribute('data-at', String(k));
      var sec = stepEl(k), h = $('h2', sec), num = typeof k === 'number' ? k + 1 : LAST + 1;
      q.setAttribute('aria-labelledby', h.id);
      qN.textContent = num;
      qProg.style.transform = 'scaleX(' + (num / (LAST + 1)) + ')';
      backBtn.disabled = k === 0;
      goBtn.textContent = k === LAST ? 'Send request' : 'Continue';
      goBtn.removeAttribute('aria-disabled');
      body.scrollTop = 0;
      if (focus !== false) h.focus({ preventScroll: true });
    };
    var clearErr = function (sec) {
      $$('.q-err', sec).forEach(function (e) { e.hidden = true; });
      $$('[aria-invalid]', sec).forEach(function (e) { e.removeAttribute('aria-invalid'); });
    };
    var valid = function (k) {
      var sec = stepEl(k);
      clearErr(sec);
      if (k <= 2) {
        if ($$('input:checked', sec).length) return true;
        $('.q-err', sec).hidden = false;
        $('input', sec).focus();
        return false;
      }
      if (k === LAST) {
        var bad = [];
        if (!field('Name').value.trim()) bad.push('Name');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(field('email').value.trim())) bad.push('email');
        bad.forEach(function (n) {
          field(n).setAttribute('aria-invalid', 'true');
          var e = $('.q-err[data-for="' + n + '"]', sec); if (e) e.hidden = false;
        });
        if (bad.length) { field(bad[0]).focus(); return false; }
      }
      return true;
    };
    var answers = function () {
      var pick = function (n) { var c = $('input[name="' + n + '"]:checked', form); return c ? c.value : ''; };
      return {
        Needs: $$('input[name="Needs"]:checked', form).map(function (i) { return i.value; }),
        For: pick('For'),
        Start: pick('Start'),
        Notes: field('Notes').value.trim(),
        Name: field('Name').value.trim(),
        email: field('email').value.trim(),
        Company: field('Company').value.trim(),
        _honey: '',
        /* how long the page has been open, in milliseconds: the sender turns away anything faster than a person */
        ms: Math.round(w.performance && w.performance.now ? w.performance.now() : Date.now() - t0)
      };
    };
    var mailto = function (data) {
      var shown = { Needs: data.Needs.join(', '), For: data.For, Start: data.Start, Notes: data.Notes, Name: data.Name, email: data.email, Company: data.Company };
      var lines = ['Needs', 'For', 'Start', 'Notes', 'Name', 'email', 'Company'].map(function (k) { return k + ': ' + shown[k]; });
      return 'mailto:hello@thesonset.com?subject=' + encodeURIComponent(SUBJECT) + '&body=' + encodeURIComponent(lines.join('\n'));
    };
    var finish = function (ok, data) {
      sending = false;
      if (ok) { show('sent'); return; }
      if (mailA) mailA.setAttribute('href', mailto(data));
      show('fail');
    };
    var send = function () {
      if (sending || at !== LAST) return;
      sending = true;
      goBtn.textContent = 'Sending';
      goBtn.setAttribute('aria-disabled', 'true');
      var data = answers();
      /* the trap field is empty for real people: if it is filled, nothing is sent */
      if (field('_honey').value) { finish(true, data); return; }
      try {
        w.fetch(RELAY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'omit',
          mode: 'cors'
        }).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) { finish(!!j && j.ok === true, data); })
          .catch(function () { finish(false, data); });
      } catch (e) { finish(false, data); }
    };
    var next = function () {
      if (sending || typeof at !== 'number') return;
      if (!valid(at)) return;
      if (at < LAST) show(at + 1); else send();
    };
    var back = function () {
      if (sending) return;
      if (at === 'fail') show(LAST);
      else if (typeof at === 'number' && at > 0) show(at - 1);
    };

    openQ = function (from) {
      if (q.open) return;
      opener = from || null;
      if (typeof q.showModal === 'function') q.showModal(); else q.setAttribute('open', '');
      lock(true);
      show(at);
    };
    var shut = function () { if (typeof q.close === 'function') q.close(); else { q.removeAttribute('open'); onClose(); } };
    var onClose = function () {
      lock(false);
      if (at === 'sent') { form.reset(); steps.forEach(clearErr); show(0, false); }
      var o = opener;
      if (!o || !o.getClientRects || !o.getClientRects().length) o = (menuBtn && menuBtn.getClientRects().length) ? menuBtn : ($('.hero-sub .bk') || $('#main'));
      if (o && o.focus) o.focus({ preventScroll: true });
    };
    q.addEventListener('close', onClose);
    $$('[data-q]').forEach(function (a) { a.setAttribute('role', 'button'); a.setAttribute('aria-haspopup', 'dialog'); });
    $$('[data-q-close]', q).forEach(function (b) { b.addEventListener('click', shut); });
    backBtn.addEventListener('click', back);
    form.addEventListener('submit', function (e) { e.preventDefault(); next(); });
    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing) return;
      var tag = e.target.tagName;
      if (tag === 'TEXTAREA') { if (e.metaKey || e.ctrlKey) { e.preventDefault(); next(); } return; }
      if (tag === 'BUTTON' || tag === 'A') return;
      e.preventDefault();
      next();
    });
    /* keep Tab inside the dialog: the native modal would otherwise hand focus to the browser bar */
    q.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('input, textarea, button, a[href]', q).filter(function (el) {
        return !el.disabled && el.tabIndex >= 0 && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
      });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1], a = d.activeElement;
      if (e.shiftKey && (a === first || !q.contains(a) || a === q || a.tagName === 'H2')) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (a === last || !q.contains(a) || a === q)) { e.preventDefault(); first.focus(); }
    });
    form.addEventListener('input', function (e) { var sec = e.target.closest ? e.target.closest('.q-s') : null; if (sec) clearErr(sec); });
    form.addEventListener('change', function (e) { var sec = e.target.closest ? e.target.closest('.q-s') : null; if (sec) clearErr(sec); });
  }
})();
