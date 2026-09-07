// L'EMPREINTE DU TYPE PARTAGÉ — le garde-fou que `hub.ts` annonçait sans l'avoir.
//
// 🔴 CE FICHIER N'EXISTAIT PAS, ET SON ABSENCE ÉTAIT INVISIBLE PARCE QUE `hub.ts`
// AFFIRME LE CONTRAIRE. Son en-tête dit, depuis le 06/09/2026 :
//
//     « la seule mécanique disponible est la copie, et un test d'empreinte de
//       chaque côté (`src/types/hubPartage.test.ts`) qui échoue dès que l'une
//       des deux dérive. »
//
// Aucun des deux dépôts ne portait ce fichier. Les deux copies pouvaient donc
// diverger en silence — et elles l'auraient fait le 07/09 : l'ajout de quatre
// types de lieu (`place`, `port`, `eglise`, `aire_covoiturage`) touchait
// `hub.ts` côté place de marché, et rien n'aurait signalé que l'application
// coursier gardait l'ancienne union à six valeurs. Un `place_type` inconnu y
// serait devenu un `HubPlaceType` invalide par simple `as`.
//
// ⚠️ UN COMMENTAIRE QUI DÉCRIT UN CONTRÔLE ABSENT EST PIRE QUE PAS DE
// COMMENTAIRE : il dispense le relecteur de vérifier.
//
// ── CE QUE CE TEST PEUT ET NE PEUT PAS ──────────────────────────────────────
//
// 🔴 IL N'Y A PAS DE MONOREPO (hand-to-hand/docs/backend/ARCHITECTURE.md:20),
// donc aucun lanceur ne balaie les deux dépôts. Deux contrôles, de portées
// différentes :
//
//   1. L'EMPREINTE ÉPINGLÉE, qui marche toujours. Les deux dépôts portent la
//      MÊME constante, et elle fait partie du contenu copié. Modifier `hub.ts`
//      d'un côté oblige à y toucher, donc à copier les deux fichiers de l'autre
//      côté. Ça ne détecte pas la dérive : ça rend impossible de la produire
//      sans s'en apercevoir.
//
//   2. LA COMPARAISON DIRECTE, quand l'autre dépôt est là. Sur une machine de
//      développement les deux sont côte à côte : on lit le fichier voisin et on
//      compare octet à octet. Ailleurs (CI d'un seul dépôt), le test le DIT et
//      s'en tient au point 1 — il ne fait pas semblant d'avoir vérifié.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * 🔴 CETTE CONSTANTE EST LA MOITIÉ DU MÉCANISME, et elle est IDENTIQUE dans le
 * `src/types/hubPartage.test.ts` du dépôt voisin. En changer la valeur d'un
 * seul côté est le geste qu'on cherche à rendre visible.
 *
 * Pour la mettre à jour après une modification VOLONTAIRE de `hub.ts` :
 *     sha256sum src/types/hub.ts
 * puis copier `hub.ts` ET cette valeur dans l'autre dépôt.
 */
const EMPREINTE = 'd1a268494bcb39ac3dc970da2919dfe3418b8af27a000e0543b06b74432ef059';

/** Le dépôt voisin, quand il est présent sur la machine. */
const VOISIN = 'hand-to-hand';

const ICI = join(process.cwd(), 'src', 'types', 'hub.ts');

const empreinteDe = (chemin: string): string =>
  // ⚠️ SUR LE CONTENU BRUT, sans normaliser les fins de ligne. Un `hub.ts` qui
  // arriverait en CRLF d'un côté et LF de l'autre EST une divergence : les deux
  // fichiers doivent être copiés, pas retapés.
  createHash('sha256').update(readFileSync(chemin)).digest('hex');

test('🔴 `types/hub.ts` N’A PAS BOUGÉ SANS QU’ON LE SACHE', () => {
  assert.equal(
    empreinteDe(ICI),
    EMPREINTE,
    'types/hub.ts a change : copiez-le dans '
      + `${VOISIN}/src/types/hub.ts, puis mettez EMPREINTE a jour DES DEUX COTES.`,
  );
});

test('🔴 LES DEUX DÉPÔTS PORTENT LE MÊME FICHIER, OCTET POUR OCTET', () => {
  // Le dépôt voisin est le frère de celui-ci : c:\dev\hand-to-hand et
  // c:\dev\h2h-logistic. On remonte d'un cran plutôt que d'écrire un chemin
  // absolu, qui ne vaudrait que sur une machine.
  const voisin = join(dirname(process.cwd()), VOISIN, 'src', 'types', 'hub.ts');

  if (!existsSync(voisin)) {
    // ⚠️ ON LE DIT PLUTÔT QUE DE PASSER EN SILENCE. Un test vert qui n'a rien
    // vérifié est le défaut que tout ce fichier corrige.
    console.warn(
      `[hubPartage] ${VOISIN} absent — comparaison directe non faite. `
        + "Seule l'empreinte epinglee a ete verifiee.",
    );
    return;
  }

  assert.equal(
    empreinteDe(voisin),
    empreinteDe(ICI),
    `${VOISIN}/src/types/hub.ts a derive de celui-ci : les deux applications ne `
      + 'voient plus le meme hub.',
  );
});
