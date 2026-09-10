// CHERCHER UNE VILLE COMME ON L'ÉCRIT, PAS COMME ELLE EST ORTHOGRAPHIÉE.
//
// ⚠️ PRÈS DE TROIS CENTS VILLES, ET LA MOITIÉ PORTENT UN ACCENT OU UN TIRET :
// « Saint-Raphaël », « Èze », « Roquefort-la-Bédoule ». Quelqu'un qui tape
// « st raphael » au pouce doit la trouver. On compare donc sans accents, sans
// casse, sans ponctuation, et « st » vaut « saint ».

// Les accents combinants (U+0300 à U+036F) que `normalize('NFD')` détache des lettres.
const DIACRITIQUES = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

const simplifier = (s: string): string =>
  s
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bste\b/g, 'sainte')
    .replace(/\bst\b/g, 'saint')
    .trim();

/**
 * Dédoublonne et trie des noms de ville — sans tenir compte de la casse ni des
 * espaces, et dans l'ordre alphabétique FRANÇAIS (« Èze » avec les E).
 */
export function villesDistinctes(villes: readonly (string | null | undefined)[]): string[] {
  const vues = new Map<string, string>();
  for (const v of villes) {
    const propre = v?.trim();
    if (!propre) continue;
    const cle = propre.toLocaleLowerCase('fr');
    if (!vues.has(cle)) vues.set(cle, propre);
  }
  return [...vues.values()].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

/** Vrai si chaque mot tapé commence un mot du nom (« aix prov » → « Aix-en-Provence »). */
export function correspondRecherche(ville: string, recherche: string): boolean {
  const q = simplifier(recherche);
  if (!q) return true;
  const mots = simplifier(ville).split(' ');
  return q.split(' ').every((m) => mots.some((mot) => mot.startsWith(m)));
}
