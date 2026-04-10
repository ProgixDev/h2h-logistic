import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { QRScanner } from '@/components/logistics/QRScanner';
import { ToleranceWindow } from '@/components/logistics/ToleranceWindow';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMissionStore } from '@/stores/useMissionStore';

type PickupStep = 'approach' | 'scan' | 'confirmed';

const MOCK_QR_PREFIX = 'H2H-';

export default function PickupScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMissionById, updateMissionStatus } = useMissionStore();

  const mission = getMissionById(id ?? '');
  const [step, setStep] = useState<PickupStep>('approach');
  const [showToast, setShowToast] = useState(false);
  const [proximity, setProximity] = useState(230); // mock meters

  // Success animation
  const checkScale = useSharedValue(0);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  if (!mission) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <Header title="Récupération" showBack />
        </View>
        <Text style={[s.notFound, { color: colors.textSecondary }]}>Mission introuvable</Text>
      </View>
    );
  }

  const missionCode = `HTH-${mission.id.slice(-4).toUpperCase()}`;

  // ─── QR validation ─────────────────────────────────────────
  const validateQR = (data: string): boolean => {
    // Mock: accept any QR containing the mission ID or starting with H2H-
    return data.includes(mission.id) || data.startsWith(MOCK_QR_PREFIX);
  };

  const handleScan = (data: string) => {
    if (validateQR(data)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      confirmPickup();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Reset scanner after showing error — handled by QRScanner component
    }
  };

  const handleManualEntry = (code: string) => {
    if (code.startsWith('HTH-') || code.includes(mission.id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      confirmPickup();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const confirmPickup = () => {
    updateMissionStatus(mission.id, 'picked_up');
    setStep('confirmed');
    checkScale.value = withSpring(1, { damping: 12, stiffness: 150 });
    setShowToast(true);
  };

  // ─── STEP: APPROACH ────────────────────────────────────────
  if (step === 'approach') {
    const proximityColor = proximity > 1000 ? colors.warning : proximity > 500 ? colors.primary : colors.success;
    const proximityLabel = proximity > 1000
      ? `Vous êtes à ${(proximity / 1000).toFixed(1)} km du hub`
      : proximity > 500
        ? 'Vous approchez du hub'
        : 'Vous êtes à proximité !';

    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
          <Header title="Récupération du colis" showBack />
          <Text style={[s.missionRef, { color: colors.textSecondary }]}>#{missionCode}</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Hub info */}
          <Card>
            <View style={s.hubRow}>
              <Icon name="hub-gare" size={28} color={colors.primary} />
              <View style={s.hubInfo}>
                <Text style={[s.hubName, { color: colors.text }]}>{mission.pickupHub.name}</Text>
                <Text style={[s.hubCity, { color: colors.textSecondary }]}>{mission.pickupHub.city}</Text>
              </View>
            </View>
          </Card>

          {/* Tolerance */}
          <ToleranceWindow
            scheduledTime={mission.pickupHub.scheduledTime}
            toleranceMinutes={mission.pickupHub.toleranceMinutes}
          />

          {/* GPS proximity */}
          <View style={[s.proximityCard, { backgroundColor: proximityColor + '12' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="location-filled" size={16} color={proximityColor} />
              <Text style={[s.proximityText, { color: proximityColor }]}>{proximityLabel}</Text>
            </View>
          </View>

          {/* Seller info */}
          <Card>
            <View style={s.sellerRow}>
              <View style={[s.sellerAvatar, { backgroundColor: colors.accent + '30' }]}>
                <Text style={s.sellerInitial}>{mission.seller.name[0]}</Text>
              </View>
              <View style={s.sellerInfo}>
                <Text style={[s.sellerName, { color: colors.text }]}>{mission.seller.name}</Text>
                <Text style={[s.sellerHint, { color: colors.textSecondary }]}>
                  Le vendeur doit vous présenter son QR code
                </Text>
              </View>
            </View>
          </Card>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Button
            title="Scanner le QR code"
            onPress={() => setStep('scan')}
            variant="gradient"
            style={{ minHeight: 52 }}
          />
        </View>
      </View>
    );
  }

  // ─── STEP: SCAN ────────────────────────────────────────────
  if (step === 'scan') {
    return (
      <View style={[s.screen, { backgroundColor: '#000' }]}>
        <View style={[s.scanHeader, { paddingTop: insets.top }]}>
          <Header title="" showBack />
        </View>
        <QRScanner
          onScan={handleScan}
          onManualEntry={handleManualEntry}
          instruction="Scannez le QR code du vendeur"
        />
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
        <Animated.View style={checkStyle}>
          <View style={[s.checkCircle, { backgroundColor: colors.success }]}>
            <Text style={s.checkIcon}>✓</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={s.confirmedText}>
          <Text style={[s.confirmedTitle, { color: colors.text }]}>Colis pris en charge ✓</Text>
          <Text style={[s.confirmedSub, { color: colors.textSecondary }]}>
            Le colis de {mission.seller.name} est maintenant sous votre responsabilité.
          </Text>
        </Animated.View>

        {/* Package summary */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ width: '100%', paddingHorizontal: Spacing.xxl }}>
          <Card>
            <View style={s.packageRow}>
              <View style={[s.packageThumb, { backgroundColor: colors.primary + '10' }]}>
                <Icon name="package" size={24} color={colors.primary} />
              </View>
              <View style={s.packageInfo}>
                <Text style={[s.packageTitle, { color: colors.text }]}>{mission.package.description}</Text>
                <Text style={[s.packageMeta, { color: colors.textSecondary }]}>
                  Taille {mission.package.size} — {mission.package.weight} kg
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(700)}>
          <Text style={[s.warmMsg, { color: colors.textSecondary }]}>
            Bonne route ! Le colis est entre vos mains.
          </Text>
        </Animated.View>
      </View>

      <View style={[s.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          title="Continuer vers la livraison"
          onPress={() => {
            updateMissionStatus(mission.id, 'in_transit');
            router.back();
          }}
          variant="gradient"
          style={{ minHeight: 52 }}
        />
      </View>

      <Toast message="Prise en charge confirmée" type="success" visible={showToast} onHide={() => setShowToast(false)} duration={2500} />
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

  // Seller
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sellerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sellerInitial: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#FFFFFF' },
  sellerInfo: { flex: 1, gap: Spacing.xs },
  sellerName: { ...Typography.bodyMedium },
  sellerHint: { ...Typography.caption, lineHeight: 18 },

  // Scan header
  scanHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: Spacing.lg },

  // Confirmed
  confirmedContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  checkCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  checkIcon: { color: '#FFFFFF', fontSize: 40, fontWeight: '700', lineHeight: 44 },
  confirmedText: { alignItems: 'center', gap: Spacing.sm },
  confirmedTitle: { ...Typography.h1, textAlign: 'center' },
  confirmedSub: { ...Typography.body, textAlign: 'center', paddingHorizontal: Spacing.xxl, lineHeight: 22 },
  warmMsg: { ...Typography.body, textAlign: 'center', fontStyle: 'italic' },

  // Package
  packageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  packageThumb: { width: 48, height: 48, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  packageIcon: { fontSize: 24 },
  packageInfo: { flex: 1, gap: 2 },
  packageTitle: { ...Typography.bodyMedium },
  packageMeta: { ...Typography.caption },

  footer: { paddingHorizontal: Spacing.lg },
});
