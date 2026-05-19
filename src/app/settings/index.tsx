import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, ScrollView, Linking, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { Header } from '@/components/layout/Header';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PermissionExplainerSheet, type PermissionKind } from '@/components/settings/PermissionExplainerSheet';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

function normalize(status: string | undefined): PermissionStatus {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

const STATUS_LABEL: Record<PermissionStatus, string> = {
  granted: 'Autorisé',
  denied: 'Refusé',
  undetermined: 'Non demandé',
};

export default function SettingsScreen() {
  const { colors } = useColorScheme();
  const { t, lang, changeLanguage } = useTranslation();
  const router = useRouter();

  const [photos, setPhotos] = useState<PermissionStatus>('undetermined');
  const [camera, setCamera] = useState<PermissionStatus>('undetermined');
  const [notifs, setNotifs] = useState<PermissionStatus>('undetermined');
  const [location, setLocation] = useState<PermissionStatus>('undetermined');

  const [sheet, setSheet] = useState<PermissionKind | null>(null);

  const refreshAll = useCallback(async () => {
    const [p, c, n, l] = await Promise.all([
      ImagePicker.getMediaLibraryPermissionsAsync(),
      Camera.getCameraPermissionsAsync(),
      Notifications.getPermissionsAsync(),
      Location.getForegroundPermissionsAsync(),
    ]);
    setPhotos(normalize(p.status));
    setCamera(normalize(c.status));
    setNotifs(normalize(n.status));
    setLocation(normalize(l.status));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll]),
  );

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {}
  };

  const handlePermPress = async (kind: PermissionKind) => {
    if (kind === 'photos') {
      if (photos === 'granted') {
        setSheet('photos');
        return;
      }
      const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const next = normalize(result.status);
      setPhotos(next);
      if (next !== 'granted') setSheet('photos');
      return;
    }
    if (kind === 'camera') {
      if (camera === 'granted') {
        setSheet('camera');
        return;
      }
      const result = await Camera.requestCameraPermissionsAsync();
      const next = normalize(result.status);
      setCamera(next);
      if (next !== 'granted') setSheet('camera');
      return;
    }
    if (kind === 'notifications') {
      if (notifs === 'granted') {
        setSheet('notifications');
        return;
      }
      const result = await Notifications.requestPermissionsAsync();
      const next = normalize(result.status);
      setNotifs(next);
      if (next !== 'granted') setSheet('notifications');
      return;
    }
    if (kind === 'location') {
      if (location === 'granted') {
        setSheet('location');
        return;
      }
      const result = await Location.requestForegroundPermissionsAsync();
      const next = normalize(result.status);
      setLocation(next);
      if (next !== 'granted') setSheet('location');
      return;
    }
  };

  const appItems: { iconName: IconName; label: string; onPress: () => void }[] = [
    { iconName: 'globe', label: `${t('profile.language')}: ${lang.toUpperCase()}`, onPress: () => changeLanguage(lang === 'fr' ? 'en' : 'fr') },
    { iconName: 'star-outline', label: t('profile.favoriteClients'), onPress: () => router.push('/settings/favorite-clients') },
    { iconName: 'bell', label: t('profile.notifications'), onPress: () => router.push('/notifications') },
    { iconName: 'clipboard', label: 'Vos responsabilités', onPress: () => router.push('/responsabilites' as any) },
    { iconName: 'shield', label: 'Protocole incidents', onPress: () => router.push('/incidents-protocol' as any) },
    { iconName: 'help', label: t('profile.help'), onPress: () => {} },
    { iconName: 'info', label: t('profile.about'), onPress: () => {} },
  ];

  const permItems: { kind: PermissionKind; iconName: IconName; label: string; status: PermissionStatus; accent: string }[] = [
    { kind: 'photos', iconName: 'photo', label: 'Accès aux photos', status: photos, accent: colors.accent },
    { kind: 'camera', iconName: 'camera', label: 'Accès à la caméra', status: camera, accent: colors.primary },
    { kind: 'notifications', iconName: 'bell', label: 'Notifications', status: notifs, accent: colors.primary },
    { kind: 'location', iconName: 'pin', label: 'Localisation', status: location, accent: colors.primary },
  ];

  return (
    <SafeAreaWrapper>
      <Header title={t('profile.settings')} showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* App preferences */}
        {appItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={item.onPress}
          >
            <Icon name={item.iconName} size={20} color={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
            <Icon name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}

        {/* Permissions section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Autorisations</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Vous pouvez autoriser l'accès quand vous voulez depuis les réglages du téléphone.
          </Text>
        </View>
        {permItems.map((item) => (
          <Pressable
            key={item.kind}
            onPress={() => handlePermPress(item.kind)}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}, ${STATUS_LABEL[item.status].toLowerCase()}. Ouvrir les options.`}
            accessibilityState={{ selected: item.status === 'granted' }}
            style={({ pressed }) => [
              styles.permRow,
              { borderBottomColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.permIcon, { backgroundColor: item.accent + '20' }]}>
              <Icon name={item.iconName} size={18} color={item.accent} />
            </View>
            <View style={styles.permText}>
              <Text style={[styles.permLabel, { color: colors.text }]}>{item.label}</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        item.status === 'granted'
                          ? colors.success
                          : item.status === 'denied'
                            ? colors.warning
                            : colors.textSecondary,
                    },
                  ]}
                />
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}

        {/* Privacy note */}
        <View style={[styles.note, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
          <Icon name="shield" size={18} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Vos appels se font directement dans l'application. Vos numéros de téléphone ne sont jamais partagés avec les autres utilisateurs.
          </Text>
        </View>
      </ScrollView>

      {sheet && (
        <PermissionExplainerSheet
          visible={sheet !== null}
          onClose={() => setSheet(null)}
          permission={sheet}
          onOpenSettings={() => {
            setSheet(null);
            openSettings();
          }}
        />
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.section,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
    gap: Spacing.md,
  },
  label: {
    ...Typography.body,
    flex: 1,
  },

  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    gap: 4,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  sectionHint: {
    ...Typography.caption,
    lineHeight: 18,
  },

  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
    gap: Spacing.md,
    minHeight: 64,
  },
  permIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permText: {
    flex: 1,
    gap: 2,
  },
  permLabel: {
    ...Typography.bodyMedium,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    ...Typography.caption,
  },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  noteText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
  },
});
