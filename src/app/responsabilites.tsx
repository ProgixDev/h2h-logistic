import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Section {
  iconName: IconName;
  title: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    iconName: 'battery',
    title: 'Batterie téléphone',
    body: [
      "Votre téléphone est votre outil principal : scan QR, chat, navigation, code de remise. Sans batterie, la livraison est bloquée.",
      "Nous vous conseillons d'arriver au hub avec au moins 50% de batterie. Une batterie externe est un bon compagnon sur les longs trajets.",
    ],
  },
  {
    iconName: 'time',
    title: 'Horaires & tolérance',
    body: [
      "Chaque point de rendez-vous a une fenêtre de tolérance de -10 / +10 minutes autour de l'heure prévue.",
      "Arriver un peu en avance est apprécié ; arriver un peu en retard est humain. Prévenez simplement l'autre partie via le chat pour éviter l'attente.",
    ],
  },
  {
    iconName: 'traffic',
    title: 'Imprévus & embouteillages',
    body: [
      "La route est imprévisible. Si vous sentez que vous allez être en retard, ouvrez le chat et envoyez un message rapide — les utilisateurs apprécient la transparence.",
      "Le chronomètre passe en orange pour vous rappeler de prévenir. Aucun retard raisonnable n'est sanctionné.",
    ],
  },
  {
    iconName: 'package',
    title: 'Emballage du colis',
    body: [
      "L'emballage est la responsabilité du vendeur. Vous n'avez pas à refaire l'emballage.",
      "Vérifiez simplement que le colis est fermé et intact avant la prise en charge. En cas de doute (colis ouvert, abîmé), prenez une photo depuis l'écran de scan et discutez-en avec le vendeur avant de partir.",
    ],
  },
  {
    iconName: 'lock',
    title: 'Votre QR code est personnel',
    body: [
      "Votre QR code cotransporteur particulier vous identifie auprès du vendeur et de l'acheteur.",
      "Ne le partagez jamais avec un tiers, même dans l'entourage. En cas de soupçon, ouvrez les paramètres et régénérez-le.",
    ],
  },
];

export default function ResponsabilitesScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();

  return (
    <SafeAreaWrapper>
      <Header title="Vos responsabilités" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Quelques repères pour des livraisons sereines. Rien ici n'est une sanction — juste des
          habitudes qui rendent l'expérience meilleure pour tout le monde.
        </Text>
        {SECTIONS.map((section, idx) => (
          <Card key={idx} style={{ backgroundColor: colors.primary + '06' }}>
            <View style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
                <Icon name={section.iconName} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{section.title}</Text>
            </View>
            <View style={styles.body}>
              {section.body.map((p, i) => (
                <Text key={i} style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {p}
                </Text>
              ))}
            </View>
          </Card>
        ))}

        <Pressable
          onPress={() => router.push('/incidents-protocol' as any)}
          accessibilityRole="link"
          accessibilityLabel="Ouvrir le protocole incidents"
          style={({ pressed }) => [
            styles.protocolCta,
            {
              backgroundColor: colors.primary + '08',
              borderColor: colors.primary + '30',
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
            <Icon name="shield" size={18} color={colors.primary} />
          </View>
          <View style={styles.protocolCtaText}>
            <Text style={[styles.protocolCtaTitle, { color: colors.text }]}>
              Protocole incidents
            </Text>
            <Text style={[styles.protocolCtaHint, { color: colors.textSecondary }]}>
              Règles, délais et sanctions en cas d’échec de livraison ou de relais indisponible.
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.textSecondary} />
        </Pressable>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.section,
  },
  intro: {
    ...Typography.body,
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h3,
  },
  body: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  paragraph: {
    ...Typography.body,
    lineHeight: 22,
  },
  protocolCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  protocolCtaText: {
    flex: 1,
    gap: 2,
  },
  protocolCtaTitle: {
    ...Typography.bodyMedium,
  },
  protocolCtaHint: {
    ...Typography.caption,
    lineHeight: 18,
  },
});
