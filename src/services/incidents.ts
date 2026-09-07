// LES DÉCLARATIONS D'INCIDENT ATTEIGNENT ENFIN LA BASE.
//
// 🔴 CE QUE CE MODULE REMPLACE, ET CE QUE ÇA COÛTAIT. `useIncidentsStore`
// attendait 800 ms, fabriquait un identifiant `incident-${Date.now()}`, le
// rangeait en mémoire et l'écran affichait « Formulaire envoyé. » Douze
// formulaires — absences, blocages, refus de colis, annulations,
// contestations — ne quittaient jamais le téléphone. Un cotransporteur qui
// déclarait l'acheteur absent croyait avoir ouvert le dossier qui le protège.
//
// ⚠️ ET DEUX DOSSIERS DE DÉMONSTRATION ÉTAIENT SEMÉS AU DÉMARRAGE, avec un
// « Gare Saint-Charles » et des missions qui n'existent pas. Ils servaient de
// base au calcul des fenêtres de contestation : l'écran mesurait des délais
// contre des dossiers inventés.
//
// 🔴 ON N'ÉCRIT PAS DANS LA TABLE, ON APPELLE `declarer_incident`. L'insertion
// directe a été FERMÉE le 07/09/2026 (`revoke insert … from authenticated`) et
// c'est volontaire : `app.tg_incident_admissibility` compare `declared_at` à
// `rendezvous_at + tolérance`, et sur une insertion directe les deux venaient
// du téléphone. Un client modifié annonçait un rendez-vous d'il y a deux heures
// et s'ouvrait lui-même la règle D0.
//
// ⚠️ CE QUE LE SERVEUR DÉDUIT, ET QU'ON NE LUI ENVOIE DONC PAS : le rôle du
// déclarant, l'heure du rendez-vous, le hub, l'expédition, le statut de la
// mission, et la fin de la fenêtre de contestation. La liste des paramètres de
// la fonction EST la surface d'attaque — tout ce qui n'y figure pas ne peut pas
// être menti.
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import type { DeclarantRole, IncidentFormType, MissionFormStatus } from '@/types/incident';

/** Une déclaration telle que la base la rend — jamais telle que l'app l'espère. */
export type IncidentDepose = {
  id: string;
  type: IncidentFormType;
  declareeLe: string;
  rendezVousLe: string;
  roleDeclarant: DeclarantRole;
  statutMission: MissionFormStatus;
  /** Fin de la fenêtre de 24 h — calculée par le serveur, ou absente. */
  finContestation: string | null;
  motif: string | null;
  commentaire: string | null;
};

export type BrouillonIncident = {
  missionId: string;
  type: IncidentFormType;
  motif?: string;
  reponses?: Record<string, string>;
  /** Chemins DANS LE SEAU, pas des URI locales — voir `televerserPreuves`. */
  cheminsPreuves?: string[];
  commentaire?: string;
  position?: { lat: number; lng: number };
  /** La déclaration contestée, pour F3 / F5 / F8 / F14. */
  contesteId?: string;
};

/**
 * Dépose la déclaration et rend ce que le serveur en a fait.
 *
 * ⚠️ LES ERREURS DU SERVEUR SONT DES RÈGLES, PAS DES PANNES : « tolerance non
 * ecoulee », « le formulaire X n est pas ouvert au role Y », « vous n etes pas
 * partie a cette co-livraison ». Elles remontent telles quelles à l'écran —
 * les traduire en « une erreur est survenue » priverait le cotransporteur de la
 * seule information utile.
 */
export async function declarerIncident(brouillon: BrouillonIncident): Promise<IncidentDepose> {
  const { data, error } = await supabase.rpc('declarer_incident', {
    p_mission_id: brouillon.missionId,
    p_type: brouillon.type,
    p_accuracy_confirmed: true,
    p_reason: brouillon.motif ?? null,
    p_answers: brouillon.reponses ?? {},
    p_proof_paths: brouillon.cheminsPreuves ?? [],
    p_comment: brouillon.commentaire ?? null,
    p_latitude: brouillon.position?.lat ?? null,
    p_longitude: brouillon.position?.lng ?? null,
    p_contests_id: brouillon.contesteId ?? null,
  });
  if (error) throw new Error(error.message);

  const l = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  if (!l?.declaration_id) throw new Error('déclaration non enregistrée');

  return {
    id: String(l.declaration_id),
    type: brouillon.type,
    declareeLe: String(l.declaree_le),
    rendezVousLe: String(l.rendez_vous_le),
    roleDeclarant: l.role_declarant as DeclarantRole,
    statutMission: l.statut_mission as MissionFormStatus,
    finContestation: (l.fin_contestation as string | null) ?? null,
    motif: brouillon.motif ?? null,
    commentaire: brouillon.commentaire ?? null,
  };
}

/**
 * Les déclarations déjà déposées sur une co-livraison.
 *
 * 🔴 C'EST CE QUI REND LES CONTESTATIONS RÉELLES. L'écran cherche la
 * déclaration visée pour lire SA fenêtre de 24 h ; tant que la liste venait
 * d'un magasin local, il mesurait un délai contre un dossier inventé — et
 * `contests_id` n'aurait désigné aucune ligne existante.
 *
 * ⚠️ ON NE SÉLECTIONNE PAS `geo`. PostgREST rendrait la géographie en WKB
 * hexadécimal, illisible — le même piège que `hubs.geo`.
 */
export async function chargerIncidentsDeMission(missionId: string): Promise<IncidentDepose[]> {
  const { data, error } = await supabase
    .from('incident_declarations')
    .select('id, type, declared_at, rendezvous_at, declarant_role, mission_status,'
      + ' contestation_deadline, reason, comment')
    .eq('mission_id', missionId)
    .order('declared_at', { ascending: false });
  if (error) throw new Error(error.message);

  // Même geste que `missions.ts` et `hubs.ts` : les types générés ne couvrent
  // pas cette table, on nomme la ligne plutôt que de laisser `any` circuler.
  type Ligne = {
    id: string;
    type: string;
    declared_at: string;
    rendezvous_at: string;
    declarant_role: string;
    mission_status: string;
    contestation_deadline: string | null;
    reason: string | null;
    comment: string | null;
  };

  return ((data ?? []) as unknown as Ligne[]).map((l) => ({
    id: String(l.id),
    type: l.type as IncidentFormType,
    declareeLe: String(l.declared_at),
    rendezVousLe: String(l.rendezvous_at),
    roleDeclarant: l.declarant_role as DeclarantRole,
    statutMission: l.mission_status as MissionFormStatus,
    finContestation: (l.contestation_deadline as string | null) ?? null,
    motif: (l.reason as string | null) ?? null,
    commentaire: (l.comment as string | null) ?? null,
  }));
}

/**
 * Téléverse les photos jointes et rend leurs chemins dans le seau.
 *
 * 🔴 SANS CETTE ÉTAPE, `proof_uris` RECEVAIT DES URI LOCALES — `file:///data/
 * user/0/…`, valables sur ce téléphone et nulle part ailleurs. C'est le même
 * défaut que `hub_reports.proofs`, qui arrive vide depuis toujours : des photos
 * collectées à l'écran, jamais transmises. Une preuve que le support ne peut
 * pas ouvrir n'est pas une preuve.
 *
 * ⚠️ LE SEAU EST RANGÉ PAR EXPÉDITION, ET SA POLITIQUE L'EXIGE :
 * `handoff_photos_parties_write` compare le PREMIER SEGMENT du chemin à
 * `shipments.id`. Sans expédition, il n'y a pas de chemin autorisé — on lève
 * plutôt que de déposer un dossier amputé de ses pièces.
 */
export async function televerserPreuves(
  shipmentId: string | null | undefined,
  uris: string[],
): Promise<string[]> {
  if (uris.length === 0) return [];
  if (!shipmentId) {
    throw new Error(
      'Les photos ne peuvent pas être jointes : cette co-livraison n’a pas encore '
      + 'd’expédition. Envoyez le formulaire sans photo, ou réessayez plus tard.',
    );
  }

  const chemins: string[] = [];
  for (const [i, uri] of uris.entries()) {
    const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase().split('?')[0];
    const mime =
      ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp'
          : ext === 'heic' || ext === 'heif' ? 'image/heic'
            : 'image/jpeg';
    // ⚠️ L'HORODATAGE ÉVITE D'ÉCRASER LA PREUVE D'UNE DÉCLARATION PRÉCÉDENTE.
    // Deux formulaires sur la même expédition partagent le dossier ; un nom
    // fixe ferait disparaître la première photo au profit de la seconde.
    const chemin = `${shipmentId}/incident-${Date.now()}-${i}.${ext === 'heif' ? 'heic' : ext}`;
    const octets = (await new File(uri).bytes()).buffer as ArrayBuffer;
    const { error } = await supabase.storage
      .from('handoff-photos')
      .upload(chemin, octets, { contentType: mime, upsert: false });
    if (error) throw new Error(`photo : ${error.message}`);
    chemins.push(chemin);
  }
  return chemins;
}
