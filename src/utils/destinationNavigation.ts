// VERS QUEL HUB GUIDER LE COTRANSPORTEUR.
//
// 🔴 L'ÉCRAN DE NAVIGATION GUIDAIT TOUT LE MONDE VERS LA GARE DE CANNES (vu le
// 10/09/2026). Il cherchait les coordonnées du hub dans une table écrite à la
// main — six identifiants de démonstration (`'hub-nice-gare'`…) — et retombait
// sur Cannes quand il ne trouvait pas. Or une vraie mission porte l'UUID du hub
// en base : il ne trouvait JAMAIS. Un trajet Marseille → Nice était guidé vers
// Cannes, à la récupération comme à la remise.
//
// 🔴 ET L'ÉTAPE ÉTAIT FAUSSE AVANT LA PRISE EN CHARGE. Seuls `pickup_pending` et
// `group_created` menaient au hub de récupération : une mission `accepted` ou
// `seller_pending` — colis encore chez le vendeur — était guidée vers le hub de
// REMISE, à l'autre bout du trajet.
import type { MissionStatus } from '@/types/mission';

export type EtapeNavigation = 'pickup' | 'delivery';

/** Le colis est encore chez le vendeur : on va le chercher. */
const AVANT_PRISE_EN_CHARGE: readonly MissionStatus[] = [
  'proposal', 'accepted', 'seller_pending', 'group_created', 'pickup_pending',
];

/** Le colis est à bord : on va le remettre. */
const APRES_PRISE_EN_CHARGE: readonly MissionStatus[] = [
  'picked_up', 'in_transit', 'deposited', 'delivery_pending',
];

/**
 * L'étape vers laquelle guider, ou `null` quand il n'y a plus rien à rejoindre
 * (co-livraison remise, terminée, annulée, expirée).
 *
 * ⚠️ `demandee` VIENT DE L'ÉCRAN DE SUIVI (`?dest=`), qui sait quel rappel il
 * affiche. On l'honore — mais seulement si elle a encore un sens : guider vers
 * la récupération d'un colis déjà à bord serait le même défaut à l'envers.
 */
export function etapeANaviguer(
  statut: MissionStatus,
  demandee?: string | null,
): EtapeNavigation | null {
  const avant = AVANT_PRISE_EN_CHARGE.includes(statut);
  const apres = APRES_PRISE_EN_CHARGE.includes(statut);
  if (!avant && !apres) return null;
  if (demandee === 'delivery' && apres) return 'delivery';
  if (demandee === 'pickup' && avant) return 'pickup';
  return avant ? 'pickup' : 'delivery';
}
