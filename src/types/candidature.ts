// LA MISE EN RELATION DU § 5 DES CGU H2H LOGISTIC, VUE DU COTRANSPORTEUR.
//
// 🔴 UNE PROPOSITION N'EST PAS UNE MISSION. Le serveur notifie tous les
// cotransporteurs éligibles à la fois ; chacun a vingt minutes. Accepter, c'est
// CANDIDATER : l'acheteur choisit parmi les candidatures, puis le vendeur valide.
// Ce n'est qu'à la confirmation que la co-livraison existe pour ce cotransporteur.
// Voir `hand-to-hand/docs/h2h-logistic-cgu-5-utilisation-du-service.md`.

/** Les états qu'un cotransporteur voit — les autres (refusée, expirée, close…) ne lui sont plus montrés. */
export type StatutCandidature = 'proposee' | 'en_attente' | 'non_selectionnee' | 'retenue' | 'confirmee';

export interface HubNomme {
  id: string;
  nom: string | null;
  ville: string | null;
}

export interface RemiseNommee {
  hubId: string;
  nom: string | null;
  ville: string | null;
  remiseLe: string;
}

/** Un passage possible d'une proposition : un trajet du cotransporteur, à une heure. */
export interface PassagePropose {
  routeId: string;
  /** ⚠️ RENVOYÉE TELLE QUELLE À L'ACCEPTATION : c'est elle qui désigne le passage. */
  collecteLe: string;
  finLe: string;
  express: boolean;
  hubCollecte: HubNomme;
  remises: RemiseNommee[];
}

export interface Candidature {
  id: string;
  rechercheId: string;
  statut: StatutCandidature;
  /** Acceptée ici, mais en attente d'une autre décision ailleurs (§ 5.2.6). */
  temporairementIndisponible: boolean;
  proposeeLe: string;
  repondreAvant: string;
  villeDepart: string;
  villeArrivee: string;
  format: string;
  poidsMaxKg: number | null;
  participationCents: number;
  /** Les passages au choix — seulement tant que c'est une proposition. */
  passages: PassagePropose[] | null;
  collecteLe: string | null;
  hubCollecte: HubNomme | null;
  remises: RemiseNommee[] | null;
  express: boolean | null;
  /** Le point de remise choisi par l'acheteur, une fois choisi. */
  hubRemise: HubNomme | null;
  remiseLe: string | null;
  acheteur: string | null;
  /** La réponse du vendeur est attendue avant cette heure (candidature retenue). */
  validationJusquAu: string | null;
}
