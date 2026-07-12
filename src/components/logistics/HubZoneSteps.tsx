import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { hubZoneDiameterM, hubZoneRadiusM } from '@/constants/hubZone';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import type { Hub } from '@/types/hub';

/** « Comment ça marche » — the 3-step reassurance block from the client infographic. */
interface HubZoneStepsProps {
  hub: Pick<Hub, 'zoneDiameterMeters'>;
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export function HubZoneSteps({ hub }: HubZoneStepsProps) {
  const { colors } = useColorScheme();
  const { t } = useTranslation();

  const diameter = hubZoneDiameterM(hub);
  const radius = Math.round(hubZoneRadiusM(hub));
  const steps = [t('zone.step1'), t('zone.step2'), t('zone.step3')];

  return (
    <View style={s.container}>
      <Text style={[s.title, { color: colors.text }]}>{t('zone.howItWorksTitle')}</Text>

      <View style={s.steps}>
        {steps.map((label, i) => (
          <View key={i} style={s.stepRow}>
            <View style={[s.badge, { backgroundColor: colors.primary + '14' }]}>
              <Text style={[s.badgeText, { color: colors.primary }]}>{i + 1}</Text>
            </View>
            <Text style={[s.stepText, { color: colors.text }]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={[s.reassure, { backgroundColor: colors.success + '12' }]}>
        <Icon name="checkmark-circle" size={15} color={colors.success} />
        <Text style={[s.reassureText, { color: colors.success }]}>{t('zone.reassurance')}</Text>
      </View>

      <Text style={[s.legend, { color: colors.textSecondary }]}>
        {fill(t('zone.legend'), { diameter, radius })}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: Spacing.md },
  title: { ...Typography.bodyMedium },
  steps: { gap: Spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeText: { ...Typography.captionMedium },
  stepText: { ...Typography.caption, flex: 1, lineHeight: 18 },
  reassure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  reassureText: { ...Typography.captionMedium },
  legend: { ...Typography.caption, fontStyle: 'italic' },
});
