import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Typography } from '@/constants/Typography';
import { Icon } from '@/components/ui/Icon';
import { useMissionStore } from '@/stores/useMissionStore';

export default function TabsLayout() {
  const { colors } = useColorScheme();
  const { getProposals } = useMissionStore();
  const proposalCount = getProposals().length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { ...Typography.tabLabel },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarAccessibilityLabel: 'Accueil — tableau de bord',
          tabBarIcon: ({ focused, color }) => (
            <Icon name={focused ? 'tab-home' : 'tab-home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: 'Trajets',
          tabBarAccessibilityLabel: 'Mes trajets publiés',
          tabBarIcon: ({ focused, color }) => (
            <Icon name={focused ? 'tab-routes' : 'tab-routes-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Livraisons',
          tabBarAccessibilityLabel: `Livraisons${proposalCount > 0 ? `, ${proposalCount} nouvelles propositions` : ''}`,
          tabBarIcon: ({ focused, color }) => (
            <View>
              <Icon name={focused ? 'tab-missions' : 'tab-missions-outline'} size={24} color={color} />
              {proposalCount > 0 && (
                <View style={s.badge} accessibilityElementsHidden>
                  <View style={s.badgeDot} />
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarAccessibilityLabel: 'Messages — conversations',
          tabBarIcon: ({ focused, color }) => (
            <Icon name={focused ? 'tab-messages' : 'tab-messages-outline'} size={24} color={color} />
          ),
        }}
      />
      {/* Profile is hidden from tab bar — accessed via header avatar */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
  },
  badgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
