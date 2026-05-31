import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, AccessibilityInfo, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Toast } from '@/components/ui/Toast';
import { generateAndSharePdf, plainTextSummary } from '@/services/bonEnvoi';
import type { Mission } from '@/types/mission';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface BonEnvoiRowProps {
  mission: Mission;
}

export function BonEnvoiRow({ mission }: BonEnvoiRowProps) {
  const { colors } = useColorScheme();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const handlePress = async () => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    AccessibilityInfo.announceForAccessibility('Génération en cours');
    setLoading(true);
    try {
      await generateAndSharePdf(mission);
      setToast({ msg: "Fiche colis générée", type: 'success' });
    } catch (err) {
      setToast({ msg: "Un souci ? Réessayez dans un instant.", type: 'error' });
      // Offline-safe fallback
      const summary = plainTextSummary(mission);
      Alert.alert(
        "Fiche colis — résumé",
        summary,
        [
          {
            text: 'Copier',
            onPress: async () => {
              await Clipboard.setStringAsync(summary);
              setToast({ msg: 'Copié dans le presse-papier', type: 'success' });
            },
          },
          { text: 'Fermer', style: 'cancel' },
        ],
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Pressable
        onPress={handlePress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Générer la fiche colis en PDF"
        accessibilityState={{ busy: loading, disabled: loading }}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
          <Icon name="document" size={20} color={colors.primary} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.text }]}>Fiche colis</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Voir / Télécharger le PDF avec le QR à coller sur le colis
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Icon name="chevron-right" size={18} color={colors.textSecondary} />
        )}
      </Pressable>

      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type === 'success' ? 'success' : 'error'}
          visible
          onHide={() => setToast(null)}
          duration={2500}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.bodyMedium,
  },
  sub: {
    ...Typography.caption,
    lineHeight: 18,
  },
});
