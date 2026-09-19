// La page « Règles de délais » décrit chaque formulaire que la « Règle simple à
// retenir » cite. Constat client du 19/09/2026 : le formulaire 13 (vendeur et
// cotransporteur absents au rendez-vous de collecte, règle D6) y était cité
// sans qu'aucune section ne le décrive.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lireCode } from '@/utils/sansCommentaires';

const src = lireCode('src/app/delays-rules.tsx');

test('CHAQUE FORMULAIRE CITÉ PAR LA RÈGLE SIMPLE A SA SECTION', () => {
  const simple = src.slice(src.indexOf("title: 'Règle simple à retenir'"));
  const cites = new Set([...simple.matchAll(/formulaire (\d+)/g)].map((m) => m[1]!));
  const decrits = src.slice(0, src.indexOf("title: 'Règle simple à retenir'"));
  for (const numero of cites) {
    assert.ok(
      new RegExp(`title: '(Règle spécifique au formulaire ${numero}|Règle commune aux formulaires[^']*\\b${numero}\\b)`).test(decrits),
      `le formulaire ${numero} est cité sans section qui le décrive`,
    );
  }
});

test('LA SECTION DU FORMULAIRE 13 PORTE LA RÈGLE D6 : 10 MIN, REMBOURSEMENT, 2 € CHACUN, 24 H', () => {
  const debut = src.indexOf("title: 'Règle spécifique au formulaire 13'");
  assert.ok(debut > 0);
  const section = src.slice(debut, src.indexOf('number:', debut));
  assert.ok(section.includes('10 minutes'));
  assert.ok(section.includes("l'acheteur est remboursé"));
  assert.ok(section.includes('2 € chacun'));
  assert.ok(section.includes('24 heures pour contester via le formulaire 14'));
});

test('LES SECTIONS SONT NUMÉROTÉES DANS L’ORDRE, SANS TROU NI DOUBLON', () => {
  const numeros = [...src.matchAll(/^\s{4}number: (\d+),/gm)].map((m) => Number(m[1]));
  assert.deepEqual(numeros, numeros.map((_, i) => i + 1));
});
