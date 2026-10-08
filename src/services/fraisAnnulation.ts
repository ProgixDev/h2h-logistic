// MES FRAIS D'ANNULATION TARDIVE, ET LEUR CONTESTATION (hand-to-hand 20261008006000, 20261008007000).
//
// 🔴 2 € IMPUTABLES PAR DÉFAUT (§ 5.6.2) : « une situation de force majeure, une erreur imputable au Service ou un
// refus justifié de Colis fait l'objet d'un examen adapté ». Le cotransporteur conteste ici, dans les vingt-quatre
// heures qui suivent l'annulation, une fois ; l'équipe Logistique examine, et répond sur la mission.
//
// ⚠️ LES PIÈCES PARTENT D'ABORD, LA CONTESTATION ENSUITE — même ordre que les signalements : la fonction de dépôt
// reçoit des chemins dans `recours-pieces`, rangés sous l'identifiant du cotransporteur, et vérifie qu'ils sont les
// siens et arrivés.
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';

export type FraisAnnulation = {
  role: 'acheteur' | 'vendeur' | 'cotransporteur';
  annuleeLe: string;
  fraisCents: number;
  /** Retenu sur les prochaines participations. */
  duCents: number;
  contestable: boolean;
  contestableJusquAu: string | null;
  contestation: {
    reference: string;
    deposeLe: string;
    statut: 'a_examiner' | 'accepte' | 'rejete';
    reponse: string | null;
  } | null;
};

/** Mes frais sur cette co-livraison — si c'est moi qui l'ai annulée tard ; `null` sinon. */
export async function lireFraisAnnulation(orderId: string): Promise<FraisAnnulation | null> {
  const { data, error } = await supabase.rpc('frais_annulation_de_ma_commande', { p_commande: orderId });
  if (error) throw new Error(error.message);
  const f = data as Record<string, unknown> | null;
  if (!f) return null;
  const r = f.recours as Record<string, unknown> | null;
  return {
    role: f.role as FraisAnnulation['role'],
    annuleeLe: String(f.annulee_le),
    fraisCents: Number(f.frais_cents ?? 0),
    duCents: Number(f.du_cents ?? 0),
    contestable: f.contestable === true,
    contestableJusquAu: typeof f.contestable_jusqu_au === 'string' ? f.contestable_jusqu_au : null,
    contestation: r
      ? {
          reference: String(r.reference),
          deposeLe: String(r.depose_le),
          statut: r.statut as 'a_examiner' | 'accepte' | 'rejete',
          reponse: typeof r.reponse === 'string' ? r.reponse : null,
        }
      : null,
  };
}

/**
 * Téléverse les pièces d'une contestation, dans l'ordre, et rend leurs chemins.
 *
 * 🔴 LE CHEMIN EST RANGÉ PAR AUTEUR (`<profil>/…`) : c'est ce que vérifient la policy du seau et la fonction de
 * dépôt. `profilId` est passé, pas deviné — même forme que `televerserPreuvesSignalement`.
 */
export async function televerserPiecesContestation(profilId: string | null | undefined, uris: string[]): Promise<string[]> {
  if (uris.length === 0) return [];
  if (!profilId) {
    throw new Error('Les photos ne peuvent pas être jointes : profil inconnu. Envoyez la contestation sans photo, ou reconnectez-vous.');
  }
  const chemins: string[] = [];
  for (const [i, uri] of uris.entries()) {
    const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase().split('?')[0];
    const mime =
      ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp'
          : ext === 'heic' || ext === 'heif' ? 'image/heic'
            : 'image/jpeg';
    const chemin = `${profilId}/recours-${Date.now()}-${i}.${ext === 'heif' ? 'heic' : ext}`;
    const octets = (await new File(uri).bytes()).buffer as ArrayBuffer;
    const { error } = await supabase.storage
      .from('recours-pieces')
      .upload(chemin, octets, { contentType: mime, upsert: false });
    if (error) throw new Error(`photo : ${error.message}`);
    chemins.push(chemin);
  }
  return chemins;
}

/** Conteste mes frais : mes mots, et les chemins de mes pièces déjà téléversées. */
export async function deposerContestationFrais(orderId: string, texte: string, pieces: string[]): Promise<{ reference: string }> {
  const { data, error } = await supabase.rpc('recours_frais_deposer', {
    p_commande: orderId,
    p_texte: texte,
    p_pieces: pieces,
  });
  if (error) throw new Error(messageContestation(error.hint, error.message));
  return { reference: (data as { reference: string }).reference };
}

/** Le refus du serveur, dans des mots qu'un cotransporteur lit. */
export function messageContestation(indice: string | null | undefined, brut: string): string {
  switch (indice) {
    case 'RECOURS_DEJA_DEPOSE':
      return 'Vous avez déjà contesté ces frais : une seule contestation est possible.';
    case 'RECOURS_HORS_DELAI':
      return 'Le délai pour contester ces frais est passé : vingt-quatre heures après l’annulation. Vous pouvez encore écrire au support.';
    case 'RECOURS_TEXTE':
      return 'Expliquez en quelques phrases (20 caractères au moins) pourquoi cette annulation ne vous est pas imputable.';
    case 'RECOURS_PIECES':
      return 'Une photo n’a pas pu être jointe : réessayez, ou envoyez la contestation sans elle.';
    case 'RECOURS_INTROUVABLE':
      return 'Ces frais ne se contestent pas d’ici.';
    default:
      return brut;
  }
}
