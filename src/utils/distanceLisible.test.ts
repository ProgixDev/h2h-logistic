// L'ÉCRAN DISAIT « 9480024 m ».
//
// 🔴 VU À L'ÉMULATEUR LE 21/09/2026, sur l'écran de récupération du colis :
//
//     Vous êtes à 9480024 m du hub · précision ±5 m
//     Vous étiez à 9535323 m du point central ; la zone fait 60 m.
//
// Le nombre était JUSTE — l'appareil était bien à l'autre bout du monde. Mais
// il faut compter les chiffres pour comprendre qu'on parle de 9 480 km, et
// c'est exactement quand une valeur surprend qu'elle doit se lire d'un coup
// d'œil.
//
// ⚠️ CE QUI SE JOUE N'EST PAS QUE LA LISIBILITÉ. Le cotransporteur décide, sur
// cette ligne, s'il doit se rapprocher ou s'il est au mauvais endroit. Un
// nombre illisible retire l'information au moment où elle sert.
import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceLisible } from './distanceLisible';

const sansEspaces = (s: string) => s.replace(/ /g, ' ');

test('🔴 LE CAS QUI A PRODUIT LE DÉFAUT SE LIT MAINTENANT', () => {
  assert.equal(sansEspaces(distanceLisible(9480024)), '9 480 km');
  assert.equal(sansEspaces(distanceLisible(9535323)), '9 535 km');
});

test('⚠️ DANS LA ZONE D’UN HUB, ON RESTE EN MÈTRES', () => {
  // « 40 m » veut dire quelque chose au cotransporteur ; « 0,04 km » non.
  assert.equal(sansEspaces(distanceLisible(0)), '0 m');
  assert.equal(sansEspaces(distanceLisible(42.4)), '42 m');
  assert.equal(sansEspaces(distanceLisible(120)), '120 m');
  assert.equal(sansEspaces(distanceLisible(999)), '999 m');
});

test('⚠️ LE SEUIL EST À 1 000 m', () => {
  assert.equal(sansEspaces(distanceLisible(1000)), '1,0 km');
  assert.equal(sansEspaces(distanceLisible(2400)), '2,4 km');
});

test('⚠️ UNE DÉCIMALE JUSQU’À 10 km, AUCUNE AU-DELÀ', () => {
  // Sous 10 km, la décimale aide à décider d'y aller à pied.
  assert.equal(sansEspaces(distanceLisible(9900)), '9,9 km');
  assert.equal(sansEspaces(distanceLisible(10000)), '10 km');
  assert.equal(sansEspaces(distanceLisible(160000)), '160 km');
});

test('⚠️ LA VIRGULE, PAS LE POINT — c’est une application française', () => {
  assert.ok(distanceLisible(2400).includes(','));
  assert.ok(!distanceLisible(2400).includes('.'));
});

test('⚠️ UNE DISTANCE ABSENTE NE S’INVENTE PAS', () => {
  // Le GPS peut ne rien rendre : afficher « 0 m » ferait croire qu'on est
  // arrivé, ce qui est exactement le contraire de la vérité.
  assert.equal(distanceLisible(Number.NaN), '—');
  assert.equal(distanceLisible(Number.POSITIVE_INFINITY), '—');
  assert.equal(distanceLisible(-1), '—');
});

test('⚠️ LES ESPACES SONT INSÉCABLES — un nombre ne se coupe pas en fin de ligne', () => {
  assert.ok(distanceLisible(9480024).includes(' '));
  assert.ok(!distanceLisible(9480024).includes(' '));
  assert.ok(!distanceLisible(120).includes(' '));
});
