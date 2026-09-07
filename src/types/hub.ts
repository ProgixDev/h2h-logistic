// UN HUB, TEL QUE LES DEUX APPLICATIONS DOIVENT LE VOIR.
//
// 🔴 CE FICHIER EST PARTAGÉ MOT POUR MOT avec
// `h2h-logistic/src/types/hub.ts`. Il n'y a pas de monorepo —
// `docs/backend/ARCHITECTURE.md:20` le dit sans détour — donc la seule
// mécanique disponible est la copie, et un test d'empreinte de chaque côté
// (`src/types/hubPartage.test.ts`) qui échoue dès que l'une des deux dérive.
// Le jour où `@h2h/types` existera, les deux tests disparaîtront ensemble.
//
// 🔴 TROIS DÉFINITIONS INCOMPATIBLES COEXISTAIENT. L'énumération en base portait
// treize valeurs, `h2h-logistic/src/constants/HubTypes.ts` les treize aussi, et
// `hand-to-hand/src/types/logistics.ts` CINQ (`train|bus|highway|mall|ecommerce`)
// — dont aucune n'était le type des hubs réels. Le premier hub de la plateforme
// aurait rendu `undefined` sur l'écran censé l'afficher.
//
// ⚠️ CE QUE LA FORME REND IMPOSSIBLE, ET C'EST DÉLIBÉRÉ :
//
//   • `zoneRadiusM` n'est PAS optionnel. Les deux applications portaient chacune
//     une constante par défaut, différentes d'un facteur cinq (150 m et 30 m), et
//     aucune ne venait du serveur. Supprimer les constantes ne suffit pas —
//     quelqu'un en réécrit une. Un champ obligatoire n'a rien à remplir.
//
//   • `point` n'est PAS optionnel. `h2h-logistic/src/services/hubs.ts` rendait
//     `latitude: 0, longitude: 0` pour TOUS les hubs. Un hub sans épingle ne peut
//     plus être représenté, donc plus être affiché — ce que le protocole de
//     nommage exige (« le nom du hub ne suffit pas »).
//
//   • `displayDetail` n'est PAS optionnel, pour la même raison : le protocole dit
//     que le nom seul ne suffit jamais.
//
//   • NI capacité, NI horaires, NI téléphone, NI gérant. Un hub est un point de
//     rendez-vous, « pas nécessairement un entrepôt » (docs/hubs-fonctionnement.md
//     §1) ; ces notions appartiennent aux relais. La façon de tenir la séparation
//     est de les rendre inexprimables ici.

/**
 * Le « type de lieu » du protocole de nommage — le deuxième mot du nom.
 *
 * ⚠️ DIX VALEURS DEPUIS LE 07/09/2026, ET LES QUATRE DERNIÈRES SONT ARRIVÉES
 * PAR LA DONNÉE. Les six premières venaient des EXEMPLES du protocole
 * (« Parking, Gare, Station, Entrée, Rond-point »), lus comme une liste
 * exhaustive. L'export réel du client — 514 points relevés sur sa carte — en
 * portait quatre de plus, dont `place` avec 34 occurrences : le deuxième type le
 * plus fréquent était celui qu'on ne pouvait pas écrire. Voir
 * `supabase/migrations/20260907100000_…`.
 */
export type HubPlaceType =
  | 'parking'
  | 'gare'
  | 'station'
  | 'entree'
  | 'rond_point'
  | 'commerce'
  | 'place'
  | 'port'
  | 'eglise'
  | 'aire_covoiturage';

export type Hub = {
  id: string;
  /**
   * « Hub » + type de lieu + repère, TEL QUE LA BASE LE REND.
   *
   * 🔴 JAMAIS RECOMPOSÉ, JAMAIS AMPUTÉ DE SON « Hub ». C'est une colonne
   * calculée côté serveur ; un gabarit « Hub {nom} » le redoublerait, et un
   * `replace(/^hub /i, '')` — ce que faisait `OrderNextStep` — retirerait
   * précisément le mot que le protocole rend porteur.
   */
  name: string;
  placeType: HubPlaceType;
  /** Le « détail affiché » : « Parking ouvert, côté entrée principale ». */
  displayDetail: string;
  city: string;
  /** Contexte, pas repère : un rond-point n'a pas d'adresse utile. */
  address: string | null;
  /** Le point à épingler. Sans lui, le hub n'est pas affichable. */
  point: { lat: number; lng: number };
  /** Rayon de la zone de rendez-vous, en mètres, VENU DU SERVEUR. */
  zoneRadiusM: number;
  status: 'active' | 'inactive';
};

/**
 * Les libellés du protocole (docs/hubs-protocole-nommage.md, « Structure
 * officielle du nom »).
 *
 * ⚠️ FONCTION TOTALE, PAS UN INDEX DIRECT. L'énumération en base restera plus
 * large que celle-ci — Postgres ne supprime pas une valeur d'énumération, et
 * `hub_place_type` peut gagner une septième valeur avant que ce fichier ne la
 * connaisse. Un `Record<HubPlaceType, string>[t]` rendrait alors `undefined` sur
 * l'écran ; c'est exactement l'incident que documente `HubTypes.ts`.
 */
export const libelleTypeDeLieu = (t: HubPlaceType | string): string =>
  ({
    parking: 'Parking',
    gare: 'Gare',
    station: 'Station',
    entree: 'Entrée',
    rond_point: 'Rond-point',
    commerce: 'Commerce',
    // 🔴 CES QUATRE LIBELLÉS DOIVENT ÊTRE CEUX DE LA COLONNE CALCULÉE
    // `hubs.name` (`20260907110000`), MOT POUR MOT. Le nom vient du serveur ;
    // si un écran recomposait « Aire covoiturage » là où la base a écrit « Aire
    // de covoiturage », deux libellés désigneraient le même lieu — le
    // malentendu que le protocole de nommage existe pour empêcher.
    place: 'Place',
    port: 'Port',
    eglise: 'Église',
    aire_covoiturage: 'Aire de covoiturage',
  })[t] ?? 'Point de rendez-vous';
