import React, { useEffect } from 'react';
import { View, Text, StyleSheet, type ViewStyle, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const TOAST_ICONS: Record<ToastType, IconName> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'alert-circle',
  info: 'info',
};

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  style?: ViewStyle;
}

export function Toast({
  message,
  type = 'info',
  visible,
  onHide,
  duration = 3000,
  style,
}: ToastProps) {
  const { colors } = useColorScheme();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const getBgColor = () => {
    switch (type) {
      case 'success': return colors.success;
      case 'error': return colors.error;
      case 'warning': return colors.warning;
      default: return colors.primary;
    }
  };

  useEffect(() => {
    if (visible) {
      // Slide in
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 300 });

      // Auto dismiss
      translateY.value = withDelay(
        duration,
        withTiming(-100, { duration: 300, easing: Easing.in(Easing.cubic) }),
      );
      opacity.value = withDelay(duration, withTiming(0, { duration: 300 }, () => { runOnJS(onHide)(); }));
    } else {
      translateY.value = -100;
      opacity.value = 0;
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Swipe up to dismiss
  const swipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (e.translationY < -20) {
        translateY.value = withTiming(-100, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => { runOnJS(onHide)(); });
      }
    });

  if (!visible) return null;

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: getBgColor() },
          animStyle,
          style,
        ]}
        accessibilityRole="alert"
        accessibilityLabel={message}
      >
        <Icon name={TOAST_ICONS[type]} size={16} color="#FFFFFF" />
        <Text style={styles.text} numberOfLines={2}>{message}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    zIndex: 9999,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    width: 16,
    height: 16,
  },
  text: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    flex: 1,
  },
});
