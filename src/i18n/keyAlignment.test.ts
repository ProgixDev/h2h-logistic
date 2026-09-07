// fr.ts ET en.ts DOIVENT PORTER EXACTEMENT LES MÊMES CLÉS.
//
// 🔴 CE DÉPÔT N'AVAIT AUCUN GARDE-FOU, ET IL EN AVAIT PLUS BESOIN QUE L'AUTRE.
// `hand-to-hand` porte ce test depuis le 30/07/2026 ; ici, rien. Or les deux
// applications ne se trompent pas de la même façon quand une clé manque :
//
//   • côté marketplace, `useT()` rend le dictionnaire de la langue active ; une
//     clé absente vaut `undefined`, et React Native affiche une CHAÎNE VIDE ;
//   • ici, `useTranslation().t()` rend LE CHEMIN DE LA CLÉ LUI-MÊME. Une clé
//     oubliée en anglais n'affiche donc pas un blanc, elle affiche le texte
//     `zone.explainer` À L'UTILISATEUR, en toutes lettres.
//
// Le mode de défaillance le plus visible est ici, et c'est ici qu'il n'était pas
// surveillé.
//
// ⚠️ ET LE COMPILATEUR NE COUVRE QUE LA MOITIÉ DU PROBLÈME. Une clé présente en
// FR et absente en EN casse `tsc` LÀ OÙ ELLE EST LUE ; une clé jamais lue — ou
// lue derrière un accès dynamique, ce que fait précisément `t('zone.legend')` —
// passe. Le type compare le code à un dictionnaire, jamais les deux entre eux.
//
// ⚠️ PAS DE TEST « AUCUNE CLÉ EN DOUBLE » : un objet littéral qui déclare deux
// fois la même clé s'effondre à l'analyse, `Object.entries` n'en voit qu'une, et
// le test comparerait une liste sans doublon à elle-même. Le doublon appartient
// au compilateur (TS1117), qui le nomme à la ligne près.
import test from 'node:test';
import assert from 'node:assert/strict';

import { fr } from '@/i18n/fr';
import { en } from '@/i18n/en';

/** Tous les chemins de feuilles d'un dictionnaire, en notation pointée. */
function cheminsDeFeuilles(valeur: unknown, prefixe = ''): string[] {
  if (valeur === null || typeof valeur !== 'object') return [prefixe];
  const out: string[] = [];
  for (const [cle, sousValeur] of Object.entries(valeur as Record<string, unknown>)) {
    out.push(...cheminsDeFeuilles(sousValeur, prefixe ? `${prefixe}.${cle}` : cle));
  }
  return out;
}

const CLES_FR = cheminsDeFeuilles(fr);
const CLES_EN = cheminsDeFeuilles(en);

test('🔴 AUCUNE CLÉ N’EXISTE DANS UNE LANGUE SANS L’AUTRE', () => {
  // ⚠️ LE BALAYAGE DOIT VOIR LES DEUX DICTIONNAIRES. Sans ce contrôle, un import
  // cassé rendrait deux listes vides — donc deux ensembles « égaux », donc un
  // test vert qui ne vérifie rien.
  //
  // ⚠️ LE SEUIL EST UN PLANCHER, PAS UN COMPTE. 198 clés au 06/09/2026 ; 150
  // laisse la place à un retrait légitime tout en attrapant un dictionnaire
  // vidé. L'y coller au chiffre exact ferait échouer ce test à chaque clé
  // ajoutée, et on finirait par le désarmer.
  assert.ok(CLES_FR.length > 150, `fr.ts semble vide (${CLES_FR.length})`);
  assert.ok(CLES_EN.length > 150, `en.ts semble vide (${CLES_EN.length})`);

  const ensembleEn = new Set(CLES_EN);
  const ensembleFr = new Set(CLES_FR);

  assert.deepEqual(CLES_FR.filter((k) => !ensembleEn.has(k)), [],
    'des clés de fr.ts manquent dans en.ts — elles s afficheraient en clair');
  assert.deepEqual(CLES_EN.filter((k) => !ensembleFr.has(k)), [],
    'des clés de en.ts manquent dans fr.ts');
  assert.equal(CLES_FR.length, CLES_EN.length, 'même nombre de clés');
});

test('🔴 AUCUNE VALEUR VIDE — une clé vide est une clé qui ment', () => {
  // Une chaîne vide passe le contrôle d'alignement et n'affiche rien : c'est
  // une clé qui existe des deux côtés et ne dit rien nulle part.
  const vides: string[] = [];
  const parcourir = (v: unknown, p = '') => {
    if (typeof v === 'string') { if (v.trim() === '') vides.push(p); return; }
    if (v && typeof v === 'object') {
      for (const [k, s] of Object.entries(v as Record<string, unknown>)) {
        parcourir(s, p ? `${p}.${k}` : k);
      }
    }
  };
  parcourir(fr); parcourir(en);
  assert.deepEqual(vides, [], `valeurs vides :\n${vides.join('\n')}`);
});

test('⚠️ TOUTE FEUILLE EST UNE CHAÎNE — pas un nombre ni un booléen', () => {
  // `t()` rend la valeur telle quelle : un nombre finirait dans un `<Text>` sans
  // localisation, et un booléen y afficherait « true ».
  const fautives: string[] = [];
  const parcourir = (v: unknown, p = '') => {
    if (v === null || typeof v !== 'object') {
      if (typeof v !== 'string') fautives.push(`${p} (${typeof v})`);
      return;
    }
    for (const [k, s] of Object.entries(v as Record<string, unknown>)) {
      parcourir(s, p ? `${p}.${k}` : k);
    }
  };
  parcourir(fr); parcourir(en);
  assert.deepEqual(fautives, [], `feuilles non textuelles :\n${fautives.join('\n')}`);
});

test('🔴 TOUTE FENTE D’UNE CHAÎNE FR EXISTE AUSSI EN EN', () => {
  // 🔴 LE DÉFAUT QUI A MOTIVÉ CE TEST, ET IL VENAIT D'ARRIVER. `zone.sizeChip`
  // portait `{diameter}` pendant que `HubCard` passait `{radius}` : la puce
  // affichait « Zone {diameter} m » à l'écran. L'alignement des clés ne l'aurait
  // pas vu — la clé existait des deux côtés.
  //
  // ⚠️ ON COMPARE LES DEUX LANGUES ENTRE ELLES, pas au code : une fente
  // présente en français et absente en anglais laisse un trou dans la phrase
  // traduite, et l'inverse laisse un `{…}` littéral à l'écran.
  const fentes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  const plat = (v: unknown, p = '', out: Record<string, string> = {}) => {
    if (typeof v === 'string') { out[p] = v; return out; }
    if (v && typeof v === 'object') {
      for (const [k, s] of Object.entries(v as Record<string, unknown>)) {
        plat(s, p ? `${p}.${k}` : k, out);
      }
    }
    return out;
  };
  const pfr = plat(fr); const pen = plat(en);
  const ecarts: string[] = [];
  for (const [k, v] of Object.entries(pfr)) {
    if (!(k in pen)) continue;
    const a = fentes(v).join(','); const b = fentes(pen[k]).join(',');
    if (a !== b) ecarts.push(`${k} : fr[${a}] ≠ en[${b}]`);
  }
  assert.deepEqual(ecarts, [], `fentes desalignees :\n${ecarts.join('\n')}`);
});
