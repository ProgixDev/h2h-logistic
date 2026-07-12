import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { HubZoneMap } from '@/components/logistics/HubZoneMap';
import { HubZoneSteps } from '@/components/logistics/HubZoneSteps';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useHubPresence } from '@/hooks/useHubPresence';
import { hubZoneDiameterM, hubZoneRadiusM } from '@/constants/hubZone';
import { isWithinTolerance } from '@/utils/tolerance';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import type { Hub } from '@/types/hub';

/** Interpolate {token} placeholders in an i18n string (the app's t() is key-only). */
function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

interface HubZoneCheckProps {
  /** The active hub (point central + zone). Only ON-hub — callers skip this off-hub. */
  hub: Hub;
  scheduledTime: string;
  toleranceMinutes?: number;
  /** Presence already recorded → shows the confirmed state instead of the button. */
  confirmed?: boolean;
  /** Records the presence and advances the flow. Receives the ISO timestamp. */
  onConfirm: (isoTimestamp: string) => void;
}

export function HubZoneCheck({
  hub,
  scheduledTime,
  toleranceMinutes = 10,
  confirmed = false,
  onConfirm,
}: HubZoneCheckProps) {
  const { colors } = useColorScheme();
  const { t } = useTranslation();
  const { coords, distanceMeters, inZone, loading, simulation, setSimulation } = useHubPresence(hub);

  const diameter = hubZoneDiameterM(hub);
  const radius = Math.round(hubZoneRadiusM(hub));
  const label = hub.centralPointLabel ?? t('zone.centralPointDefault');
  const withinWindow = isWithinTolerance(scheduledTime, toleranceMinutes);
  const demoForced = simulation !== 'auto';
  const canConfirm = inZone && (withinWindow || (__DEV__ && demoForced)) && !confirmed;

  const statusColor = inZone ? colors.success : colors.warning;
  const distanceTxt = distanceMeters != null ? Math.round(distanceMeters) : '—';

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(new Date().toISOString());
  };

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.titleRow}>
        <Icon name="location-filled" size={16} color={colors.primary} />
        <Text style={[s.title, { color: colors.text }]}>{t('zone.title')}</Text>
      </View>

      {/* Visual zone — point central + circle + your position dot. */}
      <HubZoneMap hub={hub} userCoords={coords} inZone={inZone} />

      {/* Zone status — YOUR presence relative to the point central. */}
      <View style={[s.statusBox, { backgroundColor: statusColor + '14' }]}>
        <Text style={[s.statusText, { color: statusColor }]}>
          {loading
            ? t('zone.locating')
            : inZone
              ? t('zone.inZone')
              : fill(t('zone.outOfZone'), { label, diameter })}
        </Text>
        {!loading && !inZone && (
          <Text style={[s.distanceText, { color: colors.textSecondary }]}>
            {fill(t('zone.distanceAway'), { distance: distanceTxt })}
          </Text>
        )}
      </View>

      <Text style={[s.explainer, { color: colors.textSecondary }]}>
        {fill(t('zone.explainer'), { radius })}
      </Text>

      {/* « Comment ça marche » + reassurance + legend (client infographic). */}
      <HubZoneSteps hub={hub} />

      {confirmed ? (
        <View style={[s.confirmedBox, { backgroundColor: colors.success + '14' }]}>
          <Icon name="checkmark" size={16} color={colors.success} />
          <Text style={[s.confirmedText, { color: colors.success }]}>{t('zone.presenceConfirmed')}</Text>
        </View>
      ) : (
        <>
          <Button
            title={t('zone.confirmPresence')}
            onPress={handleConfirm}
            disabled={!canConfirm}
            variant="gradient"
          />
          {inZone && !withinWindow && !(__DEV__ && demoForced) && (
            <Text style={[s.windowHint, { color: colors.textSecondary }]}>{t('zone.outsideWindow')}</Text>
          )}
        </>
      )}

      {/* TODO(backend): remove before production — dev-only zone simulator */}
      {__DEV__ && (
        <TouchableOpacity
          onPress={() => setSimulation(inZone ? 'out' : 'in')}
          style={[s.devBtn, { borderColor: colors.primary }]}
          accessibilityLabel="Dev: toggle in/out of hub zone"
        >
          <Text style={[s.devText, { color: colors.primary }]}>
            {inZone ? t('zone.devSimOut') : t('zone.devSimIn')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { ...Typography.bodyMedium },
  statusBox: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  statusText: { ...Typography.bodyMedium },
  distanceText: { ...Typography.caption },
  explainer: { ...Typography.caption, lineHeight: 18 },
  confirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  confirmedText: { ...Typography.captionMedium },
  windowHint: { ...Typography.caption, textAlign: 'center', fontStyle: 'italic' },
  devBtn: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderStyle: 'dashed',
  },
  devText: { ...Typography.caption, letterSpacing: 0.3 },
});
