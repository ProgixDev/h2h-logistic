import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Responsibility {
  iconName: IconName;
  title: string;
  helper: string;
}

const ITEMS: Responsibility[] = [
  {
    iconName: 'battery',
    title: 'Batterie téléphone',
    helper:
      "Chargez votre téléphone avant la livraison (50% minimum recommandé). Une panne de batterie peut bloquer le scan à l'arrivée.",
  },
  {
    iconName: 'time',
    title: 'Horaires & tolérance',
    helper:
      "Respectez la fenêtre -10/+10 minutes autour de l'heure prévue. Un petit retard n'est pas grave, mais prévenez l'acheteur via le chat.",
  },
  {
    iconName: 'traffic',
    title: 'Imprévus & embouteillages',
    helper:
      "En cas de trafic ou d'imprévu, informez l'acheteur ou le vendeur dès que possible via le chat. Le chronomètre passe en orange pour vous rappeler.",
  },
  {
    iconName: 'package',
    title: 'Emballage du colis',
    helper:
      "L'emballage est la responsabilité du vendeur. Vérifiez visuellement que le colis est fermé et intact avant la prise en charge. En cas de doute, prenez une photo.",
  },
  {
    iconName: 'lock',
    title: 'Votre QR code est personnel',
    helper:
      "Ne partagez jamais votre QR code cotransporteur particulier avec un tiers. Il sert uniquement à vous identifier auprès du vendeur et de l'acheteur.",
  },
];

export function ResponsibilitiesCard() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    Haptics.selectionAsync();
    setExpanded((v) => !v);
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`Vos responsabilités, ${expanded ? 'développé' : 'réduit'}`}
    >
      <Card style={{ backgroundColor: colors.primary + '06' }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="clipboard" size={16} color={colors.text} />
            <Text style={[styles.title, { color: colors.text }]}>Vos responsabilités</Text>
          </View>
          <Icon
            name={expanded ? 'chevron-down' : 'chevron-right'}
            size={16}
            color={colors.textSecondary}
          />
        </View>

        {/* Expanded body */}
        {expanded && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.body}>
            {ITEMS.map((item, idx) => (
              <View key={idx} style={styles.row}>
                <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
                  <Icon name={item.iconName} size={18} color={colors.primary} />
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
                onPress={(e) => {
                  e.stopPropagation?.();
                  router.push('/responsabilites' as any);
                }}
                hitSlop={12}
                style={styles.linkWrap}
                accessibilityRole="link"
                accessibilityLabel="En savoir plus sur vos responsabilités"
              >
                <Text style={[styles.link, { color: colors.primary }]}>En savoir plus →</Text>
              </Pressable>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  router.push('/incidents-protocol' as any);
                }}
                hitSlop={12}
                style={styles.linkWrap}
                accessibilityRole="link"
                accessibilityLabel="Ouvrir le protocole incidents"
              >
                <Text style={[styles.link, { color: colors.primary }]}>Protocole incidents →</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </Card>
    </Pressable>
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
