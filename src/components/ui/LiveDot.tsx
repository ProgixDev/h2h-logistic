/**
 * LiveDot — a status dot with the "Actif" breathing halo.
 *
 * Reuses the pulse from the header StatusToggle (scale 1 ↔ 2.2, opacity 0.3,
 * looping) so any green "Actif" indicator across the app reads as live. When
 * `pulsing` is false it's just a plain coloured dot — no halo, no animation.
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface LiveDotProps {
  /** When true, a halo breathes around the dot (live/active). */
  pulsing?: boolean;
  /** Dot diameter in px. */
  size?: number;
  /** Dot + halo colour. */
  color?: string;
}

export function LiveDot({ pulsing = true, size = 8, color = '#10B981' }: LiveDotProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (pulsing) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(2.2, { duration: 800, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 800, easing: Easing.in(Easing.cubic) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(pulse);
  }, [pulsing]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: pulsing ? 0.3 : 0,
  }));

  const dot = { width: size, height: size, borderRadius: size / 2, backgroundColor: color };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute' }, dot, ringStyle]} />
      <View style={dot} />
    </View>
  );
}
