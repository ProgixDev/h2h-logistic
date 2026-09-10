// LA FICHE D'UN POINT DE RENDEZ-VOUS — le contrat d'affichage du protocole.
//
// 🔴 CE QUE LE PROTOCOLE DE NOMMAGE EXIGE (docs/hubs-protocole-nommage.md,
// « Affichage recommandé dans l'application ») :
//   • ligne principale : le NOM, tel quel — il porte déjà « Hub » et le type de
//     lieu, parce qu'il est CALCULÉ en base ;
//   • sous-texte : le DÉTAIL AFFICHÉ (« Parking ouvert, côté entrée
//     principale ») — « le nom du hub ne suffit pas » ;
//   • le point exact épinglé sur la carte.
//
// 🔴 CE QUE CETTE FICHE MONTRAIT À LA PLACE : le nom, une PUCE DE TYPE en
// concurrence visuelle avec lui, l'adresse postale, et les HORAIRES
// D'OUVERTURE — une notion d'entrepôt, sur un lieu qui n'en est pas un. Le
// détail affiché, lui, n'existait pas.
//
// ⚠️ LE TYPE DE LIEU PASSE EN ICÔNE, PAS EN TEXTE. Il est déjà DANS le nom :
// l'écrire à côté le répète et vole la place du détail, qui est la seule ligne
// disant où se présenter.
import React from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { Hub } from '@/types/hub';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { HubParticipantChip, type HubParticipantInfo } from '@/components/route/HubParticipantChip';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { iconeHub, libelleHub } from '@/constants/HubTypes';
import { villeSiAbsente } from '@/utils/detailHub';

interface HubCardProps {
  hub: Hub;
  selected?: boolean;
  onPress?: (hub: Hub) => void;
  onLongPress?: (hub: Hub) => void;
  distance?: string;
  participants?: HubParticipantInfo[];
  onPressParticipant?: (info: HubParticipantInfo) => void;
  /** Show the small "Signaler" button (mission/route detail contexts). */
  reportable?: boolean;
}

export function HubCard({
  hub,
  selected,
  onPress,
  onLongPress,
  distance,
  participants,
  onPressParticipant,
  reportable,
}: HubCardProps) {
  const { colors } = useColorScheme();
  const { t } = useTranslation();
  const router = useRouter();

  // ⚠️ Le libellé ne s'affiche plus : il sert à l'accessibilité, pour qu'un
  // lecteur d'écran annonce la nature du lieu que l'icône montre.
  const typeLabel = libelleHub(hub.placeType);
  const zoneChipLabel = t('zone.sizeChip').replace('{radius}', String(hub.zoneRadiusM));

  const openReport = () => {
    router.push({
      pathname: '/hub/report' as any,
      params: { hubId: hub.id, hubName: hub.name, hubAddress: hub.address ?? hub.city },
    });
  };

  return (
    <TouchableOpacity
      onPress={() => onPress?.(hub)}
      onLongPress={onLongPress ? () => onLongPress(hub) : undefined}
      activeOpacity={0.7}
    >
      <Card
        style={selected ? { borderColor: colors.primary, borderWidth: 2 } : undefined}
      >
        <View style={styles.header}>
          {/* Le type de lieu, en icône : il est déjà dans le nom.
              ⚠️ `Icon` ne prend pas d'étiquette d'accessibilité — la vue qui le
              porte l'annonce à sa place, sinon un lecteur d'écran ne dit rien de
              la nature du lieu. */}
          <View accessible accessibilityLabel={typeLabel}>
            <Icon name={iconeHub(hub.placeType)} size={16} color={colors.textSecondary} />
          </View>
          {/* 🔴 LE NOM, TEL QUEL. Aucun gabarit, aucun `replace(/^hub /)` : le
              premier mot est porteur, c'est tout le protocole. */}
          <Text style={[styles.name, { color: colors.text }]}>{hub.name}</Text>
          {participants && participants.length > 0 ? (
            <HubParticipantChip participants={participants} onPress={onPressParticipant} />
          ) : null}
        </View>
        {/* 🔴 LE DÉTAIL AFFICHÉ — la ligne qui dit OÙ SE PRÉSENTER. L'adresse ne
            le dit pas : un parking de gare a une adresse et quatre entrées. */}
        <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={3}>
          {hub.displayDetail}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.zoneChip, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <Icon name="location-filled" size={11} color={colors.primary} />
            <Text style={[styles.zoneChipText, { color: colors.primary }]}>{zoneChipLabel}</Text>
          </View>
        </View>
        <View style={styles.footer}>
          {/* ⚠️ LES HORAIRES ONT DISPARU, et ce n'est pas une perte : un point de
              rendez-vous n'ouvre ni ne ferme. Ce qui conditionne l'accès — « côté
              boutique », « portail principal » — se dit dans le détail affiché. */}
          {/* ⚠️ LA VILLE SEULEMENT SI LE DÉTAIL NE LA DIT PAS DÉJÀ — voir
              `villeSiAbsente`. « Marseille » s'affichait deux fois. */}
          <Text style={[styles.hours, { color: colors.textSecondary }]}>
            {villeSiAbsente(hub.displayDetail, hub.city)}
          </Text>
          <View style={styles.footerRight}>
            {distance && (
              <Text style={[styles.distance, { color: colors.primary }]}>{distance}</Text>
            )}
            {reportable && (
              <Pressable
                onPress={openReport}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Signaler ce hub"
                style={({ pressed }) => [styles.reportBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Icon name="flag" size={14} color={colors.textSecondary} />
                <Text style={[styles.reportText, { color: colors.textSecondary }]}>Signaler</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  name: {
    ...Typography.bodyMedium,
    flex: 1,
    marginRight: Spacing.sm,
  },
  address: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  zoneChipText: {
    ...Typography.caption,
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  hours: {
    ...Typography.caption,
  },
  distance: {
    ...Typography.captionMedium,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    minWidth: 36,
    paddingHorizontal: 4,
  },
  reportText: {
    ...Typography.caption,
    fontSize: 11,
  },
});
