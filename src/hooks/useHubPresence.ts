import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Hub } from '@/types/hub';
import { distanceToHubMeters, isInHubZone } from '@/utils/hubZone';
import { hubZoneRadiusM } from '@/constants/hubZone';

export type ZoneSimulation = 'auto' | 'in' | 'out';
export type PresenceSource = 'gps' | 'mock';

export interface HubPresence {
  coords: { latitude: number; longitude: number } | null;
  distanceMeters: number | null;
  inZone: boolean;
  source: PresenceSource;
  loading: boolean;
  simulation: ZoneSimulation;
  setSimulation: (s: ZoneSimulation) => void;
}

const METERS_PER_DEG_LAT = 111_320;

/**
 * A mock position offset north from the hub's point central — inside the zone
 * (~40 % of the radius) or clearly outside (radius + 40 m). Frontend-first: lets
 * the flow demo in-zone vs out-of-zone without real GPS on the emulator.
 */
function mockCoords(
  hub: Pick<Hub, 'latitude' | 'longitude' | 'zoneDiameterMeters'>,
  inside: boolean,
): { latitude: number; longitude: number } {
  const radius = hubZoneRadiusM(hub);
  const offsetM = inside ? radius * 0.4 : radius + 40;
  return { latitude: hub.latitude + offsetM / METERS_PER_DEG_LAT, longitude: hub.longitude };
}

/**
 * Live presence of the current user relative to a hub's point central.
 * Uses expo-location when a foreground permission is granted; otherwise falls
 * back to a mock position (default: just outside the zone). The `simulation`
 * control lets a dev/demo force the in-zone or out-of-zone state.
 *
 * Confidentiality: only the user's OWN position is computed here — never the
 * other party's. Pass `hub = null` (e.g. off-hub) to disable the zone check.
 */
export function useHubPresence(hub: Hub | null): HubPresence {
  const [simulation, setSimulation] = useState<ZoneSimulation>('auto');
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(!!hub);

  const hubId = hub?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!hub) {
      setLoading(false);
      setGpsCoords(null);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setGpsCoords(null);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setGpsCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
        if (!cancelled) setGpsCoords(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubId]);

  // Resolve the effective position: forced simulation → mock; auto → GPS if we
  // have it, else a default out-of-zone mock so the UI shows the gated state.
  let coords: { latitude: number; longitude: number } | null = null;
  let source: PresenceSource = 'mock';
  if (hub) {
    if (simulation === 'in') {
      coords = mockCoords(hub, true);
    } else if (simulation === 'out') {
      coords = mockCoords(hub, false);
    } else if (gpsCoords) {
      coords = gpsCoords;
      source = 'gps';
    } else {
      coords = mockCoords(hub, false);
    }
  }

  const distanceMeters = hub && coords ? distanceToHubMeters(coords.latitude, coords.longitude, hub) : null;
  const inZone = hub && coords ? isInHubZone(coords.latitude, coords.longitude, hub) : false;

  return { coords, distanceMeters, inZone, source, loading, simulation, setSimulation };
}
