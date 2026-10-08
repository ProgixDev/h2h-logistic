import test from 'node:test';
import assert from 'node:assert/strict';
import { phraseRefusColis, refusEnCours, versRefusColis } from '@/utils/refusColis';

const lu = (surcharge: Record<string, unknown> = {}) => ({
  role: 'cotransporteur',
  refus: { id: 'd1', declare_le: '2026-10-07T08:02:00+00:00', motif: 'Colis différent de la description',
           contestable_jusqu_au: '2026-10-08T08:02:00+00:00', issue: null },
  contestable: false, contestation: null, decision: null, frais_cents: null, compensation_cents: null,
  compensation_prevue_cents: 300, frais_prevus_cents: null,
  ...surcharge,
});
const euros = (c: number) => `${(c / 100).toFixed(2).replace('.', ',')} €`;
const heure = (iso: string) => iso.slice(0, 16);
const AVANT = Date.parse('2026-10-07T12:00:00+00:00');

test('✅ LE REFUS SE LIT POUR LE COTRANSPORTEUR — et pour lui seul', () => {
  const r = versRefusColis(lu())!;
  assert.deepEqual([r.motif, r.issue, r.compensationPrevueCents, r.contestation, r.decision],
    ['Colis différent de la description', null, 300, null, null]);
  assert.equal(refusEnCours(r), true);
  assert.equal(versRefusColis(lu({ role: 'vendeur' })), null);
  assert.equal(versRefusColis(null), null);
  assert.equal(refusEnCours(versRefusColis(lu({ refus: { ...lu().refus, issue: 'refus_effectif' } }))), false);
});

test('🔴 LA PHRASE DIT LA SUITE — le délai du vendeur, sa contestation, la décision, l’issue et son argent', () => {
  assert.match(phraseRefusColis(versRefusColis(lu())!, euros, heure, AVANT),
    /^Vous n’avez pas à prendre le colis\. Le vendeur peut contester ce refus jusqu’au 2026-10-08T08:02 ; sans contestation, la co-livraison sera annulée, et une compensation de 3,00 € vous sera due\.$/);
  assert.match(phraseRefusColis(versRefusColis(lu())!, euros, heure, Date.parse('2026-10-09T00:00:00+00:00')),
    /^Le délai du vendeur est passé/);
  assert.match(phraseRefusColis(versRefusColis(lu({ contestation: { declaree_le: '2026-10-07T09:00:00+00:00' } }))!,
    euros, heure, AVANT), /^Le vendeur conteste votre refus/);
  assert.match(phraseRefusColis(versRefusColis(lu({ decision: { decision: 'injustifie', reponse: 'Vu.' } }))!,
    euros, heure, AVANT), /n’est pas retenu : la co-livraison va être annulée, comme une annulation tardive\.$/);
  assert.match(phraseRefusColis(versRefusColis(lu({ refus: { ...lu().refus, issue: 'refus_effectif' }, compensation_cents: 300 }))!,
    euros, heure, AVANT), /Une compensation de 3,00 € vous est due/);
  assert.match(phraseRefusColis(versRefusColis(lu({ refus: { ...lu().refus, issue: 'refus_injustifie' }, frais_cents: 200 }))!,
    euros, heure, AVANT), /\(2,00 € de frais, retenus sur vos prochaines participations\)\.$/);
  assert.match(phraseRefusColis(versRefusColis(lu({ refus: { ...lu().refus, issue: 'sans_objet' } }))!,
    euros, heure, AVANT), /sans suite/);
  // Un protocole sans compensation ne promet rien.
  assert.doesNotMatch(phraseRefusColis(versRefusColis(lu({ compensation_prevue_cents: 0 }))!, euros, heure, AVANT),
    /compensation/);
});
