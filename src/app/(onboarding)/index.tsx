import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  type ViewToken,
  type ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/stores/useAuthStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  image: ImageSourcePropType;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    image: require('@/assets/images/3d-emojis/Scooter.png'),
    title: 'Publiez vos trajets existants',
    subtitle:
      'Vous vous déplacez déjà ? Transformez vos trajets quotidiens en revenus complémentaires.',
  },
  {
    image: require('@/assets/images/3d-emojis/Package-box.png'),
    title: 'Livrez des colis sur votre route',
    subtitle:
      'Pas de détour, pas de contrainte. Vous récupérez et livrez dans les hubs sur votre chemin.',
  },
  {
    image: require('@/assets/images/3d-emojis/Shield.png'),
    title: 'Construisez votre réputation',
    subtitle:
      'Évaluations, clients fidèles, cotransporteurs particuliers favoris. Plus vous livrez, plus vous êtes sollicité.',
  },
];

export default function OnboardingScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setOnboarded } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleDone = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOnboarded(true);
    router.replace('/(auth)');
  }, []);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleDone();
    }
  }, [currentIndex]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <Image
        source={item.image}
        style={styles.slideImage}
        contentFit="contain"
      />
      <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
    </View>
  );

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip button — top right */}
      <Animated.View
        entering={FadeIn.delay(300)}
        style={[styles.skipContainer, { top: insets.top + Spacing.sm }]}
      >
        <TouchableOpacity onPress={handleDone} hitSlop={16}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Passer</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderSlide}
        bounces={false}
        style={styles.flatList}
      />

      {/* Bottom section */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {/* Pagination dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? colors.primary : colors.border,
                    width: isActive ? 28 : 8,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Buttons */}
        <View style={styles.actions}>
          <Button
            title={isLast ? 'Commencer' : 'Suivant'}
            onPress={handleNext}
            variant="gradient"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    right: Spacing.xl,
    zIndex: 10,
  },
  skipText: {
    ...Typography.bodyMedium,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl + 8,
    gap: Spacing.xl,
  },
  slideImage: {
    width: 180,
    height: 180,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
  },
  bottom: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xxl,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    gap: Spacing.md,
  },
});
