// OÙ JE SUIS, PAR RAPPORT AU POINT DE RENDEZ-VOUS.
//
// 🔴 CE HOOK FABRIQUAIT UNE POSITION EN PRODUCTION. Quand le GPS était refusé ou
// indisponible, il repliait sur `mockCoords(hub, false)` — une position inventée
// juste hors zone. L'écran affichait alors, avec aplomb, « vous êtes à 100 m du
// point » à quelqu'un dont l'appareil n'avait rien mesuré. Une distance inventée
// est pire qu'une absence de distance : elle se croit.
//
// ⚠️ DÉSORMAIS `coords` VAUT `null` ET `etat` DIT POURQUOI. L'écran doit le
// dire — dans les mots de la cause — et proposer de réessayer, pas afficher un
// chiffre.
//
// 🔴 ET IL NE LISAIT LE GPS QU'UNE FOIS (vu à l'émulateur le 10/09/2026). Un
// `getCurrentPositionAsync` au montage : raté, il laissait `null` pour
// toujours ; réussi, il figeait la position d'ARRIVÉE SUR L'ÉCRAN, qui partait
// ensuite comme preuve d'une arrivée au hub. Désormais :
//   • un SUIVI continu (`watchPositionAsync`) tant que l'écran le demande ;
//   • une RELECTURE au moment d'appuyer si le relevé suivi est périmé ;
//   • une relance au retour des réglages (`AppState`), où l'on vient
//     justement d'autoriser ou d'allumer la localisation.
// Les règles — quel relevé part, quelle cause afficher — sont dans
// `utils/positionDuTelephone.ts`, testées sans téléphone.
//
// 🔴 ET LE SIMULATEUR EST BORNÉ AU DÉVELOPPEMENT, DANS LE HOOK. `simulation`
// forçait une position DANS la zone ; le garde-fou `__DEV__` vivait chez
// l'appelant (`HubZoneCheck`, supprimé depuis — plus aucun import), donc le
// chemin de code partait quand même dans le
// binaire. Depuis que la présence est une PREUVE écrite en base, une position
// forcée n'est plus une commodité de démonstration : c'est une fausse
// déclaration. Le verrou est ici, au plus près de ce qu'il protège.
//
// ⚠️ ET CE HOOK NE DÉCIDE TOUJOURS RIEN. `inZone` sert à afficher le cercle et à
// dire « rapprochez-vous » AVANT d'appuyer. Le verdict qui compte vient de
// `declarer_presence_hub`, qui recalcule la distance côté serveur.
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import type { Hub } from '@/types/hub';
import { distanceToHubMeters, isInHubZone } from '@/utils/hubZone';
import {
  AGE_MAX_MS,
  DELAI_RELEVE_MS,
  avecDelai,
  estFrais,
  motifSansPosition,
  releveADeclarer,
  type EtatGps,
  type Releve,
} from '@/utils/positionDuTelephone';

export type ZoneSimulation = 'auto' | 'in' | 'out';

/** `mock` a disparu : une position vient du GPS, ou elle n'existe pas. */
export type PresenceSource = 'gps' | 'unavailable';

/** Ce que l'appui obtient : un relevé à envoyer, ou la cause de son absence. */
export type PositionPourDeclarer =
  | { ok: true; releve: Releve }
  | { ok: false; motif: Exclude<EtatGps, 'ok'> };

export interface HubPresence {
  coords: { latitude: number; longitude: number } | null;
  /** Rayon de confiance du dernier relevé, en mètres. */
  precisionM: number | null;
  distanceMeters: number | null;
  inZone: boolean;
  source: PresenceSource;
  /** Pourquoi il n'y a pas (encore) de position — ou `'ok'`. */
  etat: EtatGps;
  loading: boolean;
  /** À appeler AU MOMENT D'APPUYER : relit le téléphone si le suivi est périmé. */
  positionPourDeclarer: () => Promise<PositionPourDeclarer>;
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

const versReleve = (l: Location.LocationObject): Releve => ({
  latitude: l.coords.latitude,
  longitude: l.coords.longitude,
  precisionM: l.coords.accuracy ?? null,
  mesureLe: l.timestamp,
});

/** La permission, redemandée si le téléphone le permet encore. */
async function permissionAccordee(): Promise<boolean> {
  const actuelle = await Location.getForegroundPermissionsAsync();
  if (actuelle.granted) return true;
  if (!actuelle.canAskAgain) return false;
  return (await Location.requestForegroundPermissionsAsync()).granted;
}

/**
 * La localisation du téléphone est-elle allumée ?
 *
 * ⚠️ SUR ANDROID, ON PEUT DEMANDER DE L'ALLUMER SUR PLACE : `enableNetworkProviderAsync`
 * ouvre la fenêtre système « Activer la localisation ? ». Mieux qu'une phrase qui
 * envoie chercher dans les réglages au moment où l'autre partie attend.
 */
async function servicesActifs(proposerDAllumer: boolean): Promise<boolean> {
  if (await Location.hasServicesEnabledAsync()) return true;
  if (!proposerDAllumer || Platform.OS !== 'android') return false;
  try {
    await Location.enableNetworkProviderAsync();
  } catch {
    // Refusé dans la fenêtre système : on dira pourquoi.
  }
  return Location.hasServicesEnabledAsync();
}

/**
 * Position de l'utilisateur courant par rapport au point central d'un hub.
 *
 * ⚠️ CONFIDENTIALITÉ : seule SA PROPRE position est calculée ici, jamais celle de
 * l'autre partie — celle-là ne sort de `presence_au_hub()` qu'après la double
 * déclaration et la double présence dans la zone.
 *
 * ⚠️ `actif` DÉCIDE DU SUIVI GPS, PAS `hub`. Le hub arrive après un chargement ;
 * attendre qu'il soit là pour allumer le GPS, c'était perdre ces secondes de
 * recherche au moment où le relevé est le plus long à venir. Par défaut : suivi
 * dès qu'il y a un hub. Hors hub, l'appelant passe `actif: false`.
 */
export function useHubPresence(
  hub: Hub | null,
  options: { actif?: boolean } = {},
): HubPresence {
  const actif = options.actif ?? !!hub;
  const [simulationDemandee, setSimulation] = useState<ZoneSimulation>('auto');
  const [releve, setReleve] = useState<Releve | null>(null);
  const [etatGps, setEtatGps] = useState<EtatGps>('recherche');
  // Relancer le suivi : au retour des réglages, ou après une relecture qui a
  // obtenu la permission que le montage n'avait pas.
  const [relance, setRelance] = useState(0);
  // ⚠️ UNE RÉFÉRENCE, PAS L'ÉTAT : `positionPourDeclarer` s'exécute dans un
  // gestionnaire d'appui ; il doit voir le DERNIER relevé, pas celui du rendu
  // où la fonction a été créée.
  const dernier = useRef<Releve | null>(null);

  // 🔴 LE VERROU. Hors développement, aucune simulation n'existe, quoi que
  // l'appelant demande.
  const simulation: ZoneSimulation = __DEV__ ? simulationDemandee : 'auto';

  useEffect(() => {
    if (!actif) return;
    let annule = false;
    let abonnement: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const permission = await permissionAccordee();
        const services = permission ? await servicesActifs(false) : false;
        if (annule) return;
        if (!permission || !services) {
          setEtatGps(motifSansPosition({ permission, servicesActifs: services }));
          return;
        }
        // Un relevé récent déjà connu du téléphone : de quoi afficher tout de
        // suite une distance, en attendant le premier relevé du suivi.
        const connu = await Location.getLastKnownPositionAsync({ maxAge: AGE_MAX_MS }).catch(() => null);
        if (annule) return;
        if (connu && !dernier.current) {
          dernier.current = versReleve(connu);
          setReleve(dernier.current);
          setEtatGps('ok');
        }
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 3_000, distanceInterval: 3 },
          (l) => {
            dernier.current = versReleve(l);
            setReleve(dernier.current);
            setEtatGps('ok');
          },
        );
        if (annule) sub.remove();
        else abonnement = sub;
      } catch {
        if (!annule) setEtatGps('recherche');
      }
    })();
    return () => {
      annule = true;
      abonnement?.remove();
    };
  }, [actif, relance]);

  // De retour au premier plan — typiquement depuis les réglages, où l'on vient
  // d'autoriser ou d'allumer la localisation : on relance le suivi.
  useEffect(() => {
    if (!actif) return;
    const ecoute = AppState.addEventListener('change', (e) => {
      if (e === 'active') setRelance((n) => n + 1);
    });
    return () => ecoute.remove();
  }, [actif]);

  const positionPourDeclarer = async (): Promise<PositionPourDeclarer> => {
    if (__DEV__ && hub && simulation !== 'auto') {
      const p = positionSimulee(hub, simulation === 'in');
      return { ok: true, releve: { ...p, precisionM: null, mesureLe: Date.now() } };
    }
    // Le suivi est à jour : on l'envoie, sans faire attendre.
    if (estFrais(dernier.current, Date.now())) return { ok: true, releve: dernier.current };

    const permission = await permissionAccordee();
    // ⚠️ ICI ON PROPOSE D'ALLUMER : c'est un appui, la personne attend une réponse.
    const services = permission ? await servicesActifs(true) : false;
    if (!permission || !services) {
      const motif = motifSansPosition({ permission, servicesActifs: services });
      setEtatGps(motif);
      return { ok: false, motif };
    }
    const neuf = await avecDelai(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      DELAI_RELEVE_MS,
    );
    const connu = neuf ? null : await Location.getLastKnownPositionAsync({ maxAge: AGE_MAX_MS }).catch(() => null);
    const choisi = releveADeclarer(
      [neuf ? versReleve(neuf) : null, connu ? versReleve(connu) : null, dernier.current],
      Date.now(),
    );
    // Le suivi ne tournait peut-être pas (permission obtenue à l'instant) : on
    // le relance, pour que le prochain appui n'attende plus.
    setRelance((n) => n + 1);
    if (!choisi) {
      setEtatGps('recherche');
      return { ok: false, motif: 'recherche' };
    }
    dernier.current = choisi;
    setReleve(choisi);
    setEtatGps('ok');
    return { ok: true, releve: choisi };
  };

  // ⚠️ PAS DE REPLI INVENTÉ. Sans GPS, il n'y a pas de position — et c'est un
  // état que l'écran doit nommer, pas combler.
  let coords: { latitude: number; longitude: number } | null = null;
  let source: PresenceSource = 'unavailable';
  if (hub && __DEV__ && simulation === 'in') {
    coords = positionSimulee(hub, true);
  } else if (hub && __DEV__ && simulation === 'out') {
    coords = positionSimulee(hub, false);
  } else if (releve) {
    coords = { latitude: releve.latitude, longitude: releve.longitude };
    source = 'gps';
  }

  const distanceMeters =
    hub && coords ? distanceToHubMeters(coords.latitude, coords.longitude, hub) : null;
  const inZone = hub && coords ? isInHubZone(coords.latitude, coords.longitude, hub) : false;

  return {
    coords,
    precisionM: source === 'gps' ? releve?.precisionM ?? null : null,
    distanceMeters,
    inZone,
    source,
    etat: coords ? 'ok' : etatGps,
    // Dérivé, pas stocké : « en recherche » tant qu'aucun relevé n'est venu et
    // qu'aucune cause d'échec n'est connue.
    loading: actif && !coords && etatGps === 'recherche',
    positionPourDeclarer,
    simulation,
    setSimulation,
  };
}
