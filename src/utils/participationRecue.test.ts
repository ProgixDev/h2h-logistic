import test from 'node:test';
import assert from 'node:assert/strict';
import { estColivraison, estRecue } from '@/utils/participationRecue';

test('🔴 TOUT CRÉDIT N’EST PAS UNE PARTICIPATION REÇUE', () => {
  assert.equal(estRecue({ sens: 'C', evenement: 'courier_participation' }), true);
  // Une annulation tardive de l'acheteur ou du vendeur (hand-to-hand 20261008006000).
  assert.equal(estRecue({ sens: 'C', evenement: 'cancellation_compensation' }), true);
  // Des frais d'annulation qu'un virement a soldés : un crédit, pas de l'argent reçu.
  assert.equal(estRecue({ sens: 'C', evenement: 'courier_payout' }), false);
  assert.equal(estRecue({ sens: 'D', evenement: 'cancellation_fee' }), false);
  assert.equal(estRecue({ sens: 'D', evenement: 'courier_payout' }), false);
});

test('⚠️ UNE COMPENSATION N’EST PAS UNE CO-LIVRAISON', () => {
  assert.equal(estColivraison({ sens: 'C', evenement: 'courier_participation' }), true);
  assert.equal(estColivraison({ sens: 'C', evenement: 'cancellation_compensation' }), false);
  assert.equal(estColivraison({ sens: 'C', evenement: 'courier_payout' }), false);
});
