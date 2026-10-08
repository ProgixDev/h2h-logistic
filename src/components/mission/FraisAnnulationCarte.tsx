// LES FRAIS D'UNE CO-LIVRAISON ANNULÉE TARD, SUR SA MISSION (hand-to-hand 20261008006000, 20261008007000).
//
// Ce que le cotransporteur doit (2 €, retenus sur ses prochaines participations), et la voie pour les contester —
// vingt-quatre heures, une fois — ou l'état de sa contestation et la réponse de l'équipe. Rien si ce n'est pas lui
// qui a annulé tard.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatCurrency } from '@/utils/formatting';
import { lireFraisAnnulation, type FraisAnnulation } from '@/services/fraisAnnulation';

export function FraisAnnulationCarte({ missionId, orderId }: { missionId: string; orderId: string }) {
  const { colors } = useColorScheme();
  const router = useRouter();
  const [frais, setFrais] = useState<FraisAnnulation | null>(null);

  // ⚠️ RELU AU RETOUR SUR L'ÉCRAN : une contestation déposée doit s'y voir aussitôt.
  const lire = useCallback(() => {
    lireFraisAnnulation(orderId).then(setFrais).catch(() => setFrais(null));
  }, [orderId]);
  useEffect(() => {
    lire();
  }, [lire]);
  useFocusEffect(lire);

  if (!frais || frais.role !== 'cotransporteur' || frais.fraisCents <= 0) return null;

  const c = frais.contestation;
  const etat = !c
    ? null
    : c.statut === 'a_examiner'
      ? `Contestation ${c.reference} en examen : ces frais ne sont pas retenus pendant l’examen.`
      : c.statut === 'accepte'
        ? `Contestation ${c.reference} acceptée : les frais sont levés.`
        : `Contestation ${c.reference} non retenue : les frais sont maintenus.`;

  return (
    <Card>
      <Text style={[styles.titre, { color: colors.text }]}>
        Frais d’annulation tardive : {formatCurrency(frais.fraisCents / 100)}
      </Text>
      {etat ? (
        <>
          <Text style={[styles.texte, { color: colors.textSecondary }]}>{etat}</Text>
          {c?.reponse ? <Text style={[styles.reponse, { color: colors.textSecondary }]}>« {c.reponse} »</Text> : null}
        </>
      ) : frais.contestable ? (
        <View style={styles.bloc}>
          <Text style={[styles.texte, { color: colors.textSecondary }]}>
            Retenus sur vos prochaines participations. Une force majeure, une erreur du service ou un colis non conforme ?
            Vous pouvez les contester jusqu’au{' '}
            {frais.contestableJusquAu ? dayjs(frais.contestableJusquAu).format('DD/MM [à] HH:mm') : '—'}.
          </Text>
          <Button
            title="Contester les frais"
            variant="outline"
            // ⚠️ `as never` : la liste des routes typées (.expo/types, non versionnée) ne connaît l'écran qu'au prochain démarrage.
            onPress={() => router.push({ pathname: '/mission/contester-frais', params: { id: missionId } } as never)}
          />
        </View>
      ) : (
        <Text style={[styles.texte, { color: colors.textSecondary }]}>Retenus sur vos prochaines participations.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: Spacing.sm },
  titre: { ...Typography.bodyMedium, marginBottom: Spacing.xs },
  texte: { ...Typography.caption, lineHeight: 18 },
  reponse: { ...Typography.caption, fontStyle: 'italic', marginTop: Spacing.xs },
});
