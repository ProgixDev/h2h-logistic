// LE BANDEAU DOIT ÊTRE VISIBLE, ET IL NE L'A JAMAIS ÉTÉ.
//
// 🔴 CINQ MOIS D'AVERTISSEMENTS QUE PERSONNE N'A LUS. De sa création le
// 10/04/2026 au 08/09/2026, `components/ui/Toast.tsx` animait son entrée puis
// sa sortie par DEUX AFFECTATIONS SUCCESSIVES de la même valeur partagée, dans
// le même bloc :
//
//     translateY.value = withTiming(0, …);                          // entrée
//     translateY.value = withDelay(duration, withTiming(-100, …));  // sortie
//
// Reanimated ANNULE l'animation en cours dès qu'on réaffecte `.value`. La
// seconde ligne effaçait donc la première : le bandeau restait à
// `translateY: -100`, `opacity: 0` pendant toute sa durée, puis « sortait »
// vers l'endroit où il se trouvait déjà. `onHide` se déclenchait bien à la
// fin — tout se comportait comme prévu SAUF l'affichage, ce qui est la façon
// la plus discrète possible d'échouer.
//
// 🔴 ET CE N'ÉTAIT PAS COSMÉTIQUE. C'est le seul canal par lequel l'écran
// d'incident rend les refus du serveur : « tolerance non ecoulee », « le
// formulaire X n est pas ouvert au role Y ». Le message partait bien, personne
// ne le lisait. Un formulaire qui refuse de s'envoyer sans dire pourquoi.
//
// ⚠️ AUCUN TEST N'AURAIT PU L'ATTRAPER AVANT : il ne s'est vu qu'en pilotant
// l'application sur l'émulateur, en cherchant pourquoi un refus serveur déjà
// journalisé n'apparaissait pas à l'écran.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { lireCode } from '@/utils/sansCommentaires';

const TOAST = join(process.cwd(), 'src', 'components', 'ui', 'Toast.tsx');
const ECRAN_INCIDENT = join(process.cwd(), 'src', 'app', 'incident', '[type].tsx');

/** Le corps de la branche `if (visible) { … }`, sans les commentaires. */
function brancheVisible(): string {
  const code = lireCode(TOAST);
  const debut = code.indexOf('if (visible) {');
  assert.notEqual(debut, -1, '`Toast.tsx` n’a plus de branche `if (visible)` — garde à revoir');
  const fin = code.indexOf('} else {', debut);
  assert.notEqual(fin, -1, '`Toast.tsx` n’a plus de branche `else` — garde à revoir');
  return code.slice(debut, fin);
}

test('🔴 UNE VALEUR ANIMÉE N’EST AFFECTÉE QU’UNE FOIS À L’ENTRÉE', () => {
  // ⚠️ C'EST LA FORME EXACTE DU DÉFAUT, ET LA SEULE CHOSE QU'ON PUISSE VÉRIFIER
  // SANS RENDRE LE COMPOSANT. Deux affectations de la même valeur dans le même
  // bloc : la seconde annule la première, en silence.
  const bloc = brancheVisible();
  const compte = new Map<string, number>();
  for (const m of bloc.matchAll(/(\w+)\.value\s*=/g)) {
    compte.set(m[1], (compte.get(m[1]) ?? 0) + 1);
  }
  assert.ok(compte.size > 0, 'aucune valeur animée trouvée — la garde ne regarde plus rien');

  const doubles = [...compte].filter(([, n]) => n > 1).map(([nom, n]) => `${nom} (${n} fois)`);
  assert.deepEqual(
    doubles,
    [],
    'valeur(s) partagée(s) réaffectée(s) dans le même bloc — la seconde annule la '
    + `première et le bandeau reste invisible :\n  ${doubles.join('\n  ')}\n\n`
    + 'Enchaîner avec `withSequence(entrée, withDelay(durée, sortie))`.',
  );
});

test('🔴 L’ENTRÉE ET LA SORTIE SONT ENCHAÎNÉES, PAS EMPILÉES', () => {
  const bloc = brancheVisible();
  assert.match(bloc, /withSequence\(/, '`withSequence` a disparu : l’entrée sera de nouveau écrasée');
  // La sortie reste différée — sans quoi le bandeau clignerait.
  assert.match(bloc, /withDelay\(\s*duration/, 'la sortie n’est plus différée de `duration`');
});

test('⚠️ ET `onHide` NE PART QUE SI L’ANIMATION EST ALLÉE AU BOUT', () => {
  // Un bandeau balayé à la main annule la sortie ; signaler quand même sa fin
  // déclencherait `onHide` deux fois.
  const bloc = brancheVisible();
  assert.match(
    bloc,
    /\(\s*fini\s*\)\s*=>\s*\{[\s\S]*?if\s*\(\s*fini\s*\)/,
    'le rappel de fin ne vérifie plus que l’animation s’est terminée',
  );
});

test('🔴 UN REFUS NE S’AFFICHE PAS COMME UNE RÉUSSITE', () => {
  // 🔴 VU SUR L'ÉMULATEUR LE 08/09/2026, une fois le bandeau enfin visible : le
  // refus du serveur s'affichait EN VERT AVEC UNE COCHE, parce que l'écran
  // passait `type="success"` quoi qu'il arrive. Un message qui dit « refusé »
  // dans l'habit de « c'est fait » se lit à l'envers.
  const ecran = lireCode(ECRAN_INCIDENT);
  assert.ok(
    !/<Toast[^>]*type="success"/.test(ecran),
    'l’écran d’incident rend encore tous ses bandeaux en « success »',
  );
  assert.match(ecran, /type=\{toast\.type\}/, 'le bandeau ne porte plus sa nature');
  assert.match(
    ecran,
    /const direErreur = /,
    'les messages d’erreur ne passent plus par un chemin qui les marque comme tels',
  );
});
