// LIRE LE CODE SANS SES COMMENTAIRES — LA FONCTION DONT DÉPENDENT LES GARDES.
//
// 🔴 LE PIÈGE QU'ELLE EXISTE POUR DÉSAMORCER, ET QUI A FRAPPÉ SIX FOIS. Une
// garde qui cherche un défaut dans les sources trouve d'abord LE COMMENTAIRE
// QUI EXPLIQUE CE DÉFAUT. `pickupFlow.test.ts` l'a écrit le premier : « le test
// tomberait pour la raison même qui prouve qu'il est satisfait ».
//
// 🔴 ET LE 07/09/2026 ON A COMPTÉ : SIX `codeSeul` LOCAUX, EN DEUX VERSIONS
// INCOMPATIBLES. Quatre filtraient les LIGNES commençant par `//`, `*`, `/*` ou
// `{/*`. Deux effaçaient les commentaires à coups de `.replace(/\/\/.*$/gm, '')`.
// Chacune avait son angle mort, et ce n'était pas le même :
//
//   • la version « par lignes » laissait passer un commentaire EN FIN DE LIGNE
//     de code — `const x = 1; // submitUserReport` — donc un faux positif ;
//   • la version « par expression » coupait aussi à l'intérieur des CHAÎNES —
//     `'https://exemple.fr'` devenait `'https:` — donc un faux négatif, et
//     silencieux.
//
// ⚠️ SIX COPIES DE CE QUI DÉCIDE CE QU'UNE GARDE VOIT, C'EST SIX GARDES DONT
// ON NE SAIT PLUS CE QU'ELLES LISENT. Une seule version, plus forte que les
// deux : elle enlève les commentaires de ligne ET de bloc, sans jamais toucher
// au contenu des chaînes.
//
// ⚠️ LES SAUTS DE LIGNE SONT PRÉSERVÉS, et ce n'est pas cosmétique :
// `lieuRendezVous.test.ts` rapporte le NUMÉRO DE LIGNE du fautif. Les
// commentaires deviennent des espaces, pas du vide.
//
// ⚠️ CE N'EST PAS UN ANALYSEUR JAVASCRIPT COMPLET, et il vaut mieux le dire :
// un `//` non échappé dans une classe de caractères d'expression régulière
// (`/[/]/`) le tromperait encore. Aucun fichier du dépôt n'en contient ; le
// jour où l'un en contiendra, c'est ici qu'il faudra regarder.
import { readFileSync } from 'node:fs';

/** Le source privé de ses commentaires, à la ligne près. */
export function codeSeul(source: string): string {
  let sortie = '';
  let i = 0;
  const n = source.length;

  while (i < n) {
    const c = source[i];
    const suivant = source[i + 1];

    // Une barre inverse échappe le caractère suivant — y compris le `\/` d'une
    // expression régulière, sans quoi `/\/\//` serait pris pour un commentaire.
    if (c === '\\') {
      sortie += c + (suivant ?? '');
      i += 2;
      continue;
    }

    if (c === '/' && suivant === '/') {
      while (i < n && source[i] !== '\n') {
        sortie += ' ';
        i += 1;
      }
      continue;
    }

    if (c === '/' && suivant === '*') {
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        sortie += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      sortie += '  ';
      i += 2;
      continue;
    }

    if (c === '"' || c === '\'' || c === '`') {
      sortie += c;
      i += 1;
      while (i < n) {
        if (source[i] === '\\') {
          sortie += source[i] + (source[i + 1] ?? '');
          i += 2;
          continue;
        }
        sortie += source[i];
        const fin = source[i] === c;
        i += 1;
        if (fin) break;
      }
      continue;
    }

    sortie += c;
    i += 1;
  }

  return sortie;
}

/** Le même, depuis un chemin. */
export const lireCode = (chemin: string): string => codeSeul(readFileSync(chemin, 'utf8'));
