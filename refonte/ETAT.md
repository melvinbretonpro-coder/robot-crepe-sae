# État de la refonte (09/11/2026)

- V1 et version finale commitées sur `refonte-premium` (96ca673, 3a60900). Rien de poussé, l'ancien site en ligne n'a pas bougé.
- Aperçu local : `python3 -m http.server 8740 --bind 127.0.0.1` depuis la racine du dépôt, puis http://127.0.0.1:8740
- **V2 « bluffante » commitée** sur `refonte-premium-v2` (brief : `refonte/BRIEF-V2.md`). Trois agents Sonnet :
  carte mentale interactive (`mindmap.js/.css`, section `#carte`), robot pilotable à la souris
  (`robot.js`, `playground.js/.css`, section `#pilotage`), montée en gamme du reste (`index.html`, `main.css`, `main.js`).
  Vérifiée par le parent en 1440 et 390 : zéro erreur console, pas de débordement. Captures PNG des agents gardées en local (ignorées par git).
- **En ligne sur Vercel depuis le 09/11/2026** : https://robot-crepe-sae.vercel.app (projet `robot-crepe-sae`,
  équipe `melvinbretonpro-coders-projects`), déployé depuis la branche locale `refonte-premium-v2` par `vercel deploy --prod`.
  Vercel a relié le dépôt GitHub : un push sur `main` (qui porte encore l'ancien site) redéploierait la production.
  GitHub Pages sert toujours l'ancien site tant que `main` n'a pas reçu la V2.
