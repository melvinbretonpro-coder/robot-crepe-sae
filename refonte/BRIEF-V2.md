# Refonte V2 : passage « bluffant » (brief commun aux agents, 09/11/2026)

Le site (statique, sans build, GitHub Pages) est déjà fini et propre. On le pousse à un niveau
« site primé Awwwards » : **interactif au maximum**. Melvin le présente demain.
Lire d'abord `refonte/BRIEF.md` (faits, DA, règles d'écriture, contrats). Le rapport complet est
`assets/docs/rapport-technique.pdf` (`pdftotext -layout assets/docs/rapport-technique.pdf -` pour le lire).

Aperçu local déjà lancé : http://127.0.0.1:8740 (ne pas relancer de serveur).
Branche : `refonte-premium-v2`. **Ne pas commiter**, le parent s'en charge.

## Règles
- Textes en français, zéro tiret cadratin ou demi-cadratin, zéro « - » de ponctuation dans les textes visibles.
  Espace insécable avant « % », « € », « : ». Jamais le mot « recette ». Chiffres uniquement tirés du rapport ou du BRIEF.
- DA existante : fond sombre `#0B0B0C`, clair crème, accent caramel `#E3A857`, polices Instrument Serif (titres,
  italique pour `<em>`), Inter Tight (texte), JetBrains Mono (étiquettes). Reprendre les variables CSS de `main.css`
  (`:root`). Fines lignes, beaucoup d'air, animations à courbes douces (expo/quart out), rien de criard.
- Bibliothèques déjà chargées : Three.js 0.169 (import map `three`, `three/addons/`), GSAP 3.12.5 + ScrollTrigger
  (globals `gsap`, `ScrollTrigger`, scripts `defer`), Lenis (instance créée dans `main.js`). Aucune nouvelle
  dépendance sans nécessité ; si besoin, CDN jsdelivr ou cdnjs avec version exacte.
- Lenis : tout conteneur qui capte la molette ou le glisser porte `data-lenis-prevent` (déjà mis sur les racines).
  Canvases et zones de glisser : `touch-action: none` seulement sur la zone de manipulation, pas sur toute la section
  (le défilement mobile doit rester possible au doigt hors de la zone).
- `prefers-reduced-motion` respecté, clavier utilisable (focus visible), mobile 390 px sans débordement horizontal.
- Performance : rendu WebGL seulement quand la section est visible (IntersectionObserver), `devicePixelRatio` plafonné à 2.
- Un propriétaire par fichier (voir ta mission). Ne touche pas aux fichiers des autres.

## Pont entre modules
`main.js` expose `window.crepe = { scrollToPhase(name) }` où `name` ∈ `intro, explode, axe1, axe2, axe3, axe4, assemble`
(défile en douceur jusqu'au bon moment de la section `#decomposition`). Les autres modules l'appellent s'il existe :
`window.crepe?.scrollToPhase('axe2')`.

## Vérification avant de rendre
`node --check` sur tes JS. Puis ouvre http://127.0.0.1:8740 avec Playwright **dans ton propre onglet**
(`browser_tabs` action `new`, ne ferme pas les onglets des autres) : 1440×900 puis 390×844, zéro erreur console,
captures de ta section (rangées dans `refonte/captures/`, pas à la racine). Rends : ce qui est fait, fichiers touchés,
défauts restants. Court.
