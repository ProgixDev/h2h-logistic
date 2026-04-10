import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { OTPEntry } from '@/components/logistics/OTPEntry';
import { ToleranceWindow } from '@/components/logistics/ToleranceWindow';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMissionStore } from '@/stores/useMissionStore';
import { formatCurrency } from '@/utils/formatting';

type DeliveryStep = 'approach' | 'otp' | 'confirmed';

const MOCK_VALID_OTP = '482715';

export default function DeliveryScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMissionById, updateMissionStatus } = useMissionStore();

  const mission = getMissionById(id ?? '');
  const [step, setStep] = useState<DeliveryStep>('approach');
  const [showToast, setShowToast] = useState(false);
  const [proximity] = useState(180); // mock

  // Animated earnings counter
  const earningsValue = useSharedValue(0);
  const [displayedEarnings, setDisplayedEarnings] = useState('0.00');

  // Success animation
  const checkScale = useSharedValue(0);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  if (!mission) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <Header title="Livraison" showBack />
        </View>
        <Text style={[s.notFound, { color: colors.textSecondary }]}>Mission introuvable</Text>
      </View>
    );
  }

  const missionCode = `HTH-${mission.id.slice(-4).toUpperCase()}`;

  const handleOTPSubmit = useCallback((code: string): boolean => {
    // Mock: accept the predefined code or the mission's OTP
    const valid = code === MOCK_VALID_OTP || code === mission.deliveryHub.otpCode;

    if (valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      confirmDelivery();
      return true;
    }

    return false;
  }, [mission]);

  const confirmDelivery = () => {
    updateMissionStatus(mission.id, 'delivered');
    setStep('confirmed');
    checkScale.value = withSpring(1, { damping: 12, stiffness: 150 });
    setShowToast(true);

    // Animate earnings counter
    const target = mission.transporterEarning;
    const duration = 1500;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      setDisplayedEarnings(current.toFixed(2));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    setTimeout(animate, 600); // Start after check animation

    // Auto-complete after 2s
    setTimeout(() => {
      updateMissionStatus(mission.id, 'completed');
    }, 2000);
  };

  const handleMaxAttempts = () => {
    // Could show support contact here
  };

  // ─── STEP: APPROACH ────────────────────────────────────────
  if (step === 'approach') {
    const proximityColor = proximity > 500 ? colors.primary : colors.success;
    const proximityLabel = proximity > 500 ? 'Vous approchez du hub' : 'Vous êtes à proximité !';

    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
          <Header title="Livraison du colis" showBack />
          <Text style={[s.missionRef, { color: colors.textSecondary }]}>#{missionCode}</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Hub info */}
          <Card>
            <View style={s.hubRow}>
              <Icon name="hub-gare" size={28} color={colors.primary} />
              <View style={s.hubInfo}>
                <Text style={[s.hubName, { color: colors.text }]}>{mission.deliveryHub.name}</Text>
                <Text style={[s.hubCity, { color: colors.textSecondary }]}>{mission.deliveryHub.city}</Text>
              </View>
            </View>
          </Card>

          {/* Tolerance */}
          <ToleranceWindow
            scheduledTime={mission.deliveryHub.scheduledTime}
            toleranceMinutes={mission.deliveryHub.toleranceMinutes}
          />

          {/* GPS proximity */}
          <View style={[s.proximityCard, { backgroundColor: proximityColor + '12' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="location-filled" size={16} color={proximityColor} />
              <Text style={[s.proximityText, { color: proximityColor }]}>{proximityLabel}</Text>
            </View>
          </View>

          {/* Buyer info */}
          <Card>
            <View style={s.buyerRow}>
              <View style={[s.buyerAvatar, { backgroundColor: colors.accent + '30' }]}>
                <Text style={s.buyerInitial}>{mission.buyer.name[0]}</Text>
              </View>
              <View style={s.buyerInfo}>
                <Text style={[s.buyerName, { color: colors.text }]}>{mission.buyer.name}</Text>
                <Text style={[s.buyerHint, { color: colors.textSecondary }]}>
                  L'acheteur va vous communiquer son code
                </Text>
              </View>
              {mission.buyer.isFavorite && (
                <Icon name="star" size={16} color={colors.warning} />
              )}
            </View>
          </Card>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Button
            title="Entrer le code de l'acheteur"
            onPress={() => setStep('otp')}
            variant="gradient"
            style={{ minHeight: 52 }}
          />
        </View>
      </View>
    );
  }

  // ─── STEP: OTP ─────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
          <Header title="Livraison du colis" showBack />
        </View>

        <View style={s.otpContent}>
          <OTPEntry
            onSubmit={handleOTPSubmit}
            onMaxAttempts={handleMaxAttempts}
            buyerName={mission.buyer.name}
          />
        </View>
      </View>
    );
  }

  // ─── STEP: CONFIRMED ──────────────────────────────────────
  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
        <Header title="" showBack />
      </View>

      <View style={s.confirmedContent}>
        {/* Checkmark */}
        <Animated.View style={checkStyle}>
          <View style={[s.checkCircle, { backgroundColor: colors.success }]}>
            <Text style={s.checkIcon}>✓</Text>
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={s.confirmedText}>
          <Text style={[s.confirmedTitle, { color: colors.text }]}>Livraison confirmée ✓</Text>
          <Text style={[s.confirmedSub, { color: colors.textSecondary }]}>
            Le colis a été remis à {mission.buyer.name} avec succès.
          </Text>
        </Animated.View>

        {/* Earnings card with animated counter */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ width: '100%', paddingHorizontal: Spacing.xxl }}>
          <Card style={{ backgroundColor: colors.success + '10', borderColor: colors.success + '30' }}>
            <View style={s.earningsCard}>
              <Text style={[s.earningsLabel, { color: colors.textSecondary }]}>
                Vous avez gagné pour cette livraison
              </Text>
              <Text style={[s.earningsAmount, { color: colors.success }]}>
                {displayedEarnings}€
              </Text>
              <Text style={[s.earningsCaption, { color: colors.textSecondary }]}>
                Le montant sera crédité sur votre portefeuille
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* Warm message */}
        <Animated.View entering={FadeIn.delay(800)}>
          <Text style={[s.warmMsg, { color: colors.textSecondary }]}>
            Bravo et merci pour cette livraison !
          </Text>
        </Animated.View>
      </View>

      <View style={[s.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          title="Retour aux missions"
          onPress={() => router.replace('/(tabs)/missions')}
          variant="gradient"
          style={{ minHeight: 52 }}
        />
      </View>

      <Toast
        message="Livraison validée. Paiement en cours de libération."
        type="success"
        visible={showToast}
        onHide={() => setShowToast(false)}
        duration={3000}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  notFound: { ...Typography.body, textAlign: 'center', marginTop: Spacing.section },
  missionRef: { ...Typography.caption, textAlign: 'center', marginBottom: Spacing.sm },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.lg },

  // Hub
  hubRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  hubIcon: { fontSize: 28 },
  hubInfo: { flex: 1, gap: 2 },
  hubName: { ...Typography.bodyMedium },
  hubCity: { ...Typography.caption },

  // Proximity
  proximityCard: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center' },
  proximityText: { ...Typography.bodyMedium },

  // Buyer
  buyerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  buyerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  buyerInitial: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#FFFFFF' },
  buyerInfo: { flex: 1, gap: Spacing.xs },
  buyerName: { ...Typography.bodyMedium },
  buyerHint: { ...Typography.caption, lineHeight: 18 },
  favStar: { fontSize: 16 },

  // OTP
  otpContent: { flex: 1, justifyContent: 'center' },

  // Confirmed
  confirmedContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  checkCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  checkIcon: { color: '#FFFFFF', fontSize: 40, fontWeight: '700', lineHeight: 44 },
  confirmedText: { alignItems: 'center', gap: Spacing.sm },
  confirmedTitle: { ...Typography.h1, textAlign: 'center' },
  confirmedSub: { ...Typography.body, textAlign: 'center', paddingHorizontal: Spacing.xxl, lineHeight: 22 },

  // Earnings
  earningsCard: { alignItems: 'center', gap: Spacing.sm },
  earningsLabel: { ...Typography.body, textAlign: 'center' },
  earningsAmount: { fontFamily: 'Poppins_700Bold', fontSize: 36, lineHeight: 44 },
  earningsCaption: { ...Typography.caption, textAlign: 'center' },

  warmMsg: { ...Typography.body, textAlign: 'center', fontStyle: 'italic' },

  footer: { paddingHorizontal: Spacing.lg },
});
