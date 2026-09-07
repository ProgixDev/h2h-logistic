// LE MOT « hub » ÉTAIT ÉCRIT DEUX FOIS, ET PARFOIS À TORT.
//
// 🔴 CE QUI S'AFFICHAIT SUR L'APPAREIL LE 07/09/2026, écran « Co-livraison » :
//
//     ACTION SUIVANTE
//     Valider la récupéra…
//     Hub Hub Gare de Nice-Ville          ← le mot deux fois
//
//     Remise prévue le vendredi 4 septembre à 14h36
//     au hub Remise en main propre        ← un « hub » qui n'en est pas un
//
// 🔴 LES DEUX VIENNENT DE LA MÊME CAUSE. `hubs.name` est une colonne GÉNÉRÉE
// qui commence toujours par « Hub », et `types/hub.ts` interdit d'y toucher :
// « JAMAIS RECOMPOSÉ, JAMAIS AMPUTÉ DE SON "Hub" ». Sept endroits composaient
// pourtant leur propre « hub » autour de lui.
//
// ⚠️ ET LA PLACE DE MARCHÉ AVAIT PRIS L'AUTRE MAUVAISE VOIE : un
// `stripHubPrefix()` qui retirait le mot pour que la phrase reste lisible.
// Retirer est aussi faux qu'ajouter — le protocole rend ce mot porteur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { auLieu, nomDuLieu } from '@/utils/lieuRendezVous';

const HUB = { name: 'Hub Gare de Nice-Ville' };
const HORS_HUB_ADRESSE = {
  name: '12 avenue Thiers, Nice',
  isOffHub: true,
  offHubAddress: '12 avenue Thiers, Nice',
};
const MAIN_PROPRE = { name: 'Remise en main propre', isOffHub: true };

test('🔴 LE NOM RESSORT TEL QUEL — son « Hub » n’est ni retiré ni redoublé', () => {
  assert.equal(nomDuLieu(HUB), 'Hub Gare de Nice-Ville');
  // Une seule occurrence, et elle est au début.
  assert.equal((nomDuLieu(HUB).match(/Hub/g) ?? []).length, 1);
});

test('🔴 « au hub Hub … » N’EST PLUS PRODUCTIBLE', () => {
  const phrase = `Remise prévue à 14h36 ${auLieu(HUB)}`;
  assert.equal(phrase, 'Remise prévue à 14h36 au Hub Gare de Nice-Ville');
  assert.ok(!/hub\s+Hub/i.test(phrase), 'le mot est écrit deux fois');
});

test('⚠️ UNE ADRESSE CONVENUE SE DIT AUSSI « au »', () => {
  assert.equal(auLieu(HORS_HUB_ADRESSE), 'au 12 avenue Thiers, Nice');
});

test('🔴 UN RENDEZ-VOUS EN MAIN PROPRE N’EST PAS UN HUB', () => {
  // Le guide autorise un rendez-vous hors hub ; l'appeler « hub » dans la
  // phrase même qui l'annonce défait ce que le mot veut dire.
  assert.equal(auLieu(MAIN_PROPRE), 'en main propre');
  assert.ok(!/hub/i.test(auLieu(MAIN_PROPRE)));
});

// ── La garde de source ─────────────────────────────────────────────────────

const tousLesFichiers = (dir: string, acc: string[] = []): string[] => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) tousLesFichiers(p, acc);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
};

/** Le fichier sans ses commentaires — ceux-ci CITENT le défaut pour l'expliquer. */
const codeSeul = (chemin: string): string =>
  readFileSync(chemin, 'utf8')
    .split('\n')
    .filter((l) => {
      const t = l.trimStart();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*');
    })
    .join('\n');

test('🔴 PLUS AUCUNE PHRASE NE COMPOSE SON PROPRE « hub » AUTOUR D’UN NOM', () => {
  // ⚠️ CE QU'ON CHERCHE : le mot « hub » suivi immédiatement d'une
  // interpolation — `au hub ${nom}` ou `Hub {nom}` en JSX. La prose des écrans
  // d'information (« arrivé au hub ou au point de rendez-vous prévu ») ne
  // correspond pas : elle n'interpole rien.
  const gabarit = /\bhubs?\s+(\$\{|\{[a-zA-Z_])/i;
  const fautifs: string[] = [];
  for (const chemin of tousLesFichiers(join(process.cwd(), 'src'))) {
    for (const [i, ligne] of codeSeul(chemin).split('\n').entries()) {
      if (gabarit.test(ligne)) {
        fautifs.push(`${chemin.replace(process.cwd(), '.')} : ${ligne.trim()}`);
      }
    }
  }
  assert.deepEqual(fautifs, [], `gabarits « hub {nom} » :\n${fautifs.join('\n')}`);
});
