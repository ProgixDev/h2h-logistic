import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import dayjs from 'dayjs';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

type Phase = 'pickup' | 'delivery' | 'completed';

interface ScheduleReminderCardProps {
  pickupTime: string;
  pickupHubName: string;
  deliveryTime: string;
  deliveryHubName: string;
  pickupActualTime?: string;
  phase: Phase;
}

function formatHour(iso: string): string {
  const d = dayjs(iso);
  const h = d.hour();
  const m = d.minute();
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatLate(ms: number): string {
  const totalSec = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

export function ScheduleReminderCard({
  pickupTime,
  pickupHubName,
  deliveryTime,
  deliveryHubName,
  pickupActualTime,
  phase,
}: ScheduleReminderCardProps) {
  const { colors } = useColorScheme();

  const targetISO = phase === 'delivery' ? deliveryTime : pickupTime;
  const [remainingMs, setRemainingMs] = useState<number>(() => dayjs(targetISO).diff(dayjs()));

  useEffect(() => {
    if (phase === 'completed') return;
    const tick = () => setRemainingMs(dayjs(targetISO).diff(dayjs()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetISO, phase]);

  const pulse = useSharedValue(1);
  const isUrgent = remainingMs > 0 && remainingMs < 10 * 60 * 1000;
  const isOverdue = remainingMs <= 0;

  useEffect(() => {
    if (isUrgent) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
    return () => {
      cancelAnimation(pulse);
    };
  }, [isUrgent]);

  const chipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (phase === 'completed') return null;

  const pickupTimeLabel = formatHour(pickupTime);
  const deliveryTimeLabel = formatHour(deliveryTime);

  const pickupLine = `Prise en charge au vendeur à ${pickupTimeLabel} au hub ${pickupHubName}`;
  const deliveryLine = `Remise prévue à ${deliveryTimeLabel} au hub ${deliveryHubName}`;

  const countdownLabel = isOverdue ? 'Bientôt' : formatCountdown(remainingMs);
  const lateLabel = `Léger retard — ${formatLate(remainingMs)}`;

  const chipBg = isOverdue ? colors.primary : colors.warning;
  const topTextColor = isUrgent ? colors.warningDark : colors.text;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.warning,
          shadowColor: '#000',
        },
      ]}
      accessibilityRole="summary"
    >
      {/* Left: icon */}
      <View style={[styles.iconCircle, { backgroundColor: colors.warning }]}>
        <Icon name="hourglass" size={22} color="#FFFFFF" />
      </View>

      {/* Right: text + countdown */}
      <View style={styles.textCol}>
        {/* TOP ROW — current focus with live countdown */}
        {phase === 'pickup' ? (
          <>
            <View style={styles.topRow}>
              <Text style={[styles.topText, { color: topTextColor, flex: 1 }]} numberOfLines={2}>
                {pickupLine}, dans{' '}
              </Text>
              <Animated.View style={[styles.chip, { backgroundColor: chipBg }, chipAnimStyle]}>
                <Text style={styles.chipText}>{countdownLabel}</Text>
              </Animated.View>
            </View>
            {isOverdue && (
              <Text style={[styles.hint, { color: colors.warningDark }]}>{lateLabel}, pas de souci</Text>
            )}
            {/* BOTTOM — delivery info */}
            <Text style={[styles.bottomText, { color: colors.textSecondary }]} numberOfLines={2}>
              {deliveryLine}
            </Text>
          </>
        ) : (
          <>
            {/* Pickup confirmed */}
            <View style={styles.confirmRow}>
              <Icon name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[styles.confirmText, { color: colors.success }]} numberOfLines={1}>
                Pris en charge{pickupActualTime ? ` à ${formatHour(pickupActualTime)}` : ''}
              </Text>
            </View>
            {/* TOP ROW — delivery countdown */}
            <View style={styles.topRow}>
              <Text style={[styles.topText, { color: topTextColor, flex: 1 }]} numberOfLines={2}>
                {deliveryLine}, dans{' '}
              </Text>
              <Animated.View style={[styles.chip, { backgroundColor: chipBg }, chipAnimStyle]}>
                <Text style={styles.chipText}>{countdownLabel}</Text>
              </Animated.View>
            </View>
            {isOverdue && (
              <Text style={[styles.hint, { color: colors.warningDark }]}>{lateLabel}, pas de souci</Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topText: {
    ...Typography.bodyMedium,
    lineHeight: 20,
  },
  bottomText: {
    ...Typography.caption,
    lineHeight: 18,
  },
  hint: {
    ...Typography.caption,
    fontStyle: 'italic',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    minWidth: 72,
    alignItems: 'center',
  },
  chipText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmText: {
    ...Typography.captionMedium,
  },
});
