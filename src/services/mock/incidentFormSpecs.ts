import type { IncidentFormType, DeclarantRole } from '@/types/incident';

export interface SpecField {
  id: string;
  label: string;
  type: 'radio' | 'text' | 'textarea' | 'photo';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface IncidentFormSpec {
  type: IncidentFormType;
  title: string;
  /** Default declarant role (auto-fill); overridden by a role field if present. */
  role: DeclarantRole;
  /** Which hub feeds the auto-fill (remise vs collecte). */
  hub: 'delivery' | 'pickup';
  message: string;
  /** Referenced delay rule (Partie 2) — deadlines are centralized, never inlined. */
  delayRuleId?: string;
  /** For contestation forms: the prior declaration whose 24h window gates this one. */
  contestsType?: IncidentFormType;
  /** Field id whose value maps to record.reason (the « motif »). */
  reasonFieldId?: string;
  /** Field id for the primary « continuer / clôturer » choice. */
  primaryChoiceFieldId?: string;
  /** Value of the primary choice that means « continue waiting » (no submission). */
  waitValue?: string;
  /** Field id whose answer sets the declarant role (F6). */
  roleFieldId?: string;
  fields: SpecField[];
  preValidation?: string;
  /** D7 — annulations: text depends on the >1h / <1h délai (via canCancelFree). */
  preValidationVariants?: { moreThan1h: string; lessThan1h: string };
  /** D8 — voluntary-cancellation form: locked once the mission is engaged. */
  cancellation?: boolean;
  /** F11 — only available during the collect window; past tolerance → switch to F13. */
  collectWindowOnly?: boolean;
  /** D4 — contests a mission's support decision (gated on supportResolvedAt + 24h). */
  contestsDecision?: boolean;
  submitLabel: string;
  danger?: boolean;
}

const OUI_NON = ['Oui', 'Non'];
const OUI_NON_JND = ['Oui', 'Non', 'Je ne sais pas'];

export const INCIDENT_FORM_SPECS: IncidentFormSpec[] = [
  // ─── F2 — Acheteur absent au hub de remise (par cotransporteur) ───
  {
    type: 'buyer_absent',
    title: 'Acheteur absent au hub de remise',
    role: 'transporter',
    hub: 'delivery',
    message:
      "Vous êtes présent au hub de remise avec le colis, mais l'acheteur n'est pas présent après la tolérance autorisée. Vous pouvez prolonger l'attente ou clôturer la mission pour absence de l'acheteur.",
    delayRuleId: 'D1',
    primaryChoiceFieldId: 'action',
    waitValue: "Continuer d'attendre",
    fields: [
      { id: 'action', label: 'Que souhaitez-vous faire ?', type: 'radio', required: true, options: ["Continuer d'attendre", "Clôturer pour absence de l'acheteur"] },
      { id: 'since', label: 'Depuis quelle heure êtes-vous présent au hub ?', type: 'text', placeholder: 'ex. 17h05' },
      { id: 'buyer_visible', label: "L'acheteur était-il visible sur place ?", type: 'radio', options: OUI_NON_JND },
      { id: 'waited', label: 'Avez-vous attendu la fin de la tolérance de 10 minutes ?', type: 'radio', options: OUI_NON },
      { id: 'has_package', label: 'Le colis est-il toujours en votre possession ?', type: 'radio', options: OUI_NON },
    ],
    preValidation:
      "En clôturant la mission pour absence de l'acheteur, vous confirmez être présent au hub de remise avec le colis après la tolérance autorisée. Le vendeur et le cotransporteur pourront être payés selon le protocole H2H Logistic. L'acheteur pourra ensuite contester via un formulaire de réclamation.",
    submitLabel: "Clôturer pour absence de l'acheteur",
    danger: true,
  },

  // ─── F3 — Contester une absence acheteur (par acheteur, D1) ───
  {
    type: 'contest_buyer_absent',
    title: 'Contester une absence acheteur',
    role: 'buyer',
    hub: 'delivery',
    message:
      "Une absence acheteur a été déclarée par le cotransporteur au hub de remise. Vous pouvez contester cette déclaration si vous estimez avoir été présent, si vous étiez dans la tolérance autorisée ou si un élément doit être vérifié par le support HandtoHand.",
    delayRuleId: 'D1',
    contestsType: 'buyer_absent',
    reasonFieldId: 'motif',
    fields: [
      { id: 'motif', label: 'Motif de réclamation', type: 'radio', required: true, options: ["J'étais présent au hub", "J'étais en retard mais dans la tolérance", "Le cotransporteur n'était pas visible", "Le point de rendez-vous n'était pas clair", "Le colis n'a pas été présenté", "Problème technique dans l'application", 'Autre motif'] },
      { id: 'arrival', label: 'À quelle heure êtes-vous arrivé au hub ?', type: 'text' },
      { id: 'stayed', label: 'Combien de temps êtes-vous resté sur place ?', type: 'text' },
      { id: 'tried_validate', label: 'Avez-vous tenté de valider votre présence ?', type: 'radio', options: OUI_NON },
      { id: 'describe', label: "Décrivez ce qu'il s'est passé", type: 'textarea' },
    ],
    preValidation:
      "En envoyant cette contestation, vous demandez l'intervention du support HandtoHand.",
    submitLabel: 'Envoyer ma contestation',
  },

  // ─── F4 — Cotransporteur absent au hub de remise (par acheteur) ───
  {
    type: 'transporter_absent',
    title: 'Cotransporteur absent au hub de remise',
    role: 'buyer',
    hub: 'delivery',
    message:
      "Vous êtes présent au hub de remise, mais le cotransporteur ne s'est pas présenté après la tolérance autorisée. Vous pouvez prolonger l'attente ou clôturer la mission pour absence du cotransporteur.",
    delayRuleId: 'D2',
    primaryChoiceFieldId: 'action',
    waitValue: "Continuer d'attendre",
    fields: [
      { id: 'action', label: 'Que souhaitez-vous faire ?', type: 'radio', required: true, options: ["Continuer d'attendre", 'Clôturer pour absence du cotransporteur'] },
      { id: 'since', label: 'Depuis quelle heure êtes-vous présent au hub ?', type: 'text' },
      { id: 'waited', label: 'Avez-vous attendu la fin de la tolérance de 10 minutes ?', type: 'radio', options: OUI_NON },
      { id: 'transporter_visible', label: 'Le cotransporteur était-il visible sur place ?', type: 'radio', options: OUI_NON_JND },
      { id: 'received', label: 'Avez-vous reçu le colis ?', type: 'radio', options: OUI_NON },
    ],
    preValidation:
      "En clôturant la mission pour absence du cotransporteur, vous confirmez être présent au hub de remise après la tolérance autorisée et ne pas avoir reçu le colis. Le vendeur pourra être payé. Vous serez remboursé de la valeur du produit, de votre participation aux frais de co-livraison, des frais de service et des frais de mise en relation payés. Ces montants seront imputés au cotransporteur absent fautif. Les frais dus à HandtoHand restent acquis à la plateforme.",
    submitLabel: 'Clôturer pour absence du cotransporteur',
    danger: true,
  },

  // ─── F5 — Contester une absence cotransporteur (par cotransporteur, D2) ───
  {
    type: 'contest_transporter_absent',
    title: 'Contester une absence cotransporteur',
    role: 'transporter',
    hub: 'delivery',
    message:
      "Une absence cotransporteur a été déclarée par l'acheteur au hub de remise. Vous pouvez contester cette déclaration si vous estimez avoir été présent, si vous étiez dans la tolérance autorisée ou si un élément doit être vérifié par le support HandtoHand.",
    delayRuleId: 'D2',
    contestsType: 'transporter_absent',
    reasonFieldId: 'motif',
    fields: [
      { id: 'motif', label: 'Motif de réclamation', type: 'radio', required: true, options: ["J'étais présent au hub", "J'étais en retard mais dans la tolérance", "L'acheteur n'était pas visible", 'Problème de géolocalisation', "Problème technique dans l'application", 'Hub difficile à identifier', 'Autre motif'] },
      { id: 'arrival', label: 'À quelle heure êtes-vous arrivé au hub ?', type: 'text' },
      { id: 'stayed', label: 'Combien de temps êtes-vous resté sur place ?', type: 'text' },
      { id: 'had_package', label: 'Aviez-vous le colis avec vous ?', type: 'radio', options: OUI_NON },
      { id: 'tried_validate', label: 'Avez-vous tenté de valider votre présence ?', type: 'radio', options: OUI_NON },
      { id: 'describe', label: "Décrivez ce qu'il s'est passé", type: 'textarea' },
    ],
    preValidation:
      "En envoyant cette contestation, vous demandez l'intervention du support HandtoHand.",
    submitLabel: 'Envoyer ma contestation',
  },

  // ─── F6 — Absence ou blocage au hub de remise (acheteur ou cotransporteur, D5) ───
  {
    type: 'hub_blocked',
    title: 'Absence ou blocage au hub de remise',
    role: 'transporter',
    hub: 'delivery',
    message:
      "Ce formulaire s'ouvre lorsqu'aucune remise claire du colis n'a été finalisée dans l'application. Il peut être déclenché lorsque l'acheteur et le cotransporteur ont indiqué être présents au hub sans finaliser la remise, ou lorsqu'aucune des deux parties n'a validé sa présence à la fin du créneau et de la tolérance. Le dossier peut ensuite être transmis au support HandtoHand pour analyse.",
    delayRuleId: 'D5',
    reasonFieldId: 'motif',
    roleFieldId: 'role',
    fields: [
      { id: 'motif', label: 'Motif', type: 'radio', required: true, options: ["J'étais présent au hub", "L'autre partie était absente", "Impossible de trouver l'autre partie", 'Problème de géolocalisation', 'Problème technique', 'Hub difficile à identifier', 'Autre motif'] },
      { id: 'role', label: 'Votre rôle', type: 'radio', required: true, options: ['Acheteur', 'Cotransporteur'] },
      { id: 'arrival', label: "Heure d'arrivée au hub", type: 'text' },
      { id: 'departure', label: 'Heure de départ du hub', type: 'text' },
      { id: 'saw_other', label: "Avez-vous vu l'autre partie ?", type: 'radio', options: OUI_NON_JND },
      { id: 'package_present', label: 'Le colis était-il présent ?', type: 'radio', options: OUI_NON_JND },
      { id: 'describe', label: 'Décrivez la situation', type: 'textarea' },
    ],
    submitLabel: 'Transmettre au support HandtoHand',
  },

  // ─── F7 — Vendeur absent au rendez-vous (par cotransporteur) ───
  {
    type: 'seller_absent',
    title: 'Vendeur absent au rendez-vous',
    role: 'transporter',
    hub: 'pickup',
    message:
      "Vous êtes présent au rendez-vous de collecte, mais le vendeur n'est pas présent après la tolérance autorisée.",
    delayRuleId: 'D3',
    fields: [
      { id: 'arrival', label: "Heure d'arrivée au point de rendez-vous", type: 'text', placeholder: 'ex. 09h05' },
      { id: 'waited', label: 'Avez-vous attendu la fin de la tolérance de 10 minutes ?', type: 'radio', options: OUI_NON },
      { id: 'seller_visible', label: 'Le vendeur était-il visible sur place ?', type: 'radio', options: OUI_NON_JND },
      { id: 'package_given', label: 'Le colis vous a-t-il été remis ?', type: 'radio', options: OUI_NON },
    ],
    preValidation:
      "En déclarant l'absence du vendeur, vous confirmez être présent au rendez-vous de collecte après la tolérance autorisée et ne pas avoir reçu le colis. L'acheteur pourra être remboursé intégralement. Un frais d'annulation de 4 € pourra être imputé au vendeur : 3 € pour le cotransporteur et 1 € pour HandtoHand. Le vendeur pourra contester via un formulaire de réclamation.",
    submitLabel: 'Déclarer le vendeur absent',
    danger: true,
  },

  // ─── F8 — Contester une absence vendeur (par vendeur, D3) ───
  {
    type: 'contest_seller_absent',
    title: 'Contester une absence vendeur',
    role: 'seller',
    hub: 'pickup',
    message:
      "Une absence vendeur a été déclarée par le cotransporteur au rendez-vous de collecte. Vous pouvez contester cette déclaration si vous estimez avoir été présent, si vous étiez dans la tolérance autorisée ou si un élément doit être vérifié par le support HandtoHand.",
    delayRuleId: 'D3',
    contestsType: 'seller_absent',
    reasonFieldId: 'motif',
    fields: [
      { id: 'motif', label: 'Motif de réclamation', type: 'radio', required: true, options: ["J'étais présent au rendez-vous", "J'étais en retard mais dans la tolérance", "Le cotransporteur n'était pas visible", "Le point de rendez-vous n'était pas clair", "Problème technique dans l'application", 'Autre motif'] },
      { id: 'arrival', label: 'À quelle heure êtes-vous arrivé ?', type: 'text' },
      { id: 'stayed', label: 'Combien de temps êtes-vous resté sur place ?', type: 'text' },
      { id: 'package_ready', label: 'Le colis était-il prêt ?', type: 'radio', options: OUI_NON },
      { id: 'tried_validate', label: 'Avez-vous tenté de valider votre présence ?', type: 'radio', options: OUI_NON },
      { id: 'describe', label: "Décrivez ce qu'il s'est passé", type: 'textarea' },
    ],
    preValidation:
      "En envoyant cette contestation, vous demandez l'intervention du support HandtoHand.",
    submitLabel: 'Envoyer ma contestation',
  },

  // ─── F13 — Absence au rendez-vous de collecte (vendeur ou cotransporteur, D6) ───
  {
    type: 'collect_absent',
    title: 'Absence ou blocage au rendez-vous de collecte',
    role: 'transporter',
    hub: 'pickup',
    message:
      "Ce formulaire s'ouvre lorsqu'aucune finalisation claire de la prise en charge ou de la remise n'a été enregistrée dans l'application. Il peut être déclenché lorsque les deux parties ont indiqué être présentes au hub sans finaliser l'étape prévue, ou lorsqu'aucune des parties n'a validé sa présence à la fin du créneau et de la tolérance. Les parties concernées peuvent transmettre les informations utiles au support HandtoHand afin que la situation soit analysée.",
    delayRuleId: 'D6',
    reasonFieldId: 'motif',
    roleFieldId: 'role',
    fields: [
      { id: 'motif', label: 'Motif', type: 'radio', required: true, options: ["J'étais présent au rendez-vous", "L'autre partie était absente", "Impossible de trouver l'autre partie", 'Problème de géolocalisation', 'Problème technique', 'Point de rendez-vous difficile à identifier', 'Autre motif'] },
      { id: 'role', label: 'Votre rôle', type: 'radio', required: true, options: ['Vendeur', 'Cotransporteur'] },
      { id: 'arrival', label: "Heure d'arrivée au rendez-vous", type: 'text' },
      { id: 'departure', label: 'Heure de départ du rendez-vous', type: 'text' },
      { id: 'saw_other', label: "Avez-vous vu l'autre partie ?", type: 'radio', options: OUI_NON_JND },
      { id: 'package_present', label: 'Le colis était-il présent ?', type: 'radio', options: OUI_NON_JND },
      { id: 'describe', label: 'Décrivez la situation', type: 'textarea' },
    ],
    preValidation:
      "Après analyse, le vendeur et/ou le cotransporteur peuvent se voir imputer un frais d'annulation de 2 € chacun selon la responsabilité constatée. La décision pourra être contestée via un formulaire de réclamation.",
    submitLabel: 'Transmettre au support HandtoHand',
  },

  // ─── F11 — Refus du colis par le cotransporteur ───
  {
    type: 'refuse_package',
    title: 'Refus du colis lors de la collecte',
    role: 'transporter',
    hub: 'pickup',
    collectWindowOnly: true,
    message:
      "Ce formulaire peut uniquement être utilisé pendant le créneau horaire prévu de collecte. Le cotransporteur peut refuser la co-livraison si le colis n'est pas conforme à la demande ou si son emballage ne permet pas un transport dans de bonnes conditions. Passé le créneau et la durée de tolérance, si aucune prise en charge n'a été finalisée, ce formulaire n'est plus disponible et la procédure d'absence ou de blocage est automatiquement lancée.",
    reasonFieldId: 'motif',
    fields: [
      { id: 'motif', label: 'Motif du refus', type: 'radio', required: true, options: ['Colis différent de la description', 'Dimensions incompatibles', 'Volume incompatible', 'Poids incompatible', 'Emballage insuffisant', 'Colis dangereux ou présentant un risque', 'Colis endommagé', 'Autre motif'] },
      { id: 'presented', label: 'Le colis vous a-t-il été présenté ?', type: 'radio', options: OUI_NON },
      { id: 'matches', label: "Le colis correspond-il à l'annonce ?", type: 'radio', options: OUI_NON },
      { id: 'safe_transport', label: "L'emballage permet-il un transport sécurisé ?", type: 'radio', options: OUI_NON },
      { id: 'describe', label: 'Expliquez le problème constaté', type: 'textarea' },
      { id: 'photo_colis', label: 'Ajoutez une photo du colis', type: 'photo' },
      { id: 'photo_emballage', label: "Ajoutez une photo de l'emballage", type: 'photo' },
    ],
    preValidation:
      "En annulant la co-livraison pour colis non conforme, vous confirmez avoir constaté un problème lors de la collecte. Le dossier pourra être analysé par HandtoHand en cas de contestation.",
    submitLabel: 'Annuler la co-livraison',
    danger: true,
  },

  // ─── F9 — Annulation vendeur avant le créneau (sans frais, D7) ───
  {
    type: 'cancel_seller',
    title: 'Annuler la co-livraison',
    role: 'seller',
    hub: 'pickup',
    message:
      "Vous pouvez annuler la co-livraison avant le créneau horaire prévu. Cette annulation est sans frais pour le vendeur.",
    delayRuleId: 'D7',
    cancellation: true,
    reasonFieldId: 'motif',
    fields: [
      { id: 'motif', label: "Motif d'annulation", type: 'radio', required: true, options: ['Colis finalement indisponible', 'Vente annulée', "Erreur dans l'annonce", 'Problème personnel', 'Mauvais format ou mauvais poids indiqué', 'Autre motif'] },
      { id: 'confirm', label: 'Je confirme vouloir annuler la co-livraison', type: 'radio', required: true, options: ['Oui'] },
    ],
    preValidation:
      "Cette annulation met fin à la co-livraison prévue. Les parties concernées seront informées dans l'application.",
    submitLabel: "Confirmer l'annulation",
    danger: true,
  },

  // ─── F10 — Annulation acheteur (D7, 1h) ───
  {
    type: 'cancel_buyer',
    title: 'Annuler ma co-livraison',
    role: 'buyer',
    hub: 'pickup',
    message:
      "Vous pouvez annuler sans frais jusqu'à 1 heure avant le rendez-vous prévu entre le vendeur et le cotransporteur. Passé ce délai, les frais de service, les frais de protection et les frais de mise en relation restent acquis à HandtoHand.",
    delayRuleId: 'D7',
    cancellation: true,
    reasonFieldId: 'motif',
    fields: [
      { id: 'motif', label: "Motif d'annulation", type: 'radio', required: true, options: ["Je ne souhaite plus acheter l'article", 'Je ne suis plus disponible', 'Erreur de commande', 'Problème personnel', 'Autre motif'] },
      { id: 'confirm', label: 'Je confirme vouloir annuler', type: 'radio', required: true, options: ['Oui'] },
    ],
    preValidationVariants: {
      moreThan1h: "Votre annulation est effectuée avant le délai limite. Aucun frais d'annulation tardive ne s'applique selon le protocole H2H Logistic.",
      lessThan1h: "Votre annulation intervient moins d'une heure avant le rendez-vous vendeur / cotransporteur. Les frais de service, les frais de protection et les frais de mise en relation restent acquis à HandtoHand.",
    },
    submitLabel: "Confirmer l'annulation",
    danger: true,
  },

  // ─── F12 — Annulation cotransporteur (D7, 1h / 2€) ───
  {
    type: 'cancel_transporter',
    title: 'Annuler ma co-livraison',
    role: 'transporter',
    hub: 'pickup',
    message:
      "Vous pouvez annuler sans frais jusqu'à 1 heure avant le rendez-vous prévu. En cas d'annulation moins d'une heure avant le créneau, un frais d'annulation tardive de 2 € peut vous être imputé.",
    delayRuleId: 'D7',
    cancellation: true,
    reasonFieldId: 'motif',
    fields: [
      { id: 'motif', label: "Motif d'annulation", type: 'radio', required: true, options: ['Je ne peux plus effectuer le trajet', 'Retard important prévu', 'Problème de véhicule', 'Problème personnel', 'Erreur dans mon trajet', 'Autre motif'] },
      { id: 'confirm', label: 'Je confirme vouloir annuler', type: 'radio', required: true, options: ['Oui'] },
    ],
    preValidationVariants: {
      moreThan1h: "Votre annulation est effectuée dans le délai autorisé. Aucun frais d'annulation tardive ne s'applique.",
      lessThan1h: "Votre annulation intervient moins d'une heure avant le rendez-vous prévu. Un frais d'annulation tardive de 2 € peut vous être imputé selon le protocole H2H Logistic.",
    },
    submitLabel: "Confirmer l'annulation",
    danger: true,
  },

  // ─── F14 — Contester une décision HandtoHand (toute partie, D4) ───
  {
    type: 'contest_decision',
    title: 'Contester une décision HandtoHand',
    role: 'transporter',
    hub: 'delivery',
    message:
      "Vous pouvez contester une décision prise par le support HandtoHand si vous estimez qu'un élément n'a pas été pris en compte, qu'une erreur a été commise ou que la décision doit être réexaminée.",
    delayRuleId: 'D4',
    contestsDecision: true,
    reasonFieldId: 'motif',
    fields: [
      { id: 'motif', label: 'Motif de contestation', type: 'radio', required: true, options: ["J'étais présent au rendez-vous", "La responsabilité ne m'incombe pas", "Un élément de preuve n'a pas été pris en compte", 'La décision financière est contestée', "Problème technique dans l'application", 'Autre motif'] },
      { id: 'decision', label: 'Décision contestée', type: 'text' },
      { id: 'describe', label: 'Expliquez pourquoi vous contestez', type: 'textarea' },
      { id: 'proof', label: 'Ajoutez une preuve complémentaire', type: 'photo' },
      { id: 'screenshot', label: "Ajoutez une capture d'écran si possible", type: 'photo' },
    ],
    preValidation:
      "En envoyant cette contestation, vous demandez le réexamen d'une décision prise par le support HandtoHand.",
    submitLabel: 'Contester la décision',
  },
];

export function getIncidentFormSpec(type: string): IncidentFormSpec | undefined {
  return INCIDENT_FORM_SPECS.find((s) => s.type === type);
}

/** Map a French role answer (F6) to a DeclarantRole. */
export function roleFromAnswer(answer?: string): DeclarantRole | undefined {
  if (answer === 'Acheteur') return 'buyer';
  if (answer === 'Vendeur') return 'seller';
  if (answer === 'Cotransporteur') return 'transporter';
  return undefined;
}
