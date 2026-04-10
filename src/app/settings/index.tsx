import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { Header } from '@/components/layout/Header';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsScreen() {
  const { colors } = useColorScheme();
  const { t, lang, changeLanguage } = useTranslation();
  const router = useRouter();

  const items: { iconName: IconName; label: string; onPress: () => void }[] = [
    { iconName: 'globe', label: `${t('profile.language')}: ${lang.toUpperCase()}`, onPress: () => changeLanguage(lang === 'fr' ? 'en' : 'fr') },
    { iconName: 'star-outline', label: t('profile.favoriteClients'), onPress: () => router.push('/settings/favorite-clients') },
    { iconName: 'bell', label: t('profile.notifications'), onPress: () => router.push('/notifications') },
    { iconName: 'help', label: t('profile.help'), onPress: () => {} },
    { iconName: 'info', label: t('profile.about'), onPress: () => {} },
  ];

  return (
    <SafeAreaWrapper>
      <Header title={t('profile.settings')} showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={item.onPress}
          >
            <Icon name={item.iconName} size={20} color={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
            <Icon name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 0.5,
    gap: Spacing.md,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    ...Typography.body,
    flex: 1,
  },
  chevron: {
    fontSize: 20,
  },
});
