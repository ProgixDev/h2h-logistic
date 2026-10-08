import test from 'node:test';
import assert from 'node:assert/strict';
import {
  etatPassage,
  libellePlaces,
  libellePlacesCourt,
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
