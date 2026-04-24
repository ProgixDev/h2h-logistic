import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

export type PermissionKind = 'photos' | 'camera' | 'notifications' | 'location';

interface PermissionExplainerSheetProps {
  visible: boolean;
  onClose: () => void;
  permission: PermissionKind;
  /** Called when the user taps the primary CTA. Typically `Linking.openSettings()`. */
  onOpenSettings: () => void;
}

const COPY: Record<
  PermissionKind,
  { title: string; body: string; icon: IconName; accent: 'primary' | 'accent' }
> = {
  photos: {
    title: 'Accès aux photos',
    body: "Hand to Hand Logistic utilise vos photos uniquement pour joindre une image à un signalement ou à votre profil. Vous pouvez autoriser l'accès dans les réglages.",
    icon: 'photo',
    accent: 'accent',
  },
  camera: {
    title: 'Accès à la caméra',
    body: 'La caméra est utilisée pour scanner les QR codes des vendeurs, acheteurs et colis.',
    icon: 'camera',
    accent: 'primary',
  },
  notifications: {
    title: 'Notifications',
    body: "Les notifications vous informent d'une nouvelle livraison ou d'un message. Vous restez maître de ce que vous recevez.",
    icon: 'bell',
    accent: 'primary',
  },
  location: {
    title: 'Localisation',
    body: 'La localisation nous aide à vérifier que vous êtes au bon hub, et à vous guider avec la navigation.',
    icon: 'pin',
    accent: 'primary',
  },
};

export function PermissionExplainerSheet({
  visible,
  onClose,
  permission,
  onOpenSettings,
}: PermissionExplainerSheetProps) {
  const { colors } = useColorScheme();
  const copy = COPY[permission];
  const accentColor = copy.accent === 'primary' ? colors.primary : colors.accent;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
          <Icon name={copy.icon} size={28} color={accentColor} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{copy.body}</Text>
        <Text style={[styles.reassure, { color: colors.textSecondary }]}>
          Vous pouvez autoriser l'accès quand vous voulez depuis les réglages du téléphone.
        </Text>
        <Button title="Ouvrir les réglages" onPress={onOpenSettings} variant="gradient" />
        <Button title="Plus tard" onPress={onClose} variant="outline" />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h2,
    textAlign: 'center',
  },
  body: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  reassure: {
    ...Typography.caption,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
});
