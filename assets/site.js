(function () {
  var q = new URLSearchParams(location.search);
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches || q.has('still');
  if (q.has('shot')) document.documentElement.classList.add('shot');
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // the page links on the home page swap the image panel on hover (works with or without motion)
  var items = document.querySelectorAll('.svc li');
  var panes = document.querySelectorAll('.svc-pane .ph');
  function setPane(i) { panes.forEach(function (p, k) { p.classList.toggle('on', k === i); }); }
  if (panes.length) setPane(0);
  items.forEach(function (li, i) { li.addEventListener('mouseenter', function () { setPane(i); }); li.querySelector('a').addEventListener('focus', function () { setPane(i); }); });

  function words(el) {
    var t = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    return t.map(function (w) {
      var s = document.createElement('span'); s.className = 'pw'; s.textContent = w;
      el.appendChild(s); el.appendChild(document.createTextNode(' '));
      return s;
    });
  }

  if (still || !hasGsap) return;

  // smooth scroll wired into ScrollTrigger
  if (window.Lenis) {
    var lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  gsap.from('.hd', { opacity: 0, y: -16, duration: 1, delay: 0.2, ease: 'power3.out' });

  // headings: letters start wide apart and tighten up
  document.querySelectorAll('[data-spaced]').forEach(function (el, i) {
    var to = getComputedStyle(el).letterSpacing;
    gsap.fromTo(el, { letterSpacing: '0.32em', opacity: 0 }, { letterSpacing: to, opacity: 1, duration: 1.7, delay: 0.25 + i * 0.1, ease: 'expo.out' });
  });
  gsap.from('.glass', { opacity: 0, y: 40, duration: 1.2, delay: 0.9, ease: 'power3.out' });
  gsap.from('.pg-lead, .ct-lead', { opacity: 0, y: 24, duration: 1.1, delay: 0.7, ease: 'power3.out' });

  // the hero photo slowly pushes in, and drifts as the page scrolls away
  var bg = document.querySelector('.hero-bg');
  if (bg) {
    gsap.fromTo(bg, { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power3.out' });
    gsap.to(bg, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-in', { opacity: 0.15, y: -50, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 20%', scrub: true } });
  }

  // lead paragraphs light up word by word as they cross the screen
  document.querySelectorAll('.pg-lead:not(.nosplit), .ct-lead').forEach(function (el) {
    var ws = words(el);
    gsap.set(ws, { opacity: 0.22 });
    gsap.to(ws, { opacity: 1, ease: 'none', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 50%', scrub: 0.4 } });
  });

  // the page links turn from grey to white one by one, and the panel follows the row in view
  items.forEach(function (li, i) {
    gsap.fromTo(li.querySelector('a'), { color: '#4b4b4b' }, { color: '#ffffff', ease: 'none', scrollTrigger: { trigger: li, start: 'top 78%', end: 'top 46%', scrub: true } });
    ScrollTrigger.create({ trigger: li, start: 'top 55%', end: 'bottom 55%', onToggle: function (s) { if (s.isActive) setPane(i); } });
  });

  // row text rises in
  document.querySelectorAll('.row').forEach(function (row) {
    gsap.from(row.children, { y: 40, opacity: 0, duration: 1, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 85%' } });
  });

  // image cards unveil, then drift a few percent
  document.querySelectorAll('.cards .ph, .pg-band').forEach(function (el) {
    gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'power3.inOut', scrollTrigger: { trigger: el, start: 'top 90%' } });
    var inn = el.querySelector('.ph-in');
    if (inn) gsap.fromTo(inn, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  document.querySelectorAll('.cards .ph').forEach(function (el, i) {
    gsap.to(el, { yPercent: [4, -10, 6][i % 3], ease: 'none', scrollTrigger: { trigger: '.cards', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

})();
