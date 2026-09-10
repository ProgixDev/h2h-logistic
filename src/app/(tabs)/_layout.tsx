import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, AppState } from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Typography } from '@/constants/Typography';
import { Icon } from '@/components/ui/Icon';
import { useMissionStore, useProposals } from '@/stores/useMissionStore';

/**
 * 🔴 UNE PROPOSITION SE PERD EN QUINZE MINUTES — la relecture doit venir à elle.
 * Rien ne rechargeait les co-livraisons tant que l'application restait ouverte :
 * ni l'arrivée d'une proposition, ni le retour au premier plan. Trente secondes
 * laissent quatorze minutes et demie pour accepter ; c'est une requête légère
 * (les co-livraisons de CE cotransporteur), et elle s'arrête en arrière-plan.
 */
const RELECTURE_CO_LIVRAISONS_MS = 30_000;

export default function TabsLayout() {
  const { colors } = useColorScheme();
  // ⚠️ UN CROCHET, PAS `getProposals()` : voir `useMissionStore`.
  const proposalCount = useProposals().length;
  const charger = useMissionStore((s) => s.charger);

  useEffect(() => {
    let minuteur: ReturnType<typeof setInterval> | null = null;
    const demarrer = () => {
      if (!minuteur) minuteur = setInterval(() => { void charger(); }, RELECTURE_CO_LIVRAISONS_MS);
    };
    const arreter = () => {
      if (minuteur) clearInterval(minuteur);
      minuteur = null;
    };
    if (AppState.currentState === 'active') demarrer();
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') {
        // De retour au premier plan : relire tout de suite, sans attendre le tic.
        void charger();
        demarrer();
      } else {
        arreter();
      }
    });
    return () => {
      arreter();
      abonnement.remove();
    };
  }, [charger]);

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
          title: 'Co-livraisons',
          tabBarAccessibilityLabel: `Co-livraisons${proposalCount > 0 ? `, ${proposalCount} nouvelles propositions` : ''}`,
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
