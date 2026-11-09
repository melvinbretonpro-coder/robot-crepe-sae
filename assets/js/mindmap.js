/* Robot CRÊPE · carte mentale interactive (SVG + DOM, sans dépendance).
   Desktop : carte radiale avec pan, zoom, mini-carte, panneau latéral.
   Mobile et tablette (< 1000 px) : arbre vertical en accordéon, panneau en feuille du bas.
   gsap et ScrollTrigger sont des globales facultatives (scripts defer). */

const NBSP = ' ';
const doc = document;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const gsapOk = () => typeof window.gsap !== 'undefined';

/* ---------- petits outils ---------- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/* typographie française : espaces insécables avant : ; ! ? % € » et entre un nombre et son unité */
const typo = (s) => s
  .replace(/(\d) (mm|N|MPa|m\/s|°\/s|€|%)/g, '$1' + NBSP + '$2')
  .replace(/ ([:;!?%€»])/g, NBSP + '$1')
  .replace(/« /g, '«' + NBSP);
const fmt = (v, d) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

const ICON = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  center: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  exit: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};
const icon = (n, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

/* ---------- données (carte mentale du rapport + faits du rapport technique) ---------- */
const OWNERS = {
  1: { name: 'Melvin Breton', img: 'assets/img/equipe-melvin.webp' },
  2: { name: 'Valentin Caplot', img: 'assets/img/equipe-valentin.webp' },
  3: { name: 'Pacôme Grimaud', img: 'assets/img/equipe-pacome.webp' },
  4: { name: 'Enzo Lallican', img: 'assets/img/equipe-enzo.webp' },
};

const ROOT = {
  title: 'Projet Robot CRÊPE (SAÉ 3.2)',
  kicker: 'Projet',
  text: 'Un robot SCARA à 4 axes qui retourne des crêpes. Projet de BUT Génie Mécanique et Productique à l’IUT de Rennes, année 2025/2026, de la CAO TopSolid à la fabrication et aux tests.',
  stat: { v: 4, d: 0, label: 'axes motorisés, un moteur par liaison' },
};

/* side : r = à droite de la racine, l = à gauche. Les couleurs restent dans les tons caramel et gris chauds. */
const BRANCHES = [
  {
    id: 'b1', side: 'r', color: '#E3A857', kicker: 'Étude',
    title: 'Étude statique et dimensionnement',
    text: 'Quelle liaison est la plus sollicitée ? Le principe fondamental de la statique désigne le pivot A. Le palier iglidur® A350 Ø12 est ensuite vérifié en vitesse et en pression.',
    stat: { v: 136.8, d: 1, suf: ' N', label: 'effort en Y retenu au pivot A' },
    leaves: [
      { title: 'Calcul des efforts (PFS)',
        text: 'Au point A, le principe fondamental de la statique donne 136,8 N en Y et 6,4 N en X. L’étude de dimensionnement retient l’effort en Y.',
        stat: { v: 6.4, d: 1, suf: ' N', label: 'effort en X au pivot A' } },
      { title: 'Vérification des paliers iglidur® A350',
        text: 'Palier à collerette iglidur® A350, Ø12 mm, choisi pour la liaison pivot la plus sollicitée. Il est contrôlé en vitesse puis en pression.',
        stat: { v: 12, d: 0, suf: ' mm', label: 'diamètre du palier à collerette' } },
      { title: 'Validation pression (1,9 MPa) et vitesse',
        text: 'Vitesse v = 9,42 mm/s, très inférieure à 0,8 m/s. Pression P = F / (d × L) = 1,9 MPa, inférieure à 60 MPa : le palier convient.',
        stat: { v: 1.9, d: 1, suf: ' MPa', label: 'pression, pour une limite de 60 MPa' } },
    ],
  },
  {
    id: 'b2', side: 'r', color: '#D98B5B', kicker: 'Axe 1', axis: 1,
    title: 'Axe 1 · Liaison pivot bâti / bras',
    text: 'Liaison pivot d’axe vertical (A, z) entre le bâti et le premier bras. Un axe central, guidé par deux paliers lisses iglidur® Ø12 mm, est entraîné par un moteur déporté.',
    stat: { v: 150, d: 0, pre: '±', suf: '°', label: 'de rotation, à 90°/s au maximum' },
    leaves: [
      { title: 'Rotation ±150°',
        text: 'Rotation jusqu’à ±150° à 90°/s au maximum, comme l’impose le cahier des charges. Le passage des câbles des moteurs supérieurs est prévu.',
        stat: { v: 90, d: 0, suf: '°/s', label: 'vitesse maximale de rotation' } },
      { title: 'Moteur NEMA 23 avec poulie courroie',
        text: 'Moteur pas à pas NEMA 23, déporté pour limiter les efforts sur l’axe. Transmission par poulies de 16 et 32 dents et courroie, dont la tension se règle par des cales découpées au laser.',
        stat: { text: '16 / 32', label: 'dents des deux poulies' } },
      { title: 'Support en impression 3D',
        text: 'Le boîtier imprimé en 3D reçoit les deux paliers et fixe l’ensemble sur le bâti. Il apporte la rigidité de la liaison et facilite le montage.',
        stat: { v: 2, d: 0, label: 'paliers logés dans le boîtier' } },
      { title: 'Axe en inox 316L usiné',
        text: 'Axe de rotation cylindrique usiné : tournage conventionnel pour les gorges d’anneaux élastiques, puis fraisage pour les perçages et le méplat de la vis de pression.' },
    ],
  },
  {
    id: 'b3', side: 'r', color: '#C9B88C', kicker: 'Axe 2', axis: 2,
    title: 'Axe 2 · Liaison pivot intermédiaire',
    text: 'Pivot B de 360° à 90°/s, qui porte la glissière. Une structure hybride, tôle pliée et boîtier imprimé en 3D, tient l’entraxe et reprend une charge de 20 N.',
    stat: { v: 360, d: 0, suf: '°', label: 'de rotation, à 90°/s' },
    leaves: [
      { title: 'Entraxe 120 mm',
        text: 'Distance de 120 mm entre l’axe du pivot B et celui de la glissière. La structure la maintient rigide sous les moteurs et guidages embarqués, soit 20 N.',
        stat: { v: 120, d: 0, suf: ' mm', label: 'entre le pivot B et la glissière' } },
      { title: 'Moteur NEMA 17 déporté',
        text: 'Moteur NEMA 17 monté verticalement sur une équerre fixée au boîtier. Poulies de 16 et 32 dents, rapport de réduction de 1:2, courroie de 186 mm.',
        stat: { v: 186, d: 0, suf: ' mm', label: 'longueur de la courroie' } },
      { title: 'Structure hybride tôle en U et boîtier 3D',
        text: 'Un profilé en U en tôle pliée de 1 mm, découpé au laser, porte un boîtier imprimé en 3D qui intègre les paliers et l’équerre moteur. Moins de pièces et un gain de masse.',
        stat: { v: 240, d: 0, suf: ' mm', label: 'entraxe du profilé en U dans le déplié' } },
      { title: 'Cales de réglage de tension laser',
        text: 'Des cales découpées au laser dans une tôle de 1 mm s’empilent entre le boîtier et l’équerre du moteur. Chacune éloigne le moteur de 1 mm et règle la tension de la courroie.',
        stat: { v: 1, d: 0, suf: ' mm', label: 'de réglage de l’entraxe par cale' } },
    ],
  },
  {
    id: 'b4', side: 'l', color: '#A9B59B', kicker: 'Axe 3', axis: 3,
    title: 'Axe 3 · Liaison glissière verticale',
    text: 'Glissière verticale de 150 mm de course, à 1 m/s. Trois solutions ont été comparées : vis sans fin, pignon crémaillère et courroie. La courroie est retenue.',
    stat: { v: 150, d: 0, suf: ' mm', label: 'de course, à 1 m/s' },
    leaves: [
      { title: 'Course 150 mm',
        text: 'Course de 150 mm à 1 m/s, pour un effort de 20 N. L’entraxe de 221,69 mm entre les poulies satisfait cette course.',
        stat: { v: 221.69, d: 2, suf: ' mm', label: 'entraxe des poulies qui couvre la course' } },
      { title: 'Système rail et chariot standard',
        text: 'Un rail et un chariot standard guident la translation. Des adaptateurs fixent le moteur et la poulie basse sur les perçages existants du rail.',
        stat: { v: 20, d: 0, suf: ' N', label: 'effort à reprendre (P2)' } },
      { title: 'Entraînement par courroie 537 mm',
        text: 'Courroie HTD de 537 mm et poulies de 32 dents, mues par un moteur NEMA 17. Une plaque en inox 316L de 1 mm, découpée au laser, relie le chariot à la courroie.',
        stat: { v: 537, d: 0, suf: ' mm', label: 'longueur de la courroie HTD' } },
      { title: 'Adaptateurs 3D pour support moteur',
        text: 'Des adaptateurs imprimés en 3D relient le rail, le moteur et l’axe 2, et tiennent l’axe de la poulie basse. Le support moteur a deux trous oblongs pour régler la tension.',
        stat: { v: 2, d: 0, label: 'trous oblongs de réglage de la tension' } },
    ],
  },
  {
    id: 'b5', side: 'l', color: '#C99A98', kicker: 'Axe 4', axis: 4,
    title: 'Axe 4 · Liaison pivot outil',
    text: 'Pivot d’axe horizontal (C, x) à course infinie, qui retourne la crêpe. Boîtier imprimé en 3D renforcé de nervures, axe usiné en métal, moteur NEMA 17 et courroie de 159 mm.',
    stat: { v: 159, d: 0, suf: ' mm', label: 'courroie de la transmission' },
    leaves: [
      { title: 'Retournement de la crêpe (course infinie)',
        text: 'La liaison tourne sans butée : sa course est infinie, ce qui permet de retourner la crêpe. Elle porte 1 N, soit l’outil et la crêpe.',
        stat: { v: 1, d: 0, suf: ' N', label: 'charge portée : outil et crêpe' } },
      { title: 'Effecteur avec pince imprimée 3D',
        text: 'Une pince imprimée en 3D sur mesure : d’un côté le sklisen, serré par 4 vis, de l’autre la rozelle à la perpendiculaire, tenue par une vis. L’ensemble se fixe à l’axe par vis et écrou.',
        stat: { v: 4, d: 0, label: 'vis de serrage du sklisen' } },
      { title: 'Ustensiles : sklisen et rozelle',
        text: 'Le sklisen est la spatule, la rozelle est le râteau. Leurs modèles numériques ont servi à valider l’encombrement de l’assemblage complet.' },
      { title: 'Vitesse max 360°/s',
        text: 'Vitesse maximale de 360°/s, soit 1 tr/s. Elle est transmise par un moteur NEMA 17 et une courroie de 159 mm.',
        stat: { v: 360, d: 0, suf: '°/s', label: 'soit 1 tour par seconde' } },
    ],
  },
  {
    id: 'b6', side: 'l', color: '#A9A6A1', kicker: 'Fabrication',
    title: 'Fabrication et composants',
    text: 'Quatre procédés couvrent les pièces : usinage conventionnel, découpe laser, pliage et impression 3D. Tous les composants viennent de la boutique de l’IUT.',
    stat: { v: 174.43, d: 2, suf: ' € HT', label: 'de composants achetés, en 3 factures' },
    leaves: [
      { title: 'Usinage (tournage, fraisage conventionnel)',
        text: 'Les axes sont usinés : tournage pour les gorges de circlips, fraisage pour les perçages et les méplats. Un APEF et des contrats de phase ordonnent les opérations.',
        stat: { v: 4, d: 0, label: 'axes usinés, un par liaison' } },
      { title: 'Découpe laser (tôle inox 1 mm)',
        text: 'Découpe laser et pliage des pièces en tôle : profilé en U de l’axe 2, cales de réglage, plaque de liaison de l’axe 3 en inox 316L de 1 mm.',
        stat: { v: 1, d: 0, suf: ' mm', label: 'épaisseur de la tôle' } },
      { title: 'Impression 3D (PLA, polyamide)',
        text: 'Boîtiers, supports, adaptateurs et pince sont imprimés en 3D en PLA. Rapide et peu de déchets, mais sensible à la chaleur.' },
      { title: 'Boutique IUT (paliers, poulies, NEMA)',
        text: 'Paliers, poulies, courroies, rail et moteurs sont commandés sur la boutique de l’IUT. Trois factures pour 174,43 € HT, dont environ 40 % pour la motorisation.',
        stat: { v: 40, d: 0, suf: ' %', label: 'du budget pour la motorisation (environ)' } },
    ],
  },
];

/* ---------- modèle : liste plate de nœuds avec parent / enfants ---------- */
function buildModel() {
  const nodes = [];
  const branches = [];
  const leaves = [];
  const root = { id: 'root', type: 'root', side: null, color: '#E3A857', kicker: ROOT.kicker, title: ROOT.title, text: ROOT.text, stat: ROOT.stat, owner: null, axis: null, parent: null, children: [] };
  nodes.push(root);
  BRANCHES.forEach((b, i) => {
    const bn = { id: b.id, type: 'branch', index: i, side: b.side, color: b.color, kicker: b.kicker, title: b.title, text: b.text, stat: b.stat, axis: b.axis || null, owner: b.axis ? OWNERS[b.axis] : null, parent: root, children: [], collapsed: false };
    root.children.push(bn); nodes.push(bn); branches.push(bn);
    b.leaves.forEach((l, j) => {
      const ln = { id: `${b.id}-${j + 1}`, type: 'leaf', index: j, side: b.side, color: b.color, kicker: b.kicker, title: l.title, text: l.text, stat: l.stat || null, axis: bn.axis, owner: bn.owner, parent: bn, children: [] };
      bn.children.push(ln); nodes.push(ln); leaves.push(ln);
    });
  });
  nodes.forEach((n) => {
    n.title = typo(n.title);
    n.text = typo(n.text);
    if (n.stat) n.stat = Object.assign({}, n.stat, { label: typo(n.stat.label), suf: n.stat.suf ? n.stat.suf.replace(' ', NBSP) : '' });
    n.hay = norm([n.title, n.text, n.kicker, n.owner ? n.owner.name : '', n.stat ? n.stat.label : ''].join(' '));
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return { nodes, root, branches, leaves, byId, total: branches.length + leaves.length };
}

const pathTo = (n) => { const p = []; for (let c = n; c; c = c.parent) p.push(c); return p; };
const countText = (m) => `${m.branches.length} branches · ${m.leaves.length} éléments`;

/* ================================================================
   Panneau de détail (latéral en desktop, feuille du bas en mobile)
   ================================================================ */
function createPanel(host, model, cb) {
  const a = doc.createElement('aside');
  a.className = 'mm-panel';
  a.setAttribute('role', 'dialog');
  a.setAttribute('aria-modal', 'false');
  a.setAttribute('aria-hidden', 'true');
  a.setAttribute('aria-labelledby', 'mm-panel-title');
  a.tabIndex = -1;
  a.innerHTML = `
    <span class="mm-panel__grab" aria-hidden="true"></span>
    <button type="button" class="mm-panel__close" aria-label="Fermer le panneau">${icon('close')}</button>
    <div class="mm-panel__in">
      <p class="mm-panel__kicker mono"><i class="mm-panel__dot"></i><span></span></p>
      <h3 class="mm-panel__title" id="mm-panel-title"></h3>
      <div class="mm-panel__stat"><p class="mm-panel__fig"><span class="mm-panel__num"></span></p><p class="mm-panel__label mono"></p></div>
      <p class="mm-panel__text"></p>
      <div class="mm-panel__owner"><img alt="" width="44" height="44" loading="lazy"><div><p class="mono">Responsable</p><p class="mm-panel__ownername"></p></div></div>
      <div class="mm-panel__rel"><p class="mm-panel__relh mono"></p><div class="mm-panel__chips"></div></div>
      <button type="button" class="mm-panel__cta"><span>Voir l’axe en 3D</span>${icon('arrow')}</button>
    </div>`;
  host.appendChild(a);
  const q = (s) => a.querySelector(s);
  const el = {
    kicker: q('.mm-panel__kicker span'), title: q('.mm-panel__title'), stat: q('.mm-panel__stat'), num: q('.mm-panel__num'),
    label: q('.mm-panel__label'), text: q('.mm-panel__text'), owner: q('.mm-panel__owner'), ownerImg: q('.mm-panel__owner img'),
    ownerName: q('.mm-panel__ownername'), relh: q('.mm-panel__relh'), chips: q('.mm-panel__chips'), cta: q('.mm-panel__cta'), inner: q('.mm-panel__in'),
  };
  let current = null;
  let open = false;
  let count = null;

  q('.mm-panel__close').addEventListener('click', () => cb.onClose());
  el.chips.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (b) cb.onSelect(model.byId.get(b.dataset.id));
  });
  el.cta.addEventListener('click', () => {
    if (!current || !current.axis) return;
    cb.onCta && cb.onCta(current);
    if (doc.fullscreenElement && doc.exitFullscreen) doc.exitFullscreen();
    window.crepe && window.crepe.scrollToPhase && window.crepe.scrollToPhase('axe' + current.axis);
  });

  function setStat(s) {
    if (count) { count.kill(); count = null; }
    if (!s) { el.stat.hidden = true; return; }
    el.stat.hidden = false;
    el.label.textContent = s.label;
    if (s.text) { el.num.textContent = s.text; return; }
    const draw = (v) => { el.num.textContent = (s.pre || '') + fmt(v, s.d || 0) + (s.suf || ''); };
    if (reduced || !gsapOk()) { draw(s.v); return; }
    const o = { v: 0 };
    draw(0);
    count = window.gsap.to(o, { v: s.v, duration: 1.3, ease: 'power3.out', delay: 0.15, onUpdate: () => draw(o.v), onComplete: () => draw(s.v) });
  }

  function chips(n) {
    let list = []; let head = '';
    if (n.type === 'root') { list = model.branches; head = 'Les six branches'; }
    else if (n.type === 'branch') { list = n.children; head = 'Éléments de la branche'; }
    else { list = [n.parent].concat(n.parent.children.filter((c) => c !== n)); head = 'Branche et éléments voisins'; }
    el.relh.textContent = head;
    el.chips.innerHTML = '';
    list.forEach((c) => {
      const b = doc.createElement('button');
      b.type = 'button'; b.className = 'mm-chip' + (c.type === 'branch' ? ' mm-chip--b' : '');
      b.dataset.id = c.id; b.textContent = c.title;
      el.chips.appendChild(b);
    });
  }

  function show(n, opts) {
    current = n; open = true;
    a.style.setProperty('--c', n.color);
    el.kicker.textContent = n.type === 'root' ? 'Projet · SAÉ 3.2' : n.type === 'branch' ? n.kicker : n.kicker + ' · détail';
    el.title.textContent = n.title;
    el.text.textContent = n.text;
    setStat(n.stat);
    if (n.owner) { el.owner.hidden = false; el.ownerImg.src = n.owner.img; el.ownerName.textContent = n.owner.name; } else el.owner.hidden = true;
    chips(n);
    el.cta.hidden = !n.axis;
    if (n.axis) el.cta.querySelector('span').textContent = `Voir l’axe ${n.axis} en 3D`;
    a.classList.add('is-open');
    a.setAttribute('aria-hidden', 'false');
    a.scrollTop = 0;
    if (!reduced && gsapOk()) {
      window.gsap.fromTo([...el.inner.children], { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.75, stagger: 0.055, ease: 'expo.out', delay: 0.1, clearProps: 'transform,opacity,visibility' });
    }
    if (opts && opts.focus) a.focus({ preventScroll: true });
  }
  function hide() {
    open = false; current = null;
    if (count) { count.kill(); count = null; }
    a.classList.remove('is-open');
    a.setAttribute('aria-hidden', 'true');
  }
  return { el: a, show, hide, get open() { return open; }, get node() { return current; } };
}

/* ================================================================
   DESKTOP : carte radiale pan / zoom
   ================================================================ */
const PANEL_W = () => (window.innerWidth < 1000 ? 320 : 380);

function mountDesktop(host, model) {
  const ac = new AbortController();
  const { signal } = ac;
  const { nodes, root, branches, leaves } = model;
  const on = (t, ev, fn, o) => t.addEventListener(ev, fn, Object.assign({ signal }, o || {}));

  host.innerHTML = `
    <div class="mm-surface" data-cursor="Explorer" role="group" aria-label="Carte mentale du projet. Tab pour parcourir les nœuds, Entrée pour ouvrir, flèches pour naviguer, Échap pour fermer.">
      <div class="mm-world"><div class="mm-glow"></div><svg class="mm-links" aria-hidden="true"><g class="mm-links__main"></g><g class="mm-links__flow"></g></svg></div>
    </div>
    <div class="mm-ui mm-bar">
      <label class="mm-search">${icon('search', 16)}<input type="search" placeholder="Rechercher un élément" aria-label="Rechercher dans la carte" autocomplete="off" spellcheck="false" enterkeyhint="search"><button type="button" class="mm-search__clear" aria-label="Effacer la recherche" hidden>${icon('close', 14)}</button></label>
      <p class="mm-count mono" aria-live="polite"></p>
    </div>
    <div class="mm-ui mm-top"><button type="button" class="mm-textbtn" data-act="collapse" aria-pressed="false">Tout replier</button></div>
    <div class="mm-ui mm-zoom" role="group" aria-label="Contrôles de la carte">
      <button type="button" data-act="out" aria-label="Zoom arrière" data-cursor="Zoom −">${icon('minus')}</button>
      <button type="button" data-act="in" aria-label="Zoom avant" data-cursor="Zoom +">${icon('plus')}</button>
      <button type="button" data-act="fit" aria-label="Recentrer la vue d’ensemble" data-cursor="Recentrer">${icon('center')}</button>
      <button type="button" data-act="full" aria-label="Plein écran" aria-pressed="false" data-cursor="Plein écran">${icon('full')}</button>
    </div>
    <div class="mm-ui mm-mini" aria-hidden="true"><svg><g class="mm-mini__g"></g><path class="mm-mini__mask"/><rect class="mm-mini__rect"/></svg></div>
    <p class="mm-ui mm-hint mono" aria-hidden="true">Glisser pour déplacer · Cliquer la carte puis molette pour zoomer</p>
    <p class="mm-sr" aria-live="polite"></p>`;

  const surface = host.querySelector('.mm-surface');
  const world = host.querySelector('.mm-world');
  const svg = host.querySelector('.mm-links');
  const gMain = host.querySelector('.mm-links__main');
  const gFlow = host.querySelector('.mm-links__flow');
  const input = host.querySelector('.mm-search input');
  const clearBtn = host.querySelector('.mm-search__clear');
  const countEl = host.querySelector('.mm-count');
  const srEl = host.querySelector('.mm-sr');
  const hint = host.querySelector('.mm-hint');
  const collapseBtn = host.querySelector('[data-act="collapse"]');
  const fullBtn = host.querySelector('[data-act="full"]');
  const mini = host.querySelector('.mm-mini');
  const miniSvg = mini.querySelector('svg');
  const miniG = mini.querySelector('.mm-mini__g');
  const miniMask = mini.querySelector('.mm-mini__mask');
  const miniRect = mini.querySelector('.mm-mini__rect');
  const uiEls = [...host.querySelectorAll('.mm-ui')];
  countEl.textContent = countText(model);

  const state = { hover: null, ptr: null, kb: null, focus: null, selected: null, q: '', lastKb: false };
  const view = { x: 0, y: 0, k: 1 };
  let vw = 1; let vh = 1;
  let box = { x0: -1, y0: -1, x1: 1, y1: 1 };
  let atOverview = true;
  let engaged = false;
  let suppress = false;
  let tw = null;
  let inertia = null;
  let intro = null;
  let st = null;
  let io = null;
  let ready = false;

  /* panneau */
  const panel = createPanel(host, model, {
    onClose: () => reset(true),
    onSelect: (n) => select(n),
  });

  /* ---------- création des éléments ---------- */
  const links = [];
  const mkPath = (cls) => { const p = doc.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('class', cls); return p; };
  nodes.forEach((n) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = `mm-node mm-node--${n.type}`;
    b.dataset.id = n.id;
    b.dataset.cursor = 'Ouvrir';
    b.style.setProperty('--c', n.color);
    const t = doc.createElement('span');
    t.className = 'mm-node__t';
    t.textContent = n.title;
    b.appendChild(t);
    n.el = b;
    if (n.type !== 'root') {
      const p = mkPath('mm-link'); p.style.setProperty('--c', n.color);
      gMain.appendChild(p);
      n.link = p;
      links.push(n);
    }
    world.appendChild(b);
    if (n.type === 'branch') {
      const tg = doc.createElement('button');
      tg.type = 'button'; tg.className = `mm-toggle mm-toggle--${n.side}`;
      tg.dataset.cursor = n.side === 'r' ? 'Replier' : 'Replier';
      tg.style.setProperty('--c', n.color);
      tg.setAttribute('aria-expanded', 'true');
      tg.setAttribute('aria-label', `Replier la branche : ${n.title}`);
      tg.innerHTML = icon('chev', 14);
      n.toggle = tg;
      world.appendChild(tg);
      on(tg, 'click', (e) => { e.stopPropagation(); setCollapsed(n, !n.collapsed); });
    }
  });
  /* flux lumineux discrets sur les liens racine / branches */
  branches.forEach((b, i) => {
    const f = mkPath('mm-flow'); f.style.setProperty('--c', b.color); f.style.setProperty('--d', `${-i * 0.9}s`);
    gFlow.appendChild(f); b.flow = f;
  });

  /* ---------- mise en page ---------- */
  function layout() {
    nodes.forEach((n) => { n.w = n.el.offsetWidth; n.h = n.el.offsetHeight; });
    const GAP_ROOT = 78; const GAP_LEAF = 64; const LEAF_GAP = 11; const GROUP_GAP = 30;
    const bw = branches[0].w;
    const bx = root.w / 2 + GAP_ROOT;
    const lx = bx + bw + GAP_LEAF;
    root.x = -root.w / 2; root.y = -root.h / 2;
    ['r', 'l'].forEach((side) => {
      const list = branches.filter((b) => b.side === side);
      const dims = list.map((b) => {
        const lh = b.children.reduce((s, c) => s + c.h, 0) + LEAF_GAP * (b.children.length - 1);
        return Math.max(lh, b.h);
      });
      const total = dims.reduce((s, d) => s + d, 0) + GROUP_GAP * (list.length - 1);
      let y = -total / 2;
      list.forEach((b, i) => {
        const gh = dims[i];
        b.cy = y + gh / 2;
        b.y = b.cy - b.h / 2;
        b.x = side === 'r' ? bx : -bx - b.w;
        const lh = b.children.reduce((s, c) => s + c.h, 0) + LEAF_GAP * (b.children.length - 1);
        let ly = b.cy - lh / 2;
        b.children.forEach((c) => {
          c.y = ly; c.cy = ly + c.h / 2;
          c.x = side === 'r' ? lx : -lx - c.w;
          ly += c.h + LEAF_GAP;
        });
        y += gh + GROUP_GAP;
      });
    });
    nodes.forEach((n) => {
      n.cx = n.x + n.w / 2;
      if (n.type === 'root') n.cy = 0;
      n.el.style.left = `${n.x}px`; n.el.style.top = `${n.y}px`;
    });
    const curve = (sx, sy, ex, ey) => { const m = (sx + ex) / 2; return `M${sx.toFixed(1)} ${sy.toFixed(1)}C${m.toFixed(1)} ${sy.toFixed(1)} ${m.toFixed(1)} ${ey.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`; };
    branches.forEach((b) => {
      const dir = b.side === 'r' ? 1 : -1;
      const d = curve(dir * root.w / 2, 0, b.side === 'r' ? b.x : b.x + b.w, b.cy);
      b.link.setAttribute('d', d); b.flow.setAttribute('d', d);
      const edge = b.side === 'r' ? b.x + b.w : b.x;
      b.tx = edge + dir * 15; b.ty = b.cy;
      b.toggle.style.left = `${b.tx - 11}px`; b.toggle.style.top = `${b.ty - 11}px`;
      b.children.forEach((c) => {
        c.link.setAttribute('d', curve(edge + dir * 26, b.cy, c.side === 'r' ? c.x : c.x + c.w, c.cy));
        c.el.style.setProperty('--dx', `${b.cx - c.cx}px`); c.el.style.setProperty('--dy', `${b.cy - c.cy}px`);
      });
    });
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    nodes.forEach((n) => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + n.w); y1 = Math.max(y1, n.y + n.h); });
    box = { x0, y0, x1, y1 };
    buildMini();
  }

  /* ---------- mini-carte ---------- */
  let mvb = { x: 0, y: 0, w: 1, h: 1 };
  function buildMini() {
    mvb = { x: box.x0 - 50, y: box.y0 - 50, w: box.x1 - box.x0 + 100, h: box.y1 - box.y0 + 100 };
    miniSvg.setAttribute('viewBox', `${mvb.x} ${mvb.y} ${mvb.w} ${mvb.h}`);
    miniG.innerHTML = '';
    const ns = 'http://www.w3.org/2000/svg';
    links.forEach((n) => {
      const p = doc.createElementNS(ns, 'path');
      p.setAttribute('d', n.link.getAttribute('d')); p.setAttribute('class', 'mm-mini__l'); p.style.setProperty('--c', n.color);
      n.miniLink = p; miniG.appendChild(p);
    });
    nodes.forEach((n) => {
      const r = doc.createElementNS(ns, 'rect');
      r.setAttribute('x', n.x); r.setAttribute('y', n.y); r.setAttribute('width', n.w); r.setAttribute('height', n.h);
      r.setAttribute('rx', Math.min(10, n.h / 2)); r.setAttribute('class', 'mm-mini__n' + (n.type === 'root' ? ' is-root' : ''));
      r.style.setProperty('--c', n.color);
      n.miniNode = r; miniG.appendChild(r);
    });
  }
  function updateMini() {
    const k = view.k;
    const x0 = -view.x / k; const y0 = -view.y / k; const x1 = x0 + vw / k; const y1 = y0 + vh / k;
    const B = 20000;
    miniMask.setAttribute('d', `M${-B} ${-B}H${B}V${B}H${-B}Z M${x0} ${y0}H${x1}V${y1}H${x0}Z`);
    miniRect.setAttribute('x', x0); miniRect.setAttribute('y', y0); miniRect.setAttribute('width', x1 - x0); miniRect.setAttribute('height', y1 - y0);
  }
  function miniPoint(e) {
    const r = miniSvg.getBoundingClientRect();
    const s = Math.min(r.width / mvb.w, r.height / mvb.h);
    const ox = (r.width - mvb.w * s) / 2; const oy = (r.height - mvb.h * s) / 2;
    return { x: mvb.x + (e.clientX - r.left - ox) / s, y: mvb.y + (e.clientY - r.top - oy) / s };
  }
  let miniDrag = false;
  const miniGo = (e) => {
    const p = miniPoint(e);
    view.x = vw / 2 - p.x * view.k; view.y = vh / 2 - p.y * view.k;
    clampView(); apply(); atOverview = false;
  };
  on(mini, 'pointerdown', (e) => { tw && tw.kill(); inertia && inertia.kill(); miniDrag = true; mini.setPointerCapture(e.pointerId); miniGo(e); e.stopPropagation(); });
  on(mini, 'pointermove', (e) => { if (miniDrag) miniGo(e); });
  on(mini, 'pointerup', () => { miniDrag = false; });
  on(mini, 'pointercancel', () => { miniDrag = false; });

  /* ---------- vue : transformation, bornes, animations ---------- */
  const MINK = 0.3; const MAXK = 3;
  function apply() {
    world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.k})`;
    surface.style.setProperty('--gx', `${view.x}px`);
    surface.style.setProperty('--gy', `${view.y}px`);
    surface.style.setProperty('--gs', `${28 * view.k}px`);
    updateMini();
  }
  function clampView() {
    const m = 260;
    const cx = clamp((vw / 2 - view.x) / view.k, box.x0 - m, box.x1 + m);
    const cy = clamp((vh / 2 - view.y) / view.k, box.y0 - m, box.y1 + m);
    view.x = vw / 2 - cx * view.k; view.y = vh / 2 - cy * view.k;
  }
  function tweenView(t, dur) {
    tw && tw.kill(); inertia && inertia.kill();
    if (reduced || !gsapOk() || !dur) { view.x = t.x; view.y = t.y; view.k = t.k; apply(); return; }
    tw = window.gsap.to(view, { x: t.x, y: t.y, k: t.k, duration: dur, ease: 'power3.inOut', onUpdate: apply, overwrite: true });
  }
  const safe = () => ({ l: 40, r: 40 + (panel.open ? PANEL_W() + 20 : 0), t: 84, b: 86 });
  function fitRect(r, ins, maxK) {
    const aw = vw - ins.l - ins.r; const ah = vh - ins.t - ins.b;
    const k = clamp(Math.min(aw / (r.x1 - r.x0), ah / (r.y1 - r.y0)), MINK, maxK);
    return { k, x: ins.l + aw / 2 - ((r.x0 + r.x1) / 2) * k, y: ins.t + ah / 2 - ((r.y0 + r.y1) / 2) * k };
  }
  const overviewView = () => fitRect(box, safe(), 1.25);
  function groupRect(b) {
    let x0 = b.x; let y0 = b.y; let x1 = b.x + b.w; let y1 = b.y + b.h;
    if (!b.collapsed) b.children.forEach((c) => { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + c.w); y1 = Math.max(y1, c.y + c.h); });
    return { x0: x0 - 30, y0: y0 - 30, x1: x1 + 30, y1: y1 + 30 };
  }
  function zoomAt(px, py, nk) {
    nk = clamp(nk, MINK, MAXK);
    const wx = (px - view.x) / view.k; const wy = (py - view.y) / view.k;
    view.k = nk; view.x = px - wx * nk; view.y = py - wy * nk;
  }
  function zoomButton(f) {
    const nk = clamp(view.k * f, MINK, MAXK);
    const wx = (vw / 2 - view.x) / view.k; const wy = (vh / 2 - view.y) / view.k;
    atOverview = false;
    tweenView({ k: nk, x: vw / 2 - wx * nk, y: vh / 2 - wy * nk }, 0.5);
  }
  function ensureVisible(n) {
    const ins = safe();
    const x0 = view.x + n.x * view.k; const x1 = x0 + n.w * view.k; const y0 = view.y + n.y * view.k; const y1 = y0 + n.h * view.k;
    let dx = 0; let dy = 0;
    if (x0 < ins.l) dx = ins.l - x0; else if (x1 > vw - ins.r) dx = vw - ins.r - x1;
    if (y0 < ins.t) dy = ins.t - y0; else if (y1 > vh - ins.b) dy = vh - ins.b - y1;
    if (dx || dy) { atOverview = false; tweenView({ k: view.k, x: view.x + dx, y: view.y + dy }, 0.55); }
  }

  /* ---------- états visuels : survol, recherche, focus de branche ---------- */
  let matches = [];
  function refresh() {
    const hover = state.ptr || state.kb;
    let lit = null;
    if (hover) {
      lit = new Set(pathTo(hover).map((n) => n.id));
      if (hover.type !== 'leaf') hover.children.forEach((c) => { if (!(c.parent.collapsed)) lit.add(c.id); });
    } else if (state.q) {
      lit = new Set();
      matches.forEach((m) => pathTo(m).forEach((n) => lit.add(n.id)));
    } else if (state.focus) {
      lit = new Set([root.id, state.focus.id]);
      state.focus.children.forEach((c) => lit.add(c.id));
    }
    nodes.forEach((n) => {
      const isLit = !!lit && lit.has(n.id);
      n.el.classList.toggle('is-lit', isLit);
      n.el.classList.toggle('is-dim', !!lit && !isLit);
      n.el.classList.toggle('is-match', !!state.q && n.match);
      n.el.classList.toggle('is-selected', state.selected === n);
      if (n.toggle) { n.toggle.classList.toggle('is-dim', !!lit && !isLit); n.toggle.classList.toggle('is-lit', isLit); }
      if (n.link) {
        const both = !!lit && lit.has(n.id) && lit.has(n.parent.id);
        n.link.classList.toggle('is-lit', both);
        n.link.classList.toggle('is-dim', !!lit && !both);
      }
    });
    host.classList.toggle('is-filtering', !!lit);
  }

  function setCollapsed(b, val, instant) {
    if (b.collapsed === val) return;
    b.collapsed = val;
    b.toggle.setAttribute('aria-expanded', String(!val));
    b.toggle.setAttribute('aria-label', `${val ? 'Déplier' : 'Replier'} la branche : ${b.title}`);
    b.toggle.classList.toggle('is-collapsed', val);
    b.children.forEach((c, i) => {
      if (!instant) c.el.style.transitionDelay = `${val ? 0 : i * 45}ms`;
      c.el.classList.toggle('is-collapsed', val);
      c.link.classList.toggle('is-collapsed', val);
      c.miniNode.classList.toggle('is-off', val); c.miniLink.classList.toggle('is-off', val);
    });
    setTimeout(() => b.children.forEach((c) => { c.el.style.transitionDelay = ''; }), 900);
    if (val && state.selected && state.selected.parent === b) reset(false);
    const allCollapsed = branches.every((x) => x.collapsed);
    collapseBtn.textContent = allCollapsed ? 'Tout déplier' : 'Tout replier';
    collapseBtn.setAttribute('aria-pressed', String(allCollapsed));
    refresh();
  }

  /* ---------- sélection, focus de branche, retour à la vue d’ensemble ---------- */
  function select(n, opts) {
    const kb = !!(opts && opts.kb);
    if (state.selected === n) { reset(true); return; }
    state.selected = n;
    const br = n.type === 'leaf' ? n.parent : n.type === 'branch' ? n : null;
    if (br && br.collapsed) setCollapsed(br, false);
    state.focus = br;
    panel.show(n, { focus: kb });
    host.classList.add('has-panel');
    atOverview = false;
    refresh();
    tweenView(br ? fitRect(groupRect(br), safe(), 1.4) : fitRect(box, safe(), 1.25), 1.1);
    srEl.textContent = `${n.title} : ${n.text}`;
  }
  function reset(restoreFocus) {
    const prev = state.selected;
    state.selected = null; state.focus = null;
    const wasOpen = panel.open;
    panel.hide();
    host.classList.remove('has-panel');
    refresh();
    atOverview = true;
    tweenView(overviewView(), 1);
    if (restoreFocus && wasOpen && prev && state.lastKb) prev.el.focus({ preventScroll: true });
  }

  /* ---------- recherche ---------- */
  function setQuery(raw) {
    const q = norm(raw.trim());
    state.q = q;
    clearBtn.hidden = !q;
    matches = [];
    nodes.forEach((n) => { n.match = !!q && n.type !== 'root' && n.hay.includes(q); if (n.match) matches.push(n); });
    if (q) matches.forEach((m) => { if (m.type === 'leaf' && m.parent.collapsed) setCollapsed(m.parent, false); });
    countEl.textContent = !q ? countText(model) : matches.length ? `${matches.length} résultat${matches.length > 1 ? 's' : ''}` : 'Aucun résultat';
    srEl.textContent = !q ? '' : countEl.textContent;
    host.classList.toggle('is-empty', !!q && !matches.length);
    refresh();
  }
  on(input, 'input', () => setQuery(input.value));
  on(input, 'keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) select(matches[0], { kb: true }); }
    else if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; setQuery(''); }
  });
  on(clearBtn, 'click', () => { input.value = ''; setQuery(''); input.focus(); });

  /* ---------- interactions souris, doigt, molette ---------- */
  const pts = new Map();
  let drag = null; let pinch = null;
  const touched = () => host.classList.add('is-touched');
  on(surface, 'pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    tw && tw.kill(); inertia && inertia.kill();
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    engaged = true; host.classList.add('is-engaged');
    if (pts.size === 1) drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, active: false, lx: e.clientX, ly: e.clientY, lt: performance.now(), vxv: 0, vyv: 0 };
    else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: view.k, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      if (drag) { drag.active = false; drag = null; }
      suppress = true;
    }
  });
  on(surface, 'pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = surface.getBoundingClientRect();
    if (pts.size >= 2 && pinch) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
      view.x += mx - pinch.mx; view.y += my - pinch.my;
      zoomAt(mx - r.left, my - r.top, pinch.k * (d / pinch.d));
      pinch.mx = mx; pinch.my = my;
      clampView(); apply(); atOverview = false; touched();
      return;
    }
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.sx; const dy = e.clientY - drag.sy;
      if (!drag.active && Math.hypot(dx, dy) > 5) {
        drag.active = true; surface.setPointerCapture(e.pointerId); host.classList.add('is-dragging'); atOverview = false; touched();
      }
      if (drag.active) {
        view.x = drag.vx + dx; view.y = drag.vy + dy; clampView(); apply();
        const now = performance.now(); const dt = Math.max(1, now - drag.lt);
        drag.vxv = 0.8 * drag.vxv + 0.2 * ((e.clientX - drag.lx) / dt); drag.vyv = 0.8 * drag.vyv + 0.2 * ((e.clientY - drag.ly) / dt);
        drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
      }
    }
  });
  const endPointer = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (drag && e.pointerId === drag.id) {
      const was = drag.active;
      host.classList.remove('is-dragging');
      if (was) {
        suppress = true; setTimeout(() => { suppress = false; }, 60);
        const sp = Math.hypot(drag.vxv, drag.vyv);
        if (sp > 0.12 && !reduced && gsapOk() && performance.now() - drag.lt < 90) {
          const tx = view.x + drag.vxv * 320; const ty = view.y + drag.vyv * 320;
          inertia = window.gsap.to(view, { x: tx, y: ty, duration: 0.9, ease: 'power3.out', onUpdate: () => { clampView(); apply(); } });
        }
      }
      drag = null;
    }
    if (!pts.size) setTimeout(() => { suppress = false; }, 60);
  };
  on(surface, 'pointerup', endPointer);
  on(surface, 'pointercancel', endPointer);
  on(host, 'pointerleave', () => { engaged = false; host.classList.remove('is-engaged'); });

  on(surface, 'wheel', (e) => {
    if (!engaged && !(e.ctrlKey || e.metaKey)) {
      host.classList.add('is-nudge'); clearTimeout(on.nt); on.nt = setTimeout(() => host.classList.remove('is-nudge'), 1800);
      return; /* on laisse défiler la page tant que la carte n’est pas activée par un clic */
    }
    e.preventDefault();
    tw && tw.kill(); inertia && inertia.kill();
    const r = surface.getBoundingClientRect();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    const f = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018));
    zoomAt(e.clientX - r.left, e.clientY - r.top, view.k * f);
    clampView(); apply(); atOverview = false; touched();
  }, { passive: false });

  /* clic sur le fond : retour à la vue d’ensemble si un nœud est ouvert */
  on(surface, 'click', (e) => {
    if (suppress) return;
    if (e.target.closest('.mm-node, .mm-toggle')) return;
    if (state.selected) reset(false);
  });

  /* ---------- nœuds : clic, survol, focus clavier ---------- */
  nodes.forEach((n) => {
    on(n.el, 'click', (e) => {
      if (suppress) return;
      state.lastKb = e.detail === 0;
      select(n, { kb: e.detail === 0 });
    });
    on(n.el, 'pointerenter', (e) => { if (e.pointerType !== 'touch') { state.ptr = n; refresh(); } });
    on(n.el, 'pointerleave', () => { if (state.ptr === n) { state.ptr = null; refresh(); } });
  });
  on(host, 'focusin', (e) => {
    const b = e.target.closest && e.target.closest('.mm-node');
    if (!b) return;
    const n = model.byId.get(b.dataset.id);
    state.kb = n;
    if (state.lastKb) ensureVisible(n);
    refresh();
  });
  on(host, 'focusout', (e) => {
    const b = e.target.closest && e.target.closest('.mm-node');
    if (b && state.kb === model.byId.get(b.dataset.id)) { state.kb = null; refresh(); }
  });
  on(doc, 'keydown', () => { state.lastKb = true; }, { capture: true });
  on(doc, 'pointerdown', () => { state.lastKb = false; }, { capture: true });

  /* ---------- clavier : flèches entre nœuds, Échap, raccourcis de zoom ---------- */
  const visible = (n) => n.type !== 'leaf' || !n.parent.collapsed;
  function neighbor(n, key) {
    const toRoot = n.side === 'r' ? 'ArrowLeft' : 'ArrowRight';
    const outward = n.side === 'r' ? 'ArrowRight' : 'ArrowLeft';
    if (n.type === 'root') {
      const side = key === 'ArrowRight' ? 'r' : key === 'ArrowLeft' ? 'l' : null;
      if (!side) return null;
      const list = branches.filter((b) => b.side === side);
      return list[Math.floor(list.length / 2)];
    }
    if (key === toRoot) return n.parent;
    if (key === outward) return n.type === 'branch' ? n.children.find(visible) || null : null;
    if (key !== 'ArrowUp' && key !== 'ArrowDown') return null;
    const d = key === 'ArrowDown' ? 1 : -1;
    const flat = [];
    branches.filter((b) => b.side === n.side).forEach((b) => { if (n.type === 'branch') flat.push(b); else b.children.filter(visible).forEach((c) => flat.push(c)); });
    const i = flat.indexOf(n);
    return flat[i + d] || null;
  }
  on(host, 'keydown', (e) => {
    if (e.key === 'Escape') {
      if (doc.fullscreenElement) return;
      if (panel.open || state.focus || state.selected) { e.preventDefault(); reset(true); }
      return;
    }
    const tgt = e.target;
    if (tgt === input) return;
    const nodeEl = tgt.closest && tgt.closest('.mm-node');
    if (nodeEl && e.key.startsWith('Arrow')) {
      const next = neighbor(model.byId.get(nodeEl.dataset.id), e.key);
      e.preventDefault();
      if (next) next.el.focus({ preventScroll: true });
      return;
    }
    if (tgt.closest && tgt.closest('.mm-panel')) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomButton(1.3); }
    else if (e.key === '-') { e.preventDefault(); zoomButton(1 / 1.3); }
    else if (e.key === '0') { e.preventDefault(); reset(false); }
  });

  /* ---------- barre d’outils ---------- */
  on(host, 'click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'in') zoomButton(1.35);
    else if (act === 'out') zoomButton(1 / 1.35);
    else if (act === 'fit') reset(false);
    else if (act === 'full') {
      if (doc.fullscreenElement) doc.exitFullscreen(); else if (host.requestFullscreen) host.requestFullscreen().catch(() => {});
    } else if (act === 'collapse') {
      const next = !branches.every((x) => x.collapsed);
      branches.forEach((x) => setCollapsed(x, next));
      if (next) reset(false);
    }
  });
  on(doc, 'fullscreenchange', () => {
    const fs = doc.fullscreenElement === host;
    fullBtn.innerHTML = icon(fs ? 'exit' : 'full');
    fullBtn.setAttribute('aria-pressed', String(fs));
    fullBtn.setAttribute('aria-label', fs ? 'Quitter le plein écran' : 'Plein écran');
    host.classList.toggle('is-fullscreen', fs);
  });

  /* ---------- taille de la zone ---------- */
  function measure() {
    const r = surface.getBoundingClientRect();
    vw = r.width || 1; vh = r.height || 1;
    host.style.setProperty('--mm-pw', `${PANEL_W()}px`);
  }
  const ro = new ResizeObserver(() => {
    measure();
    if (!ready) return;
    if (atOverview) { const t = overviewView(); Object.assign(view, t); }
    clampView(); apply();
  });
  ro.observe(surface);

  /* ---------- entrée au scroll ---------- */
  function finishIntro() {
    const g = window.gsap;
    if (g) {
      g.set(nodes.map((n) => n.el).concat(branches.map((b) => b.toggle)), { clearProps: 'opacity,visibility,transform' });
      g.set(links.map((n) => n.link), { clearProps: 'strokeDasharray,strokeDashoffset' });
      g.set(uiEls, { clearProps: 'opacity,visibility,transform' });
    }
    host.classList.remove('is-intro');
    host.classList.add('is-ready', 'is-live');
  }
  function prepIntro() {
    if (reduced || !gsapOk()) { finishIntro(); return false; }
    const g = window.gsap;
    host.classList.add('is-intro');
    nodes.forEach((n) => g.set(n.el, { autoAlpha: 0, scale: n.type === 'root' ? 0.6 : 0.82, transformOrigin: '50% 50%' }));
    branches.forEach((b) => g.set(b.toggle, { autoAlpha: 0 }));
    links.forEach((n) => { const len = n.link.getTotalLength(); n.len = len; g.set(n.link, { strokeDasharray: len, strokeDashoffset: len }); });
    g.set(uiEls, { autoAlpha: 0, y: 10 });
    return true;
  }
  function playIntro() {
    const g = window.gsap;
    intro = g.timeline({ defaults: { ease: 'power3.out' }, onComplete: finishIntro });
    intro.to(root.el, { autoAlpha: 1, scale: 1, duration: 1.1, ease: 'back.out(1.5)' }, 0);
    branches.forEach((b, i) => {
      const t0 = 0.4 + i * 0.13;
      intro.to(b.link, { strokeDashoffset: 0, duration: 1.15, ease: 'power2.inOut' }, t0);
      intro.to(b.el, { autoAlpha: 1, scale: 1, duration: 0.85, ease: 'back.out(1.3)' }, t0 + 0.8);
      intro.to(b.toggle, { autoAlpha: 1, duration: 0.4 }, t0 + 1);
      b.children.forEach((c, j) => {
        const t1 = t0 + 1.05 + j * 0.09;
        intro.to(c.link, { strokeDashoffset: 0, duration: 0.85, ease: 'power2.inOut' }, t1);
        intro.to(c.el, { autoAlpha: 1, scale: 1, duration: 0.65 }, t1 + 0.5);
      });
    });
    intro.to(uiEls, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'expo.out' }, 1.3);
  }

  /* ---------- démarrage (après les polices : les largeurs en dépendent) ---------- */
  const start = () => {
    if (signal.aborted) return;
    measure(); layout();
    Object.assign(view, overviewView()); apply();
    ready = true;
    const animate = prepIntro();
    refresh();
    if (!animate) return;
    let played = false;
    const go = () => { if (played || signal.aborted) return; played = true; playIntro(); };
    if (window.ScrollTrigger && gsapOk()) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      st = window.ScrollTrigger.create({ trigger: host, start: 'top 72%', once: true, refreshPriority: -1, onEnter: go });
    }
    io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting && x.intersectionRatio > 0.25)) go(); }, { threshold: [0, 0.25, 0.5] });
    io.observe(host);
    /* mise en pause des flux lumineux hors écran */
    new IntersectionObserver((es) => { host.classList.toggle('is-offscreen', !es.some((x) => x.isIntersecting)); }).observe(host);
  };
  (doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve()).then(start, start);

  return {
    destroy() {
      ac.abort();
      tw && tw.kill(); inertia && inertia.kill(); intro && intro.kill(); st && st.kill(); io && io.disconnect(); ro.disconnect();
      if (gsapOk()) window.gsap.killTweensOf(view);
      if (doc.fullscreenElement === host && doc.exitFullscreen) doc.exitFullscreen();
    },
  };
}

/* ================================================================
   MOBILE : arbre vertical en accordéon + feuille du bas
   ================================================================ */
function mountMobile(host, model) {
  const ac = new AbortController();
  const { signal } = ac;
  const on = (t, ev, fn, o) => t.addEventListener(ev, fn, Object.assign({ signal }, o || {}));
  const { branches, root } = model;

  host.innerHTML = `
    <div class="mm-m">
      <div class="mm-m__top">
        <button type="button" class="mm-m__root" data-id="root" data-cursor="Ouvrir"><span class="mono">Carte mentale</span><strong></strong></button>
        <label class="mm-search">${icon('search', 16)}<input type="search" placeholder="Rechercher un élément" aria-label="Rechercher dans la carte" autocomplete="off" spellcheck="false" enterkeyhint="search"><button type="button" class="mm-search__clear" aria-label="Effacer la recherche" hidden>${icon('close', 14)}</button></label>
        <p class="mm-count mono" aria-live="polite"></p>
      </div>
      <ol class="mm-m__list"></ol>
      <p class="mm-m__empty" hidden>Aucun résultat pour cette recherche.</p>
    </div>
    <div class="mm-scrim" hidden></div>`;
  const top = host.querySelector('.mm-m__root');
  top.querySelector('strong').textContent = root.title;
  const list = host.querySelector('.mm-m__list');
  const input = host.querySelector('.mm-search input');
  const clearBtn = host.querySelector('.mm-search__clear');
  const countEl = host.querySelector('.mm-count');
  const empty = host.querySelector('.mm-m__empty');
  const scrim = host.querySelector('.mm-scrim');
  countEl.textContent = countText(model);

  const rows = [];
  branches.forEach((b, i) => {
    const li = doc.createElement('li');
    li.className = 'mm-m__item'; li.style.setProperty('--c', b.color); li.dataset.id = b.id;
    li.innerHTML = `
      <h3 class="mm-m__h"><button type="button" class="mm-m__bhead" aria-expanded="false" aria-controls="mm-m-${b.id}" data-cursor="Ouvrir">
        <span class="mm-m__num mono">0${i + 1}</span><span class="mm-m__bt"></span><span class="mm-m__chev">${icon('chev', 18)}</span></button></h3>
      <div class="mm-m__body" id="mm-m-${b.id}" role="region"><div class="mm-m__inner">
        <button type="button" class="mm-m__detail" data-id="${b.id}"><span>Voir le détail de la branche</span>${icon('arrow', 16)}</button>
        <ul class="mm-m__leaves"></ul></div></div>`;
    li.querySelector('.mm-m__bt').textContent = b.title;
    const ul = li.querySelector('.mm-m__leaves');
    b.children.forEach((c) => {
      const l = doc.createElement('li');
      const bt = doc.createElement('button');
      bt.type = 'button'; bt.className = 'mm-m__leaf'; bt.dataset.id = c.id; bt.textContent = c.title;
      l.appendChild(bt); ul.appendChild(l); c.row = l; c.btn = bt;
    });
    b.li = li; b.head = li.querySelector('.mm-m__bhead');
    list.appendChild(li); rows.push(li);
  });

  let selected = null;
  let lastBtn = null;
  const panel = createPanel(host, model, {
    onClose: () => closeSheet(true),
    onSelect: (n) => openSheet(n),
    onCta: () => closeSheet(false),
  });

  function openSheet(n, btn) {
    selected = n; if (btn) lastBtn = btn;
    host.querySelectorAll('.mm-m__leaf.is-active, .mm-m__root.is-active').forEach((x) => x.classList.remove('is-active'));
    const target = n.type === 'leaf' ? n.btn : n.type === 'root' ? top : null;
    if (target) target.classList.add('is-active');
    panel.show(n);
    scrim.hidden = false;
    host.classList.add('has-panel');
    if (window.__lenis && window.__lenis.stop) window.__lenis.stop();
  }
  function closeSheet(restore) {
    selected = null;
    panel.hide();
    scrim.hidden = true;
    host.classList.remove('has-panel');
    host.querySelectorAll('.is-active').forEach((x) => x.classList.remove('is-active'));
    if (window.__lenis && window.__lenis.start) window.__lenis.start();
    if (restore && lastBtn) lastBtn.focus({ preventScroll: true });
  }
  on(scrim, 'click', () => closeSheet(true));
  on(host, 'keydown', (e) => { if (e.key === 'Escape' && panel.open) closeSheet(true); });

  /* accordéon : une branche ouverte à la fois (en recherche, plusieurs) */
  function setOpen(b, val, animate) {
    const was = b.li.classList.contains('is-open');
    b.li.classList.toggle('is-open', val);
    b.head.setAttribute('aria-expanded', String(val));
    if (val && !was && animate && !reduced && gsapOk()) {
      window.gsap.fromTo(b.children.map((c) => c.row), { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.06, ease: 'expo.out', delay: 0.12, clearProps: 'transform,opacity,visibility' });
    }
  }
  on(list, 'click', (e) => {
    const head = e.target.closest('.mm-m__bhead');
    if (head) {
      const b = branches.find((x) => x.head === head);
      const val = !b.li.classList.contains('is-open');
      if (!query) branches.forEach((o) => { if (o !== b) setOpen(o, false); });
      setOpen(b, val, true);
      if (val) setTimeout(() => { const r = b.li.getBoundingClientRect(); if (r.top < 70 || r.top > window.innerHeight * 0.6) window.scrollBy({ top: r.top - 90, behavior: reduced ? 'auto' : 'smooth' }); }, 380);
      return;
    }
    const btn = e.target.closest('[data-id]');
    if (btn) openSheet(model.byId.get(btn.dataset.id), btn);
  });
  on(top, 'click', () => openSheet(root, top));

  /* recherche : filtre les branches et les éléments, ouvre ce qui correspond */
  let query = '';
  function setQuery(raw) {
    const q = norm(raw.trim());
    query = q; clearBtn.hidden = !q;
    let n = 0;
    branches.forEach((b) => {
      const bm = !!q && b.hay.includes(q);
      let any = bm;
      b.children.forEach((c) => {
        const m = !!q && c.hay.includes(q);
        if (m) { n++; any = true; }
        c.row.hidden = !!q && !m && !bm;
        c.btn.classList.toggle('is-match', m);
      });
      if (bm) n++;
      b.li.hidden = !!q && !any;
      b.head.classList.toggle('is-match', bm);
      if (q) setOpen(b, any, false);
    });
    if (!q) branches.forEach((b) => setOpen(b, false, false));
    countEl.textContent = !q ? countText(model) : n ? `${n} résultat${n > 1 ? 's' : ''}` : 'Aucun résultat';
    empty.hidden = !q || n > 0;
  }
  on(input, 'input', () => setQuery(input.value));
  on(input, 'keydown', (e) => { if (e.key === 'Escape' && input.value) { input.value = ''; setQuery(''); } });
  on(clearBtn, 'click', () => { input.value = ''; setQuery(''); input.focus(); });

  /* entrée au scroll */
  let io = null; let st = null; let tl = null;
  const targets = [top, input.closest('.mm-search'), countEl].concat(rows);
  const finish = () => { if (gsapOk()) window.gsap.set(targets, { clearProps: 'opacity,visibility,transform' }); host.classList.remove('is-intro'); host.classList.add('is-ready'); };
  if (reduced || !gsapOk()) finish();
  else {
    host.classList.add('is-intro');
    window.gsap.set(targets, { autoAlpha: 0, y: 22 });
    let played = false;
    const go = () => {
      if (played || signal.aborted) return; played = true;
      tl = window.gsap.timeline({ onComplete: finish });
      tl.to(targets, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'expo.out' });
      tl.fromTo(list, { '--line': 0 }, { '--line': 1, duration: 1.2, ease: 'power2.inOut' }, 0.1);
    };
    if (window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      st = window.ScrollTrigger.create({ trigger: host, start: 'top 80%', once: true, refreshPriority: -1, onEnter: go });
    }
    io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) go(); }, { threshold: [0.05] });
    io.observe(host);
  }

  return {
    destroy() {
      ac.abort(); tl && tl.kill(); st && st.kill(); io && io.disconnect();
      if (window.__lenis && window.__lenis.start) window.__lenis.start();
    },
  };
}

/* ================================================================
   Point d’entrée : desktop ou mobile selon la largeur
   ================================================================ */
function init() {
  const host = doc.querySelector('.mindmap-root');
  if (!host) return;
  const model = buildModel();
  const mq = window.matchMedia('(max-width: 999.98px)');
  let current = null;
  const mount = () => {
    if (current) current.destroy();
    host.innerHTML = '';
    host.className = 'mindmap-root ' + (mq.matches ? 'mm-mobile' : 'mm-desktop');
    current = mq.matches ? mountMobile(host, model) : mountDesktop(host, model);
  };
  mq.addEventListener('change', mount);
  mount();
}

if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
