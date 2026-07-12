import type { Settlement } from '@/types/settlement';
import { DELAYS } from '@/constants/delaysRules';

/**
 * Computed money outcome per incident case (§ Principe financier).
 * All amounts come from the centralized DELAYS module. Returns null when a form
 * has no direct settlement (e.g. a contestation awaiting support).
 */
export function computeSettlement(type: string, ctx?: { late?: boolean }): Settlement | null {
  switch (type) {
    // F7 — vendeur absent : acheteur remboursé + 4 € (3 cotransporteur / 1 H2H)
    case 'seller_absent':
      return {
        title: 'Règlement — vendeur absent',
        lines: [
          { party: 'buyer', kind: 'refund', label: "Remboursement intégral de l'acheteur" },
          { party: 'seller', kind: 'fee', amountEur: DELAYS.sellerAbsentFeeEur, label: "Frais d'annulation imputé au vendeur" },
          { party: 'transporter', kind: 'pay', amountEur: DELAYS.sellerAbsentSplit.transporter, label: 'Part reversée au cotransporteur' },
          { party: 'platform', kind: 'kept', amountEur: DELAYS.sellerAbsentSplit.platform, label: 'Part conservée par HandtoHand' },
        ],
        note: "Le coût est imputé au vendeur responsable. Protection acheteur : l'acheteur est toujours remboursé.",
      };

    // F4 — cotransporteur absent au hub de remise
    case 'transporter_absent':
      return {
        title: 'Règlement — cotransporteur absent au hub',
        lines: [
          { party: 'seller', kind: 'pay', label: 'Vendeur payé' },
          { party: 'transporter', kind: 'unpaid', label: 'Cotransporteur non payé — montants imputés' },
          { party: 'buyer', kind: 'refund', label: 'Acheteur remboursé (valeur produit + participation co-livraison + frais de service + frais de mise en relation)' },
          { party: 'platform', kind: 'kept', label: 'Frais HandtoHand acquis' },
        ],
        note: 'Montants imputés au cotransporteur fautif. Protection acheteur : toujours remboursé.',
      };

    // F2 — acheteur absent : vendeur + cotransporteur payés
    case 'buyer_absent':
      return {
        title: 'Règlement — acheteur absent',
        lines: [
          { party: 'seller', kind: 'pay', label: 'Vendeur payé' },
          { party: 'transporter', kind: 'pay', label: 'Cotransporteur payé' },
          { party: 'buyer', kind: 'kept', label: 'Remboursement acheteur refusé, sous réserve de contestation' },
        ],
        note: "L'acheteur peut contester dans les délais (règle D1).",
      };

    // F13 / D6 — double absence à la collecte : 2 € chacun selon responsabilité
    case 'collect_absent':
      return {
        title: 'Règlement — double absence à la collecte',
        lines: [
          { party: 'transporter', kind: 'fee', amountEur: DELAYS.lateCancelFeeEur, label: 'Frais selon la responsabilité constatée' },
          { party: 'seller', kind: 'fee', amountEur: DELAYS.lateCancelFeeEur, label: 'Frais selon la responsabilité constatée' },
          { party: 'buyer', kind: 'refund', label: "Acheteur remboursé si la co-livraison n'aboutit pas" },
        ],
        note: 'Après analyse du support HandtoHand (règle D6).',
      };

    // F10 — annulation acheteur (D7)
    case 'cancel_buyer':
      if (!ctx?.late) {
        return { title: 'Annulation acheteur', lines: [{ party: 'buyer', kind: 'kept', label: 'Annulation sans frais' }] };
      }
      return {
        title: 'Annulation acheteur tardive',
        lines: [
          { party: 'platform', kind: 'kept', label: 'Frais de service, de protection et de mise en relation conservés par HandtoHand' },
        ],
        note: "Moins d'une heure avant le rendez-vous (règle D7).",
      };

    // F12 — annulation cotransporteur (D7, 2 €)
    case 'cancel_transporter':
      if (!ctx?.late) {
        return { title: 'Annulation cotransporteur', lines: [{ party: 'transporter', kind: 'kept', label: 'Annulation sans frais' }] };
      }
      return {
        title: 'Annulation cotransporteur tardive',
        lines: [
          { party: 'transporter', kind: 'fee', amountEur: DELAYS.lateCancelFeeEur, label: "Frais d'annulation tardive" },
        ],
        note: "Moins d'une heure avant le rendez-vous (règle D7).",
      };

    // F9 — annulation vendeur : toujours sans frais
    case 'cancel_seller':
      return {
        title: 'Annulation vendeur',
        lines: [{ party: 'seller', kind: 'kept', label: 'Annulation sans frais' }],
        note: 'Le vendeur peut annuler sans frais avant le créneau (règle D7).',
      };

    default:
      return null;
  }
}
