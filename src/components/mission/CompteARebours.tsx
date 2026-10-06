// LE TEMPS QUI RESTE AVANT UNE ÉCHÉANCE DE LA MISE EN RELATION.
//
// ⚠️ IL NE DÉCIDE RIEN. Le délai de vingt minutes se vérifie en base, au moment
// du geste (§ 5.2.10 des CGU H2H Logistic) : ce compteur ne fait que le montrer,
// à la seconde, avec l'heure limite — « l'Application affiche le temps restant
// et l'heure limite » (§ 5.2.4, § 5.2.7).
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { heureParis, tempsRestant } from '@/utils/candidatures';

/** Sous ce seuil, le compteur passe au rouge. */
const URGENT_MS = 3 * 60_000;

/**
 * L'heure, relue à intervalle — pour qu'un écran voie passer une échéance, ou minuit.
 *
 * ⚠️ UN ÉTAT, PAS UN `Date.now()` LU PENDANT LE RENDU : le React Compiler peut
 * mémoïser un appel sans dépendance réactive, et l'heure du premier rendu
 * resterait celle de l'écran pour toujours.
 */
export function useMaintenant(intervalleMs = 1000): number {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(Date.now()), intervalleMs);
    return () => clearInterval(minuteur);
  }, [intervalleMs]);
  return maintenant;
}

/** La pastille compacte des listes : « 12 min 05 s », ou « Délai dépassé ». */
export function PastilleCompteARebours({ jusquA }: { jusquA: string }) {
  const { colors } = useColorScheme();
  const maintenant = useMaintenant();
  const reste = tempsRestant(jusquA, maintenant);
  const urgent = reste === null || new Date(jusquA).getTime() - maintenant < URGENT_MS;
  const teinte = urgent ? colors.error : colors.textSecondary;
  return (
    <View style={[s.pastille, { backgroundColor: teinte + '15' }]}>
      <Icon name="hourglass" size={12} color={teinte} />
      <Text style={[s.pastilleTexte, { color: teinte }]}>{reste ?? 'Délai dépassé'}</Text>
    </View>
  );
}

/** Le bloc des écrans de détail : l'heure limite, et le temps qui reste en grand. */
export function BlocCompteARebours({ jusquA, libelle }: { jusquA: string; libelle: string }) {
  const { colors } = useColorScheme();
  const maintenant = useMaintenant();
  const reste = tempsRestant(jusquA, maintenant);
  const urgent = reste === null || new Date(jusquA).getTime() - maintenant < URGENT_MS;
  return (
    <View
      style={[
        s.bloc,
        {
          backgroundColor: urgent ? colors.error + '10' : colors.surface,
          borderColor: urgent ? colors.error + '40' : colors.border,
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <Text style={[s.blocLibelle, { color: urgent ? colors.error : colors.textSecondary }]}>
        {libelle} {heureParis(jusquA)}
      </Text>
      <Text style={[s.blocValeur, { color: urgent ? colors.error : colors.text }]}>
        {reste ?? 'Délai dépassé'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  pastille: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  pastilleTexte: { ...Typography.captionMedium },
  bloc: { alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, gap: Spacing.xs },
  blocLibelle: { ...Typography.caption },
  blocValeur: { fontFamily: 'Poppins_700Bold', fontSize: 28, lineHeight: 36 },
});
