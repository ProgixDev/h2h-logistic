// UN ÉCRAN NE LIT PAS UN MAGASIN EN APPELANT SES `get…()`.
//
// 🔴 L'ONGLET CO-LIVRAISONS NE SE METTAIT JAMAIS À JOUR (vu à l'émulateur le
// 10/09/2026). Le magasin contenait quatre co-livraisons, l'accueil affichait
// « Aucune co-livraison en cours ». Le code avait l'air juste :
//
//     const { getActiveMissions } = useMissionStore();
//     const actives = getActiveMissions();
//
// ⚠️ C'EST LE REACT COMPILER (`app.json` → `experiments.reactCompiler`). Il
// mémoïse un appel dont les arguments n'ont pas changé ; `getActiveMissions` est
// la même fonction du premier au dernier rendu, donc son résultat — calculé
// quand la liste était encore vide — est resservi indéfiniment. Même chose pour
// un `useMemo` qui dépend du getter plutôt que des données.
//
// ⚠️ INVISIBLE SANS LE COMPILATEUR, ET À LA RELECTURE : sans lui, l'appel est
// rejoué à chaque rendu et tout marche. La règle est donc structurelle —
// pendant un rendu, on lit un CROCHET (`useActiveMissions()`…), qui s'abonne à
// la donnée ; les `get…()` restent pour les gestionnaires d'événements.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { codeSeul, lireCode } from '@/utils/sansCommentaires';

const RACINE = join(process.cwd(), 'src');

const fichiers = (dir: string, acc: string[] = []): string[] => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) fichiers(p, acc);
    else if (/\.tsx?$/.test(e) && !/\.test\.tsx?$/.test(e)) acc.push(p);
  }
  return acc;
};

// Les trois formes par lesquelles un écran met la main sur un getter :
//   const { getX } = useXStore();        — la forme de l'incident
//   useXStore((s) => s.getX)             — la même, par sélecteur
//   useXStore().getX(…)                  — la même, sans variable
const FORMES: RegExp[] = [
  /\{[^{}]*\bget[A-Z]\w*\b[^{}]*\}\s*=\s*use\w+Store\(\s*\)/,
  /use\w+Store\(\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\.get[A-Z]\w*\s*\)/,
  /use\w+Store\(\s*\)\s*\.\s*get[A-Z]\w*/,
];

const fautes = (code: string): string[] =>
  FORMES.flatMap((f) => {
    const m = code.match(f);
    return m ? [m[0].replace(/\s+/g, ' ')] : [];
  });

test('⚠️ LA GARDE RECONNAÎT LES TROIS FORMES — et laisse passer les bonnes', () => {
  // Sans ce témoin, une expression mal écrite passerait pour une garde.
  assert.deepEqual(fautes(codeSeul(
    'const { missions, getActiveMissions, charger } = useMissionStore();',
  )).length, 1);
  assert.deepEqual(fautes('const g = useEarningsStore((s) => s.getEarningsForPeriod);').length, 1);
  assert.deepEqual(fautes('const x = useMissionStore().getProposals();').length, 1);
  assert.deepEqual(fautes([
    'const { missions, charger } = useMissionStore();',
    'const actives = useActiveMissions();',
    'const charger = useMissionStore((s) => s.charger);',
    'const { isOnboarded } = useAuthStore.getState();',
  ].join('\n')), []);
});

test('🔴 AUCUN ÉCRAN NE LIT UN GETTER DE MAGASIN PENDANT SON RENDU', () => {
  const trouvees = ['app', 'components', 'hooks']
    .flatMap((d) => fichiers(join(RACINE, d)))
    .flatMap((f) => fautes(lireCode(f)).map((x) => `${f.replace(process.cwd(), '.')} : ${x}`));
  assert.deepEqual(
    trouvees,
    [],
    'lecture par getter — mémoïsée par le React Compiler, elle ne se met plus à jour. '
      + 'Lire le crochet correspondant (`useActiveMissions()`, `useMissionById(id)`, '
      + '`useEarningsForPeriod(p)`…) :\n' + trouvees.join('\n'),
  );
});

test('🔴 LES CROCHETS EXISTENT, ET LES LISTES FILTRÉES PASSENT PAR `useShallow`', () => {
  // ⚠️ `filter` rend un tableau neuf à chaque lecture : sans `useShallow`,
  // zustand 5 y voit un changement permanent — boucle de rendus.
  const missions = lireCode(join(RACINE, 'stores', 'useMissionStore.ts'));
  for (const crochet of ['useProposals', 'usePendingMissions', 'useActiveMissions', 'useCompletedMissions', 'useMissionById']) {
    assert.match(missions, new RegExp(`export const ${crochet}\\b`), `${crochet} a disparu`);
  }
  assert.match(missions, /useProposals[^\n]*useShallow\(selectProposals\)/);
  assert.match(missions, /useActiveMissions[^\n]*useShallow\(selectActiveMissions\)/);

  const participations = lireCode(join(RACINE, 'stores', 'useEarningsStore.ts'));
  assert.match(participations, /export const useEarningsForPeriod\b[\s\S]{0,160}useShallow\(/);
});

test('⚠️ LES GETTERS DÉLÈGUENT AUX MÊMES SÉLECTEURS QUE LES CROCHETS', () => {
  // Deux définitions de « co-livraison active » finiraient par diverger :
  // l'écran et le gestionnaire d'événement ne compteraient pas la même chose.
  const missions = lireCode(join(RACINE, 'stores', 'useMissionStore.ts'));
  assert.match(missions, /getProposals:\s*\(\)\s*=>\s*selectProposals\(get\(\)\)/);
  assert.match(missions, /getActiveMissions:\s*\(\)\s*=>\s*selectActiveMissions\(get\(\)\)/);
  assert.match(missions, /getMissionById:\s*\(id\)\s*=>\s*findMissionById\(get\(\),\s*id\)/);
  const participations = lireCode(join(RACINE, 'stores', 'useEarningsStore.ts'));
  assert.match(participations, /getEarningsForPeriod:\s*\(period\)\s*=>\s*selectEarningsForPeriod\(get\(\),\s*period\)/);
});

test('🔴 LES CO-LIVRAISONS SE RELISENT SANS QU’ON LE DEMANDE', () => {
  // Une proposition expire en quinze minutes : rien ne la faisait apparaître
  // tant que l'application restait ouverte.
  const onglets = lireCode(join(RACINE, 'app', '(tabs)', '_layout.tsx'));
  assert.match(onglets, /setInterval\(/, 'plus de relecture périodique des co-livraisons');
  assert.match(onglets, /AppState\.addEventListener\('change'/, 'la relecture ne suit plus le premier plan');
  const liste = lireCode(join(RACINE, 'app', '(tabs)', 'missions.tsx'));
  assert.match(liste, /useFocusEffect\(/, 'l’onglet Co-livraisons ne relit plus en revenant dessus');
});
