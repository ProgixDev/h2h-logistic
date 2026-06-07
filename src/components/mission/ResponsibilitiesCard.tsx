import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Responsibility {
  lottie: any;
  title: string;
  helper: string;
}

const ITEMS: Responsibility[] = [
  {
    lottie: require('@/assets/lottie/battery.json'),
    title: 'Batterie téléphone',
    helper:
      "Assurez-vous que votre téléphone est suffisamment chargé avant la co-livraison. Une batterie faible peut empêcher les scans QR nécessaires à la prise en charge et à la remise du colis.",
  },
  {
    lottie: require('@/assets/lottie/clock.json'),
    title: 'Horaires & tolérance',
    helper:
      "Respectez la fenêtre horaire prévue autour du créneau indiqué. En cas de retard, prévenez immédiatement les personnes concernées via le chat.",
  },
  {
    lottie: require('@/assets/lottie/traffic.json'),
    title: 'Imprévus & embouteillages',
    helper:
      "En cas de trafic, retard ou imprévu, informez le vendeur ou l'acheteur dès que possible via le chat afin de conserver une trace dans l'application.",
  },
  {
    lottie: require('@/assets/lottie/delivery.json'),
    title: 'Emballage du colis',
    helper:
      "L'emballage relève de la responsabilité du vendeur. Avant la prise en charge, vérifiez visuellement que le colis est fermé et ne présente pas de dommage apparent. En cas de doute, signalez-le dans l'application et ajoutez une photo.",
  },
  {
    lottie: require('@/assets/lottie/padlock.json'),
    title: 'Votre QR code est personnel',
    helper:
      "Votre QR code cotransporteur est personnel. Ne le partagez pas avec un tiers. Il sert à vous identifier et à sécuriser les étapes de la co-livraison.",
  },
  {
    lottie: require('@/assets/lottie/shield.json'),
    title: "Ne remettez jamais le colis sans validation dans l'application",
    helper:
      "Le colis doit être remis uniquement après validation du protocole HandtoHand. Ne remettez pas le colis sans scan, code ou confirmation prévue par l'application.",
  },
];

export function ResponsibilitiesCard() {
  const { colors } = useColorScheme();
  const router = useRouter();

  return (
    <Card style={{ backgroundColor: colors.primary + '06' }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="clipboard" size={16} color={colors.text} />
          <Text style={[styles.title, { color: colors.text }]}>Bonnes pratiques de co-livraison</Text>
        </View>
      </View>

      {/* Body — always visible */}
      <View style={styles.body}>
        {ITEMS.map((item, idx) => (
          <View key={idx} style={styles.row}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
              <LottieView source={item.lottie} autoPlay loop resizeMode="contain" style={styles.lottie} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.rowHelper, { color: colors.textSecondary }]}>
                {item.helper}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.linkRow}>
          <Pressable
            onPress={() => router.push('/responsabilites' as any)}
            hitSlop={12}
            style={styles.linkWrap}
            accessibilityRole="link"
            accessibilityLabel="En savoir plus sur vos responsabilités"
          >
            <Text style={[styles.link, { color: colors.primary }]}>En savoir plus →</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/incidents-protocol' as any)}
            hitSlop={12}
            style={styles.linkWrap}
            accessibilityRole="link"
            accessibilityLabel="Ouvrir le protocole incidents"
          >
            <Text style={[styles.link, { color: colors.primary }]}>Protocole incidents →</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...Typography.bodyMedium,
  },
  body: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lottie: {
    width: 30,
    height: 30,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...Typography.bodyMedium,
  },
  rowHelper: {
    ...Typography.caption,
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  linkWrap: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  link: {
    ...Typography.captionMedium,
  },
});
