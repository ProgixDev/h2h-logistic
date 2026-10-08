// CONTESTER SES FRAIS D'ANNULATION TARDIVE (hand-to-hand 20261008007000).
//
// 🔴 2 € IMPUTABLES PAR DÉFAUT (§ 5.6.2) ; une force majeure, une erreur du service ou un colis non conforme se font
// examiner. La base juge le droit — celui qui a annulé, dans les vingt-quatre heures, une fois, vingt caractères au
// moins, cinq pièces au plus, les siennes ; l'écran retient avant l'envoi pour éviter un refus, pas pour juger.
//
// ⚠️ ON NE PROMET RIEN : pendant l'examen, les frais ne sont pas retenus ; acceptée, la contestation les lève ;
// rejetée, ils se retiennent de nouveau. La réponse arrive sur la mission.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useMissionStore } from '@/stores/useMissionStore';
import { formatCurrency } from '@/utils/formatting';
import {
  deposerContestationFrais,
  lireFraisAnnulation,
  televerserPiecesContestation,
  type FraisAnnulation,
} from '@/services/fraisAnnulation';

const TEXTE_MIN = 20;
const TEXTE_MAX = 4000;
const PIECES_MAX = 5;

export default function ContesterFraisScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mission = useMissionStore((s) => s.missions.find((m) => m.id === (id ?? '')));
  const profilId = useAuthStore((s) => s.user?.id);

  const [frais, setFrais] = useState<FraisAnnulation | null>(null);
  const [lecture, setLecture] = useState<'chargement' | 'ok' | 'erreur'>('chargement');
  const [texte, setTexte] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const lire = useCallback(async () => {
    if (!mission?.orderId) {
      setLecture('erreur');
      return;
    }
    setLecture('chargement');
    try {
      setFrais(await lireFraisAnnulation(mission.orderId));
      setLecture('ok');
    } catch {
      setLecture('erreur');
    }
  }, [mission?.orderId]);
  useEffect(() => {
    void lire();
  }, [lire]);

  const ajouterPhoto = async () => {
    if (photos.length >= PIECES_MAX) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Accès aux photos', 'Autorisez l’accès aux photos pour joindre une pièce à la contestation.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    const uri = !r.canceled ? r.assets[0]?.uri : undefined;
    if (uri) setPhotos((p) => (p.includes(uri) || p.length >= PIECES_MAX ? p : [...p, uri]));
  };

  const longueur = texte.trim().length;
  const peutEnvoyer = !!frais?.contestable && !!mission?.orderId && longueur >= TEXTE_MIN && longueur <= TEXTE_MAX && !envoi;

  const envoyer = async () => {
    if (!peutEnvoyer || !mission?.orderId) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const pieces = await televerserPiecesContestation(profilId, photos);
      const { reference } = await deposerContestationFrais(mission.orderId, texte.trim(), pieces);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Contestation envoyée', `Votre contestation ${reference} est enregistrée. L’équipe vous répond sur la mission.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'La contestation n’a pas pu être envoyée. Réessayez dans un instant.');
      void lire();
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <Header title="Contester les frais" showBack />
      {lecture === 'chargement' ? (
        <View style={styles.centre}><ActivityIndicator color={colors.primary} /></View>
      ) : lecture === 'erreur' || !frais ? (
        <View style={styles.centre}>
          <Text style={[styles.texte, { color: colors.textSecondary, textAlign: 'center' }]}>
            Ces frais ne se lisent pas pour le moment. Réessayez dans un instant, ou écrivez au support.
          </Text>
        </View>
      ) : !frais.contestable ? (
        <View style={styles.centre}>
          <Text style={[styles.texte, { color: colors.textSecondary, textAlign: 'center' }]}>
            {frais.contestation
              ? `Votre contestation ${frais.contestation.reference} est déjà enregistrée.`
              : 'Le délai pour contester ces frais est passé : vingt-quatre heures après l’annulation.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={[styles.etiquette, { color: colors.textSecondary }]}>Frais d’annulation tardive</Text>
            <Text style={[styles.montant, { color: colors.text }]}>{formatCurrency(frais.fraisCents / 100)}</Text>
            <Text style={[styles.texte, { color: colors.textSecondary }]}>
              Imputables par défaut. Une force majeure, une erreur du service ou un colis non conforme font l’objet d’un
              examen. Contestation possible jusqu’au{' '}
              {frais.contestableJusquAu ? dayjs(frais.contestableJusquAu).format('DD/MM [à] HH:mm') : '—'}.
            </Text>
          </Card>

          <View style={styles.section}>
            <Text style={[styles.titre, { color: colors.text }]}>Ce qui s’est passé</Text>
            <TextInput
              value={texte}
              onChangeText={setTexte}
              placeholder="Expliquez pourquoi cette annulation ne vous est pas imputable…"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={TEXTE_MAX}
              style={[styles.zone, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            />
            <Text style={[styles.aide, { color: longueur < TEXTE_MIN ? colors.textSecondary : colors.success }]}>
              {TEXTE_MIN} caractères au moins · {texte.length}/{TEXTE_MAX}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.titre, { color: colors.text }]}>Pièces</Text>
            <Text style={[styles.aide, { color: colors.textSecondary }]}>
              Facture, photo du colis… jusqu’à {PIECES_MAX} photos.
            </Text>
            <View style={styles.photos}>
              {photos.map((uri) => (
                <View key={uri} style={styles.photo}>
                  <Image source={{ uri }} style={styles.vignette} contentFit="cover" />
                  <Pressable
                    onPress={() => setPhotos((p) => p.filter((x) => x !== uri))}
                    style={[styles.retirer, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    accessibilityLabel="Retirer la photo"
                  >
                    <Icon name="close" size={12} color={colors.text} />
                  </Pressable>
                </View>
              ))}
              {photos.length < PIECES_MAX && (
                <Pressable onPress={ajouterPhoto} style={[styles.ajouter, { borderColor: colors.border }]}
                           accessibilityLabel="Ajouter une photo">
                  <Icon name="camera" size={20} color={colors.primary} />
                </Pressable>
              )}
            </View>
          </View>

          <View style={[styles.effet, { backgroundColor: colors.primary + '0F', borderColor: colors.primary + '30' }]}>
            <Text style={[styles.aide, { color: colors.textSecondary }]}>
              Pendant l’examen, ces frais ne sont pas retenus sur vos participations. Acceptée, la contestation les lève :
              s’ils ont déjà été retenus, ils vous reviennent avec votre prochain virement. Une seule contestation est
              possible.
            </Text>
          </View>

          <Button title="Envoyer la contestation" onPress={envoyer} variant="gradient" loading={envoi} disabled={!peutEnvoyer} />
          {erreur ? <Text style={[styles.aide, { color: colors.error }]}>{erreur}</Text> : null}
        </ScrollView>
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.section },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  section: { gap: Spacing.sm },
  titre: { ...Typography.h3 },
  etiquette: { ...Typography.caption },
  montant: { ...Typography.h2 },
  texte: { ...Typography.body },
  aide: { ...Typography.caption, lineHeight: 18 },
  zone: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 140,
    textAlignVertical: 'top',
    ...Typography.body,
  },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photo: { width: 72, height: 72 },
  vignette: { width: 72, height: 72, borderRadius: BorderRadius.sm },
  retirer: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  ajouter: {
    width: 72, height: 72, borderRadius: BorderRadius.sm, borderWidth: 1, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  effet: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
});
