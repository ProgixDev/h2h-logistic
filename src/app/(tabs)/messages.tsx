import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMissionStore } from '@/stores/useMissionStore';

interface Conversation {
  id: string;
  name: string;
  role: 'seller' | 'buyer';
  lastMessage: string;
  time: string;
  unread: number;
  missionRoute: string;
  avatar: string;
}

export default function MessagesScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getActiveMissions, loadMockData } = useMissionStore();

  useEffect(() => { loadMockData(); }, []);

  const activeMissions = getActiveMissions();

  // Build conversations from active missions
  const conversations: Conversation[] = activeMissions.flatMap((m) => [
    {
      id: `${m.id}-seller`,
      name: m.seller.name,
      role: 'seller' as const,
      lastMessage: 'Le colis est prêt au hub.',
      time: 'Il y a 5 min',
      unread: 1,
      missionRoute: `${m.pickupHub.city} → ${m.deliveryHub.city}`,
      avatar: m.seller.name[0],
    },
    {
      id: `${m.id}-buyer`,
      name: m.buyer.name,
      role: 'buyer' as const,
      lastMessage: 'Merci, j\'attends votre arrivée !',
      time: 'Il y a 12 min',
      unread: 0,
      missionRoute: `${m.pickupHub.city} → ${m.deliveryHub.city}`,
      avatar: m.buyer.name[0],
    },
  ]);

  return (
    <View style={[s.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 60).duration(250)}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/chat/[id]' as any, params: { id: item.id, name: item.name, role: item.role } })}
              style={[s.convRow, { borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              {/* Avatar */}
              <View style={[s.avatar, { backgroundColor: item.role === 'seller' ? colors.primary + '20' : colors.accent + '30' }]}>
                <Text style={[s.avatarText, { color: item.role === 'seller' ? colors.primary : colors.accent }]}>{item.avatar}</Text>
              </View>

              {/* Content */}
              <View style={s.convContent}>
                <View style={s.convTopRow}>
                  <Text style={[s.convName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[s.convTime, { color: colors.textSecondary }]}>{item.time}</Text>
                </View>
                <Text style={[s.convRoute, { color: colors.textSecondary }]}>{item.missionRoute}</Text>
                <Text style={[s.convMessage, { color: item.unread > 0 ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              </View>

              {/* Unread badge */}
              {item.unread > 0 && (
                <View style={[s.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={s.unreadText}>{item.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
        ListEmptyComponent={
          <EmptyState
            iconName="chat"
            title="Aucune conversation"
            description="Vos messages avec les vendeurs et acheteurs apparaîtront ici lors de vos missions."
          />
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { ...Typography.h1 },
  list: { paddingBottom: Spacing.section },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 0.5,
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  convContent: { flex: 1, gap: 2 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { ...Typography.bodyMedium, flex: 1, marginRight: Spacing.sm },
  convTime: { ...Typography.caption, fontSize: 11 },
  convRoute: { ...Typography.caption, fontSize: 11 },
  convMessage: { ...Typography.body, marginTop: 2 },
  unreadBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
