// LA DÉCISION SUR UNE DEMANDE HORS HUB — le cotransporteur tranche.
//
// 🔴 CETTE FEUILLE FAISAIT L'INVERSE, ET MENTAIT. Elle proposait au
// cotransporteur d'ENVOYER une demande hors hub à un vendeur ou un acheteur ;
// son `onSend` n'envoyait rien, et l'écran appelant affichait, 3,5 secondes plus
// tard, « Proposition acceptée ! Nouveau point confirmé. » — une acceptation que
// personne n'avait donnée.
//
// 🔴 LE SENS VIENT DU GUIDE (docs/hubs-fonctionnement.md §5) : la possibilité
// dépend « de l'ACCEPTATION PRÉALABLE DU COTRANSPORTEUR », et une demande
// « n'est JAMAIS automatiquement imposée AU COTRANSPORTEUR ». C'est donc le
// vendeur (récupération) ou l'acheteur (remise) qui demande — c'est lui que le
// rendez-vous déplace — et le cotransporteur qui accepte ou refuse, parce que
// c'est son trajet qu'on modifie.
//
// ⚠️ « REFUSER » EST AUSSI VISIBLE QU'« ACCEPTER », ET IL EST NOMMÉ. Pas
// « Plus tard », pas une croix en coin : « Refuser et rester au {hub} ». Le
// repli du guide doit se lire comme un choix ordinaire, pas comme un abandon —
// et il doit dire OÙ l'on reste, sinon ce n'est pas une information.
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import type { DemandeHorsHub } from '@/services/horsHub';

interface OffHubDecisionSheetProps {
  visible: boolean;
  onClose: () => void;
  /** La demande à trancher. `null` = rien à décider. */
  demande: DemandeHorsHub | null;
  /** Le hub où le rendez-vous RESTE si l'on refuse. Nommé, jamais « le hub ». */
  hubDeRepli: string;
  onDecider: (accepter: boolean, motif?: string) => void;
  envoi?: boolean;
}

export function OffHubDecisionSheet({
  visible,
  onClose,
  demande,
  hubDeRepli,
  onDecider,
  envoi,
}: OffHubDecisionSheetProps) {
  const { colors } = useColorScheme();
  const { t } = useTranslation();
  const [motif, setMotif] = useState('');

  if (!demande) return null;

  const decider = (accepter: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDecider(accepter, motif.trim() || undefined);
    setMotif('');
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={s.content}>
        <Text style={[s.title, { color: colors.text }]}>{t('offHub.decisionTitle')}</Text>

        {/* ⚠️ L'ADRESSE PROPOSÉE EST LA DONNÉE CENTRALE : c'est sur elle qu'on se
            prononce, et c'est un DÉTOUR qu'on accepte ou non. */}
        <View style={[s.bloc, { backgroundColor: colors.border + '25' }]}>
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('offHub.proposedPoint')}</Text>
          <Text style={[s.adresse, { color: colors.text }]}>{demande.adresseProposee}</Text>
          {!!demande.motif && (
            <Text style={[s.motif, { color: colors.textSecondary }]}>{demande.motif}</Text>
          )}
        </View>

        {/* 🔴 LES FRAIS NE S'INVENTENT PAS. `null` veut dire « aucun frais
            proposé » — écrire « 0 € » se lirait comme une promesse de gratuité. */}
        <View style={s.ligne}>
          <Icon name="info" size={16} color={colors.textSecondary} />
          <Text style={[s.ligneTexte, { color: colors.textSecondary }]}>
            {demande.fraisCents == null
              ? t('offHub.noFee')
              : t('offHub.fee').replace('{amount}', (demande.fraisCents / 100).toFixed(2))}
          </Text>
        </View>

        <View style={s.ligne}>
          <Icon name="alert-circle" size={16} color={colors.warning} />
          <Text style={[s.ligneTexte, { color: colors.warning }]}>{t('zone.offHubNoGps')}</Text>
        </View>

        {/* 🔴 LA PHRASE DE REPLI, AVANT LES BOUTONS. Elle nomme le hub : sans lui,
            « rester au hub » ne dit pas où l'on sera. */}
        <View style={[s.repli, { backgroundColor: colors.primary + '10' }]}>
          <Text style={[s.repliTexte, { color: colors.text }]}>
            {t('offHub.fallback').replace('{hub}', hubDeRepli)}
          </Text>
        </View>

        <Text style={[s.label, { color: colors.text }]}>{t('offHub.reasonLabel')}</Text>
        <TextInput
          style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          value={motif}
          onChangeText={setMotif}
          placeholder={t('offHub.reasonPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
        />

        <Button
          title={t('offHub.accept')}
          onPress={() => decider(true)}
          variant="gradient"
          disabled={envoi}
        />
        {/* ⚠️ UN VRAI BOUTON, PAS UN LIEN DISCRET. */}
        <TouchableOpacity
          onPress={() => decider(false)}
          disabled={envoi}
          style={[s.refus, { borderColor: colors.border }]}
          accessibilityRole="button"
        >
          <Text style={[s.refusTexte, { color: colors.text }]}>
            {t('offHub.refuse').replace('{hub}', hubDeRepli)}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  content: { gap: Spacing.md },
  title: { ...Typography.h2, textAlign: 'center' },
  bloc: { padding: Spacing.md, borderRadius: BorderRadius.md, gap: 4 },
  label: { ...Typography.captionMedium },
  adresse: { ...Typography.bodyMedium },
  motif: { ...Typography.caption, fontStyle: 'italic' },
  ligne: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  ligneTexte: { ...Typography.caption, flex: 1 },
  repli: { padding: Spacing.md, borderRadius: BorderRadius.md },
  repliTexte: { ...Typography.captionMedium },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 64,
    textAlignVertical: 'top',
    ...Typography.body,
  },
  refus: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  refusTexte: { ...Typography.bodyMedium },
});
