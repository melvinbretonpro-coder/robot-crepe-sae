// Robot CRÊPE : modèle SCARA 4 axes procédural.
// - buildRobotModel() : géométries, matériaux, articulations (réutilisable, une instance par scène)
// - setupStudio() / makeRenderer() : rendu et éclairage premium communs
// - createRobot() : version hero / vue éclatée pilotée par le scroll (API figée avec main.js)
// - KIN : constantes de cinématique partagées avec le poste de pilotage (playground.js)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PHASES = {
  intro: [0.0, 0.1],
  explode: [0.1, 0.24],
  axe1: [0.24, 0.41],
  axe2: [0.41, 0.58],
  axe3: [0.58, 0.75],
  axe4: [0.75, 0.92],
  assemble: [0.92, 1.0],
};

// 1 unité = 100 mm. Le point outil est le centre de la spatule (sklisen).
export const KIN = {
  L1: 3.05, // entraxe pivot A / pivot B
  TOOL: [4.4, 0.42], // centre de la spatule dans le repère de l'axe 2 (x le long du bras, z latéral)
  J1_Y: 5.55, // hauteur du pivot A
  A3_Y: -0.6, // décalage vertical de la glissière dans le repère de l'axe 2
  TOOL_DY: -0.1, // décalage vertical du pivot outil par rapport au chariot
  J3_MIN: -2.4, // chariot en bas de course
  J3_MAX: -0.9, // chariot en haut de course (150 mm)
  LIM1: (150 * Math.PI) / 180,
};
// hauteur monde de la spatule quand le chariot est à la cote y (repère glissière)
export const toolWorldY = (j3y) => KIN.J1_Y + KIN.A3_Y + j3y + KIN.TOOL_DY;

export const ACCENT = new THREE.Color(0xe3a857);
export const WHITE = new THREE.Color(0xf3eee6);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
const wrapPI = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };

export function hasWebGL() {
  const test = document.createElement('canvas');
  return !!(test.getContext('webgl2') || test.getContext('webgl'));
}

export function makeRenderer(canvas, opts = {}) {
  if (!hasWebGL()) throw new Error('WebGL indisponible');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

// Éclairage premium : clé chaude, contre-jour froid, remplissage doux, environnement studio
export function setupStudio(renderer, scene, o = {}) {
  const ext = o.extent ?? 9;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;
  const key = new THREE.DirectionalLight(0xffe0b8, 2.4);
  key.position.set(7, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(o.mapSize ?? 2048, o.mapSize ?? 2048);
  Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 40 });
  key.shadow.radius = 6;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 1.8);
  rim.position.set(-9, 6, -7);
  scene.add(rim);
  const warmRim = new THREE.PointLight(0xe3a857, 18, 18, 1.6);
  warmRim.position.set(-2, 3, 4);
  scene.add(warmRim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.35));
  return { key, rim, warmRim, pmrem };
}

// Construit le robot complet. Renvoie le groupe racine, les articulations, les ancres
// et les fonctions d'éclatement / mise en valeur d'un axe. Une instance par scène.
export function buildRobotModel() {
  // Matériaux de base (clonés par axe pour le mode fantôme)
  const BASE = {
    steel: new THREE.MeshPhysicalMaterial({ color: 0xcfd2d6, metalness: 1, roughness: 0.26 }),
    alu: new THREE.MeshPhysicalMaterial({ color: 0xb9bdc3, metalness: 1, roughness: 0.38 }),
    graphite: new THREE.MeshPhysicalMaterial({ color: 0x2b2d31, metalness: 0.55, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
    motor: new THREE.MeshPhysicalMaterial({ color: 0x141518, metalness: 0.5, roughness: 0.5 }),
    pla: new THREE.MeshPhysicalMaterial({ color: 0xe9e2d6, metalness: 0, roughness: 0.62, sheen: 0.3 }),
    rubber: new THREE.MeshPhysicalMaterial({ color: 0x1d1d1f, metalness: 0, roughness: 0.85 }),
    wood: new THREE.MeshPhysicalMaterial({ color: 0xd8b585, metalness: 0, roughness: 0.68 }),
    iglidur: new THREE.MeshPhysicalMaterial({ color: 0xd9a441, metalness: 0.1, roughness: 0.45 }),
  };
  const axisMats = [0, 1, 2, 3, 4].map(() => ({}));
  const axisEdgeMat = [0, 1, 2, 3, 4].map(() => new THREE.LineBasicMaterial({ color: WHITE.clone(), transparent: true, opacity: 0, depthWrite: false }));
  const matFor = (axis, key) => (axisMats[axis][key] ||= BASE[key].clone());

  const parts = []; // { obj, base, vec, delay }
  const rbox = (w, h, d, r = 0.04) => {
    const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.1, h / 2.1, d / 2.1));
    g.userData.edge = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
    return g;
  };
  const cyl = (r, h, seg = 40, rt = r) => {
    const g = new THREE.CylinderGeometry(rt, r, h, seg);
    g.userData.edge = new THREE.EdgesGeometry(g, 35);
    return g;
  };

  function part(parent, geom, matKey, axis, pos, vec = [0, 0, 0], opts = {}) {
    const m = new THREE.Mesh(geom, matFor(axis, matKey));
    m.position.set(...pos);
    if (opts.rot) m.rotation.set(...opts.rot);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.axis = axis;
    const edgeGeom = geom.userData.edge;
    if (edgeGeom && !opts.noEdge) m.add(new THREE.LineSegments(edgeGeom, axisEdgeMat[axis]));
    parent.add(m);
    parts.push({ obj: m, base: m.position.clone(), vec: new THREE.Vector3(...vec), delay: opts.delay ?? Math.random() * 0.35 });
    return m;
  }
  function group(parent, pos, axis, vec = [0, 0, 0], delay = 0.1) {
    const g = new THREE.Group();
    g.position.set(...pos);
    parent.add(g);
    parts.push({ obj: g, base: g.position.clone(), vec: new THREE.Vector3(...vec), delay });
    return g;
  }
  function bolts(parent, axis, pts, y, vec, r = 0.035) {
    pts.forEach(([x, z]) => part(parent, cyl(r, 0.05, 6), 'steel', axis, [x, y, z], vec, { noEdge: true }));
  }
  function pulley(parent, axis, pos, r, vec, rotX = 0) {
    const g = group(parent, pos, axis, vec, 0.2);
    if (rotX) g.rotation.x = rotX;
    part(g, cyl(r, 0.12, 48), 'alu', axis, [0, 0, 0]);
    part(g, cyl(r * 1.18, 0.018, 48), 'alu', axis, [0, 0.07, 0], [0, 0.15, 0], { noEdge: true });
    part(g, cyl(r * 1.18, 0.018, 48), 'alu', axis, [0, -0.07, 0], [0, -0.15, 0], { noEdge: true });
    part(g, cyl(r * 0.45, 0.16, 24), 'steel', axis, [0, 0.02, 0], [0, 0, 0], { noEdge: true });
    return g;
  }
  function belt(parent, axis, a, b, ra, rb, vec, vertical = false) {
    // contour en stade autour de deux poulies (plan horizontal ou vertical)
    const pts = [];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const ang = Math.atan2(dz, dx);
    const N = 28;
    for (let i = 0; i <= N; i++) { const t = ang + Math.PI / 2 + (Math.PI * i) / N; pts.push([a[0] + Math.cos(t) * ra, a[1] + Math.sin(t) * ra]); }
    for (let i = 0; i <= N; i++) { const t = ang - Math.PI / 2 + (Math.PI * i) / N; pts.push([b[0] + Math.cos(t) * rb, b[1] + Math.sin(t) * rb]); }
    const v3 = pts.map(([u, w]) => (vertical ? new THREE.Vector3(0, w, u) : new THREE.Vector3(u, 0, w)));
    const curve = new THREE.CatmullRomCurve3(v3, true, 'centripetal');
    const geom = new THREE.TubeGeometry(curve, 160, 0.022, 8, true);
    return part(parent, geom, 'rubber', axis, [0, 0, 0], vec, { noEdge: true });
  }
  function nema(parent, axis, pos, s, len, vec, rot) {
    const g = group(parent, pos, axis, vec, 0.15);
    if (rot) g.rotation.set(...rot);
    part(g, rbox(s, len, s, 0.05), 'motor', axis, [0, 0, 0]);
    part(g, rbox(s * 1.02, len * 0.16, s * 1.02, 0.03), 'alu', axis, [0, len * 0.5, 0], [0, 0.12, 0]);
    part(g, rbox(s * 1.02, len * 0.12, s * 1.02, 0.03), 'alu', axis, [0, -len * 0.5, 0], [0, -0.12, 0]);
    part(g, cyl(0.03, 0.28, 16), 'steel', axis, [0, len * 0.5 + 0.14, 0], [0, 0.3, 0], { noEdge: true });
    const o = s * 0.38;
    bolts(g, axis, [[o, o], [-o, o], [o, -o], [-o, -o]], len * 0.58 + 0.01, [0, 0.25, 0], 0.025);
    return g;
  }
  function uProfile(parent, axis, pos, L, w, h, vec, alongZ = false) {
    const g = group(parent, pos, axis, vec, 0.05);
    const t = 0.03;
    const dims = alongZ ? [w, t, L] : [L, t, w];
    part(g, rbox(...dims, 0.012), 'graphite', axis, [0, -h / 2, 0]);
    const fl = alongZ ? [t, h, L] : [L, h, t];
    const off = (w - t) / 2;
    part(g, rbox(...fl, 0.012), 'graphite', axis, alongZ ? [off, 0, 0] : [0, 0, off], alongZ ? [0.3, 0, 0] : [0, 0, 0.3]);
    part(g, rbox(...fl, 0.012), 'graphite', axis, alongZ ? [-off, 0, 0] : [0, 0, -off], alongZ ? [-0.3, 0, 0] : [0, 0, -0.3]);
    return g;
  }
  function anchorAt(parent, pos) { const a = new THREE.Object3D(); a.position.set(...pos); parent.add(a); return a; }

  // ---------- Construction (1 unité = 100 mm) ----------
  const root = new THREE.Group();

  // Axe 0 : bâti
  part(root, rbox(1.25, 0.07, 1.25, 0.02), 'steel', 0, [0, 0.035, 0], [0, -0.4, 0]);
  bolts(root, 0, [[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]], 0.09, [0, 0.2, 0]);
  part(root, cyl(0.26, 4.2, 64), 'steel', 0, [0, 2.17, 0], [0, -0.2, 0]);
  part(root, cyl(0.34, 0.06, 64), 'steel', 0, [0, 4.27, 0], [0, 0.4, 0]);

  // Axe 1 : pivot bâti / bras (partie fixe)
  const a1 = group(root, [0, 4.3, 0], 1, [0, 0, 0]);
  const housing1 = part(a1, rbox(0.95, 1.2, 0.95, 0.08), 'pla', 1, [0, 0.6, 0], [0.9, 0.2, 0.6]);
  for (const [x, z, ry] of [[0, 0.5, 0], [0, -0.5, 0], [0.5, 0, Math.PI / 2], [-0.5, 0, Math.PI / 2]]) {
    part(a1, rbox(0.1, 1.0, 0.36, 0.02), 'pla', 1, [x, 0.5, z], [x * 1.8 + 0.9, 0.2, z * 1.8 + 0.6], { rot: [0, ry, 0] });
  }
  part(a1, cyl(0.17, 0.12, 40), 'iglidur', 1, [0, 0.12, 0], [0, -0.9, 0]);
  part(a1, cyl(0.17, 0.12, 40), 'iglidur', 1, [0, 1.12, 0], [0, 1.6, 0]);
  nema(a1, 1, [-0.95, 0.75, 0], 0.57, 0.56, [-1.6, 0, 0]);
  part(a1, rbox(0.62, 0.05, 0.62, 0.01), 'steel', 1, [-0.95, 0.42, 0], [-1.6, -0.6, 0]);
  pulley(a1, 1, [-0.95, 1.38, 0], 0.11, [-1.6, 1.4, 0]);
  belt(a1, 1, [0, 0], [-0.95, 0], 0.22, 0.12, [-0.4, 1.4, 0]).position.y = 1.38;
  const anchor1 = anchorAt(housing1, [0, 0.2, 0]);

  // Axe 1 : partie tournante (arbre, poulie menée, bras 1)
  const j1 = new THREE.Group();
  j1.position.set(0, 5.55, 0);
  root.add(j1);
  pulley(j1, 1, [0, -0.17, 0], 0.21, [0, 1.0, 0]);
  part(j1, cyl(0.06, 1.7, 24), 'steel', 1, [0, -0.6, 0], [0, 2.2, 0]);
  part(j1, rbox(0.42, 0.18, 0.42, 0.04), 'graphite', 1, [0, 0.05, 0], [0, 1.4, 0]);
  const arm = uProfile(j1, 1, [1.5, 0.3, 0], 3.6, 0.48, 0.24, [0, 1.8, 0]);

  // Axe 2 : pivot intermédiaire au bout du bras
  const a2 = group(j1, [3.05, 0.3, 0], 2, [0.6, 2.4, 0], 0.25);
  const housing2 = part(a2, rbox(0.62, 0.62, 0.62, 0.07), 'pla', 2, [0, 0.45, 0], [0, 0.8, 0]);
  part(a2, cyl(0.12, 0.1, 32), 'iglidur', 2, [0, 0.82, 0], [0, 1.4, 0]);
  nema(a2, 2, [0, 0.4, -0.75], 0.42, 0.42, [0, 0, -1.2]);
  pulley(a2, 2, [0, 0.92, -0.75], 0.09, [0, 1.2, -1.2]);
  pulley(a2, 2, [0, 0.92, 0], 0.18, [0, 1.6, 0]);
  belt(a2, 2, [0, 0], [0, -0.75], 0.19, 0.1, [0, 1.4, -0.6]).position.y = 0.92;
  const anchor2 = anchorAt(housing2, [0, 0, 0]);

  const j2 = new THREE.Group();
  j2.position.set(3.05, 0, 0);
  j1.add(j2);
  part(j2, cyl(0.06, 1.3, 24), 'steel', 2, [0, 0.3, 0], [0, 3.2, 0]);
  uProfile(j2, 2, [0.6, -0.38, 0], 1.45, 0.42, 0.22, [0.8, -0.6, 0]);

  // Axe 3 : glissière verticale
  const a3 = group(j2, [1.25, -0.6, 0], 3, [1.9, -0.4, 0], 0.3);
  part(a3, rbox(0.55, 3.2, 0.05, 0.015), 'graphite', 3, [0, -1.55, -0.14], [0, 0, -0.9]);
  part(a3, rbox(0.16, 3.0, 0.1, 0.01), 'steel', 3, [0, -1.55, -0.06], [0, 0, -0.4]);
  pulley(a3, 3, [0.36, -0.15, 0.05], 0.19, [0.9, 0.5, 0.3], Math.PI / 2).rotation.z = Math.PI / 2;
  pulley(a3, 3, [0.36, -2.36, 0.05], 0.19, [0.9, -0.5, 0.3], Math.PI / 2).rotation.z = Math.PI / 2;
  const b3 = belt(a3, 3, [0, -0.15], [0, -2.36], 0.2, 0.2, [0.6, 0, 0], true);
  b3.position.x = 0.36;
  b3.rotation.y = Math.PI / 2;
  b3.position.z = 0.05;
  nema(a3, 3, [0.36, -0.15, -0.5], 0.42, 0.42, [1.2, 0.6, -0.9], [Math.PI / 2, 0, 0]);
  const anchor3 = anchorAt(a3, [0, -1.2, 0]);

  const j3 = new THREE.Group();
  j3.position.set(0, -1.0, 0);
  a3.add(j3);
  const carriage = part(j3, rbox(0.42, 0.5, 0.22, 0.03), 'steel', 3, [0, 0, 0.08], [0, 0, 0.9]);
  part(j3, rbox(0.62, 0.62, 0.025, 0.01), 'alu', 3, [0.12, 0, 0.21], [0, 0, 1.4]);
  bolts(j3, 3, [[-0.12, 0.2], [0.36, 0.2]], 0.22, [0, 0, 1.6]);

  // Axe 4 : pivot outil (axe horizontal)
  const a4 = group(j3, [0.55, -0.1, 0.42], 4, [1.0, -0.6, 1.4], 0.35);
  const box4 = part(a4, rbox(0.5, 0.42, 0.5, 0.05), 'pla', 4, [0, 0, 0], [0, 0.6, 0]);
  nema(a4, 4, [0, -0.62, 0], 0.42, 0.4, [0, -1.0, 0]);
  pulley(a4, 4, [-0.3, -0.62, 0], 0.09, [-0.6, -1.0, 0], 0).rotation.z = Math.PI / 2;
  pulley(a4, 4, [-0.3, 0, 0], 0.09, [-0.6, 0.2, 0], 0).rotation.z = Math.PI / 2;
  const b4 = belt(a4, 4, [0, 0], [-0.62, 0], 0.1, 0.1, [-0.9, -0.4, 0], true);
  b4.position.x = -0.3;
  b4.rotation.z = Math.PI / 2;
  b4.rotation.y = 0;
  const anchor4 = anchorAt(box4, [0, 0, 0]);

  const j4 = new THREE.Group();
  a4.add(j4);
  part(j4, cyl(0.035, 1.1, 20), 'steel', 4, [0.25, 0, 0], [0.6, 0, 0], { rot: [0, 0, Math.PI / 2] });
  const pince = group(j4, [0.95, 0, 0], 4, [1.3, 0, 0], 0.4);
  part(pince, rbox(0.55, 0.16, 0.34, 0.04), 'pla', 4, [0, 0, 0], [0, 0.25, 0]);
  bolts(pince, 4, [[-0.15, 0.1], [0.15, 0.1], [-0.15, -0.1], [0.15, -0.1]], 0.1, [0, 0.5, 0], 0.028);
  const spatula = part(pince, rbox(3.0, 0.03, 0.34, 0.012), 'wood', 4, [1.65, 0, 0], [1.6, 0, 0]);
  const roz = group(pince, [-0.1, 0, 0.2], 4, [0, 0, 1.4], 0.5);
  part(roz, cyl(0.03, 1.0, 16), 'wood', 4, [0, 0, 0.5], [0, 0, 0], { rot: [Math.PI / 2, 0, 0] });
  part(roz, rbox(0.7, 0.05, 0.05, 0.02), 'wood', 4, [0, 0, 1.0], [0, 0, 0.4]);

  void arm; void carriage;
  const anchors = [null, anchor1, anchor2, anchor3, anchor4];
  const joints = { j1, j2, j3, j4 };
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });

  // axe 0 = bâti, 1..4 = axes. opacity : opacité des pièces ; edgeOpacity / edgeAccent : arêtes
  function setAxisLook(axis, opacity, edgeOpacity, edgeAccent) {
    for (const m of Object.values(axisMats[axis])) {
      const tr = opacity < 0.995;
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
      m.opacity = opacity;
      m.depthWrite = opacity > 0.5;
    }
    const em = axisEdgeMat[axis];
    em.opacity = edgeOpacity;
    em.color.copy(WHITE).lerp(ACCENT, edgeAccent);
  }
  // e : 0 (assemblé) à 1 (éclaté)
  function setExplode(e) {
    for (const pt of parts) {
      const k = ss(pt.delay * 0.4, 0.6 + pt.delay * 0.4, e);
      pt.obj.position.copy(pt.base).addScaledVector(pt.vec, k);
    }
  }

  return { root, parts, meshes, joints, anchors, spatula, setAxisLook, setExplode };
}

// ---------- Version hero / décomposition (pilotée par le scroll) ----------
export function createRobot(canvas, opts = {}) {
  const renderer = makeRenderer(canvas, opts);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  setupStudio(renderer, scene);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const model = buildRobotModel();
  scene.add(model.root);
  const { parts, joints, anchors, setAxisLook } = model;
  const { j1, j2, j3, j4 } = joints;

  // ---------- Caméra : images clés ----------
  const tmp = new THREE.Vector3();
  const anchorWorld = (n) => anchors[n].getWorldPosition(new THREE.Vector3());
  const K = {
    intro: { t: () => new THREE.Vector3(3.0, 3.1, 0), R: 23, th: 0.32, ph: 1.3 },
    explode: { t: () => new THREE.Vector3(3.4, 3.4, 0.4), R: 28, th: 0.6, ph: 1.22 },
    axe1: { t: () => anchorWorld(1), R: 12, th: 0.35, ph: 1.15 },
    axe2: { t: () => anchorWorld(2), R: 9, th: 1.15, ph: 1.05 },
    axe3: { t: () => anchorWorld(3), R: 10.5, th: 0.85, ph: 1.3 },
    axe4: { t: () => anchorWorld(4).add(new THREE.Vector3(1.7, 0, 0.3)), R: 13, th: 0.3, ph: 1.22 },
    assemble: { t: () => new THREE.Vector3(3.0, 3.1, 0), R: 23, th: -0.45, ph: 1.3 },
  };
  const KEYS = [
    [0.0, 'intro'], [0.08, 'intro'], [0.2, 'explode'], [0.24, 'explode'],
    [0.3, 'axe1'], [0.38, 'axe1'], [0.47, 'axe2'], [0.55, 'axe2'],
    [0.64, 'axe3'], [0.72, 'axe3'], [0.81, 'axe4'], [0.89, 'axe4'],
    [0.98, 'assemble'], [1.0, 'assemble'],
  ];
  function desired(p) {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const [pa, ka] = KEYS[i], [pb, kb] = KEYS[i + 1];
    const t = ss(pa, pb, p);
    const A = K[ka], B = K[kb];
    return { t: A.t().lerp(B.t(), t), R: lerp(A.R, B.R, t), th: lerp(A.th, B.th, t), ph: lerp(A.ph, B.ph, t) };
  }

  // ---------- État ----------
  let W = 1, H = 1, hero = 0, prog = 0, visible = true, last = performance.now(), time = 0;
  const cam = { t: new THREE.Vector3(3.0, 3.1, 0), R: 23, th: 0.32, ph: 1.3 };
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  let explodeCur = 0, flipPhase = 0;
  const focusCur = [0, 0, 0, 0, 0];
  // suit le curseur de façon subtile, sans le toucher en tactile
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    ptr.x = (e.clientX / innerWidth) * 2 - 1;
    ptr.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  // ---------- Rotation au glisser (hero et décomposition, souris et stylet seulement) ----------
  // Décalage orbital ajouté à l'angle du scroll : inertie, puis retour doux au cadrage après 1,5 s.
  const drag = { on: false, id: -1, x: 0, y: 0, t: 0, moved: false, th: 0, ph: 0, vth: 0, vph: 0, relMs: -1e9, lastMove: 0, homing: false };
  const ZONE = '#hero, #decomposition';
  const BLOCK = 'a, button, input, textarea, select, label, summary, .callout, .nav, .explode__rail, [data-magnetic], [data-lenis-prevent], [contenteditable]';
  const root = document.documentElement;
  let hint = null, hintTimer = 0;
  function hideHint() {
    if (!hint) return;
    hint.classList.remove('is-in');
    hint.classList.add('is-out');
    clearTimeout(hintTimer);
  }
  function endDrag() {
    if (!drag.on) return;
    drag.on = false;
    drag.relMs = performance.now();
    drag.homing = false;
    root.classList.remove('rb-dragging');
    if (reduce) { drag.vth = 0; drag.vph = 0; }
  }
  window.addEventListener('pointerdown', (e) => {
    if (!visible || e.pointerType === 'touch' || e.button !== 0 || !e.isPrimary) return;
    const t = e.target;
    if (!(t instanceof Element) || !t.closest(ZONE) || t.closest(BLOCK)) return;
    Object.assign(drag, { on: true, id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, moved: false, vth: 0, vph: 0, homing: false, lastMove: performance.now() });
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag.on || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 4) return;
      drag.moved = true;
      root.classList.add('rb-dragging');
      hideHint();
      const sel = getSelection && getSelection();
      if (sel) sel.removeAllRanges();
    }
    const dt = Math.max(1, e.timeStamp - drag.t) / 1000;
    const dth = -dx * 0.0062, dph = -dy * 0.0042;
    drag.th += dth;
    drag.ph = clamp(drag.ph + dph, -0.5, 0.42);
    drag.vth = clamp(lerp(drag.vth, dth / dt, 0.45), -3.5, 3.5);
    drag.vph = clamp(lerp(drag.vph, dph / dt, 0.45), -2, 2);
    drag.x = e.clientX; drag.y = e.clientY; drag.t = e.timeStamp;
    drag.lastMove = performance.now();
  }, { passive: true });
  window.addEventListener('pointerup', (e) => { if (e.pointerId === drag.id) endDrag(); });
  window.addEventListener('pointercancel', (e) => { if (e.pointerId === drag.id) endDrag(); });
  window.addEventListener('blur', endDrag);
  document.addEventListener('selectstart', (e) => { if (drag.on && drag.moved) e.preventDefault(); });

  // petit indice discret, seulement avec un pointeur précis
  const heroEl = document.getElementById('hero');
  if (heroEl && finePointer) {
    hint = document.createElement('div');
    hint.className = 'rb-hint mono';
    hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = '<span class="rb-hint__icon"><i></i></span><span>Glissez pour tourner</span>';
    heroEl.appendChild(hint);
    setTimeout(() => { if (!hint.classList.contains('is-out')) hint.classList.add('is-in'); }, 3200);
    hintTimer = setTimeout(hideHint, 16000);
  }

  function resize() {
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, W < 768 ? 1.25 : 1.75));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    const k = 1 - Math.exp(-dt * 4.5);

    // Cinématique « vivante » dans le hero
    const amp = reduce ? 0 : (1 - ss(0.15, 0.85, hero)) * (prog < 0.02 ? 1 : 0);
    flipPhase = (time % 5) / 5;
    const flip = ss(0.55, 0.8, flipPhase) * Math.PI;
    const target = {
      j1: amp * 0.45 * Math.sin(time * 0.55),
      j2: amp * 0.6 * Math.sin(time * 0.55 + 1.2),
      j3: -1.0 - amp * 0.7 * (0.5 + 0.5 * Math.sin(time * 1.1)),
      j4: amp * flip,
    };
    // Focus : l'axe mis en valeur bouge doucement
    const f = [0, 1, 2, 3, 4].map((n) => {
      if (!n) return 0;
      const [s, e] = PHASES['axe' + n];
      return ss(s - 0.02, s + 0.04, prog) * (1 - ss(e - 0.04, e + 0.02, prog));
    });
    if (!reduce) {
      target.j1 += f[1] * 0.5 * Math.sin(time * 1.2);
      target.j2 += f[2] * 0.7 * Math.sin(time * 1.2);
      target.j3 += f[3] * -0.6 * (0.5 + 0.5 * Math.sin(time * 1.6));
      target.j4 += f[4] * time * 2.2;
    }
    j1.rotation.y += (target.j1 - j1.rotation.y) * k;
    j2.rotation.y += (target.j2 - j2.rotation.y) * k;
    j3.position.y += (target.j3 - j3.position.y) * k;
    j4.rotation.x = lerp(j4.rotation.x, target.j4, k);

    // Éclatement
    const E = ss(PHASES.explode[0], PHASES.explode[1] - 0.02, prog) * (1 - ss(PHASES.assemble[0], PHASES.assemble[1] - 0.01, prog));
    explodeCur += (E - explodeCur) * k;
    model.setExplode(explodeCur);

    // Fantôme et arêtes
    let F = 0;
    for (let n = 1; n <= 4; n++) { focusCur[n] += (f[n] - focusCur[n]) * k; F = Math.max(F, focusCur[n]); }
    const edgeBase = explodeCur * 0.3;
    for (let n = 0; n <= 4; n++) {
      const on = n ? focusCur[n] : 0;
      const op = lerp(1, 0.1, F * (1 - on));
      setAxisLook(n, op, lerp(edgeBase * (1 - F * 0.8), 0.95, on), on);
    }

    // Décalage orbital du glisser : inertie, puis retour au cadrage du scroll après 1,5 s
    const nowMs = performance.now();
    if (drag.on) {
      if (nowMs - drag.lastMove > 70) { drag.vth = 0; drag.vph = 0; }
    } else {
      if (!reduce) {
        drag.th += drag.vth * dt;
        drag.ph = clamp(drag.ph + drag.vph * dt, -0.5, 0.42);
        const dec = Math.exp(-dt * 3.6);
        drag.vth *= dec; drag.vph *= dec;
      }
      if (nowMs - drag.relMs > 1500 && (Math.abs(drag.th) > 1e-4 || Math.abs(drag.ph) > 1e-4)) {
        if (!drag.homing) { drag.homing = true; drag.th = wrapPI(drag.th); drag.vth = 0; drag.vph = 0; }
        const kk = 1 - Math.exp(-dt * (reduce ? 8 : 1.7));
        drag.th -= drag.th * kk;
        drag.ph -= drag.ph * kk;
      }
    }

    // Caméra
    const d = desired(prog);
    cam.t.lerp(d.t, k);
    cam.R = lerp(cam.R, d.R, k);
    cam.th = lerp(cam.th, d.th, k);
    cam.ph = lerp(cam.ph, d.ph, k);
    ptr.sx = lerp(ptr.sx, ptr.x, k * 0.6);
    ptr.sy = lerp(ptr.sy, ptr.y, k * 0.6);
    const portrait = W / H < 1;
    const R = cam.R * (portrait ? 1.75 : 1);
    const idle = reduce ? 0 : (1 - hero) * 0.18 * Math.sin(time * 0.18);
    const th = cam.th + idle + ptr.sx * 0.14 + drag.th;
    const ph = clamp(cam.ph + ptr.sy * 0.07 + drag.ph, 0.55, 1.52);
    camera.position.set(
      cam.t.x + R * Math.sin(ph) * Math.sin(th),
      cam.t.y + R * Math.cos(ph),
      cam.t.z + R * Math.sin(ph) * Math.cos(th),
    );
    camera.lookAt(cam.t);
    // Cadrage : robot à droite sur desktop, en haut sur mobile
    if (portrait) camera.setViewOffset(W, H, 0, H * lerp(0.13, 0.2, ss(0, 0.1, prog)), W, H);
    else camera.setViewOffset(W, H, -W * lerp(0.19, 0.14, ss(0, 0.2, prog)), 0, W, H);

    renderer.render(scene, camera);
    if (!readyDone) { readyDone = true; resolveReady(); }
  }

  let readyDone = false, resolveReady;
  const ready = new Promise((r) => (resolveReady = r));
  resize();
  renderer.setAnimationLoop(tick);

  const api = {
    ready,
    setHero(h) { hero = clamp(+h || 0); },
    setProgress(p) { prog = clamp(+p || 0); },
    getAnchor(n) {
      const a = anchors[n];
      if (!a) return { x: 0, y: 0, visible: false };
      a.getWorldPosition(tmp);
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * W;
      const y = (-tmp.y * 0.5 + 0.5) * H;
      return { x, y, visible: tmp.z < 1 && x > 0 && x < W && y > 0 && y < H };
    },
    setVisible(v) {
      v = !!v;
      if (v === visible) return;
      visible = v;
      last = performance.now();
      if (!v) endDrag();
      renderer.setAnimationLoop(v ? tick : null);
    },
    resize,
    joints,
    // lecture seule, utile pour les tests : décalage orbital du glisser
    get drag() { return { th: drag.th, ph: drag.ph, on: drag.on }; },
  };
  return api;
}
