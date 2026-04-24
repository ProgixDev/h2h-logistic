import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Icon } from '@/components/ui/Icon';
import { Toast } from '@/components/ui/Toast';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

type MessageType = 'text' | 'call-summary';

interface Message {
  id: string;
  type: MessageType;
  text: string;
  fromMe: boolean;
  time: string;
  callDuration?: string; // for call-summary
}

const QUICK_REPLIES = [
  'Je suis en route',
  'Je suis au hub',
  'Combien de temps encore ?',
  'Merci !',
];

// Mock messages
const MOCK_MESSAGES: Message[] = [
  { id: '1', type: 'text', text: 'Bonjour ! Le colis est prêt au hub.', fromMe: false, time: '14:22' },
  { id: '2', type: 'text', text: 'Parfait, je suis en route.', fromMe: true, time: '14:23' },
  { id: '3', type: 'text', text: "D'accord, à tout de suite !", fromMe: false, time: '14:24' },
];

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
    callDuration?: string;
  }>();
  const { id, name, role, avatar } = params;
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [input, setInput] = useState('');
  const [showVideoTip, setShowVideoTip] = useState(false);

  // When returning from a call, append a call-summary message
  useEffect(() => {
    if (params.callDuration) {
      const summary: Message = {
        id: `call-${Date.now()}`,
        type: 'call-summary',
        text: 'Appel audio',
        fromMe: false,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        callDuration: params.callDuration,
      };
      setMessages((prev) => [...prev, summary]);
      // Clear the param so back-and-forth doesn't re-add
      router.setParams({ callDuration: undefined } as any);
    }
  }, [params.callDuration]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      type: 'text',
      text: text.trim(),
      fromMe: true,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');

    setTimeout(() => {
      const replies = [
        'Bien reçu, merci !',
        "D'accord, pas de souci.",
        'Je vous attends au hub.',
        'Parfait !',
      ];
      const reply: Message = {
        id: `msg-reply-${Date.now()}`,
        type: 'text',
        text: replies[Math.floor(Math.random() * replies.length)],
        fromMe: false,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, reply]);
    }, 2000);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const startAudioCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/call/[id]' as any,
      params: { id, name: name ?? '', role: role ?? '', avatar: avatar ?? '' },
    });
  };

  const roleLabel = role === 'seller' ? 'Vendeur' : 'Acheteur';

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.headerBar, { paddingTop: insets.top, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12} accessibilityLabel="Retour">
          <Icon name="back" size={24} color={colors.text} />
        </TouchableOpacity>
        {avatar ? (
          <Image source={{ uri: avatar }} style={s.headerAvatarImg} contentFit="cover" />
        ) : (
          <View style={[s.headerAvatar, { backgroundColor: role === 'seller' ? colors.primary + '20' : colors.accent + '30' }]}>
            <Text style={[s.headerAvatarText, { color: role === 'seller' ? colors.primary : colors.accent }]}>{(name ?? 'U')[0]}</Text>
          </View>
        )}
        <View style={s.headerInfo}>
          <Text style={[s.headerName, { color: colors.text }]} numberOfLines={1}>{name ?? 'Contact'}</Text>
          <Text style={[s.headerRole, { color: colors.textSecondary }]}>{roleLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={startAudioCall}
          style={s.headerAction}
          hitSlop={8}
          accessibilityLabel={`Appeler ${name ?? 'le contact'}`}
        >
          <Icon name="call" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowVideoTip(true)}
          style={s.headerAction}
          hitSlop={8}
          accessibilityLabel="Appel vidéo, bientôt disponible"
          accessibilityState={{ disabled: true }}
        >
          <Icon name="video" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => {
            if (item.type === 'call-summary') {
              return (
                <Animated.View entering={FadeIn.duration(250)} style={s.callSummary}>
                  <Icon name="call" size={14} color={colors.textSecondary} />
                  <Text style={[s.callSummaryText, { color: colors.textSecondary }]}>
                    Appel audio · {item.callDuration ?? '00:00'} · Terminé
                  </Text>
                </Animated.View>
              );
            }
            return (
              <Animated.View entering={FadeInDown.delay(index * 30).duration(200)}>
                <View style={[s.bubble, item.fromMe ? s.bubbleMe : s.bubbleThem, {
                  backgroundColor: item.fromMe ? colors.primary : colors.surface,
                  borderColor: item.fromMe ? colors.primary : colors.border,
                }]}>
                  <Text style={[s.bubbleText, { color: item.fromMe ? '#FFFFFF' : colors.text }]}>
                    {item.text}
                  </Text>
                  <Text style={[s.bubbleTime, { color: item.fromMe ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>
                    {item.time}
                  </Text>
                </View>
              </Animated.View>
            );
          }}
        />

        {/* Quick replies */}
        <View style={s.quickRow}>
          <FlatList
            data={QUICK_REPLIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={s.quickList}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => sendMessage(item)}
                style={[s.quickPill, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={[s.quickText, { color: colors.primary }]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Input bar */}
        <View style={[s.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + Spacing.sm }]}>
          <TextInput
            style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            value={input}
            onChangeText={setInput}
            placeholder="Écrire un message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={() => sendMessage(input)}
            style={[s.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.border }]}
            disabled={!input.trim()}
          >
            <Icon name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Toast
        message="Appel vidéo bientôt disponible"
        type="success"
        visible={showVideoTip}
        onHide={() => setShowVideoTip(false)}
        duration={1800}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    gap: Spacing.md,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  headerInfo: { flex: 1 },
  headerName: { ...Typography.bodyMedium },
  headerRole: { ...Typography.caption, fontSize: 11 },
  headerAction: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

  callSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    alignSelf: 'center',
  },
  callSummaryText: { ...Typography.caption },

  // Messages
  messageList: { padding: Spacing.lg, gap: Spacing.sm },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 4,
  },
  bubbleMe: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleThem: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { ...Typography.body, lineHeight: 20 },
  bubbleTime: { ...Typography.caption, fontSize: 10, alignSelf: 'flex-end' },

  // Quick replies
  quickRow: { paddingVertical: Spacing.sm },
  quickList: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  quickPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  quickText: { ...Typography.captionMedium },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
    ...Typography.body,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
