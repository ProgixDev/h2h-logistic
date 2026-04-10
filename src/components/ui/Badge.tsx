import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'outline';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const { colors } = useColorScheme();

  const getColors = () => {
    switch (variant) {
      case 'success': return { bg: colors.success + '20', text: colors.success };
      case 'warning': return { bg: colors.warning + '20', text: colors.warning };
      case 'error': return { bg: colors.error + '20', text: colors.error };
      case 'outline': return { bg: 'transparent', text: colors.primary };
      default: return { bg: colors.accentLight, text: colors.primary };
    }
  };

  const badgeColors = getColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: badgeColors.bg },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.primary },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text style={[styles.text, { color: badgeColors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.captionMedium,
  },
});
