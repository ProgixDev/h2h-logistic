// La zone du hub — « êtes-vous vraiment au point de rendez-vous ? »
//
// 🔴 CE FICHIER ÉPINGLAIT UN NOMBRE QUI N'AURAIT JAMAIS DÛ VIVRE ICI. Il
// vérifiait `DEFAULT_HUB_ZONE_DIAMETER_M === 60`, donc un rayon de 30 m — pendant
// que `hand-to-hand/src/utils/hubZone.ts` en portait un de 150 m. Deux
// constantes, un facteur cinq, aucune des deux venue du serveur : le test
// verrouillait consciencieusement la moitié d'une contradiction.
//
// ⚠️ DEPUIS LE 06/09/2026 LE RAYON EST UNE DONNÉE, par hub, dans
// `public.hubs.zone_radius_m` (60 m par défaut). `constants/hubZone.ts` a été
// supprimé, et `Hub.zoneRadiusM` est OBLIGATOIRE : il n'y a plus de défaut
// client à réintroduire, parce qu'il n'y a plus rien à remplir.
//
// 🔴 ET CES FONCTIONS NE DÉCIDENT PLUS RIEN. Le verdict de présence vient de
// `declarer_presence_hub`, qui recalcule la distance côté serveur — sinon il
// suffirait de mentir sur sa position pour se déclarer présent. Ce qui reste
// ici sert à AFFICHER : le cercle, la distance, « rapprochez-vous ».
//
// ⚠️ CE QUI EST GARDÉ DE L'ANCIENNE VERSION, PARCE QUE ÇA L'AVAIT MÉRITÉ : la
// distance est en MÈTRES (le ×1000 oublié rendrait toute position « dans la
// zone »), et la borne est INCLUSIVE (une inégalité stricte refuserait quelqu'un
// pile au bord, au mètre près, sans rien lui expliquer).

import test from 'node:test';
import assert from 'node:assert/strict';

import { distanceToHubMeters, isInHubZone } from '@/utils/hubZone';

// Gare de Nice-Ville, approximativement, avec le rayon que rend la base.
const HUB = { point: { lat: 43.7048, lng: 7.2619 }, zoneRadiusM: 60 };
const METRE_EN_DEGRE_LAT = 1 / 111_320;

/** Une position décalée de `m` mètres vers le nord du point central. */
const auNord = (m: number) => ({
  latitude: HUB.point.lat + m * METRE_EN_DEGRE_LAT,
  longitude: HUB.point.lng,
});

// ── La distance ────────────────────────────────────────────────────────────

test('🔴 LA DISTANCE EST EN MÈTRES, PAS EN KILOMÈTRES', () => {
  // ⚠️ `haversineDistance` rend des km. Oublier le ×1000 rendrait toute
  // position « à 0,05 m » du hub — donc toujours dans la zone.
  const d = distanceToHubMeters(auNord(100).latitude, auNord(100).longitude, HUB);
  assert.ok(d > 90 && d < 110, `attendu ~100 m, reçu ${d}`);
});

test('sur le point central, la distance est nulle', () => {
  assert.ok(distanceToHubMeters(HUB.point.lat, HUB.point.lng, HUB) < 1);
});

test('la distance ne dépend pas du SENS du décalage', () => {
  const nord = distanceToHubMeters(auNord(50).latitude, auNord(50).longitude, HUB);
  const sud = distanceToHubMeters(auNord(-50).latitude, auNord(-50).longitude, HUB);
  assert.ok(Math.abs(nord - sud) < 1, 'nord et sud à 50 m donnent la même distance');
});

// ── Dedans / dehors ────────────────────────────────────────────────────────

test('à 10 m du point central, on est dans la zone', () => {
  const p = auNord(10);
  assert.equal(isInHubZone(p.latitude, p.longitude, HUB), true);
});

test('🔴 LE RAYON VIENT DU HUB, JAMAIS D’UNE CONSTANTE', () => {
  // ⚠️ LA MÊME POSITION, DEUX HUBS, DEUX RÉPONSES. C'est ce qui rend impossible
  // le retour d'un défaut côté client : il n'y a rien à lire ailleurs.
  const p = auNord(80);
  assert.equal(isInHubZone(p.latitude, p.longitude, { ...HUB, zoneRadiusM: 60 }), false);
  assert.equal(isInHubZone(p.latitude, p.longitude, { ...HUB, zoneRadiusM: 200 }), true);
});

test('⚠️ LA BORNE EST DEDANS : au rayon pile, on est dans la zone', () => {
  // Une inégalité stricte refuserait la présence de quelqu'un pile au bord,
  // au mètre près, sans rien lui expliquer.
  const p = auNord(HUB.zoneRadiusM - 0.5);
  assert.equal(isInHubZone(p.latitude, p.longitude, HUB), true);
});

// ── LE DÉFAUT NE PEUT PAS REVENIR ──────────────────────────────────────────

test('🔴 AUCUNE CONSTANTE DE ZONE NE SURVIT DANS `src`', async () => {
  // 🔴 SUPPRIMER LES DEUX CONSTANTES NE SUFFIT PAS : quelqu'un en réécrit une le
  // jour où un écran a besoin d'un rayon avant d'avoir chargé son hub. Ce test
  // est le seul obstacle à ce retour.
  //
  // ⚠️ Le pendant côté base est `rayonDeZoneUnique` dans hand-to-hand, qui relit
  // le défaut de la colonne. Aucun lanceur de tests ne couvre les deux dépôts —
  // les deux moitiés se citent donc l'une l'autre en commentaire.
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');

  const fautifs: string[] = [];
  const parcourir = (dir: string) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (/\.(ts|tsx)$/.test(e) && !p.includes('hubZone.test')) {
        // ⚠️ ON CHERCHE UNE DÉCLARATION, PAS UNE MENTION. Le premier jet
        // signalait `hubZone.ts` — qui EXPLIQUE en commentaire que la constante a
        // été supprimée. Un garde-fou qui compte les explications de sa propre
        // règle finit par pousser à effacer l'explication.
        if (/(?:^|\n)\s*(?:export\s+)?const\s+DEFAULT_HUB_ZONE/.test(readFileSync(p, 'utf8'))) {
          fautifs.push(p);
        }
      }
    }
  };
  parcourir(join(process.cwd(), 'src'));
  assert.deepEqual(fautifs, [],
    `une constante de zone est revenue :\n${fautifs.join('\n')}`);
});
