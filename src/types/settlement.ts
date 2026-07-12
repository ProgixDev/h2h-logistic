export type SettlementParty = 'buyer' | 'seller' | 'transporter' | 'platform';

export type SettlementKind = 'refund' | 'pay' | 'fee' | 'kept' | 'unpaid';

export interface SettlementLine {
  party: SettlementParty;
  label: string;
  /** Fixed amount in € when known (4, 3, 1, 2); omitted when qualitative. */
  amountEur?: number;
  kind: SettlementKind;
}

/** Computed money outcome for an incident (« règlement »). */
export interface Settlement {
  title: string;
  lines: SettlementLine[];
  note?: string;
}

export const SETTLEMENT_PARTY_LABELS: Record<SettlementParty, string> = {
  buyer: 'Acheteur',
  seller: 'Vendeur',
  transporter: 'Cotransporteur',
  platform: 'HandtoHand',
};
