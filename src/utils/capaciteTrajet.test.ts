import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bandeauPointsFermes,
  etatPassage,
  libellePlaces,
  libellePlacesCourt,
  messageDeConfirmation,
  passageAConfirmer,
  pointFerme,
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

// ── Les points que l'équipe a fermés (hand-to-hand 20261013007000) ──

const COLLECTE = { hub: 'h-c', role: 'collecte', nom: 'Hub Parking Quai de la Collecte' };
const REMISE_1 = { hub: 'h-1', role: 'remise', nom: 'Hub Parking Parvis de la Première Remise' };
const REMISE_2 = { hub: 'h-2', role: 'remise', nom: 'Hub Parking Parvis de la Seconde Remise' };

test('🔴 LES POINTS FERMÉS SE LISENT AVEC LEUR RÔLE ET LEUR NOM — et leur absence ne s’invente pas', () => {
  const avant = versCapaciteTrajets(lu).r1;
  assert.deepEqual([avant.pointsFermes, avant.pointManquant], [[], null], 'une lecture d’avant ne dit rien : rien n’est fermé');
  const c = depuis({ points_fermes: [COLLECTE, REMISE_1], point_manquant: 'collecte' });
  assert.deepEqual(c.pointsFermes, [COLLECTE, REMISE_1]);
  assert.equal(c.pointManquant, 'collecte');
  assert.equal(depuis({ points_fermes: [REMISE_1], point_manquant: 'remise' }).pointManquant, 'remise');
  assert.equal(depuis({ points_fermes: [REMISE_1], point_manquant: 'premiere_remise' }).pointManquant, 'premiere_remise');
  // Une valeur informe n'est pas un point fermé, ni un point manquant.
  assert.deepEqual(depuis({ points_fermes: 'oui' }).pointsFermes, []);
  assert.deepEqual(depuis({ points_fermes: [null, 'x', { hub: 7, role: 'remise' }, { hub: 'h', role: 'autre', nom: 'N' }] }).pointsFermes, []);
  assert.deepEqual(depuis({ points_fermes: [{ hub: 'h', role: 'remise', nom: '  ' }] }).pointsFermes,
    [{ hub: 'h', role: 'remise', nom: 'Point de rendez-vous' }]);
  assert.equal(depuis({ point_manquant: 'tout' }).pointManquant, null);
  assert.equal(depuis({ point_manquant: true }).pointManquant, null);

  assert.equal(pointFerme(c, 'h-c'), true);
  assert.equal(pointFerme(c, 'h-2'), false);
  assert.equal(pointFerme(undefined, 'h-c'), false, 'sans lecture du serveur, aucun point n’est dit fermé');
});

test('🔴 UN TRAJET QUI NE REÇOIT PLUS RIEN LE DIT — son point de collecte fermé, ou plus aucun point de remise ; c’est le serveur qui le dit', () => {
  assert.equal(bandeauPointsFermes(undefined), null);
  assert.equal(bandeauPointsFermes(versCapaciteTrajets(lu).r1), null, 'aucun point fermé : rien à dire');

  const collecte = bandeauPointsFermes(depuis({ points_fermes: [COLLECTE, REMISE_1], point_manquant: 'collecte' }));
  assert.equal(collecte?.titre, 'Point de collecte fermé');
  assert.deepEqual(collecte?.points, ['Collecte : Hub Parking Quai de la Collecte', 'Remise : Hub Parking Parvis de la Première Remise']);
  assert.match(collecte?.suite ?? '', /^Ce trajet ne reçoit plus de nouvelle proposition de co-livraison\. Publiez un trajet avec un autre point de collecte\.$/);
  assert.match(collecte?.places ?? '', /ces places ne sont proposées à personne\.$/);
  assert.equal(collecte?.court, 'Point de collecte fermé');

  const remise = bandeauPointsFermes(depuis({ points_fermes: [REMISE_1], point_manquant: 'remise' }));
  assert.equal(remise?.titre, 'Plus aucun point de remise proposé');
  assert.match(remise?.suite ?? '', /ne reçoit plus de nouvelle proposition de co-livraison\. Publiez un trajet avec un autre point de remise\.$/);
  assert.match(remise?.places ?? '', /ces places ne sont proposées à personne\.$/);
  assert.equal(remise?.court, 'Sans point de remise');

  // 🔴 L'ANCIEN PARCOURS : son premier point de remise fermé l'arrête, même si un autre reste ouvert — un seul point
  // fermé, et pourtant il ne reçoit plus rien. Le serveur le dit ; le nombre de points fermés ne le dirait pas.
  const premier = bandeauPointsFermes(depuis({ points_fermes: [REMISE_1], point_manquant: 'premiere_remise' }));
  assert.equal(premier?.titre, 'Premier point de remise fermé');
  assert.deepEqual(premier?.points, ['Remise : Hub Parking Parvis de la Première Remise']);
  assert.match(premier?.suite ?? '', /^La remise de ce trajet se pose à son premier point de remise : il ne reçoit plus de nouvelle proposition de co-livraison. Publiez un trajet avec un autre point de remise.$/);
  assert.match(premier?.places ?? '', /ces places ne sont proposées à personne.$/);
  assert.equal(premier?.court, 'Point de remise fermé');

  // 🔴 Un point de remise fermé sur plusieurs : le trajet reste proposé — rien ne dit qu'il ne reçoit plus rien.
  const un = bandeauPointsFermes(depuis({ points_fermes: [REMISE_2], point_manquant: null }));
  assert.equal(un?.titre, 'Un point de ce trajet n’est plus proposé');
  assert.deepEqual(un?.points, ['Remise : Hub Parking Parvis de la Seconde Remise']);
  assert.equal(un?.suite, 'Ce point n’est plus proposé sur ce trajet. Ses autres points ne changent pas.');
  assert.deepEqual([un?.places, un?.court], [null, null]);
  const deux = bandeauPointsFermes(depuis({ points_fermes: [REMISE_1, REMISE_2] }));
  assert.equal(deux?.titre, '2 points de ce trajet ne sont plus proposés');
  assert.equal(deux?.suite, 'Ces points ne sont plus proposés sur ce trajet. Ses autres points ne changent pas.');
  assert.doesNotMatch(`${un?.titre} ${un?.suite} ${deux?.titre} ${deux?.suite}`, /ne reçoit plus/);

  // ⚠️ L'écran ne déduit rien du nombre de points fermés : tous fermés sans que le serveur le dise, il ne l'affirme pas.
  assert.equal(bandeauPointsFermes(depuis({ points_fermes: [COLLECTE, REMISE_1, REMISE_2] }))?.court, null);
  // Et ce que le serveur dit se lit, même sans la liste.
  assert.equal(bandeauPointsFermes(depuis({ point_manquant: 'collecte' }))?.titre, 'Point de collecte fermé');
  assert.deepEqual(bandeauPointsFermes(depuis({ point_manquant: 'collecte' }))?.points, []);
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
