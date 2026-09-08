// LES TYPES DE LIEU — ceux du protocole de nommage, et eux seuls.
//
// 🔴 TREIZE VALEURS SONT DEVENUES SIX (06/09/2026). L'ancienne énumération
// décrivait des ENTREPÔTS — `locker`, `relay_point`, `ecommerce`, `mall`,
// `partner_shop` — avec quatre paires de doublons assumés (`gare`/`train`,
// `bus_station`/`bus`, `highway_exit`/`highway`, `shopping_center`/`mall`) que
// personne n'avait tranchées. Le protocole de nommage tranche pour nous : le
// type de lieu est UN MOT DU NOM (« Hub Parking La Roubine »), donc il ne peut
// pas exister en double.
//
// 🔴 ET `domicile` A DISPARU, CELUI QUI COMPTAIT. C'était le type des hubs
// « recrutés » — c'est-à-dire le domicile de quelqu'un. Le protocole interdit
// qu'un nom de hub révèle l'adresse privée d'un particulier ; ces lieux sont
// devenus des POINTS RELAIS, où ils étaient chez eux depuis le début.
//
// ⚠️ ON GARDE DES FONCTIONS TOTALES, PAS UN INDEX DIRECT — et la raison n'a pas
// changé, elle s'est seulement déplacée. L'énumération en base restera plus
// large que celle-ci : Postgres ne supprime pas une valeur d'énumération. Un
// `ICONES[hub.placeType]` sur une valeur inconnue rendrait `undefined`, donc une
// icône vide ou un plantage selon le composant. C'est exactement l'incident que
// ce fichier documentait déjà : « le premier hub réel de la plateforme aurait
// cassé l'écran qui devait l'afficher ».
import type { IconName } from '@/components/ui/Icon';
import type { HubPlaceType } from '@/types/hub';

export type { HubPlaceType };

// 🔴 CE `Record` EST EXHAUSTIF, ET C'EST LUI QUI A ATTRAPÉ L'OUBLI DU
// 07/09/2026. L'ajout de quatre types de lieu côté base a fait échouer `tsc`
// ici — « missing the following properties : place, port, eglise,
// aire_covoiturage » — alors que les 129 tests du dépôt passaient tous. Sans
// cette exhaustivité, `iconeHub()` serait simplement tombé sur son repli et
// aurait affiché une épingle générique pour un tiers de l'annuaire, sans que
// rien ne le signale.
//
// ⚠️ CE N'EST PAS EN CONTRADICTION AVEC LE REPLI DE `iconeHub` : le `Record`
// oblige à traiter les valeurs QU'ON CONNAÎT, le repli couvre celles qu'on ne
// connaît pas encore. Les deux répondent à des moments différents — l'un à la
// compilation, l'autre à l'exécution.
const ICONES: Record<HubPlaceType, IconName> = {
  parking: 'hub-parking',
  gare: 'hub-gare',
  station: 'hub-station',
  entree: 'hub-entree',
  rond_point: 'hub-rond-point',
  commerce: 'hub-commerce',
  place: 'hub-place',
  port: 'hub-port',
  eglise: 'hub-eglise',
  aire_covoiturage: 'hub-covoiturage',
  arret: 'hub-arret',
};

/** L'icône d'un type de lieu — jamais `undefined`, même sur une valeur inconnue. */
export const iconeHub = (t: HubPlaceType | string): IconName =>
  ICONES[t as HubPlaceType] ?? 'hub-relay';

/**
 * Le libellé d'un type de lieu.
 *
 * ⚠️ IL SERT À L'ACCESSIBILITÉ ET AUX FILTRES, PAS À COMPOSER LE NOM. Le nom du
 * hub porte DÉJÀ son type de lieu — il est calculé en base. Le recomposer ici
 * donnerait « Hub Parking Hub Parking La Roubine ».
 */
export const libelleHub = (t: HubPlaceType | string): string =>
  ({
    parking: 'Parking',
    gare: 'Gare',
    station: 'Station',
    entree: 'Entrée',
    rond_point: 'Rond-point',
    commerce: 'Commerce',
    // ⚠️ MOT POUR MOT CEUX DE LA COLONNE CALCULÉE `hubs.name`
    // (`20260907110000`) et de `libelleTypeDeLieu` dans `types/hub.ts`. Trois
    // endroits, une seule orthographe : « Aire de covoiturage », pas « Aire
    // covoiturage ».
    place: 'Place',
    port: 'Port',
    eglise: 'Église',
    aire_covoiturage: 'Aire de covoiturage',
  })[t] ?? 'Point de rendez-vous';
