/**
 * Incidents Protocol — HandtoHand Logistic
 *
 * Single source of truth for the network's incident rules:
 * obligations, deadlines, responsibilities, sanctions and procedures.
 * Used by `src/app/incidents-protocol.tsx`.
 */

import type { IconName } from '@/components/ui/Icon';

export type ResponsibleParty = 'transporter' | 'relay' | 'shared';
export type EffectSeverity = 'info' | 'warning' | 'critical' | 'positive';

export interface IncidentEffect {
  severity: EffectSeverity;
  label: string;
}

export interface IncidentSubCase {
  title: string;
  description: string;
  effects: IncidentEffect[];
}

export interface IncidentScenario {
  id: string;
  number: number;
  iconName: IconName;
  title: string;
  situation: string[];
  consequence: string;
  responsible: ResponsibleParty;
  effects: IncidentEffect[];
  subCase?: IncidentSubCase;
}

export interface IncidentPrinciple {
  iconName: IconName;
  label: string;
  description: string;
}

export const RESPONSIBILITY_LABEL: Record<ResponsibleParty, string> = {
  transporter: 'Transporteur',
  relay: 'Relais',
  shared: 'Partagée',
};

export const INCIDENT_SCENARIOS: IncidentScenario[] = [
  {
    id: 'transporter_disappearance',
    number: 1,
    iconName: 'alert-circle',
    title: 'Échec première livraison + disparition transporteur',
    situation: [
      'Acheteur absent au point de livraison.',
      "Aucun relais choisi par le transporteur dans les 12 h.",
      'Aucun dépôt relais tenté.',
      'Disparition transporteur ou colis introuvable.',
    ],
    consequence:
      'Le transporteur est présumé responsable de la disparition du colis.',
    responsible: 'transporter',
    effects: [
      { severity: 'positive', label: 'Remboursement intégral de l’acheteur.' },
      { severity: 'critical', label: 'Valeur du produit imputée au transporteur.' },
      { severity: 'info', label: 'Aucun retour expéditeur requis.' },
      {
        severity: 'critical',
        label: 'Suspension immédiate du compte transporteur pour faute grave.',
      },
      { severity: 'warning', label: 'Blocage des paiements transporteur.' },
      { severity: 'info', label: 'Revue sécurité possible.' },
    ],
  },
  {
    id: 'relay_unavailable',
    number: 2,
    iconName: 'hub-relay',
    title: 'Échec livraison + relais indisponible',
    situation: [
      'Acheteur absent au point de livraison.',
      'Transporteur sélectionne un relais.',
      'Relais affiché comme disponible.',
      'Relais fermé, absent ou refuse sans motif légitime.',
    ],
    consequence: 'La faute est présumée imputable au relais.',
    responsible: 'relay',
    effects: [
      { severity: 'warning', label: 'Retour expéditeur obligatoire sous 48 h.' },
      { severity: 'info', label: 'Retour effectué par le transporteur.' },
      { severity: 'critical', label: 'Remboursement acheteur imputé au relais.' },
      {
        severity: 'positive',
        label: 'Compensation dépôt locker versée au transporteur.',
      },
      { severity: 'warning', label: 'Avertissement relais.' },
      { severity: 'critical', label: 'Suspension après 2 avertissements.' },
    ],
    subCase: {
      title: 'Si le transporteur échoue également le retour',
      description:
        'Lorsque le transporteur n’assure pas le retour expéditeur dans les 48 h, la responsabilité devient partagée entre le relais et le transporteur.',
      effects: [
        {
          severity: 'critical',
          label: 'Remboursement acheteur partagé entre relais et transporteur.',
        },
        { severity: 'critical', label: 'Suspension relais.' },
        { severity: 'critical', label: 'Suspension transporteur.' },
      ],
    },
  },
  {
    id: 'relay_no_return',
    number: 3,
    iconName: 'package',
    title: 'Dépôt relais réussi + non-retour après garde',
    situation: [
      'Dépôt relais correctement effectué.',
      'Garde de 5 jours terminée.',
      'Retour expéditeur généré.',
      'Le relais n’effectue pas le retour sous 48 h.',
    ],
    consequence: 'Le relais devient responsable du non-retour.',
    responsible: 'relay',
    effects: [
      { severity: 'positive', label: 'Vendeur payé.' },
      { severity: 'info', label: 'Mission clôturée.' },
      { severity: 'warning', label: 'Avertissement relais.' },
      {
        severity: 'critical',
        label: 'Pénalité relais : 2,50 € minimum pour non-retour.',
      },
      { severity: 'warning', label: 'Impact sur le score qualité du relais.' },
    ],
  },
];

export const INCIDENT_PRINCIPLES: IncidentPrinciple[] = [
  {
    iconName: 'qr-scan',
    label: 'Double scan obligatoire',
    description:
      'Chaque transfert de colis est validé par un scan à l’émission et à la réception. Aucun maillon sans preuve.',
  },
  {
    iconName: 'time',
    label: 'Délais courts',
    description:
      'Fenêtres de 12 h, 48 h et 5 jours pour garder un réseau fluide et limiter les missions bloquées.',
  },
  {
    iconName: 'trending-up',
    label: 'Sanctions progressives',
    description:
      'Avertissement, suspension temporaire, puis suspension définitive. La gravité de l’incident dicte le rythme.',
  },
  {
    iconName: 'rocket',
    label: 'Fluidité logistique',
    description:
      'Toute règle vise à remettre les colis en mouvement rapidement et à éviter les colis dormants.',
  },
  {
    iconName: 'shield',
    label: 'Responsabilité claire',
    description:
      'Chaque incident désigne un responsable unique (ou partagé) — pas d’ambiguïté sur l’imputation.',
  },
  {
    iconName: 'flag',
    label: 'Limitation des missions bloquées',
    description:
      'Les délais et les sanctions empêchent un colis de rester sans suite. Le réseau préfère un retour rapide à une attente longue.',
  },
  {
    iconName: 'happy',
    label: 'Protection acheteur',
    description:
      'L’acheteur est toujours remboursé. Le coût est ensuite imputé au responsable identifié, jamais à l’acheteur.',
  },
  {
    iconName: 'document',
    label: 'Traçabilité opérationnelle',
    description:
      'Chaque action — scan, dépôt, retour, suspension — laisse une trace consultable et auditable.',
  },
];
