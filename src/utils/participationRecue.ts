// CE QUI COMPTE COMME UNE PARTICIPATION REÇUE — la règle, isolée pour être testable.
//
// 🔴 TOUT CRÉDIT N'EST PAS UNE PARTICIPATION (hand-to-hand 20261008006000). Le journal du cotransporteur
// porte au crédit ses participations (une co-livraison remise), les compensations d'une annulation tardive
// (1,50 € quand l'acheteur annule, 3 € quand c'est le vendeur — sans déplacement), et, depuis que les
// virements retiennent les frais d'annulation, la part d'un virement qui a soldé ces frais. Celle-là n'est pas
// de l'argent reçu : la compter gonflerait « Ce mois-ci » du montant même des frais.
//
// ⚠️ UNE COMPENSATION EST REÇUE, MAIS N'EST PAS UNE CO-LIVRAISON : le nombre de co-livraisons n'en compte pas.
import type { LigneParticipation } from '@/services/participations';

type Ligne = Pick<LigneParticipation, 'sens' | 'evenement'>;

/** De l'argent reçu : une participation, ou une compensation. */
export function estRecue(l: Ligne): boolean {
  return l.sens === 'C' && (l.evenement === 'courier_participation' || l.evenement === 'cancellation_compensation');
}

/** Une co-livraison faite : une participation seulement. */
export function estColivraison(l: Ligne): boolean {
  return l.sens === 'C' && l.evenement === 'courier_participation';
}
