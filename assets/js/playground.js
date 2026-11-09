// Robot CRÊPE · poste de pilotage (#pilotage)
// Scène WebGL dédiée : OrbitControls, cinématique inverse SCARA, commandes manuelles, retournement de crêpe.
// Le modèle vient de robot.js (buildRobotModel) : même géométrie, mêmes matériaux que le hero.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeRenderer, setupStudio, buildRobotModel, hasWebGL, KIN, toolWorldY, clamp, lerp, ACCENT } from './robot.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const wrapPI = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

// ---------- Données ----------
const AXES = [
  { n: 0, tip: 'Bâti · Colonne fixe' },
  { n: 1, name: 'Pivot bâti / bras', owner: 'Melvin Breton' },
  { n: 2, name: 'Pivot intermédiaire', owner: 'Valentin Caplot' },
  { n: 3, name: 'Glissière verticale', owner: 'Pacôme Grimaud' },
  { n: 4, name: 'Pivot outil', owner: 'Enzo Lallican' },
];
const tipText = (n) => (n === 0 ? AXES[0].tip : `Axe ${n} · ${AXES[n].name} · ${AXES[n].owner}`);

const SLIDERS = [
  { n: 1, key: 'a1', kind: 'Rotation', min: -150, max: 150, step: 0.5, unit: '°', scale: ['−150°', '0°', '+150°'] },
  { n: 2, key: 'a2', kind: 'Rotation', min: -180, max: 180, step: 0.5, unit: '°', scale: ['−180°', '0°', '+180°'] },
  { n: 3, key: 'z', kind: 'Translation', min: 0, max: 150, step: 0.5, unit: ' mm', scale: ['0', '75', '150 mm'] },
  { n: 4, key: 'a4', kind: 'Rotation', min: 0, max: 360, step: 1, unit: '°', scale: ['0°', '180°', '360°'] },
];

// Géométrie de travail (1 unité = 100 mm)
const [LX, LZ] = KIN.TOOL;
const R2 = Math.hypot(LX, LZ); // rayon du point outil autour du pivot B
const BETA = Math.atan2(-LZ, LX);
const RMAX = KIN.L1 + R2 - 0.03;
const RMIN = 2.7;
const PLANE_Y = toolWorldY(KIN.J3_MIN); // hauteur de la spatule en bas de course
const PAN_TOP = PLANE_Y - 0.05; // surface de la crêpière
const CREPE_C = { u: 5.41, v: -1.45 }; // centre de la crêpière, repère (u = x, v = -z)
const Z_HOVER = 38; // hauteur de survol en mode suivi (mm)
const ELBOW_DEFAULT = -1;

// Cinématique directe : point outil dans le plan (u, v) = (x, -z)
function fk(th1, th2) {
  const phi = th1 + th2;
  return {
    u: KIN.L1 * Math.cos(th1) + LX * Math.cos(phi) + LZ * Math.sin(phi),
    v: KIN.L1 * Math.sin(th1) + LX * Math.sin(phi) - LZ * Math.cos(phi),
  };
}
// Cinématique inverse analytique (deux solutions), limites ±150° sur l'axe 1.
// elbow : signe du coude préféré (le coude courant tient tant qu'il reste dans les limites).
function ik(u, v, elbow = ELBOW_DEFAULT) {
  let D = Math.hypot(u, v) || 1e-6;
  let reach = true;
  let cu = u, cv = v;
  if (D > RMAX) { cu = (u / D) * RMAX; cv = (v / D) * RMAX; D = RMAX; reach = false; }
  else if (D < RMIN) { cu = (u / D) * RMIN; cv = (v / D) * RMIN; D = RMIN; reach = false; }
  const c = clamp((D * D - KIN.L1 * KIN.L1 - R2 * R2) / (2 * KIN.L1 * R2), -1, 1);
  const sol = (s) => {
    const p2 = s * Math.acos(c);
    const th1 = wrapPI(Math.atan2(cv, cu) - Math.atan2(R2 * Math.sin(p2), KIN.L1 + R2 * Math.cos(p2)));
    return { th1, th2: wrapPI(p2 - BETA), elbow: s };
  };
  let a = sol(elbow >= 0 ? 1 : -1);
  if (Math.abs(a.th1) > KIN.LIM1) {
    const b = sol(elbow >= 0 ? -1 : 1);
    if (Math.abs(b.th1) <= KIN.LIM1) a = b;
    else {
      // hors du secteur de l'axe 1 : on bloque l'axe 1 à sa butée, l'axe 2 vise la cible au plus près
      const th1 = clamp(Math.abs(a.th1) < Math.abs(b.th1) ? a.th1 : b.th1, -KIN.LIM1, KIN.LIM1);
      const p2u = KIN.L1 * Math.cos(th1), p2v = KIN.L1 * Math.sin(th1);
      const psi = Math.atan2(cv - p2v, cu - p2u);
      a = { th1, th2: wrapPI(psi - th1 - BETA), elbow: a.elbow };
      reach = false;
    }
  }
  return { ...a, reach, u: cu, v: cv };
}

const nf = (v, d = 1, w = 3, sign = true) => {
  if (Math.abs(v) < 0.5 * Math.pow(10, -d)) v = 0;
  const s = v < 0 ? '−' : sign ? '+' : '';
  const [i, f] = Math.abs(v).toFixed(d).split('.');
  return s + i.padStart(w, '0') + (f ? ',' + f : '');
};

// ---------- DOM ----------
const root = document.querySelector('.play-root');
if (root) init(root);

function init(root) {
  if (!hasWebGL()) {
    root.innerHTML = '<div class="play-fallback"><p>Le poste de pilotage demande WebGL, indisponible sur cet appareil.</p></div>';
    return;
  }
  root.innerHTML = `
    <div class="play-stage" data-mode="follow">
      <div class="play-view">
        <canvas class="play-canvas" data-cursor="Piloter" role="img" aria-label="Robot CRÊPE en 3D. Le bras suit le curseur ; faites glisser pour tourner la vue."></canvas>
        <div class="play-tip" aria-hidden="true"></div>
        <p class="play-hint" aria-hidden="true">${coarse
          ? '<span>Un doigt&nbsp;: le bras suit</span><i></i><span>Deux doigts&nbsp;: tourner et zoomer</span>'
          : '<span>Bougez le curseur&nbsp;: le bras suit</span><i></i><span>Glissez pour tourner</span><i class="play-hint__wheel"></i><span class="play-hint__wheel">Cliquez puis molette pour zoomer</span>'}</p>
        <p class="play-state" data-state-label>Suivi du curseur</p>
        <ul class="play-telemetry" aria-label="Télémétrie">
          <li data-t="a1"><span>Axe 1</span><b>+000,0°</b></li>
          <li data-t="a2"><span>Axe 2</span><b>+000,0°</b></li>
          <li data-t="z"><span>Axe 3 · Z</span><b>000,0 mm</b></li>
          <li data-t="a4"><span>Axe 4</span><b>000,0°</b></li>
          <li data-t="x"><span>Outil X</span><b>+000,0 mm</b></li>
          <li data-t="y"><span>Outil Y</span><b>+000,0 mm</b></li>
          <li data-t="etat"><span>Portée</span><b>OK</b></li>
        </ul>
      </div>
      <aside class="play-panel" aria-label="Commandes du robot">
        <header class="play-panel__head"><span class="play-panel__title">Poste de pilotage</span><span class="play-chip" data-chip>Suivi du curseur</span></header>
        <div class="play-axes">
          ${SLIDERS.map((s) => `
          <div class="play-axis" data-axis="${s.n}">
            <div class="play-axis__head">
              <button type="button" class="play-axis__id" data-focus="${s.n}" aria-label="Centrer la vue sur l’axe ${s.n}">A${s.n}</button>
              <span class="play-axis__name">${AXES[s.n].name}<small>${s.kind}</small></span>
              <output class="mono" data-out="${s.key}" for="play-${s.key}"></output>
            </div>
            <input id="play-${s.key}" type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="0" data-key="${s.key}" aria-label="Axe ${s.n}, ${s.kind.toLowerCase()}, de ${s.scale[0]} à ${s.scale[2]}">
            <div class="play-axis__scale" aria-hidden="true">${s.scale.map((t) => `<span>${t}</span>`).join('')}</div>
          </div>`).join('')}
        </div>
        <div class="play-actions">
          <button type="button" class="play-btn play-btn--main" data-act="follow" aria-pressed="true">Suivre le curseur</button>
          <button type="button" class="play-btn play-btn--main" data-act="flip">Retourner la crêpe</button>
          <div class="play-actions__row">
            <button type="button" class="play-btn" data-act="explode" aria-pressed="false">Vue éclatée</button>
            <button type="button" class="play-btn" data-act="reset">Réinitialiser</button>
          </div>
        </div>
      </aside>
    </div>`;

  const stage = root.querySelector('.play-stage');
  const view = root.querySelector('.play-view');
  const canvas = root.querySelector('.play-canvas');
  const panel = root.querySelector('.play-panel');
  const tip = root.querySelector('.play-tip');
  const chip = root.querySelector('[data-chip]');
  const stateLabel = root.querySelector('[data-state-label]');
  const inputs = Object.fromEntries([...root.querySelectorAll('input[type=range]')].map((i) => [i.dataset.key, i]));
  const outs = Object.fromEntries([...root.querySelectorAll('[data-out]')].map((o) => [o.dataset.out, o]));
  const tele = Object.fromEntries([...root.querySelectorAll('[data-t]')].map((li) => [li.dataset.t, li.querySelector('b')]));
  const btn = Object.fromEntries([...root.querySelectorAll('[data-act]')].map((b) => [b.dataset.act, b]));
  const axisRows = [...root.querySelectorAll('.play-axis')];

  // La hauteur est réservée par le CSS ; on rafraîchit ScrollTrigger une fois la mise en page stable.
  const refreshST = () => { if (window.ScrollTrigger) { try { ScrollTrigger.refresh(); } catch (e) { /* ignore */ } } };
  window.addEventListener('load', () => setTimeout(refreshST, 300), { once: true });

  let started = false;
  let api = null;
  const io = new IntersectionObserver((entries) => {
    const vis = entries[0].isIntersecting;
    if (vis && !started) {
      started = true;
      try { api = start(); } catch (e) {
        console.warn('[pilotage] 3D indisponible : ' + (e && e.message));
        root.innerHTML = '<div class="play-fallback"><p>Le poste de pilotage n’a pas pu démarrer sur cet appareil.</p></div>';
        return;
      }
    }
    if (api) api.setVisible(vis);
  }, { rootMargin: '200px 0px 200px 0px' });
  io.observe(stage);

  // =====================================================================
  function start() {
    const renderer = makeRenderer(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    const studio = setupStudio(renderer, scene, { extent: 12, mapSize: 2048 });
    studio.key.position.set(8, 14, 9);

    // ----- Sol : grille fine, fondu radial, ombre douce -----
    const gridMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(0xf3eee6) }, uFade: { value: 15 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `varying vec3 vW; uniform vec3 uColor; uniform float uFade;
        float grid(vec2 p, float s){ vec2 q = p / s; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - min(min(g.x, g.y), 1.0); }
        void main(){
          float d = length(vW.xz - vec2(2.5, 0.0));
          float fade = 1.0 - smoothstep(3.0, uFade, d);
          float a = (grid(vW.xz, 1.0) * 0.07 + grid(vW.xz, 5.0) * 0.16) * fade;
          gl_FragColor = vec4(uColor, a);
        }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), gridMat);
    floor.rotation.x = -Math.PI / 2;
    floor.renderOrder = -2;
    scene.add(floor);
    const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.42 }));
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = 0.003;
    shadowFloor.receiveShadow = true;
    shadowFloor.renderOrder = -1;
    scene.add(shadowFloor);

    // ----- Robot -----
    const model = buildRobotModel();
    scene.add(model.root);
    const { j1, j2, j3, j4 } = model.joints;
    const pickables = model.meshes;

    // ----- Crêpière, support et crêpe -----
    const metal = new THREE.MeshPhysicalMaterial({ color: 0x2e2a26, metalness: 0, roughness: 0.7, specularIntensity: 0.18, envMapIntensity: 0.5 });
    const steel = new THREE.MeshPhysicalMaterial({ color: 0xcfd2d6, metalness: 1, roughness: 0.3 });
    const cx = CREPE_C.u, cz = -CREPE_C.v;
    const pan = new THREE.Group();
    pan.position.set(cx, 0, cz);
    const panDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.16, 72), metal);
    panDisc.position.y = PAN_TOP - 0.08;
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, PAN_TOP - 0.16, 40), steel);
    pedestal.position.y = (PAN_TOP - 0.16) / 2;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.07, 56), steel);
    foot.position.y = 0.035;
    for (const m of [panDisc, pedestal, foot]) { m.castShadow = true; m.receiveShadow = true; pan.add(m); }
    const panRing = new THREE.Mesh(new THREE.RingGeometry(1.74, 1.78, 96), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    panRing.rotation.x = -Math.PI / 2;
    panRing.position.y = PAN_TOP + 0.002;
    pan.add(panRing);
    scene.add(pan);

    // crêpe : lentille dorée bombée, face dessus claire, face dessous plus cuite
    const CR = 0.62;
    const crepeGeo = (() => {
      const pts = [];
      const N = 18;
      for (let i = 0; i <= N; i++) { const a = (i / N) * (Math.PI / 2); pts.push(new THREE.Vector2(CR * Math.sin(a), 0.012 + 0.016 * Math.cos(a))); }
      for (let i = N; i >= 0; i--) { const a = (i / N) * (Math.PI / 2); pts.push(new THREE.Vector2(CR * Math.sin(a), -(0.012 + 0.016 * Math.cos(a)))); }
      const g = new THREE.LatheGeometry(pts, 72);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const top = new THREE.Color(0xeebf68), topEdge = new THREE.Color(0xc98a37), bot = new THREE.Color(0xa65a1a), botSpot = new THREE.Color(0x5a2608), tmp = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const r = Math.hypot(x, z) / CR;
        const n = 0.5 + 0.5 * Math.sin(x * 21 + Math.sin(z * 17) * 1.6) * Math.sin(z * 19 + Math.cos(x * 15) * 1.4);
        if (y > 0.001) tmp.copy(top).lerp(topEdge, clamp(r * r * 0.9 + n * 0.28));
        else if (y < -0.001) tmp.copy(bot).lerp(botSpot, clamp(n * 0.85 + r * 0.15));
        else tmp.copy(topEdge).lerp(botSpot, 0.35);
        col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
    })();
    const crepe = new THREE.Group();
    const disc = new THREE.Mesh(crepeGeo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.72, sheen: 0.5, sheenColor: new THREE.Color(0xffd9a0), side: THREE.DoubleSide }));
    disc.castShadow = true;
    disc.receiveShadow = true;
    crepe.add(disc);
    scene.add(crepe);
    const REST_Y = PAN_TOP + 0.03;
    const cr = { mode: 'rest', slide: 0, h: 0, spin: 0, flip: 0, x: cx, z: cz, y: REST_Y, drop: 0 };

    // ----- Portée : arc pointillé ±150°, limite basse, graduations -----
    const reachGroup = new THREE.Group();
    reachGroup.position.y = PLANE_Y + 0.012;
    const dashed = (pts, op, dash = 0.16, gap = 0.12) => {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: ACCENT, transparent: true, opacity: op, dashSize: dash, gapSize: gap, depthWrite: false }));
      l.computeLineDistances();
      return l;
    };
    const polar = (r, a) => new THREE.Vector3(r * Math.cos(a), 0, -r * Math.sin(a));
    const arc = [];
    for (let i = 0; i <= 120; i++) arc.push(polar(RMAX, -KIN.LIM1 + (2 * KIN.LIM1 * i) / 120));
    reachGroup.add(dashed(arc, 0.8));
    const inner = [];
    for (let i = 0; i <= 120; i++) inner.push(polar(RMIN, -KIN.LIM1 + (2 * KIN.LIM1 * i) / 120));
    reachGroup.add(dashed(inner, 0.28, 0.1, 0.1));
    reachGroup.add(dashed([polar(RMIN, KIN.LIM1), polar(RMAX, KIN.LIM1)], 0.35, 0.1, 0.1));
    reachGroup.add(dashed([polar(RMIN, -KIN.LIM1), polar(RMAX, -KIN.LIM1)], 0.35, 0.1, 0.1));
    const tickPts = [];
    for (let a = -150; a <= 150; a += 30) { tickPts.push(polar(RMAX - 0.12, a * D2R), polar(RMAX + 0.14, a * D2R)); }
    reachGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPts), new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.6, depthWrite: false })));
    scene.add(reachGroup);

    // ----- Cible : anneau caramel + ligne vers la cible hors portée -----
    const target = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.39, 64), ringMat);
    const dotM = new THREE.Mesh(new THREE.CircleGeometry(0.055, 24), ringMat);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.37, 64), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.4, depthTest: false, side: THREE.DoubleSide }));
    for (const m of [ring, dotM, halo]) { m.rotation.x = -Math.PI / 2; m.renderOrder = 10; target.add(m); }
    target.position.y = PLANE_Y + 0.02;
    scene.add(target);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
    const stretch = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: ACCENT, transparent: true, opacity: 0.0, dashSize: 0.12, gapSize: 0.1, depthTest: false }));
    stretch.renderOrder = 9;
    scene.add(stretch);

    // ----- Caméra -----
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.9;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 34;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = 1.5;
    controls.touches = { ONE: -1, TWO: THREE.TOUCH.DOLLY_ROTATE }; // un doigt = piloter, deux doigts = vue
    const HOME = { t: new THREE.Vector3(3.0, 2.6, 0.4), R: 19.5, th: 0.78, ph: 1.12 };
    const setCam = (t, R, th, ph) => {
      controls.target.copy(t);
      camera.position.set(t.x + R * Math.sin(ph) * Math.sin(th), t.y + R * Math.cos(ph), t.z + R * Math.sin(ph) * Math.cos(th));
      controls.update();
    };
    const camNow = () => {
      const off = camera.position.clone().sub(controls.target);
      const R = off.length();
      return { t: controls.target.clone(), R, th: Math.atan2(off.x, off.z), ph: Math.acos(clamp(off.y / R, -1, 1)) };
    };
    let camTween = null;
    function flyTo(t, R, th, ph, dur = 1.3) {
      if (camTween) camTween.kill();
      const c0 = camNow();
      const dth = wrapPI(th - c0.th);
      if (typeof gsap === 'undefined') { setCam(t, R, th, ph); return; }
      const o = { k: 0 };
      camTween = gsap.to(o, {
        k: 1, duration: reduced ? dur * 0.3 : dur, ease: 'power3.inOut',
        onUpdate() {
          const k = o.k;
          setCam(c0.t.clone().lerp(t, k), lerp(c0.R, R, k), c0.th + dth * k, lerp(c0.ph, ph, k));
        },
      });
    }
    const homeR = () => HOME.R * (camera.aspect < 1 ? 1.28 : 1);
    const goHome = (dur) => flyTo(HOME.t, homeR(), HOME.th, HOME.ph, dur);
    setCam(HOME.t, homeR(), HOME.th, HOME.ph);

    // molette : seulement après un clic dans la scène, pour ne pas piéger le défilement de la page
    let engaged = false;
    view.addEventListener('wheel', (e) => { if (!engaged && !e.ctrlKey) e.stopImmediatePropagation(); }, { capture: true, passive: true });
    let orbiting = false;
    controls.addEventListener('start', () => { orbiting = true; if (camTween) camTween.kill(); });
    controls.addEventListener('end', () => { orbiting = false; });

    // ----- État du robot -----
    const st = { th1: 0, th2: 0, j3y: -1.0, a4: 0, elbow: ELBOW_DEFAULT, mode: 'follow' };
    const man = { th1: 0, th2: 0, z: 140, a4: 0 }; // consignes manuelles (rad / mm)
    const raw = { u: CREPE_C.u, v: CREPE_C.v, ok: true }; // point visé sous le curseur
    const sm = { u: 2.2, v: 0 }; // point visé lissé
    const smBase = fk(0, 0);
    sm.u = smBase.u; sm.v = smBase.v;
    const jy = (zmm) => KIN.J3_MIN + zmm / 100;
    const zOf = (y) => (y - KIN.J3_MIN) * 100;
    let usedPointer = false;
    let hoverAxis = -1, focusAxis = -1, uiHover = -1;
    const hv = [0, 0, 0, 0, 0];
    const E = { v: 0 };
    let expTl = null, seqTl = null;
    let explodeOn = false;

    function setMode(m) {
      st.mode = m;
      stage.dataset.mode = m;
      refreshLabel();
      btn.follow.setAttribute('aria-pressed', String(m === 'follow'));
      const seq = m === 'seq';
      btn.follow.disabled = seq;
      btn.flip.disabled = seq;
      Object.values(inputs).forEach((i) => { i.disabled = seq; });
    }

    function refreshLabel() {
      const m = st.mode;
      const label = m === 'follow' ? 'Suivi du curseur' : m === 'manual' ? 'Mode manuel' : 'Séquence en cours';
      chip.textContent = label;
      stateLabel.textContent = m === 'follow' && focusAxis >= 0 ? (focusAxis === 0 ? 'Vue centrée sur le bâti' : `Vue centrée sur l’axe ${focusAxis}`) + ' · cliquez de nouveau pour reprendre' : label;
    }

    function syncSliders() {
      const v = { a1: st.th1 * R2D, a2: wrapPI(st.th2) * R2D, z: zOf(st.j3y), a4: ((st.a4 * R2D) % 360 + 360) % 360 };
      for (const s of SLIDERS) {
        const i = inputs[s.key];
        const val = clamp(v[s.key], s.min, s.max);
        if (document.activeElement !== i || st.mode !== 'manual') i.value = String(val);
        i.style.setProperty('--p', ((val - s.min) / (s.max - s.min)) * 100 + '%');
        const txt = (s.key === 'z' ? nf(val, 1, 3, false) : nf(val, 1, 3, s.key !== 'a4')) + s.unit;
        if (outs[s.key].textContent !== txt) outs[s.key].textContent = txt;
      }
    }

    // sliders : toucher bascule en manuel (la pose courante devient la consigne)
    function takeManual() {
      if (st.mode !== 'follow') return;
      man.th1 = st.th1; man.th2 = wrapPI(st.th2); man.z = zOf(st.j3y); man.a4 = st.a4;
      setMode('manual');
    }
    for (const s of SLIDERS) {
      const i = inputs[s.key];
      i.addEventListener('pointerdown', takeManual);
      i.addEventListener('focus', () => { if (st.mode === 'follow') takeManual(); });
      i.addEventListener('input', () => {
        takeManual();
        const val = parseFloat(i.value);
        if (s.key === 'a1') man.th1 = val * D2R;
        else if (s.key === 'a2') man.th2 = val * D2R;
        else if (s.key === 'z') man.z = val;
        else man.a4 = val * D2R;
      });
    }
    axisRows.forEach((row) => {
      const n = +row.dataset.axis;
      row.addEventListener('pointerenter', () => { uiHover = n; row.classList.add('is-hot'); });
      row.addEventListener('pointerleave', () => { uiHover = -1; row.classList.remove('is-hot'); });
      row.addEventListener('focusin', () => { uiHover = n; row.classList.add('is-hot'); });
      row.addEventListener('focusout', () => { uiHover = -1; row.classList.remove('is-hot'); });
      row.querySelector('[data-focus]').addEventListener('click', () => focusOn(n));
    });

    // ----- Recentrage sur un axe -----
    function focusOn(n) {
      if (focusAxis === n) { focusAxis = -1; refreshLabel(); goHome(); return; }
      focusAxis = n;
      refreshLabel();
      const p = n === 0 ? new THREE.Vector3(0, 2.6, 0) : model.anchors[n].getWorldPosition(new THREE.Vector3());
      const c = camNow();
      flyTo(p, clamp(Math.min(c.R, n === 0 ? 14 : 12.5), controls.minDistance + 1, controls.maxDistance), c.th, clamp(c.ph, 0.9, 1.35), 1.2);
    }

    // ----- Pointeur : survol, cible, clic -----
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLANE_Y);
    const hit = new THREE.Vector3();
    const ptr = { inside: false, x: 0, y: 0, down: false, dx: 0, dy: 0, t: 0, moved: false, touches: new Set(), type: 'mouse' };
    function castAt(cx2, cy2) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((cx2 - r.left) / r.width) * 2 - 1, -((cy2 - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
    }
    function pickAxis() {
      const h = ray.intersectObjects(pickables, false);
      return h.length ? h[0].object.userData.axis : -1;
    }
    canvas.addEventListener('pointermove', (e) => {
      ptr.inside = true; ptr.x = e.clientX; ptr.y = e.clientY; ptr.type = e.pointerType;
      if (ptr.down && Math.hypot(e.clientX - ptr.dx, e.clientY - ptr.dy) > 6) ptr.moved = true;
    });
    canvas.addEventListener('pointerdown', (e) => {
      ptr.inside = true; ptr.x = e.clientX; ptr.y = e.clientY; ptr.type = e.pointerType;
      ptr.down = true; ptr.moved = false; ptr.dx = e.clientX; ptr.dy = e.clientY; ptr.t = e.timeStamp;
      if (e.pointerType === 'touch') ptr.touches.add(e.pointerId);
      else engaged = true;
    });
    const up = (e) => {
      ptr.touches.delete(e.pointerId);
      const wasDown = ptr.down;
      ptr.down = false;
      if (e.pointerType === 'touch') { ptr.inside = ptr.touches.size > 0; hoverAxis = -1; }
      if (wasDown && e.type === 'pointerup' && !ptr.moved && e.timeStamp - ptr.t < 450 && e.button === 0 && ptr.touches.size === 0) {
        castAt(e.clientX, e.clientY);
        const n = pickAxis();
        if (n >= 0) focusOn(n);
      }
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; ptr.inside = false; engaged = false; hoverAxis = -1; });
    window.addEventListener('blur', () => { engaged = false; });

    // ----- Boutons -----
    btn.follow.addEventListener('click', () => {
      if (st.mode === 'seq') return;
      const p = fk(st.th1, st.th2);
      sm.u = p.u; sm.v = p.v; raw.u = p.u; raw.v = p.v;
      usedPointer = true;
      setMode('follow');
    });
    btn.reset.addEventListener('click', () => resetAll());
    btn.explode.addEventListener('click', () => toggleExplode());
    btn.flip.addEventListener('click', () => runFlip());

    function toggleExplode() {
      if (typeof gsap === 'undefined') return;
      if (expTl) { expTl.kill(); expTl = null; }
      const D = reduced ? 0.4 : 1;
      if (explodeOn) {
        explodeOn = false;
        btn.explode.setAttribute('aria-pressed', 'false');
        gsap.to(E, { v: 0, duration: 1.1 * D, ease: 'expo.inOut' });
        return;
      }
      explodeOn = true;
      btn.explode.setAttribute('aria-pressed', 'true');
      expTl = gsap.timeline({ onComplete: () => { explodeOn = false; btn.explode.setAttribute('aria-pressed', 'false'); expTl = null; } });
      expTl.to(E, { v: 1, duration: 1.4 * D, ease: 'expo.out' }).to(E, { v: 0, duration: 1.3 * D, ease: 'expo.inOut' }, `+=${2.2 * D}`);
    }

    function resetAll() {
      if (seqTl) { seqTl.kill(); seqTl = null; }
      if (expTl) { expTl.kill(); expTl = null; }
      explodeOn = false;
      btn.explode.setAttribute('aria-pressed', 'false');
      if (typeof gsap !== 'undefined') gsap.to(E, { v: 0, duration: reduced ? 0.3 : 0.9, ease: 'expo.inOut', overwrite: true });
      else E.v = 0;
      Object.assign(cr, { mode: 'rest', slide: 0, h: 0, spin: 0, flip: 0, x: cx, z: cz, y: REST_Y });
      st.a4 = 0; st.elbow = ELBOW_DEFAULT;
      focusAxis = -1;
      const p = fk(0, 0);
      sm.u = p.u; sm.v = p.v;
      raw.u = CREPE_C.u; raw.v = CREPE_C.v;
      usedPointer = false;
      idleT = 0;
      setMode('follow');
      goHome(1.4);
    }

    // ----- Séquence : retourner la crêpe -----
    const Q = { u: 0, v: 0, z: 0, a4: 0 };
    function runFlip() {
      if (st.mode === 'seq' || typeof gsap === 'undefined') return;
      const D = reduced ? 0.35 : 1;
      const p0 = fk(st.th1, st.th2);
      Q.u = p0.u; Q.v = p0.v; Q.z = zOf(st.j3y); Q.a4 = (((st.a4 * R2D) % 360) + 360) % 360;
      st.a4 = Q.a4 * D2R;
      st.elbow = ELBOW_DEFAULT;
      setMode('seq');
      const C = { u: cx, v: -cz };
      const sC = ik(C.u, C.v, ELBOW_DEFAULT);
      const g = sC.th1 + sC.th2; // direction de l'avant-bras au centre de la crêpe
      const A = { u: C.u - 2.15 * Math.cos(g), v: C.v - 2.15 * Math.sin(g) };
      const P = { s: 0 }, F = { s: 0 }, O = { s: 0 };
      const toCrepe = () => { cr.mode = 'rest'; cr.x = cx; cr.z = cz; cr.y = REST_Y; };
      toCrepe();
      seqTl = gsap.timeline({
        onComplete: () => {
          seqTl = null;
          const p = fk(st.th1, st.th2);
          sm.u = p.u; sm.v = p.v; raw.u = p.u; raw.v = p.v;
          st.a4 = 0; Q.a4 = 0;
          usedPointer = true;
          setMode('follow');
        },
      });
      seqTl
        // 1. approche au dessus de la crêpe, spatule alignée
        .to(Q, { u: A.u, v: A.v, z: 70, a4: 0, duration: 1.05 * D, ease: 'power2.inOut' })
        // 2. descendre au niveau de la crêpière
        .to(Q, { z: 0, duration: 0.55 * D, ease: 'power2.inOut' })
        // 3. glisser la spatule sous la crêpe
        .to(P, {
          s: 1, duration: 0.95 * D, ease: 'power2.inOut',
          onUpdate() { Q.u = lerp(A.u, C.u, P.s); Q.v = lerp(A.v, C.v, P.s); cr.mode = 'slide'; cr.slide = P.s; },
          onComplete() { cr.mode = 'carry'; cr.h = 0; cr.spin = 0; },
        })
        // 4. monter
        .to(Q, { z: 150, duration: 0.8 * D, ease: 'power2.inOut' })
        .to({}, { duration: 0.12 * D })
        // 5. axe 4 : un tour à 360°/s, la crêpe se retourne en vol
        .addLabel('flip')
        .to(Q, { a4: 360, duration: 1.0 * D, ease: 'none' }, 'flip')
        .to(F, {
          s: 1, duration: 0.88 * D, ease: 'none',
          onUpdate() {
            const s = F.s;
            cr.h = 1.05 * 4 * s * (1 - s);
            cr.spin = s * s * (3 - 2 * s);
            cr.tilt = 0.22 * Math.sin(Math.PI * s);
          },
          onComplete() { cr.h = 0; cr.spin = 0; cr.tilt = 0; cr.flip ^= 1; },
        }, 'flip+=0.08')
        .to({}, { duration: 0.15 * D })
        // 6. redescendre
        .to(Q, { z: 0, duration: 0.8 * D, ease: 'power2.inOut' })
        // 7. poser la crêpe, dégager la spatule
        .add(() => {
          const tp = fk(st.th1, st.th2);
          cr.mode = 'drop'; cr.x = tp.u; cr.z = -tp.v; cr.drop = 0;
        })
        .to(cr, { drop: 1, duration: 0.3 * D, ease: 'power2.out' }, '<')
        .to(O, {
          s: 1, duration: 0.95 * D, ease: 'power2.inOut',
          onUpdate() { Q.u = lerp(C.u, A.u, O.s); Q.v = lerp(C.v, A.v, O.s); },
        }, '<0.1')
        .add(() => { cr.mode = 'rest'; cr.x = cx; cr.z = cz; cr.y = REST_Y; })
        // 8. retour en position de survol
        .to(Q, { z: Z_HOVER, duration: 0.7 * D, ease: 'power2.inOut' });
    }

    // ----- Crêpe : position chaque image -----
    function updateCrepe() {
      const tp = fk(st.th1, st.th2);
      const toolY = toolWorldY(st.j3y);
      const onSpatula = toolY + 0.045;
      const yaw = st.th1 + st.th2;
      disc.rotation.set(Math.PI * (cr.flip + (cr.mode === 'carry' ? cr.spin : 0)), 0, 0);
      crepe.rotation.set(0, 0, 0);
      if (cr.mode === 'rest') {
        crepe.position.set(cr.x, cr.y, cr.z);
      } else if (cr.mode === 'slide') {
        const k = cr.slide;
        const ride = clamp((k - 0.25) / 0.65);
        const e = ride * ride * (3 - 2 * ride);
        const snap = clamp((k - 0.6) / 0.4);
        crepe.position.set(lerp(cx, tp.u, snap), lerp(REST_Y, onSpatula, e), lerp(cz, -tp.v, snap));
      } else if (cr.mode === 'carry') {
        crepe.position.set(tp.u, onSpatula + cr.h, -tp.v);
        crepe.rotation.set(0, yaw, cr.tilt || 0);
      } else if (cr.mode === 'drop') {
        crepe.position.set(cr.x, lerp(onSpatula, REST_Y, cr.drop), cr.z);
      }
    }

    // ----- Étiquette flottante -----
    let tipAxis = -2;
    function updateTip() {
      const show = hoverAxis >= 0 && ptr.inside && !orbiting && ptr.type !== 'touch';
      if (!show) { if (tipAxis !== -2) { tip.classList.remove('is-on'); tipAxis = -2; } return; }
      if (tipAxis !== hoverAxis) {
        tipAxis = hoverAxis;
        tip.textContent = tipText(hoverAxis);
        tip.classList.add('is-on');
      }
      const r = view.getBoundingClientRect();
      const w = tip.offsetWidth;
      const x = clamp(ptr.x - r.left + 16, 8, r.width - w - 8);
      const y = clamp(ptr.y - r.top - 38, 8, r.height - 40);
      tip.style.transform = `translate(${x}px, ${y}px)`;
    }

    // ----- Dimensions -----
    let W = 1, H = 1, panelShift = 0;
    function resize() {
      const r = view.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      renderer.setPixelRatio(Math.min(devicePixelRatio, W < 768 ? 1.5 : 2));
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      const desktop = matchMedia('(min-width: 900px)').matches;
      panelShift = desktop ? (panel.offsetWidth + 24) / 2 : 0;
      stage.style.setProperty('--panel-w', desktop ? panel.offsetWidth + 'px' : '');
      if (panelShift) camera.setViewOffset(W, H, panelShift, 0, W, H); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      controls.maxDistance = camera.aspect < 1 ? 46 : 34;
    }
    new ResizeObserver(resize).observe(view);
    resize();
    if (camera.aspect < 1) setCam(HOME.t, homeR(), HOME.th, HOME.ph);

    // ----- Boucle -----
    let last = performance.now(), time = 0, idleT = 0, running = false, firstFrame = true, tele_t = 0;
    const planeHit = new THREE.Vector3();
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      controls.update();

      // survol et point visé
      const touching = ptr.type === 'touch';
      if (ptr.inside && !orbiting && st.mode !== 'seq') {
        castAt(ptr.x, ptr.y);
        hoverAxis = touching ? -1 : pickAxis();
        const canAim = focusAxis < 0 && (touching ? ptr.touches.size === 1 : !ptr.down || !ptr.moved);
        if (st.mode === 'follow' && canAim && ray.ray.intersectPlane(plane, planeHit)) {
          raw.u = planeHit.x; raw.v = -planeHit.z; usedPointer = true;
        }
      } else if (!ptr.inside) hoverAxis = -1;

      // respiration avant la première interaction
      if (st.mode === 'follow' && !usedPointer && !reduced) {
        idleT += dt;
        raw.u = CREPE_C.u + 0.8 * Math.sin(idleT * 0.55); raw.v = CREPE_C.v + 0.9 * Math.sin(idleT * 0.8 + 1);
      } else if (st.mode === 'follow' && !usedPointer) { raw.u = CREPE_C.u; raw.v = CREPE_C.v; }

      // consignes selon le mode
      let kJ = 1 - Math.exp(-dt * (reduced ? 30 : 16));
      let kZ = kJ;
      let aimOk = true, aimLine = false;
      if (st.mode === 'follow') {
        const ks = 1 - Math.exp(-dt * (reduced ? 30 : 9));
        sm.u += (raw.u - sm.u) * ks; sm.v += (raw.v - sm.v) * ks;
        const s = ik(sm.u, sm.v, st.elbow);
        st.elbow = s.elbow; aimOk = s.reach;
        aimLine = !s.reach;
        st.th1 += wrapPI(s.th1 - st.th1) * kJ;
        st.th2 += wrapPI(s.th2 - st.th2) * kJ;
        st.j3y += (jy(Z_HOVER) - st.j3y) * kZ * 0.7;
        st.a4 += (0 - st.a4) * kJ * 0.7;
      } else if (st.mode === 'manual') {
        st.th1 += (man.th1 - st.th1) * kJ;
        st.th2 += wrapPI(man.th2 - st.th2) * kJ;
        st.j3y += (jy(man.z) - st.j3y) * kZ;
        st.a4 += (man.a4 - st.a4) * kJ;
        st.th1 = clamp(st.th1, -KIN.LIM1, KIN.LIM1);
      } else {
        const s = ik(Q.u, Q.v, ELBOW_DEFAULT);
        const ks = 1 - Math.exp(-dt * 24);
        st.th1 += wrapPI(s.th1 - st.th1) * ks;
        st.th2 += wrapPI(s.th2 - st.th2) * ks;
        st.j3y = jy(Q.z);
        st.a4 = Q.a4 * D2R;
        st.elbow = s.elbow;
      }
      // garde-fou : l'axe 1 reste dans ses butées, l'axe 2 dans ±180°
      st.th1 = clamp(Number.isFinite(st.th1) ? st.th1 : 0, -KIN.LIM1, KIN.LIM1);
      st.th2 = Number.isFinite(st.th2) ? wrapPI(st.th2) : 0;
      j1.rotation.y = st.th1;
      j2.rotation.y = st.th2;
      j3.position.y = st.j3y;
      j4.rotation.x = st.a4;

      // éclatement, mise en valeur des axes
      model.setExplode(E.v);
      const kh = 1 - Math.exp(-dt * 10);
      let F2 = 0;
      for (let n = 0; n <= 4; n++) {
        const on = n === hoverAxis || n === focusAxis || n === uiHover ? 1 : 0;
        hv[n] += (on - hv[n]) * kh;
        F2 = Math.max(F2, hv[n]);
      }
      const edgeBase = E.v * 0.3;
      for (let n = 0; n <= 4; n++) model.setAxisLook(n, lerp(1, 0.4, F2 * (1 - hv[n])), lerp(edgeBase * (1 - F2 * 0.8), 0.95, hv[n]), hv[n]);

      updateCrepe();

      // cible
      const showTarget = st.mode === 'follow';
      target.visible = showTarget;
      stretch.visible = showTarget;
      if (showTarget) {
        target.position.set(raw.u, PLANE_Y + 0.02, -raw.v);
        const pulse = reduced ? 1 : 1 + 0.08 * Math.sin(time * 3.2);
        halo.scale.setScalar(1.35 + 0.25 * Math.sin(time * 2.4 + 1));
        ring.scale.setScalar(pulse);
        ringMat.opacity = aimOk ? 0.95 : 0.55;
        const tp = fk(st.th1, st.th2);
        const pos = lineGeo.attributes.position;
        pos.setXYZ(0, tp.u, PLANE_Y + 0.02, -tp.v);
        pos.setXYZ(1, raw.u, PLANE_Y + 0.02, -raw.v);
        pos.needsUpdate = true;
        stretch.computeLineDistances();
        stretch.material.opacity = aimLine ? 0.7 : 0;
      }

      syncSliders();
      tele_t += dt;
      if (tele_t > 0.05) {
        tele_t = 0;
        const tp = fk(st.th1, st.th2);
        const set = (k, txt) => { if (tele[k].textContent !== txt) tele[k].textContent = txt; };
        set('a1', nf(st.th1 * R2D) + '°');
        set('a2', nf(wrapPI(st.th2) * R2D) + '°');
        set('z', nf(zOf(st.j3y), 1, 3, false) + ' mm');
        set('a4', nf(((st.a4 * R2D) % 360 + 360) % 360, 1, 3, false) + '°');
        set('x', nf(tp.u * 100, 1, 3) + ' mm');
        set('y', nf(tp.v * 100, 1, 3) + ' mm');
        set('etat', st.mode === 'follow' && !aimOk ? 'LIMITE' : 'OK');
      }
      updateTip();

      renderer.render(scene, camera);
      if (firstFrame) { firstFrame = false; stage.dataset.ready = '1'; }
    }

    function setVisible(v) {
      if (v === running) return;
      running = v;
      last = performance.now();
      renderer.setAnimationLoop(v ? tick : null);
    }
    setMode('follow');

    const dbg = { st, cr, Q, man, raw, fk, ik, model, camera, controls, setMode, runFlip, resetAll, toggleExplode, focusOn, get mode() { return st.mode; }, get hover() { return hoverAxis; } };
    return { setVisible, dbg };
  }
}
