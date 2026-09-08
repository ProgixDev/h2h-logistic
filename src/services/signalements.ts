// Signaler quelqu'un — pour de vrai.
//
// 🔴 CE QUE ÇA REMPLACE. `services/mock/userReports.ts` :
//
//     export async function submitUserReport(payload) {
//       await new Promise((r) => setTimeout(r, 1000));
//       return { id: `ureport-${Date.now()}`, createdAt: … };
//     }
//
// Une seconde d'attente, un identifiant fabriqué, et rien d'envoyé. Le signalant
// voyait un écran de succès et une référence qui n'existe nulle part. Parmi les
// motifs proposés : « Danger, menace ou comportement agressif ».
//
// 🔴 ET LA PLATEFORME SAVAIT DÉJÀ LES RECEVOIR. `signaler_utilisateur` écrit
// dans `user_reports` et sert la place de marché depuis des mois. Seule cette
// application-ci ne l'appelait pas — celle où les gens se rencontrent vraiment.
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { motifDeBase } from '@/utils/motifSignalement';

/**
 * Téléverse les pièces jointes d'un signalement et rend leurs chemins.
 *
 * 🔴 SANS CETTE ÉTAPE, LES PHOTOS N'ALLAIENT NULLE PART. Les deux écrans de
 * signalement — un hub, quelqu'un — proposent d'illustrer, gardent les URI dans
 * leur état local, et les deux RPC étaient appelées SANS `p_proofs`. Le
 * serveur attendait pourtant ce paramètre depuis le début, et les deux tables
 * ont leur colonne `proofs`. Mesuré le 08/09/2026 : 1 signalement de hub,
 * 0 preuve.
 *
 * ⚠️ UNE URI LOCALE N'EST PAS UNE PREUVE. `file:///data/user/0/…` ne vaut que
 * sur ce téléphone : la poser dans `proofs` aurait rempli la colonne sans rien
 * transmettre — le défaut corrigé pour les incidents le même jour.
 *
 * 🔴 LE CHEMIN EST RANGÉ PAR AUTEUR, et c'est le seul rattachement possible :
 * la RPC reçoit les chemins EN PARAMÈTRE, donc le téléversement précède la
 * ligne du dossier. Un dossier nommé d'après le signalement serait impossible à
 * écrire. `signalement_preuves_auteur_write` compare le premier segment à
 * `app.uid()` ; la lecture est « son auteur, ou le support ».
 *
 * ⚠️ `profilId` EST PASSÉ, PAS DEVINÉ — même forme que `televerserPreuves`
 * pour les incidents, qui reçoit son `shipmentId`. Un service ne va pas
 * chercher l'identité dans un store : c'est l'appelant qui sait qui signale.
 */
export async function televerserPreuvesSignalement(
  profilId: string | null | undefined,
  uris: string[],
): Promise<string[]> {
  if (uris.length === 0) return [];
  if (!profilId) {
    throw new Error(
      'Les photos ne peuvent pas être jointes : profil inconnu. Envoyez le '
      + 'signalement sans photo, ou reconnectez-vous.',
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
    // ⚠️ L'HORODATAGE ÉVITE D'ÉCRASER LA PIÈCE D'UN SIGNALEMENT PRÉCÉDENT :
    // tous les dossiers d'une même personne partagent son identifiant.
    const chemin = `${profilId}/signalement-${Date.now()}-${i}.${ext === 'heif' ? 'heic' : ext}`;
    const octets = (await new File(uri).bytes()).buffer as ArrayBuffer;
    const { error } = await supabase.storage
      .from('signalement-preuves')
      .upload(chemin, octets, { contentType: mime, upsert: false });
    if (error) throw new Error(`photo : ${error.message}`);
    chemins.push(chemin);
  }
  return chemins;
}

export type SignalementUtilisateur = {
  /** Le profil signalé. */
  utilisateurId: string;
  /** Le motif tel que l'écran le nomme — traduit ici. */
  motif: string;
  /** Ce que le signalant a écrit, transmis mot pour mot. */
  explication: string;
  /** La conversation d'où vient le signalement, s'il y en a une. */
  conversationId?: string | null;
  /** Bloquer le contact dans le même geste. */
  bloquerEnsuite?: boolean;
  /** Qui signale — pour ranger les pièces jointes sous son identifiant. */
  profilId?: string | null;
  /** Les photos jointes, en URI locales : elles sont téléversées à l envoi. */
  photoUris?: string[];
};

/**
 * Envoie le signalement et rend son identifiant RÉEL.
 *
 * 🔴 ON REND CE QUE LA BASE A ÉCRIT. C'est toute la différence avec ce qui
 * précédait : une référence fabriquée localement ne permet ni de retrouver le
 * dossier, ni de le suivre, ni de prouver qu'on a signalé.
 *
 * ⚠️ ET LE BLOCAGE PART DANS LE MÊME APPEL. `signaler_utilisateur` le prend en
 * charge : deux appels séparés laisseraient la possibilité que le signalement
 * passe et le blocage non — la personne signalée pouvant continuer d'écrire.
 */
export async function signalerUtilisateur(
  s: SignalementUtilisateur,
): Promise<{ id: string; creeLe: string }> {
  const explication = s.explication.trim();
  const { data, error } = await supabase.rpc('signaler_utilisateur', {
    p_reported_user_id: s.utilisateurId,
    p_reason: motifDeBase(s.motif),
    p_explanation: explication,
    p_conversation_id: s.conversationId ?? null,
    p_block_after: s.bloquerEnsuite ?? false,
    // 🔴 LE PARAMÈTRE EXISTAIT, PERSONNE NE LE REMPLISSAIT.
    p_proofs: await televerserPreuvesSignalement(s.profilId, s.photoUris ?? []),
  });
  if (error) throw new Error(error.message);
  const l = (Array.isArray(data) ? data[0] : data) as
    | { id: string; created_at: string }
    | null;
  if (!l?.id) throw new Error('Signalement non enregistré');
  return { id: l.id, creeLe: l.created_at };
}

export type SignalementHub = {
  hubId: string;
  /** Le motif tel que l'écran le nomme — l'énumération est déjà la bonne. */
  motif: string;
  /** Facultatif : « hub fermé » se suffit. */
  explication?: string;
  /** La co-livraison qui a amené le signalant là, s'il y en a une. */
  missionId?: string | null;
  /** Qui signale — pour ranger les pièces jointes sous son identifiant. */
  profilId?: string | null;
  /** Les photos jointes, en URI locales : elles sont téléversées à l'envoi. */
  photoUris?: string[];
};

/**
 * Signale un hub.
 *
 * 🔴 CE QUE ÇA REMPLACE : `submitHubReport`, une seconde d'attente et un
 * identifiant fabriqué. Parmi les motifs proposés : « Problème de sécurité ».
 *
 * ⚠️ LES SIX MOTIFS DE L'ÉCRAN SONT DÉJÀ CEUX DE `hub_report_reason` — la table
 * a été écrite d'après eux. Il n'y a donc rien à traduire ici, contrairement aux
 * signalements de personne où les deux vocabulaires divergent.
 *
 * ⚠️ ET LA COPIE DU HUB EST GELÉE PAR LE SERVEUR, pas envoyée d'ici : un hub
 * déménage, et l'appelant ne doit pas pouvoir décrire un hub qui n'a jamais
 * existé.
 */
export async function signalerHub(
  s: SignalementHub,
): Promise<{ id: string; creeLe: string }> {
  const { data, error } = await supabase.rpc('signaler_hub', {
    p_hub_id: s.hubId,
    p_reason: s.motif,
    p_explanation: s.explication?.trim() || null,
    p_mission_id: s.missionId ?? null,
    // 🔴 MÊME OUBLI, MÊME CORRECTION : `hub_reports.proofs` arrivait vide
    // depuis toujours, et l'écran promet « jusqu'à N photos pour illustrer ».
    p_proofs: await televerserPreuvesSignalement(s.profilId, s.photoUris ?? []),
  });
  if (error) throw new Error(error.message);
  const l = (Array.isArray(data) ? data[0] : data) as
    | { id: string; created_at: string }
    | null;
  if (!l?.id) throw new Error('Signalement non enregistré');
  return { id: l.id, creeLe: l.created_at };
}
