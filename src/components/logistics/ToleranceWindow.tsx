import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import dayjs from 'dayjs';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface ToleranceWindowProps {
  scheduledTime: string;
  toleranceMinutes?: number;
  size?: 'compact' | 'full';
}

type Zone = 'before' | 'early' | 'onTime' | 'late' | 'past';

function getZone(scheduledTime: string, tolerance: number): { zone: Zone; minutesUntil: number } {
  const scheduled = dayjs(scheduledTime);
  const now = dayjs();
  const diffMin = scheduled.diff(now, 'minute', true);

  if (diffMin > tolerance) return { zone: 'before', minutesUntil: Math.round(diffMin) };
  if (diffMin > 1) return { zone: 'early', minutesUntil: Math.round(diffMin) };
  if (diffMin >= -1) return { zone: 'onTime', minutesUntil: 0 };
  if (diffMin >= -tolerance) return { zone: 'late', minutesUntil: Math.round(-diffMin) };
  return { zone: 'past', minutesUntil: Math.round(-diffMin) };
}

function getZoneMessage(zone: Zone, minutesUntil: number): string {
  switch (zone) {
    case 'before':
      return `Votre rendez-vous est dans ${minutesUntil} minutes`;
    case 'early':
      return 'Prenez votre temps, vous êtes dans la fenêtre prévue.';
    case 'onTime':
      return "C'est l'heure ! Merci pour votre ponctualité.";
    case 'late':
      return 'Vous êtes dans la fenêtre de tolérance.';
    case 'past':
      return 'La fenêtre est dépassée.';
  }
}

function getDotPosition(scheduledTime: string, tolerance: number): number {
  const scheduled = dayjs(scheduledTime);
  const now = dayjs();
  const diffMin = scheduled.diff(now, 'minute', true);
  // Map -tolerance..+tolerance to 0..1 (center = 0.5)
  const normalized = 0.5 - (diffMin / (tolerance * 2));
  return Math.max(0, Math.min(1, normalized));
}

export function ToleranceWindow({
  scheduledTime,
  toleranceMinutes = 10,
  size = 'full',
}: ToleranceWindowProps) {
  const { colors } = useColorScheme();
  const scheduled = dayjs(scheduledTime);
  const startTime = scheduled.subtract(toleranceMinutes, 'minute').format('HH:mm');
  const centerTime = scheduled.format('HH:mm');
  const endTime = scheduled.add(toleranceMinutes, 'minute').format('HH:mm');

  const { zone, minutesUntil } = getZone(scheduledTime, toleranceMinutes);
  const dotPos = getDotPosition(scheduledTime, toleranceMinutes);
  const message = getZoneMessage(zone, minutesUntil);

  const zoneColor =
    zone === 'onTime' ? colors.success
    : zone === 'past' ? colors.error
    : zone === 'late' ? colors.warning
    : colors.primary;

  // Pulsing dot
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.35,
  }));

  if (size === 'compact') {
    return (
      <View style={[cs.container, { backgroundColor: zoneColor + '10' }]}>
        <Text style={[cs.window, { color: zoneColor }]}>
          {startTime} — {centerTime} — {endTime}
        </Text>
        <Text style={[cs.status, { color: zoneColor }]}>
          {zone === 'early' || zone === 'onTime' ? '✓ Dans la fenêtre' : zone === 'past' ? '✗ Dépassée' : `Dans ${minutesUntil} min`}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Visual bar */}
      <View style={styles.barContainer}>
        {/* Left zone (-10) */}
        <View style={[styles.barZone, styles.barLeft, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.barZoneLabel, { color: colors.primary }]}>-{toleranceMinutes}</Text>
        </View>

        {/* Center marker */}
        <View style={[styles.barCenter, { backgroundColor: colors.success }]} />

        {/* Right zone (+10) */}
        <View style={[styles.barZone, styles.barRight, { backgroundColor: colors.warning + '20' }]}>
          <Text style={[styles.barZoneLabel, { color: colors.warning }]}>+{toleranceMinutes}</Text>
        </View>

        {/* Current time dot */}
        <View style={[styles.dotWrapper, { left: `${dotPos * 100}%` }]}>
          <Animated.View style={[styles.dotPulse, { backgroundColor: zoneColor }, pulseStyle]} />
          <View style={[styles.dot, { backgroundColor: zoneColor }]} />
        </View>
      </View>

      {/* Time labels */}
      <View style={styles.timeLabels}>
        <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{startTime}</Text>
        <Text style={[styles.timeLabelCenter, { color: colors.text }]}>{centerTime}</Text>
        <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{endTime}</Text>
      </View>

      {/* Status message */}
      <View style={[styles.messageBox, { backgroundColor: zoneColor + '10' }]}>
        <Text style={[styles.messageText, { color: zoneColor }]}>{message}</Text>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  container: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center', gap: 2 },
  window: { ...Typography.captionMedium },
  status: { ...Typography.caption },
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  // Bar
  barContainer: {
    height: 24,
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'visible',
    position: 'relative',
  },
  barZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  barRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  barCenter: {
    width: 3,
    height: 32,
    marginTop: -4,
    borderRadius: 1.5,
  },
  barZoneLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  // Dot
  dotWrapper: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 24,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // Time labels
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  timeLabel: {
    ...Typography.caption,
  },
  timeLabelCenter: {
    ...Typography.captionMedium,
  },
  // Message
  messageBox: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  messageText: {
    ...Typography.captionMedium,
    textAlign: 'center',
  },
});
