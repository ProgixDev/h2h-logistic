// LE REFUS DU COLIS D'UNE CO-LIVRAISON (hand-to-hand 20261008009000, § 5.6.3 des CGU H2H Logistic).
//
// Le cotransporteur déclare le refus par le formulaire 11 (`declarer_incident`, services/incidents.ts) ; il lit ensuite
// ici où il en est : le délai du vendeur, sa contestation, la décision de l'équipe, l'issue, et ce qu'elle lui rapporte
// ou lui coûte. Le serveur dit tout ; l'écran ne calcule rien.
import { supabase } from '@/lib/supabase';
import { versRefusColis, type RefusColis } from '@/utils/refusColis';

/** Le refus du colis de cette co-livraison, vu du cotransporteur ; `null` sans refus. */
export async function lireRefusColis(orderId: string): Promise<RefusColis | null> {
  const { data, error } = await supabase.rpc('refus_colis_de_ma_commande', { p_commande: orderId });
  if (error) throw new Error(error.message);
  return versRefusColis(data);
}
