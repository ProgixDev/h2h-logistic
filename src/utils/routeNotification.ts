// OÙ UN AVIS PEUT EMMENER LE COTRANSPORTEUR.
//
// ⚠️ UNE FONCTION PURE, DANS `utils` : le tap d'un push et le tap d'une ligne de
// l'écran Notifications passent par elle, et les essais l'importent sous Node.
//
// 🔴 LA BASE PARTAGE SES AVIS ENTRE TROIS APPLICATIONS. Une route de la place de
// marché (`/order/…`, `/courtage/…`) n'existe pas ici : la suivre ouvrirait
// l'écran « page introuvable » d'expo-router. Le serveur adresse désormais chaque
// push à une seule application (`notifications.app`), mais la LISTE des avis, elle,
// montre aussi les anciens : on n'ouvre que ce que cette application sait ouvrir.

/** Les écrans de cette application qu'un avis peut désigner. */
const ROUTES_DU_COTRANSPORTEUR = /^\/(proposition|mission)([/?]|$)/;

/**
 * La route à suivre, ou `null`.
 *
 * ⚠️ UNE CHARGE UTILE EST UNE DONNÉE REÇUE : on ne suit qu'une route interne
 * connue — jamais un `http…`, qui ferait de la notification un tremplin.
 */
export function routeSuivable(route: unknown): string | null {
  if (typeof route !== 'string') return null;
  return ROUTES_DU_COTRANSPORTEUR.test(route) ? route : null;
}
