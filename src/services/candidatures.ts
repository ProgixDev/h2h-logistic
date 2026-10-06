// LES PROPOSITIONS DE CO-LIVRAISON ET LES CANDIDATURES — § 5 des CGU H2H Logistic.
//
// 🔴 CE N'EST PAS `services/missions.ts`. Là, une proposition est une mission
// adressée à UN cotransporteur, qui la prend ou la laisse. Ici, une recherche est
// notifiée à TOUS les cotransporteurs éligibles en même temps ; accepter, c'est
// candidater sur un passage, et c'est l'acheteur qui choisit, puis le vendeur qui
// valide. Les deux mondes coexistent : la mise en relation v2 ne s'allume qu'à la
// date que la plateforme publie (`ref.delay_protocol.mise_en_relation`), et les
// missions déjà engagées finissent sur l'ancien parcours.
//
// ⚠️ TOUT PASSE PAR LES PORTES DE LA BASE (`public.colivraison_*`,
// `public.cotransporteur_*`). Aucune table de la mise en relation n'est lisible
// directement : la porte rend ce que CE cotransporteur a le droit de voir — ni le
// vendeur avant la confirmation, ni les autres candidats, ni une adresse.
import { supabase } from '@/lib/supabase';
import type { Candidature } from '@/types/candidature';
import { messageDeRefus, versCandidature } from '@/utils/candidatures';

type ErreurBase = { message: string; hint?: string | null } | null;

/** Le refus du serveur, traduit par son indice — voir `messageDeRefus`. */
function leverSi(error: ErreurBase): void {
  if (error) throw new Error(messageDeRefus(error.hint, error.message));
}

/**
 * Mes propositions ouvertes et mes candidatures en cours — et, un jour encore
 * après la collecte, mes co-livraisons confirmées par cette voie.
 */
export async function chargerMesPropositions(): Promise<Candidature[]> {
  const { data, error } = await supabase.rpc('colivraison_mes_propositions');
  leverSi(error);
  return ((data ?? []) as unknown[]).map(versCandidature);
}

/**
 * Accepter une proposition, sur UN de ses passages : c'est candidater.
 *
 * ⚠️ `collecteLe` REPART TELLE QUE LE SERVEUR L'A RENDUE. C'est elle qui désigne
 * le passage ; la reformater (fuseau, secondes) le rendrait introuvable.
 *
 * 🔴 LE SERVEUR REFUSE PLUS DE CAS QUE L'ÉCRAN N'EN PRÉVOIT : délai de vingt
 * minutes passé, passage devenu trop proche ou complet, autre candidature déjà
 * en attente de décision. L'appelant MONTRE le message.
 */
export async function accepterProposition(
  candidatureId: string,
  routeId: string,
  collecteLe: string,
): Promise<void> {
  const { error } = await supabase.rpc('colivraison_accepter', {
    p_candidature: candidatureId,
    p_route: routeId,
    p_collecte: collecteLe,
  });
  leverSi(error);
}

/** Refuser une proposition. Rien n'est perdu pour l'acheteur : d'autres l'ont reçue. */
export async function refuserProposition(candidatureId: string, motif?: string): Promise<void> {
  const { error } = await supabase.rpc('colivraison_refuser', {
    p_candidature: candidatureId,
    p_motif: motif?.trim() || null,
  });
  leverSi(error);
}

/**
 * Retirer sa candidature (§ 5.2.5) — tant que l'acheteur ne l'a pas choisie.
 * Une fois choisie, elle n'est plus à soi seul : le serveur refuse.
 */
export async function retirerCandidature(candidatureId: string): Promise<void> {
  const { error } = await supabase.rpc('colivraison_retirer', { p_candidature: candidatureId });
  leverSi(error);
}

/**
 * « Pas aujourd'hui » : plus aucune proposition pour ce jour (date de Paris).
 *
 * ⚠️ CE N'EST PAS UNE ANNULATION. Les co-livraisons déjà confirmées restent dues :
 * le serveur ne les touche pas, et l'écran doit le dire.
 */
export async function fermerLaJournee(jour: string): Promise<void> {
  const { error } = await supabase.rpc('cotransporteur_pas_aujourdhui', { p_jour: jour });
  leverSi(error);
}

/** Revenir sur « Pas aujourd'hui » pour ce jour. */
export async function rouvrirLaJournee(jour: string): Promise<void> {
  const { error } = await supabase.rpc('cotransporteur_reprendre_jour', { p_jour: jour });
  leverSi(error);
}

/** Les jours fermés à venir (aujourd'hui compris), en dates de Paris `AAAA-MM-JJ`. */
export async function chargerJoursFermes(): Promise<string[]> {
  const { data, error } = await supabase.rpc('cotransporteur_jours_off');
  leverSi(error);
  return Array.isArray(data) ? (data as unknown[]).map(String) : [];
}
