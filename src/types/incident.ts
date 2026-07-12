export type IncidentFormType =
  | 'common'
  | 'buyer_absent'
  | 'contest_buyer_absent'
  | 'transporter_absent'
  | 'contest_transporter_absent'
  | 'hub_blocked'
  | 'seller_absent'
  | 'contest_seller_absent'
  | 'cancel_seller'
  | 'cancel_buyer'
  | 'refuse_package'
  | 'cancel_transporter'
  | 'collect_absent'
  | 'contest_decision';

export type DeclarantRole = 'buyer' | 'seller' | 'transporter';

export type MissionFormStatus = 'pending' | 'closed' | 'blocked' | 'support_review';

/** Auto-filled block shared by every incident form (« Formulaire commun »). */
export interface CommonFormData {
  transactionId: string;
  missionId: string;
  declarantRole: DeclarantRole;
  hubName: string;
  /** ISO — date + heure du rendez-vous. */
  rendezvousAt: string;
  /** ISO — heure de déclaration. */
  declaredAt: string;
  missionStatus: MissionFormStatus;
  /** « Je confirme l'exactitude de ma déclaration. » — mandatory. */
  accuracyConfirmed: boolean;
  // Optional proofs
  photoLieu?: string;
  captureStatut?: string;
  photoColis?: string;
  comment?: string;
  geo?: { lat: number; lng: number };
}

export interface IncidentRecord extends CommonFormData {
  id: string;
  type: IncidentFormType;
  reason?: string;
  answers?: Record<string, string | boolean>;
  proofUris?: string[];
  createdAt: string;
  /** ISO — when set, the 24h contestation window closes (see DELAYS / Partie 2). */
  contestationDeadline?: string;
  outcome?: string;
}

export const DECLARANT_ROLE_LABELS: Record<DeclarantRole, string> = {
  buyer: 'Acheteur',
  seller: 'Vendeur',
  transporter: 'Cotransporteur',
};

export const MISSION_FORM_STATUS_LABELS: Record<MissionFormStatus, string> = {
  pending: 'En attente',
  closed: 'Clôturée',
  blocked: 'Bloquée',
  support_review: 'En analyse support',
};
