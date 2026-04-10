import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OTPInput, type OTPInputHandle } from '@/components/ui/OTPInput';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

const MAX_ATTEMPTS = 3;

interface OTPEntryProps {
  onSubmit: (code: string) => boolean; // returns true if valid
  onMaxAttempts?: () => void;
  buyerName?: string;
}

export function OTPEntry({ onSubmit, onMaxAttempts, buyerName }: OTPEntryProps) {
  const { colors } = useColorScheme();
  const otpRef = useRef<OTPInputHandle>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [locked, setLocked] = useState(false);

  const handleComplete = useCallback((code: string) => {
    if (locked) return;

    const isValid = onSubmit(code);

    if (isValid) {
      setError(false);
      setErrorMsg('');
      return;
    }

    // Invalid
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setError(true);

    // Shake animation
    otpRef.current?.shake();

    if (newAttempts >= MAX_ATTEMPTS) {
      setErrorMsg('Trop de tentatives. Contactez le support.');
      setLocked(true);
      onMaxAttempts?.();
    } else {
      setErrorMsg(`Code incorrect. Demandez à l'acheteur de vérifier son code. (${newAttempts}/${MAX_ATTEMPTS})`);
      // Reset after shake
      setTimeout(() => {
        otpRef.current?.reset();
        setError(false);
      }, 1200);
    }
  }, [attempts, locked, onSubmit, onMaxAttempts]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Code de l'acheteur</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {buyerName
          ? `Demandez le code à ${buyerName} et saisissez-le ci-dessous`
          : "Demandez le code à l'acheteur et saisissez-le ci-dessous"}
      </Text>

      <OTPInput
        ref={otpRef}
        length={6}
        onComplete={handleComplete}
        error={error}
      />

      {errorMsg ? (
        <Text style={[styles.errorText, { color: locked ? colors.error : colors.warning }]}>
          {errorMsg}
        </Text>
      ) : null}

      {!locked && attempts > 0 && !error && (
        <Text style={[styles.attemptsText, { color: colors.textSecondary }]}>
          Tentative {attempts}/{MAX_ATTEMPTS}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: Spacing.xxl,
    gap: Spacing.lg,
  },
  title: {
    ...Typography.h2,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    ...Typography.captionMedium,
    textAlign: 'center',
    lineHeight: 18,
  },
  attemptsText: {
    ...Typography.caption,
  },
});
