import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

// Full-screen « Publicité » interstitial — shown at a natural break (e.g. right
// after publishing a trajet). Non-skippable for a few seconds (countdown), then
// a « Passer » close appears. `skipAfter` tunes that delay: a short interstitial
// (3s) for light breaks, longer for bigger moments. Mock house creative; swap
// the body for the ad network's interstitial view when ads go live.

const { width } = Dimensions.get('window');
const HERO = Math.min(width * 0.58, 260);

const CREATIVE = {
  sponsor: 'HandtoHand',
  title: 'Achetez et vendez près de chez vous',
  subtitle:
    'Des milliers d\'objets de seconde main à deux pas, avec la protection acheteur incluse.',
  cta: 'Explorer HandtoHand',
  gradient: ['#D97706', '#B45309'] as const,
};

export const InterstitialAd = memo(function InterstitialAd({
  onClose,
  skipAfter = 5,
}: {
  onClose: () => void;
  skipAfter?: number;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useColorScheme();
  const [left, setLeft] = useState(skipAfter);

  useEffect(() => {
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const canSkip = left <= 0;

  return (
    <View
      style={[
        styles.fill,
        { backgroundColor: colors.background, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 },
      ]}
    >
      {/* Top bar — label + skip/countdown */}
      <View style={styles.topBar}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Publicité</Text>
        {canSkip ? (
          <TouchableOpacity
            onPress={onClose}
            style={[styles.skipBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
          >
            <Text style={[styles.skipText, { color: colors.text }]}>Passer</Text>
            <Icon name="close" size={15} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.countdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.countdownText, { color: colors.textSecondary }]}>{left}</Text>
          </View>
        )}
      </View>

      {/* Creative */}
      <View style={styles.creative}>
        <LinearGradient
          colors={CREATIVE.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Icon name="hub-shopping" size={Math.round(HERO * 0.42)} color="#FFF" />
        </LinearGradient>
        <Text style={[styles.sponsor, { color: colors.textSecondary }]}>Sponsorisé · {CREATIVE.sponsor}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{CREATIVE.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{CREATIVE.subtitle}</Text>
      </View>

      {/* CTA */}
      <TouchableOpacity activeOpacity={0.9} onPress={onClose}>
        <LinearGradient
          colors={CREATIVE.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>{CREATIVE.cta}</Text>
          <Icon name="arrow-forward" size={18} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 20,
    zIndex: 200,
    elevation: 200,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.full,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
  },
  skipText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  countdown: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },

  creative: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  hero: {
    width: HERO,
    height: HERO,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sponsor: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 24, textAlign: 'center' },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 12,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: BorderRadius.lg,
  },
  ctaText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#FFF' },
});
