// LA ZONE DU HUB — un miroir du serveur, jamais l'autorité.
//
// 🔴 CE FICHIER DÉCIDAIT, ET IL NE DÉCIDE PLUS. `isInHubZone` répondait ici, sur
// un rayon posé par une constante locale (30 m) que la version marketplace
// contredisait (150 m). Deux clients qui décident chacun s'ils sont « dans la
// zone » ne décident rien : il suffit d'installer l'autre.
//
// ⚠️ DEPUIS LE 06/09/2026 LE VERDICT VIENT DE `declarer_presence_hub`, qui
// recalcule la distance depuis les coordonnées du hub et rend `in_zone`. Ce que
// ces fonctions servent encore : afficher « vous êtes à 80 m » et dessiner le
// cercle AVANT d'appuyer, pour que quelqu'un puisse se rapprocher sans faire
// d'aller-retour au serveur. C'est un CONFORT D'AFFICHAGE, et l'écran ne doit
// jamais s'en servir pour autoriser quoi que ce soit.
//
// 🔴 ET LE RAYON N'EST PLUS UNE CONSTANTE : il vient de `hub.zoneRadiusM`, donc
// de la base, par hub. `constants/hubZone.ts` et ses `DEFAULT_HUB_ZONE_*` ont
// été supprimés — un défaut côté client, c'est une deuxième vérité.
import type { Hub } from '@/types/hub';
import { haversineDistance } from '@/utils/distance';

/** Distance (mètres) entre une position et le point central du hub. */
export function distanceToHubMeters(
  lat: number,
  lon: number,
  hub: Pick<Hub, 'point'>,
): number {
  // ⚠️ `haversineDistance` REND DES KILOMÈTRES — d'où le ×1000. Jamais une
  // seconde haversine : deux formules divergent le jour où l'une est corrigée.
  return haversineDistance(lat, lon, hub.point.lat, hub.point.lng) * 1000;
}

/**
 * « Dans la zone du hub », POUR L'AFFICHAGE SEULEMENT.
 *
 * ⚠️ Le serveur reste seul juge : `declarer_presence_hub` recalcule et rend
 * `dans_la_zone`. Utiliser cette fonction pour activer un bouton reviendrait à
 * laisser le téléphone se déclarer présent.
 */
export function isInHubZone(
  lat: number,
  lon: number,
  hub: Pick<Hub, 'point' | 'zoneRadiusM'>,
): boolean {
  return distanceToHubMeters(lat, lon, hub) <= hub.zoneRadiusM;
}
