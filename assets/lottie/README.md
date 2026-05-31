# Lottie animations

Dépose ici les animations Lottie (`.json`) de l'app coursier.

## Animation « main à main » (carte Remise)

- Nom de fichier attendu : **`handoff.json`**
- Remplacera le SVG de [`HandoffAnimation`](../../src/components/mission/HandoffAnimation.tsx)
  sur la carte « ACTION SUIVANTE · Remise ».

### Critères
- **Recolorable en blanc** (l'icône est posée sur le dégradé bleu de la carte).
- **Léger** : viser **< 50 Ko** pour un pictogramme.
- **Carré / centré**, fond transparent.
- Boucle propre (`loop`).

### Branchement (une fois le fichier déposé)
1. `npx expo install lottie-react-native`
2. Dans `HandoffAnimation.tsx` :
   ```tsx
   import LottieView from 'lottie-react-native';
   // ...
   <LottieView source={require('@/assets/lottie/handoff.json')} autoPlay loop />
   ```
   (garder le SVG actuel en fallback si le JSON est absent).
