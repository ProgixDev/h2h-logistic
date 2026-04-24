import type { TransportTypeId } from '@/constants/TransportTypes';

/**
 * CO₂ emissions per km/package, in grams.
 * Baseline: a standalone courier van making a dedicated trip for a single package.
 * Our shared-route equivalents split or eliminate that emission.
 */
const BASELINE_G_PER_KM = 250; // solo courier van

const ACTUAL_G_PER_KM: Record<TransportTypeId, number> = {
  walking: 0,
  bike: 0,
  scooter: 70,
  car: 90,
  bus: 30,
  train: 15,
};

export type CarbonTransportType = TransportTypeId;

export function calculateCo2Saved(distanceKm: number, transportType: CarbonTransportType): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  const actual = ACTUAL_G_PER_KM[transportType] ?? ACTUAL_G_PER_KM.car;
  const savedGrams = Math.max(0, (BASELINE_G_PER_KM - actual) * distanceKm);
  return Math.round((savedGrams / 1000) * 100) / 100;
}

export function formatCo2(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return '0 g CO₂';
  if (kg < 1) {
    const grams = Math.round(kg * 1000);
    return `${grams} g CO₂`;
  }
  return `${kg.toFixed(kg < 10 ? 1 : 0)} kg CO₂`;
}

/**
 * Friendly equivalence to help users visualize the impact.
 * Returns a short phrase. Mixes between "km en voiture évités" and "arbres sur 1 an"
 * based on magnitude, so values feel relatable.
 */
export function equivalence(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return '';
  // 1 km en voiture ≈ 0.12 kg CO₂
  const carKm = Math.round(kg / 0.12);
  // 1 arbre absorbe ~25 kg CO₂ / an
  const trees = kg / 25;

  if (kg < 5) {
    return `≈ ${carKm} km en voiture évités`;
  }
  if (trees < 1) {
    const months = Math.round(trees * 12);
    return `≈ ${months} mois de CO₂ absorbé par un arbre`;
  }
  return `≈ ${Math.round(trees * 10) / 10} arbre${trees >= 2 ? 's' : ''} plantés sur 1 an`;
}

/**
 * Rough distance between city pairs for mock data.
 * Real implementation would use geocoding + routing.
 */
const CITY_DISTANCES_KM: Record<string, number> = {
  'Nice→Cannes': 33,
  'Cannes→Nice': 33,
  'Nice→Marseille': 200,
  'Marseille→Nice': 200,
  'Nice→Antibes': 22,
  'Antibes→Nice': 22,
  'Nice→Monaco': 20,
  'Monaco→Nice': 20,
  'Cannes→Antibes': 11,
  'Antibes→Cannes': 11,
};

export function estimateDistanceKm(pickupCity: string, deliveryCity: string): number {
  const key = `${pickupCity}→${deliveryCity}`;
  return CITY_DISTANCES_KM[key] ?? 25; // sensible default for intra-region trips
}
