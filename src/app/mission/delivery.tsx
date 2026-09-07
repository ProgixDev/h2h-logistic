import React, { useState, useEffect } from 'react';
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
import { HubPresenceCard } from '@/components/logistics/HubPresenceCard';
import { ToleranceWindow } from '@/components/logistics/ToleranceWindow';
import { Icon } from '@/components/ui/Icon';
import { ScanProgressDots } from '@/components/mission/ScanProgressDots';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useMissionStore } from '@/stores/useMissionStore';
import { useRouteStore } from '@/stores/useRouteStore';
import { chargerHubs } from '@/services/hubs';
import { declarerPresenceHub } from '@/services/presenceHub';
import { useHubPresence } from '@/hooks/useHubPresence';
import type { Hub } from '@/types/hub';
import { isAfterTolerance, getToleranceWindow } from '@/utils/tolerance';
import { enregistrerScan, messageDeScan, nouvelleCle } from '@/services/scans';

// 🔴 07/09/2026 — « presence » ARRIVE ENFIN SUR LA REMISE. La récupération
// avait sa page depuis le 12/08/2026 ; la remise, elle, commençait à
// « approach » et n'a JAMAIS eu d'étape de présence. Le cotransporteur ne
// pouvait donc pas se déclarer au HUB DE REMISE — le point dont le guide
// client parle le plus.
//
// 🔴 ET LA CONSÉQUENCE N'ÉTAIT PAS COSMÉTIQUE. La révélation GPS du §4 exige
// DEUX déclarations pour la même étape. L'acheteur avait la sienne depuis
// `logistics/presence-au-hub` côté place de marché ; sans celle-ci, le compte
// ne pouvait pas atteindre deux, et le voile ne pouvait jamais se lever sur la
// remise. La règle existait en base, complète, et restait inatteignable.
type DeliveryStep = 'presence' | 'approach' | 'scan-buyer' | 'scan-package' | 'confirmed';

const MAX_PACKAGE_ATTEMPTS = 3;

export default function DeliveryScreen() {
  const { colors } = useColorScheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMissionById, charger } = useMissionStore();
  const { routes } = useRouteStore();

  const mission = getMissionById(id ?? '');
  // ⚠️ HORS HUB, ON SAUTE LA PAGE 1, comme à la récupération : un rendez-vous
  // hors hub n'a ni zone ni point central à montrer, et sa présence ne se
  // vérifie pas au GPS. L'y envoyer donnerait une page vide dont on ne
  // pourrait pas sortir.
  const offHubDelivery = getMissionById(id ?? '')?.deliveryHub.isOffHub === true;
  const [step, setStep] = useState<DeliveryStep>(offHubDelivery ? 'approach' : 'presence');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [scannerResetSignal, setScannerResetSignal] = useState(0);
  const [packageAttempts, setPackageAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [proximity] = useState(180);
  // 🔴 BATTEMENT DE 10 s — IL FAIT VIVRE LA RÈGLE D'ABSENCE, exactement comme
  // à la récupération. Sans lui, le cotransporteur particulier qui ATTEND
  // l'acheteur ne verrait jamais les signalements s'ouvrir.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);
  const [earningsReleased, setEarningsReleased] = useState(false);
  const [displayedEarnings, setDisplayedEarnings] = useState('0.00');

  // ⚠️ CHARGÉ, DONC ABSENT UN INSTANT : l'écran montre moins tant que le hub
  // n'est pas là, il ne se vide pas.
  const [fullHub, setFullHub] = useState<Hub | null>(null);
  const hubVise = mission?.deliveryHub?.id;
  useEffect(() => {
    let vivant = true;
    if (!hubVise) return;
    chargerHubs()
      .then((hubs) => { if (vivant) setFullHub(hubs.find((h) => h.id === hubVise) ?? null); })
      .catch((e) => console.error('[mission] hub de remise illisible', e));
    return () => { vivant = false; };
  }, [hubVise]);

  // 🔴 CES DEUX-LÀ SONT AU-DESSUS DU `if (!mission)`, ET C'EST OBLIGATOIRE.
  // Un hook posé après une sortie anticipée change le NOMBRE de hooks entre
  // deux rendus — React lève « Rendered more hooks than during the previous
  // render ». C'est le défaut que ce fichier a déjà connu, et que le premier
  // jet de la déclaration de présence a réintroduit côté récupération.
  //
  // ⚠️ `useHubPresence` NE DÉCIDE DE RIEN. Il donne la position du téléphone
  // pour l'afficher et pour l'ENVOYER ; le verdict de zone revient du serveur.
  const { coords } = useHubPresence(fullHub);
  const [declaration, setDeclaration] = useState(false);

  const checkScale = useSharedValue(0);
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  if (!mission) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <Header title="Co-livraison" showBack />
        </View>
        <Text style={[s.notFound, { color: colors.textSecondary }]}>Co-livraison introuvable</Text>
      </View>
    );
  }

  const missionCode = `HTH-${mission.id.slice(-4).toUpperCase()}`;
  const openIncident = (type: string) =>
    router.push({ pathname: '/incident/[type]' as any, params: { type, missionId: mission.id } });
  const showToast = (msg: string, type: 'success' | 'warning' | 'error' = 'success') => setToast({ msg, type });
  const resetScanner = () => setScannerResetSignal((n) => n + 1);

  const runEarningsCounter = () => {
    const target = mission.transporterEarning;
    const duration = 1500;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedEarnings((target * eased).toFixed(2));
      if (progress < 1) requestAnimationFrame(tick);
    };
    setTimeout(tick, 600);
  };

  // 🔴 LE TROU QUE CETTE TRANCHE FERME, ET IL ÉTAIT PIRE QU'À LA RÉCUPÉRATION.
  // `matchesBuyer()` acceptait tout code commençant par `BUY-` ou `HTH-` — donc
  // l'étiquette du colis, que le cotransporteur PORTE depuis la récupération.
  // Il pouvait « livrer » chez lui : `delivered_at` se posait, et le versement
  // du vendeur partait à J+3 +48 h sur un colis que personne n'avait reçu.
  //
  // 🔴 LA BASE EXIGE DÉSORMAIS L'IDENTITÉ D'EN FACE (`app.preuve_requise`) : le
  // passage à `delivered` n'est ouvert qu'après un scan acheteur RÉUSSI.
  // Scanner l'étiquette seule rend `no_eligible`.
  //
  // ⚠️ CES DEUX-LÀ ÉTAIENT DES `useCallback` déclarés APRÈS le `if (!mission)
  // return` : le nombre de hooks changeait d'un rendu à l'autre.
  const handleBuyerScan = (async (code: string) => {
    if (envoiEnCours) return;
    setEnvoiEnCours(true);
    try {
      const r = await enregistrerScan({
        shipmentId: mission.shipmentId,
        genre: 'buyer_qr',
        code,
        etape: 1,
        cle: nouvelleCle(`remise-acheteur-${mission.id}`),
      });
      if (r === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Acheteur identifié ✓', 'success');
        AccessibilityInfo.announceForAccessibility('Acheteur identifié. Étape 2 sur 2 : scanner le colis.');
        setTimeout(() => setStep('scan-package'), 400);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(messageDeScan(r, 'buyer_qr'), 'error');
        resetScanner();
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(e instanceof Error ? e.message : 'Scan impossible', 'error');
      resetScanner();
    } finally {
      setEnvoiEnCours(false);
    }
  });

  const handlePackageScan = (async (code: string) => {
    if (envoiEnCours) return;
    setEnvoiEnCours(true);
    try {
      const r = await enregistrerScan({
        shipmentId: mission.shipmentId,
        genre: 'tracking_qr',
        code,
        etape: 2,
        versEtat: 'delivered',
        hubId: mission.deliveryHub.id || null,
        cle: nouvelleCle(`remise-colis-${mission.id}`),
      });
      if (r === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Colis vérifié ✓', 'success');
        setEarningsReleased(true);
        // ⚠️ PLUS D'ACCUMULATION EN MÉMOIRE ICI. L'impact se DÉRIVE des missions
        // terminées (`impactEcologique`) : le `charger()` ci-dessous ramène celle
        // qui vient de l'être, et le total se recalcule tout seul — y compris
        // après un redémarrage, ce que le magasin sans persistance perdait.
        AccessibilityInfo.announceForAccessibility('Co-livraison confirmée. Paiement en cours de libération.');
        setStep('confirmed');
        checkScale.value = withSpring(1, { damping: 12, stiffness: 150 });
        runEarningsCounter();
        // ⚠️ ON RELIT : le statut de la mission est une projection de l'état du
        // colis, que la base vient de faire passer à « livré ».
        void charger();
      } else {
        const next = packageAttempts + 1;
        setPackageAttempts(next);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (next >= MAX_PACKAGE_ATTEMPTS) {
          setLocked(true);
          showToast("Besoin d'aide ? Contactez le support via le chat.", 'error');
        } else {
          showToast(messageDeScan(r, 'tracking_qr'), 'error');
          resetScanner();
        }
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(e instanceof Error ? e.message : 'Scan impossible', 'error');
      resetScanner();
    } finally {
      setEnvoiEnCours(false);
    }
  });

  // 🔴 LA DÉCLARATION DE PRÉSENCE À LA REMISE, jumelle de celle de
  // `mission/pickup` — mêmes gardes, même vocabulaire, seule l'étape change.
  //
  // ⚠️ `'remise'` ET PAS `'recuperation'`. Le serveur dérive la partie de la
  // mission, mais PAS l'étape : c'est le seul paramètre qui dit de quel hub on
  // parle. Se tromper ici écrirait la présence du cotransporteur sur le hub du
  // vendeur, et le compte de la révélation resterait bloqué à un.
  //
  // ⚠️ ON ENREGISTRE TOUJOURS, ON NE VALIDE QUE DANS LA ZONE. Hors zone, le
  // guide dit que « sa présence ne peut pas ENCORE être validée » — pas que
  // rien ne s'est passé. Le message rapporte ce que le serveur a répondu,
  // distance comprise.
  const validatePresence = async () => {
    if (declaration) return;
    setDeclaration(true);
    try {
      // ⚠️ SANS POSITION, PAS DE DÉCLARATION. Le serveur refuse un appel sans
      // coordonnées, et il a raison : une présence sans position ne prouve
      // rien. On le dit plutôt que d'envoyer un point inventé.
      if (!coords) {
        showToast(t('presence.noLocation'), 'error');
        return;
      }
      const r = await declarerPresenceHub(mission.id, 'remise', {
        lat: coords.latitude,
        lng: coords.longitude,
      });
      await Haptics.notificationAsync(
        r.dansLaZone
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      const message = r.dansLaZone
        ? t('presence.recorded')
        : t('presence.recordedOutside').replace('{m}', String(Math.round(r.distanceM)));
      showToast(message, r.dansLaZone ? 'success' : 'warning');
      AccessibilityInfo.announceForAccessibility(message);
      // ⚠️ ON AVANCE MÊME HORS ZONE. Bloquer le scan sur une erreur GPS
      // immobiliserait la co-livraison en retirant l'outil censé aider les
      // deux personnes à se trouver — et l'arrivée est déjà enregistrée.
      setStep('approach');
    } catch (e) {
      // Le serveur dit pourquoi : hors hub, étape qui ne vous concerne pas,
      // aucun hub fixé pour cette étape.
      console.error('[presence] declaration impossible', e);
      showToast(e instanceof Error ? e.message : t('presence.failed'), 'error');
    } finally {
      setDeclaration(false);
    }
  };

  // ⚠️ UNE SEULE FOIS, LU PAR LES DEUX PAGES. Le nom et le détail affiché sont
  // la même chose à la présence et à l'approche ; les écrire deux fois, c'est
  // s'assurer qu'ils divergeront.
  const hubCard = (
    <Card>
      <View style={s.hubRow}>
        <Icon name="hub-gare" size={28} color={colors.primary} />
        <View style={s.hubInfo}>
          <Text style={[s.hubName, { color: colors.text }]}>{mission.deliveryHub.name}</Text>
          <Text style={[s.hubCity, { color: colors.textSecondary }]}>
            {/* 🔴 LE DÉTAIL AFFICHÉ, pas la ville : c'est la ligne du protocole
                qui dit où se présenter. « Nice » ne distingue pas quatre
                entrées de gare ; « Av. Thiers, côté parking » si. */}
            {fullHub?.displayDetail ?? mission.deliveryHub.city}
          </Text>
        </View>
      </View>
    </Card>
  );

  // ─── STEP: PRESENCE ────────────────────────────────────────
  if (step === 'presence') {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
          <Header title="Co-livraison du colis" showBack />
          <Text style={[s.missionRef, { color: colors.textSecondary }]}>#{missionCode}</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {hubCard}

          {fullHub ? (
            <HubPresenceCard
              hub={fullHub}
              scheduledTime={mission.deliveryHub.scheduledTime}
              toleranceMinutes={mission.deliveryHub.toleranceMinutes}
              onConfirm={validatePresence}
            />
          ) : (
            /* ⚠️ HUB INTROUVABLE DANS LE RÉFÉRENTIEL : pas de zone à dessiner,
               mais la présence doit rester déclarable — sinon le scan reste
               verrouillé et la co-livraison s'arrête sur un écran muet. */
            <Button
              title={t('presence.button')}
              onPress={validatePresence}
              variant="gradient"
              style={{ minHeight: 52 }}
            />
          )}
        </ScrollView>

        {toast && (
          <Toast message={toast.msg} type={toast.type} visible onHide={() => setToast(null)} duration={2500} />
        )}
      </View>
    );
  }

  // ─── STEP: APPROACH ────────────────────────────────────────
  if (step === 'approach') {
    // Absence et blocage : ouverts SEULEMENT apres la fin de la tolerance.
    const absenceUnlocked = isAfterTolerance(
      mission.deliveryHub.scheduledTime,
      mission.deliveryHub.toleranceMinutes,
    );
    const toleranceEnd = getToleranceWindow(
      mission.deliveryHub.scheduledTime,
      mission.deliveryHub.toleranceMinutes,
    ).end;

    const proximityColor = proximity > 500 ? colors.primary : colors.success;
    const proximityLabel = proximity > 500 ? 'Vous approchez du hub' : 'Vous êtes à proximité !';

    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
          <Header title="Co-livraison du colis" showBack />
          <Text style={[s.missionRef, { color: colors.textSecondary }]}>#{missionCode}</Text>
          <ScanProgressDots partyLabel="Acheteur" partyState="pending" packageState="pending" />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {hubCard}

          <ToleranceWindow
            scheduledTime={mission.deliveryHub.scheduledTime}
            toleranceMinutes={mission.deliveryHub.toleranceMinutes}
          />

          <View style={[s.proximityCard, { backgroundColor: proximityColor + '12' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="location-filled" size={16} color={proximityColor} />
              <Text style={[s.proximityText, { color: proximityColor }]}>{proximityLabel}</Text>
            </View>
          </View>

          <Card>
            <View style={s.buyerRow}>
              {mission.buyer.avatar ? (
                <Image source={{ uri: mission.buyer.avatar }} style={s.buyerAvatarImg} contentFit="cover" />
              ) : (
                <View style={[s.buyerAvatar, { backgroundColor: colors.accent + '30' }]}>
                  <Text style={[s.buyerInitial, { color: colors.primary }]}>{mission.buyer.name[0]}</Text>
                </View>
              )}
              <View style={s.buyerInfo}>
                <Text style={[s.buyerName, { color: colors.text }]}>{mission.buyer.name}</Text>
                <Text style={[s.buyerHint, { color: colors.textSecondary }]}>
                  L'acheteur va vous présenter son QR code
                </Text>
              </View>
              {mission.buyer.isFavorite && <Icon name="star" size={16} color={colors.warning} />}
            </View>
          </Card>

          {/* Incident entry points (hub de remise) */}
          {/* 🔴 ABSENCE ET BLOCAGE N'OUVRENT QU'APRÈS LA TOLÉRANCE (règle
              client du 12/08/2026), comme à la récupération. Pendant le
              créneau, l'acheteur a le droit d'arriver.
              ⚠️ Ici il n'y a PAS de « refuser le colis » : la remise n'a donc
              aucun lien pendant le créneau — d'où la ligne qui dit à partir de
              quand, sans quoi ce serait un vide inexpliqué. */}
          <View style={s.incidentLinks}>
            {absenceUnlocked ? (
              <>
                <TouchableOpacity onPress={() => openIncident('buyer_absent')} hitSlop={8}>
                  <Text style={[s.incidentLink, { color: colors.primary }]}>{"L'acheteur n'est pas présent ?"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openIncident('hub_blocked')} hitSlop={8}>
                  <Text style={[s.incidentLink, { color: colors.textSecondary }]}>Signaler un blocage au hub</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={[s.incidentGateHint, { color: colors.textSecondary }]}>
                Signaler une absence ou un blocage sera possible après {toleranceEnd}.
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Button
            title="Scanner le QR de l'acheteur"
            onPress={() => {
              AccessibilityInfo.announceForAccessibility("Étape 1 sur 2 : scanner le QR de l'acheteur.");
              setStep('scan-buyer');
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

  // ─── STEP: SCAN BUYER ──────────────────────────────────────
  if (step === 'scan-buyer') {
    return (
      <View style={[s.screen, { backgroundColor: '#000' }]}>
        <View style={[s.scanHeader, { paddingTop: insets.top, backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <Header title="" showBack />
          <View style={s.stepBanner}>
            <Text style={s.stepBannerText}>Étape 1/2 — QR acheteur</Text>
          </View>
          <ScanProgressDots partyLabel="Acheteur" partyState="active" packageState="pending" />
        </View>
        <QRScanner
          mode="buyer-qr"
          onScan={handleBuyerScan}
          onManualEntry={handleBuyerScan}
          resetSignal={scannerResetSignal}
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
            <Header title="Co-livraison du colis" showBack />
            <ScanProgressDots partyLabel="Acheteur" partyState="done" packageState="active" />
          </View>
          <View style={s.lockedContent}>
            <Icon name="chat" size={56} color={colors.primary} />
            <Text style={[s.lockedTitle, { color: colors.text }]}>Besoin d'aide ?</Text>
            <Text style={[s.lockedSub, { color: colors.textSecondary }]}>
              Contactez le support via le chat. Nous allons vous aider à finaliser cette co-livraison.
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
          <ScanProgressDots partyLabel="Acheteur" partyState="done" packageState="active" />
          <View style={s.buyerConfirm}>
            {mission.buyer.avatar ? (
              <Image source={{ uri: mission.buyer.avatar }} style={s.buyerConfirmAvatar} contentFit="cover" />
            ) : (
              <View style={[s.buyerConfirmAvatar, { backgroundColor: colors.accent + '60', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' }}>{mission.buyer.name[0]}</Text>
              </View>
            )}
            <Text style={s.buyerConfirmName} numberOfLines={1}>
              {mission.buyer.name.split(' ')[0]} identifié ✓
            </Text>
          </View>
        </View>
        <QRScanner
          mode="package"
          onScan={handlePackageScan}
          onManualEntry={handlePackageScan}
          resetSignal={scannerResetSignal}
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
          <Text style={[s.confirmedTitle, { color: colors.text }]}>Co-livraison confirmée ✓</Text>
          <Text style={[s.confirmedSub, { color: colors.textSecondary }]}>
            Le colis a été remis à {mission.buyer.name} avec succès.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ width: '100%', paddingHorizontal: Spacing.xxl }}>
          <Card style={{ backgroundColor: colors.success + '10', borderColor: colors.success + '30' }}>
            <View style={s.earningsCard}>
              <Text style={[s.earningsLabel, { color: colors.textSecondary }]}>
                Vous avez gagné pour cette co-livraison
              </Text>
              <Text style={[s.earningsAmount, { color: colors.success }]}>
                {displayedEarnings}€
              </Text>
              <Text style={[s.earningsCaption, { color: colors.textSecondary }]}>
                {earningsReleased ? 'Paiement libéré sur votre portefeuille' : 'Le montant sera crédité sur votre portefeuille'}
              </Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(800)}>
          <Text style={[s.warmMsg, { color: colors.textSecondary }]}>
            Bravo et merci pour cette co-livraison !
          </Text>
        </Animated.View>
      </View>

      <View style={[s.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          title="Retour aux co-livraisons"
          onPress={() => router.replace('/(tabs)/missions')}
          variant="gradient"
          style={{ minHeight: 52 }}
        />
      </View>

      {toast && (
        <Toast message={toast.msg} type={toast.type} visible onHide={() => setToast(null)} duration={3000} />
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

  proximityCard: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center' },
  proximityText: { ...Typography.bodyMedium },
  incidentLinks: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xs },
  incidentLink: { ...Typography.captionMedium, textDecorationLine: 'underline', textAlign: 'center' },
  // Jamais souligne : ce n'est pas un lien, c'est la raison de leur absence.
  incidentGateHint: { ...Typography.caption, textAlign: 'center' },

  buyerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  buyerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  buyerAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  buyerInitial: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  buyerInfo: { flex: 1, gap: Spacing.xs },
  buyerName: { ...Typography.bodyMedium },
  buyerHint: { ...Typography.caption, lineHeight: 18 },

  scanHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  stepBanner: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, marginVertical: Spacing.xs },
  stepBannerText: { color: '#FFFFFF', ...Typography.captionMedium },

  buyerConfirm: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'center', backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, marginTop: 4 },
  buyerConfirmAvatar: { width: 24, height: 24, borderRadius: 12 },
  buyerConfirmName: { color: '#FFFFFF', ...Typography.captionMedium },

  confirmedContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  checkCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  checkIcon: { color: '#FFFFFF', fontSize: 40, fontWeight: '700', lineHeight: 44 },
  confirmedText: { alignItems: 'center', gap: Spacing.sm },
  confirmedTitle: { ...Typography.h1, textAlign: 'center' },
  confirmedSub: { ...Typography.body, textAlign: 'center', paddingHorizontal: Spacing.xxl, lineHeight: 22 },

  earningsCard: { alignItems: 'center', gap: Spacing.sm },
  earningsLabel: { ...Typography.body, textAlign: 'center' },
  earningsAmount: { fontFamily: 'Poppins_700Bold', fontSize: 36, lineHeight: 44 },
  earningsCaption: { ...Typography.caption, textAlign: 'center' },

  warmMsg: { ...Typography.body, textAlign: 'center', fontStyle: 'italic' },

  lockedContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.lg },
  lockedTitle: { ...Typography.h2 },
  lockedSub: { ...Typography.body, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.md },

  footer: { paddingHorizontal: Spacing.lg },
});
