import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import { Icon } from '@/components/ui/Icon';
import { HubMap } from '@/components/hub/HubMap';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import type { HubPresence } from '@/hooks/useHubPresence';
import { CLE_MESSAGE_GPS } from '@/utils/positionDuTelephone';
import { getToleranceWindow, isWithinTolerance } from '@/utils/tolerance';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import type { Hub } from '@/types/hub';

/**
 * « Déclarer ma présence au hub » — LE MÊME BLOC QUE LA MARKETPLACE.
 *
 * Demande client du 12/08/2026 : l'écran qui s'ouvre sous « Action suivante »
 * doit être celui que le vendeur et l'acheteur voient de leur côté. Les trois
 * parties se retrouvent au même endroit, à la même minute — leur donner trois
 * mises en page différentes de la même attente n'aide personne.
 *
 * ⚠️ MÊME ORDRE, MÊME VOCABULAIRE, MÊMES GARDES que
 * `hand-to-hand/src/components/logistics/HubPresence.tsx` : titre, consigne,
 * créneau, bouton, message essentiel, plan de zone, note de confidentialité.
 *
 * ⚠️ CE N'EST PAS UN COPIER-COLLER DU CODE, et ça ne peut pas l'être : les deux
 * apps ont des socles différents (thème, i18n, et surtout la carte — la
 * marketplace tient sur `react-native-maps`, celle-ci sur `expo-maps`).
 * Ce qui est repris, c'est la MISE EN PAGE et les MOTS, pas les composants.
 *
 * 🟢 LE BOUTON RESTE DANS LA CARTE ICI. Côté marketplace il en est sorti le
 * même jour, parce que le bouton d'étape y portait le même libellé. Ici le
 * bouton d'étape est « Scanner le QR… » : la carte est le SEUL endroit où le
 * cotransporteur particulier peut déclarer sa présence.
 */
interface HubPresenceCardProps {
  /**
   * `null` : hub absent du référentiel. Pas de plan à dessiner, mais la
   * présence reste déclarable — sinon le scan resterait verrouillé et la
   * co-livraison s'arrêterait sur un écran muet.
   */
  hub: Hub | null;
  /**
   * 🔴 LA POSITION VIENT DE L'ÉCRAN, PAS D'ICI. La carte lisait son propre GPS
   * à côté de celui de l'écran : deux relevés, et c'était celui de l'écran — lu
   * une fois, à l'ouverture — qui partait au serveur, pendant que la carte
   * affichait l'autre. Un seul lecteur : ce qu'on voit est ce qu'on envoie.
   */
  presence: HubPresence;
  scheduledTime: string;
  /** Celle de la mission. PAS de valeur par défaut — voir `utils/tolerance.ts`. */
  toleranceMinutes: number;
  /** Présence déjà enregistrée — la carte montre l'état confirmé. */
  confirmed?: boolean;
  /**
   * Le dernier verdict du SERVEUR, quand il était hors zone. La carte le montre
   * et propose de réessayer — au lieu d'un toast de deux secondes suivi du
   * passage au scan, qui laissait croire que tout était en ordre.
   */
  horsZone?: { distanceM: number; rayonM: number } | null;
  /** Une déclaration part : bouton occupé. */
  enCours?: boolean;
  /** Déclare (ou redéclare) la présence. */
  onConfirm: () => void;
  /** Hors zone : passer quand même au scan — l'arrivée reste enregistrée. */
  onContinuer?: () => void;
}

export function HubPresenceCard({
  hub,
  presence,
  scheduledTime,
  toleranceMinutes,
  confirmed = false,
  horsZone = null,
  enCours = false,
  onConfirm,
  onContinuer,
}: HubPresenceCardProps) {
  const { colors } = useColorScheme();
  const { t } = useTranslation();
  const { coords, distanceMeters, inZone, loading, etat, precisionM } = presence;

  const { start, end } = getToleranceWindow(scheduledTime, toleranceMinutes);
  const withinWindow = isWithinTolerance(scheduledTime, toleranceMinutes);

  // Statut du créneau, dans les mots de la marketplace : « Préparation » avant
  // l'heure, « Tolérance » après, « En retard » une fois la fenêtre passée.
  const minutesToScheduled = dayjs(scheduledTime).diff(dayjs(), 'minute', true);
  const past = minutesToScheduled < -toleranceMinutes;
  const statusLabel = past
    ? t('presence.statusLate')
    : minutesToScheduled >= 0
      ? t('presence.statusPreparation')
      : t('presence.statusTolerance');
  const statusColor = past ? colors.error : minutesToScheduled >= 0 ? colors.primary : colors.warning;

  // ⚠️ UN RETOUR D'APPUI, PAS DE SUCCÈS : le verdict n'est pas encore rendu.
  // L'écran vibre « succès » ou « avertissement » selon ce que dit le serveur.
  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onConfirm();
  };

  const libelleBouton = enCours
    ? t('presence.sending')
    : horsZone
      ? t('presence.retry')
      : t('presence.button');
  const boutonActif = withinWindow && !enCours;

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Titre — pastille + intitulé, comme la marketplace */}
      <View style={s.titleRow}>
        <View style={[s.titleIcon, { backgroundColor: colors.primary + '12' }]}>
          <Icon name="location-filled" size={18} color={colors.primary} />
        </View>
        <Text style={[s.title, { color: colors.text }]}>{t('presence.title')}</Text>
      </View>

      <Text style={[s.intro, { color: colors.textSecondary }]}>{t('presence.subText')}</Text>

      {/* Créneau + statut, sur une ligne */}
      <View style={[s.windowRow, { backgroundColor: statusColor + '10' }]}>
        <Icon name="time" size={14} color={statusColor} />
        <Text style={[s.windowText, { color: statusColor }]}>
          {start} – {end}
        </Text>
        <View style={{ flex: 1 }} />
        <View style={[s.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      {/* Déclaration — ou son état confirmé */}
      {confirmed ? (
        <View style={[s.confirmedBox, { backgroundColor: colors.success + '12' }]}>
          <Icon name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[s.confirmedText, { color: colors.success }]}>
            {t('presence.registered')}
          </Text>
        </View>
      ) : (
        <>
          {/* 🔴 LE VERDICT DU SERVEUR, QUAND IL ÉTAIT HORS ZONE — et on RESTE
              ICI. L'arrivée est enregistrée ; la validation, non. Le guide dit
              « ne peut pas ENCORE être validée » : il faut pouvoir réessayer. */}
          {horsZone && (
            <View
              style={[s.outsideBox, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '40' }]}
              accessibilityLiveRegion="polite"
            >
              <View style={s.outsideTitleRow}>
                <Icon name="alert-circle" size={16} color={colors.warning} />
                <Text style={[s.outsideTitle, { color: colors.text }]}>{t('presence.outsideTitle')}</Text>
              </View>
              <Text style={[s.outsideBody, { color: colors.text }]}>
                {t('presence.outsideBody')
                  .replace('{m}', String(Math.round(horsZone.distanceM)))
                  .replace('{radius}', String(Math.round(horsZone.rayonM)))}
              </Text>
            </View>
          )}

          {/* ⚠️ Désactivé HORS CRÉNEAU seulement — pas hors zone. Une présence
              déclarée trop tôt n'a pas de sens ; une présence déclarée à 30 m du
              point central en a un, et le plan ci-dessous le montre déjà. */}
          <Pressable
            onPress={handleConfirm}
            disabled={!boutonActif}
            style={{ opacity: boutonActif ? 1 : 0.5 }}
            accessibilityRole="button"
            accessibilityLabel={libelleBouton}
            accessibilityState={{ disabled: !boutonActif, busy: enCours }}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.primaryBtn}
            >
              {enCours ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name={horsZone ? 'refresh' : 'checkmark-circle'} size={18} color="#FFFFFF" />
              )}
              <Text style={s.primaryBtnText}>{libelleBouton}</Text>
            </LinearGradient>
          </Pressable>

          {horsZone && onContinuer ? (
            <Pressable
              onPress={onContinuer}
              disabled={enCours}
              accessibilityRole="button"
              accessibilityLabel={t('presence.continueUnvalidated')}
              accessibilityHint={t('presence.continueUnvalidatedHint')}
              style={s.continueBtn}
            >
              <Text style={[s.continueText, { color: colors.primary }]}>{t('presence.continueUnvalidated')}</Text>
              <Text style={[s.hint, { color: colors.textSecondary, textAlign: 'center' }]}>
                {t('presence.continueUnvalidatedHint')}
              </Text>
            </Pressable>
          ) : (
            <View style={[s.essentialRow, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}>
              <Icon name="alert-circle" size={14} color={colors.warning} />
              <Text style={[s.essentialText, { color: colors.text }]}>
                {t('presence.essentialMessage')}
              </Text>
            </View>
          )}

          {!withinWindow && !past && (
            <Text style={[s.hint, { color: colors.textSecondary }]}>{t('presence.earlyRecommend')}</Text>
          )}
        </>
      )}

      {/* 🔴 POURQUOI IL N'Y A PAS DE POSITION — dans les mots de la cause, et
          AVANT l'appui : on apprend qu'il faut autoriser la localisation en
          arrivant sur la page, pas en échouant devant l'autre partie. */}
      {!confirmed && etat !== 'ok' && (
        <View style={[s.gpsRow, { backgroundColor: colors.textSecondary + '10' }]} accessibilityLiveRegion="polite">
          {loading ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Icon name="location-filled" size={14} color={colors.warning} />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[s.gpsText, { color: colors.text }]}>
              {loading ? t('presence.gpsSearching') : t(CLE_MESSAGE_GPS[etat])}
            </Text>
            {etat === 'permission' && (
              <Pressable onPress={() => { void Linking.openSettings(); }} accessibilityRole="link">
                <Text style={[s.gpsLink, { color: colors.primary }]}>{t('presence.openSettings')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Plan de la zone — position PROPRE uniquement. */}
      {hub && (
        <HubMap
          hub={hub}
          moi={coords ? { lat: coords.latitude, lng: coords.longitude } : null}
          dansLaZone={inZone}
        />
      )}

      {/* Distance, quand elle est connue et qu'on n'est pas dans la zone —
          RELUE EN CONTINU : c'est elle qui dit quand réessayer. */}
      {!inZone && distanceMeters != null && (
        <View style={[s.distanceRow, { backgroundColor: colors.warning + '12' }]}>
          <Icon name="location-filled" size={14} color={colors.warning} />
          <Text style={[s.distanceText, { color: colors.warning }]}>
            {t('presence.distanceAway').replace('{distance}', String(Math.round(distanceMeters)))}
            {precisionM != null
              ? ` · ${t('presence.accuracy').replace('{m}', String(Math.round(precisionM)))}`
              : ''}
          </Text>
        </View>
      )}

      <View style={s.confidentialityRow}>
        <Icon name="lock" size={13} color={colors.textSecondary} />
        <Text style={[s.confidentialityText, { color: colors.textSecondary }]}>
          {t('presence.confidentiality')}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  titleIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.bodyMedium, fontFamily: 'Poppins_600SemiBold', flex: 1 },
  intro: { ...Typography.caption },

  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  windowText: { ...Typography.captionMedium, fontFamily: 'Poppins_600SemiBold' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...Typography.captionMedium },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
  },
  primaryBtnText: { ...Typography.button, color: '#FFFFFF' },

  essentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  essentialText: { ...Typography.caption, flex: 1, fontFamily: 'Poppins_500Medium' },

  hint: { ...Typography.caption },

  confirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  confirmedText: { ...Typography.bodyMedium, fontFamily: 'Poppins_600SemiBold' },

  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  distanceText: { ...Typography.captionMedium },

  outsideBox: { padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, gap: 6 },
  outsideTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  outsideTitle: { ...Typography.bodyMedium, fontFamily: 'Poppins_600SemiBold', flex: 1 },
  outsideBody: { ...Typography.caption },

  continueBtn: { alignItems: 'center', gap: 2, paddingVertical: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  continueText: { ...Typography.captionMedium, fontFamily: 'Poppins_600SemiBold', textDecorationLine: 'underline' },

  gpsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  gpsText: { ...Typography.caption },
  gpsLink: { ...Typography.captionMedium, textDecorationLine: 'underline' },

  confidentialityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  confidentialityText: { ...Typography.caption, fontSize: 11, flex: 1 },
});
