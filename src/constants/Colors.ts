// Bleu céruléen — voir le commentaire jumeau dans
// `hand-to-hand/src/constants/Colors.ts` : primary #0091C5, sa version foncée
// #00739C, et #38ACD4 en thème sombre. Les deux fichiers bougent ensemble.
//
// 06/09/2026 : le bleu ET le vert ont été éclaircis d'un même pas (+6 points de
// luminosité HSL, teinte et saturation inchangées) à la demande du client. Le
// détail du calcul, et la raison pour laquelle le pas doit rester COMMUN aux
// deux couleurs, sont dans le fichier jumeau.
export const Colors = {
  light: {
    primary: '#0091C5',
    primaryGradientEnd: '#31A17C',
    accent: '#998FC7',
    accentLight: '#D4C2FC',
    background: '#F9F5FF',
    surface: '#FFFFFF',
    text: '#28262C',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F5A623',
    warningDark: '#D88D10',
    warningLight: '#FEF3E0',
    warningBorder: '#F2C78A',
    error: '#EF4444',
    online: '#10B981',
    offline: '#9CA3AF',
    gold: '#D4A017',
    goldDark: '#A87F0A',
    goldLight: '#FEF6E0',
    goldBorder: '#E5C158',
  },
  dark: {
    primary: '#38ACD4',
    primaryGradientEnd: '#3BBF94',
    accent: '#998FC7',
    accentLight: '#3D3654',
    background: '#1A1A1E',
    surface: '#28262C',
    text: '#F9F5FF',
    textSecondary: '#998FC7',
    border: '#3D3654',
    success: '#10B981',
    warning: '#F5A623',
    warningDark: '#D88D10',
    warningLight: '#3A2E10',
    warningBorder: '#F2C78A',
    error: '#EF4444',
    online: '#10B981',
    offline: '#6B7280',
    gold: '#D4A017',
    goldDark: '#A87F0A',
    goldLight: '#3A2E10',
    goldBorder: '#E5C158',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
