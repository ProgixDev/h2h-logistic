// AUCUNE ERREUR DE LINT NE SURVIT À `npm test`.
//
// 🔴 POURQUOI ELLE ARRIVE ICI AVEC TROIS SEMAINES DE RETARD. La place de marché
// tient cette garde depuis le 22/08/2026, où deux hooks appelés
// conditionnellement faisaient tomber l'écran de conversation à chaque
// ouverture à froid. Ce dépôt-ci ne l'avait pas — et le 08/09/2026 il portait
// TRENTE-SIX erreurs :
//
//   • 35 × `react/no-unescaped-entities` — des apostrophes droites dans du
//     texte JSX, remplacées par l'apostrophe typographique « ’ », qui est aussi
//     la bonne en français et la convention déjà suivie côté place de marché ;
//   • 1 × `react/display-name` — `OTPInput`, un composant `forwardRef` sans
//     nom, qui apparaissait « ForwardRef » dans les traces d'erreur,
//     c'est-à-dire au moment précis où le nom sert.
//
// 🔴 ET RIEN NE LES SIGNALAIT, EXACTEMENT COMME LÀ-BAS. `npm run lint` existe,
// mais il n'y a NI intégration continue NI crochet de pré-commit dans ce
// dépôt : personne ne l'exécute sauf à y penser. Trente-six erreurs pouvaient
// donc vivre indéfiniment à côté de cent avertissements, invisibles dans le
// bruit — et c'est ce qu'elles ont fait.
//
// ⚠️ ON NE GARDE QUE LA SÉVÉRITÉ 2. Les avertissements sont nombreux et
// délibérément tolérés ; les transformer en échec rendrait la suite
// inexploitable et pousserait à les désactiver en bloc. La configuration a déjà
// tranché : ce qu'elle classe « error », elle le juge indispensable.
//
// ⚠️ ET LES DEUX DÉPÔTS PARTAGENT LA MÊME CONFIGURATION — `eslint.config.js` y
// est identique au caractère près. La différence de résultat ne venait donc pas
// des règles, mais de ce que personne ne les faisait tourner.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

test('🔴 AUCUNE ERREUR DE LINT DANS `src` — sévérité 2 seulement', async () => {
  const { ESLint } = await import('eslint');
  const eslint = new ESLint({ cwd: process.cwd() });
  const resultats = await eslint.lintFiles([join(process.cwd(), 'src')]);

  const erreurs = resultats.flatMap((r) =>
    r.messages
      .filter((m) => m.severity === 2)
      .map((m) => {
        const fichier = r.filePath.replace(process.cwd(), '').replace(/\\/g, '/');
        return `${fichier}:${m.line}  [${m.ruleId ?? 'parse'}] ${m.message}`;
      }),
  );

  assert.equal(
    erreurs.length,
    0,
    `${erreurs.length} erreur(s) de lint :\n  ${erreurs.join('\n  ')}`,
  );
});
