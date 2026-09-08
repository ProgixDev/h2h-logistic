// UN MONTANT NE SE MET PAS EN FORME À LA MAIN.
//
// 🔴 CINQ ENDROITS LE FAISAIENT, ET LE PLUS VISIBLE ÉTAIT LE PIRE. L'écran de
// fin de co-livraison — celui qui annonce au cotransporteur ce qu'il vient de
// gagner — affichait le résultat d'un `toFixed(2)` suivi d'un « € » :
//
//     Vous avez gagné pour cette co-livraison
//     12.50€
//
// Point anglais, pas d'espace avant le symbole. Même chose dans la frise
// (« Paiement libéré : 12.50€ »), dans les frais hors-hub proposés
// (« Frais supplémentaires proposés : 12.50 € »), et dans l'étiquette du
// graphique des gains, qui perdait en plus le séparateur de milliers : une
// semaine à 1 250 € s'y lisait « 1250€ ».
//
// ⚠️ CE N'EST PAS UNE QUESTION DE GOÛT. C'est l'écran sur lequel un
// cotransporteur décide s'il republie son trajet, et le tableau sur lequel il
// accepte ou refuse des frais. Le nombre est l'information.
//
// 🔴 LA MÊME FAMILLE VENAIT D'ÊTRE FERMÉE CÔTÉ MARCHÉ (`prixDUneOffre.test.ts`,
// où une offre de 27,50 € s'affichait « 27.5€ »). Elle repousse partout où l'on
// peut écrire un « € » à côté d'un nombre, et `formatCurrency` existait déjà
// ici, utilisé à vingt-cinq endroits : ce n'était pas un outil manquant, c'était
// un outil contourné.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { lireCode } from './sansCommentaires';

const FORMATAGE = join(process.cwd(), 'src', 'utils', 'formatting.ts');

const fichiers = (...racine: string[]): string[] => {
  const out: string[] = [];
  const marcher = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) marcher(p);
      else if (/\.tsx?$/.test(e) && !/\.test\./.test(e)) out.push(p);
    }
  };
  marcher(join(process.cwd(), 'src', ...racine));
  return out;
};

const relatif = (f: string) => f.replace(process.cwd(), '').replace(/\\/g, '/');

test('🔴 AUCUN ÉCRAN NE COLLE UN « € » DERRIÈRE UNE EXPRESSION', () => {
  // ⚠️ LA RÈGLE VISE LA VALEUR INTERPOLÉE, PAS LE SYMBOLE. `incidents-protocol`
  // écrit « un frais d'annulation de 4 € est imputé au vendeur » — de la PROSE,
  // où « 4,00 € » se lirait plus mal. Interdire tout « € » serait donc faux ;
  // ce qu'on interdit, c'est un « € » accolé à la fermeture d'une expression,
  // en JSX (`{x}€`) comme dans un gabarit (`${x}€`).
  const colle = /\}\s*€/;

  const coupables = [...fichiers('app'), ...fichiers('components')]
    .filter((f) => colle.test(lireCode(f)))
    .map(relatif);

  assert.deepEqual(
    coupables,
    [],
    'un montant est rendu comme un nombre JavaScript suivi de « € » — ' +
      '12,50 € s’affichera « 12.50€ ». `formatCurrency` porte la virgule, ' +
      'l’espace insécable et le séparateur de milliers.',
  );
});

test('🔴 PERSONNE NE FABRIQUE SA PROPRE VIRGULE DÉCIMALE', () => {
  // 🔴 LA FORME QUI SE CROIT CORRECTE. `toFixed(2).replace('.', ',')` rend bien
  // « 12,50 » — c'est ce que faisait `participationMoyenneLabel`, et c'était
  // juste. Mais garder deux mises en forme concurrentes est exactement ce qui
  // laisse repousser la mauvaise : le jour où l'on en copie une, on ne sait plus
  // laquelle fait autorité, et aucune des deux ne porte le séparateur de
  // milliers.
  //
  // ⚠️ ET LA RÈGLE NE VAUT QUE POUR L'ARGENT. `carbon.ts` écrit
  // « 12,3 kg CO₂ » de la même façon, et a raison : `formatCurrency` y
  // collerait un « € ». Le premier jet de cette clause l'a signalé — d'où le
  // « € » exigé SUR LA MÊME LIGNE, qui est ce qui distingue une somme d'une
  // masse.
  const bricolage = /toFixed\([^)]*\)\s*\.\s*replace\(/;

  const coupables = [...fichiers('app'), ...fichiers('components'), ...fichiers('utils')]
    .filter(
      (f) =>
        f !== FORMATAGE &&
        lireCode(f)
          .split('\n')
          .some((l) => bricolage.test(l) && l.includes('€')),
    )
    .map(relatif);

  assert.deepEqual(
    coupables,
    [],
    'une mise en forme monétaire est refaite à la main au lieu de passer par ' +
      '`formatCurrency` — deux implémentations finissent par diverger',
  );
});

test('🔴 UNE SEULE SOURCE POUR L’EURO', () => {
  // Toute mise en forme monétaire naît dans `formatting.ts`. Une seconde
  // `Intl.NumberFormat` ailleurs, c'est une seconde convention — et le jour où
  // l'application deviendra vraiment bilingue, deux endroits à corriger au lieu
  // d'un.
  const ailleurs = [...fichiers('app'), ...fichiers('components'), ...fichiers('utils'), ...fichiers('services')]
    .filter((f) => f !== FORMATAGE && /Intl\.NumberFormat/.test(lireCode(f)))
    .map(relatif);

  assert.deepEqual(ailleurs, [], '`Intl.NumberFormat` est employé hors de `formatting.ts`');
});

test('✅ LES TROIS FORMATEURS EXISTENT, ET DISENT CE QU’ILS FONT', () => {
  // ⚠️ INTERDIRE NE SUFFIT PAS : effacer les appels satisferait les trois
  // clauses ci-dessus. On exige donc que les outils restent là — et qu'ils
  // gardent la propriété qui les distingue.
  const code = lireCode(FORMATAGE);

  for (const nom of ['formatCurrency', 'formatCurrencyCompact', 'formatAmount']) {
    assert.match(code, new RegExp(`export function ${nom}\\(`), `\`${nom}\` a disparu`);
  }

  // La forme pleine porte le symbole ; la forme nue ne le porte pas — c'est
  // toute la raison d'être de la seconde, puisque les gabarits de traduction
  // placent le « € » eux-mêmes, et pas au même endroit selon la langue.
  const bloc = (nom: string) => {
    const d = code.indexOf(`export function ${nom}(`);
    const f = code.indexOf('\n}', d);
    return code.slice(d, f);
  };
  assert.match(bloc('formatCurrency'), /style: 'currency'/, '`formatCurrency` n’affiche plus de symbole');
  assert.match(bloc('formatCurrencyCompact'), /style: 'currency'/, '`formatCurrencyCompact` n’affiche plus de symbole');
  assert.ok(
    !/style: 'currency'/.test(bloc('formatAmount')),
    '`formatAmount` affiche un symbole — les gabarits en placent déjà un, ' +
      'l’anglais afficherait « €12,50 € »',
  );
  // 🔴 ET LA FORME COMPACTE RESTE COMPACTE. Sans ce plafond elle rendrait
  // « 1 250,00 € » dans une étiquette de neuf pixels, et quelqu'un la
  // remplacerait par un `toFixed(0)` — le défaut d'origine, réintroduit.
  assert.match(
    bloc('formatCurrencyCompact'),
    /maximumFractionDigits: 0/,
    '`formatCurrencyCompact` n’est plus compacte',
  );
});
