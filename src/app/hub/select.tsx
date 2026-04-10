import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { HubCard } from '@/components/logistics/HubCard';
import { Spacing } from '@/constants/Spacing';
import { useTranslation } from '@/hooks/useTranslation';
import { mockHubs } from '@/services/mock/hubs';
import type { Hub } from '@/types/hub';

export default function HubSelectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = mockHubs.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.city.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (hub: Hub) => {
    router.back();
  };

  return (
    <SafeAreaWrapper>
      <Header title={t('hub.selectHub')} showBack />
      <Input
        placeholder={t('common.search')}
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HubCard hub={item} onPress={handleSelect} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.section,
  },
});
