import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  RESPONSIBILITY_LABEL,
  type EffectSeverity,
  type IncidentEffect,
  type IncidentScenario,
} from '@/services/mock/incidentsProtocol';

interface IncidentScenarioCardProps {
  scenario: IncidentScenario;
}

export function IncidentScenarioCard({ scenario }: IncidentScenarioCardProps) {
  const { colors } = useColorScheme();

  const responsibleColor =
    scenario.responsible === 'transporter'
      ? colors.error
      : scenario.responsible === 'shared'
        ? colors.warning
        : colors.warningDark;

  return (
    <Card style={{ ...styles.card, borderColor: responsibleColor + '40' }}>
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.numberBadge,
            { backgroundColor: responsibleColor + '18', borderColor: responsibleColor + '55' },
          ]}
        >
          <Text style={[styles.numberText, { color: responsibleColor }]}>
            {scenario.number}
          </Text>
        </View>
        <View style={styles.headerText}>
          <View
            style={[
              styles.responsibleBadge,
              { backgroundColor: responsibleColor + '14' },
            ]}
          >
            <Icon name="shield" size={11} color={responsibleColor} />
            <Text style={[styles.responsibleLabel, { color: responsibleColor }]}>
              Responsable : {RESPONSIBILITY_LABEL[scenario.responsible]}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{scenario.title}</Text>
        </View>
      </View>

      {/* Situation */}
      <Section
        iconName="info"
        label="Situation"
        accentColor={colors.textSecondary}
      >
        <BulletList items={scenario.situation} />
      </Section>

      {/* Consequence */}
      <Section iconName="flag" label="Conséquence" accentColor={responsibleColor}>
        <View
          style={[
            styles.consequenceBox,
            {
              backgroundColor: responsibleColor + '0F',
              borderLeftColor: responsibleColor,
            },
          ]}
        >
          <Text style={[styles.consequenceText, { color: colors.text }]}>
            {scenario.consequence}
          </Text>
        </View>
      </Section>

      {/* Effects */}
      <Section iconName="clipboard" label="Effets" accentColor={colors.primary}>
        <View style={styles.effectsList}>
          {scenario.effects.map((effect, idx) => (
            <EffectRow key={idx} effect={effect} />
          ))}
        </View>
      </Section>

      {/* Sub-case (scenario 2) */}
      {scenario.subCase && (
        <View
          style={[
            styles.subCase,
            { borderColor: colors.warning + '40', backgroundColor: colors.warning + '08' },
          ]}
        >
          <View style={styles.subCaseHeader}>
            <Icon name="alert-circle" size={14} color={colors.warning} />
            <Text style={[styles.subCaseTitle, { color: colors.warning }]}>
              {scenario.subCase.title}
            </Text>
          </View>
          <Text style={[styles.subCaseDesc, { color: colors.textSecondary }]}>
            {scenario.subCase.description}
          </Text>
          <View style={styles.effectsList}>
            {scenario.subCase.effects.map((effect, idx) => (
              <EffectRow key={idx} effect={effect} />
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

/* ───────────────────── Sub-components ───────────────────── */

interface SectionProps {
  iconName: React.ComponentProps<typeof Icon>['name'];
  label: string;
  accentColor: string;
  children: React.ReactNode;
}

function Section({ iconName, label, accentColor, children }: SectionProps) {
  const { colors } = useColorScheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name={iconName} size={14} color={accentColor} />
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {label.toUpperCase()}
        </Text>
      </View>
      {children}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  const { colors } = useColorScheme();
  return (
    <View style={styles.bulletList}>
      {items.map((item, idx) => (
        <View key={idx} style={styles.bulletRow}>
          <View style={[styles.bullet, { backgroundColor: colors.textSecondary }]} />
          <Text style={[styles.bulletText, { color: colors.text }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function EffectRow({ effect }: { effect: IncidentEffect }) {
  const { colors } = useColorScheme();
  const tone = SEVERITY_TONE(effect.severity, colors);

  return (
    <View style={styles.effectRow}>
      <View style={[styles.effectDot, { backgroundColor: tone.dot }]} />
      <Text style={[styles.effectText, { color: colors.text }]}>{effect.label}</Text>
    </View>
  );
}

function SEVERITY_TONE(
  severity: EffectSeverity,
  colors: ReturnType<typeof useColorScheme>['colors'],
) {
  switch (severity) {
    case 'critical':
      return { dot: colors.error };
    case 'warning':
      return { dot: colors.warning };
    case 'positive':
      return { dot: colors.success };
    case 'info':
    default:
      return { dot: colors.textSecondary };
  }
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.lg,
    borderWidth: 1.5,
  },

  header: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    lineHeight: 22,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  responsibleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  responsibleLabel: {
    ...Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  title: {
    ...Typography.h3,
  },

  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    ...Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
  },

  bulletList: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
  },
  bulletText: {
    ...Typography.body,
    flex: 1,
    lineHeight: 22,
  },

  consequenceBox: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderLeftWidth: 3,
    borderRadius: BorderRadius.sm,
  },
  consequenceText: {
    ...Typography.bodyMedium,
    lineHeight: 22,
  },

  effectsList: {
    gap: 6,
  },
  effectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  effectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  effectText: {
    ...Typography.body,
    flex: 1,
    lineHeight: 22,
  },

  subCase: {
    marginTop: Spacing.xs,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  subCaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subCaseTitle: {
    ...Typography.bodyMedium,
    fontSize: 13,
  },
  subCaseDesc: {
    ...Typography.caption,
    lineHeight: 18,
  },
});
