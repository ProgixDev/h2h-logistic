import type { Hub } from '@/types/hub';

/** Default meeting-zone diameter (metres) → rayon 30 m. */
export const DEFAULT_HUB_ZONE_DIAMETER_M = 60;

/** Meeting-zone diameter for a hub, falling back to the default. */
export const hubZoneDiameterM = (hub: Pick<Hub, 'zoneDiameterMeters'>): number =>
  hub.zoneDiameterMeters ?? DEFAULT_HUB_ZONE_DIAMETER_M;

/** Meeting-zone radius (metres) — « dans la zone » = within this of the point central. */
export const hubZoneRadiusM = (hub: Pick<Hub, 'zoneDiameterMeters'>): number =>
  hubZoneDiameterM(hub) / 2;
