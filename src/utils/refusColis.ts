// LE REFUS DU COLIS, VU DU COTRANSPORTEUR (hand-to-hand 20261008009000, § 5.6.3 des CGU H2H Logistic).
//
// ⚠️ DES FONCTIONS PURES : ni Supabase, ni React. La lecture du serveur (`refus_colis_de_ma_commande`) devient un
// objet ; l'état du refus devient une phrase. Les essais les importent sous Node.

export type IssueRefus = 'refus_effectif' | 'refus_injustifie' | 'sans_objet';

export type RefusColis = {
  declareLe: string;
  motif: string | null;
  /** Jusqu'à quand le vendeur peut contester. */
  contestableJusquAu: string;
  /** `null` tant que le refus attend : le délai du vendeur, ou l'équipe. */
  issue: IssueRefus | null;
  contestation: { declareeLe: string } | null;
  decision: { decision: 'maintenu' | 'injustifie'; reponse: string } | null;
  /** Ce que le protocole de la mission prévoit pour moi si le refus devient effectif. */
  compensationPrevueCents: number | null;
  /** Ma compensation, une fois le refus effectif. */
  compensationCents: number | null;
  /** Mes frais, si le refus est dit injustifié. */
  fraisCents: number | null;
};

type Brut = Record<string, unknown>;
const texte = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const nombre = (v: unknown): number | null => (v == null || v === '' ? null : Number(v));

/** La lecture du serveur, ou `null` sans refus (ou pour qui n'est pas le cotransporteur). */
export function versRefusColis(donnee: unknown): RefusColis | null {
  if (donnee == null || typeof donnee !== 'object') return null;
  const d = donnee as Brut;
  const r = d.refus as Brut | null;
  if (!r || d.role !== 'cotransporteur') return null;
  const k = d.contestation as Brut | null;
  const x = d.decision as Brut | null;
  const issue = texte(r.issue);
  return {
    declareLe: String(r.declare_le),
    motif: texte(r.motif),
    contestableJusquAu: String(r.contestable_jusqu_au),
    issue: issue === 'refus_effectif' || issue === 'refus_injustifie' || issue === 'sans_objet' ? issue : null,
    contestation: k ? { declareeLe: String(k.declaree_le) } : null,
    decision: x && (x.decision === 'maintenu' || x.decision === 'injustifie')
      ? { decision: x.decision, reponse: String(x.reponse ?? '') }
      : null,
    compensationPrevueCents: nombre(d.compensation_prevue_cents),
    compensationCents: nombre(d.compensation_cents),
    fraisCents: nombre(d.frais_cents),
  };
}

/** Un refus qui attend encore son issue : la co-livraison ne se poursuit, ni ne s'annule autrement. */
export const refusEnCours = (r: RefusColis | null): boolean => !!r && r.issue == null;

/**
 * Où en est le refus, en une phrase. `euros` met des centimes en mots ; `heure` une date.
 *
 * 🔴 LE RENDEZ-VOUS N'A PLUS LIEU DÈS LE REFUS : le cotransporteur ne prend pas le colis. La suite — l'annulation,
 * sa compensation ou ses frais — dépend du vendeur (vingt-quatre heures), puis de l'équipe.
 */
export function phraseRefusColis(
  r: RefusColis,
  euros: (cents: number) => string,
  heure: (iso: string) => string,
  maintenant = Date.now(),
): string {
  if (r.issue === 'sans_objet') return 'Le colis a finalement été pris en charge : ce refus est sans suite.';
  if (r.issue === 'refus_effectif') {
    return 'Votre refus est retenu : la co-livraison est annulée.'
      + (r.compensationCents ? ` Une compensation de ${euros(r.compensationCents)} vous est due : elle s’ajoute à vos participations.` : '');
  }
  if (r.issue === 'refus_injustifie') {
    return 'Après examen, votre refus n’est pas retenu : la co-livraison est annulée, et ce refus compte comme une annulation tardive'
      + (r.fraisCents ? ` (${euros(r.fraisCents)} de frais, retenus sur vos prochaines participations).` : '.');
  }
  if (r.decision) {
    return r.decision.decision === 'maintenu'
      ? 'Après examen, votre refus est maintenu : la co-livraison va être annulée.'
      : 'Après examen, votre refus n’est pas retenu : la co-livraison va être annulée, comme une annulation tardive.';
  }
  if (r.contestation) return 'Le vendeur conteste votre refus : l’équipe H2H Logistic examine les deux versions.';
  const compensation = r.compensationPrevueCents
    ? `, et une compensation de ${euros(r.compensationPrevueCents)} vous sera due`
    : '';
  if (new Date(r.contestableJusquAu).getTime() <= maintenant) {
    return `Le délai du vendeur est passé : la co-livraison va être annulée${compensation}.`;
  }
  return `Vous n’avez pas à prendre le colis. Le vendeur peut contester ce refus jusqu’au ${heure(r.contestableJusquAu)} ; `
    + `sans contestation, la co-livraison sera annulée${compensation}.`;
}
