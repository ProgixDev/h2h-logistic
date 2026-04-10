import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Header } from '@/components/layout/Header';
import { OTPInput, type OTPInputHandle } from '@/components/ui/OTPInput';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/stores/useAuthStore';

function maskPhone(phone: string): string {
  if (!phone) return '+33 6 •• •• •• ••';
  // Keep first 6 chars and last 2, mask the rest
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length < 8) return phone;
  return `${cleaned.slice(0, 6)} •• •• ${cleaned.slice(-2)}`;
}

export default function OTPScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { verifyOTP, sendOTP, isLoading, phoneNumber, isNewUser } = useAuthStore();

  const otpRef = useRef<OTPInputHandle>(null);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = useCallback(async () => {
    if (!canResend || !phoneNumber) return;
    setCanResend(false);
    setCountdown(60);
    setError(false);
    setErrorMessage('');
    await sendOTP(phoneNumber);
  }, [canResend, phoneNumber]);

  const handleComplete = useCallback(async (code: string) => {
    setError(false);
    setErrorMessage('');

    const success = await verifyOTP(code);

    if (!success) {
      setError(true);
      setErrorMessage('Code incorrect. Veuillez réessayer.');
      otpRef.current?.shake();
      // Reset after shake animation
      setTimeout(() => {
        otpRef.current?.reset();
        setError(false);
      }, 1200);
      return;
    }

    // Success — navigate based on user state
    const state = useAuthStore.getState();
    if (state.isNewUser) {
      router.replace('/(auth)/complete-profile');
    } else {
      router.replace('/(tabs)');
    }
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <Header title="" showBack />
        </View>
      </View>

      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Vérification</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Code envoyé au{' '}
            <Text style={{ color: colors.text, fontFamily: 'Poppins_500Medium' }}>
              {maskPhone(phoneNumber ?? '')}
            </Text>
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <OTPInput
            ref={otpRef}
            length={6}
            onComplete={handleComplete}
            error={error}
          />
        </Animated.View>

        {/* Error message */}
        {errorMessage ? (
          <Animated.View entering={FadeIn.duration(200)}>
            <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
          </Animated.View>
        ) : null}

        {/* Loading indicator */}
        {isLoading && (
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Vérification en cours...
          </Text>
        )}

        {/* Resend section */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.resendSection}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} hitSlop={16}>
              <Text style={[styles.resendActive, { color: colors.primary }]}>
                Renvoyer le code
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.resendTimer, { color: colors.textSecondary }]}>
              Renvoyer dans{' '}
              <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold' }}>
                {formatCountdown(countdown)}
              </Text>
            </Text>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxxl,
    gap: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.h1,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    ...Typography.captionMedium,
    textAlign: 'center',
  },
  loadingText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  resendSection: {
    alignItems: 'center',
  },
  resendActive: {
    ...Typography.bodyMedium,
    textDecorationLine: 'underline',
  },
  resendTimer: {
    ...Typography.body,
  },
});
