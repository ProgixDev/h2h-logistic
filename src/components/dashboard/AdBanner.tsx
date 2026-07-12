import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Icon } from '@/components/ui/Icon';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

// Full-width video display-ad slot (16:9), ported from the marketplace so the
// three H2H apps share one ad format. A looping, muted video creative with the
// « Publicité » label, an « Annonce » (AdChoices) marker and an overlaid
// headline/CTA — the format video ad networks (AdMob / Amazon) serve. Mock
// creatives stream lightweight Pexels stock clips (generic B-roll — the overlay
// text carries the message); when ads go live, swap the <VideoView> for the
// SDK's ad view — placements/sizing stay.
const AD_CREATIVES = [
  {
    headline: 'Achetez et vendez près de chez vous',
    sponsor: 'HandtoHand',
    cta: 'Explorer',
    accent: '#D97706',
    colors: ['#D97706', '#B45309'] as const,
    // Pexels « woman doing online shopping » — fits the marketplace.
    video: 'https://videos.pexels.com/video-files/6238179/6238179-hd_1280_720_25fps.mp4',
  },
  {
    headline: 'Trajets du quotidien, colis qui voyagent malin',
    sponsor: 'H2H Logistic',
    cta: 'En savoir plus',
    accent: '#0891B2',
    colors: ['#0891B2', '#0E7490'] as const,
    // Pexels « young delivery man in a van » — fits co-livraison.
    video: 'https://videos.pexels.com/video-files/6170786/6170786-hd_1280_720_25fps.mp4',
  },
] as const;

export const AdBanner = memo(function AdBanner({ index = 0 }: { index?: number }) {
  const { colors } = useColorScheme();
  const ad = AD_CREATIVES[index % AD_CREATIVES.length];

  const player = useVideoPlayer(ad.video, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Publicité</Text>
      <TouchableOpacity style={styles.unit} activeOpacity={0.92}>
        {/* Colour base — shows through if the video can't load */}
        <LinearGradient
          colors={ad.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Video creative (muted, looping). Wrapped so touches reach the card. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        </View>

        {/* Legibility scrim — darker top & bottom so the overlay text reads */}
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.5)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* AdChoices marker — required disclosure on programmatic ads */}
        <View style={styles.adChoices} pointerEvents="none">
          <Icon name="info" size={9} color="#FFF" />
          <Text style={styles.adChoicesText}>Annonce</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.headline} numberOfLines={2}>{ad.headline}</Text>
          <View style={styles.footer}>
            <View style={styles.ctaPill}>
              <Text style={[styles.ctaText, { color: ad.accent }]}>{ad.cta}</Text>
              <Icon name="arrow-forward" size={14} color={ad.accent} />
            </View>
            <Text style={styles.sponsor}>Sponsorisé · {ad.sponsor}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    textAlign: 'center',
  },
  unit: {
    aspectRatio: 16 / 9, // shorter landscape video unit
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    padding: Spacing.lg,
    backgroundColor: '#000',
  },
  adChoices: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  adChoicesText: { fontFamily: 'Poppins_500Medium', fontSize: 9, color: '#FFF' },
  content: { flex: 1, justifyContent: 'space-between' },
  headline: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    lineHeight: 23,
    color: '#FFF',
    maxWidth: '82%',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: { alignItems: 'flex-start', gap: 8 },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.full,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 9,
  },
  ctaText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  sponsor: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.9)' },
});
