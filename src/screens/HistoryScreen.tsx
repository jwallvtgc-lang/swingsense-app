import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { getUserAnalyses, deleteAnalysis } from '../services/analysis';
import type { SwingAnalysis, CoachingOutput } from '../types';
import type { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

function TrendIndicator({
  trend,
}: {
  trend: 'better' | 'same' | 'worse' | null;
}) {
  if (!trend) return null;
  const config = {
    better: { icon: 'trending-up' as const, label: '↗ Better', color: COLORS.green },
    same: { icon: 'remove' as const, label: 'Same', color: COLORS.textMuted },
    worse: { icon: 'trending-down' as const, label: '↘ Worse', color: COLORS.red },
  };
  const { label, color } = config[trend];
  const isBetter = trend === 'better';
  const isWorse = trend === 'worse';
  return (
    <View
      style={[
        trendStyles.badge,
        isBetter && trendStyles.badgeBetter,
        isWorse && trendStyles.badgeWorse,
        trend === 'same' && trendStyles.badgeSame,
      ]}
    >
      <Text style={[trendStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const trendStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeBetter: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  badgeWorse: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  badgeSame: {
    backgroundColor: COLORS.surface,
  },
  label: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 0.3,
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
  const insets = useSafeAreaInsets();
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
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => navigation.navigate('Results', { analysisId: item.id })}
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
            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.textMuted} />
            </Pressable>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </View>
        </Pressable>
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
          <Pressable
            style={({ pressed }) => [styles.emptyCtaButton, pressed && styles.ctaPressed]}
            onPress={goToAnalyze}
          >
            <Ionicons name="add-circle" size={22} color={COLORS.black} />
            <Text style={styles.emptyCtaText}>Analyze Swing</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={analyses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <Pressable
              style={({ pressed }) => [styles.recordButton, pressed && styles.ctaPressed]}
              onPress={goToAnalyze}
            >
              <Text style={styles.recordButtonPlus}>+</Text>
              <Text style={styles.recordButtonText}>Record New Swing</Text>
            </Pressable>
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
    paddingHorizontal: 28,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 48,
    color: COLORS.text,
    letterSpacing: 1,
    lineHeight: 48,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  list: {
    paddingHorizontal: 28,
    paddingTop: 0,
    paddingBottom: 24,
    gap: 10,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  recordButtonPlus: {
    fontSize: 18,
    color: COLORS.black,
    fontFamily: FONTS.bodySemiBold,
  },
  recordButtonText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.black,
    letterSpacing: 0.3,
  },
  cardWrapper: {
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardPressed: {
    backgroundColor: COLORS.surfaceHover,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButton: {
    padding: 4,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardPreview: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    marginTop: 6,
    minHeight: 16,
  },
  cardLeft: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentGlow,
  },
  scoreCircleText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
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
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    minHeight: 22,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginTop: 24,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  emptyCtaText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.black,
  },
});
