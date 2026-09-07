// OÙ JE SUIS, PAR RAPPORT AU POINT DE RENDEZ-VOUS.
//
// 🔴 CE HOOK FABRIQUAIT UNE POSITION EN PRODUCTION. Quand le GPS était refusé ou
// indisponible, il repliait sur `mockCoords(hub, false)` — une position inventée
// juste hors zone. L'écran affichait alors, avec aplomb, « vous êtes à 100 m du
// point » à quelqu'un dont l'appareil n'avait rien mesuré. Une distance inventée
// est pire qu'une absence de distance : elle se croit.
//
// ⚠️ DÉSORMAIS `coords` VAUT `null` ET `source` VAUT `'unavailable'`. L'écran
// doit le dire — « nous ne parvenons pas à vérifier votre position » — et
// proposer de réessayer, pas afficher un chiffre.
//
// 🔴 ET LE SIMULATEUR EST BORNÉ AU DÉVELOPPEMENT, DANS LE HOOK. `simulation`
// forçait une position DANS la zone ; le garde-fou `__DEV__` vivait chez
// l'appelant (`HubZoneCheck`), donc le chemin de code partait quand même dans le
// binaire. Depuis que la présence est une PREUVE écrite en base, une position
// forcée n'est plus une commodité de démonstration : c'est une fausse
// déclaration. Le verrou est ici, au plus près de ce qu'il protège.
//
// ⚠️ ET CE HOOK NE DÉCIDE TOUJOURS RIEN. `inZone` sert à afficher le cercle et à
// dire « rapprochez-vous » AVANT d'appuyer. Le verdict qui compte vient de
// `declarer_presence_hub`, qui recalcule la distance côté serveur.
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Hub } from '@/types/hub';
import { distanceToHubMeters, isInHubZone } from '@/utils/hubZone';

export type ZoneSimulation = 'auto' | 'in' | 'out';

/** `mock` a disparu : une position vient du GPS, ou elle n'existe pas. */
export type PresenceSource = 'gps' | 'unavailable';

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
 * Une position simulée au nord du point central — dans la zone (~40 % du rayon)
 * ou nettement dehors (rayon + 40 m).
 *
 * 🔴 DÉVELOPPEMENT UNIQUEMENT. Voir l'en-tête : appelée hors `__DEV__`, elle
 * fabriquerait une preuve.
 */
function positionSimulee(
  hub: Pick<Hub, 'point' | 'zoneRadiusM'>,
  dedans: boolean,
): { latitude: number; longitude: number } {
  const offsetM = dedans ? hub.zoneRadiusM * 0.4 : hub.zoneRadiusM + 40;
  return {
    latitude: hub.point.lat + offsetM / METERS_PER_DEG_LAT,
    longitude: hub.point.lng,
  };
}

/**
 * Position de l'utilisateur courant par rapport au point central d'un hub.
 *
 * ⚠️ CONFIDENTIALITÉ : seule SA PROPRE position est calculée ici, jamais celle de
 * l'autre partie — celle-là ne sort de `presence_au_hub()` qu'après la double
 * déclaration et la double présence dans la zone. Passer `hub = null` (hors hub)
 * désactive la vérification.
 */
export function useHubPresence(hub: Hub | null): HubPresence {
  const [simulationDemandee, setSimulation] = useState<ZoneSimulation>('auto');
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(!!hub);

  // 🔴 LE VERROU. Hors développement, aucune simulation n'existe, quoi que
  // l'appelant demande.
  const simulation: ZoneSimulation = __DEV__ ? simulationDemandee : 'auto';

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

  // ⚠️ PAS DE REPLI INVENTÉ. Sans GPS, il n'y a pas de position — et c'est un
  // état que l'écran doit nommer, pas combler.
  let coords: { latitude: number; longitude: number } | null = null;
  let source: PresenceSource = 'unavailable';
  if (hub) {
    if (__DEV__ && simulation === 'in') {
      coords = positionSimulee(hub, true);
    } else if (__DEV__ && simulation === 'out') {
      coords = positionSimulee(hub, false);
    } else if (gpsCoords) {
      coords = gpsCoords;
      source = 'gps';
    }
  }

  const distanceMeters =
    hub && coords ? distanceToHubMeters(coords.latitude, coords.longitude, hub) : null;
  const inZone = hub && coords ? isInHubZone(coords.latitude, coords.longitude, hub) : false;

  return { coords, distanceMeters, inZone, source, loading, simulation, setSimulation };
}
