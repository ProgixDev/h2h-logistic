import React, { useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

export interface OTPInputHandle {
  reset: () => void;
  shake: () => void;
}

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  error?: boolean;
}

export const OTPInput = forwardRef<OTPInputHandle, OTPInputProps>(
  ({ length = 6, onComplete, error = false }, ref) => {
    const { colors } = useColorScheme();
    const [values, setValues] = useState<string[]>(Array(length).fill(''));
    const inputs = useRef<(TextInput | null)[]>([]);

    // Shake animation
    const shakeX = useSharedValue(0);

    const shakeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: shakeX.value }],
    }));

    const triggerShake = useCallback(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakeX.value = withSequence(
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }, []);

    const reset = useCallback(() => {
      setValues(Array(length).fill(''));
      setTimeout(() => inputs.current[0]?.focus(), 100);
    }, [length]);

    useImperativeHandle(ref, () => ({ reset, shake: triggerShake }));

    const handleChange = (text: string, index: number) => {
      // Handle paste of full code
      if (text.length > 1) {
        const digits = text.replace(/\D/g, '').slice(0, length);
        const newValues = Array(length).fill('');
        digits.split('').forEach((d, i) => {
          newValues[i] = d;
        });
        setValues(newValues);
        if (digits.length === length) {
          inputs.current[length - 1]?.blur();
          onComplete(digits);
        } else {
          inputs.current[Math.min(digits.length, length - 1)]?.focus();
        }
        return;
      }

      const newValues = [...values];
      newValues[index] = text;
      setValues(newValues);

      if (text && index < length - 1) {
        inputs.current[index + 1]?.focus();
      }

      // Auto-submit when all filled
      if (newValues.every((v) => v.length === 1)) {
        onComplete(newValues.join(''));
      }
    };

    const handleKeyPress = (key: string, index: number) => {
      if (key === 'Backspace' && !values[index] && index > 0) {
        const newValues = [...values];
        newValues[index - 1] = '';
        setValues(newValues);
        inputs.current[index - 1]?.focus();
      }
    };

    return (
      <Animated.View style={[styles.container, shakeStyle]}>
        {Array.from({ length }).map((_, index) => {
          const hasValue = values[index].length > 0;
          const borderColor = error
            ? colors.error
            : hasValue
              ? colors.primary
              : colors.border;

          return (
            <TextInput
              key={index}
              ref={(r) => {
                inputs.current[index] = r;
              }}
              style={[
                styles.cell,
                {
                  backgroundColor: colors.surface,
                  borderColor,
                  color: error ? colors.error : colors.text,
                },
              ]}
              value={values[index]}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          );
        })}
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  cell: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
  },
});
