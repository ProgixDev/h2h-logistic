import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface PrincipleChipProps {
  iconName: IconName;
  label: string;
  description: string;
}

export function PrincipleChip({ iconName, label, description }: PrincipleChipProps) {
  const { colors } = useColorScheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
        <Icon name={iconName} size={18} color={colors.primary} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 4,
  },
  label: {
    ...Typography.bodyMedium,
  },
  description: {
    ...Typography.caption,
    lineHeight: 18,
  },
});
