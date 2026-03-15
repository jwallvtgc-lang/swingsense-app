import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { getUserAnalyses, deleteAnalysis } from '../services/analysis';
import type { SwingAnalysis, CoachingOutput } from '../types';
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

function TrendIndicator({
  trend,
}: {
  trend: 'better' | 'same' | 'worse' | null;
}) {
  if (!trend) return null;
  const config = {
    better: { icon: 'trending-up' as const, label: 'Better', color: COLORS.success },
    same: { icon: 'remove' as const, label: 'Same', color: COLORS.textMuted },
    worse: { icon: 'trending-down' as const, label: 'Worse', color: COLORS.error },
  };
  const { icon, label, color } = config[trend];
  return (
    <View style={[trendStyles.badge, { backgroundColor: color + '25' }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[trendStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const trendStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
});

function getPreviewLine(analysis: SwingAnalysis): string {
  const coaching = analysis.coaching_output as CoachingOutput | null;
  if (coaching?.primary_mechanical_issue?.title) {
    return coaching.primary_mechanical_issue.title;
  }
  if (coaching?.drill) {
    return coaching.drill.length > 60 ? coaching.drill.slice(0, 57) + '...' : coaching.drill;
  }
  return '—';
}

function formatHistoryDate(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (itemDate.getTime() === today.getTime()) {
    return `Today, ${timeStr}`;
  }
  if (itemDate.getTime() === yesterday.getTime()) {
    return `Yesterday, ${timeStr}`;
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

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

  const goToAnalyze = () => {
    navigation.navigate('MainTabs', { screen: 'UploadTab' });
  };

  const handleDelete = useCallback(
    (item: SwingAnalysis) => {
      Alert.alert(
        'Delete analysis?',
        'This will permanently remove this swing from your history.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (!user) return;
              const { error } = await deleteAnalysis(user.id, item.id);
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                setAnalyses((prev) => prev.filter((a) => a.id !== item.id));
              }
            },
          },
        ]
      );
    },
    [user]
  );

  const renderItem = ({ item, index }: { item: SwingAnalysis; index: number }) => {
    const prevScore = index < analyses.length - 1 ? analyses[index + 1]?.similarity_score : null;
    const currScore = item.similarity_score;
    let trend: 'better' | 'same' | 'worse' | null = null;
    if (prevScore != null && currScore != null) {
      if (currScore > prevScore) trend = 'better';
      else if (currScore < prevScore) trend = 'worse';
      else trend = 'same';
    }
    const preview = getPreviewLine(item);

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Results', { analysisId: item.id })}
          activeOpacity={0.7}
        >
          <View style={styles.cardLeft}>
            {item.similarity_score != null ? (
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreCircleText}>{item.similarity_score}</Text>
              </View>
            ) : (
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreCircleText}>—</Text>
              </View>
            )}
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardDate}>{formatHistoryDate(item.created_at)}</Text>
              <View style={styles.cardTopRight}>
                <TrendIndicator trend={trend} />
                <StatusBadge status={item.status} />
              </View>
            </View>
            <Text style={styles.cardPreview} numberOfLines={1}>
              {preview}
            </Text>
            <View style={styles.cardStats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {item.bat_speed_mph != null ? Math.round(item.bat_speed_mph) : '—'}
                </Text>
                <Text style={styles.statLabel}>MPH</Text>
              </View>
            </View>
          </View>
          <View style={styles.cardRight}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

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
            Tap Analyze to record your first one
          </Text>
          <TouchableOpacity
            style={styles.emptyCtaButton}
            onPress={goToAnalyze}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={22} color={COLORS.black} />
            <Text style={styles.emptyCtaText}>Analyze Swing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={analyses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.recordButton}
              onPress={goToAnalyze}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={22} color={COLORS.black} />
              <Text style={styles.recordButtonText}>Record Swing</Text>
            </TouchableOpacity>
          }
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
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 14,
    marginBottom: SPACING.md,
  },
  recordButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.black,
  },
  cardWrapper: {
    marginBottom: SPACING.sm,
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
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardPreview: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    minHeight: 16,
  },
  cardLeft: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCircleText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    color: COLORS.accent,
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
    minHeight: 22,
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
  emptyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 14,
    marginTop: SPACING.lg,
  },
  emptyCtaText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.black,
  },
});
