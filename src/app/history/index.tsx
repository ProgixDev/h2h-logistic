import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEarningsStore } from '@/stores/useEarningsStore';
import { formatCurrency, formatDate } from '@/utils/formatting';
import type { Transaction, DeliveryStatus } from '@/types/earnings';

type FilterTab = 'all' | 'completed' | 'cancelled' | 'dispute';

export default function HistoryScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { transactions, stats, loadMockData, getTransactionsByStatus } = useEarningsStore();
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => { loadMockData(); }, []);

  const filtered = getTransactionsByStatus(filter);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'completed', label: 'Réussies' },
    { key: 'cancelled', label: 'Annulées' },
    { key: 'dispute', label: 'Litiges' },
  ];

  return (
    <View style={[s.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <Header title="Historique des livraisons" showBack />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListHeaderComponent={
          <View style={s.headerContent}>
            {/* Stats card */}
            <LinearGradient
              colors={[colors.primary, colors.primaryGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.statsCard}
            >
              <Text style={s.statsTitle}>Vos performances</Text>
              <View style={s.statsRow}>
                <StatMetric label="Total" value={`${stats.totalDeliveries}`} iconName="package" colors={colors} />
                <StatMetric label="Réussite" value={`${stats.successRate}%`} iconName="checkmark-circle" colors={colors} />
                <StatMetric label="Gains" value={formatCurrency(stats.totalEarnings)} iconName="cash" colors={colors} />
                <StatMetric label="Note" value={stats.averageRating.toFixed(1)} iconName="star" colors={colors} />
              </View>
            </LinearGradient>

            {/* Filter tabs */}
            <View style={[s.tabs, { backgroundColor: colors.border + '30' }]}>
              {tabs.map((t) => {
                const active = filter === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(t.key); }}
                    style={[s.tab, active && { backgroundColor: colors.surface }]}
                  >
                    <Text style={[s.tabText, { color: active ? colors.text : colors.textSecondary }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).duration(250)} style={{ paddingHorizontal: Spacing.lg }}>
            <DeliveryHistoryCard transaction={item} colors={colors} />
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: Spacing.lg }}>
            <EmptyState
              iconName="document"
              title="Aucune livraison pour le moment."
              description="Publiez un trajet et acceptez votre première livraison !"
              actionLabel="Publier un trajet"
              onAction={() => router.push('/publish/type')}
            />
          </View>
        }
      />
    </View>
  );
}

function StatMetric({ label, value, iconName, colors }: { label: string; value: string; iconName: IconName; colors: any }) {
  return (
    <View style={s.metric}>
      <Icon name={iconName} size={16} color="rgba(255,255,255,0.9)" />
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function DeliveryHistoryCard({ transaction: tx, colors }: { transaction: Transaction; colors: any }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig: Record<DeliveryStatus, { label: string; variant: 'success' | 'error' | 'warning'; iconName: IconName }> = {
    completed: { label: 'Réussie', variant: 'success', iconName: 'checkmark-circle' },
    cancelled: { label: 'Annulée', variant: 'error', iconName: 'close-circle' },
    dispute: { label: 'Litige', variant: 'warning', iconName: 'alert-circle' },
  };
  const status = statusConfig[tx.deliveryStatus];

  const ratingText = tx.rating
    ? `${tx.rating}/5`
    : 'Pas de note';

  return (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpanded(!expanded); }}
      activeOpacity={0.8}
    >
      <Card>
        {/* Date */}
        <Text style={[s.cardDate, { color: colors.textSecondary }]}>{formatDate(tx.date, 'DD MMMM YYYY')}</Text>

        {/* Route */}
        <Text style={[s.cardRoute, { color: colors.text }]}>{tx.route}</Text>

        {/* Hubs */}
        <Text style={[s.cardHubs, { color: colors.textSecondary }]} numberOfLines={1}>
          {tx.pickupHub} → {tx.deliveryHub}
        </Text>

        {/* Status + Earnings */}
        <View style={s.cardFooter}>
          <Badge label={status.label} variant={status.variant} />
          <Text style={[s.cardEarning, { color: tx.amount > 0 ? colors.success : colors.textSecondary }]}>
            {tx.amount > 0 ? `+${formatCurrency(tx.amount)}` : '0€'}
          </Text>
        </View>

        {/* Rating */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {tx.rating ? <Icon name="star" size={12} color={colors.warning} /> : null}
          <Text style={[s.cardRating, { color: colors.textSecondary }]}>{ratingText}</Text>
        </View>

        {/* Expanded details */}
        {expanded && (
          <View style={[s.details, { borderTopColor: colors.border }]}>
            <DetailRow label="Colis" value={`${tx.packageTitle} — ${tx.packageSize}, ${tx.packageWeight} kg`} colors={colors} />
            <DetailRow label="Vendeur" value={tx.sellerName} colors={colors} />
            <DetailRow label="Acheteur" value={tx.buyerName} colors={colors} />
            {tx.pickupTime && <DetailRow label="Collecte" value={tx.pickupTime} colors={colors} />}
            {tx.deliveryTime && <DetailRow label="Livraison" value={tx.deliveryTime} colors={colors} />}
            <DetailRow label="Référence" value={tx.reference} colors={colors} />
          </View>
        )}

        {/* Expand hint */}
        <Text style={[s.expandHint, { color: colors.textSecondary }]}>
          {expanded ? '▴ Moins de détails' : '▾ Plus de détails'}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={s.detailRow}>
      <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[s.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingBottom: Spacing.section },
  headerContent: { paddingHorizontal: Spacing.lg, gap: Spacing.lg, marginBottom: Spacing.lg },

  // Stats
  statsCard: { borderRadius: BorderRadius.lg, padding: Spacing.xl, gap: Spacing.lg },
  statsTitle: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center', gap: 2 },
  metricIcon: { fontSize: 16 },
  metricValue: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#FFFFFF' },
  metricLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.7)' },

  // Tabs
  tabs: { flexDirection: 'row', borderRadius: BorderRadius.sm, padding: 3 },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm - 2, alignItems: 'center' },
  tabText: { ...Typography.captionMedium },

  // Card
  cardDate: { ...Typography.captionMedium, marginBottom: Spacing.xs },
  cardRoute: { ...Typography.bodyMedium, marginBottom: 2 },
  cardHubs: { ...Typography.caption, marginBottom: Spacing.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  cardEarning: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  cardRating: { ...Typography.caption },
  expandHint: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.sm },

  // Details
  details: { borderTopWidth: 0.5, marginTop: Spacing.md, paddingTop: Spacing.md, gap: Spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { ...Typography.caption },
  detailValue: { ...Typography.captionMedium },
});
