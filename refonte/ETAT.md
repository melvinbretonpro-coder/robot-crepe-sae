# État de la refonte (09/11/2026)

- V1 commitée en local (branche `refonte-premium`, commit 96ca673). Rien de poussé, l'ancien site en ligne n'a pas bougé.
- Aperçu local : `python3 -m http.server 8740 --bind 127.0.0.1` depuis la racine du dépôt, puis http://127.0.0.1:8740
- Version finale commitée (même branche) : toutes les sections relues et corrigées en desktop et mobile,
  3D recadrée (hero dégagé du titre, axe 4 avec spatule et rozelle, mobile), débogage et fichiers de test retirés,
  zéro erreur console.
- Reste imparfait : comparateur CAO / réel plus haut que l'écran en desktop ; la vidéo affiche « 2024 - 2025 »
  et un filigrane NotebookLM dans l'image (non corrigeable par le code).
- Mise en ligne : fusionner `refonte-premium` dans `main` et pousser (GitHub Pages), seulement sur accord de Melvin.
