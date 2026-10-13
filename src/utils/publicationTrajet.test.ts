import test from 'node:test';
import assert from 'node:assert/strict';
import { messageDePublication } from '@/utils/publicationTrajet';

test('🔴 UN POINT FERMÉ ENTRE LE CHOIX ET LA PUBLICATION : l’écran dit quoi faire, pas « réessayez »', () => {
  // Le message du déclencheur `arret_sur_un_point_actif` (hand-to-hand `20261013005000`), tel que PostgREST le rend.
  const m = messageDePublication('ce point de rendez-vous n est plus propose : rechargez la liste des points');
  assert.match(m, /n’est plus proposé/);
  assert.match(m, /choisir un autre/);
  assert.doesNotMatch(m, /réessayer/i);
});

test('tout autre refus garde le message d’avant — et le texte du serveur n’est jamais montré tel quel', () => {
  for (const brut of ['authentification requise', 'JWT expired', '', null, undefined]) {
    assert.equal(messageDePublication(brut), 'Impossible de publier le trajet. Veuillez réessayer.');
  }
});
