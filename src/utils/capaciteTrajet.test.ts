import test from 'node:test';
import assert from 'node:assert/strict';
import {
  etatPassage,
  libellePlaces,
  libellePlacesCourt,
  messageDeConfirmation,
  passageAConfirmer,
  prochainPassage,
  versCapaciteTrajets,
} from '@/utils/capaciteTrajet';

const lu = [{
  route_id: 'r1', places: 3, statut: 'active', colivraisons: '2',
  passages: [
    { collecte_le: '2026-10-08T07:00:00+00:00', reserves: '1', libre: true, jour_off: false },
    { collecte_le: '2026-10-09T07:00:00+00:00', reserves: 3, libre: false, jour_off: false },
    { collecte_le: '2026-10-10T07:00:00+00:00', reserves: 0, libre: false, jour_off: false },
    { collecte_le: '2026-10-11T07:00:00+00:00', reserves: 0, libre: false, jour_off: true },
  ],
}];

test('✅ LES PLACES SE LISENT PAR TRAJET ET PAR PASSAGE — nombres en nombres', () => {
  const c = versCapaciteTrajets(lu).r1;
  assert.deepEqual([c.places, c.colivraisons, c.passages.length, c.passages[0].reserves], [3, 2, 4, 1]);
  assert.deepEqual(versCapaciteTrajets(null), {});
  assert.deepEqual(versCapaciteTrajets([{ places: 3 }]), {}, 'un trajet sans identifiant ne se range nulle part');
});

test('🔴 L’ÉTAT D’UN PASSAGE DIT POURQUOI IL NE PREND PLUS RIEN — complet, chevauché, « Pas aujourd’hui »', () => {
  const [libre, complet, chevauche, off] = versCapaciteTrajets(lu).r1.passages;
  assert.deepEqual([etatPassage(libre, 3), etatPassage(complet, 3), etatPassage(chevauche, 3), etatPassage(off, 3)],
    ['libre', 'complet', 'chevauche', 'pas_aujourdhui']);
  assert.equal(libellePlaces(libre, 3), '2 places libres sur 3');
  assert.equal(libellePlaces({ ...libre, reserves: 2 }, 3), '1 place libre sur 3');
  assert.equal(libellePlaces(complet, 3), 'Complet');
  assert.match(libellePlaces(chevauche, 3), /chevauche ce passage/);
  assert.equal(libellePlacesCourt(libre, 3), '2/3 places');
  assert.equal(libellePlacesCourt(off, 3), 'Pas aujourd’hui');
});

test('✅ LE PROCHAIN PASSAGE EST CELUI QUI VIENT — pas celui qui est passé', () => {
  const c = versCapaciteTrajets(lu).r1;
  assert.equal(prochainPassage(c, Date.parse('2026-10-08T12:00:00+00:00'))?.collecteLe, '2026-10-09T07:00:00+00:00');
  assert.equal(prochainPassage(c, Date.parse('2026-10-12T00:00:00+00:00')), null);
  assert.equal(prochainPassage(undefined), null);
});

// ── La suspension par l'équipe, la confirmation du déplacement (hand-to-hand 20261013003000, 20261013004000) ──

const depuis = (trajet: Record<string, unknown>) => versCapaciteTrajets([{ route_id: 'r2', places: 3, colivraisons: 0, passages: [], ...trajet }]).r2;

test('🔴 UNE SUSPENSION SE LIT AVEC LE MESSAGE DE L’ÉQUIPE — et son absence ne s’invente pas', () => {
  assert.equal(versCapaciteTrajets(lu).r1.suspension, null, 'une lecture d’avant ne dit rien : rien n’est suspendu');
  assert.equal(depuis({ suspension: null }).suspension, null);
  assert.deepEqual(depuis({ suspension: { message: 'Point de collecte en travaux.', le: '2026-10-13T08:00:00+00:00' } }).suspension,
    { message: 'Point de collecte en travaux.', le: '2026-10-13T08:00:00+00:00' });
  // Une valeur informe n'est pas une suspension.
  assert.equal(depuis({ suspension: { message: '   ' } }).suspension, null);
  assert.equal(depuis({ suspension: 'oui' }).suspension, null);
  assert.deepEqual(depuis({ suspension: { message: 'Sans date.' } }).suspension, { message: 'Sans date.', le: null });
});

test('🔴 LE DÉPLACEMENT À CONFIRMER EST CELUI DU JOUR, À PARIS — à venir, ni fermé, ni déjà confirmé', () => {
  const c = depuis({
    passages: [
      // 08/10 à 23:30 UTC : c'est déjà le 09/10 à Paris (01:30).
      { collecte_le: '2026-10-08T23:30:00+00:00', reserves: 0, libre: true, jour_off: false, confirme_le: null },
      { collecte_le: '2026-10-10T07:00:00+00:00', reserves: 0, libre: true, jour_off: false, confirme_le: '2026-10-09T18:00:00+00:00' },
      { collecte_le: '2026-10-11T07:00:00+00:00', reserves: 0, libre: false, jour_off: true, confirme_le: null },
    ],
  });
  assert.equal(c.passages[0].confirmeLe, null);
  assert.equal(c.passages[1].confirmeLe, '2026-10-09T18:00:00+00:00');
  assert.equal(versCapaciteTrajets(lu).r1.passages[0].confirmeLe, null, 'une lecture d’avant ne dit rien : rien n’est confirmé');

  assert.equal(passageAConfirmer(c, '2026-10-09')?.collecteLe, '2026-10-08T23:30:00+00:00', 'le jour se lit à Paris');
  assert.equal(passageAConfirmer(c, '2026-10-08'), null);
  assert.equal(passageAConfirmer(c, '2026-10-10'), null, 'déjà confirmé');
  assert.equal(passageAConfirmer(c, '2026-10-11'), null, '« Pas aujourd’hui » ne se confirme pas');
  assert.equal(passageAConfirmer(c, '2026-10-12'), null, 'aucun passage ce jour-là');
  assert.equal(passageAConfirmer(undefined, '2026-10-09'), null, 'sans lecture du serveur, rien à confirmer');
});

test('✅ UN REFUS DU SERVEUR SE DIT EN MOTS — jamais le message brut d’une panne', () => {
  assert.match(messageDeConfirmation('vous avez ferme cette journee : reprenez-la pour confirmer ce trajet'), /Vous avez fermé cette journée/);
  assert.match(messageDeConfirmation('ce trajet n est pas actif'), /n’est pas actif/);
  assert.match(messageDeConfirmation('ce trajet ne passe pas ce jour-la'), /ne passe pas aujourd’hui/);
  assert.match(messageDeConfirmation('trajet introuvable'), /n’existe plus/);
  for (const inconnu of ['TypeError: Network request failed', '', null, undefined]) {
    assert.equal(messageDeConfirmation(inconnu), 'La confirmation n’a pas pu être enregistrée. Réessayez dans un instant.');
  }
});
