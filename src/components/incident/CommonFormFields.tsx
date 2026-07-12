import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  DECLARANT_ROLE_LABELS,
  MISSION_FORM_STATUS_LABELS,
  type CommonFormData,
} from '@/types/incident';

/** Verbatim attestation shared by every incident form. */
export const ATTESTATION_TEXT =
  "Je certifie que les informations transmises dans ce formulaire sont exactes. Je comprends qu'une fausse déclaration peut entraîner une retenue de paiement, une absence de rémunération, des frais d'annulation, une suspension de compte ou une décision défavorable du support HandtoHand.";
export const ATTESTATION_CHECKBOX = "Je confirme l'exactitude de ma déclaration.";

/** Editable part of the common form (the auto-filled part lives in `info`). */
export interface CommonExtras {
  accuracyConfirmed: boolean;
  comment?: string;
  photoLieu?: string;
  captureStatut?: string;
  photoColis?: string;
  geo?: { lat: number; lng: number };
}

type PhotoSlot = 'photoLieu' | 'captureStatut' | 'photoColis';

interface CommonFormFieldsProps {
  /** Auto-filled co-livraison info (read-only display). */
  info: CommonFormData;
  value: CommonExtras;
  onChange: (next: CommonExtras) => void;
}

const PHOTO_SLOTS: { key: PhotoSlot; label: string }[] = [
  { key: 'photoLieu', label: 'Photo du lieu' },
  { key: 'captureStatut', label: 'Capture du statut' },
  { key: 'photoColis', label: 'Photo du colis' },
];

export function CommonFormFields({ info, value, onChange }: CommonFormFieldsProps) {
  const { colors } = useColorScheme();

  const patch = (p: Partial<CommonExtras>) => onChange({ ...value, ...p });

  const pickPhoto = async (slot: PhotoSlot) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Accès aux photos', "Autorisez l'accès aux photos pour joindre une image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.selectionAsync();
      patch({ [slot]: result.assets[0].uri } as Partial<CommonExtras>);
    }
  };

  const captureGeo = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Géolocalisation', 'Autorisez la localisation pour joindre votre position.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      Haptics.selectionAsync();
      patch({ geo: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
    } catch {
      Alert.alert('Géolocalisation', "Impossible de récupérer votre position pour le moment.");
    }
  };

  const infoRows: { label: string; value: string }[] = [
    { label: 'Numéro de transaction', value: info.transactionId },
    { label: 'Numéro de mission H2H', value: info.missionId },
    { label: 'Rôle du déclarant', value: DECLARANT_ROLE_LABELS[info.declarantRole] },
    { label: 'Hub / point de rendez-vous', value: info.hubName },
    { label: 'Date du rendez-vous', value: dayjs(info.rendezvousAt).format('DD/MM/YYYY') },
    { label: 'Heure du rendez-vous', value: dayjs(info.rendezvousAt).format('HH:mm') },
    { label: 'Heure de déclaration', value: dayjs(info.declaredAt).format('DD/MM/YYYY HH:mm') },
    { label: 'Statut de la mission', value: MISSION_FORM_STATUS_LABELS[info.missionStatus] },
  ];

  return (
    <View style={styles.wrap}>
      {/* Auto-filled co-livraison info */}
      <Card style={{ backgroundColor: colors.primary + '06' }}>
        <Text style={[styles.blockTitle, { color: colors.text }]}>Informations de la co-livraison</Text>
        <View style={styles.infoList}>
          {infoRows.map((r) => (
            <View key={r.label} style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{r.label}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{r.value}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Optional proofs */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preuves (optionnel)</Text>
        <View style={styles.photoRow}>
          {PHOTO_SLOTS.map(({ key, label }) => {
            const uri = value[key];
            return (
              <View key={key} style={styles.photoSlot}>
                {uri ? (
                  <View style={[styles.photo, { borderColor: colors.border }]}>
                    <Image source={{ uri }} style={styles.photoImg} contentFit="cover" />
                    <Pressable
                      onPress={() => patch({ [key]: undefined } as Partial<CommonExtras>)}
                      style={[styles.photoRemove, { backgroundColor: colors.surface }]}
                      hitSlop={6}
                      accessibilityLabel={`Retirer ${label}`}
                    >
                      <Icon name="close" size={13} color={colors.text} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => pickPhoto(key)}
                    style={[styles.photoAdd, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                  >
                    <Icon name="camera" size={20} color={colors.textSecondary} />
                  </Pressable>
                )}
                <Text style={[styles.photoLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* Géolocalisation */}
        <Pressable
          onPress={value.geo ? () => patch({ geo: undefined }) : captureGeo}
          style={({ pressed }) => [
            styles.geoRow,
            { borderColor: value.geo ? colors.success : colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Ajouter ma géolocalisation"
        >
          <Icon name="location-filled" size={16} color={value.geo ? colors.success : colors.textSecondary} />
          <Text style={[styles.geoText, { color: value.geo ? colors.success : colors.textSecondary }]}>
            {value.geo ? 'Géolocalisation ajoutée ✓' : 'Ajouter ma géolocalisation'}
          </Text>
        </Pressable>

        {/* Commentaire */}
        <TextInput
          value={value.comment ?? ''}
          onChangeText={(t) => patch({ comment: t })}
          placeholder="Commentaire (optionnel)"
          placeholderTextColor={colors.textSecondary}
          multiline
          style={[styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityLabel="Commentaire"
        />
      </View>

      {/* Attestation (mandatory) */}
      <Card style={{ backgroundColor: colors.primary + '06' }}>
        <Text style={[styles.blockTitle, { color: colors.text }]}>Déclaration</Text>
        <Text style={[styles.attestation, { color: colors.textSecondary }]}>{ATTESTATION_TEXT}</Text>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); patch({ accuracyConfirmed: !value.accuracyConfirmed }); }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: value.accuracyConfirmed }}
          accessibilityLabel={ATTESTATION_CHECKBOX}
          style={({ pressed }) => [
            styles.checkRow,
            { borderColor: value.accuracyConfirmed ? colors.primary : colors.border, backgroundColor: value.accuracyConfirmed ? colors.primary + '08' : colors.surface, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[styles.checkbox, { borderColor: value.accuracyConfirmed ? colors.primary : colors.border, backgroundColor: value.accuracyConfirmed ? colors.primary : 'transparent' }]}>
            {value.accuracyConfirmed && <Icon name="checkmark" size={14} color="#FFFFFF" />}
          </View>
          <Text style={[styles.checkLabel, { color: colors.text }]}>{ATTESTATION_CHECKBOX}</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg },
  blockTitle: { ...Typography.bodyMedium, marginBottom: Spacing.md },

  infoList: { gap: Spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  infoLabel: { ...Typography.caption, flex: 1 },
  infoValue: { ...Typography.captionMedium, flexShrink: 1, textAlign: 'right' },

  section: { gap: Spacing.md },
  sectionTitle: { ...Typography.bodyMedium },

  photoRow: { flexDirection: 'row', gap: Spacing.md },
  photoSlot: { alignItems: 'center', gap: 4, width: 84 },
  photo: { width: 84, height: 84, borderRadius: BorderRadius.md, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  photoAdd: { width: 84, height: 84, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  photoLabel: { ...Typography.caption, fontSize: 10, textAlign: 'center' },

  geoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  geoText: { ...Typography.captionMedium },

  textArea: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, minHeight: 80, textAlignVertical: 'top', ...Typography.body },

  attestation: { ...Typography.caption, lineHeight: 18, marginBottom: Spacing.md },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { ...Typography.body, flex: 1 },
});
