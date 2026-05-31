/**
 * SandClockAnimation — animated hourglass for the schedule-reminder card.
 *
 * Plays assets/lottie/sandtime.json (sand draining + flip) in place of the
 * static hourglass icon. The source art is square (1000×1000) with the
 * hourglass centred; the full-canvas white background was stripped so it sits
 * transparently inside the amber reminder circle. The white glass body keeps
 * it legible against the orange.
 */

import React from 'react';
import LottieView from 'lottie-react-native';

interface SandClockAnimationProps {
  /** Rendered size in px (square). Sized a bit larger than the 44px circle so
   *  the hourglass fills it; the circle clips the overflow. */
  size?: number;
}

export function SandClockAnimation({ size = 52 }: SandClockAnimationProps) {
  return (
    <LottieView
      source={require('@/assets/lottie/sandtime.json')}
      autoPlay
      loop
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
}
