// CE QU'UN RÉSULTAT DE SCAN VEUT DIRE — les mots suivent le verdict du serveur.
import test from 'node:test';
import assert from 'node:assert/strict';

import { messageDeScan, type GenreScan, type ResultatScan } from '@/utils/messageDeScan';

test('🔴 UN SCAN EN AVANCE SE DIT « PAS ENCORE OUVERT » — pas « hors du créneau », qui laisse croire à un retard', () => {
  // § 5.4.2 des CGU H2H Logistic : un code ne se valide pas à l'avance. Le serveur ne rend `out_of_window`
  // qu'AVANT l'ouverture du créneau ; un retard ne ferme rien.
  for (const genre of ['seller_qr', 'buyer_qr'] as GenreScan[]) {
    const m = messageDeScan('out_of_window', genre);
    assert.match(m, /pas encore ouvert/);
    assert.doesNotMatch(m, /hors du créneau/);
  }
});

test('⚠️ UN CODE REFUSÉ HORS DE SON ÉTAPE NE DEMANDE PAS « D’IDENTIFIER LA PERSONNE EN FACE »', () => {
  // Sur le code d'une personne, c'est justement elle qu'on identifie : la consigne n'avait pas de sens.
  for (const genre of ['seller_qr', 'buyer_qr'] as GenreScan[]) {
    assert.doesNotMatch(messageDeScan('no_eligible', genre), /identifiez/);
    assert.match(messageDeScan('no_eligible', genre), /cette étape/);
  }
  // Sur l'étiquette du colis, elle reste la bonne : l'identité d'en face manque.
  assert.match(messageDeScan('no_eligible', 'tracking_qr'), /identifiez d'abord la personne en face/);
});

test('chaque résultat du serveur a ses mots', () => {
  const tous: ResultatScan[] = ['success', 'package_mismatch', 'wrong_code', 'no_eligible', 'expired_qr',
                                'out_of_window', 'duplicate'];
  for (const r of tous) {
    const m = messageDeScan(r, 'seller_qr');
    assert.ok(typeof m === 'string' && m.length > 0, `aucun message pour ${r}`);
  }
  assert.match(messageDeScan('wrong_code', 'seller_qr'), /vendeur/);
  assert.match(messageDeScan('wrong_code', 'buyer_qr'), /acheteur/);
});
