import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IncidentScenarioCard } from '@/components/logistics/IncidentScenarioCard';
import { PrincipleChip } from '@/components/logistics/PrincipleChip';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  INCIDENT_PRINCIPLES,
  INCIDENT_SCENARIOS,
} from '@/services/mock/incidentsProtocol';

export default function IncidentsProtocolScreen() {
  const { colors } = useColorScheme();

  return (
    <SafeAreaWrapper>
      <Header title="Protocole incidents" showBack />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero intro */}
        <View style={styles.hero}>
          <View
            style={[
              styles.heroBadge,
              {
                backgroundColor: colors.primary + '10',
                borderColor: colors.primary + '30',
              },
            ]}
          >
            <Icon name="shield" size={12} color={colors.primary} />
            <Text style={[styles.heroBadgeText, { color: colors.primary }]}>
              HandtoHand Logistic
            </Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Règles de responsabilité du réseau
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Ce protocole encadre les incidents du réseau HandtoHand Logistic. Chaque acteur
            dispose d’obligations, de délais, de responsabilités, de sanctions et de procédures
            simples et traçables.
          </Text>
        </View>

        {/* Quick legend */}
        <Card style={{ backgroundColor: colors.primary + '06' }}>
          <View style={styles.legendHeader}>
            <Icon name="info" size={14} color={colors.primary} />
            <Text style={[styles.legendTitle, { color: colors.text }]}>
              Lecture rapide
            </Text>
          </View>
          <View style={styles.legendList}>
            <LegendRow
              dotColor={colors.error}
              label="Faute imputée au cotransporteur particulier"
            />
            <LegendRow
              dotColor={colors.warningDark}
              label="Faute imputée au relais"
            />
            <LegendRow
              dotColor={colors.warning}
              label="Responsabilité partagée"
            />
            <LegendRow
              dotColor={colors.success}
              label="Effet positif (acheteur, vendeur, cotransporteur particulier)"
            />
          </View>
        </Card>

        {/* Section header — scenarios */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Scénarios d’incidents
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Trois cas couvrent l’essentiel des incidents observés sur le réseau. Chacun précise
            la situation, la conséquence et les effets.
          </Text>
        </View>

        {INCIDENT_SCENARIOS.map((scenario) => (
          <IncidentScenarioCard key={scenario.id} scenario={scenario} />
        ))}

        {/* Section header — principles */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Principes du protocole
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Huit principes guident l’application du protocole, du scan obligatoire à la
            protection de l’acheteur.
          </Text>
        </View>

        <View style={styles.principles}>
          {INCIDENT_PRINCIPLES.map((p, idx) => (
            <PrincipleChip
              key={idx}
              iconName={p.iconName}
              label={p.label}
              description={p.description}
            />
          ))}
        </View>

        {/* Footer note */}
        <View
          style={[
            styles.footerNote,
            {
              backgroundColor: colors.primary + '08',
              borderColor: colors.primary + '20',
            },
          ]}
        >
          <Icon name="shield" size={16} color={colors.primary} />
          <Text style={[styles.footerNoteText, { color: colors.textSecondary }]}>
            Les sanctions sont progressives et basées sur la traçabilité opérationnelle. Toute
            action — scan, dépôt, retour, suspension — laisse une trace consultable. En cas de
            doute sur un incident en cours, contactez l’équipe support depuis le chat de la
            mission.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

function LegendRow({ dotColor, label }: { dotColor: string; label: string }) {
  const { colors } = useColorScheme();
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.section,
  },

  hero: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  heroBadgeText: {
    ...Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  heroTitle: {
    ...Typography.h1,
    fontSize: 22,
    lineHeight: 30,
  },
  heroSubtitle: {
    ...Typography.body,
    lineHeight: 22,
  },

  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  legendTitle: {
    ...Typography.bodyMedium,
  },
  legendList: {
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
  },

  sectionHeader: {
    gap: 4,
    paddingTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h2,
  },
  sectionHint: {
    ...Typography.caption,
    lineHeight: 18,
  },

  principles: {
    gap: Spacing.sm,
  },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  footerNoteText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
  },
});
