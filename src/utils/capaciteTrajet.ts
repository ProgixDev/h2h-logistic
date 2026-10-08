// LES PLACES D'UN TRAJET, PASSAGE PAR PASSAGE (hand-to-hand 20261008010000, § 5.2.9 des CGU H2H Logistic).
//
// 🔴 L'ÉCRAN AFFICHAIT `missions_count` : un compteur de l'ancien parcours qui ne redescend jamais — un trajet récurrent
// à trois colis était « complet » pour toujours après trois acceptations. La mise en relation compte les places PAR
// PASSAGE ; le serveur les dit telles qu'elle les voit, et ces fonctions pures n'en font que des mots.

export type PassageCapacite = {
  collecteLe: string;
  /** Les engagements de ce passage : candidatures retenues ou confirmées, co-livraisons en cours. */
  reserves: number;
  /** La mise en relation peut-elle encore y proposer un colis (des places, et rien qui le chevauche) ? */
  libre: boolean;
  /** « Pas aujourd'hui » ce jour-là. */
  jourOff: boolean;
};

export type CapaciteTrajet = {
  routeId: string;
  places: number;
  /** Ses co-livraisons sur ce trajet, ni annulées ni expirées. */
  colivraisons: number;
  passages: PassageCapacite[];
};

export type EtatPassage = 'pas_aujourdhui' | 'complet' | 'chevauche' | 'libre';

type Brut = Record<string, unknown>;

/** La lecture du serveur (`cotransporteur_capacite_trajets`), rangée par trajet. */
export function versCapaciteTrajets(donnee: unknown): Record<string, CapaciteTrajet> {
  if (!Array.isArray(donnee)) return {};
  const sortie: Record<string, CapaciteTrajet> = {};
  for (const t of donnee as Brut[]) {
    if (typeof t?.route_id !== 'string') continue;
    sortie[t.route_id] = {
      routeId: t.route_id,
      places: Number(t.places ?? 0),
      colivraisons: Number(t.colivraisons ?? 0),
      passages: Array.isArray(t.passages)
        ? (t.passages as Brut[]).map((p) => ({
            collecteLe: String(p.collecte_le),
            reserves: Number(p.reserves ?? 0),
            libre: p.libre === true,
            jourOff: p.jour_off === true,
          }))
        : [],
    };
  }
  return sortie;
}

export function etatPassage(p: PassageCapacite, places: number): EtatPassage {
  if (p.jourOff) return 'pas_aujourdhui';
  if (p.reserves >= places) return 'complet';
  if (!p.libre) return 'chevauche';
  return 'libre';
}

/** Le prochain passage à venir, ou `null`. */
export function prochainPassage(c: CapaciteTrajet | undefined, maintenant = Date.now()): PassageCapacite | null {
  return c?.passages.find((p) => new Date(p.collecteLe).getTime() > maintenant) ?? null;
}

/** Ce que l'on peut encore prendre sur ce passage, en mots. */
export function libellePlaces(p: PassageCapacite, places: number): string {
  switch (etatPassage(p, places)) {
    case 'pas_aujourdhui':
      return 'Pas aujourd’hui';
    case 'complet':
      return 'Complet';
    case 'chevauche':
      return 'Indisponible : un autre engagement chevauche ce passage';
    default: {
      const restantes = places - p.reserves;
      return `${restantes} place${restantes > 1 ? 's' : ''} libre${restantes > 1 ? 's' : ''} sur ${places}`;
    }
  }
}

/** La même chose, en court (l'accueil). */
export function libellePlacesCourt(p: PassageCapacite, places: number): string {
  switch (etatPassage(p, places)) {
    case 'pas_aujourdhui':
      return 'Pas aujourd’hui';
    case 'complet':
      return 'Complet';
    case 'chevauche':
      return 'Indisponible';
    default:
      return `${places - p.reserves}/${places} places`;
  }
}
