// OÙ CENTRER, ET DE QUELLE HAUTEUR REGARDER, POUR VOIR TOUS LES HUBS D'UNE VILLE.
//
// ⚠️ `expo-maps` NE CADRE PAS TOUT SEUL : sa `cameraPosition` est un centre et un
// zoom. Trop près, la moitié des points sort de l'écran et semble ne pas
// exister ; trop loin, les épingles d'une même gare se confondent. Pur, pour se
// tester sans carte.
import { haversineDistance } from '@/utils/distance';

export type Cadrage = { lat: number; lng: number; zoom: number };

/**
 * Centre = milieu de la boîte englobante ; zoom = selon le point le plus
 * éloigné de ce centre. Un seul point : on regarde la rue.
 */
export function cadrageDesHubs(points: readonly { lat: number; lng: number }[]): Cadrage {
  if (points.length === 0) return { lat: 46.6, lng: 2.4, zoom: 5 }; // la France entière
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  // `haversineDistance` rend des kilomètres.
  const rayonKm = Math.max(...points.map((p) => haversineDistance(lat, lng, p.lat, p.lng)));
  const zoom =
    rayonKm < 0.3 ? 16
    : rayonKm < 0.8 ? 15
    : rayonKm < 1.6 ? 14
    : rayonKm < 3.2 ? 13
    : rayonKm < 6.5 ? 12
    : rayonKm < 13 ? 11
    : 10;
  return { lat, lng, zoom };
}
