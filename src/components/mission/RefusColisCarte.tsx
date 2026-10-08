// LE COLIS REFUSÉ À LA COLLECTE, SUR LA MISSION (hand-to-hand 20261008009000).
//
// 🔴 DÈS LE REFUS, LE RENDEZ-VOUS N'A PLUS LIEU : la carte le dit, et l'écran de la mission retire ce qui menait à
// la collecte. La suite vient du serveur — le délai du vendeur (vingt-quatre heures), sa contestation, la décision de
// l'équipe, puis l'annulation et la compensation ou les frais.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatCurrency } from '@/utils/formatting';
import { lireRefusColis } from '@/services/refusColis';
import { phraseRefusColis, type RefusColis } from '@/utils/refusColis';

/**
 * Le refus de cette co-livraison, relu au retour sur l'écran ; `null` sans refus, ou si la lecture échoue — l'avis
 * reçu le dit aussi.
 */
export function useRefusColis(orderId: string | null | undefined): RefusColis | null {
  const [refus, setRefus] = useState<RefusColis | null>(null);
  const lire = useCallback(() => {
    if (!orderId) {
      setRefus(null);
      return;
    }
    lireRefusColis(orderId).then(setRefus).catch(() => setRefus(null));
  }, [orderId]);
  useEffect(() => {
    lire();
  }, [lire]);
  useFocusEffect(lire);
  return refus;
}

export function RefusColisCarte({ refus }: { refus: RefusColis }) {
  const { colors } = useColorScheme();
  const phrase = phraseRefusColis(
    refus,
    (cents) => formatCurrency(cents / 100),
    (iso) => dayjs(iso).format('DD/MM [à] HH:mm'),
  );
  return (
    <Card style={{ backgroundColor: colors.warning + '08', borderColor: colors.warning + '30' }}>
      <Text style={[styles.titre, { color: colors.text }]}>Colis refusé à la collecte</Text>
      <Text style={[styles.texte, { color: colors.textSecondary }]}>
        Refus déclaré le {dayjs(refus.declareLe).format('DD/MM [à] HH:mm')}
        {refus.motif ? ` — ${refus.motif}` : ''}.
      </Text>
      <Text style={[styles.texte, { color: colors.text }]}>{phrase}</Text>
      {refus.decision?.reponse ? (
        <Text style={[styles.reponse, { color: colors.textSecondary }]}>« {refus.decision.reponse} »</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  titre: { ...Typography.bodyMedium, marginBottom: Spacing.xs },
  texte: { ...Typography.caption, lineHeight: 18, marginTop: 2 },
  reponse: { ...Typography.caption, fontStyle: 'italic', marginTop: Spacing.xs },
});

/** Sur une mission annulée : l'issue du refus, s'il y en a eu un. */
export function RefusColisResume({ orderId }: { orderId: string }) {
  const refus = useRefusColis(orderId);
  return refus ? <RefusColisCarte refus={refus} /> : null;
}
