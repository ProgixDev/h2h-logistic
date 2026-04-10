import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface ProgressStepsProps {
  current: number;
  total: number;
  label?: string;
}

export function ProgressSteps({ current, total, label }: ProgressStepsProps) {
  const { colors } = useColorScheme();

  return (
    <View style={styles.container}>
      {/* Steps row */}
      <View style={styles.stepsRow}>
        {Array.from({ length: total }).map((_, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < current;
          const isCurrent = stepNum === current;
          const isUpcoming = stepNum > current;

          return (
            <React.Fragment key={index}>
              {/* Connector line (before each step except first) */}
              {index > 0 && (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: isCompleted || isCurrent ? colors.primary : colors.border },
                  ]}
                />
              )}

              {/* Step circle */}
              {isCurrent ? (
                <PulsingDot color={colors.primary} />
              ) : (
                <View
                  style={[
                    styles.dot,
                    isCompleted
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
                  ]}
                >
                  {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {current}/{total}{label ? ` — ${label}` : ''}
      </Text>
    </View>
  );
}

function PulsingDot({ color }: { color: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.3,
  }));

  return (
    <View style={styles.pulseWrapper}>
      <Animated.View style={[styles.pulseRing, { backgroundColor: color }, pulseStyle]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

const DOT_SIZE = 14;

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connector: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 10,
  },
  pulseWrapper: {
    width: DOT_SIZE + 8,
    height: DOT_SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: DOT_SIZE + 8,
    height: DOT_SIZE + 8,
    borderRadius: (DOT_SIZE + 8) / 2,
  },
  label: {
    ...Typography.captionMedium,
    textAlign: 'center',
  },
});
