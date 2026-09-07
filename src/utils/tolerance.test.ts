// La fenêtre de tolérance — autour du rendez-vous, ET SELON LA MISSION.
//
// 🔴 CE QU'ELLE COMMANDE, ET POURQUOI ELLE MÉRITE DES TESTS. Trois choses en
// dépendent : quand la présence peut être déclarée, quand le signalement
// d'absence s'ouvre, et jusqu'à quand le refus du colis reste possible. Une
// minute d'écart sur une borne, et un cotransporteur particulier ponctuel se
// voit refuser sa déclaration — ou un vendeur est déclaré absent alors qu'il
// lui restait du temps.
//
// 🔴 CE QUI A CHANGÉ LE 07/09/2026, ET CE QUE CES TESTS GARDENT DÉSORMAIS.
// `DEFAULT_TOLERANCE_MINUTES = 10` a disparu, et les quatre fonctions
// prenaient cette constante en VALEUR PAR DÉFAUT. Un appelant distrait obtenait
// donc dix minutes sans le moindre signe, pour une mission qui pouvait en
// porter quinze : `missions.tolerance_minutes` est une COLONNE. Le paramètre
// est maintenant obligatoire, et le premier test le vérifie sur DEUX valeurs
// différentes — c'est le seul contrôle qui distingue « lit la mission » de
// « croit lire la mission ».
//
// ⚠️ PREMIER FICHIER DE TESTS DE CETTE APPLICATION (12/08/2026). Elle portait
// jusqu'ici des règles métier tenues par `tsc` et la relecture à l'écran seuls.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getToleranceWindow,
  isAfterTolerance,
  isWithinTolerance,
  interpolerLibelle,
  phraseTolerance,
} from '@/utils/tolerance';

/** Un rendez-vous placé par rapport à MAINTENANT, en minutes. */
const rdvDans = (minutes: number): string =>
  new Date(Date.now() + minutes * 60_000).toISOString();

// ── La tolérance vient de la mission ───────────────────────────────────────

test('🔴 DEUX MISSIONS, DEUX TOLÉRANCES, DEUX RÉPONSES', () => {
  // C'est LE défaut que la valeur par défaut masquait : à douze minutes de
  // retard, une mission à dix est dépassée, une mission à quinze ne l'est pas.
  // Avec `= 10` en défaut, un appelant qui oubliait le paramètre obtenait la
  // première réponse pour les deux.
  const rdv = rdvDans(-12);
  assert.equal(isAfterTolerance(rdv, 10), true, 'mission à 10 : dépassée');
  assert.equal(isAfterTolerance(rdv, 15), false, 'mission à 15 : encore dedans');

  assert.equal(isWithinTolerance(rdv, 10), false);
  assert.equal(isWithinTolerance(rdv, 15), true);
});

// ── Déclarer sa présence ───────────────────────────────────────────────────

test('la présence se déclare de −10 à +10 autour de l’heure', () => {
  assert.equal(isWithinTolerance(rdvDans(5), 10), true, '5 min avant');
  assert.equal(isWithinTolerance(rdvDans(0), 10), true, 'à l’heure');
  assert.equal(isWithinTolerance(rdvDans(-5), 10), true, '5 min après');
});

test('🔴 HORS FENÊTRE, ELLE NE SE DÉCLARE PAS — avant comme après', () => {
  // Trop tôt, une présence n'a pas de sens ; trop tard, ce n'est plus une
  // arrivée à l'heure mais un blocage, que le protocole d'absence traite.
  assert.equal(isWithinTolerance(rdvDans(30), 10), false, '30 min avant');
  assert.equal(isWithinTolerance(rdvDans(-30), 10), false, '30 min après');
});

test('⚠️ LES BORNES SONT DEDANS, pas dehors', () => {
  // Une inégalité stricte ici refuserait sa déclaration au cotransporteur
  // particulier arrivé pile à −10 — sans qu'aucun message ne dise pourquoi.
  assert.equal(isWithinTolerance(rdvDans(10), 10), true, '−10 min : dedans');
  assert.equal(isWithinTolerance(rdvDans(-10), 10), true, '+10 min : dedans');
});

// ── Ouvrir le signalement d'absence ────────────────────────────────────────

test('🔴 L’ABSENCE NE S’OUVRE QU’APRÈS LA TOLÉRANCE', () => {
  // Règle client du 12/08/2026. Pendant le créneau, l'autre partie a le droit
  // d'arriver : la déclarer absente à la 3ᵉ minute serait un signalement contre
  // quelqu'un qui n'est pas encore en retard.
  assert.equal(isAfterTolerance(rdvDans(30), 10), false, 'bien avant');
  assert.equal(isAfterTolerance(rdvDans(5), 10), false, 'juste avant');
  assert.equal(isAfterTolerance(rdvDans(0), 10), false, 'à l’heure');
  assert.equal(isAfterTolerance(rdvDans(-5), 10), false, 'dans la tolérance');
  assert.equal(isAfterTolerance(rdvDans(-30), 10), true, 'tolérance dépassée');
});

test('⚠️ `isAfterTolerance` N’EST PAS `!isWithinTolerance`', () => {
  // 🔴 LE PIÈGE. La négation est vraie AVANT le créneau comme après : s'en
  // servir pour ouvrir les signalements les rendrait disponibles la veille du
  // rendez-vous, quand personne n'est encore attendu nulle part.
  const veille = rdvDans(24 * 60);
  assert.equal(isWithinTolerance(veille, 10), false);
  assert.equal(isAfterTolerance(veille, 10), false, 'la veille n’est PAS « après »');
});

// ── La fenêtre affichée ────────────────────────────────────────────────────

test('la fenêtre encadre l’heure prévue, symétriquement', () => {
  const midi = new Date();
  midi.setHours(14, 30, 0, 0);
  const w = getToleranceWindow(midi.toISOString(), 10);
  assert.equal(w.start, '14:20');
  assert.equal(w.end, '14:40');
});

test('une tolérance sur mesure déplace LES DEUX bornes', () => {
  const midi = new Date();
  midi.setHours(9, 0, 0, 0);
  const w = getToleranceWindow(midi.toISOString(), 20);
  assert.equal(w.start, '08:40');
  assert.equal(w.end, '09:20');
});

test('la fenêtre franchit minuit sans se casser', () => {
  // ⚠️ Un hub ouvert 24 h/24 programme des rendez-vous à 00 h 05. Un calcul
  // naïf sur les minutes afficherait « -05:55 » ou « 24:15 ».
  const nuit = new Date();
  nuit.setHours(0, 5, 0, 0);
  const w = getToleranceWindow(nuit.toISOString(), 10);
  assert.equal(w.start, '23:55');
  assert.equal(w.end, '00:15');
});

// ── La tolérance dite en toutes lettres ────────────────────────────────────

test('🔴 LE LIBELLÉ PORTE LA TOLÉRANCE DE LA MISSION', () => {
  // Trois questions de formulaire demandaient « avez-vous attendu la fin de la
  // tolérance de 10 minutes ? » à quelqu'un dont la mission pouvait en porter
  // quinze — et la réponse partait au dossier comme preuve.
  const question = 'Avez-vous attendu la fin de la {tolerance} ?';
  assert.equal(interpolerLibelle(question, 10), 'Avez-vous attendu la fin de la tolérance de 10 minutes ?');
  assert.equal(interpolerLibelle(question, 15), 'Avez-vous attendu la fin de la tolérance de 15 minutes ?');
});

test('⚠️ SANS MISSION, ON NE DEVINE PAS — on dit « autorisée »', () => {
  // L'écran de formulaire s'ouvre parfois sans mission chargée. Écrire « 10 »
  // à ce moment-là rouvrirait le défaut sous une autre forme.
  assert.equal(phraseTolerance(undefined), 'tolérance autorisée');
  assert.equal(
    interpolerLibelle('Avez-vous attendu la fin de la {tolerance} ?'),
    'Avez-vous attendu la fin de la tolérance autorisée ?',
  );
});

test('🔴 UN JETON INCONNU LÈVE, il ne s’affiche pas', () => {
  // Un `{quelque_chose}` qui traverse en silence s'affiche à l'utilisateur
  // accolades comprises. Mieux vaut une erreur au test qu'un texte cassé à
  // l'écran.
  assert.throws(
    () => interpolerLibelle('Combien de temps depuis {arrivee} ?', 10),
    /jeton inconnu/,
  );
  // Et un libellé sans jeton passe tel quel.
  assert.equal(interpolerLibelle('Le colis vous a-t-il été présenté ?', 10),
    'Le colis vous a-t-il été présenté ?');
});
