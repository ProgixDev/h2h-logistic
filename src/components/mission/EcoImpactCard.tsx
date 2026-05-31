import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { formatCo2 } from '@/utils/carbon';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface EcoImpactCardProps {
  kgSaved: number;
  variant?: 'standard' | 'compact';
  style?: ViewStyle;
}

export function EcoImpactCard({ kgSaved, variant = 'standard', style }: EcoImpactCardProps) {
  const { colors } = useColorScheme();
  const compact = variant === 'compact';

  return (
    <Card
      style={{
        backgroundColor: colors.success + '12',
        borderColor: colors.success + '30',
        padding: compact ? Spacing.md : Spacing.lg,
        ...style,
      }}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: colors.success + '22',
              width: compact ? 36 : 44,
              height: compact ? 36 : 44,
              borderRadius: compact ? 18 : 22,
            },
          ]}
        >
          <Icon name="leaf" size={compact ? 18 : 22} color={colors.success} />
        </View>
        <View style={styles.text}>
          <Text style={[compact ? styles.titleCompact : styles.title, { color: colors.text }]}>
            Impact estimé
          </Text>
          <Text style={[styles.amount, { color: colors.success }]}>
            Environ {formatCo2(kgSaved)} évités
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.bodyMedium,
  },
  titleCompact: {
    ...Typography.captionMedium,
  },
  amount: {
    ...Typography.bodyMedium,
  },
  eq: {
    ...Typography.caption,
    lineHeight: 18,
  },
});
