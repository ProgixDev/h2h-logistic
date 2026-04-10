import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface TabItem {
  key: string;
  label: string;
  icon: string;
}

interface BottomNavProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

export function BottomNav({ tabs, activeTab, onTabPress }: BottomNavProps) {
  const { colors } = useColorScheme();

  const handlePress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabPress(key);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => handlePress(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon, isActive && { opacity: 1 }]}>{tab.icon}</Text>
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.primary : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    paddingBottom: Platform.OS === 'ios' ? 20 : Spacing.sm,
    paddingTop: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  icon: {
    fontSize: 22,
    opacity: 0.6,
  },
  label: {
    ...Typography.tabLabel,
  },
});
