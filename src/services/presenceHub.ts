// DÉCLARER SA PRÉSENCE AU HUB — côté cotransporteur.
//
// 🔴 CE FICHIER N'EXISTAIT PAS, ET C'EST POURQUOI « JE SUIS AU HUB »
// N'ENREGISTRAIT RIEN. `20260906130000` a posé la table `hub_presence`, la
// fonction `declarer_presence_hub`, la règle de révélation GPS et le miroir
// dans `journal_expedition` — tout, sauf un appelant. Côté coursier,
// `validatePresence()` posait un état local et affichait « Présence validée au
// hub ✓ » ; côté place de marché, aucun écran n'appelait le service.
//
// Le guide client (docs/hubs-fonctionnement.md §3) dit que ce bouton sert à
// « fournir un élément de preuve en cas d'absence, de retard ou de
// réclamation ». Une preuve qui n'existe que dans la mémoire vive du téléphone
// de celui qu'elle doit engager n'est pas une preuve — c'est le défaut exact
// que la migration corrigeait, et il est resté entier trois semaines de plus,
// parce que la moitié base était faite et la moitié client non.
//
// ⚠️ ET LA RÈGLE DES DEUX DÉCLARATIONS NE POUVAIT PAS SE DÉCLENCHER.
// `presence_au_hub()` ne lève le voile sur les positions qu'une fois les DEUX
// parties déclarées ET dans la zone. Avec un seul côté câblé — et en réalité
// aucun — le compte ne pouvait jamais atteindre deux.
//
// 🔴 ON ENVOIE UNE POSITION, JAMAIS UN VERDICT. `dansLaZone` revient du serveur,
// qui recalcule la distance depuis les coordonnées du hub avec
// `app.distance_metres`. Un client qui annoncerait lui-même être dans la zone
// lèverait le voile sur la position de l'autre en mentant — c'est la leçon de
// `p_actor_role` dans `record_scan_event`.
import { supabase } from '@/lib/supabase';

export type EtapeHub = 'recuperation' | 'remise';
export type PartieHub = 'vendeur' | 'acheteur' | 'cotransporteur';

/** Ce que le serveur répond à une déclaration. */
export type DeclarationPresence = {
  /** Verdict du SERVEUR. Jamais calculé ici. */
  dansLaZone: boolean;
  distanceM: number;
  /** L'heure d'arrivée, gelée au premier appui — c'est elle qu'un litige relit. */
  declareeLe: string;
  /** Premier instant vu DANS la zone. `null` = jamais. */
  valideeLe: string | null;
  retardMinutes: number | null;
  rayonM: number;
};

export type PresencePartie = {
  partie: PartieHub;
  estMoi: boolean;
  aDeclare: boolean;
  declareeLe: string | null;
  retardMinutes: number | null;
  /** `null` pour l'autre partie tant que le voile n'est pas levé. */
  dansLaZone: boolean | null;
  distanceM: number | null;
  position: { lat: number; lng: number } | null;
};

export type EtatPresenceHub = {
  parties: PresencePartie[];
  /** `true` quand les deux ont déclaré ET sont dans la zone. */
  gpsPartage: boolean;
  rayonM: number | null;
};

const estUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/**
 * Déclarer sa présence.
 *
 * ⚠️ LE SERVEUR DÉDUIT QUI ON EST. `declarer_presence_hub` lit la mission pour
 * savoir si l'appelant est le vendeur, l'acheteur ou le cotransporteur — le rôle
 * n'est pas un paramètre. Un cotransporteur ne peut donc pas déclarer à la place
 * de l'acheteur, même en le voulant.
 *
 * ⚠️ ET HORS HUB, LE SERVEUR REFUSE : il n'y a pas de zone à vérifier. L'écran
 * doit le savoir plutôt que de laisser remonter « cette remise a lieu hors
 * hub » comme une panne.
 */
export async function declarerPresenceHub(
  missionId: string,
  etape: EtapeHub,
  position: { lat: number; lng: number; precisionM?: number | null },
): Promise<DeclarationPresence> {
  if (!estUuid(missionId)) throw new Error('co-livraison introuvable');
  const { data, error } = await supabase.rpc('declarer_presence_hub', {
    p_mission_id: missionId,
    p_etape: etape,
    p_latitude: position.lat,
    p_longitude: position.lng,
    p_accuracy_m: position.precisionM ?? null,
  });
  if (error) throw new Error(error.message);
  const l = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  if (!l) throw new Error('présence non enregistrée');
  return {
    dansLaZone: Boolean(l.dans_la_zone),
    distanceM: Number(l.distance_m),
    declareeLe: String(l.declaree_le),
    valideeLe: l.validee_le ? String(l.validee_le) : null,
    retardMinutes: l.retard_minutes == null ? null : Number(l.retard_minutes),
    rayonM: Number(l.rayon_m),
  };
}

/**
 * L'état des présences pour une étape.
 *
 * ⚠️ `position` RESTE `null` POUR L'AUTRE PARTIE tant que `gpsPartage` est faux :
 * le serveur ne rend simplement pas les colonnes. L'écran n'a donc rien à
 * cacher — il n'a rien reçu. C'est délibéré : un masquage côté client se défait
 * avec un inspecteur réseau.
 */
export async function lirePresenceHub(
  missionId: string,
  etape: EtapeHub,
): Promise<EtatPresenceHub> {
  if (!estUuid(missionId)) throw new Error('co-livraison introuvable');
  const { data, error } = await supabase.rpc('presence_au_hub', {
    p_mission_id: missionId,
    p_etape: etape,
  });
  if (error) throw new Error(error.message);

  const lignes = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
  const parties: PresencePartie[] = lignes.map((l) => {
    const lat = l.latitude == null ? null : Number(l.latitude);
    const lng = l.longitude == null ? null : Number(l.longitude);
    return {
      partie: l.partie as PartieHub,
      estMoi: Boolean(l.est_moi),
      aDeclare: Boolean(l.a_declare),
      declareeLe: l.declaree_le ? String(l.declaree_le) : null,
      retardMinutes: l.retard_minutes == null ? null : Number(l.retard_minutes),
      dansLaZone: l.dans_la_zone == null ? null : Boolean(l.dans_la_zone),
      distanceM: l.distance_m == null ? null : Number(l.distance_m),
      position: lat != null && lng != null ? { lat, lng } : null,
    };
  });

  return {
    parties,
    gpsPartage: lignes.some((l) => Boolean(l.gps_partage)),
    rayonM: lignes.length ? Number(lignes[0].rayon_m) : null,
  };
}
