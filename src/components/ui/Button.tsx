import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

type ButtonVariant = 'primary' | 'gradient' | 'outline' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const { colors } = useColorScheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // JS-thread callbacks for use inside worklets via runOnJS
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const tapGesture = Gesture.Tap()
    .enabled(!disabled && !loading)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(handlePress)();
    });

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary };
      case 'danger':
        return { backgroundColor: colors.error };
      case 'gradient':
        return {};
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'outline':
        return colors.primary;
      default:
        return '#FFFFFF';
    }
  };

  const content = loading ? (
    <ActivityIndicator color={getTextColor()} size="small" />
  ) : (
    <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{title}</Text>
  );

  if (variant === 'gradient') {
    return (
      <GestureDetector gesture={tapGesture}>
        <Animated.View style={[fullWidth && styles.fullWidth, animStyle, style]} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }}>
          <LinearGradient
            colors={[colors.primary, colors.primaryGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.container, disabled && styles.disabled]}
          >
            {content}
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.container,
          getContainerStyle(),
          disabled && styles.disabled,
          fullWidth && styles.fullWidth,
          animStyle,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled }}
      >
        {content}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: {
    ...Typography.button,
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
});
