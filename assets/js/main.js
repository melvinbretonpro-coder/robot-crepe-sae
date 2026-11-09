/* Robot CRÊPE · animations (GSAP 3.12.5 + ScrollTrigger + Lenis 1.1.13, globales) */

const doc = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mq = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false });
const reduced = mq('(prefers-reduced-motion: reduce)').matches;
const finePointer = mq('(pointer: fine)').matches;
const safe = (name, fn) => {
  try { return fn(); } catch (e) { console.warn('[main] ' + name + ' : ' + (e && e.message)); }
};

doc.classList.remove('no-js');
doc.classList.add('js');
if (reduced) doc.classList.add('reduce-motion');
try { history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
window.scrollTo(0, 0);

const hasLibs = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
if (!hasLibs) {
  const l = $('.loader');
  if (l) l.style.display = 'none';
  doc.classList.add('no-webgl');
} else {
  boot();
}

function boot() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.ticker.lagSmoothing(0);

  /* ---------- état partagé ---------- */
  let lenis = null;
  let robot = null;
  let robotVisible = true;
  let PHASES = {
    intro: [0, 0.1], explode: [0.1, 0.24], axe1: [0.24, 0.41], axe2: [0.41, 0.58],
    axe3: [0.58, 0.75], axe4: [0.75, 0.92], assemble: [0.92, 1],
  };
  let lockCount = 0;
  const fr = (dec) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const ease = { out: 'expo.out', inout: 'expo.inOut' };

  /* ---------- styles injectés (Lenis + lightbox) ---------- */
  safe('styles', () => {
    const st = document.createElement('style');
    st.textContent = `
html.lenis,html.lenis body{height:auto}
.lenis.lenis-smooth{scroll-behavior:auto!important}
.lenis.lenis-stopped{overflow:hidden}
.lenis.lenis-smooth iframe{pointer-events:none}
.lb{position:fixed;inset:0;z-index:9000;display:none;align-items:center;justify-content:center;background:rgba(8,8,9,.985);color:#EDEAE4;font-family:'Inter Tight',system-ui,sans-serif}
.lb.is-open{display:flex}
.lb__fig{margin:0;max-width:min(92vw,1400px);max-height:86vh;display:flex;flex-direction:column;align-items:center;gap:14px}
.lb__img{max-width:100%;max-height:78vh;object-fit:contain;display:block}
.lb__cap{font:12px/1.4 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:#8C8A85;text-align:center}
.lb__btn{position:absolute;display:grid;place-items:center;width:48px;height:48px;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:rgba(20,20,22,.7);color:inherit;font:20px/1 'Inter Tight',sans-serif;cursor:pointer}
.lb__btn:hover,.lb__btn:focus-visible{border-color:#E3A857;color:#E3A857;outline:none}
.lb__close{top:20px;right:20px}.lb__prev{left:20px;top:50%;margin-top:-24px}.lb__next{right:20px;top:50%;margin-top:-24px}
.lb__count{position:absolute;top:30px;left:24px;font:12px 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.1em;color:#8C8A85}
@media (max-width:600px){.lb__prev{left:8px;top:auto;bottom:20px;margin:0}.lb__next{right:8px;top:auto;bottom:20px;margin:0}}`;
    document.head.appendChild(st);
  });

  /* ---------- verrou de défilement ---------- */
  function lockScroll(on) {
    lockCount = Math.max(0, lockCount + (on ? 1 : -1));
    const locked = lockCount > 0;
    doc.style.overflow = locked ? 'hidden' : '';
    if (lenis) { locked ? lenis.stop() : lenis.start(); }
  }

  /* ---------- Lenis ---------- */
  safe('lenis', () => {
    if (reduced || typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    window.__lenis = lenis;
  });
  lockScroll(true);

  /* ---------- découpe de texte (sans plugin payant) ---------- */
  function splitText(el, mode) {
    if (el.__split) return el.__split;
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const words = [];
    const chars = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.nodeValue.split(/([ \t\n\r\f]+)/).forEach((part) => {
            if (!part) return;
            if (/^[ \t\n\r\f]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const mask = document.createElement('span');
            mask.className = 'split-mask';
            mask.setAttribute('aria-hidden', 'true');
            mask.style.cssText = 'display:inline-block;white-space:nowrap;vertical-align:top;clip-path:inset(-0.35em -0.2em -0.12em -0.2em)';
            if (mode === 'chars') {
              Array.from(part).forEach((ch) => {
                const s = document.createElement('span');
                s.className = 'split-char';
                s.style.display = 'inline-block';
                s.textContent = ch;
                mask.appendChild(s);
                chars.push(s);
              });
              words.push(mask);
            } else {
              const s = document.createElement('span');
              s.className = 'split-word';
              s.style.display = 'inline-block';
              s.textContent = part;
              mask.appendChild(s);
              words.push(s);
            }
            frag.appendChild(mask);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    el.setAttribute('aria-label', label);
    walk(el);
    const masks = $$('.split-mask', el);
    el.__split = { words, chars, masks, targets: mode === 'chars' ? chars : words };
    return el.__split;
  }
  const unmask = (s) => s.masks.forEach((m) => { m.style.clipPath = ''; });

  /* ---------- 3D ---------- */
  const stage = $('.robot-stage');
  const robotPromise = (async () => {
    try {
      const mod = await import('./robot.js');
      if (mod.PHASES) PHASES = mod.PHASES;
      const canvas = document.getElementById('robot-canvas');
      if (!canvas || typeof mod.createRobot !== 'function') throw new Error('canvas ou createRobot absent');
      const r = mod.createRobot(canvas);
      robot = r;
      if (r && r.ready && typeof r.ready.catch === 'function') {
        r.ready.catch(() => { doc.classList.add('no-webgl'); robot = null; });
      }
      return r;
    } catch (e) {
      console.warn('[main] 3D indisponible : ' + (e && e.message));
      doc.classList.add('no-webgl');
      robot = null;
      return null;
    }
  })();
  const rb = (fn, ...a) => { if (robot && typeof robot[fn] === 'function') { try { robot[fn](...a); } catch (e) { /* ignore */ } } };

  function setStage(o) {
    if (!stage) return;
    stage.style.opacity = String(o);
    stage.style.visibility = o < 0.01 ? 'hidden' : '';
    const vis = o > 0.01;
    if (vis !== robotVisible) { robotVisible = vis; rb('setVisible', vis); }
  }

  /* ---------- loader ---------- */
  const loader = $('.loader');
  const loaderCount = $('.loader__count');
  const loaderWord = $('.loader__word');
  const loaderLetters = loaderWord ? $$('span', loaderWord) : [];

  function startLoader() {
    return new Promise((resolve) => {
      if (!loader) { resolve(); return; }
      const t0 = performance.now();
      let done = 0;
      const tasks = [];
      const track = (p) => { tasks.push(p); p.then(() => { done++; }, () => { done++; }); };
      track((document.fonts && document.fonts.ready) || Promise.resolve());
      $$('#hero img').forEach((img) => {
        track(img.complete ? Promise.resolve() : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }));
      });
      track(robotPromise.then((r) => (r && r.ready ? r.ready : null)));

      if (loaderLetters.length && !reduced) {
        loaderWord.style.clipPath = 'inset(-20% -5% -2% -5%)';
        gsap.fromTo(loaderLetters, { yPercent: 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.07, delay: 0.1 });
      }
      let shown = 0;
      const tick = () => {
        const el = performance.now() - t0;
        const real = tasks.length ? done / tasks.length : 1;
        const forced = el > 4000;
        const target = forced ? 1 : Math.min(real, clamp(el / 1200));
        shown += (target - shown) * 0.14;
        if (target >= 1 && shown > 0.995) shown = 1;
        if (loaderCount) loaderCount.textContent = String(Math.round(shown * 100)).padStart(3, '0');
        if (shown >= 1) { gsap.ticker.remove(tick); resolve(); }
      };
      gsap.ticker.add(tick);
    });
  }

  function exitLoader() {
    return new Promise((resolve) => {
      if (!loader) { resolve(); return; }
      const finish = () => { loader.style.display = 'none'; resolve(); };
      if (reduced) { finish(); return; }
      const tl = gsap.timeline({ onComplete: finish });
      if (loaderCount) tl.to(loaderCount, { opacity: 0, y: -20, duration: 0.4, ease: 'power2.in' }, 0);
      if (loaderLetters.length) tl.to(loaderLetters, { yPercent: -115, opacity: 0, duration: 0.5, ease: 'power3.in', stagger: 0.04 }, 0.1);
      tl.to(loader, { yPercent: -100, duration: 1, ease: ease.inout }, 0.45);
      tl.call(resolve, null, 0.95);
    });
  }

  /* ---------- hero ---------- */
  const hero = $('#hero');
  let heroIntro = null;
  safe('hero-prepare', () => {
    if (!hero || reduced) return;
    const title = $('.hero__title', hero);
    const items = { title: null, meta: $$('.hero__meta, .hero__meta > *', hero), scroll: $('.hero__scroll', hero) };
    if (title) {
      const s = splitText(title, 'chars');
      gsap.set(s.targets, { yPercent: 120 });
      items.title = s;
    }
    const extras = $$('[data-reveal], [data-split]', hero).filter((e) => !e.closest('.hero__title'));
    extras.forEach((e) => {
      const m = e.getAttribute('data-split');
      if (m) { const s = splitText(e, m); gsap.set(s.targets, { yPercent: 120 }); e.__heroSplit = s; }
      else if (!e.closest('.hero__meta')) gsap.set(e, { opacity: 0, y: 30 });
    });
    const metaTop = $('.hero__meta', hero);
    if (metaTop) gsap.set(metaTop.children.length ? metaTop.children : metaTop, { opacity: 0, y: 24 });
    if (items.scroll) gsap.set(items.scroll, { opacity: 0 });
    const nav = $('.nav');
    if (nav) gsap.set(nav, { yPercent: -110 });
    gsap.set('#robot-canvas, .robot-fallback', { opacity: 0 });
    heroIntro = { items, extras, metaTop, nav };
  });

  function playHeroIntro() {
    return new Promise((resolve) => {
      if (reduced || !heroIntro) { resolve(); return; }
      const { items, extras, metaTop, nav } = heroIntro;
      const tl = gsap.timeline({ onComplete: resolve });
      if (items.title) {
        tl.to(items.title.targets, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.045, onComplete: () => unmask(items.title) }, 0);
      }
      extras.forEach((e, i) => {
        if (e.__heroSplit) tl.to(e.__heroSplit.targets, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.04, onComplete: () => unmask(e.__heroSplit) }, 0.3 + i * 0.1);
        else tl.to(e, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.4 + i * 0.1);
      });
      if (metaTop) tl.to(metaTop.children.length ? metaTop.children : metaTop, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1, clearProps: 'transform' }, 0.5);
      if (items.scroll) tl.to(items.scroll, { opacity: 1, duration: 1 }, 1.1);
      if (nav) tl.to(nav, { yPercent: 0, duration: 1, ease: 'power3.out', clearProps: 'transform' }, 0.7);
      tl.to('#robot-canvas, .robot-fallback', { opacity: 1, duration: 1.6, ease: 'power2.out' }, 0.2);
    });
  }

  /* ---------- sections sombres / claires ---------- */
  safe('themes', () => {
    const sections = $$('section[data-theme]');
    if (!sections.length) return;
    const cs = getComputedStyle(doc);
    const ink = cs.getPropertyValue('--ink').trim() || '#0B0B0C';
    const paper = cs.getPropertyValue('--paper').trim() || '#F3EEE6';
    const col = (t) => (t === 'light' ? paper : ink);
    document.body.style.backgroundColor = col(sections[0].dataset.theme);
    doc.dataset.theme = sections[0].dataset.theme;
    const trans = [];
    sections.forEach((sec, i) => {
      const theme = sec.dataset.theme;
      ScrollTrigger.create({
        trigger: sec, start: 'top 60%', end: 'bottom 60%',
        onToggle: (self) => { if (self.isActive) doc.dataset.theme = theme; },
      });
      if (i === 0) return;
      const prev = sections[i - 1].dataset.theme;
      if (prev === theme) return;
      trans.push({ st: ScrollTrigger.create({ trigger: sec, start: reduced ? 'top 50%' : 'top 85%', end: reduced ? 'top 49%' : 'top 40%' }), from: col(prev), to: col(theme) });
    });
    let lastBg = '';
    const paint = () => {
      const y = window.scrollY;
      let c = col(sections[0].dataset.theme);
      for (let k = 0; k < trans.length; k++) {
        const { st, from, to } = trans[k];
        if (y >= st.end) c = to;
        else { c = y > st.start ? gsap.utils.interpolate(from, to, (y - st.start) / (st.end - st.start)) : from; break; }
      }
      if (c !== lastBg) { lastBg = c; document.body.style.backgroundColor = c; }
    };
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: paint, onRefresh: paint });
    paint();
  });

  /* ---------- navigation ---------- */
  safe('nav', () => {
    const nav = $('.nav');
    const prog = $('.nav__progress');
    let hidden = false;
    let setProg = null;
    if (prog) { gsap.set(prog, { transformOrigin: '0% 50%', scaleX: 0 }); setProg = gsap.quickSetter(prog, 'scaleX'); }
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        if (setProg) setProg(self.progress);
        if (!nav || reduced) return;
        const y = self.scroll();
        const shouldHide = self.direction === 1 && y > 160;
        const shouldShow = self.direction === -1 || y <= 160;
        if (shouldHide && !hidden) { hidden = true; gsap.to(nav, { yPercent: -110, duration: 0.5, ease: 'power3.out', overwrite: 'auto' }); }
        else if (shouldShow && hidden) { hidden = false; gsap.to(nav, { yPercent: 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' }); }
      },
    });
  });

  /* ---------- hero : progression 3D et fondus ---------- */
  safe('hero-scroll', () => {
    if (!hero) return;
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top',
      onUpdate: (self) => rb('setHero', self.progress),
    });
    if (reduced) return;
    const fade = $$('.hero__title, .hero__meta', hero);
    if (fade.length) {
      gsap.to(fade, {
        yPercent: -12, opacity: 0.1, ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: hero, start: 'top top', end: '70% top', scrub: true },
      });
    }
    const sc = $('.hero__scroll', hero);
    if (sc) gsap.to(sc, { opacity: 0, ease: 'none', immediateRender: false, scrollTrigger: { trigger: hero, start: 'top top', end: '+=200', scrub: true } });
  });

  /* ---------- décomposition ---------- */
  const section = $('#decomposition');
  const pin = section ? $('.explode__pin', section) || section : null;
  let explodeST = null;

  safe('explode', () => {
    if (!section) return;
    const intro = $('.explode__intro', section);
    const railFill = $('.explode__rail-fill', section);
    const ticks = $$('.explode__tick', section);
    const callouts = $$('.callout[data-axis]', section);
    const svg = $('svg.explode__leader', section);
    const path = svg ? $('path.explode__leader-path', svg) : null;

    /* mode réduit : tout visible, 3D en pose éclatée */
    if (reduced) {
      if (svg) svg.style.display = 'none';
      ScrollTrigger.create({
        trigger: section, start: 'top 70%', end: 'bottom 30%',
        onToggle: (self) => rb('setProgress', self.isActive ? PHASES.explode[1] : 0),
      });
      return;
    }

    /* timelines des cartes */
    const cards = {};
    callouts.forEach((card) => {
      const n = Number(card.dataset.axis);
      const heading = $('h1, h2, h3, h4', card);
      let split = null;
      if (heading) split = splitText(heading, 'words');
      const blocks = Array.from(card.children).filter((c) => c !== heading && c.tagName !== 'DL' && !c.contains(heading));
      const dl = $('dl', card);
      const rows = dl ? (dl.querySelector(':scope > div') ? $$(':scope > div', dl) : Array.from(dl.children)) : [];
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
      tl.fromTo(card, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06, ease: 'none' }, 0);
      if (split) tl.fromTo(split.targets, { yPercent: 120 }, { yPercent: 0, duration: 0.16, stagger: 0.02 }, 0.01);
      if (blocks.length) tl.fromTo(blocks, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.14, stagger: 0.02 }, 0.03);
      if (rows.length) tl.fromTo(rows, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.12, stagger: 0.035 }, 0.1);
      tl.to(card, { autoAlpha: 0, duration: 0.1, ease: 'none' }, 0.9);
      if (blocks.length) tl.to(blocks, { y: -18, duration: 0.12, ease: 'power2.in' }, 0.88);
      if (rows.length) tl.to(rows, { y: -14, duration: 0.1, ease: 'power2.in' }, 0.89);
      tl.to({}, { duration: 0.0001 }, 1);
      tl.progress(0);
      cards[n] = { card, tl, last: -1, rect: null };
    });
    if (intro) gsap.set(intro, { autoAlpha: 0 });
    if (railFill) gsap.set(railFill, { transformOrigin: '50% 0%', scaleY: 0 });

    /* filet */
    let dot = null;
    let stroke = '#E3A857';
    let leaderOn = false;
    if (svg && path) {
      path.setAttribute('pathLength', '1');
      path.style.strokeDasharray = '1 1';
      path.style.strokeDashoffset = '1';
      const c = getComputedStyle(path).stroke;
      if (c && c !== 'none') stroke = c;
      dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '5');
      dot.setAttribute('fill', 'none');
      dot.setAttribute('stroke', stroke);
      dot.setAttribute('stroke-width', '1.5');
      dot.setAttribute('class', 'explode__leader-dot');
      dot.style.opacity = '0';
      svg.appendChild(dot);
      svg.style.opacity = '0';
    }
    const measure = () => {
      if (!pin) return;
      const pr = pin.getBoundingClientRect();
      callouts.forEach((card) => {
        const o = cards[Number(card.dataset.axis)];
        if (!o) return;
        const r = card.getBoundingClientRect();
        o.rect = { l: r.left - pr.left, r: r.right - pr.left, t: r.top - pr.top, b: r.bottom - pr.top };
      });
      if (svg) {
        leaderOn = getComputedStyle(svg).display !== 'none';
        svg.setAttribute('viewBox', '0 0 ' + Math.round(pr.width) + ' ' + Math.round(pr.height));
        svg.setAttribute('preserveAspectRatio', 'none');
      }
    };
    ScrollTrigger.addEventListener('refresh', measure);

    const leader = { axis: 0, t: 0, d: '' };
    const rad = 12;
    const buildPath = (S, E, dir) => {
      const mx = S.x + (E.x - S.x) * 0.5;
      const dy = E.y - S.y;
      if (Math.abs(dy) < 2) return 'M' + S.x + ' ' + S.y + ' L' + E.x + ' ' + E.y;
      const sy = dy > 0 ? 1 : -1;
      const sx = E.x >= S.x ? 1 : -1;
      const r = Math.min(rad, Math.abs(dy) / 2, Math.abs(mx - S.x), Math.abs(E.x - mx));
      return 'M' + S.x + ' ' + S.y + ' H' + (mx - sx * r) + ' Q' + mx + ' ' + S.y + ' ' + mx + ' ' + (S.y + sy * r) +
        ' V' + (E.y - sy * r) + ' Q' + mx + ' ' + E.y + ' ' + (mx + sx * r) + ' ' + E.y + ' H' + E.x;
    };
    const updateLeader = () => {
      if (!svg || !path || !dot) return;
      const o = cards[leader.axis];
      if (!leaderOn || !leader.axis || !o || !o.rect || !robot || typeof robot.getAnchor !== 'function') { svg.style.opacity = '0'; return; }
      let a = null;
      try { a = robot.getAnchor(leader.axis); } catch (e) { a = null; }
      if (!a || !a.visible) { svg.style.opacity = '0'; return; }
      const R = o.rect;
      const midY = (R.t + R.b) / 2;
      const fromRight = a.x > (R.l + R.r) / 2;
      const S = { x: fromRight ? R.r : R.l, y: midY };
      const d = buildPath(S, { x: a.x, y: a.y });
      if (d !== leader.d) { leader.d = d; path.setAttribute('d', d); dot.setAttribute('cx', a.x); dot.setAttribute('cy', a.y); }
      const t = leader.t;
      const dIn = clamp((t - 0.05) / 0.22);
      const dOut = clamp((t - 0.88) / 0.12);
      path.style.strokeDashoffset = String(dOut > 0 ? -dOut : 1 - dIn);
      dot.style.opacity = String(clamp((dIn - 0.7) / 0.3) * (1 - dOut));
      svg.style.opacity = '1';
    };
    gsap.ticker.add(() => { if (leader.axis) updateLeader(); });

    /* ticks cliquables */
    ticks.forEach((tk) => {
      gsap.set(tk, { opacity: 0.35 });
      tk.addEventListener('click', (e) => {
        const n = Number(tk.dataset.axis);
        const ph = PHASES['axe' + n];
        if (!ph || !explodeST) return;
        e.preventDefault();
        const y = explodeST.start + (explodeST.end - explodeST.start) * ((ph[0] + ph[1]) / 2);
        if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else window.scrollTo(0, y);
      });
    });

    const state = { p: 0 };
    let activeAxis = 0;
    const fadeWin = (p, a, b, c, d) => clamp((p - a) / (b - a)) * (1 - clamp((p - c) / (d - c)));

    const apply = () => {
      const p = state.p;
      rb('setProgress', p);
      if (railFill) railFill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
      if (intro) {
        const e = PHASES.explode;
        const o = fadeWin(p, PHASES.intro[1] - 0.05, PHASES.intro[1], e[1] - 0.05, e[1]);
        intro.style.opacity = o.toFixed(3);
        intro.style.visibility = o < 0.005 ? 'hidden' : 'visible';
      }
      let cur = 0;
      for (let n = 1; n <= 4; n++) {
        const ph = PHASES['axe' + n];
        const o = cards[n];
        if (!ph || !o) continue;
        const t = clamp((p - ph[0]) / (ph[1] - ph[0]));
        const inside = p >= ph[0] && p < ph[1];
        if (inside) { cur = n; leader.t = t; }
        const val = p < ph[0] ? 0 : p >= ph[1] ? 1 : t;
        if (val !== o.last) { o.last = val; o.tl.progress(val); }
      }
      if (cur !== activeAxis) {
        activeAxis = cur;
        ticks.forEach((tk) => {
          const on = Number(tk.dataset.axis) === cur;
          tk.classList.toggle('is-active', on);
          gsap.to(tk, { opacity: on ? 1 : 0.35, duration: 0.4, overwrite: 'auto' });
        });
        leader.axis = cur;
        leader.d = '';
        if (!cur && svg) svg.style.opacity = '0';
      }
    };

    const tween = gsap.to(state, {
      p: 1, ease: 'none', onUpdate: apply,
      scrollTrigger: {
        trigger: section, start: 'top top', end: '+=700%', scrub: 0.6,
        pin: pin, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 10,
      },
    });
    explodeST = tween.scrollTrigger;
    apply();
  });

  /* fondu du robot après la décomposition */
  safe('stage', () => {
    if (!section || !stage) return;
    ScrollTrigger.create({
      trigger: section, start: 'bottom bottom', end: 'bottom 35%',
      onUpdate: (self) => setStage(1 - gsap.parseEase('power2.inOut')(self.progress)),
    });
  });

  /* ---------- split / reveal / parallax / compteurs ---------- */
  const skipGeneric = (el) => el.closest('#hero') || el.closest('.explode__pin') || el.closest('.callout');
  const trackRevealSkip = (el) => el.closest('.process__track') && mq('(min-width: 900px)').matches && !reduced;

  safe('split', () => {
    if (reduced) return;
    $$('[data-split]').forEach((el) => {
      if (skipGeneric(el)) return;
      const mode = el.getAttribute('data-split') === 'chars' ? 'chars' : 'words';
      const s = splitText(el, mode);
      gsap.from(s.targets, {
        yPercent: 120, duration: 1.1, ease: 'expo.out', stagger: mode === 'chars' ? 0.025 : 0.05,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onComplete: () => unmask(s),
      });
    });
  });

  safe('reveal', () => {
    if (reduced) return;
    $$('[data-reveal]').forEach((el) => {
      if (skipGeneric(el) || trackRevealSkip(el)) return;
      const stag = el.getAttribute('data-reveal') === 'stagger';
      const targets = stag && el.children.length ? Array.from(el.children) : el;
      const delay = parseFloat(el.dataset.delay || '0') || 0;
      gsap.from(targets, {
        y: 40, autoAlpha: 0, duration: 1, delay, ease: 'power3.out', stagger: stag ? 0.1 : 0,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onStart: () => { gsap.set(targets, { willChange: 'transform, opacity' }); },
        onComplete: () => { gsap.set(targets, { clearProps: 'opacity,visibility,transform,willChange' }); },
      });
    });
  });

  safe('parallax', () => {
    if (reduced) return;
    $$('[data-parallax]').forEach((el) => {
      const speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      gsap.fromTo(el, { y: () => -speed * (window.innerHeight + el.offsetHeight) / 2 }, {
        y: () => speed * (window.innerHeight + el.offsetHeight) / 2, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      });
    });
  });

  safe('count', () => {
    $$('[data-count]').forEach((el) => {
      const target = parseFloat(String(el.dataset.count).replace(',', '.'));
      if (!isFinite(target)) return;
      const dec = parseInt(el.dataset.decimals || '0', 10) || 0;
      const suf = el.dataset.suffix || '';
      const pre = el.dataset.prefix || '';
      const f = fr(dec);
      const write = (v) => { el.textContent = pre + f.format(v) + suf; };
      if (reduced) { write(target); return; }
      const o = { v: 0 };
      write(0);
      gsap.to(o, {
        v: target, duration: 2, ease: 'power3.out', onUpdate: () => write(o.v),
        onComplete: () => write(target),
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
  });

  /* ---------- marquee ---------- */
  safe('marquee', () => {
    if (reduced) return;
    let vel = 0;
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { vel = self.getVelocity(); } });
    $$('.marquee').forEach((m) => {
      const track = $('.marquee__track', m);
      if (!track) return;
      const speed = parseFloat(m.dataset.speed || '1.6') || 1.6;
      const set = gsap.quickSetter(track, 'xPercent');
      let pos = 0;
      let ts = 1;
      let active = true;
      ScrollTrigger.create({ trigger: m, start: 'top bottom', end: 'bottom top', onToggle: (s) => { active = s.isActive; } });
      gsap.ticker.add((time, dt) => {
        if (!active) return;
        const target = 1 + clamp(vel / 500, -4, 8);
        ts += (target - ts) * 0.07;
        pos -= speed * (dt / 1000) * ts;
        pos = ((pos % 50) + 50) % 50 - 50;
        set(pos);
      });
    });
  });

  /* ---------- fabrication : défilement horizontal ---------- */
  safe('process', () => {
    const sec = $('section.process');
    const track = sec ? $('.process__track', sec) : null;
    if (!sec || !track) return;
    if (reduced) { track.style.flexWrap = 'wrap'; track.style.width = 'auto'; return; }
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      $$('[data-reveal]', track).forEach((e) => gsap.set(e, { clearProps: 'opacity,visibility,transform' }));
      const dist = () => Math.max(0, track.scrollWidth - doc.clientWidth);
      if (dist() <= 0) return undefined;
      gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6,
          anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 9,
        },
      });
      return () => { gsap.set(track, { clearProps: 'transform' }); };
    });
  });

  /* ---------- comparateur avant / après ---------- */
  safe('compare', () => {
    $$('.compare').forEach((cmp) => {
      const range = $('.compare__range', cmp);
      let touched = false;
      const setPos = (v) => {
        v = clamp(v, 0, 100);
        cmp.style.setProperty('--pos', v + '%');
        cmp.style.setProperty('--pos-n', String(v));
        if (range) { range.value = String(v); range.setAttribute('aria-valuetext', Math.round(v) + ' %'); }
      };
      if (range) {
        if (!range.getAttribute('aria-label')) range.setAttribute('aria-label', 'Comparer la vue CAO et le robot réel');
        range.addEventListener('input', () => { touched = true; setPos(parseFloat(range.value)); });
      }
      const start = range ? parseFloat(range.value) || 50 : 50;
      setPos(start);
      let drag = false;
      const fromEvent = (e) => { const r = cmp.getBoundingClientRect(); setPos(((e.clientX - r.left) / r.width) * 100); };
      cmp.addEventListener('pointerdown', (e) => {
        if (e.target === range) return;
        drag = true; touched = true;
        try { cmp.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        fromEvent(e);
      });
      cmp.addEventListener('pointermove', (e) => { if (drag) fromEvent(e); });
      const end = () => { drag = false; };
      cmp.addEventListener('pointerup', end);
      cmp.addEventListener('pointercancel', end);
      if (!reduced) {
        const o = { v: 100 };
        setPos(100);
        ScrollTrigger.create({
          trigger: cmp, start: 'top 70%', once: true,
          onEnter: () => {
            if (touched) return;
            gsap.to(o, { v: start, duration: 1.8, ease: 'power3.inOut', onUpdate: () => { if (!touched) setPos(o.v); } });
          },
        });
      }
    });
  });

  /* ---------- film ---------- */
  safe('film', () => {
    $$('.film').forEach((film) => {
      const video = $('.film__video', film);
      if (!video) return;
      const btn = $('.film__play', film);
      const bar = $('.film__bar', film);
      const fill = $('.film__bar-fill', film);
      const time = $('.film__time', film);
      const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
      const paint = () => {
        const d = video.duration;
        const p = d ? video.currentTime / d : 0;
        if (fill) { fill.style.transformOrigin = '0 50%'; fill.style.transform = 'scaleX(' + clamp(p).toFixed(4) + ')'; }
        if (time) time.textContent = fmt(video.currentTime) + (d && isFinite(d) ? ' / ' + fmt(d) : '');
        if (bar) bar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
      };
      const sync = () => {
        const playing = !video.paused && !video.ended;
        film.classList.toggle('is-playing', playing);
        if (btn) { btn.setAttribute('aria-pressed', String(playing)); btn.setAttribute('data-cursor', playing ? 'Pause' : 'Lecture'); btn.setAttribute('aria-label', playing ? 'Mettre la vidéo en pause' : 'Lire la vidéo'); }
      };
      const toggle = () => {
        if (video.paused || video.ended) { const pr = video.play(); if (pr && pr.catch) pr.catch(() => {}); } else video.pause();
      };
      if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
      video.addEventListener('click', toggle);
      ['play', 'pause', 'ended'].forEach((ev) => video.addEventListener(ev, sync));
      ['timeupdate', 'loadedmetadata', 'durationchange', 'seeked'].forEach((ev) => video.addEventListener(ev, paint));
      if (bar) {
        bar.setAttribute('role', 'slider');
        bar.setAttribute('aria-label', 'Position dans la vidéo');
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', '100');
        if (!bar.hasAttribute('tabindex')) bar.setAttribute('tabindex', '0');
        let drag = false;
        const seek = (e) => {
          if (!video.duration || !isFinite(video.duration)) return;
          const r = bar.getBoundingClientRect();
          video.currentTime = clamp((e.clientX - r.left) / r.width) * video.duration;
          paint();
        };
        bar.addEventListener('pointerdown', (e) => { drag = true; try { bar.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } seek(e); });
        bar.addEventListener('pointermove', (e) => { if (drag) seek(e); });
        bar.addEventListener('pointerup', () => { drag = false; });
        bar.addEventListener('pointercancel', () => { drag = false; });
        bar.addEventListener('keydown', (e) => {
          if (!video.duration) return;
          if (e.key === 'ArrowRight') { video.currentTime = Math.min(video.duration, video.currentTime + 5); e.preventDefault(); }
          if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 5); e.preventDefault(); }
        });
      }
      ScrollTrigger.create({ trigger: film, start: 'top bottom', end: 'bottom top', onToggle: (s) => { if (!s.isActive && !video.paused) video.pause(); } });
      sync();
    });
  });

  /* ---------- budget ---------- */
  safe('budget', () => {
    const qty = $('#cost-qty');
    if (!qty) return;
    const outQty = $('#cost-qty-value');
    const outRd = $('#cost-rd');
    const outUnit = $('#cost-unit');
    const outTotal = $('#cost-total');
    const f0 = fr(0);
    const eur = (v) => f0.format(Math.round(v)) + ' €';
    const shown = { rd: 0, unit: 0, total: 0, init: false };
    const render = () => {
      if (outRd) outRd.textContent = eur(shown.rd);
      if (outUnit) outUnit.textContent = eur(shown.unit);
      if (outTotal) outTotal.textContent = eur(shown.total);
    };
    const update = () => {
      const q = Math.max(1, parseInt(qty.value, 10) || 1);
      const rd = 2000 / q;
      const unit = 200 + 415 + rd;
      const total = unit * q;
      if (outQty) outQty.textContent = String(q);
      const min = parseFloat(qty.min) || 1;
      const max = parseFloat(qty.max) || 50;
      qty.style.setProperty('--fill', ((q - min) / (max - min)) * 100 + '%');
      qty.setAttribute('aria-valuetext', q + (q > 1 ? ' unités' : ' unité'));
      if (reduced || !shown.init) { Object.assign(shown, { rd, unit, total, init: true }); render(); return; }
      gsap.to(shown, { rd, unit, total, duration: 0.5, ease: 'power3.out', overwrite: true, onUpdate: render });
    };
    qty.addEventListener('input', update);
    update();
  });

  /* ---------- lightbox ---------- */
  safe('lightbox', () => {
    const items = $$('[data-lightbox]');
    if (!items.length) return;
    const lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Galerie');
    lb.innerHTML = '<span class="lb__count" aria-live="polite"></span>' +
      '<figure class="lb__fig"><img class="lb__img" alt=""><figcaption class="lb__cap"></figcaption></figure>' +
      '<button type="button" class="lb__btn lb__prev" aria-label="Image précédente">&larr;</button>' +
      '<button type="button" class="lb__btn lb__next" aria-label="Image suivante">&rarr;</button>' +
      '<button type="button" class="lb__btn lb__close" aria-label="Fermer">&times;</button>';
    document.body.appendChild(lb);
    const img = $('.lb__img', lb);
    const cap = $('.lb__cap', lb);
    const count = $('.lb__count', lb);
    let group = [];
    let idx = 0;
    let opener = null;
    let open = false;
    const inerted = [];
    const srcOf = (el) => el.dataset.full || (el.tagName === 'A' && el.getAttribute('href')) ||
      (el.tagName === 'IMG' ? el.currentSrc || el.src : ($('img', el) || {}).currentSrc) || '';
    const altOf = (el) => el.dataset.caption || el.getAttribute('alt') || ($('img', el) || {}).alt || '';
    items.forEach((el) => {
      if (!/^(A|BUTTON)$/.test(el.tagName)) {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Agrandir : ' + altOf(el));
      }
    });
    const show = (i, dir) => {
      idx = (i + group.length) % group.length;
      const el = group[idx];
      const apply = () => {
        img.src = srcOf(el);
        img.alt = altOf(el);
        cap.textContent = altOf(el);
        count.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(group.length).padStart(2, '0');
        if (!reduced) gsap.fromTo(img, { opacity: 0, x: dir ? 30 * dir : 0, scale: dir ? 1 : 0.96 }, { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: 'power3.out' });
      };
      apply();
      const nxt = group[(idx + 1) % group.length];
      if (nxt) { const pre = new Image(); pre.src = srcOf(nxt); }
    };
    const openAt = (el) => {
      const key = el.getAttribute('data-lightbox');
      group = items.filter((x) => x.getAttribute('data-lightbox') === key);
      opener = el;
      open = true;
      lb.classList.add('is-open');
      Array.from(document.body.children).forEach((c) => { if (c !== lb && !c.inert) { c.inert = true; inerted.push(c); } });
      lockScroll(true);
      show(group.indexOf(el), 0);
      if (!reduced) gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
      $('.lb__close', lb).focus();
    };
    const close = () => {
      if (!open) return;
      open = false;
      const done = () => {
        lb.classList.remove('is-open');
        inerted.splice(0).forEach((c) => { c.inert = false; });
        lockScroll(false);
        if (opener && opener.focus) opener.focus({ preventScroll: true });
      };
      if (reduced) done(); else gsap.to(lb, { opacity: 0, duration: 0.25, onComplete: done });
    };
    document.addEventListener('click', (e) => {
      const el = e.target.closest && e.target.closest('[data-lightbox]');
      if (!el) return;
      e.preventDefault();
      openAt(el);
    });
    items.forEach((el) => el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAt(el); }
    }));
    lb.addEventListener('click', (e) => {
      if (e.target.closest('.lb__close') || e.target === lb) close();
      else if (e.target.closest('.lb__prev')) show(idx - 1, -1);
      else if (e.target.closest('.lb__next')) show(idx + 1, 1);
    });
    document.addEventListener('keydown', (e) => {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft') show(idx - 1, -1);
      else if (e.key === 'ArrowRight') show(idx + 1, 1);
      else if (e.key === 'Tab') {
        const f = $$('button', lb);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!lb.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    });
    let sx = null;
    lb.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    lb.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 60) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
  });

  /* ---------- curseur et boutons magnétiques ---------- */
  safe('cursor', () => {
    const cur = $('.cursor');
    if (!cur || !finePointer || reduced) return;
    const dot = $('.cursor__dot', cur);
    const label = $('.cursor__label', cur);
    doc.classList.add('has-cursor');
    gsap.set(cur, { autoAlpha: 0 });
    const qx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    const qy = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    let shown = false;
    document.addEventListener('pointermove', (e) => {
      if (!shown) { shown = true; gsap.set(cur, { x: e.clientX, y: e.clientY }); gsap.to(cur, { autoAlpha: 1, duration: 0.3 }); }
      qx(e.clientX); qy(e.clientY);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { shown = false; gsap.to(cur, { autoAlpha: 0, duration: 0.2 }); });
    let mode = '';
    const setMode = (m, txt) => {
      if (m === mode && !txt) return;
      mode = m;
      cur.classList.toggle('is-hover', m === 'hover');
      cur.classList.toggle('is-label', m === 'label');
      if (dot) gsap.to(dot, { scale: m === 'label' ? 4.5 : m === 'hover' ? 2.4 : 1, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      if (label) {
        if (txt) label.textContent = txt;
        gsap.to(label, { autoAlpha: m === 'label' ? 1 : 0, duration: 0.25, overwrite: 'auto' });
      }
    };
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest ? e.target : null;
      if (!t) return;
      const lab = t.closest('[data-cursor]');
      if (lab) setMode('label', lab.getAttribute('data-cursor'));
      else if (t.closest('a, button, [role="button"], input, summary, [data-lightbox], .deliverable')) setMode('hover');
      else setMode('');
    });
    document.addEventListener('pointerdown', () => cur.classList.add('is-down'));
    document.addEventListener('pointerup', () => cur.classList.remove('is-down'));
  });

  safe('magnetic', () => {
    if (!finePointer || reduced) return;
    $$('[data-magnetic]').forEach((el) => {
      let r = null;
      el.addEventListener('pointerenter', () => { r = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', (e) => {
        if (!r) r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: dx * 0.3, y: dy * 0.3, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      });
      el.addEventListener('pointerleave', () => {
        r = null;
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
      });
    });
  });

  /* ---------- ancres ---------- */
  function goTo(hash, instant) {
    let target = null;
    if (hash === '#' || hash === '#top') target = 0;
    else { try { target = $(hash); } catch (e) { target = null; } }
    if (target === null) return false;
    if (lenis && !instant) lenis.scrollTo(target, { duration: 1.6, easing: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2) });
    else if (target === 0) window.scrollTo(0, 0);
    else target.scrollIntoView({ behavior: 'auto', block: 'start' });
    if (target && target.focus) { if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    return true;
  }
  safe('anchors', () => {
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      const h = a.getAttribute('href');
      if (goTo(h)) { e.preventDefault(); try { history.pushState(null, '', h); } catch (x) { /* ignore */ } }
    });
  });

  /* ---------- refresh, resize ---------- */
  let rt = null;
  const refreshSoon = () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 200); };
  safe('refresh', () => {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshSoon);
    window.addEventListener('load', refreshSoon);
    $$('img').forEach((i) => { if (!i.complete) i.addEventListener('load', refreshSoon, { once: true }); });
    let wt = null;
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      clearTimeout(wt);
      wt = setTimeout(() => {
        rb('resize');
        if (window.innerWidth !== lastW) { lastW = window.innerWidth; ScrollTrigger.refresh(); }
      }, 200);
    });
  });

  /* ---------- séquence de démarrage ---------- */
  (async function run() {
    let finished = false;
    const failsafe = setTimeout(() => { if (!finished) { if (loader) loader.style.display = 'none'; lockScroll(false); } }, 8000);
    try {
      if (reduced) rb('setProgress', 0);
      await startLoader();
      await Promise.race([robotPromise, new Promise((r) => setTimeout(r, 300))]);
      rb('setVisible', true);
      rb('setHero', 0);
      if (reduced) rb('setProgress', 0);
      const intro = playHeroIntro();
      await exitLoader();
      lockScroll(false);
      ScrollTrigger.refresh();
      if (location.hash && location.hash.length > 1) goTo(location.hash, true);
      await intro;
    } catch (e) {
      console.warn('[main] démarrage : ' + (e && e.message));
      if (loader) loader.style.display = 'none';
    } finally {
      finished = true;
      clearTimeout(failsafe);
      window.__crepeReady = true;
    }
  })();
}
