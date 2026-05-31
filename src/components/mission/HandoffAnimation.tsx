/**
 * HandoffAnimation — the H2H "main à main" gesture.
 *
 * Plays the hand-to-hand delivery Lottie (assets/lottie/handoff.json) on the
 * "ACTION SUIVANTE · Remise" card, in place of the old flag icon. Loops on its
 * own. The source art is square (500×500), so width === height.
 */

import React from 'react';
import LottieView from 'lottie-react-native';

interface HandoffAnimationProps {
  /** Rendered size in px (square). Defaults to fill the 72px action-card circle. */
  size?: number;
}

export function HandoffAnimation({ size = 64 }: HandoffAnimationProps) {
  return (
    <LottieView
      source={require('@/assets/lottie/handoff.json')}
      autoPlay
      loop
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
}
