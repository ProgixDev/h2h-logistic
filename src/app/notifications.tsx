import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { mockNotifications } from '@/services/mock/notifications';
import { formatDateTime } from '@/utils/formatting';

export default function NotificationsScreen() {
  const { colors } = useColorScheme();
  const { t } = useTranslation();

  return (
    <SafeAreaWrapper>
      <Header title={t('profile.notifications')} showBack />
      <FlatList
        data={mockNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={!item.read ? { borderLeftWidth: 3, borderLeftColor: colors.primary } : undefined}>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {formatDateTime(item.createdAt)}
            </Text>
          </Card>
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListEmptyComponent={<EmptyState iconName="bell" title="Aucune notification" />}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: Spacing.section,
  },
  title: {
    ...Typography.bodyMedium,
    marginBottom: Spacing.xs,
  },
  body: {
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  time: {
    ...Typography.caption,
  },
});
