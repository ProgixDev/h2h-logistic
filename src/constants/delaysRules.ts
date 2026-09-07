import dayjs from 'dayjs';
import type { DeclarantRole } from '@/types/incident';

/**
 * Partie 2 — « Règles de délais » : les échéances du protocole d'incidents.
 * Les formulaires les RÉFÉRENCENT (D0–D8), aucun ne réécrit un délai.
 *
 * 🔴 CE N'EST PAS LA SOURCE, C'EST UNE COPIE — ET ELLE EST TENUE. Ces valeurs
 * appartiennent à `ref.delay_protocol`, une ligne unique et VERSIONNÉE par
 * `effective_from`, que `app.tg_incident_admissibility` applique pour décider
 * si une déclaration d'absence est recevable. Le serveur décide ; ce fichier
 * ne fait que dire la même chose à l'écran, et
 * `src/backend/protocoleAppartientALaBase.test.ts` échoue dès que les deux
 * divergent. Sans cette garde, un tarif changé en base laisserait l'écran
 * annoncer 2 € pendant que le serveur en facture trois.
 *
 * 🔴 `toleranceMinutes` A QUITTÉ CETTE LISTE LE 07/09/2026. Elle y valait 10
 * pour tout le monde, alors que `missions.tolerance_minutes` la porte PAR
 * MISSION. Ce qui la lisait — la fenêtre de refus du colis (F11) — lit
 * désormais la mission. La tolérance globale de `ref.delay_protocol` existe
 * bien, mais elle sert au SERVEUR pour la recevabilité, pas à l'écran pour
 * afficher un créneau.
 */
/**
 * D0 — la tolérance GÉNÉRALE du protocole, celle de
 * `ref.delay_protocol.tolerance_minutes`.
 *
 * 🔴 ELLE N'EST PAS CELLE D'UNE MISSION, ET LES CONFONDRE EST LE DÉFAUT QU'ON
 * VIENT DE FERMER. Dès qu'une mission existe, la tolérance à afficher est
 * `missions.tolerance_minutes` — portée jusqu'aux écrans par
 * `mission.pickupHub.toleranceMinutes` / `deliveryHub`. Celle-ci ne vaut que
 * LÀ OÙ AUCUNE MISSION N'EXISTE ENCORE : « Trajet du jour » montre la fenêtre
 * autour du départ que le cotransporteur a déclaré, avant que quiconque ait
 * accepté quoi que ce soit.
 *
 * ⚠️ ELLE EST INTERDITE DANS LE CODE DE MISSION, et un test le vérifie
 * (`protocoleAppartientALaBase.test.ts`) : `src/app/mission/`,
 * `src/components/mission/` et `src/components/logistics/` ont toujours une
 * mission sous la main, donc n'ont aucune raison de lire une valeur globale.
 *
 * ⚠️ ET SA VALEUR EST TENUE PAR LA BASE : le même test échoue si elle s'écarte
 * de `ref.delay_protocol`.
 */
export const TOLERANCE_PROTOCOLE_MINUTES = 10;

export const DELAYS = {
  contestationHours: 24, // D1, D2, D3, D4
  freeCancelHoursBefore: 1, // D7
  doubleAbsenceClaimMinutes: 10, // D5, D6
  lateCancelFeeEur: 2, // D7 cotransporteur, D6 chacun
  sellerAbsentFeeEur: 4, // F7 (3 cotransporteur + 1 H2H)
  sellerAbsentSplit: { transporter: 3, platform: 1 },
} as const;

export interface DelayRule {
  id: string;
  title: string;
  text: string;
}

export const DELAY_RULES: DelayRule[] = [
  {
    id: 'D0',
    title: 'Tolérance de présence',
    text: "Une tolérance de 10 minutes avant et 10 minutes après l'heure du rendez-vous s'applique à chaque partie (règle −10 / +10 min). Passé cette tolérance, une absence peut être déclarée.",
  },
  {
    id: 'D1',
    title: "Contestation d'une absence acheteur",
    text: "Après la déclaration « Acheteur absent au hub de remise » (F2), l'acheteur dispose de 24 heures à compter de la notification pour contester (F3). Passé ce délai, la mission est clôturée et aucune réclamation n'est possible.",
  },
  {
    id: 'D2',
    title: "Contestation d'une absence cotransporteur",
    text: "Après la déclaration « Cotransporteur absent au hub de remise » (F4), le cotransporteur dispose de 24 heures à compter de la notification pour contester (F5). Passé ce délai, aucune réclamation n'est possible.",
  },
  {
    id: 'D3',
    title: "Contestation d'une absence vendeur",
    text: "Après la déclaration « Vendeur absent au rendez-vous » (F7), le vendeur dispose de 24 heures à compter de la notification pour contester (F8). Passé ce délai, la mission est clôturée et aucune réclamation n'est possible.",
  },
  {
    id: 'D4',
    title: "Contestation d'une décision HandtoHand",
    text: "Toute décision du support HandtoHand peut être contestée (F14) dans un délai de 24 heures à compter de sa notification. Passé ce délai, la décision devient définitive dans le cadre du protocole H2H Logistic.",
  },
  {
    id: 'D5',
    title: 'Double absence au hub de remise',
    text: "Si aucune présence n'est validée au hub de remise après le chrono, l'acheteur ou le cotransporteur dispose de 10 minutes pour transmettre une réclamation (F6). À défaut, la mission est bloquée et transmise au support HandtoHand.",
  },
  {
    id: 'D6',
    title: 'Double absence au rendez-vous de collecte',
    text: "Si aucune présence n'est validée au rendez-vous de collecte, le vendeur ou le cotransporteur dispose de 10 minutes pour transmettre une réclamation (F13). La mission est clôturée, l'acheteur remboursé, puis, après analyse du support, un frais de 2 € peut être imputé à chacun selon la responsabilité constatée.",
  },
  {
    id: 'D7',
    title: 'Annulations',
    text: "Annulation sans frais jusqu'à 1 heure avant le rendez-vous. Passé ce délai : pour l'acheteur, les frais de service, de protection et de mise en relation restent acquis à HandtoHand ; pour le cotransporteur, un frais d'annulation tardive de 2 € s'applique. L'annulation du vendeur est toujours sans frais.",
  },
  {
    id: 'D8',
    title: 'Colis remis',
    text: "Une fois le colis remis et validé, la phase est engagée : plus aucune annulation, modification ou remboursement volontaire n'est possible. Seule une contestation encadrée reste ouverte selon les délais applicables.",
  },
];

export function getDelayRule(id: string): DelayRule | undefined {
  return DELAY_RULES.find((r) => r.id === id);
}

// ─── Partie 3 — Principes opérationnels ─────────────────────────────────────
export interface DelayPrinciple {
  id: string;
  title: string;
  text: string;
}

export const DELAY_PRINCIPLES: DelayPrinciple[] = [
  {
    id: 'preuve',
    title: 'Principe de preuve',
    text: "Les décisions se fondent sur les éléments disponibles dans l'application : présence, validations, scans, horaires, clôtures, formulaires et réclamations.",
  },
  {
    id: 'contestation',
    title: 'Principe de contestation',
    text: "Chaque situation dispose du bon formulaire et du bon délai. Une contestation transmise hors délai n'est plus recevable.",
  },
  {
    id: 'financier',
    title: 'Principe financier',
    text: "Les frais et remboursements sont calculés selon le protocole (D0–D8) et imputés à la partie responsable.",
  },
  {
    id: 'protection',
    title: 'Protection acheteur',
    text: "L'acheteur est toujours remboursé lorsque la co-livraison n'aboutit pas ; le coût est imputé à la partie responsable, jamais à l'acheteur.",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

// 🔴 `isWithinToleranceD0` ET `toleranceWindowD0` ONT ÉTÉ SUPPRIMÉES LE
// 07/09/2026. Zéro appelant — mesuré, pas supposé — et toutes deux passaient
// `DELAYS.toleranceMinutes` à `utils/tolerance`, c'est-à-dire la constante à 10
// qu'on vient de retirer. Elles étaient le chemin tout tracé pour réintroduire
// une tolérance globale dans un écran : ce que voit chaque partie vient de
// `missions.tolerance_minutes`, et les écrans qui l'affichent le passent déjà
// explicitement.

/** D1–D4 — ISO deadline 24h after the given notification time. */
export function contestationDeadline(fromISO: string): string {
  return dayjs(fromISO).add(DELAYS.contestationHours, 'hour').toISOString();
}

/** D1–D4 — is the 24h contestation window still open? */
export function isContestationOpen(fromISO: string): boolean {
  return dayjs().isBefore(contestationDeadline(fromISO));
}

/** D7 — free cancellation up to 1h before the rendez-vous (seller: always free). */
export function canCancelFree(scheduledISO: string, role: DeclarantRole): boolean {
  if (role === 'seller') return true;
  const limit = dayjs(scheduledISO).subtract(DELAYS.freeCancelHoursBefore, 'hour');
  return dayjs().isBefore(limit);
}

/**
 * D7 — flat late-cancellation fee (€). Only the cotransporteur has a fixed 2 €
 * fee; the buyer instead forfeits service/protection/mise-en-relation fees
 * (not a single amount), and the seller never pays.
 */
export function lateCancelFee(role: DeclarantRole): number {
  return role === 'transporter' ? DELAYS.lateCancelFeeEur : 0;
}
