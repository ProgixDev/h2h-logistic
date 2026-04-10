import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

// ─── Base Shimmer ─────────────────────────────────────────

interface SkeletonProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = BorderRadius.sm, style }: SkeletonProps) {
  const { colors } = useColorScheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.25, 0.55]),
  }));

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor: colors.border }, animStyle, style]}
      accessibilityLabel="Chargement"
      accessibilityRole="progressbar"
    />
  );
}

// ─── Preset: Mission Card ─────────────────────────────────

export function MissionCardSkeleton() {
  return (
    <View style={presets.card}>
      <View style={presets.row}>
        <Skeleton width="60%" height={16} />
        <Skeleton width={60} height={22} borderRadius={BorderRadius.full} />
      </View>
      <Skeleton width="80%" height={12} />
      <Skeleton width="50%" height={12} />
      <View style={presets.row}>
        <Skeleton width="40%" height={12} />
        <Skeleton width={50} height={16} />
      </View>
    </View>
  );
}

// ─── Preset: Route Card ───────────────────────────────────

export function RouteCardSkeleton() {
  return (
    <View style={presets.card}>
      <View style={presets.row}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Skeleton width={8} height={8} borderRadius={4} />
          <Skeleton width={140} height={16} />
        </View>
        <Skeleton width={54} height={22} borderRadius={BorderRadius.full} />
      </View>
      <Skeleton width="90%" height={12} />
      <View style={presets.row}>
        <Skeleton width="35%" height={12} />
        <Skeleton width="35%" height={12} />
      </View>
      <View style={presets.row}>
        <Skeleton width="40%" height={12} />
        <Skeleton width={60} height={12} />
      </View>
    </View>
  );
}

// ─── Preset: Earnings Card ────────────────────────────────

export function EarningsCardSkeleton() {
  return (
    <View style={presets.earningsCard}>
      <Skeleton width={80} height={14} />
      <Skeleton width={120} height={36} borderRadius={BorderRadius.sm} />
      <Skeleton width={100} height={12} />
    </View>
  );
}

// ─── Preset: Dashboard Sections ───────────────────────────

export function DashboardSkeleton() {
  return (
    <View style={presets.dashboard}>
      <EarningsCardSkeleton />
      <View style={presets.sectionHeader}>
        <Skeleton width={140} height={16} />
        <Skeleton width={50} height={12} />
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.md }}>
        <MissionCardSkeleton />
      </View>
      <View style={presets.sectionHeader}>
        <Skeleton width={120} height={16} />
        <Skeleton width={50} height={12} />
      </View>
      <View style={presets.statsRow}>
        <Skeleton width="30%" height={64} borderRadius={BorderRadius.md} />
        <Skeleton width="30%" height={64} borderRadius={BorderRadius.md} />
        <Skeleton width="30%" height={64} borderRadius={BorderRadius.md} />
      </View>
    </View>
  );
}

const presets = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  dashboard: {
    gap: Spacing.xxl,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
