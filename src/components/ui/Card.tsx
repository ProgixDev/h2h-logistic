import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const { colors } = useColorScheme();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
      accessibilityRole="summary"
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
});
