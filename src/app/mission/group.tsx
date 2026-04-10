import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { Icon } from '@/components/ui/Icon';
import { MissionTimeline } from '@/components/mission/MissionTimeline';
import { OffHubProposalSheet } from '@/components/logistics/OffHubProposal';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMissionStore } from '@/stores/useMissionStore';
import { formatCurrency } from '@/utils/formatting';
import type { Mission, MissionParticipant } from '@/types/mission';

const QUICK_MESSAGES = [
  'Je suis en route',
  'Je suis arrivé au hub',
  'Le colis est prêt',
  'Un léger décalage, merci pour votre patience',
  'Tout se passe bien !',
];

export default function MissionGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getMissionById } = useMissionStore();

  const mission = getMissionById(id ?? '');

  if (!mission) {
    return (
      <View style={[gs.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={{ paddingHorizontal: Spacing.lg }}><Header title="Mission" showBack /></View>
        <Text style={[gs.notFound, { color: colors.textSecondary }]}>Mission introuvable</Text>
      </View>
    );
  }

  return <GroupContent mission={mission} colors={colors} router={router} insets={insets} />;
}

function GroupContent({ mission, colors, router, insets }: { mission: Mission; colors: any; router: any; insets: any }) {
  const { cancelMission, reportSellerAbsence, reportBuyerAbsence, proposeOffHub, updateMissionStatus } = useMissionStore();
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'warning' | 'error'>('success');
  const [packageExpanded, setPackageExpanded] = useState(false);
  const [showOffHub, setShowOffHub] = useState(false);
  const [responsibilityExpanded, setResponsibilityExpanded] = useState(false);

  const missionCode = `HTH-${mission.id.slice(-4).toUpperCase()}`;

  const canProposeOffHub = useMemo(() => {
    const targetTime = ['pickup_pending', 'group_created'].includes(mission.status)
      ? mission.pickupHub.scheduledTime
      : mission.deliveryHub.scheduledTime;
    const windowStart = dayjs(targetTime).subtract(10, 'minute');
    return dayjs().isBefore(windowStart) && !mission.offHubProposal;
  }, [mission]);

  const toast = (msg: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastMsg(msg); setToastType(type); setShowToast(true);
  };

  const sendQuickMessage = (msg: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toast(`Message envoyé : "${msg}"`); };
  const handlePickup = () => router.push({ pathname: '/mission/pickup', params: { id: mission.id } });
  const handleDelivery = () => router.push({ pathname: '/mission/delivery', params: { id: mission.id } });
  const handleNavigate = () => router.push({ pathname: '/navigate/[missionId]', params: { missionId: mission.id } });

  const handleOffHub = (target: 'seller' | 'buyer', address: string, time: string) => {
    setShowOffHub(false);
    proposeOffHub(mission.id, { target, address, proposedTime: time });
    toast('Proposition envoyée. En attente de réponse...');
    setTimeout(() => toast('Proposition acceptée ! Nouveau point confirmé.'), 3500);
  };

  const handleReportSellerAbsence = () => {
    Alert.alert('Signaler l\'absence du vendeur', 'La mission sera annulée sans pénalité pour vous.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Signaler', onPress: () => { reportSellerAbsence(mission.id); toast('Mission annulée — absence du vendeur.', 'warning'); setTimeout(() => router.replace('/(tabs)/missions'), 2000); } },
    ]);
  };

  const handleReportBuyerAbsence = () => {
    Alert.alert('L\'acheteur ne s\'est pas présenté', 'Que souhaitez-vous faire ?', [
      { text: 'Attendre +5 min', onPress: () => { reportBuyerAbsence(mission.id, true); toast('Tolérance étendue.'); } },
      { text: 'Annuler', style: 'destructive', onPress: () => { reportBuyerAbsence(mission.id, false); toast('Mission annulée.', 'warning'); setTimeout(() => router.replace('/(tabs)/missions'), 2000); } },
      { text: 'Patienter', style: 'cancel' },
    ]);
  };

  const handleCancelMission = () => {
    const hasPackage = ['picked_up', 'in_transit', 'delivery_pending'].includes(mission.status);
    const reason = hasPackage ? 'transporter_cancelled_after_pickup' as const : 'transporter_cancelled_before_pickup' as const;
    const msg = hasPackage
      ? 'Vous avez le colis. Veuillez le remettre au hub le plus proche.'
      : 'L\'annulation sera notée sur votre profil.';

    Alert.alert(hasPackage ? 'Vous avez le colis' : 'Annuler la mission ?', msg, [
      { text: 'Retour', style: 'cancel' },
      { text: hasPackage ? 'J\'ai remis le colis' : 'Confirmer l\'annulation', style: 'destructive', onPress: () => { cancelMission(mission.id, reason); toast('Mission annulée.', 'warning'); setTimeout(() => router.replace('/(tabs)/missions'), 2000); } },
    ]);
  };

  const isPickupLate = mission.status === 'pickup_pending' && dayjs().isAfter(dayjs(mission.pickupHub.scheduledTime).add(mission.pickupHub.toleranceMinutes, 'minute'));
  const isDeliveryLate = mission.status === 'delivery_pending' && dayjs().isAfter(dayjs(mission.deliveryHub.scheduledTime).add(mission.deliveryHub.toleranceMinutes, 'minute'));

  return (
    <View style={[gs.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
        <Header title={`Mission #${missionCode}`} showBack />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[gs.scroll, { paddingBottom: insets.bottom + Spacing.xxl }]}>

        {/* Off-hub active banner */}
        {mission.offHubProposal?.status === 'accepted' && (
          <View style={[gs.banner, { backgroundColor: colors.warning + '12' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Icon name="location-filled" size={14} color={colors.warning} /><Text style={[gs.bannerText, { color: colors.warning }]}>Rendez-vous hors hub — pas de vérification GPS</Text></View>
          </View>
        )}

        {/* Participants */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <Card>
            <View style={gs.participantsRow}>
              <PBubble p={mission.seller} role="Vendeur" hub={mission.pickupHub.isOffHub ? `Hors hub — ${mission.pickupHub.offHubAddress}` : mission.pickupHub.name} colors={colors} onContact={() => toast('Chat vendeur — bientôt disponible')} />
              <View style={gs.youBubble}>
                <View style={[gs.avatar, { backgroundColor: colors.primary }]}><Text style={gs.avatarText}>{mission.transporter.name[0]}</Text></View>
                <Text style={[gs.pName, { color: colors.text }]}>Vous</Text>
                <View style={gs.youStatus}><View style={[gs.sDot, { backgroundColor: colors.success }]} /><Text style={[gs.sLabel, { color: colors.success }]}>En route</Text></View>
              </View>
              <PBubble p={mission.buyer} role="Acheteur" hub={mission.deliveryHub.isOffHub ? `Hors hub — ${mission.deliveryHub.offHubAddress}` : mission.deliveryHub.name} colors={colors} onContact={() => toast('Chat acheteur — bientôt disponible')} />
            </View>
          </Card>
        </Animated.View>

        {/* No-show alerts */}
        {isPickupLate && (
          <Card style={{ backgroundColor: colors.error + '08', borderColor: colors.error + '30' }}>
            <Text style={[gs.alertTitle, { color: colors.error }]}>Le vendeur ne s'est pas présenté</Text>
            <Text style={[gs.alertDesc, { color: colors.textSecondary }]}>Pas d'inquiétude, aucune pénalité pour vous.</Text>
            <Button title="Signaler l'absence" onPress={handleReportSellerAbsence} variant="danger" />
          </Card>
        )}
        {isDeliveryLate && (
          <Card style={{ backgroundColor: colors.warning + '08', borderColor: colors.warning + '30' }}>
            <Text style={[gs.alertTitle, { color: colors.warning }]}>L'acheteur ne s'est pas présenté</Text>
            <Text style={[gs.alertDesc, { color: colors.textSecondary }]}>Vous pouvez attendre ou signaler l'absence.</Text>
            <Button title="Options" onPress={handleReportBuyerAbsence} variant="outline" />
          </Card>
        )}

        {/* Timeline */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <Text style={[gs.section, { color: colors.text }]}>Suivi de livraison</Text>
          <MissionTimeline mission={mission} onPickup={handlePickup} onDelivery={handleDelivery} onNavigate={handleNavigate} />
        </Animated.View>

        {/* Off-hub link */}
        {canProposeOffHub && (
          <TouchableOpacity onPress={() => setShowOffHub(true)} hitSlop={12}>
            <Text style={[gs.offHubLink, { color: colors.primary }]}>Proposer hors hub</Text>
          </TouchableOpacity>
        )}
        {!canProposeOffHub && !mission.offHubProposal && (
          <Text style={[gs.offHubDisabled, { color: colors.textSecondary }]}>Le hors hub n'est plus disponible.</Text>
        )}
        {mission.offHubProposal?.status === 'pending' && (
          <View style={[gs.banner, { backgroundColor: colors.primary + '08' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Icon name="hourglass" size={14} color={colors.primary} /><Text style={[gs.bannerText, { color: colors.primary }]}>Proposition hors hub en attente...</Text></View>
          </View>
        )}

        {/* Quick messages */}
        <Animated.View entering={FadeInDown.delay(300).duration(300)}>
          <Text style={[gs.section, { color: colors.text }]}>Messages rapides</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={gs.msgs}>
            {QUICK_MESSAGES.map((m, i) => (
              <TouchableOpacity key={i} onPress={() => sendQuickMessage(m)} style={[gs.msgPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[gs.msgText, { color: colors.text }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Responsibility */}
        <Animated.View entering={FadeInDown.delay(400).duration(300)}>
          <TouchableOpacity onPress={() => setResponsibilityExpanded(!responsibilityExpanded)} activeOpacity={0.8}>
            <Card style={{ backgroundColor: colors.primary + '06' }}>
              <View style={gs.respH}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="clipboard" size={16} color={colors.text} /><Text style={[gs.respT, { color: colors.text }]}>Vos responsabilités</Text></View><Text style={{ color: colors.textSecondary }}>{responsibilityExpanded ? '▴' : '▾'}</Text></View>
              {responsibilityExpanded && (
                <View style={gs.respB}>
                  <RR t="Votre responsabilité commence à l'heure exacte du rendez-vous." c={colors} />
                  <RR t="Vous devez être disponible jusqu'à +10 minutes." c={colors} />
                  <RR t="L'arrivée en avance (-10 min) est conseillée mais pas obligatoire." c={colors} />
                </View>
              )}
            </Card>
          </TouchableOpacity>
        </Animated.View>

        {/* Package */}
        <Animated.View entering={FadeInDown.delay(500).duration(300)}>
          <TouchableOpacity onPress={() => setPackageExpanded(!packageExpanded)} activeOpacity={0.8}>
            <Card>
              <View style={gs.pkgH}>
                <View style={gs.pkgHL}>
                  <View style={[gs.pkgT, { backgroundColor: colors.primary + '10' }]}><Icon name="package" size={22} color={colors.primary} /></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[gs.pkgTitle, { color: colors.text }]} numberOfLines={1}>{mission.package.description}</Text>
                    <Text style={[gs.pkgSub, { color: colors.textSecondary }]}>Taille {mission.package.size} — {mission.package.weight} kg</Text>
                  </View>
                </View>
                <Text style={{ color: colors.textSecondary }}>{packageExpanded ? '▴' : '▾'}</Text>
              </View>
              {packageExpanded && (
                <View style={[gs.pkgD, { borderTopColor: colors.border }]}>
                  <DR l="Vos gains" v={formatCurrency(mission.transporterEarning)} c={colors} vc={colors.success} />
                </View>
              )}
            </Card>
          </TouchableOpacity>
        </Animated.View>

        {/* Cancel */}
        <TouchableOpacity onPress={handleCancelMission} hitSlop={12} style={gs.cancelBtn}>
          <Text style={[gs.cancelText, { color: colors.error }]}>Annuler la mission</Text>
        </TouchableOpacity>
      </ScrollView>

      <OffHubProposalSheet visible={showOffHub} onClose={() => setShowOffHub(false)} onSend={handleOffHub} pickupHubName={mission.pickupHub.name} deliveryHubName={mission.deliveryHub.name} />
      <Toast message={toastMsg} type={toastType} visible={showToast} onHide={() => setShowToast(false)} duration={2500} />
    </View>
  );
}

function PBubble({ p, role, hub, colors, onContact }: { p: MissionParticipant; role: string; hub: string; colors: any; onContact: () => void }) {
  return (
    <View style={gs.pBubble}>
      <View style={[gs.avatar, { backgroundColor: colors.accent + '40' }]}><Text style={[gs.avatarText, { color: colors.primary }]}>{p.name[0]}</Text></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <Text style={[gs.pName, { color: colors.text }]} numberOfLines={1}>{p.name.split(' ')[0]}</Text>
        {p.isFavorite && <Icon name="star" size={10} color={colors.warning} />}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Icon name="location" size={10} color={colors.textSecondary} /><Text style={[gs.pHub, { color: colors.textSecondary }]} numberOfLines={1}>{hub.length > 16 ? hub.slice(0, 15) + '…' : hub}</Text></View>
      <TouchableOpacity onPress={onContact} style={[gs.cBtn, { borderColor: colors.primary }]}><Text style={[gs.cText, { color: colors.primary }]}>Contacter</Text></TouchableOpacity>
    </View>
  );
}

function DR({ l, v, c, vc }: { l: string; v: string; c: any; vc?: string }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={[gs.pkgSub, { color: c.textSecondary }]}>{l}</Text><Text style={[gs.pkgTitle, { color: vc ?? c.text }]}>{v}</Text></View>;
}

function RR({ t, c }: { t: string; c: any }) {
  return <View style={{ flexDirection: 'row', gap: Spacing.sm }}><Text style={{ color: c.primary }}>•</Text><Text style={[gs.pkgSub, { color: c.textSecondary, flex: 1, lineHeight: 20 }]}>{t}</Text></View>;
}

const gs = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.xl },
  notFound: { ...Typography.body, textAlign: 'center', marginTop: Spacing.section },
  section: { ...Typography.h3, marginBottom: Spacing.md },
  banner: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md },
  bannerText: { ...Typography.captionMedium, textAlign: 'center' },
  alertTitle: { ...Typography.bodyMedium, marginBottom: Spacing.xs },
  alertDesc: { ...Typography.caption, lineHeight: 18, marginBottom: Spacing.md },
  offHubLink: { ...Typography.captionMedium, textDecorationLine: 'underline', textAlign: 'center' },
  offHubDisabled: { ...Typography.caption, textAlign: 'center', fontStyle: 'italic' },
  participantsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  pBubble: { flex: 1, alignItems: 'center', gap: 4 },
  youBubble: { flex: 1, alignItems: 'center', gap: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#FFFFFF' },
  pName: { ...Typography.captionMedium, textAlign: 'center', maxWidth: 80 },
  pHub: { fontSize: 10, lineHeight: 14, textAlign: 'center' },
  youStatus: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sDot: { width: 6, height: 6, borderRadius: 3 },
  sLabel: { fontSize: 10, fontFamily: 'Poppins_500Medium' },
  cBtn: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, marginTop: 2 },
  cText: { fontSize: 10, fontFamily: 'Poppins_500Medium' },
  msgs: { gap: Spacing.sm, paddingRight: Spacing.lg },
  msgPill: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1 },
  msgText: { ...Typography.caption },
  respH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  respT: { ...Typography.bodyMedium },
  respB: { marginTop: Spacing.md, gap: Spacing.sm },
  pkgH: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pkgHL: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  pkgT: { width: 44, height: 44, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  pkgTitle: { ...Typography.bodyMedium },
  pkgSub: { ...Typography.caption },
  pkgD: { borderTopWidth: 0.5, marginTop: Spacing.md, paddingTop: Spacing.md, gap: Spacing.sm },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  cancelText: { ...Typography.captionMedium, textDecorationLine: 'underline' },
});
