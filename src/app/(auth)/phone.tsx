import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/stores/useAuthStore';

function formatFrenchPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // Format as XX XX XX XX XX
  const parts: string[] = [];
  for (let i = 0; i < digits.length && i < 10; i += 2) {
    parts.push(digits.slice(i, i + 2));
  }
  return parts.join(' ');
}

function isValidFrenchPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 && (digits.startsWith('06') || digits.startsWith('07'));
}

export default function PhoneScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sendOTP, isLoading } = useAuthStore();

  const [rawPhone, setRawPhone] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const isValid = isValidFrenchPhone(rawPhone);

  const handleChangeText = (text: string) => {
    // Strip formatting, keep only digits, max 10
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setRawPhone(digits);
  };

  const handleContinue = useCallback(async () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const fullNumber = `+33 ${formatFrenchPhone(rawPhone)}`;
    await sendOTP(fullNumber);
    router.push('/(auth)/otp');
  }, [rawPhone, isValid]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <Header title="" showBack />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <View style={styles.inner}>
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            Votre numéro de téléphone
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Nous vous enverrons un code de vérification par SMS.
          </Text>

          {/* Phone input row */}
          <View style={styles.phoneRow}>
            {/* Country code pill */}
            <TouchableOpacity
              style={[
                styles.countryPill,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>🇫🇷</Text>
              <Text style={[styles.countryCode, { color: colors.text }]}>+33</Text>
              <Text style={[styles.chevron, { color: colors.textSecondary }]}>▾</Text>
            </TouchableOpacity>

            {/* Phone input */}
            <View
              style={[
                styles.phoneInputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: isFocused ? colors.primary : colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.phoneInput, { color: colors.text }]}
                value={formatFrenchPhone(rawPhone)}
                onChangeText={handleChangeText}
                placeholder="06 12 34 56 78"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                autoFocus
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                maxLength={14} // "XX XX XX XX XX"
              />
            </View>
          </View>

          {/* Validation hint */}
          {rawPhone.length > 0 && !isValid && rawPhone.length >= 4 && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Entrez un numéro mobile français (06 ou 07)
            </Text>
          )}
          {isValid && (
            <Text style={[styles.hint, { color: colors.success }]}>
              ✓ Numéro valide
            </Text>
          )}
        </View>

        {/* Continue button */}
        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Button
            title="Continuer"
            onPress={handleContinue}
            variant="gradient"
            disabled={!isValid}
            loading={isLoading}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxxl,
    gap: Spacing.lg,
  },
  title: {
    ...Typography.h1,
  },
  subtitle: {
    ...Typography.body,
    marginTop: -Spacing.sm,
    lineHeight: 22,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    gap: Spacing.xs,
  },
  flag: {
    fontSize: 20,
  },
  countryCode: {
    ...Typography.bodyMedium,
  },
  chevron: {
    fontSize: 10,
    marginLeft: 2,
  },
  phoneInputWrapper: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  phoneInput: {
    ...Typography.h3,
    letterSpacing: 1,
  },
  hint: {
    ...Typography.caption,
    marginTop: -Spacing.sm,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.xxl,
  },
});
