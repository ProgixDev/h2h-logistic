import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { MissionParticipant } from '@/types/mission';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

export type ActiveParty = 'seller' | 'buyer' | null;

interface ParticipantsCardProps {
  seller: MissionParticipant;
  buyer: MissionParticipant;
  transporter: MissionParticipant;
  activeParty?: ActiveParty;
  onPressParticipant?: (party: MissionParticipant, role: 'seller' | 'buyer') => void;
}

export function ParticipantsCard({
  seller,
  buyer,
  transporter,
  activeParty = null,
  onPressParticipant,
}: ParticipantsCardProps) {
  const { colors } = useColorScheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Bubble
        party={seller}
        roleLabel="Vendeur"
        onPress={onPressParticipant ? () => onPressParticipant(seller, 'seller') : undefined}
        colors={colors}
      />

      {activeParty === 'seller' && <DirectionalArrow direction="left" colors={colors} />}
      {activeParty !== 'seller' && <Spacer />}

      <YouBubble party={transporter} colors={colors} />

      {activeParty === 'buyer' && <DirectionalArrow direction="right" colors={colors} />}
      {activeParty !== 'buyer' && <Spacer />}

      <Bubble
        party={buyer}
        roleLabel="Acheteur"
        onPress={onPressParticipant ? () => onPressParticipant(buyer, 'buyer') : undefined}
        colors={colors}
      />
    </View>
  );
}

function Bubble({
  party,
  roleLabel,
  onPress,
  colors,
}: {
  party: MissionParticipant;
  roleLabel: string;
  onPress?: () => void;
  colors: any;
}) {
  const handlePress = () => {
    if (!onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const Wrapper: any = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress ? handlePress : undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Ouvrir la discussion avec ${party.name}` : undefined}
      style={styles.bubble}
    >
      {party.avatar ? (
        <Image source={{ uri: party.avatar }} style={styles.avatar} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: colors.accent + '40' }]}>
          <Text style={[styles.avatarInitial, { color: colors.primary }]}>
            {party.name[0]?.toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.nameRow}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {party.name.split(' ')[0]}
        </Text>
        {party.isFavorite && <Icon name="star" size={10} color={colors.warning} />}
      </View>
      <Text style={[styles.role, { color: colors.textSecondary }]}>{roleLabel}</Text>
    </Wrapper>
  );
}

function YouBubble({ party, colors }: { party: MissionParticipant; colors: any }) {
  return (
    <View style={styles.bubble}>
      {party.avatar ? (
        <Image source={{ uri: party.avatar }} style={[styles.avatar, { borderWidth: 2, borderColor: colors.primary }]} contentFit="cover" />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarInitial, { color: '#FFFFFF' }]}>
            {party.name[0]?.toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={[styles.name, { color: colors.text }]}>Vous</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
        <Text style={[styles.statusLabel, { color: colors.success }]}>En route</Text>
      </View>
    </View>
  );
}

function DirectionalArrow({ direction, colors }: { direction: 'left' | 'right'; colors: any }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.arrow, animStyle]}>
      <Icon
        name={direction === 'right' ? 'chevron-right' : 'back'}
        size={24}
        color={colors.gold}
      />
    </Animated.View>
  );
}

function Spacer() {
  return <View style={styles.arrow} />;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  bubble: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  name: {
    ...Typography.captionMedium,
    textAlign: 'center',
    maxWidth: 80,
  },
  role: {
    ...Typography.caption,
    fontSize: 10,
    lineHeight: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    lineHeight: 14,
  },
  arrow: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
