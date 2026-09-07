// L'APPLICATION COTRANSPORTEUR N'A PLUS DE DOSSIER DE DÉMONSTRATION.
//
// 🔴 CE QUE `services/mock/` CONTENAIT ENCORE LE 07/09/2026 — 957 lignes, et
// trois natures très différentes mélangées sous le même nom :
//
//   • DU CODE MORT — `chat.ts`, `routes.ts`, `navigationSimulator.ts` : 209
//     lignes que PLUS AUCUN fichier n'importait. `mock/chat` n'était même plus
//     cité que par la garde qui interdit de le lire.
//   • DE FAUSSES SOUMISSIONS — `submitHubReport()` et `submitUserReport()`
//     attendaient une seconde et rendaient un identifiant fabriqué. Les magasins
//     appellent `signalerHub` et `signalerUtilisateur` depuis le 04/09/2026 :
//     elles ne servaient plus, mais elles restaient appelables.
//   • DE LA CONFIGURATION, QUI N'A JAMAIS ÉTÉ FAUSSE — les motifs de
//     signalement, les formulaires d'incident, le protocole. Des décisions
//     produit, rangées sous un nom qui disait le contraire.
//
// ⚠️ ET C'EST LE MÉLANGE QUI COÛTAIT. Compter les « fichiers qui importent un
// mock » donnait neuf, et laissait croire que neuf écrans affichaient des
// données inventées. Ils lisaient une liste de motifs. La mesure était juste et
// la conclusion fausse — il fallait ouvrir chaque fichier pour le voir.
//
// ⚠️ `AppNotification` EST PARTI DANS `types/`. `services/notifications.ts` lit
// la vraie table depuis le 06/09/2026 et importait pourtant sa FORME depuis le
// fichier de démonstration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { lireCode } from '@/utils/sansCommentaires';

const RACINE = join(process.cwd(), 'src');

const fichiers = (dir: string, acc: string[] = []): string[] => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) fichiers(p, acc);
    else if (/\.tsx?$/.test(e)) acc.push(p);
  }
  return acc;
};

test('🔴 LE DOSSIER `services/mock/` NE REVIENT PAS', () => {
  assert.ok(
    !existsSync(join(RACINE, 'services', 'mock')),
    'le dossier de démonstration est revenu — la configuration va dans '
      + '`constants/`, les types dans `types/`, et ce qui est faux ne va nulle part',
  );
});

test('🔴 AUCUN FICHIER N’IMPORTE PLUS DE MOCK', () => {
  const fautifs = fichiers(RACINE)
    .filter((c) => /from\s+['"]@\/services\/mock\//.test(readFileSync(c, 'utf8')))
    .map((c) => c.replace(process.cwd(), '.'));
  assert.deepEqual(fautifs, [], `import(s) de démonstration :\n${fautifs.join('\n')}`);
});

/** Le fichier SANS ses commentaires — même geste que `pickupFlow.test.ts`.
 *
 *  🔴 INDISPENSABLE ICI, ET LA PREMIÈRE VERSION DE CETTE GARDE L'AVAIT OUBLIÉ.
 *  Trois fichiers CITENT l'ancienne fonction pour expliquer ce qu'elle faisait —
 *  « `export async function submitUserReport(payload) {` … attendait une seconde
 *  et rendait un identifiant fabriqué ». La garde tombait donc sur les notes
 *  qui prouvent qu'elle est satisfaite. C'est le piège que `pickupFlow.test.ts`
 *  décrit déjà, mot pour mot.
 */

test('⚠️ ET LES FAUSSES SOUMISSIONS NON PLUS', () => {
  // Elles rendaient un identifiant fabriqué après une seconde d'attente : de
  // quoi faire croire à un signalement enregistré qui n'existait nulle part.
  const fautifs: string[] = [];
  for (const chemin of fichiers(RACINE)) {
    if (chemin.endsWith('plusDeMock.test.ts')) continue;
    const src = lireCode(chemin);
    for (const nom of ['submitHubReport', 'submitUserReport']) {
      if (new RegExp(`(function|const)\\s+${nom}\\b`).test(src)) {
        fautifs.push(`${chemin.replace(process.cwd(), '.')} → ${nom}`);
      }
    }
  }
  assert.deepEqual(fautifs, [], `fausse(s) soumission(s) :\n${fautifs.join('\n')}`);
});

test('⚠️ LA CONFIGURATION DÉPLACÉE EST BIEN LÀ', () => {
  // Trop supprimer est l'autre panne : ces quatre fichiers portent des décisions
  // produit — motifs de signalement, formulaires d'incident, protocole.
  for (const f of [
    'constants/signalementHub.ts',
    'constants/signalementUtilisateur.ts',
    'constants/formulairesIncident.ts',
    'constants/protocoleIncidents.ts',
    'types/notification.ts',
  ]) {
    assert.ok(existsSync(join(RACINE, f)), `${f} a disparu avec le dossier mock`);
  }
});
