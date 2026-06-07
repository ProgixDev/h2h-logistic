import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MissionTimeline } from '@/components/mission/MissionTimeline';
import { ParticipantsCard } from '@/components/mission/ParticipantsCard';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMissionStore } from '@/stores/useMissionStore';
import { formatCurrency } from '@/utils/formatting';
import type { Mission } from '@/types/mission';

const STATUS_LABELS: Record<string, string> = {
  proposal: 'Proposition',
  accepted: 'Acceptée',
  seller_pending: 'Attente vendeur',
  group_created: 'Groupe créé',
  pickup_pending: 'Récupération',
  picked_up: 'Collecté',
  in_transit: 'En trajet',
  delivery_pending: 'Remise prévue',
  delivered: 'Livré',
  completed: 'Terminé',
  cancelled: 'Annulée',
  expired: 'Expirée',
};

// Statuses that should show the group HQ screen
const GROUP_STATUSES = ['group_created', 'pickup_pending', 'picked_up', 'in_transit', 'delivery_pending'];

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useColorScheme();
  const router = useRouter();

  // Subscribe directly to the store so every mutation triggers a re-render
  // (was a polled local useState in v4 — zustand v5 made the no-selector
  // subscription pattern unreliable, which caused the timeline to freeze).
  const mission = useMissionStore((s) => s.missions.find((m) => m.id === (id ?? '')));

  if (!mission) {
    return (
      <SafeAreaWrapper>
        <Header title="Co-livraison" showBack />
        <Text style={[styles.notFound, { color: colors.textSecondary }]}>Co-livraison introuvable</Text>
      </SafeAreaWrapper>
    );
  }

  // ─── ROUTE TO GROUP SCREEN for active delivery statuses ───
  if (GROUP_STATUSES.includes(mission.status)) {
    // Redirect to the group view which is the mission HQ
    // We render inline to keep the same URL/back navigation
    const MissionGroupScreen = require('./group').default;
    return <MissionGroupScreen />;
  }

  // ─── SELLER PENDING ───────────────────────────────────────
  if (mission.status === 'seller_pending') {
    return <SellerWaitingScreen mission={mission} colors={colors} router={router} />;
  }

  // ─── EXPIRED ──────────────────────────────────────────────
  if (mission.status === 'expired') {
    return <ExpiredScreen mission={mission} colors={colors} router={router} />;
  }

  // ─── COMPLETED / DELIVERED / CANCELLED — summary view ─────
  return (
    <SafeAreaWrapper>
      <Header title={`${mission.pickupHub.city} → ${mission.deliveryHub.city}`} showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.statusRow}>
          <Badge label={STATUS_LABELS[mission.status] ?? mission.status} variant={mission.status === 'delivered' || mission.status === 'completed' ? 'success' : 'error'} />
          <View style={styles.earningCol}>
            <Text style={[styles.earningLabel, { color: colors.textSecondary }]}>Participation aux frais</Text>
            <Text style={[styles.earning, { color: colors.success }]}>
              {formatCurrency(mission.transporterEarning)}
            </Text>
          </View>
        </View>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Colis</Text>
          <Text style={[styles.packageDesc, { color: colors.textSecondary }]}>
            {mission.package.description} — {mission.package.size} — {mission.package.weight} kg
          </Text>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Progression</Text>
        <MissionTimeline mission={mission} />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Participants</Text>
        <ParticipantsCard
          seller={mission.seller}
          buyer={mission.buyer}
          transporter={mission.transporter}
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

// ─── SELLER WAITING SCREEN ────────────────────────────────

function SellerWaitingScreen({ mission, colors, router }: { mission: Mission; colors: any; router: any }) {
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState({ minutes: 20, seconds: 0, total: 1200, pct: 1 });

  useEffect(() => {
    if (!mission.sellerTimerEnd) return;
    const tick = () => {
      const diff = new Date(mission.sellerTimerEnd!).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining({ minutes: 0, seconds: 0, total: 0, pct: 0 });
        return;
      }
      const totalSec = Math.ceil(diff / 1000);
      setRemaining({
        minutes: Math.floor(totalSec / 60),
        seconds: totalSec % 60,
        total: totalSec,
        pct: totalSec / (20 * 60),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [mission.sellerTimerEnd]);

  const ringColor = remaining.total <= 300 ? colors.error : remaining.total <= 900 ? colors.warning : colors.primary;

  return (
    <View style={[sw.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <Header title="Co-livraison" showBack />
      </View>

      <View style={sw.content}>
        <Text style={[sw.title, { color: colors.text }]}>En attente de la confirmation du vendeur</Text>

        <View style={[sw.sellerAvatar, { backgroundColor: colors.accent + '30' }]}>
          <Text style={sw.sellerInitial}>{mission.seller.name[0]}</Text>
        </View>
        <Text style={[sw.sellerName, { color: colors.text }]}>{mission.seller.name}</Text>

        <View style={sw.timerContainer}>
          <View style={[sw.timerRing, { borderColor: colors.border }]} />
          <View style={[sw.timerRingProgress, { borderColor: ringColor, borderRightColor: 'transparent', borderBottomColor: remaining.pct > 0.5 ? ringColor : 'transparent', transform: [{ rotate: `${(1 - remaining.pct) * 360}deg` }] }]} />
          <View style={sw.timerCenter}>
            <Text style={[sw.timerMinutes, { color: ringColor }]}>
              {String(remaining.minutes).padStart(2, '0')}:{String(remaining.seconds).padStart(2, '0')}
            </Text>
          </View>
        </View>

        <Text style={[sw.timerHint, { color: colors.textSecondary }]}>
          Le vendeur doit confirmer sa présence au hub dans les 20 prochaines minutes.
        </Text>
        <Text style={[sw.warmText, { color: colors.textSecondary }]}>
          Patience, nous attendons la réponse du vendeur. Nous vous notifierons dès qu'il confirme.
        </Text>
      </View>
    </View>
  );
}

// ─── EXPIRED STATE ────────────────────────────────────────

function ExpiredScreen({ mission, colors, router }: { mission: Mission; colors: any; router: any }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[sw.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <Header title="Co-livraison" showBack />
      </View>

      <View style={sw.content}>
        <Text style={sw.expiredEmoji}>⏰</Text>
        <Text style={[sw.expiredTitle, { color: colors.text }]}>Co-livraison annulée</Text>
        <Text style={[sw.expiredSub, { color: colors.textSecondary }]}>
          Le vendeur n'a pas confirmé à temps.
        </Text>
        <Text style={[sw.warmText, { color: colors.textSecondary }]}>
          Pas d'inquiétude, de nouvelles co-livraisons arrivent régulièrement.
        </Text>
      </View>

      <View style={[sw.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          title="Retour aux co-livraisons"
          onPress={() => router.replace('/(tabs)/missions')}
          variant="gradient"
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const sw = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl, gap: Spacing.lg },
  title: { ...Typography.h2, textAlign: 'center' },
  sellerAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  sellerInitial: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#FFFFFF' },
  sellerName: { ...Typography.bodyMedium },
  timerContainer: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  timerRing: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 8 },
  timerRingProgress: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 8 },
  timerCenter: { alignItems: 'center' },
  timerMinutes: { fontFamily: 'Poppins_700Bold', fontSize: 32, lineHeight: 40 },
  timerHint: { ...Typography.body, textAlign: 'center', lineHeight: 22 },
  warmText: { ...Typography.caption, textAlign: 'center', lineHeight: 18, fontStyle: 'italic' },
  expiredEmoji: { fontSize: 56 },
  expiredTitle: { ...Typography.h1, textAlign: 'center' },
  expiredSub: { ...Typography.body, textAlign: 'center' },
  footer: { paddingHorizontal: Spacing.xxl },
});

const styles = StyleSheet.create({
  scroll: { gap: Spacing.lg, paddingBottom: Spacing.section },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningCol: { alignItems: 'flex-end' },
  earningLabel: { ...Typography.caption },
  earning: { ...Typography.h2 },
  sectionTitle: { ...Typography.h3 },
  packageDesc: { ...Typography.body, marginTop: Spacing.xs },
  notFound: { ...Typography.body, textAlign: 'center', marginTop: Spacing.section },
});
