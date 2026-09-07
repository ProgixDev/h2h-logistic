// LA FONCTION DONT DÉPENDENT LES AUTRES GARDES MÉRITE LA SIENNE.
//
// 🔴 SI `codeSeul` SE TROMPE, PLUSIEURS GARDES SE TROMPENT AVEC ELLE — et dans
// le sens le plus dangereux : elles passent au vert. Les deux premiers tests
// reproduisent les deux angles morts mesurés le 07/09/2026, un par famille de
// copies locales.
import test from 'node:test';
import assert from 'node:assert/strict';
import { codeSeul } from '@/utils/sansCommentaires';

test('🔴 LE COMMENTAIRE EN FIN DE LIGNE DE CODE PART AUSSI', () => {
  // ⚠️ L'ANGLE MORT DE LA VERSION « PAR LIGNES » (quatre copies). Elle ne
  // retirait que les lignes COMMENÇANT par `//` : une garde qui cherche
  // `submitUserReport` le trouvait dans la note en bout de ligne.
  const code = codeSeul('const x = 1; // submitUserReport\n');
  assert.ok(!code.includes('submitUserReport'), 'la note de fin de ligne survit');
  assert.ok(code.includes('const x = 1;'), 'le code, lui, doit rester');
});

test('🔴 LE CONTENU DES CHAÎNES N’EST JAMAIS TOUCHÉ', () => {
  // ⚠️ L'ANGLE MORT DE LA VERSION « PAR EXPRESSION » (deux copies) :
  // `.replace(/\/\/.*$/gm, '')` coupait au premier `//`, y compris dans une
  // URL. La chaîne devenait `'https:` — un faux négatif, et silencieux.
  const code = codeSeul("const u = 'https://exemple.fr/a'; // vrai commentaire\n");
  assert.ok(code.includes("'https://exemple.fr/a'"), 'l’URL a été amputée');
  assert.ok(!code.includes('vrai commentaire'));
});

test('⚠️ LES BLOCS PARTENT, JSX COMPRIS', () => {
  const code = codeSeul('a;\n/* bloc\n   sur deux lignes */\nb;\n{/* note JSX */}\nc;\n');
  for (const mot of ['bloc', 'deux lignes', 'note JSX']) {
    assert.ok(!code.includes(mot), `« ${mot} » a survécu`);
  }
  for (const mot of ['a;', 'b;', 'c;']) assert.ok(code.includes(mot));
});

test('🔴 LE NOMBRE DE LIGNES NE BOUGE PAS', () => {
  // `lieuRendezVous.test.ts` rapporte le NUMÉRO DE LIGNE du fautif : décaler
  // les lignes enverrait le lecteur au mauvais endroit.
  const source = 'a;\n// une note\n/* deux\n   lignes */\nb;\n';
  assert.equal(codeSeul(source).split('\n').length, source.split('\n').length);
});

test('⚠️ UNE EXPRESSION RÉGULIÈRE AVEC DES BARRES ÉCHAPPÉES SURVIT', () => {
  // `/\/\//` : sans la règle d'échappement, le second `\/` suivi de `/` était
  // pris pour le début d'un commentaire, et la fin de la ligne disparaissait.
  const code = codeSeul('const r = /\\/\\//g; const garde = 1;\n');
  assert.ok(code.includes('const garde = 1;'), 'la fin de ligne a été mangée');
});

test('⚠️ LES APOSTROPHES FRANÇAISES NE DÉSÉQUILIBRENT RIEN', () => {
  // Une apostrophe typographique (’) n'ouvre pas de chaîne — sinon tout le
  // reste du fichier serait lu comme une chaîne, et plus rien ne serait filtré.
  const code = codeSeul('const t = "l’heure"; // note\nconst u = 2;\n');
  assert.ok(!code.includes('note'));
  assert.ok(code.includes('const u = 2;'));
});
