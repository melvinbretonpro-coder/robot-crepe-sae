# Refonte premium du site Robot CRÊPE (brief commun aux agents)

Dépôt : `/Users/melvi/Documents/MAISON/futur/Agence/Blyx/_Perso/robot-crepe-sae/` (branche `refonte-premium`).
Site actuel en ligne : https://melvinbretonpro-coder.github.io/robot-crepe-sae/ (GitHub Pages, branche `main`, racine).
Ne JAMAIS pousser ni committer : l'orchestrateur s'en charge.

## Le but

Un site vitrine « ultra premium », niveau page produit Apple / Teenage Engineering, pour un projet étudiant :
le Robot CRÊPE, robot SCARA 4 axes qui retourne des crêpes, SAÉ 3.2, BUT GMP, IUT Rennes, 2025-2026.
Signature du site : **au scroll, le robot 3D se décompose (vue éclatée), puis chaque axe est mis en valeur
avec ses caractéristiques, puis il se réassemble.**

Site statique SANS étape de build (GitHub Pages sert les fichiers tels quels). Bibliothèques par CDN, versions figées.

## Règles d'écriture (strictes)

- Tout en français. Ton sobre, précis, ingénieur, phrases courtes.
- **Aucun tiret cadratin (—) ni demi-cadratin (–) ni tiret de ponctuation** dans les textes visibles. Utiliser
  virgule, deux-points, point, « · » comme séparateur visuel. Vérifier avec
  `grep -nP '[\x{2013}\x{2014}]' fichier` avant de rendre.
- Ne rien inventer : seulement les faits ci-dessous.

## Les faits (source : rapport technique de 49 pages)

Équipe : Melvin Breton (axe 1), Valentin Caplot (axe 2), Pacôme Grimaud (axe 3), Enzo Lallican (axe 4).
Contact : melvin.breton@etudiant.univ-rennes.fr. BUT Génie Mécanique et Productique, IUT Rennes, SAÉ 3.2, 2025-2026.

Contexte : répondre à un cahier des charges avec une démarche d'éco-conception, de la conception CAO (TopSolid)
à la fabrication puis aux tests. Composants uniquement issus de la boutique de l'IUT. Moyens : usinage
conventionnel, découpe laser, pliage de tôle, impression 3D.

**Axe 1 · Pivot bâti / bras (Melvin)** : liaison pivot d'axe vertical (A, z), rotation ±150°, vitesse max 90°/s.
Axe central guidé par deux paliers lisses à collerette iglidur® Ø12 mm, logés dans un boîtier imprimé en 3D.
Moteur NEMA 23 déporté, transmission poulie 16 dents / 32 dents et courroie, tension réglée par cales (découpe laser).
Axe usiné : tournage conventionnel (gorges d'anneaux élastiques) puis fraisage (perçages, méplat pour la vis de pression).
Passage des câbles des moteurs supérieurs prévu.

**Axe 2 · Pivot intermédiaire (Valentin)** : pivot B, rotation 360°, 90°/s, entraxe 120 mm entre le pivot B et
la glissière. Charge P2 = 20 N. Structure hybride : profilé en U en tôle pliée (découpe laser, entraxe de 240 mm
dans le déplié) et boîtier imprimé en 3D qui intègre les paliers et l'équerre moteur. Moteur NEMA 17, poulies
16/32 dents, rapport de réduction 1:2, courroie de 186 mm. Arbre Ø12 h10, goupillage Ø4 H12, gorge de circlip, méplat.

**Axe 3 · Glissière verticale (Pacôme)** : liaison glissière, course 150 mm, vitesse 1 m/s, effort 20 N.
Trois solutions étudiées (vis sans fin, pignon crémaillère, courroie) : courroie retenue. Rail + chariot, courroie
HTD 537 mm, poulies 32 dents, entraxe 221,69 mm. NEMA 17. Plaque de liaison chariot / courroie découpée au laser
dans de l'inox 316L de 1 mm. Poulie basse sur axe Ø6 guidé par deux paliers. Adaptateurs imprimés en 3D.

**Axe 4 · Pivot outil (Enzo)** : pivot d'axe horizontal (C, x) à course infinie pour retourner la crêpe, 360°/s
(1 tr/s), charge 1 N (outil + crêpe). Boîtier en U imprimé en 3D (PLA) à nervures de renfort, axe usiné en métal
(méplats, deux circlips), courroie de 159 mm, NEMA 17. Pince imprimée sur mesure : d'un côté le sklisen (spatule)
serré par 4 vis, de l'autre la rozelle (râteau) à la perpendiculaire.

**Étude** : liaison la plus sollicitée = pivot A. Principe fondamental de la statique : 136,8 N en Y, 6,4 N en X.
Palier iglidur® A350 Ø12 : vitesse v = 9,42 mm/s < 0,8 m/s ; pression P = F / (d × L) = 1,9 MPa < 60 MPa.

**Fabrication** : usinage conventionnel (axes, contrats de phase, APEF), découpe laser + pliage (tôles, cales),
impression 3D PLA (boîtiers, supports, pince). 4 moteurs : 3 NEMA 17, 1 NEMA 23.

**Budget** : composants achetés 174,43 € HT (3 factures : 70,00 €, 52,03 €, 52,40 €), motorisation environ 40 %.
Estimation de coût unitaire (ancien site) : matière première 200 €, coût machine 415 € (usinage, découpe,
impression 3D), étude et R&D 2 000 € (20 h de conception) amortis sur la quantité produite.
Coût unitaire = 200 + 415 + 2000 / quantité. Pour 1 unité : 2 615 €.

**Éco-conception** : structure en tôle acier ou inox 1 mm recyclable ; axes usinés en acier ; boîtiers en PLA
(rapide, peu de déchets, mais sensible à la chaleur) ; paliers iglidur auto-lubrifiants. Conception modulaire :
chaque axe se démonte indépendamment, visserie standard, pièces imprimées refaisables. Fin de vie : démontage
sans outil spécial, métaux recyclables, plastiques triés à part. Pistes : plastique plus résistant que le PLA,
moins d'inox, moins de références de vis.

**Bilan / points forts** : conception robuste et fonctionnelle ; démarche méthodique de la conception à la
fabrication ; matériaux choisis pour le recyclage ; documentation technique complète ; collaboration efficace.

## Les fichiers médias (déjà prêts)

- `assets/img/robot-reel.webp` (photo du robot réel, fond sombre, 1024×1536, portrait)
- `assets/img/topsolid.webp` (vue CAO TopSolid, fond bleu, 1922×1536)
- `assets/img/cao-robot-1.webp` à `cao-robot-7.webp` (captures CAO : 1 coupe de l'axe 4, 6 vue d'ensemble, etc.)
- `assets/img/equipe-melvin.webp`, `equipe-valentin.webp`, `equipe-pacome.webp`, `equipe-enzo.webp`
- `assets/img/carte-mentale.webp` (aperçu) ; `assets/docs/carte-mentale.png` (pleine résolution)
- `assets/img/demo-poster.webp` (image de la vidéo) ; `assets/media/demo.mp4` (vidéo de démo, 5 min 36)
- `assets/docs/rapport-technique.pdf` (49 pages)

## Direction artistique

- **Alternance cinéma / papier** : scène sombre pour le hero, la vue éclatée, la vidéo et le pied de page ;
  sections claires couleur « pâte à crêpe » pour le contenu (étude, fabrication, équipe, budget). Le passage de
  l'un à l'autre est une transition de fond animée au scroll.
- Couleurs (variables CSS dans `:root`) :
  `--ink: #0B0B0C` (fond sombre), `--ink-2: #141416` (surfaces), `--line: rgba(255,255,255,.08)`,
  `--paper: #F3EEE6` (fond clair), `--paper-2: #E9E2D6`, `--text-dark: #121212`,
  `--text-light: #EDEAE4`, `--muted: #8C8A85`, `--accent: #E3A857` (caramel, une seule couleur d'accent).
- Typographies (Google Fonts) : **Instrument Serif** (titres éditoriaux, italique pour les mots forts),
  **Inter Tight** (texte et interface, 400 à 800), **JetBrains Mono** (étiquettes techniques, cotes, numéros).
  Titre géant « CRÊPE » en Inter Tight 800, interlettrage serré ; « Robot » en Instrument Serif italique.
- Détails premium : grain très léger (bruit SVG en overlay), filets fins, grille de plan technique discrète,
  numérotation de sections en mono (« 03 / 10 »), cotes et repères façon dessin industriel, curseur personnalisé
  (seulement `pointer: fine`), boutons magnétiques, beaucoup d'espace, rien de criard, pas d'emoji.
- Mobile impeccable (375 px) : pas de défilement horizontal, textes lisibles, 3D allégée.
- `prefers-reduced-motion` : pas de Lenis, pas d'animations lourdes, tout visible.

## Architecture des fichiers (un propriétaire par fichier)

| Fichier | Propriétaire |
|---|---|
| `assets/js/robot.js` | Agent 3D |
| `index.html`, `assets/css/main.css` | Agent page |
| `assets/js/main.js` | Agent animations |

L'ancien site (`styles.css`, `scripts.js`, images à la racine, `Image robot/`) sera supprimé par l'orchestrateur.
Ne pas s'en servir.

### Bibliothèques (balises exactes, dans `index.html`, avant `main.js`)

```html
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"}}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>
<script type="module" src="assets/js/main.js"></script>
```

`gsap`, `ScrollTrigger`, `Lenis` sont des globales. Les modules s'exécutent après les scripts `defer`.

## Contrat de l'API 3D (`assets/js/robot.js`, module ES)

```js
export const PHASES = {
  intro:    [0.00, 0.10], // robot assemblé, vue 3/4
  explode:  [0.10, 0.24], // les pièces s'écartent le long de leurs axes
  axe1:     [0.24, 0.41], // focus axe 1
  axe2:     [0.41, 0.58],
  axe3:     [0.58, 0.75],
  axe4:     [0.75, 0.92],
  assemble: [0.92, 1.00], // réassemblage
};

export function createRobot(canvas) // lève une erreur si WebGL indisponible
// renvoie :
{
  setHero(h),        // 0..1 : progression du scroll dans le hero (0 = haut de page)
  setProgress(p),    // 0..1 : progression dans la section de décomposition (voir PHASES)
  getAnchor(n),      // n = 1..4 : { x, y, visible } position écran en px (CSS) du point clé de l'axe n
  setVisible(bool),  // false = boucle de rendu en pause (hors écran)
  resize(),          // appelé par main.js au resize (robot.js peut aussi écouter resize lui-même)
  ready,             // Promise résolue quand la première image est rendue
}
```

Le canvas est `<canvas id="robot-canvas">` dans `<div class="robot-stage">`, en `position: fixed; inset: 0;
z-index: 0` derrière le contenu (le contenu des sections sombres a un fond transparent par-dessus).
`main.js` gère l'opacité de `.robot-stage` (visible pendant le hero et la décomposition, fondu ensuite) et
appelle `setVisible(false)` quand elle est invisible.

## Contrat DOM (classes et attributs que `index.html` fournit et que `main.js` anime)

Le HTML est lisible sans JavaScript : le CSS ne masque jamais un contenu par défaut ; c'est `main.js` qui pose
les états de départ (le loader couvre la page pendant ce temps).

- `<html class="no-js">` : `main.js` remplace par `js`. Si WebGL échoue : classe `no-webgl` sur `<html>`,
  le CSS affiche alors `<img class="robot-fallback" src="assets/img/robot-reel.webp">` dans `.robot-stage`.
- Loader : `.loader` > `.loader__count` (000 à 100), `.loader__word` (lettres C R Ê P E en `<span>`).
- Navigation : `.nav` (se cache en descendant, revient en remontant), `.nav__progress` (barre de progression
  de lecture, `transform: scaleX`), liens d'ancre `a[href^="#"]` (défilement doux par Lenis).
- Curseur : `.cursor` > `.cursor__dot`, `.cursor__label` ; éléments `[data-cursor="Voir"]` changent le label.
- `[data-magnetic]` : boutons qui suivent légèrement le pointeur.
- `[data-split="chars"]` ou `[data-split="words"]` : texte découpé et révélé à l'entrée (découpe faite par main.js).
- `[data-reveal]` : apparition en fondu vers le haut ; `[data-reveal="stagger"]` : ses enfants en cascade.
- `[data-parallax="0.15"]` : déplacement vertical proportionnel au scroll.
- `[data-count="174.43"]` + `data-decimals="2"` + `data-suffix=" €"` : compteur animé (format français, virgule).
- `[data-theme="dark"]` / `[data-theme="light"]` sur chaque `<section>` : main.js fait le fondu du fond de
  `body` entre `--ink` et `--paper` au passage d'une section à l'autre (le CSS donne déjà les bonnes couleurs
  de texte par section).
- Hero : `section#hero[data-theme="dark"]` > `.hero__title` (« Robot » + « CRÊPE »), `.hero__meta`,
  `.hero__scroll` (indicateur).
- Décomposition : `section#decomposition.explode[data-theme="dark"]` > `.explode__pin` (épinglé par main.js
  sur `+=700%`) contenant :
  - `.explode__intro` (titre « Vue éclatée » visible pendant `explode`),
  - `.explode__rail` > `.explode__rail-fill` + 4 `.explode__tick[data-axis]` (progression verticale),
  - 4 `article.callout[data-axis="1..4"]` (numéro, nom de l'axe, responsable, 3 à 4 specs en `<dl>`),
    un seul visible à la fois pendant sa phase,
  - `svg.explode__leader` > `path.explode__leader-path` : filet qui relie la carte visible à `getAnchor(n)`.
- Fabrication : `section.process` > `.process__track` (cartes en ligne, défilement horizontal épinglé sur desktop,
  pile verticale sur mobile).
- Avant / après : `.compare` > `img.compare__before` (topsolid), `.compare__after` (contient robot-reel, découpé
  par `clip-path` piloté par la variable `--pos`), `input[type=range].compare__range`, `.compare__handle`.
- Film : `.film` > `video.film__video` (poster demo-poster.webp, `preload="none"`, src assets/media/demo.mp4),
  `button.film__play`, `.film__bar` > `.film__bar-fill`, `.film__time`.
- Budget : `input#cost-qty[type=range]` (1 à 50), `#cost-qty-value`, `#cost-rd`, `#cost-unit`, `#cost-total`.
- Marquee : `.marquee` > `.marquee__track` (contenu dupliqué deux fois dans le HTML).
- Livrables : `.deliverable` (cartes cliquables vers le PDF, la carte mentale, la vidéo).
- Lightbox : `[data-lightbox]` sur les images de galerie ; main.js crée la lightbox.

## Plan de la page (ordre des sections)

1. Loader. 2. Hero (robot 3D à droite sur desktop, titre à gauche). 3. Manifeste court (« Quatre axes. Quatre
ingénieurs. Une crêpe. ») en `data-split="words"`. 4. Décomposition (vue éclatée épinglée). 5. Chiffres clés
(compteurs : 4 axes, ±150°, 360°/s, 150 mm, 174,43 € HT, 49 pages). 6. Étude (PFS, palier, formules
présentées comme une fiche de calcul élégante). 7. Fabrication (3 procédés, défilement horizontal).
8. CAO / réel (comparateur avant après). 9. Film (vidéo de démo plein écran). 10. Galerie CAO (7 images,
lightbox). 11. Équipe (4 portraits, axe de chacun). 12. Budget (factures + calculateur). 13. Éco-conception.
14. Livrables (rapport, carte mentale, vidéo). 15. Pied de page (contact, IUT, année).

## Vérification (chaque agent, avant de rendre)

Serveur local : `python3 -m http.server <port>` lancé en arrière-plan depuis la racine du dépôt
(agent 3D : 8731, agent page : 8732, agent animations : 8733), arrêté à la fin.
Captures : `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --use-angle=swiftshader
--enable-unsafe-swiftshader --hide-scrollbars --window-size=1440,900 --virtual-time-budget=10000
--screenshot=$TMPDIR/x.png http://localhost:<port>/...` puis regarder l'image (outil Read). Aussi en 390×844.
Erreurs JS : `--enable-logging=stderr --v=0` ou une page de test. Si le port local est refusé par le bac à sable,
relancer la commande hors bac à sable.
