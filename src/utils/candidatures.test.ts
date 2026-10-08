// UNE PROPOSITION REÇUE SE LIT — `utils/candidatures.ts`.
//
// La mise en relation du § 5 des CGU H2H Logistic : le serveur rend des
// propositions de vingt minutes, avec leurs passages possibles, puis des
// candidatures. Ce fichier éprouve ce que l'application en fait.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dernierAvisDeCandidature,
  explicationStatut,
  heureParis,
  libelleJour,
  libelleStatut,
  messageDeRefus,
  peutSeRetirer,
  propositionOuverte,
  tempsRestant,
  varianteStatut,
  versCandidature,
} from '@/utils/candidatures';

const ligne = (surcharge: Record<string, unknown> = {}) => ({
  candidature: 'c1',
  recherche: 'r1',
  statut: 'proposee',
  temporairement_indisponible: false,
  proposee_le: '2026-10-06T12:00:00+00:00',
  repondre_avant: '2026-10-06T12:20:00+00:00',
  ville_depart: 'Nice',
  ville_arrivee: 'Cannes',
  format: 'M',
  poids_max_kg: '5.00',
  participation_cents: '511',
  passages: [{
    route_id: 'rt1',
    collecte_le: '2026-10-06T15:00:00+00:00',
    fin_le: '2026-10-06T16:00:00+00:00',
    express: true,
    hub_collecte: { id: 'h1', nom: 'Gare de Nice', ville: 'Nice' },
    remises: [{ hub_id: 'h2', nom: 'Gare de Cannes', ville: 'Cannes', remise_le: '2026-10-06T15:45:00+00:00' }],
  }],
  collecte_le: null,
  hub_collecte: null,
  remises: null,
  express: null,
  hub_remise: null,
  remise_le: null,
  acheteur: 'acheteur_x',
  validation_jusqu_au: null,
  ...surcharge,
});

test('✅ UNE PROPOSITION SE LIT — montants en nombres, passages et hubs nommés', () => {
  const c = versCandidature(ligne());
  assert.equal(c.id, 'c1');
  assert.equal(c.participationCents, 511);
  assert.equal(c.poidsMaxKg, 5);
  assert.equal(c.passages?.length, 1);
  assert.deepEqual(c.passages?.[0].hubCollecte, { id: 'h1', nom: 'Gare de Nice', ville: 'Nice' });
  assert.deepEqual(c.passages?.[0].remises.map((r) => r.nom), ['Gare de Cannes']);
  assert.equal(c.passages?.[0].express, true);
  // ⚠️ L'HEURE DE COLLECTE REPART TELLE QUELLE : c'est elle qui désigne le passage accepté.
  assert.equal(c.passages?.[0].collecteLe, '2026-10-06T15:00:00+00:00');
});

test('✅ UNE CANDIDATURE SE LIT — passage accepté, point de remise choisi, délai du vendeur', () => {
  const c = versCandidature(ligne({
    statut: 'retenue', passages: null,
    collecte_le: '2026-10-06T15:00:00+00:00',
    hub_collecte: { id: 'h1', nom: 'Gare de Nice', ville: 'Nice' },
    hub_remise: { id: 'h2', nom: 'Gare de Cannes', ville: 'Cannes' },
    remise_le: '2026-10-06T15:45:00+00:00',
    express: false,
    validation_jusqu_au: '2026-10-06T12:40:00+00:00',
  }));
  assert.equal(c.passages, null);
  assert.equal(c.hubRemise?.nom, 'Gare de Cannes');
  assert.equal(c.validationJusquAu, '2026-10-06T12:40:00+00:00');
  assert.equal(c.express, false);
  assert.equal(libelleStatut(c), 'Choisi — en attente du vendeur');
});

test('🔴 UNE PROPOSITION EXPIRÉE NE S’ACCEPTE PLUS À L’ÉCRAN — vingt minutes, pas une seconde de plus', () => {
  const c = versCandidature(ligne());
  const avant = new Date('2026-10-06T12:19:59Z').getTime();
  const apres = new Date('2026-10-06T12:20:00Z').getTime();
  assert.equal(propositionOuverte(c, avant), true);
  assert.equal(propositionOuverte(c, apres), false);
  assert.equal(tempsRestant(c.repondreAvant, avant), '0 min 01 s');
  assert.equal(tempsRestant(c.repondreAvant, apres), null);
});

test('🔴 ON NE SE RETIRE QUE TANT QUE L’ACHETEUR N’A PAS CHOISI (§ 5.2.5)', () => {
  const de = (statut: string) => versCandidature(ligne({ statut }));
  assert.equal(peutSeRetirer(de('en_attente')), true);
  assert.equal(peutSeRetirer(de('non_selectionnee')), true);
  assert.equal(peutSeRetirer(de('retenue')), false);
  assert.equal(peutSeRetirer(de('confirmee')), false);
  assert.equal(peutSeRetirer(de('proposee')), false);
});

test('✅ CHAQUE ÉTAT SE DIT — et l’indisponibilité temporaire se distingue (§ 5.2.6)', () => {
  const de = (statut: string, temp = false) => libelleStatut(versCandidature(ligne({
    statut, temporairement_indisponible: temp,
  })));
  assert.equal(de('proposee'), 'Nouvelle proposition');
  assert.equal(de('en_attente'), 'En attente du choix de l’acheteur');
  assert.equal(de('non_selectionnee'), 'Accepté – non sélectionné');
  assert.equal(de('non_selectionnee', true), 'Temporairement indisponible');
  assert.equal(de('confirmee'), 'Co-livraison confirmée');
});

test('✅ CHAQUE ÉTAT S’EXPLIQUE DANS LES MOTS DES CGU — et rien n’y promet une attribution', () => {
  const de = (statut: string, temp = false) => explicationStatut(versCandidature(ligne({
    statut, temporairement_indisponible: temp,
  })));
  assert.match(de('proposee'), /pas attribuée automatiquement/, '§ 5.2.2');
  assert.match(de('en_attente'), /retirer/, '§ 5.2.5 : le retrait est possible');
  assert.match(de('non_selectionnee'), /remplacement/, '§ 5.2.5 : acceptation conservée');
  assert.match(de('non_selectionnee', true), /autre proposition/, '§ 5.2.6');
  assert.match(de('retenue'), /réservée/, '§ 5.2.7');
  assert.doesNotMatch(de('retenue'), /retirer/, 'choisi, on ne se retire plus');
  assert.match(de('confirmee'), /confirmée/);
});

test('🔴 UNE ISSUE QUI N’EST PAS LA CONFIRMATION N’EST JAMAIS VERTE', () => {
  const de = (statut: string) => varianteStatut(versCandidature(ligne({ statut })));
  assert.equal(de('confirmee'), 'success');
  for (const statut of ['proposee', 'en_attente', 'non_selectionnee', 'retenue']) {
    assert.notEqual(de(statut), 'success', statut);
  }
});

test('✅ LES HEURES ET LES JOURS SONT CEUX DE PARIS — été comme hiver', () => {
  assert.equal(heureParis('2026-10-06T15:00:00Z'), '17:00');
  assert.equal(heureParis('2026-12-06T15:00:00Z'), '16:00');
  const maintenant = new Date('2026-10-06T21:30:00Z').getTime(); // 23:30 à Paris
  assert.equal(libelleJour('2026-10-06T21:45:00Z', maintenant), 'Aujourd’hui');
  assert.equal(libelleJour('2026-10-06T22:30:00Z', maintenant), 'Demain', 'minuit à Paris, pas à Londres');
  assert.equal(libelleJour('2026-10-08T08:00:00Z', maintenant), 'Après-demain');
  assert.match(libelleJour('2026-10-09T08:00:00Z', maintenant), /^ven\. 9 oct\.$/);
});

test('✅ UN REFUS DU SERVEUR SE DIT EN FRANÇAIS — l’indice choisit le message, l’inconnu reste tel quel', () => {
  assert.match(messageDeRefus('COLIVRAISON_DELAI', 'x'), /délai/);
  assert.match(messageDeRefus('COLIVRAISON_SUSPENDU', 'x'), /déjà une candidature/);
  assert.match(messageDeRefus('COLIVRAISON_INDISPONIBLE', 'x'), /trop proche/);
  assert.match(messageDeRefus('COLIVRAISON_ETAT', 'x'), /plus ouverte/);
  assert.equal(messageDeRefus(null, 'brut'), 'brut');
});

test('🔴 UNE CANDIDATURE SORTIE DE LA LISTE DIT CE QU’ELLE EST DEVENUE — le dernier avis qui la nomme, pas « délai passé »', () => {
  const avis = (id: string, titre: string, type: 'mission_new' | 'mission_update', le: string, route: string, candidature?: string) => ({
    id, type, title: titre, body: '', read: false, createdAt: le, route,
    data: candidature ? { candidature, recherche: 'r1' } : undefined,
  });
  const liste = [
    avis('a', 'Nouvelle proposition de co-livraison', 'mission_new', '2026-10-08T17:06:10Z', '/proposition?id=c1', 'c1'),
    avis('b', 'Vous êtes choisi pour une co-livraison', 'mission_update', '2026-10-08T17:09:25Z', '/proposition?id=c1', 'c1'),
    avis('c', 'Co-livraison confirmée', 'mission_update', '2026-10-08T17:13:26Z', '/mission/m1', 'c1'),
    avis('d', 'Candidature non retenue', 'mission_update', '2026-10-08T17:20:00Z', '/proposition?id=c2', 'c2'),
    avis('e', 'Demande acceptee', 'mission_update', '2026-10-08T18:00:00Z', '/settings'),
  ];
  // Confirmée : l'avis mène à la mission.
  assert.equal(dernierAvisDeCandidature(liste, 'c1')?.route, '/mission/m1');
  // Non retenue : l'avis le dit, même s'il rouvre cet écran.
  assert.equal(dernierAvisDeCandidature(liste, 'c2')?.title, 'Candidature non retenue');
  // La proposition elle-même n'est pas une issue ; sans autre avis, rien.
  assert.equal(dernierAvisDeCandidature(liste.slice(0, 1), 'c1'), null);
  assert.equal(dernierAvisDeCandidature(liste, 'c3'), null);
});
