import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { formatCo2, equivalence } from '@/utils/carbon';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface EcoImpactSummaryProps {
  kgSavedThisMonth: number;
  kgSavedLastMonth: number;
  kgSavedAllTime: number;
}

const RING_SIZE = 72;
const STROKE = 7;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function EcoImpactSummary({ kgSavedThisMonth, kgSavedLastMonth, kgSavedAllTime }: EcoImpactSummaryProps) {
  const { colors } = useColorScheme();
  const router = useRouter();

  const target = Math.max(kgSavedLastMonth, 0.1);
  const progress = Math.min(1, kgSavedThisMonth / target);
  const dash = CIRCUMFERENCE * progress;

  const eq = equivalence(kgSavedAllTime);

  return (
    <Pressable
      onPress={() => router.push('/eco-impact' as any)}
      accessibilityRole="button"
      accessibilityLabel={`Impact écologique. Ce mois ${formatCo2(kgSavedThisMonth)}. Depuis votre inscription ${formatCo2(kgSavedAllTime)}. Ouvrir le détail.`}
    >
      <Card style={{ backgroundColor: colors.success + '10', borderColor: colors.success + '30' }}>
        <View style={styles.row}>
          {/* Progress ring */}
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={colors.success + '30'}
                strokeWidth={STROKE}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={colors.success}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
                fill="none"
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>
            <View style={styles.ringIcon}>
              <Image source={require('@/assets/images/leaf.webp')} style={styles.ringLeaf} contentFit="contain" />
            </View>
          </View>

          {/* Text */}
          <View style={styles.text}>
            <Text style={[styles.header, { color: colors.text }]}>Impact écologique</Text>
            <Text style={[styles.line, { color: colors.text }]}>
              Ce mois : <Text style={{ color: colors.success, fontFamily: 'Poppins_600SemiBold' }}>{formatCo2(kgSavedThisMonth)} évités</Text>
            </Text>
            <Text style={[styles.line, { color: colors.textSecondary }]}>
              Depuis le début : {formatCo2(kgSavedAllTime)}
            </Text>
            {!!eq && <Text style={[styles.eq, { color: colors.textSecondary }]}>{eq}</Text>}
          </View>

          <Icon name="chevron-right" size={18} color={colors.textSecondary} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLeaf: {
    width: 34,
    height: 34,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  header: {
    ...Typography.bodyMedium,
  },
  line: {
    ...Typography.caption,
    lineHeight: 18,
  },
  eq: {
    ...Typography.caption,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
