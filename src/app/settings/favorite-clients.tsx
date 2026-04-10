import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTranslation } from '@/hooks/useTranslation';

export default function FavoriteClientsScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaWrapper>
      <Header title={t('profile.favoriteClients')} showBack />
      <EmptyState
        iconName="star-outline"
        title="Aucun client favori"
        description="Vos acheteurs et vendeurs favoris apparaîtront ici."
      />
    </SafeAreaWrapper>
  );
}
