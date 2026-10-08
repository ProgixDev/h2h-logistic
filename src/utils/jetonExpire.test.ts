// UN JETON SE LIT À SA DATE — voir `jetonExpire.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { finDuJeton, jetonBientotFini } from '@/utils/jetonExpire';

/** Un jeton au format JWT (en-tête, charge, signature), la charge en base64url sans remplissage. */
function jeton(charge: Record<string, unknown>): string {
  const b64url = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(charge)}.signature`;
}

const MAINTENANT = Date.UTC(2026, 9, 8, 17, 30, 0);
const s = (secondes: number) => Math.floor(MAINTENANT / 1000) + secondes;

test('✅ LA FIN SE LIT DANS LA CHARGE — base64url, sans remplissage', () => {
  assert.equal(finDuJeton(jeton({ sub: 'user_x', exp: s(60) })), s(60));
  // Une charge dont la longueur exige deux « = » de remplissage, et des caractères `-` / `_`.
  assert.equal(finDuJeton(jeton({ sub: 'user_?>?>', role: 'authenticated', exp: s(42) })), s(42));
});

test('🔴 UN JETON PÉRIMÉ, OU SUR LE POINT DE L’ÊTRE, SE REDEMANDE — c’est celui que le cache servait au retour', () => {
  assert.equal(jetonBientotFini(jeton({ exp: s(-30) }), 5, MAINTENANT), true, 'fini depuis 30 s');
  assert.equal(jetonBientotFini(jeton({ exp: s(3) }), 5, MAINTENANT), true, 'finit dans 3 s');
  assert.equal(jetonBientotFini(jeton({ exp: s(50) }), 5, MAINTENANT), false, 'encore 50 s');
});

test('⚠️ UN JETON ILLISIBLE EST TRAITÉ COMME FINI — en redemander un coûte moins qu’une requête refusée', () => {
  assert.equal(finDuJeton('pas-un-jeton'), null);
  assert.equal(finDuJeton('a.%%%.c'), null);
  assert.equal(finDuJeton(jeton({ sub: 'sans exp' })), null);
  assert.equal(jetonBientotFini('pas-un-jeton', 5, MAINTENANT), true);
});
