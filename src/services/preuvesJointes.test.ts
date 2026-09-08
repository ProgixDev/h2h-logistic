// DES PHOTOS COLLECTÉES À L'ÉCRAN DOIVENT ARRIVER AU DOSSIER.
//
// 🔴 CE QUE LA MESURE A DIT LE 08/09/2026. `hub/report.tsx` propose « jusqu'à N
// photos pour illustrer » ; `report/user.tsx` en propose aussi, sous des motifs
// qui incluent « Danger, menace ou comportement agressif ». Les deux payloads
// portaient `photoUris` jusqu'aux stores — et les deux appels de service les
// laissaient tomber.
//
// ⚠️ LE SERVEUR, LUI, LES ATTENDAIT DEPUIS LE DÉBUT. `signaler_hub` prend
// `p_proofs jsonb default '[]'`, `signaler_utilisateur` aussi, et les deux
// tables ont leur colonne `proofs`. Ce n'était pas une fonctionnalité
// manquante : c'était un paramètre que personne ne remplissait. En base :
// 1 signalement de hub, 0 preuve.
//
// 🔴 ET LE DÉFAUT ÉTAIT DÉJÀ NOMMÉ AILLEURS. `services/incidents.ts`, corrigé le
// même jour, dit dans son en-tête : « c'est le même défaut que
// `hub_reports.proofs`, qui arrive vide depuis toujours ». Un défaut qu'on sait
// nommer et qu'on ne corrige pas reste un défaut.
//
// ⚠️ CETTE GARDE LIT LE CODE SANS SES COMMENTAIRES — ce fichier-ci et ceux
// qu'il surveille CITENT `p_proofs` en toutes lettres pour s'expliquer, et les
// compter ferait passer une explication pour un appel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { lireCode } from '@/utils/sansCommentaires';

const service = lireCode(join(process.cwd(), 'src', 'services', 'signalements.ts'));

/** Le corps d'une fonction exportée, jusqu'à la suivante. */
const corps = (code: string, nom: string): string => {
  const debut = code.indexOf(`export async function ${nom}(`);
  assert.notEqual(debut, -1, `${nom} a disparu`);
  const suivant = code.indexOf('\nexport ', debut + 1);
  return code.slice(debut, suivant === -1 ? undefined : suivant);
};

test('🔴 LES DEUX SIGNALEMENTS TRANSMETTENT LEURS PIÈCES JOINTES', () => {
  const manquants: string[] = [];
  for (const nom of ['signalerUtilisateur', 'signalerHub']) {
    const c = corps(service, nom);
    if (!/p_proofs:/.test(c)) manquants.push(`${nom} : n’envoie pas p_proofs`);
    if (!/televerserPreuvesSignalement\(/.test(c)) {
      manquants.push(`${nom} : ne téléverse pas les photos`);
    }
  }
  assert.deepEqual(
    manquants,
    [],
    `${manquants.length} signalement(s) perdent leurs preuves :\n  `
    + `${manquants.join('\n  ')}\n\n`
    + 'L’écran promet de joindre des photos ; le dossier arrive nu à la '
    + 'modération, et personne ne le voit.',
  );
});

test('🔴 ET CE QU’ON ENVOIE EST UN CHEMIN DANS LE SEAU, PAS UNE URI LOCALE', () => {
  // 🔴 `file:///data/user/0/…` NE VAUT QUE SUR CE TÉLÉPHONE. Poser une URI
  // locale dans `proofs` remplirait la colonne sans rien transmettre : la
  // panne deviendrait invisible, ce qui est pire que la colonne vide.
  const c = corps(service, 'televerserPreuvesSignalement');
  assert.match(c, /storage\s*\n?\s*\.from\('signalement-preuves'\)/, 'plus de téléversement');
  assert.match(c, /\.upload\(/, 'les photos ne sont plus déposées');
  // Le chemin est rangé par auteur : c'est ce que la policy du seau vérifie.
  assert.match(
    c,
    /\$\{profilId\}\//,
    'le chemin n’est plus rangé sous l’identifiant de l’auteur : '
    + '`signalement_preuves_auteur_write` le refusera',
  );
});

test('⚠️ ET LES DEUX APPELANTS PASSENT VRAIMENT CE QU’ILS ONT COLLECTÉ', () => {
  // ⚠️ SANS CECI, LES DEUX GARDES CI-DESSUS PASSERAIENT SUR UN TABLEAU VIDE.
  // Le service saurait téléverser, et les stores continueraient de ne rien lui
  // donner — c'est exactement l'état d'avant.
  const perdus: string[] = [];
  for (const store of ['useHubReportsStore.ts', 'useUserReportsStore.ts']) {
    const code = lireCode(join(process.cwd(), 'src', 'stores', store));
    if (!/photoUris:\s*payload\.photoUris/.test(code)) {
      perdus.push(`${store} : ne transmet pas payload.photoUris`);
    }
    if (!/profilId:/.test(code)) {
      perdus.push(`${store} : ne dit pas qui signale, le dépôt sera refusé`);
    }
  }
  assert.deepEqual(perdus, [], `${perdus.join('\n  ')}`);
});
