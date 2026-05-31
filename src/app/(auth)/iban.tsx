import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/stores/useAuthStore';

const formatIban = (raw: string) => {
  const clean = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join(' ') ?? clean;
};

export default function IbanScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveIban, isLoading } = useAuthStore();

  const [iban, setIban] = useState('');
  const clean = iban.replace(/\s/g, '');
  const valid = clean.length >= 14;

  const handleSubmit = useCallback(async () => {
    if (!valid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveIban(clean);
    router.replace('/(auth)/pending-validation' as never);
  }, [valid, clean, saveIban, router]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
        <Header title="Coordonnées bancaires" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[Typography.h1, { color: colors.text }]}>Votre IBAN</Text>
        <Text style={[Typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
          Il sert uniquement à vous verser vos participations aux frais. Vos
          coordonnées restent confidentielles.
        </Text>

        <View style={{ marginTop: Spacing.xl }}>
          <Input
            label="IBAN"
            placeholder="FR76 1234 5678 9012 3456 7890 123"
            value={iban}
            onChangeText={(v) => setIban(formatIban(v))}
            autoCapitalize="characters"
            maxLength={34}
          />
          <View style={styles.hintRow}>
            <Feather name="lock" size={13} color={colors.textSecondary} />
            <Text style={[Typography.caption, { color: colors.textSecondary, flex: 1 }]}>
              Chiffré et utilisé seulement pour vos versements. Vous pourrez le
              modifier plus tard depuis votre profil.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Button
          title="Continuer"
          onPress={handleSubmit}
          variant="gradient"
          disabled={!valid}
          loading={isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.section,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: Spacing.sm,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
