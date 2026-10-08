// UN JETON SE LIT À SA DATE — pas à celle du cache qui le garde.
//
// 🔴 VU À L'ÉMULATEUR LE 08/10/2026, DANS LES DEUX APPLICATIONS : au retour de
// l'arrière-plan, la première requête partait avec un jeton périmé et revenait
// en « JWT expired » — la liste des co-livraisons affichait l'erreur, deux fois.
// Clerk évince son cache de jetons par un minuteur, et un minuteur ne tourne pas
// pendant que l'application est suspendue : le jeton de 60 secondes restait
// servi bien après sa fin.
//
// ⚠️ DANS `utils`, PAS DANS LE CLIENT : le client Supabase exige les variables
// d'environnement à l'import, et cette règle doit être éprouvée sans elles.

/** Ce que le jeton dit de sa fin (`exp`, en secondes), ou `null` s'il ne se lit pas. */
export function finDuJeton(jeton: string): number | null {
  const charge = jeton.split('.')[1];
  if (!charge) return null;
  try {
    const base64 = charge.replace(/-/g, '+').replace(/_/g, '/');
    const complet = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const exp = (JSON.parse(atob(complet)) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

/**
 * Le jeton finit-il dans moins de `margeSecondes` ? Un jeton illisible est
 * traité comme fini : en redemander un coûte un aller-retour, en garder un
 * mauvais coûte une requête refusée.
 */
export function jetonBientotFini(jeton: string, margeSecondes: number, maintenantMs = Date.now()): boolean {
  const fin = finDuJeton(jeton);
  if (fin === null) return true;
  return fin * 1000 - maintenantMs < margeSecondes * 1000;
}
