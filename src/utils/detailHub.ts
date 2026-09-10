// LA VILLE SOUS LE DÉTAIL — une fois, pas deux.
//
// 🔴 « MARSEILLE » S'AFFICHAIT DEUX FOIS PAR CARTE (vu à l'émulateur le
// 10/09/2026). Le détail affiché s'écrit « Voie, Commune » — « Chemin du Génie,
// Marseille » — et les cartes ajoutaient la ville en dessous. Mais tous les
// détails ne portent pas la commune (« Parking ouvert, côté entrée
// principale ») : on ne la retire pas partout, on ne l'ajoute que si elle manque.

// Les accents combinants (U+0300 à U+036F) que `normalize('NFD')` détache des lettres.
const DIACRITIQUES = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

const simplifier = (s: string): string =>
  s
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** La ville à écrire sous le détail, ou `''` s'il la nomme déjà. */
export function villeSiAbsente(detail: string | null | undefined, ville: string | null | undefined): string {
  const v = ville?.trim() ?? '';
  if (!v) return '';
  if (!detail) return v;
  return ` ${simplifier(detail)} `.includes(` ${simplifier(v)} `) ? '' : v;
}
