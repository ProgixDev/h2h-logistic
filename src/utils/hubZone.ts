import type { Hub } from '@/types/hub';
import { haversineDistance } from '@/utils/distance';
import { hubZoneRadiusM } from '@/constants/hubZone';

/** Distance (metres) from a position to the hub's point central. */
export function distanceToHubMeters(
  lat: number,
  lon: number,
  hub: Pick<Hub, 'latitude' | 'longitude'>,
): number {
  // haversineDistance returns KM — reuse it (×1000), never a second haversine.
  return haversineDistance(lat, lon, hub.latitude, hub.longitude) * 1000;
}

/** « Dans la zone du hub » — within the radius of the point central. */
export function isInHubZone(
  lat: number,
  lon: number,
  hub: Pick<Hub, 'latitude' | 'longitude' | 'zoneDiameterMeters'>,
): boolean {
  return distanceToHubMeters(lat, lon, hub) <= hubZoneRadiusM(hub);
}
