// LES PLACES D'UN TRAJET, PASSAGE PAR PASSAGE (hand-to-hand 20261008010000, § 5.2.9 des CGU H2H Logistic).
//
// 🔴 L'ÉCRAN AFFICHAIT `missions_count` : un compteur de l'ancien parcours qui ne redescend jamais — un trajet récurrent
// à trois colis était « complet » pour toujours après trois acceptations. La mise en relation compte les places PAR
// PASSAGE ; le serveur les dit telles qu'elle les voit, et ces fonctions pures n'en font que des mots.
//
// Depuis hand-to-hand 20261013003000 et 20261013004000, la même lecture dit aussi : si l'équipe a suspendu les
// nouvelles propositions du trajet (et ce qu'elle en a dit), et si le déplacement de chaque jour est confirmé.
import { dateParis } from '@/utils/heureDeParis';

export type PassageCapacite = {
  collecteLe: string;
  /** Les engagements de ce passage : candidatures retenues ou confirmées, co-livraisons en cours. */
  reserves: number;
  /** La mise en relation peut-elle encore y proposer un colis (des places, et rien qui le chevauche) ? */
  libre: boolean;
  /** « Pas aujourd'hui » ce jour-là. */
  jourOff: boolean;
  /** Le déplacement de ce jour-là, confirmé par « Confirmer le trajet » ; `null` sinon. */
  confirmeLe: string | null;
};

/** Les nouvelles propositions du trajet, suspendues par l'équipe : son message, et depuis quand. */
export type SuspensionTrajet = { message: string; le: string | null };

export type CapaciteTrajet = {
  routeId: string;
  places: number;
  /** Ses co-livraisons sur ce trajet, ni annulées ni expirées. */
  colivraisons: number;
  /** `null` : rien n'est suspendu. */
  suspension: SuspensionTrajet | null;
  passages: PassageCapacite[];
};

export type EtatPassage = 'pas_aujourdhui' | 'complet' | 'chevauche' | 'libre';

type Brut = Record<string, unknown>;

function versSuspension(s: unknown): SuspensionTrajet | null {
  if (!s || typeof s !== 'object') return null;
  const { message, le } = s as Brut;
  if (typeof message !== 'string' || message.trim() === '') return null;
  return { message, le: typeof le === 'string' ? le : null };
}

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
      suspension: versSuspension(t.suspension),
      passages: Array.isArray(t.passages)
        ? (t.passages as Brut[]).map((p) => ({
            collecteLe: String(p.collecte_le),
            reserves: Number(p.reserves ?? 0),
            libre: p.libre === true,
            jourOff: p.jour_off === true,
            confirmeLe: typeof p.confirme_le === 'string' ? p.confirme_le : null,
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

/**
 * Le passage de ce jour (« AAAA-MM-JJ », à Paris) qui attend encore sa confirmation : à venir, ni fermé par
 * « Pas aujourd'hui », ni déjà confirmé. `null` s'il n'y a rien à confirmer.
 *
 * ⚠️ LE SERVEUR NE REND QUE LES PASSAGES À VENIR : une fois l'heure passée, il n'y a plus rien à confirmer.
 */
export function passageAConfirmer(c: CapaciteTrajet | undefined, jour: string): PassageCapacite | null {
  return c?.passages.find(
    (p) => dateParis(new Date(p.collecteLe).getTime()) === jour && !p.jourOff && p.confirmeLe === null,
  ) ?? null;
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

/**
 * Ce que le serveur répond quand une confirmation ne se pose pas, en mots pour l'écran. Un refus qu'on ne
 * reconnaît pas reste un « réessayez » : jamais le message brut d'une panne.
 */
export function messageDeConfirmation(brut: string | null | undefined): string {
  const m = (brut ?? '').toLowerCase();
  if (m.includes('ferme cette journee')) {
    return 'Vous avez fermé cette journée : reprenez les propositions d’aujourd’hui pour confirmer ce trajet.';
  }
  if (m.includes('n est pas actif')) return 'Ce trajet n’est pas actif : réactivez-le pour le confirmer.';
  if (m.includes('ne passe pas ce jour')) return 'Ce trajet ne passe pas aujourd’hui.';
  if (m.includes('trajet introuvable')) return 'Ce trajet n’existe plus.';
  return 'La confirmation n’a pas pu être enregistrée. Réessayez dans un instant.';
}
