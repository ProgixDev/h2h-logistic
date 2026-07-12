import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, AccessibilityInfo } from 'react-native';
import { Image } from 'expo-image';
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
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { QRScanner } from '@/components/logistics/QRScanner';
import { ToleranceWindow } from '@/components/logistics/ToleranceWindow';
import { HubZoneCheck } from '@/components/logistics/HubZoneCheck';
import { Icon } from '@/components/ui/Icon';
import { ScanProgressDots } from '@/components/mission/ScanProgressDots';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useMissionStore } from '@/stores/useMissionStore';
import { mockHubs } from '@/services/mock/hubs';

type PickupStep = 'approach' | 'scan-seller' | 'scan-package' | 'confirmed';

const MAX_PACKAGE_ATTEMPTS = 3;

export default function PickupScreen() {
  const { colors } = useColorScheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMissionById, confirmPickup, updateMissionStatus } = useMissionStore();

  const mission = getMissionById(id ?? '');
  const [step, setStep] = useState<PickupStep>('approach');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [scannerResetSignal, setScannerResetSignal] = useState(0);
  const [packageAttempts, setPackageAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [presenceConfirmedAt, setPresenceConfirmedAt] = useState<string | null>(null);

  const checkScale = useSharedValue(0);
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  if (!mission) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <Header title="Récupération" showBack />
        </View>
        <Text style={[s.notFound, { color: colors.textSecondary }]}>Co-livraison introuvable</Text>
      </View>
    );
  }

  const missionCode = `HTH-${mission.id.slice(-4).toUpperCase()}`;
  const openIncident = (type: string) =>
    router.push({ pathname: '/incident/[type]' as any, params: { type, missionId: mission.id } });

  const showToast = (msg: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ msg, type });
  };

  const resetScanner = () => setScannerResetSignal((n) => n + 1);

  const matchesSeller = (code: string): boolean => {
    const normalized = code.trim().toUpperCase();
    return (
      !!mission.seller.qrCode && normalized === mission.seller.qrCode.toUpperCase()
    ) || normalized.includes(mission.id.toUpperCase()) || normalized.startsWith('SEL-') || normalized.startsWith('HTH-');
  };

  const matchesPackage = (code: string): boolean => {
    const normalized = code.trim().toUpperCase();
    return !!mission.package.trackingNumber && normalized === mission.package.trackingNumber.toUpperCase();
  };

  const handleSellerScan = useCallback((code: string) => {
    if (matchesSeller(code)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Vendeur identifié ✓', 'success');
      AccessibilityInfo.announceForAccessibility('Vendeur identifié. Étape 2 sur 2 : scanner le colis.');
      setTimeout(() => setStep('scan-package'), 400);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Ce n'est pas le bon vendeur. Vérifiez avec lui, ou entrez le code manuellement.", 'error');
      resetScanner();
    }
  }, [mission.id, mission.seller.qrCode]);

  const handlePackageScan = useCallback((code: string) => {
    if (matchesPackage(code)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Colis vérifié ✓', 'success');
      confirmPickup(mission.id);
      AccessibilityInfo.announceForAccessibility('Colis vérifié. Prise en charge confirmée.');
      setStep('confirmed');
      checkScale.value = withSpring(1, { damping: 12, stiffness: 150 });
    } else {
      const next = packageAttempts + 1;
      setPackageAttempts(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (next >= MAX_PACKAGE_ATTEMPTS) {
        setLocked(true);
        showToast("Merci de contacter le support via le chat.", 'error');
      } else {
        showToast("Ce colis ne correspond pas à la co-livraison. Pouvez-vous vérifier avec le vendeur ?", 'error');
        resetScanner();
      }
    }
  }, [mission.id, mission.package.trackingNumber, packageAttempts]);

  // ─── DEV BYPASS — skips validation entirely ───────────────
  // TODO(backend): remove before production
  const bypassSellerStep = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Vendeur identifié ✓ (bypass)', 'success');
    setTimeout(() => setStep('scan-package'), 300);
  };

  // TODO(backend): remove before production
  const bypassPackageStep = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Colis vérifié ✓ (bypass)', 'success');
    confirmPickup(mission.id);
    setStep('confirmed');
    checkScale.value = withSpring(1, { damping: 12, stiffness: 150 });
  };

  // ─── STEP: APPROACH ────────────────────────────────────────
  if (step === 'approach') {
    // Resolve the full hub (point central + zone) from the mock dataset.
    const pickupHub = mockHubs.find((h) => h.id === mission.pickupHub.id) ?? null;
    // Off-hub rendez-vous → no zone / GPS check (existing bypass, kept intact).
    const isOffHub = mission.pickupHub.isOffHub === true;
    const showZoneCheck = !isOffHub && pickupHub !== null;

    const goToSellerScan = () => {
      AccessibilityInfo.announceForAccessibility('Étape 1 sur 2 : scanner le QR du vendeur.');
      setStep('scan-seller');
    };

    const handleConfirmPresence = (ts: string) => {
      setPresenceConfirmedAt(ts);
      showToast(t('zone.presenceConfirmed'), 'success');
      AccessibilityInfo.announceForAccessibility('Présence confirmée dans la zone. Étape 1 sur 2 : scanner le QR du vendeur.');
      setTimeout(goToSellerScan, 600);
    };

    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
          <Header title="Récupération du colis" showBack />
          <Text style={[s.missionRef, { color: colors.textSecondary }]}>#{missionCode}</Text>
          <ScanProgressDots partyLabel="Vendeur" partyState="pending" packageState="pending" />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Card>
            <View style={s.hubRow}>
              <Icon name="hub-gare" size={28} color={colors.primary} />
              <View style={s.hubInfo}>
                <Text style={[s.hubName, { color: colors.text }]}>{mission.pickupHub.name}</Text>
                <Text style={[s.hubCity, { color: colors.textSecondary }]}>{mission.pickupHub.city}</Text>
              </View>
            </View>
          </Card>

          <ToleranceWindow
            scheduledTime={mission.pickupHub.scheduledTime}
            toleranceMinutes={mission.pickupHub.toleranceMinutes}
          />

          {/* Off-hub: keep the "pas de vérification GPS" bypass. */}
          {isOffHub && (
            <View style={[s.offHubBanner, { backgroundColor: colors.warning + '14' }]}>
              <Icon name="location-filled" size={14} color={colors.warning} />
              <Text style={[s.offHubText, { color: colors.warning }]}>{t('zone.offHubNoGps')}</Text>
            </View>
          )}

          {/* On-hub: GPS presence in the zone gates approach → scan-seller. */}
          {showZoneCheck && (
            <HubZoneCheck
              hub={pickupHub}
              scheduledTime={mission.pickupHub.scheduledTime}
              toleranceMinutes={mission.pickupHub.toleranceMinutes}
              confirmed={presenceConfirmedAt !== null}
              onConfirm={handleConfirmPresence}
            />
          )}

          <Card>
            <View style={s.sellerRow}>
              {mission.seller.avatar ? (
                <Image source={{ uri: mission.seller.avatar }} style={s.sellerAvatarImg} contentFit="cover" />
              ) : (
                <View style={[s.sellerAvatar, { backgroundColor: colors.accent + '30' }]}>
                  <Text style={[s.sellerInitial, { color: colors.primary }]}>{mission.seller.name[0]}</Text>
                </View>
              )}
              <View style={s.sellerInfo}>
                <Text style={[s.sellerName, { color: colors.text }]}>{mission.seller.name}</Text>
                <Text style={[s.sellerHint, { color: colors.textSecondary }]}>
                  Le vendeur doit vous présenter son QR code
                </Text>
              </View>
            </View>
          </Card>

          {/* Incident entry points (rendez-vous de collecte) */}
          <View style={s.incidentLinks}>
            <TouchableOpacity onPress={() => openIncident('seller_absent')} hitSlop={8}>
              <Text style={[s.incidentLink, { color: colors.primary }]}>{"Le vendeur n'est pas présent ?"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openIncident('refuse_package')} hitSlop={8}>
              <Text style={[s.incidentLink, { color: colors.textSecondary }]}>Refuser le colis (non conforme)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openIncident('collect_absent')} hitSlop={8}>
              <Text style={[s.incidentLink, { color: colors.textSecondary }]}>Signaler un blocage à la collecte</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Off-hub keeps the direct scan button (no zone gate); on-hub advances
            via the in-zone presence confirmation above. */}
        {!showZoneCheck && (
          <View style={[s.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Button
              title="Scanner le QR du vendeur"
              onPress={goToSellerScan}
              variant="gradient"
              style={{ minHeight: 52 }}
            />
          </View>
        )}

        {toast && (
          <Toast message={toast.msg} type={toast.type} visible onHide={() => setToast(null)} duration={2500} />
        )}
      </View>
    );
  }

  // ─── STEP: SCAN SELLER ─────────────────────────────────────
  if (step === 'scan-seller') {
    return (
      <View style={[s.screen, { backgroundColor: '#000' }]}>
        <View style={[s.scanHeader, { paddingTop: insets.top, backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <Header title="" showBack />
          <View style={s.stepBanner}>
            <Text style={s.stepBannerText}>Étape 1/2 — QR vendeur</Text>
          </View>
          <ScanProgressDots partyLabel="Vendeur" partyState="active" packageState="pending" />
        </View>
        <QRScanner
          mode="seller-qr"
          onScan={handleSellerScan}
          onManualEntry={handleSellerScan}
          resetSignal={scannerResetSignal}
          // TODO(backend): remove before production
          onDevBypass={bypassSellerStep}
        />
        {toast && (
          <Toast message={toast.msg} type={toast.type} visible onHide={() => setToast(null)} duration={3000} />
        )}
      </View>
    );
  }

  // ─── STEP: SCAN PACKAGE ────────────────────────────────────
  if (step === 'scan-package') {
    if (locked) {
      return (
        <View style={[s.screen, { backgroundColor: colors.background }]}>
          <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
            <Header title="Récupération du colis" showBack />
            <ScanProgressDots partyLabel="Vendeur" partyState="done" packageState="active" />
          </View>
          <View style={s.lockedContent}>
            <Icon name="chat" size={56} color={colors.primary} />
            <Text style={[s.lockedTitle, { color: colors.text }]}>Besoin d'aide ?</Text>
            <Text style={[s.lockedSub, { color: colors.textSecondary }]}>
              Merci de contacter le support via le chat. Nous allons vous aider à résoudre cette co-livraison.
            </Text>
            <Button
              title="Ouvrir le chat support"
              onPress={() =>
                router.push({
                  pathname: '/chat/[id]',
                  params: { id: 'support', name: 'Support H2H', role: 'support', missionId: mission.id },
                })
              }
              variant="gradient"
            />
            <Button
              title="Réessayer le scan"
              onPress={() => {
                setLocked(false);
                setPackageAttempts(0);
                resetScanner();
              }}
              variant="outline"
            />
          </View>
          {toast && (
            <Toast message={toast.msg} type={toast.type} visible onHide={() => setToast(null)} duration={3500} />
          )}
        </View>
      );
    }

    return (
      <View style={[s.screen, { backgroundColor: '#000' }]}>
        <View style={[s.scanHeader, { paddingTop: insets.top, backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <Header title="" showBack />
          <View style={s.stepBanner}>
            <Text style={s.stepBannerText}>Étape 2/2 — Scanner le colis</Text>
          </View>
          <ScanProgressDots partyLabel="Vendeur" partyState="done" packageState="active" />
          {/* Seller confirmation thumbnail */}
          <View style={s.sellerConfirm}>
            {mission.seller.avatar ? (
              <Image source={{ uri: mission.seller.avatar }} style={s.sellerConfirmAvatar} contentFit="cover" />
            ) : (
              <View style={[s.sellerConfirmAvatar, { backgroundColor: colors.accent + '60', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' }}>{mission.seller.name[0]}</Text>
              </View>
            )}
            <Text style={s.sellerConfirmName} numberOfLines={1}>
              {mission.seller.name.split(' ')[0]} identifié ✓
            </Text>
          </View>
        </View>
        <QRScanner
          mode="package"
          onScan={handlePackageScan}
          onManualEntry={handlePackageScan}
          resetSignal={scannerResetSignal}
          // TODO(backend): remove before production
          onDevBypass={bypassPackageStep}
        />
        {toast && (
          <Toast message={toast.msg} type={toast.type} visible onHide={() => setToast(null)} duration={3000} />
        )}
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
          title="Continuer vers la co-livraison"
          onPress={() => {
            updateMissionStatus(mission.id, 'in_transit');
            router.back();
          }}
          variant="gradient"
          style={{ minHeight: 52 }}
        />
      </View>

      {toast && (
        <Toast message={toast.msg} type={toast.type} visible onHide={() => setToast(null)} duration={2500} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  notFound: { ...Typography.body, textAlign: 'center', marginTop: Spacing.section },
  missionRef: { ...Typography.caption, textAlign: 'center', marginBottom: Spacing.sm },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.lg },

  hubRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  hubInfo: { flex: 1, gap: 2 },
  hubName: { ...Typography.bodyMedium },
  hubCity: { ...Typography.caption },

  offHubBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md },
  offHubText: { ...Typography.captionMedium },
  incidentLinks: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xs },
  incidentLink: { ...Typography.captionMedium, textDecorationLine: 'underline', textAlign: 'center' },

  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sellerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sellerAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  sellerInitial: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  sellerInfo: { flex: 1, gap: Spacing.xs },
  sellerName: { ...Typography.bodyMedium },
  sellerHint: { ...Typography.caption, lineHeight: 18 },

  scanHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  stepBanner: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, marginVertical: Spacing.xs },
  stepBannerText: { color: '#FFFFFF', ...Typography.captionMedium },

  sellerConfirm: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'center', backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, marginTop: 4 },
  sellerConfirmAvatar: { width: 24, height: 24, borderRadius: 12 },
  sellerConfirmName: { color: '#FFFFFF', ...Typography.captionMedium },

  confirmedContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  checkCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  checkIcon: { color: '#FFFFFF', fontSize: 40, fontWeight: '700', lineHeight: 44 },
  confirmedText: { alignItems: 'center', gap: Spacing.sm },
  confirmedTitle: { ...Typography.h1, textAlign: 'center' },
  confirmedSub: { ...Typography.body, textAlign: 'center', paddingHorizontal: Spacing.xxl, lineHeight: 22 },
  warmMsg: { ...Typography.body, textAlign: 'center', fontStyle: 'italic' },

  packageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  packageThumb: { width: 48, height: 48, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  packageInfo: { flex: 1, gap: 2 },
  packageTitle: { ...Typography.bodyMedium },
  packageMeta: { ...Typography.caption },

  lockedContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.lg },
  lockedTitle: { ...Typography.h2 },
  lockedSub: { ...Typography.body, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.md },

  footer: { paddingHorizontal: Spacing.lg },
});
