// UNE PROPOSITION OU UNE CANDIDATURE DANS LA LISTE DES CO-LIVRAISONS.
//
// ⚠️ ELLE NE RESSEMBLE PAS À UNE MISSION, ET C'EST VOULU. Pas de vendeur, pas de
// colis décrit, pas d'adresse : avant la confirmation, le cotransporteur ne voit
// que ce qu'il lui faut pour décider — villes, format, passages, participation
// (§ 5.2.2 des CGU H2H Logistic).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { PastilleCompteARebours, useMaintenant } from '@/components/mission/CompteARebours';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatCurrency } from '@/utils/formatting';
import { heureParis, libelleColis, libelleJour, libelleStatut, nomDuHub, varianteStatut } from '@/utils/candidatures';
import type { Candidature } from '@/types/candidature';

export function CarteCandidature({ candidature: c }: { candidature: Candidature }) {
  const { colors } = useColorScheme();
  const router = useRouter();
  // Pour « Aujourd’hui » / « Demain » : à la minute suffit.
  const maintenant = useMaintenant(60_000);
  const proposition = c.statut === 'proposee';
  const premier = c.passages?.[0];
  const collecte = proposition ? premier?.collecteLe : c.collecteLe;
  const hub = proposition ? premier?.hubCollecte : c.hubCollecte;
  const echeance = proposition ? c.repondreAvant : c.statut === 'retenue' ? c.validationJusquAu : null;

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/proposition', params: { id: c.id } })}
      activeOpacity={0.8}
      accessibilityLabel={`${libelleStatut(c)}, ${c.villeDepart} vers ${c.villeArrivee}`}
    >
      <Card style={proposition ? { borderColor: colors.goldBorder, borderWidth: 1.5 } : undefined}>
        <View style={s.haut}>
          {proposition ? (
            <View style={[s.pastilleOr, { backgroundColor: colors.gold, borderColor: colors.goldBorder }]}>
              <Text style={s.pastilleOrTexte}>Nouvelle proposition</Text>
            </View>
          ) : (
            <Badge label={libelleStatut(c)} variant={varianteStatut(c)} />
          )}
          {(proposition ? c.passages?.some((p) => p.express) : c.express) && <Badge label="Express" variant="outline" />}
        </View>

        <Text style={[s.trajet, { color: colors.text }]}>
          {c.villeDepart} → {c.villeArrivee}
        </Text>

        {collecte && (
          <View style={s.ligne}>
            <Icon name="time" size={14} color={colors.textSecondary} />
            <Text style={[s.detail, { color: colors.textSecondary }]} numberOfLines={1}>
              {proposition && (c.passages?.length ?? 0) > 1
                ? `${c.passages?.length} passages possibles · le premier ${libelleJour(collecte, maintenant).toLowerCase()} à ${heureParis(collecte)}`
                : `Collecte ${libelleJour(collecte, maintenant).toLowerCase()} à ${heureParis(collecte)} · ${nomDuHub(hub)}`}
            </Text>
          </View>
        )}

        <View style={s.bas}>
          <View style={s.ligne}>
            <Icon name="package" size={14} color={colors.textSecondary} />
            <Text style={[s.detail, { color: colors.textSecondary }]}>{libelleColis(c.format, c.poidsMaxKg)}</Text>
          </View>
          <Text style={[s.participation, { color: colors.primary }]}>
            {formatCurrency(c.participationCents / 100)}
          </Text>
        </View>

        {echeance && (
          <View style={[s.echeance, { borderTopColor: colors.border }]}>
            <Text style={[s.detail, { color: colors.textSecondary }]}>
              {proposition ? 'Répondre avant' : 'Réponse du vendeur avant'} {heureParis(echeance)}
            </Text>
            <PastilleCompteARebours jusquA={echeance} />
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  haut: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  pastilleOr: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  pastilleOrTexte: { ...Typography.captionMedium, color: '#1A1A1E' },
  trajet: { ...Typography.bodyMedium, marginBottom: Spacing.xs },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  detail: { ...Typography.caption, flexShrink: 1 },
  bas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  participation: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, lineHeight: 24 },
  echeance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
});
