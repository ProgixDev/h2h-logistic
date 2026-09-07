// LES DEMANDES DE RENDEZ-VOUS HORS HUB — côté cotransporteur, qui décide.
//
// 🔴 CE QUE CETTE APPLICATION FAISAIT AVANT. `mission/group.tsx` proposait au
// cotransporteur d'ENVOYER une proposition hors hub, puis :
//
//     proposeOffHub(mission.id, { target, address, proposedTime: time });
//     toast('Proposition envoyée. En attente de réponse...');
//     setTimeout(() => toast('Proposition acceptée ! Nouveau point confirmé.'), 3500);
//
// Trois secondes et demie plus tard, l'écran annonçait une ACCEPTATION que
// personne n'avait donnée. Rien n'était parti, rien n'avait été lu, personne
// n'avait répondu — et le cotransporteur repartait avec une adresse qu'il
// croyait convenue.
//
// 🔴 ET LE SENS ÉTAIT INVERSÉ. Le guide (docs/hubs-fonctionnement.md §5) dit que
// la possibilité dépend « de l'ACCEPTATION PRÉALABLE DU COTRANSPORTEUR » et
// qu'une demande « n'est jamais automatiquement imposée AU COTRANSPORTEUR ».
// C'est donc le vendeur ou l'acheteur qui DEMANDE, et le cotransporteur qui
// TRANCHE — parce que c'est son trajet qu'on modifie. Le formulaire faisait
// l'inverse.
//
// ⚠️ REFUSER N'EST PAS « ANNULER ». La mission n'a jamais changé de lieu : le
// refus ferme la demande, et le rendez-vous reste au hub sélectionné. C'est le
// repli du §5, et il ne coûte aucune ligne de code — seulement de ne rien faire.
import { supabase } from '@/lib/supabase';

export type StatutHorsHub = 'pending' | 'accepted' | 'rejected' | 'expired';

export type DemandeHorsHub = {
  id: string;
  missionId: string;
  etape: 'recuperation' | 'remise';
  adresseProposee: string;
  motif: string | null;
  /** `null` = aucun frais proposé. ⚠️ NE JAMAIS AFFICHER « 0 € » : ce serait
   *  promettre la gratuité là où rien n'a été dit. */
  fraisCents: number | null;
  statut: StatutHorsHub;
  expireLe: string;
};

type Ligne = {
  id: string;
  mission_id: string;
  etape: string;
  adresse_proposee: string;
  motif: string | null;
  frais_cents: number | string | null;
  statut: string;
  expire_le: string;
};

const versDemande = (l: Ligne): DemandeHorsHub => ({
  id: l.id,
  missionId: l.mission_id,
  etape: l.etape as DemandeHorsHub['etape'],
  adresseProposee: l.adresse_proposee,
  motif: l.motif,
  fraisCents: l.frais_cents == null ? null : Number(l.frais_cents),
  statut: l.statut as StatutHorsHub,
  expireLe: l.expire_le,
});

const CHAMPS = 'id, mission_id, etape, adresse_proposee, motif, frais_cents, statut, expire_le';

/**
 * Les demandes hors hub d'une co-livraison.
 *
 * ⚠️ LA RLS NE REND QUE CELLES QUI ME CONCERNENT. Un cotransporteur qui n'est
 * pas le décideur obtient une liste vide, pas une erreur.
 */
export async function chargerDemandesHorsHub(missionId: string): Promise<DemandeHorsHub[]> {
  const { data, error } = await supabase
    .from('demandes_hors_hub')
    .select(CHAMPS)
    .eq('mission_id', missionId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Ligne[]).map(versDemande);
}

/**
 * Accepter, ou refuser et rester au hub.
 *
 * 🔴 LE SERVEUR REFUSE TOUT LE RESTE : quelqu'un qui n'est pas le décideur, une
 * demande déjà tranchée, une demande expirée. Et `missions.is_off_hub` ne
 * bascule QUE dans cette fonction — une garde de migration échoue si une autre
 * l'écrit.
 */
export async function repondreHorsHub(
  demandeId: string,
  accepter: boolean,
  options?: { fraisCents?: number | null; motif?: string },
): Promise<void> {
  const { error } = await supabase.rpc('repondre_hors_hub', {
    p_demande_id: demandeId,
    p_accepter: accepter,
    p_frais_cents: accepter ? (options?.fraisCents ?? null) : null,
    p_motif: accepter ? null : options?.motif?.trim() || null,
  });
  if (error) throw new Error(error.message);
}
