// UN AVIS N'OUVRE QUE CE QUE CETTE APPLICATION SAIT OUVRIR — `utils/routeNotification.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { routeSuivable } from '@/utils/routeNotification';

test('✅ LES ROUTES DU COTRANSPORTEUR SE SUIVENT — nouvelle mise en relation et ancien parcours', () => {
  assert.equal(routeSuivable('/proposition?id=c1'), '/proposition?id=c1');
  assert.equal(routeSuivable('/mission/m1'), '/mission/m1');
  assert.equal(routeSuivable('/mission/accept?id=m1'), '/mission/accept?id=m1');
});

test('🔴 UNE ROUTE DE LA PLACE DE MARCHÉ NE S’OUVRE PAS ICI — elle mènerait à « page introuvable »', () => {
  assert.equal(routeSuivable('/order/o1'), null);
  assert.equal(routeSuivable('/courtage/c1'), null);
  assert.equal(routeSuivable('/missions-et-plus'), null, 'un préfixe ne suffit pas');
});

test('🔴 UNE CHARGE UTILE N’EST PAS UNE ADRESSE — ni lien externe, ni valeur informe', () => {
  assert.equal(routeSuivable('https://exemple.fr/proposition'), null);
  assert.equal(routeSuivable('//exemple.fr/mission/x'), null);
  assert.equal(routeSuivable(null), null);
  assert.equal(routeSuivable(42), null);
});
