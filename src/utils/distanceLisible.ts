// UNE DISTANCE SE LIT, ELLE NE SE COMPTE PAS EN MÈTRES JUSQU'À L'INFINI.
//
// 🔴 CE QUE L'ÉMULATEUR A AFFICHÉ LE 21/09/2026, sur l'écran de récupération :
//
//     Vous êtes à 9480024 m du hub · précision ±5 m
//     Vous étiez à 9535323 m du point central ; la zone fait 60 m.
//
// Neuf millions de mètres. Personne ne lit ça : il faut compter les chiffres
// pour comprendre qu'on parle de 9 480 km. Le nombre était juste — l'appareil
// était bien à l'autre bout du monde — et c'est justement quand la valeur
// surprend qu'elle doit se lire du premier coup d'œil.
//
// ⚠️ LE SEUIL EST À 1 000 m, ET LES MÈTRES RESTENT ENTIERS EN DESSOUS. Dans la
// zone d'un hub on raisonne en pas : « 40 m » veut dire quelque chose,
// « 0,04 km » non. Au-dessus, on passe au kilomètre — une décimale jusqu'à
// 10 km (« 2,4 km » aide à décider d'y aller à pied), aucune au-delà.
//
// ⚠️ L'ESPACE INSÉCABLE N'EST PAS UNE COQUETTERIE : sans lui, « 9 480 km » se
// coupe en fin de ligne et le nombre se lit en deux morceaux.
const INSECABLE = ' ';

export function distanceLisible(metres: number): string {
  if (!Number.isFinite(metres) || metres < 0) return '—';
  if (metres < 1000) return `${Math.round(metres)}${INSECABLE}m`;

  const km = metres / 1000;
  if (km < 10) {
    // `toFixed(1)` rend un point décimal ; le français veut une virgule.
    return `${km.toFixed(1).replace('.', ',')}${INSECABLE}km`;
  }
  // Au-delà de 10 km, les groupes de milliers se séparent pour rester lisibles.
  const arrondi = Math.round(km);
  const groupes = String(arrondi).replace(/\B(?=(\d{3})+(?!\d))/g, INSECABLE);
  return `${groupes}${INSECABLE}km`;
}
