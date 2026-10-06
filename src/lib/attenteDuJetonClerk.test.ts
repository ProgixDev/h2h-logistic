// TOUTE REQUÊTE DU DÉMARRAGE PARTAIT EN « anon », EN SILENCE.
//
// 🔴 LE MÉCANISME. `lib/supabase.ts` demande son jeton à CHAQUE requête et
// concluait « pas de session, donc personne » dès que `peekClerk()` rendait
// null — pendant toute la fenêtre entre le premier rendu et le montage du pont
// Clerk. Une lecture protégée par RLS exécutée en « anon » ne rend pas une
// erreur : elle rend ZÉRO LIGNE. La place de marché l'a vu le 04/09/2026 et
// corrigé ; ce dépôt, qui a le même client, ne l'était pas.
//
// ⚠️ ICI LE CAS QUI COÛTE : un tap sur une proposition de vingt minutes démarre
// l'application à froid, et son écran lit avant que Clerk ait répondu.
import test from 'node:test';
import assert from 'node:assert/strict';

import { clerkCharge, peekClerk, setClerk, reinitialiserAttenteClerk } from '@/lib/clerkBridge';
import { lireCode } from '@/utils/sansCommentaires';

/** Une instance Clerk réduite à ce que l'attente regarde. */
const clerkFactice = (loaded: boolean, session: unknown = null) =>
  ({ loaded, session }) as unknown as Parameters<typeof setClerk>[0];

function remettreAZero() {
  setClerk(null);
  reinitialiserAttenteClerk();
}

test('⚠️ CLERK DÉJÀ CHARGÉ : on ne fait attendre personne', async () => {
  remettreAZero();
  setClerk(clerkFactice(true));
  const debut = Date.now();
  await clerkCharge();
  assert.ok(Date.now() - debut < 20, 'une requête a été retardée alors que Clerk avait répondu');
  remettreAZero();
});

test('🔴 CLERK PAS ENCORE MONTÉ : on attend, on ne conclut pas « personne »', async () => {
  remettreAZero();
  assert.equal(peekClerk(), null, 'le pont ne devrait pas encore être monté');
  let resolue = false;
  const attente = clerkCharge().then(() => { resolue = true; });
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(resolue, false, 'l’attente s’est terminée avant que Clerk ait répondu');
  setClerk(clerkFactice(true));
  await attente;
  assert.equal(resolue, true, 'l’attente ne s’est pas terminée une fois Clerk chargé');
  remettreAZero();
});

test('🔴 MONTÉ MAIS PAS ENCORE CHARGÉ : on attend `loaded`, pas la présence de l’instance', async () => {
  // ⚠️ `setClerk` est appelé au montage du pont, mais `loaded` bascule PLUS
  // TARD, sur la même instance. Attendre seulement l'instance rouvrirait le trou.
  remettreAZero();
  const clerk = { loaded: false, session: null };
  setClerk(clerk as unknown as Parameters<typeof setClerk>[0]);
  let resolue = false;
  const attente = clerkCharge().then(() => { resolue = true; });
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(resolue, false, 'l’attente s’est terminée sur une instance encore en cours de chargement');
  clerk.loaded = true;
  await attente;
  assert.equal(resolue, true, 'l’attente n’a pas vu `loaded` basculer');
  remettreAZero();
});

test('🔴 UNE SEULE ATTENTE POUR TOUTE L’APPLICATION', () => {
  remettreAZero();
  const a = clerkCharge();
  const b = clerkCharge();
  assert.equal(a, b, 'chaque appelant ouvre sa propre attente');
  remettreAZero();
});

test('🔴 LE CLIENT SUPABASE ATTEND AVANT DE LIRE LA SESSION', () => {
  // ⚠️ L'ORDRE EST LA CORRECTION ENTIÈRE : lire `peekClerk()` d'abord, c'est
  // exactement l'ancien comportement.
  const src = lireCode('src/lib/supabase.ts');
  const debut = src.indexOf('accessToken:');
  assert.ok(debut > 0, '`accessToken` est introuvable');
  const corps = src.slice(debut, debut + 400);
  const posAttente = corps.indexOf('await clerkCharge()');
  const posLecture = corps.indexOf('peekClerk()');
  assert.ok(posAttente > 0, '`accessToken` n’attend plus que Clerk ait répondu');
  assert.ok(posAttente < posLecture, '`accessToken` lit la session AVANT d’attendre');
  assert.match(src, /getToken\(\{ template: 'supabase' \}\)/, 'le gabarit « supabase » n’est plus demandé');
});
