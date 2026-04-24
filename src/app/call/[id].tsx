import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, AccessibilityInfo, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';

const BG = '#0B0B0F';
const TEXT_MUTED = 'rgba(255,255,255,0.7)';
const BTN_BG = 'rgba(255,255,255,0.15)';
const BTN_BG_ACTIVE = 'rgba(255,255,255,0.85)';

type CallState = 'requesting-permission' | 'permission-denied' | 'ringing' | 'connected';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, name, role, avatar } = useLocalSearchParams<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>();

  const [callState, setCallState] = useState<CallState>('requesting-permission');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const roleLabel = role === 'seller' ? 'Vendeur/Vendeuse' : role === 'buyer' ? 'Acheteur/Acheteuse' : '';

  // Mock mic permission
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Mock: always grant. Real implementation would call Audio.requestPermissionsAsync().
      await new Promise((r) => setTimeout(r, 250));
      if (cancelled) return;
      setCallState('ringing');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      AccessibilityInfo.announceForAccessibility(`Appel avec ${name ?? ''}, en cours`);

      setTimeout(() => {
        if (cancelled) return;
        setCallState('connected');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const start = Date.now();
        tickRef.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - start) / 1000));
        }, 1000);
      }, 2000);
    })();
    return () => {
      cancelled = true;
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Subtle pulse on avatar while ringing
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (callState === 'ringing') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [callState]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const endCall = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (tickRef.current) clearInterval(tickRef.current);
    const finalDuration = formatDuration(duration);
    // Pop the call screen and pass the duration back to chat for the system message
    router.replace({
      pathname: '/chat/[id]',
      params: {
        id: id ?? '',
        name: name ?? '',
        role: role ?? '',
        avatar: avatar ?? '',
        callDuration: finalDuration,
      },
    });
  };

  const retryPermission = () => {
    setCallState('requesting-permission');
    setTimeout(() => setCallState('ringing'), 250);
  };

  // Permission-denied screen (mock — never reached because we always grant)
  if (callState === 'permission-denied') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.deniedContent}>
          <Icon name="mic-off" size={56} color="#FFFFFF" />
          <Text style={styles.deniedTitle}>Micro indisponible</Text>
          <Text style={styles.deniedSub}>
            L'accès au micro est nécessaire pour les appels. Réessayer ?
          </Text>
          <Pressable onPress={retryPermission} style={styles.deniedBtn} accessibilityRole="button">
            <Text style={styles.deniedBtnText}>Réessayer</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.cancel}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusText =
    callState === 'requesting-permission'
      ? 'Préparation…'
      : callState === 'ringing'
        ? 'Appel en cours…'
        : `Connecté · ${formatDuration(duration)}`;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.screen, { paddingTop: insets.top + Spacing.section, paddingBottom: insets.bottom + Spacing.lg }]}
    >
      <StatusBar barStyle="light-content" />

      {/* Top: avatar + name + status */}
      <View style={styles.top}>
        <Animated.View style={pulseStyle}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{(name ?? 'U')[0]?.toUpperCase()}</Text>
            </View>
          )}
        </Animated.View>
        <Text style={styles.name} numberOfLines={1}>
          {name ?? 'Contact'}
        </Text>
        {!!roleLabel && <Text style={styles.role}>{roleLabel}</Text>}
        <Text style={styles.status}>{statusText}</Text>
      </View>

      {/* Bottom: action bar */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setMuted((m) => !m);
          }}
          style={[styles.actionBtn, muted && styles.actionBtnActive]}
          accessibilityRole="button"
          accessibilityLabel={muted ? 'Réactiver le micro' : 'Couper le micro'}
          accessibilityState={{ selected: muted }}
        >
          <Icon name={muted ? 'mic-off' : 'mic'} size={26} color={muted ? '#0B0B0F' : '#FFFFFF'} />
        </Pressable>

        <Pressable
          onPress={endCall}
          style={styles.endBtn}
          accessibilityRole="button"
          accessibilityLabel="Terminer l'appel"
        >
          <Icon name="phone-down" size={32} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setSpeakerOn((s) => !s);
          }}
          style={[styles.actionBtn, speakerOn && styles.actionBtnActive]}
          accessibilityRole="button"
          accessibilityLabel={speakerOn ? 'Désactiver le haut-parleur' : 'Activer le haut-parleur'}
          accessibilityState={{ selected: speakerOn }}
        >
          <Icon name={speakerOn ? 'speaker' : 'speaker-off'} size={26} color={speakerOn ? '#0B0B0F' : '#FFFFFF'} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const AVATAR_SIZE = 180;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  top: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 72,
    color: '#FFFFFF',
  },
  name: {
    ...Typography.h1,
    color: '#FFFFFF',
    marginTop: Spacing.xl,
    textAlign: 'center',
  },
  role: {
    ...Typography.caption,
    color: TEXT_MUTED,
  },
  status: {
    ...Typography.bodyMedium,
    color: TEXT_MUTED,
    fontVariant: ['tabular-nums'],
    marginTop: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xl,
    width: '100%',
    paddingHorizontal: Spacing.xl,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BTN_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnActive: {
    backgroundColor: BTN_BG_ACTIVE,
  },
  endBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },

  // Permission denied
  deniedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
  },
  deniedTitle: {
    ...Typography.h2,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  deniedSub: {
    ...Typography.body,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
  },
  deniedBtn: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
  },
  deniedBtnText: {
    ...Typography.bodyMedium,
    color: '#0B0B0F',
  },
  cancel: {
    ...Typography.bodyMedium,
    color: TEXT_MUTED,
    textDecorationLine: 'underline',
  },
});
