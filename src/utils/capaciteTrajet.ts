// LES PLACES D'UN TRAJET, PASSAGE PAR PASSAGE (hand-to-hand 20261008010000, § 5.2.9 des CGU H2H Logistic).
//
// 🔴 L'ÉCRAN AFFICHAIT `missions_count` : un compteur de l'ancien parcours qui ne redescend jamais — un trajet récurrent
// à trois colis était « complet » pour toujours après trois acceptations. La mise en relation compte les places PAR
// PASSAGE ; le serveur les dit telles qu'elle les voit, et ces fonctions pures n'en font que des mots.
//
// Depuis hand-to-hand 20261013003000 et 20261013004000, la même lecture dit aussi : si l'équipe a suspendu les
// nouvelles propositions du trajet (et ce qu'elle en a dit), et si le déplacement de chaque jour est confirmé.
//
// Depuis hand-to-hand 20261013007000, elle dit ceux de ses points que l'équipe a fermés, et ce que ces fermetures
// retirent au trajet. 🔴 UN AVIS SE RATE : sans cela, un trajet dont le point de collecte ferme restait « actif », avec
// ses places, et ne recevait plus rien sans que rien ne le dise.
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

/** Un point du trajet que l'équipe a fermé : il n'est plus proposé comme point de rendez-vous. */
export type PointFerme = { hub: string; role: 'collecte' | 'remise'; nom: string };

/**
 * Ce que ces fermetures retirent au trajet — il ne reçoit alors plus de proposition : son point de collecte ; plus
 * aucun de ses points de remise (la mise en relation des CGU H2H Logistic, § 5) ; ou son PREMIER point de remise
 * (l'ancien parcours pose la remise là, que les suivants soient ouverts ou non).
 *
 * ⚠️ C'EST LE SERVEUR QUI SAIT LAQUELLE DES DEUX MISES EN RELATION PROPOSE CE TRAJET : l'écran ne le devine pas.
 */
export type PointManquant = 'collecte' | 'remise' | 'premiere_remise';

const POINTS_MANQUANTS: readonly unknown[] = ['collecte', 'remise', 'premiere_remise'];

export type CapaciteTrajet = {
  routeId: string;
  places: number;
  /** Ses co-livraisons sur ce trajet, ni annulées ni expirées. */
  colivraisons: number;
  /** `null` : rien n'est suspendu. */
  suspension: SuspensionTrajet | null;
  /** Ceux de ses points que l'équipe a fermés, la collecte d'abord ; vide : aucun. */
  pointsFermes: PointFerme[];
  /** `null` : rien ne lui manque de ce côté-là — il reste proposé vers ses autres points. */
  pointManquant: PointManquant | null;
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

function versPointsFermes(v: unknown): PointFerme[] {
  if (!Array.isArray(v)) return [];
  const sortie: PointFerme[] = [];
  for (const p of v as Brut[]) {
    if (!p || typeof p !== 'object') continue;
    const { hub, role, nom } = p;
    if (typeof hub !== 'string' || (role !== 'collecte' && role !== 'remise')) continue;
    sortie.push({ hub, role, nom: typeof nom === 'string' && nom.trim() !== '' ? nom : 'Point de rendez-vous' });
  }
  return sortie;
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
      pointsFermes: versPointsFermes(t.points_fermes),
      pointManquant: POINTS_MANQUANTS.includes(t.point_manquant) ? (t.point_manquant as PointManquant) : null,
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

/** Ce que l'écran dit des points fermés d'un trajet. */
export type BandeauPointsFermes = {
  titre: string;
  /** Chaque point fermé, son rôle devant : « Collecte : Hub … ». */
  points: string[];
  /** Ce que cela change pour le trajet, et ce qui reste à faire. */
  suite: string;
  /** Ce que deviennent ses places tant que rien ne change ; `null` s'il reste proposé. */
  places: string | null;
  /** La mention d'une carte étroite ; `null` s'il reste proposé. */
  court: string | null;
};

/**
 * Les points que l'équipe a fermés sur ce trajet, en mots — les mêmes que ceux de l'avis reçu à la fermeture.
 * `null` : aucun de ses points n'est fermé.
 *
 * ⚠️ C'EST LE SERVEUR QUI DIT S'IL REÇOIT ENCORE DES PROPOSITIONS (`point_manquant`) : l'écran ne le déduit pas du
 * nombre de points fermés.
 */
export function bandeauPointsFermes(c: CapaciteTrajet | undefined): BandeauPointsFermes | null {
  if (!c || (c.pointsFermes.length === 0 && c.pointManquant === null)) return null;
  const points = c.pointsFermes.map((p) => `${p.role === 'collecte' ? 'Collecte' : 'Remise'} : ${p.nom}`);
  if (c.pointManquant === 'collecte') {
    return {
      titre: 'Point de collecte fermé',
      points,
      suite: 'Ce trajet ne reçoit plus de nouvelle proposition de co-livraison. Publiez un trajet avec un autre point de collecte.',
      places: 'Tant que son point de collecte est fermé, ces places ne sont proposées à personne.',
      court: 'Point de collecte fermé',
    };
  }
  if (c.pointManquant === 'remise') {
    return {
      titre: 'Plus aucun point de remise proposé',
      points,
      suite: 'Ce trajet ne reçoit plus de nouvelle proposition de co-livraison. Publiez un trajet avec un autre point de remise.',
      places: 'Tant qu’aucun de ses points de remise n’est proposé, ces places ne sont proposées à personne.',
      court: 'Sans point de remise',
    };
  }
  if (c.pointManquant === 'premiere_remise') {
    return {
      titre: 'Premier point de remise fermé',
      points,
      suite: 'La remise de ce trajet se pose à son premier point de remise : il ne reçoit plus de nouvelle proposition de co-livraison. Publiez un trajet avec un autre point de remise.',
      places: 'Tant que son premier point de remise est fermé, ces places ne sont proposées à personne.',
      court: 'Point de remise fermé',
    };
  }
  const plusieurs = c.pointsFermes.length > 1;
  return {
    titre: plusieurs
      ? `${c.pointsFermes.length} points de ce trajet ne sont plus proposés`
      : 'Un point de ce trajet n’est plus proposé',
    points,
    suite: plusieurs
      ? 'Ces points ne sont plus proposés sur ce trajet. Ses autres points ne changent pas.'
      : 'Ce point n’est plus proposé sur ce trajet. Ses autres points ne changent pas.',
    places: null,
    court: null,
  };
}

/** Ce point est-il de ceux que l'équipe a fermés sur ce trajet ? */
export function pointFerme(c: CapaciteTrajet | undefined, hubId: string): boolean {
  return c?.pointsFermes.some((p) => p.hub === hubId) ?? false;
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
