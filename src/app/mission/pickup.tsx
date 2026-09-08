import React, { useState, useMemo, useEffect } from 'react';
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
import { chargerHubs } from '@/services/hubs';
import { declarerPresenceHub } from '@/services/presenceHub';
import { useHubPresence } from '@/hooks/useHubPresence';
import type { Hub } from '@/types/hub';
import { isAfterTolerance, getToleranceWindow } from '@/utils/tolerance';
import { enregistrerScan, messageDeScan, nouvelleCle } from '@/services/scans';

// 🔴 « presence » EST LA PREMIÈRE PAGE DEPUIS LE 12/08/2026 (demande client).
// C'est elle qui s'ouvre sous « ACTION SUIVANTE », et c'est la MÊME que celle
// du vendeur et de l'acheteur côté marketplace : les trois parties arrivent au
// même hub à la même minute, elles voient désormais le même écran.
//
// ⚠️ LA DÉCLARATION A DONC QUITTÉ « approach ». Le bouton « Valider ma présence
// au hub » qui y vivait est retiré : il ferait doublon avec celui de la page 1,
// et deux boutons pour un seul acte, c'est le défaut qu'on vient de corriger
// côté marketplace.
type PickupStep = 'presence' | 'approach' | 'scan-seller' | 'scan-package' | 'confirmed';

const MAX_PACKAGE_ATTEMPTS = 3;

export default function PickupScreen() {
  const { colors } = useColorScheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMissionById, charger } = useMissionStore();

  const mission = getMissionById(id ?? '');
  // ⚠️ HORS HUB, ON SAUTE LA PAGE 1 : un rendez-vous hors hub n'a ni zone ni
  // point central à montrer, et sa présence ne se vérifie pas au GPS. L'y
  // envoyer donnerait une page vide dont on ne pourrait pas sortir.
  const offHubPickup = getMissionById(id ?? '')?.pickupHub.isOffHub === true;
  const [step, setStep] = useState<PickupStep>(offHubPickup ? 'approach' : 'presence');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [scannerResetSignal, setScannerResetSignal] = useState(0);
  const [packageAttempts, setPackageAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  // Récupération : la présence au hub se valide AVANT le scan (demande client —
  // différence avec la remise qui va directement au scan).
  const [presenceValidated, setPresenceValidated] = useState(false);

  // 🔴 BATTEMENT DE 10 s — IL FAIT VIVRE LA RÈGLE D'ABSENCE.
  // Les signalements d'absence s'ouvrent à la fin de la tolérance. Sans ce
  // réveil, la page resterait figée sur son état d'arrivée : le cotransporteur
  // particulier qui ATTEND le vendeur — c'est-à-dire exactement celui à qui la
  // règle s'adresse — ne les verrait jamais apparaître.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  // 🔴 LE HUB COMPLET VIENT DE LA BASE, PLUS DE `mockHubs`. Cet écran résolvait
  // le point de rendez-vous dans une liste de vingt-cinq lieux INVENTÉS, avec de
  // vraies adresses et de vrais téléphones — et c'était la seule source de
  // coordonnées de la carte de présence. Un cotransporteur envoyé là serait allé
  // sonner chez quelqu'un.
  //
  // 🔴 ET CES DEUX HOOKS SONT ICI, AU-DESSUS DU `if (!mission) return`, PAS PLUS
  // BAS. Écrits après la sortie anticipée, ils changeaient le NOMBRE DE HOOKS
  // entre deux rendus : le premier rendu (mission absente du magasin) en posait
  // N, le second N + 2, et React lève « Rendered more hooks than during the
  // previous render ». C'est le défaut que `lintSansErreur.test.ts` a été écrit
  // pour attraper, et qui faisait tomber l'écran de conversation à chaque
  // ouverture à froid.
  //
  // ⚠️ CHARGÉ, DONC ABSENT UN INSTANT : l'écran montre moins tant qu'il n'est pas
  // là, il ne se vide pas.
  const [fullHub, setFullHub] = useState<Hub | null>(null);
  const hubVise = mission?.pickupHub?.id;
  useEffect(() => {
    let vivant = true;
    if (!hubVise) return;
    chargerHubs()
      .then((hubs) => { if (vivant) setFullHub(hubs.find((h) => h.id === hubVise) ?? null); })
      .catch((e) => console.error('[mission] hub de recuperation illisible', e));
    return () => { vivant = false; };
  }, [hubVise]);

  // 🔴 CES DEUX-LÀ SONT AU-DESSUS DU `if (!mission)`, ET C'EST OBLIGATOIRE.
  // Un hook posé après une sortie anticipée change le NOMBRE de hooks entre deux
  // rendus — React lève « Rendered more hooks than during the previous render ».
  // C'est le défaut que l'en-tête de ce fichier décrit déjà, et le premier jet
  // de la déclaration de présence l'a réintroduit en plaçant son `useState`
  // à côté de la fonction qui s'en sert.
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

  // 🔴 `matchesSeller()` ET `matchesPackage()` ONT DISPARU, ET C'EST L'OBJET
  // MÊME DE CETTE TRANCHE. Le premier acceptait N'IMPORTE QUEL code commençant
  // par `SEL-` ou `HTH-` — c'est-à-dire l'étiquette que le cotransporteur tient
  // déjà en main. Et de toute façon, un contrôle qui vit sur le téléphone n'est
  // pas un contrôle : deux boutons de développement, juste en dessous, le
  // sautaient en entier.
  //
  // 🔴 LA COMPARAISON EST EN BASE (`20260822270000`). On n'envoie plus un
  // verdict, on envoie un CODE — et c'est `record_scan_event` qui dit s'il est
  // le bon.
  //
  // ⚠️ ET LA BASE EXIGE DEUX CHOSES : le bon code, ET la preuve de la rencontre.
  // Le passage à `picked_up` n'est ouvert qu'après un scan vendeur RÉUSSI ;
  // scanner l'étiquette seule rend `no_eligible`.
  //
  // ⚠️ CES DEUX-LÀ ÉTAIENT DES `useCallback`, déclarés APRÈS le `if (!mission)
  // return` du dessus : le nombre de hooks changeait d'un rendu à l'autre. Des
  // fonctions simples suffisent — `QRScanner` n'est pas mémoïsé.
  const handleSellerScan = (async (code: string) => {
    if (envoiEnCours) return;
    setEnvoiEnCours(true);
    try {
      const r = await enregistrerScan({
        shipmentId: mission.shipmentId,
        genre: 'seller_qr',
        code,
        etape: 1,
        cle: nouvelleCle(`pickup-vendeur-${mission.id}`),
      });
      if (r === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Vendeur identifié ✓', 'success');
        AccessibilityInfo.announceForAccessibility('Vendeur identifié. Étape 2 sur 2 : scanner le colis.');
        setTimeout(() => setStep('scan-package'), 400);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(messageDeScan(r, 'seller_qr'), 'error');
        resetScanner();
      }
    } catch (e) {
      // 🔴 LE REFUS DU SERVEUR EST UNE RÈGLE, PAS UNE PANNE : « cette expedition
      // ne vous concerne pas », « le role declare n est pas le votre ».
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
        // ⚠️ C'EST CE SCAN-CI QUI FAIT AVANCER LE COLIS, et seulement lui : le
        // scan du vendeur identifie, il ne transporte pas.
        versEtat: 'picked_up',
        hubId: mission.pickupHub.id || null,
        cle: nouvelleCle(`pickup-colis-${mission.id}`),
      });
      if (r === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Colis vérifié ✓', 'success');
        AccessibilityInfo.announceForAccessibility('Colis vérifié. Prise en charge confirmée.');
        setStep('confirmed');
        checkScale.value = withSpring(1, { damping: 12, stiffness: 150 });
        // ⚠️ ON RELIT LA MISSION : son statut est une PROJECTION de l'état du
        // colis, que la base vient de faire avancer.
        void charger();
      } else {
        const next = packageAttempts + 1;
        setPackageAttempts(next);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (next >= MAX_PACKAGE_ATTEMPTS) {
          setLocked(true);
          showToast('Merci de contacter le support via le chat.', 'error');
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

  const hubCard = (
    /* Fiche hub — nom, ADRESSE et HORAIRES, comme sur la marketplace.
       ⚠️ `MissionHub` ne porte QUE le nom, la ville et le créneau : le reste
       vit dans `mockHubs`, résolu par id. Le même chemin que `HubZoneCheck`
       empruntait avant d'être retiré du détail — puis SUPPRIMÉ le 08/09/2026,
       n'étant plus importé nulle part. Adresse et horaires restent
       facultatifs — un hub introuvable ne doit pas vider l'écran, seulement
       montrer moins. */
    <Card>
      <View style={s.hubRow}>
        <Icon name="hub-gare" size={28} color={colors.primary} />
        <View style={s.hubInfo}>
          <Text style={[s.hubName, { color: colors.text }]}>{mission.pickupHub.name}</Text>
          <Text style={[s.hubCity, { color: colors.textSecondary }]}>
            {/* 🔴 LE DÉTAIL AFFICHÉ, pas l'adresse ni les horaires : c'est la
                ligne du protocole qui dit où se présenter. Un point de
                rendez-vous n'ouvre ni ne ferme — les horaires décrivaient un
                entrepôt, et l'adresse ne distingue pas quatre entrées de gare. */}
            {fullHub?.displayDetail ?? mission.pickupHub.city}
          </Text>
        </View>
      </View>
    </Card>
  );

  // 🔴 CE BOUTON N'ENREGISTRAIT RIEN. Il posait un état local et affichait
  // « Présence validée au hub ✓ » — un message qui n'était vrai nulle part
  // ailleurs que sur cet écran. `20260906130000` avait construit la table
  // `hub_presence`, la fonction `declarer_presence_hub`, la règle de révélation
  // GPS et le miroir dans le journal du colis ; rien ne les appelait, ni ici ni
  // côté place de marché.
  //
  // Le guide client (§3) veut « un élément de preuve en cas d'absence, de retard
  // ou de réclamation ». Une preuve qui ne quitte pas le téléphone de celui
  // qu'elle engage n'en est pas une.
  //
  // ⚠️ ET LE MOT « VALIDÉE » ÉTAIT LE PLUS FAUX DES DEUX. Le serveur distingue
  // DÉCLARER (toujours enregistré) de VALIDER (seulement dans la zone). Hors
  // zone, le guide dit que « sa présence ne peut pas ENCORE être validée » — pas
  // que rien ne s'est passé. On écrit donc la ligne quoi qu'il arrive, et on
  // rapporte ce que le serveur a répondu.
  const validatePresence = async () => {
    if (declaration) return;
    setDeclaration(true);
    try {
      // ⚠️ SANS POSITION, PAS DE DÉCLARATION. Le serveur refuse un appel sans
      // coordonnées, et il a raison : une présence sans position ne prouve rien.
      // On le dit plutôt que d'envoyer un point inventé.
      if (!coords) {
        showToast(t('presence.noLocation'), 'error');
        return;
      }
      const r = await declarerPresenceHub(mission.id, 'recuperation', {
        lat: coords.latitude,
        lng: coords.longitude,
      });
      await Haptics.notificationAsync(
        r.dansLaZone
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      // 🔴 LE VERDICT VIENT DU SERVEUR, PAS DE `isInHubZone`. Les helpers locaux
      // servent à afficher la distance avant d'appuyer ; ils ne décident pas.
      showToast(
        r.dansLaZone
          ? t('presence.recorded')
          : t('presence.recordedOutside').replace('{m}', String(Math.round(r.distanceM))),
        r.dansLaZone ? 'success' : 'warning',
      );
      AccessibilityInfo.announceForAccessibility(
        r.dansLaZone ? t('presence.recorded') : t('presence.recordedOutside').replace('{m}', String(Math.round(r.distanceM))),
      );
      // ⚠️ ON AVANCE MÊME HORS ZONE. Bloquer le scan sur une erreur GPS
      // immobiliserait la co-livraison en retirant l'outil censé aider les deux
      // personnes à se trouver — et l'arrivée est déjà enregistrée.
      setPresenceValidated(true);
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

  // ─── PAGE 1 : DÉCLARER SA PRÉSENCE ─────────────────────────
  // 🔴 C'est CETTE page qui s'ouvre sous « ACTION SUIVANTE » (demande client du
  // 12/08/2026), et c'est la MÊME que celle du vendeur et de l'acheteur côté
  // marketplace : mêmes mots, même ordre, même plan de zone.
  //
  // ⚠️ UN SEUL BOUTON, celui de la carte. Il déclare la présence ET fait passer
  // à la page suivante — pas de « Continuer » en plus, qui ferait deux gestes
  // pour un seul acte.
  if (step === 'presence') {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
          <Header title="Récupération du colis" showBack />
          <Text style={[s.missionRef, { color: colors.textSecondary }]}>#{missionCode}</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {hubCard}

          {fullHub ? (
            <HubPresenceCard
              hub={fullHub}
              scheduledTime={mission.pickupHub.scheduledTime}
              toleranceMinutes={mission.pickupHub.toleranceMinutes}
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

  // ─── PAGE 2 : APPROCHE ET SCAN ─────────────────────────────
  if (step === 'approach') {
    // Off-hub rendez-vous → no GPS zone, just an info note (kept intact).
    const isOffHub = mission.pickupHub.isOffHub === true;
    // On-hub : la présence a été déclarée à la page 1.
    const scanUnlocked = isOffHub || presenceValidated;

    // Absence et blocage : ouverts SEULEMENT après la fin de la tolérance.
    const absenceUnlocked = isAfterTolerance(
      mission.pickupHub.scheduledTime,
      mission.pickupHub.toleranceMinutes,
    );
    const toleranceEnd = getToleranceWindow(
      mission.pickupHub.scheduledTime,
      mission.pickupHub.toleranceMinutes,
    ).end;

    const goToSellerScan = () => {
      AccessibilityInfo.announceForAccessibility('Étape 1 sur 2 : scanner le QR du vendeur.');
      setStep('scan-seller');
    };

    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
          <Header title="Récupération du colis" showBack />
          <Text style={[s.missionRef, { color: colors.textSecondary }]}>#{missionCode}</Text>
          <ScanProgressDots partyLabel="Vendeur" partyState="pending" packageState="pending" />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {hubCard}

          <ToleranceWindow
            scheduledTime={mission.pickupHub.scheduledTime}
            toleranceMinutes={mission.pickupHub.toleranceMinutes}
          />

          {/* 🔴 « Valider ma présence au hub » A ÉTÉ RETIRÉ D'ICI le 12/08/2026,
              à la demande du client : la déclaration se fait à la page
              précédente. Le laisser ici ferait deux boutons pour un seul acte —
              exactement le doublon corrigé côté marketplace le même jour.
              ⚠️ Hors hub, la page reste la première du parcours : son bandeau
              « pas de vérification GPS » explique pourquoi rien n'a été
              déclaré, et le scan n'attend aucune présence. */}
          {isOffHub && (
            <View style={[s.offHubBanner, { backgroundColor: colors.warning + '14' }]}>
              <Icon name="location-filled" size={14} color={colors.warning} />
              <Text style={[s.offHubText, { color: colors.warning }]}>{t('zone.offHubNoGps')}</Text>
            </View>
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

          {/* ── Points d'entrée incident ──────────────────────────────────
              🔴 L'ABSENCE ET LE BLOCAGE N'OUVRENT QU'APRÈS LA TOLÉRANCE
              (règle client du 12/08/2026). Pendant le créneau, le vendeur a le
              droit d'arriver : le déclarer absent à la 3ᵉ minute serait un
              signalement contre quelqu'un qui n'est pas encore en retard.
              ⚠️ « Refuser le colis » RESTE, LUI, TOUJOURS OUVERT : il ne parle
              pas d'un retard mais de ce qu'on a sous les yeux — un colis non
              conforme l'est dès la première seconde du créneau. */}
          <View style={s.incidentLinks}>
            {absenceUnlocked && (
              <TouchableOpacity onPress={() => openIncident('seller_absent')} hitSlop={8}>
                <Text style={[s.incidentLink, { color: colors.primary }]}>{"Le vendeur n'est pas présent ?"}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => openIncident('refuse_package')} hitSlop={8}>
              <Text style={[s.incidentLink, { color: colors.textSecondary }]}>Refuser le colis (non conforme)</Text>
            </TouchableOpacity>
            {absenceUnlocked && (
              <TouchableOpacity onPress={() => openIncident('collect_absent')} hitSlop={8}>
                <Text style={[s.incidentLink, { color: colors.textSecondary }]}>Signaler un blocage à la collecte</Text>
              </TouchableOpacity>
            )}
            {/* ⚠️ DIRE QUAND, PLUTÔT QUE DE LAISSER CHERCHER. Sans cette ligne,
                le cotransporteur particulier dont le vendeur a cinq minutes de
                retard cherche « le vendeur n'est pas présent ? » et ne le
                trouve pas — l'absence d'un lien n'explique rien. */}
            {!absenceUnlocked && (
              <Text style={[s.incidentGateHint, { color: colors.textSecondary }]}>
                Signaler une absence ou un blocage sera possible après {toleranceEnd}.
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          {!scanUnlocked && (
            <Text style={[s.scanGateHint, { color: colors.textSecondary }]}>
              Validez votre présence au hub pour scanner le QR du vendeur.
            </Text>
          )}
          <Button
            title="Scanner le QR du vendeur"
            onPress={goToSellerScan}
            variant="gradient"
            disabled={!scanUnlocked}
            style={{ minHeight: 52 }}
          />
        </View>

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
            <Text style={[s.lockedTitle, { color: colors.text }]}>Besoin d’aide ?</Text>
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
          // ⚠️ « JE PARS » EST UN ÉVÉNEMENT, PAS UN CHANGEMENT D'ÉCRAN. Ce
          // bouton écrivait `in_transit` dans un magasin en mémoire : le colis
          // restait « récupéré » en base, et l'acheteur ne voyait jamais qu'il
          // était en route.
          //
          // ⚠️ GENRE `system` FAUTE DE MIEUX : le départ ne se scanne pas, il se
          // déclare. `handoff_kind` n'a pas de valeur « depart » ; `system` est
          // le seul genre sans code, donc le seul que la base accepte sans
          // comparer quoi que ce soit.
          onPress={async () => {
            try {
              await enregistrerScan({
                shipmentId: mission.shipmentId,
                genre: 'system',
                versEtat: 'in_transit',
                cle: nouvelleCle(`depart-${mission.id}`),
              });
              void charger();
            } catch (e) {
              showToast(e instanceof Error ? e.message : 'Départ non enregistré', 'error');
              return;
            }
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
  proximityCard: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center' },
  proximityText: { ...Typography.bodyMedium },
  scanGateHint: { ...Typography.caption, textAlign: 'center', marginBottom: Spacing.sm },
  incidentLinks: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xs },
  incidentLink: { ...Typography.captionMedium, textDecorationLine: 'underline', textAlign: 'center' },
  // Explique l'absence des liens pendant le creneau — jamais souligne : ce
  // n'est pas un lien, c'est la raison pour laquelle il n'y en a pas.
  incidentGateHint: { ...Typography.caption, textAlign: 'center' },

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
