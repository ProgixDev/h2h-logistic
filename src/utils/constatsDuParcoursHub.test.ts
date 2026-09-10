// LES CONSTATS DE LA TRAVERSÉE DU FLUX HUB, DU 10/09/2026 — côté cotransporteur.
//
// Chaque test ici garde un défaut VU À L'ÉMULATEUR ce jour-là, sur un vrai
// trajet Marseille Saint-Charles → Nice. Les règles sont pures et se testent
// directement ; là où le défaut était qu'un écran ne s'en servait pas, la garde
// lit le code (sans ses commentaires).
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { lireCode } from './sansCommentaires';
import {
  dateParis,
  decalageParisMinutes,
  estPasse,
  instantParis,
  joursAVenir,
  libelleDate,
  prochainPassageParis,
} from './heureDeParis';
import { saisieHeure, normaliserHeure } from './heureTrajet';
import { etapeANaviguer } from './destinationNavigation';
import { correspondRecherche, villesDistinctes } from './rechercheVille';
import { villeSiAbsente } from './detailHub';
import { cadrageDesHubs } from './cadrageCarte';
import { tailleEtPoids } from './formatting';

const src = (...p: string[]) => lireCode(join(process.cwd(), 'src', ...p));

// ─── L'HEURE DE PARIS ──────────────────────────────────────────────────────

test('🔴 UN TRAJET UNIQUE SE DATE EN HEURE DE PARIS, pas du téléphone', () => {
  // Été : Paris = UTC+2. 22:15 à Paris le 10/09 = 20:15 UTC.
  assert.equal(instantParis('2026-09-10', '22:15'), '2026-09-10T20:15:00.000Z');
  // Hiver : Paris = UTC+1.
  assert.equal(instantParis('2026-12-01', '08:00'), '2026-12-01T07:00:00.000Z');
});

test('⚠️ LES DEUX NUITS DE CHANGEMENT D’HEURE TOMBENT JUSTE', () => {
  // 2026 : été le dimanche 29 mars à 01:00 UTC, hiver le dimanche 25 octobre à 01:00 UTC.
  assert.equal(decalageParisMinutes(Date.UTC(2026, 2, 29, 0, 59)), 60);
  assert.equal(decalageParisMinutes(Date.UTC(2026, 2, 29, 1, 0)), 120);
  assert.equal(decalageParisMinutes(Date.UTC(2026, 9, 25, 0, 59)), 120);
  assert.equal(decalageParisMinutes(Date.UTC(2026, 9, 25, 1, 0)), 60);
  // Le matin même du passage à l'heure d'été : 09:00 Paris = 07:00 UTC.
  assert.equal(instantParis('2026-03-29', '09:00'), '2026-03-29T07:00:00.000Z');
  assert.equal(instantParis('2026-10-25', '09:00'), '2026-10-25T08:00:00.000Z');
});

test('🔴 « AUJOURD’HUI » EST LE JOUR DE PARIS — même à 00:30, même à 23:30 UTC', () => {
  // 23:30 UTC le 10/09 = 01:30 le 11/09 à Paris.
  assert.equal(dateParis(Date.UTC(2026, 8, 10, 23, 30)), '2026-09-11');
  const jours = joursAVenir(Date.UTC(2026, 8, 10, 23, 30), 3);
  assert.deepEqual(jours.map((j) => j.date), ['2026-09-11', '2026-09-12', '2026-09-13']);
  assert.deepEqual(jours.map((j) => j.libelle), ["Aujourd'hui", 'Demain', 'dim. 13 sept.']);
  assert.equal(libelleDate('2026-09-11'), 'ven. 11 sept.');
});

test('⚠️ UN DÉPART PASSÉ SE VOIT, et le repli choisit le prochain', () => {
  const maintenant = Date.UTC(2026, 8, 10, 20, 0); // 22:00 à Paris
  assert.equal(estPasse('2026-09-10', '21:30', maintenant), true);
  assert.equal(estPasse('2026-09-10', '22:30', maintenant), false);
  assert.equal(prochainPassageParis('22:30', maintenant), '2026-09-10T20:30:00.000Z');
  assert.equal(prochainPassageParis('07:00', maintenant), '2026-09-11T05:00:00.000Z');
});

test('🔴 LE MAGASIN PUBLIE LE JOUR CHOISI, ET L’ÉCRAN LE DEMANDE', () => {
  const magasin = src('stores', 'useRouteStore.ts');
  assert.match(magasin, /instantParis\(f\.departureDate, f\.pickupTime\)/);
  assert.doesNotMatch(magasin, /setHours\(/, 'le départ se recalcule à l’heure du téléphone');
  const horaires = src('app', 'publish', 'schedule.tsx');
  assert.match(horaires, /joursAVenir\(/, 'le jour du trajet unique n’est plus demandé');
  assert.match(horaires, /setFormField\('departureDate'/);
  const recap = src('app', 'publish', 'review.tsx');
  assert.match(recap, /libelleDate\(form\.departureDate\)/, 'le récapitulatif tait le jour');
});

// ─── LES CHAMPS D'HEURE ────────────────────────────────────────────────────

test('🔴 LE PAVÉ NUMÉRIQUE POSE LES DEUX-POINTS TOUT SEUL', () => {
  const frappe = (touches: string) => [...touches].reduce((t, c) => saisieHeure(t + c), '');
  assert.equal(frappe('730'), '07:30');
  assert.equal(frappe('1230'), '12:30');
  assert.equal(frappe('0705'), '07:05');
  assert.equal(frappe('12345'), '12:34', 'plus de quatre chiffres');
  assert.equal(saisieHeure('07:'), '07', 'effacer le « : » doit rester possible');
  assert.equal(normaliserHeure(frappe('730')), '07:30');
});

test('🔴 PLUS DE CLAVIER TEXTE SUR ANDROID', () => {
  const horaires = src('app', 'publish', 'schedule.tsx');
  assert.doesNotMatch(horaires, /numbers-and-punctuation/, 'iOS seulement : Android ouvre le clavier complet');
  assert.equal((horaires.match(/keyboardType="number-pad"/g) ?? []).length, 2);
});

// ─── LA NAVIGATION ─────────────────────────────────────────────────────────

test('🔴 AVANT LA PRISE EN CHARGE, ON VA CHERCHER LE COLIS', () => {
  for (const s of ['accepted', 'seller_pending', 'group_created', 'pickup_pending'] as const) {
    assert.equal(etapeANaviguer(s), 'pickup', `${s} guidait vers le hub de remise`);
  }
  for (const s of ['picked_up', 'in_transit', 'deposited', 'delivery_pending'] as const) {
    assert.equal(etapeANaviguer(s), 'delivery');
  }
  for (const s of ['delivered', 'completed', 'cancelled', 'expired'] as const) {
    assert.equal(etapeANaviguer(s), null);
  }
  // La demande de l'écran de suivi est honorée — si elle a encore un sens.
  assert.equal(etapeANaviguer('in_transit', 'pickup'), 'delivery');
  assert.equal(etapeANaviguer('accepted', 'delivery'), 'pickup');
});

test('🔴 PLUS DE TABLE DE COORDONNÉES INVENTÉES — et plus de Cannes par défaut', () => {
  const nav = src('app', 'navigate', '[missionId].tsx');
  assert.doesNotMatch(nav, /HUB_COORDS/);
  assert.doesNotMatch(nav, /'hub-[a-z-]+'/, 'un identifiant de démonstration est revenu');
  assert.match(nav, /chargerHub\(hubId\)/, 'le point ne vient plus de l’annuaire');
  assert.match(nav, /etapeANaviguer\(mission\.status, dest\)/);
});

// ─── LA PUBLICATION ────────────────────────────────────────────────────────

test('🔴 LES VILLES VIENNENT DE L’ANNUAIRE, dédoublonnées et triées à la française', () => {
  assert.deepEqual(
    villesDistinctes(['Nice', 'Èze', 'nice', ' Antibes ', null, '', 'Aix-en-Provence', 'Nice']),
    ['Aix-en-Provence', 'Antibes', 'Èze', 'Nice'],
  );
});

test('⚠️ ON TROUVE UNE VILLE COMME ON L’ÉCRIT AU POUCE', () => {
  assert.equal(correspondRecherche('Saint-Raphaël', 'st raphael'), true);
  assert.equal(correspondRecherche('Aix-en-Provence', 'aix prov'), true);
  assert.equal(correspondRecherche('Èze', 'eze'), true);
  assert.equal(correspondRecherche('Sainte-Maxime', 'ste max'), true);
  assert.equal(correspondRecherche('Nice', 'cannes'), false);
  assert.equal(correspondRecherche('Nice', ''), true);
});

test('🔴 LA CARTE DE REMISE MONTRE LE DÉTAIL CONTRÔLÉ, PAS L’ADRESSE GOOGLE', () => {
  const remise = src('app', 'publish', 'hub-delivery.tsx');
  assert.doesNotMatch(remise, /item\.address/, '« Deli & Cia, Gare De Nice… » revient');
  assert.match(remise, /item\.displayDetail/);
});

test('🔴 LA LISTE NE SAUTE PLUS SOUS LE DOIGT', () => {
  for (const f of ['hub-delivery.tsx', 'hub-pickup.tsx']) {
    const code = src('app', 'publish', f);
    assert.doesNotMatch(code, /selected && \{ borderWidth: 2 \}/, `${f} : la bordure change d’épaisseur`);
    assert.doesNotMatch(code, /\{selected \? \(\s*<View style=\{\[styles\.checkCircle/, `${f} : la case n’existe que cochée`);
  }
  const remise = src('app', 'publish', 'hub-delivery.tsx');
  assert.doesNotMatch(remise, /\{form\.deliveryHubs\.length > 0 && \(\s*<ScrollView/, 'la rangée des choix apparaît au premier appui');
  assert.doesNotMatch(remise, /Maximum atteint<\/Text>/, 'une ligne s’ajoute sous chaque carte');
});

test('🔴 PLUS D’ÉCRITEAU « CARTE MAPLIBRE » — une vraie carte, ou pas d’onglet', () => {
  const recup = src('app', 'publish', 'hub-pickup.tsx');
  assert.doesNotMatch(recup, /MapLibre|development build/i);
  assert.match(recup, /<HubsMap /);
  assert.match(recup, /carteDisponible &&/, 'l’onglet Carte s’affiche sans carte');
});

test('⚠️ UNE CARTE CADRE TOUS LES HUBS D’UNE VILLE', () => {
  const un = cadrageDesHubs([{ lat: 43.7042, lng: 7.2621 }]);
  assert.equal(un.zoom, 16);
  const nice = cadrageDesHubs([
    { lat: 43.7042, lng: 7.2621 }, // Nice-Ville
    { lat: 43.6689, lng: 7.2141 }, // Saint-Augustin
  ]);
  assert.ok(nice.zoom <= 13 && nice.zoom >= 12, `zoom ${nice.zoom}`);
  assert.ok(Math.abs(nice.lat - 43.68655) < 1e-6);
});

test('🔴 « MARSEILLE » UNE FOIS, PAS DEUX', () => {
  assert.equal(villeSiAbsente('Chemin du Génie, Marseille', 'Marseille'), '');
  assert.equal(villeSiAbsente('1 Av. de la Liberté, Èze', 'Eze'), '');
  assert.equal(villeSiAbsente('Parking ouvert, côté entrée principale', 'Fréjus'), 'Fréjus');
  // « Nice » n'est pas dans « Niceville » : on compare des mots.
  assert.equal(villeSiAbsente('Av. de Niceville', 'Nice'), 'Nice');
  assert.doesNotMatch(src('app', 'publish', 'hub-pickup.tsx'), /\{item\.city\}/);
});

// ─── LE RESTE ──────────────────────────────────────────────────────────────

test('🔴 PLUS DE « 0 kg » : un poids inconnu ne s’écrit pas', () => {
  assert.equal(tailleEtPoids('M', null), 'M');
  assert.equal(tailleEtPoids('M', 0), 'M');
  assert.equal(tailleEtPoids('M', 2), 'M — 2 kg');
  assert.doesNotMatch(src('services', 'missions.ts'), /package_weight_kg \?\? 0/);
  for (const f of [['app', '(tabs)', 'missions.tsx'], ['app', 'mission', '[id].tsx'], ['app', 'mission', 'pickup.tsx'], ['app', 'mission', 'group.tsx'], ['app', 'mission', 'accept.tsx']]) {
    assert.doesNotMatch(src(...f), /\{mission\.package\.weight\} kg|\$\{mission\.package\.weight\} kg/, `${f.join('/')} écrit « 0 kg »`);
  }
});

test('🔴 L’INTERRUPTEUR « EN LIGNE » DIT CE QUE LE SERVEUR TIENT', () => {
  const service = src('services', 'disponibilite.ts');
  assert.match(service, /from\('courier_profiles'\)[\s\S]*?\.select\('is_online'\)/);
  // Pas de ligne = en ligne : la règle de `app.trajets_compatibles`.
  assert.match(service, /is_online \?\? true/);
  const magasin = src('stores', 'useAuthStore.ts');
  assert.equal((magasin.match(/relireEnLigne\(user\.id/g) ?? []).length, 2, 'au démarrage ET à la connexion');
});

test('🔴 LES ÉCRANS DE PRÉSENCE LISENT UN HUB, PAS L’ANNUAIRE', () => {
  for (const f of ['pickup.tsx', 'delivery.tsx']) {
    const code = src('app', 'mission', f);
    assert.doesNotMatch(code, /chargerHubs\(\)/, `${f} charge les 378 hubs pour en trouver un`);
    assert.match(code, /chargerHub\(hubVise\)/);
  }
});

test('🔴 MOI ET LE HUB NE PORTENT PLUS LA MÊME ÉPINGLE', () => {
  const carte = src('components', 'hub', 'HubMap.tsx');
  assert.match(carte, /point-moi\.png/);
  assert.match(carte, /point-autre\.png/);
  assert.match(carte, /personne\('moi'/);
});

test('⚠️ LE VENDEUR CONFIRME LA CO-LIVRAISON, pas « sa présence au hub »', () => {
  assert.doesNotMatch(src('app', 'mission', '[id].tsx'), /confirmer sa présence au hub/);
});
