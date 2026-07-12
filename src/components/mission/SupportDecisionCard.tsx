import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import type { SupportOutcome } from '@/types/mission';

/** Reflects the support decision + payment outcome to the co-transporteur. */
interface SupportDecisionCardProps {
  outcome: SupportOutcome;
  pedagogicalReminder?: boolean;
  /** true once the counterparty pair is separated (§6). */
  separated?: boolean;
}

export function SupportDecisionCard({ outcome, pedagogicalReminder, separated }: SupportDecisionCardProps) {
  const { colors } = useColorScheme();
  const { t } = useTranslation();

  const config: Record<SupportOutcome, { label: string; effect: string; color: string; icon: 'checkmark-circle' | 'shield' | 'alert-circle' }> = {
    danger_confirmed: {
      label: t('support.outcomeDanger'),
      effect: t('support.effectPaid'),
      color: colors.success,
      icon: 'checkmark-circle',
    },
    good_faith: {
      label: t('support.outcomeGoodFaith'),
      effect: t('support.effectNoSanction'),
      color: colors.primary,
      icon: 'shield',
    },
    abusive: {
      label: t('support.outcomeAbusive'),
      effect: t('support.effectUnpaid'),
      color: colors.error,
      icon: 'alert-circle',
    },
  };

  const c = config[outcome];

  return (
    <View style={[s.card, { backgroundColor: c.color + '10', borderColor: c.color + '30' }]}>
      <View style={s.titleRow}>
        <Icon name={c.icon} size={18} color={c.color} />
        <Text style={[s.title, { color: c.color }]}>{t('support.decisionTitle')}</Text>
      </View>
      <Text style={[s.outcome, { color: colors.text }]}>{c.label}</Text>
      <Text style={[s.effect, { color: colors.textSecondary }]}>{c.effect}</Text>
      {outcome === 'good_faith' && pedagogicalReminder && (
        <Text style={[s.note, { color: colors.textSecondary }]}>{t('support.pedagogicalReminder')}</Text>
      )}
      {separated && (
        <Text style={[s.note, { color: colors.textSecondary }]}>{t('support.separatedNote')}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  title: { ...Typography.captionMedium, letterSpacing: 0.3 },
  outcome: { ...Typography.bodyMedium },
  effect: { ...Typography.caption, lineHeight: 18 },
  note: { ...Typography.caption, lineHeight: 18, fontStyle: 'italic', marginTop: 2 },
});
