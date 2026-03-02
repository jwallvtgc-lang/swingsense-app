import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { getUserAnalyses } from '../services/analysis';
import type { SwingAnalysis } from '../types';
import type { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    completed: { color: COLORS.success, label: 'Complete' },
    processing: { color: COLORS.accent, label: 'Processing' },
    uploading: { color: COLORS.textMuted, label: 'Uploading' },
    failed: { color: COLORS.error, label: 'Failed' },
  };
  const { color, label } = config[status] ?? config.failed;

  return (
    <View style={[badgeStyles.badge, { backgroundColor: color + '25' }]}>
      <View style={[badgeStyles.dot, { backgroundColor: color }]} />
      <Text style={[badgeStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
});

export default function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<SwingAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalyses = useCallback(async () => {
    if (!user) return;
    const data = await getUserAnalyses(user.id);
    setAnalyses(data);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalyses();
  };

  const renderItem = ({ item }: { item: SwingAnalysis }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        if (item.status === 'completed') {
          navigation.navigate('Results', { analysisId: item.id });
        }
      }}
      disabled={item.status !== 'completed'}
    >
      <View style={styles.cardLeft}>
        <Ionicons
          name={item.status === 'completed' ? 'baseball' : 'hourglass'}
          size={28}
          color={item.status === 'completed' ? COLORS.accent : COLORS.textMuted}
        />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardDate}>
            {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
          <StatusBadge status={item.status} />
        </View>
        {item.status === 'completed' && (
          <View style={styles.cardStats}>
            {item.similarity_score != null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{item.similarity_score}</Text>
                <Text style={styles.statLabel}>Score</Text>
              </View>
            )}
            {item.bat_speed_mph != null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {Math.round(item.bat_speed_mph)}
                </Text>
                <Text style={styles.statLabel}>MPH</Text>
              </View>
            )}
          </View>
        )}
      </View>
      {item.status === 'completed' && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Swing History</Text>
        <Text style={styles.headerSub}>{analyses.length} analyses</Text>
      </View>

      {analyses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="baseball-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No swings yet</Text>
          <Text style={styles.emptyText}>
            Upload your first swing video to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={analyses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl + SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  list: {
    padding: SPACING.lg,
    paddingTop: 0,
    gap: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  cardLeft: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardStats: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.accent,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
