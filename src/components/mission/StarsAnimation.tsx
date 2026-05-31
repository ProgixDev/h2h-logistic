/**
 * StarsAnimation — small gold sparkle burst shown to the LEFT of the
 * "Nouvelle co-livraison" title (replaces the static ✨ emoji). Loops on its own.
 *
 * The source canvas is wide (5760×3240) with the three stars clustered near the
 * centre, so `cover` crops the empty padding and keeps the sparkles big and
 * visible inside the small square.
 */

import React from 'react';
import LottieView from 'lottie-react-native';

interface StarsAnimationProps {
  /** Rendered square size in px. */
  size?: number;
}

export function StarsAnimation({ size = 40 }: StarsAnimationProps) {
  return (
    <LottieView
      source={require('@/assets/lottie/stars.json')}
      autoPlay
      loop
      resizeMode="cover"
      style={{ width: size, height: size }}
    />
  );
}
