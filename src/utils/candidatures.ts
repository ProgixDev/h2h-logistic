// CE QUE L'APPLICATION FAIT D'UNE PROPOSITION REÇUE — lecture, libellés, délais.
//
// ⚠️ DES FONCTIONS PURES, SANS SUPABASE NI REACT : les essais les importent sous
// Node, sans `.env` ni appareil (même raison que `utils/heureDeParis.ts`).
import { dateParis, decalageParisMinutes, libelleDate } from '@/utils/heureDeParis';
import { formatWeight } from '@/utils/formatting';
import type {
  Candidature,
  HubNomme,
  PassagePropose,
  RemiseNommee,
  StatutCandidature,
} from '@/types/candidature';
import type { AppNotification } from '@/types/notification';

type Brut = Record<string, unknown>;

const texte = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
/** ⚠️ PostgREST rend les `bigint` en texte, et un `numeric` peut l'être aussi : toujours `Number`. */
const nombre = (v: unknown): number | null => (v == null || v === '' ? null : Number(v));

const hub = (v: unknown): HubNomme | null => {
  if (v == null || typeof v !== 'object') return null;
  const h = v as Brut;
  const id = texte(h.id);
  return id ? { id, nom: texte(h.nom), ville: texte(h.ville) } : null;
};

const remises = (v: unknown): RemiseNommee[] | null =>
  Array.isArray(v)
    ? v.map((r) => {
        const x = r as Brut;
        return { hubId: String(x.hub_id), nom: texte(x.nom), ville: texte(x.ville), remiseLe: String(x.remise_le) };
      })
    : null;

const passages = (v: unknown): PassagePropose[] | null =>
  Array.isArray(v)
    ? v.map((p) => {
        const x = p as Brut;
        return {
          routeId: String(x.route_id),
          collecteLe: String(x.collecte_le),
          finLe: String(x.fin_le),
          express: x.express === true,
          hubCollecte: hub(x.hub_collecte) ?? { id: '', nom: null, ville: null },
          remises: remises(x.remises) ?? [],
        };
      })
    : null;

/** Une ligne de `colivraison_mes_propositions`, telle que l'écran la lit. */
export function versCandidature(ligne: unknown): Candidature {
  const l = ligne as Brut;
  return {
    id: String(l.candidature),
    rechercheId: String(l.recherche),
    statut: l.statut as StatutCandidature,
    temporairementIndisponible: l.temporairement_indisponible === true,
    proposeeLe: String(l.proposee_le),
    repondreAvant: String(l.repondre_avant),
    villeDepart: String(l.ville_depart ?? ''),
    villeArrivee: String(l.ville_arrivee ?? ''),
    format: String(l.format ?? ''),
    poidsMaxKg: nombre(l.poids_max_kg),
    participationCents: nombre(l.participation_cents) ?? 0,
    passages: passages(l.passages),
    collecteLe: texte(l.collecte_le),
    hubCollecte: hub(l.hub_collecte),
    remises: remises(l.remises),
    express: typeof l.express === 'boolean' ? l.express : null,
    hubRemise: hub(l.hub_remise),
    remiseLe: texte(l.remise_le),
    acheteur: texte(l.acheteur),
    validationJusquAu: texte(l.validation_jusqu_au),
  };
}

/** Une proposition encore acceptable : son délai de vingt minutes n'est pas passé. */
export function propositionOuverte(c: Candidature, maintenantMs: number): boolean {
  return c.statut === 'proposee' && new Date(c.repondreAvant).getTime() > maintenantMs;
}

/** Retirer sa candidature : tant que l'acheteur ne l'a pas choisie (§ 5.2.5). */
export function peutSeRetirer(c: Candidature): boolean {
  return c.statut === 'en_attente' || c.statut === 'non_selectionnee';
}

/**
 * La teinte d'un état, la même dans la liste et sur l'écran de la candidature.
 * ⚠️ UNE MAUVAISE ISSUE N'EST JAMAIS VERTE : seul « confirmée » l'est.
 */
export function varianteStatut(c: Candidature): 'default' | 'success' | 'warning' | 'outline' {
  switch (c.statut) {
    case 'confirmee':
      return 'success';
    case 'en_attente':
      return 'warning';
    case 'non_selectionnee':
      return 'outline';
    default:
      return 'default';
  }
}

/** Ce que l'écran dit de l'état d'une candidature. */
export function libelleStatut(c: Candidature): string {
  switch (c.statut) {
    case 'proposee':
      return 'Nouvelle proposition';
    case 'en_attente':
      return 'En attente du choix de l’acheteur';
    case 'non_selectionnee':
      return c.temporairementIndisponible ? 'Temporairement indisponible' : 'Accepté – non sélectionné';
    case 'retenue':
      return 'Choisi — en attente du vendeur';
    case 'confirmee':
      return 'Co-livraison confirmée';
  }
}

/**
 * Ce que l'écran explique pour chaque état — dans les mots du § 5 des CGU
 * H2H Logistic, parce que c'est contre ce texte que le service est validé.
 */
export function explicationStatut(c: Candidature): string {
  switch (c.statut) {
    case 'proposee':
      // § 5.2.2 : l'acceptation rend la candidature visible, elle n'attribue rien.
      return 'Accepter, c’est vous porter candidat : votre candidature devient visible par l’acheteur, qui choisit parmi les cotransporteurs ayant accepté, puis le vendeur valide. La co-livraison ne vous est pas attribuée automatiquement.';
    case 'en_attente':
      // § 5.2.2, dernier alinéa, et § 5.2.5.
      return 'Votre candidature est visible par l’acheteur. Tant qu’elle attend son choix, vous ne recevez pas de nouvelle proposition. Vous pouvez la retirer tant que vous n’êtes pas choisi.';
    case 'non_selectionnee':
      // § 5.2.6 d'abord, § 5.2.5 ensuite.
      return c.temporairementIndisponible
        ? 'Vous avez accepté une autre proposition : cette candidature ne peut pas être choisie tant que l’autre attend une décision. Elle pourra redevenir sélectionnable ensuite, si votre disponibilité le permet.'
        : 'L’acheteur a choisi un autre cotransporteur. Votre acceptation est conservée pour un éventuel remplacement, sans réserver votre disponibilité : vous pouvez recevoir d’autres propositions, ou retirer cette candidature.';
    case 'retenue':
      // § 5.2.7.
      return 'L’acheteur vous a choisi. Le vendeur doit maintenant valider ; pendant son délai, votre disponibilité est réservée pour cette co-livraison. Vous serez prévenu de sa réponse.';
    case 'confirmee':
      // § 5.2.8.
      return 'La co-livraison est confirmée : le groupe réunit le vendeur, l’acheteur et vous. Les rendez-vous ci-dessous sont fixés.';
  }
}

const MINUTE = 60_000;

/** « HH:MM » à Paris, pour un instant ISO — l'heure du rendez-vous, quel que soit le fuseau du téléphone. */
export function heureParis(iso: string): string {
  const ms = new Date(iso).getTime();
  return new Date(ms + decalageParisMinutes(ms) * MINUTE).toISOString().slice(11, 16);
}

/** « Aujourd'hui », « Demain », « Après-demain », puis « ven. 12 sept. » — au calendrier de Paris. */
export function libelleJour(iso: string, maintenantMs: number): string {
  const jour = dateParis(new Date(iso).getTime());
  const aujourdhui = dateParis(maintenantMs);
  const ecart = Math.round(
    (Date.UTC(+jour.slice(0, 4), +jour.slice(5, 7) - 1, +jour.slice(8, 10))
      - Date.UTC(+aujourdhui.slice(0, 4), +aujourdhui.slice(5, 7) - 1, +aujourdhui.slice(8, 10))) / (24 * 60 * MINUTE),
  );
  if (ecart === 0) return 'Aujourd’hui';
  if (ecart === 1) return 'Demain';
  if (ecart === 2) return 'Après-demain';
  return libelleDate(jour);
}

/** Le temps qui reste, « 12 min 05 s », ou `null` une fois le délai passé. */
export function tempsRestant(iso: string, maintenantMs: number): string | null {
  const reste = new Date(iso).getTime() - maintenantMs;
  if (reste <= 0) return null;
  const min = Math.floor(reste / MINUTE);
  const s = Math.floor((reste % MINUTE) / 1000);
  return `${min} min ${String(s).padStart(2, '0')} s`;
}

/**
 * « Taille M · jusqu’à 5 kg ». ⚠️ LE POIDS EST CELUI DU FORMAT DÉCLARÉ, pas une pesée :
 * c’est un plafond, et l’écran le dit comme tel (§ 5.1.3 : emballage compris).
 */
export function libelleColis(format: string, poidsMaxKg: number | null): string {
  return poidsMaxKg != null && poidsMaxKg > 0 ? `Taille ${format} · jusqu’à ${formatWeight(poidsMaxKg)}` : `Taille ${format}`;
}

/** Un nom de hub, ou ce qu'on en dit quand il manque. */
export const nomDuHub = (h: { nom: string | null } | null | undefined): string => h?.nom ?? 'Hub';

/**
 * Le message à montrer quand le serveur refuse un geste.
 *
 * 🔴 LE SERVEUR REFUSE PLUS DE CAS QUE L'ÉCRAN N'EN PRÉVOIT, et son message brut
 * est écrit sans accents. L'indice (`hint`) dit lequel : c'est lui qu'on traduit.
 */
export function messageDeRefus(indice: string | null | undefined, brut: string): string {
  switch (indice) {
    case 'COLIVRAISON_DELAI':
      return 'Le délai de cette proposition est passé.';
    case 'COLIVRAISON_SUSPENDU':
      return 'Vous avez déjà une candidature en attente de décision : attendez le choix de l’acheteur, ou retirez-la.';
    case 'COLIVRAISON_INDISPONIBLE':
      return 'Ce passage ne peut plus être proposé : il est désormais trop proche, complet, ou votre trajet n’est plus disponible.';
    case 'COLIVRAISON_ETAT':
      return 'Cette proposition n’est plus ouverte.';
    default:
      return brut;
  }
}

/**
 * Ce que le serveur a dit en dernier d'une candidature qui n'est plus dans la liste : confirmée et devenue
 * une mission, non retenue, demande annulée. L'avis le plus récent qui la désigne (`params.candidature`),
 * hors la proposition elle-même ; `null` s'il n'y en a aucun.
 *
 * 🔴 SANS LUI, L'ÉCRAN D'UNE CANDIDATURE GAGNÉE DISAIT « son délai de vingt minutes est passé » : confirmée,
 * elle quitte la liste pour devenir une mission, et l'écran resté ouvert ne savait pas pourquoi elle avait
 * disparu (vu à l'émulateur le 08/10/2026). L'avis « Candidature non retenue » ouvrait le même écran, avec le
 * même mensonge.
 */
export function dernierAvisDeCandidature(avis: AppNotification[], candidatureId: string): AppNotification | null {
  let dernier: AppNotification | null = null;
  for (const a of avis) {
    if (a.data?.candidature !== candidatureId || a.type === 'mission_new') continue;
    if (!dernier || new Date(a.createdAt).getTime() > new Date(dernier.createdAt).getTime()) dernier = a;
  }
  return dernier;
}
