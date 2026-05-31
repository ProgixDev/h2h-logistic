import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/stores/useAuthStore';

// No real backend: the platform "review" is simulated — after a short delay we
// approve the account and open the app.
const VALIDATION_DELAY_MS = 4000;

export default function PendingValidationScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { validateAccount } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      await validateAccount();
      if (!cancelled) router.replace('/(tabs)');
    }, VALIDATION_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
          <Feather name="clock" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Compte en cours de validation</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Nous vérifions votre convention et vos informations. Cela ne prend
          qu'un instant — vous pourrez ensuite recevoir des co-livraisons.
        </Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.h1, textAlign: 'center' },
  subtitle: { ...Typography.body, textAlign: 'center', lineHeight: 22 },
});
