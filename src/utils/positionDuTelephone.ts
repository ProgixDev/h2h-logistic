// QUELLE POSITION ENVOYER QUAND ON APPUIE SUR « JE SUIS AU HUB ».
//
// 🔴 LE TÉLÉPHONE N'ÉTAIT LU QU'UNE FOIS, À L'OUVERTURE DE L'ÉCRAN (vu à
// l'émulateur le 10/09/2026). `useHubPresence` appelait
// `getCurrentPositionAsync` dans un `useEffect` monté une seule fois : si ce
// premier relevé échouait — GPS encore froid, à l'intérieur d'une gare, ou
// localisation activée APRÈS l'ouverture — la position restait `null` pour
// toujours, et chaque appui répondait « activez la localisation » à quelqu'un
// dont la localisation était activée. Et s'il réussissait, c'est la position
// d'ARRIVÉE sur l'écran qui partait comme preuve, dix minutes plus tard, cent
// mètres plus loin.
//
// ⚠️ TROIS CAUSES, TROIS PHRASES. « Activez la localisation » ne sert à rien à
// qui l'a refusée pour l'application (il faut les réglages), ni à qui l'a
// activée mais n'a pas encore de relevé (il faut attendre). Dire la mauvaise
// cause, c'est envoyer quelqu'un chercher au mauvais endroit, au moment précis
// où l'autre partie l'attend.
//
// Ce fichier est PUR — aucun `expo-location` — pour que les règles se testent
// sous `node --test` ; le hook fait les appels et lui demande quoi en conclure.

/** Un relevé du téléphone, tel qu'on l'enverrait. */
export type Releve = {
  latitude: number;
  longitude: number;
  /** Rayon de confiance annoncé par le téléphone, en mètres. `null` = inconnu. */
  precisionM: number | null;
  /** Instant de la MESURE (pas de la lecture), en ms depuis l'époque. */
  mesureLe: number;
};

/** Pourquoi il n'y a pas de position — ou qu'il y en a une. */
export type EtatGps = 'recherche' | 'ok' | 'permission' | 'services';

/**
 * Un relevé suivi plus vieux que ça ne part pas tel quel : on en redemande un.
 * Vingt secondes à pied, c'est une vingtaine de mètres — le tiers d'une zone.
 */
export const FRAICHEUR_MAX_MS = 20_000;

/**
 * Au-delà, un relevé ne décrit plus où l'on est — même en dernier recours. Une
 * minute à pied, c'est la zone entière.
 */
export const AGE_MAX_MS = 60_000;

/** Combien de temps on attend un relevé neuf avant de renoncer. */
export const DELAI_RELEVE_MS = 12_000;

export const estFrais = (r: Releve | null, maintenant: number): r is Releve =>
  r != null && maintenant - r.mesureLe <= FRAICHEUR_MAX_MS;

/**
 * Le relevé à envoyer : le plus RÉCENT de ceux qui décrivent encore l'instant
 * présent, `null` s'il n'y en a aucun.
 *
 * ⚠️ PLUS RÉCENT, PAS PLUS PRÉCIS. Un relevé précis à 5 m pris il y a
 * cinquante secondes situe l'endroit d'où l'on venait ; un relevé à 30 m pris
 * maintenant situe l'endroit où l'on est. C'est l'arrivée qu'on déclare.
 * La précision part avec le relevé : c'est au litige de la peser, pas à nous
 * de choisir à sa place.
 */
export function releveADeclarer(
  candidats: (Releve | null)[],
  maintenant: number,
): Releve | null {
  let meilleur: Releve | null = null;
  for (const r of candidats) {
    if (!r) continue;
    // Un relevé « du futur » (horloge du téléphone décalée) ne se compare à
    // rien : on le prend pour ce qu'il est, une mesure d'à l'instant.
    const age = maintenant - r.mesureLe;
    if (age > AGE_MAX_MS) continue;
    if (!meilleur || r.mesureLe > meilleur.mesureLe) meilleur = r;
  }
  return meilleur;
}

/**
 * Pourquoi aucune position n'est disponible.
 *
 * ⚠️ L'ORDRE COMPTE : sans permission, le téléphone ne dit même pas si sa
 * localisation est allumée — on ne peut rien demander d'autre avant.
 */
export function motifSansPosition(p: {
  permission: boolean;
  servicesActifs: boolean;
}): Exclude<EtatGps, 'ok'> {
  if (!p.permission) return 'permission';
  if (!p.servicesActifs) return 'services';
  return 'recherche';
}

/** La phrase qui dit QUOI FAIRE, par cause. */
export const CLE_MESSAGE_GPS = {
  permission: 'presence.gpsPermission',
  services: 'presence.gpsServices',
  recherche: 'presence.gpsNoFix',
} as const satisfies Record<Exclude<EtatGps, 'ok'>, string>;

/**
 * La promesse, ou `null` passé le délai.
 *
 * ⚠️ `getCurrentPositionAsync` PEUT NE JAMAIS RÉPONDRE — à l'intérieur, sans
 * ciel, Android attend un relevé qui ne vient pas. Sans borne, le bouton
 * resterait « en cours » indéfiniment.
 */
export function avecDelai<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const minuteur = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => { clearTimeout(minuteur); resolve(v); },
      () => { clearTimeout(minuteur); resolve(null); },
    );
  });
}
