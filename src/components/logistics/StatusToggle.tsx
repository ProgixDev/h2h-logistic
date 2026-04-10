import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Typography } from '@/constants/Typography';
import { BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { Spacing } from '@/constants/Spacing';

interface StatusToggleProps {
  isOnline: boolean;
  onToggle: () => void;
}

export function StatusToggle({ isOnline, onToggle }: StatusToggleProps) {
  const { colors } = useColorScheme();
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Animated values
  const progress = useSharedValue(isOnline ? 1 : 0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(isOnline ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });

    if (isOnline) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 800, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 800, easing: Easing.in(Easing.cubic) }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [isOnline]);

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(156, 163, 175, 0.12)', 'rgba(16, 185, 129, 0.12)'],
    ),
  }));

  const dotStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['#9CA3AF', '#10B981'],
    ),
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: isOnline ? 0.3 : 0,
    backgroundColor: '#10B981',
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      ['#6B7280', '#10B981'],
    ),
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isOnline) {
      // Going offline — show confirmation
      setShowOfflineConfirm(true);
    } else {
      // Going active — instant
      onToggle();
      setShowToast(true);
    }
  };

  const confirmOffline = () => {
    setShowOfflineConfirm(false);
    onToggle();
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <Animated.View style={[styles.container, containerStyle]}>
          {/* Dot with pulse ring */}
          <View style={styles.dotWrapper}>
            <Animated.View style={[styles.pulseRing, pulseRingStyle]} />
            <Animated.View style={[styles.dot, dotStyle]} />
          </View>

          <Animated.Text style={[styles.label, textStyle]}>
            {isOnline ? 'Actif' : 'Hors ligne'}
          </Animated.Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Offline confirmation bottom sheet */}
      <BottomSheet
        visible={showOfflineConfirm}
        onClose={() => setShowOfflineConfirm(false)}
      >
        <View style={styles.sheetContent}>
          <Icon name="moon" size={48} color={colors.textSecondary} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            Passer hors ligne ?
          </Text>
          <Text style={[styles.sheetDesc, { color: colors.textSecondary }]}>
            Vous ne recevrez plus de propositions de mission tant que vous serez hors ligne.
          </Text>
          <View style={styles.sheetActions}>
            <Button title="Passer hors ligne" onPress={confirmOffline} variant="danger" />
            <Button
              title="Rester actif"
              onPress={() => setShowOfflineConfirm(false)}
              variant="outline"
            />
          </View>
        </View>
      </BottomSheet>

      {/* Active toast */}
      <Toast
        message="Vous êtes de nouveau actif !"
        type="success"
        visible={showToast}
        onHide={() => setShowToast(false)}
        duration={2500}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 124,
    height: 36,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  dotWrapper: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  // Bottom sheet
  sheetContent: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  sheetEmoji: {
    fontSize: 48,
  },
  sheetTitle: {
    ...Typography.h2,
    textAlign: 'center',
  },
  sheetDesc: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  sheetActions: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});
