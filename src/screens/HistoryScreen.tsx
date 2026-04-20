import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomTabBar from '../components/BottomTabBar';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import { ProgressCoachCard } from '../components/ProgressCoachCard';
import ScreenHeader from '../components/ScreenHeader';
import StreakPill from '../components/StreakPill';
import SwingListItem from '../components/SwingListItem';
import { useAuth } from '../contexts/AuthContext';
import { useMainTabBarNav } from '../navigation/useMainTabBarNav';
import type { MainStackParamList, TabParamList } from '../navigation/types';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  computeStreak,
  deleteAnalysis,
  fetchProgressCoach,
  getUserAnalyses,
} from '../services/analysis';
import type { SimilarityBreakdown, SwingAnalysis } from '../types';
import {
  bottomTab,
  colors,
  fontSizes,
  spacing,
  typography,
} from '../../design-system/tokens';

function listScore(analysis: SwingAnalysis): number {
  return (
    analysis.coaching_output?.similarity_scores?.overall ??
    analysis.similarity_score ??
    0
  );
}

function swingInsight(analysis: SwingAnalysis): string {
  return (
    analysis.coaching_output?.primary_mechanical_issue?.title ??
    analysis.coaching_output?.overall_summary ??
    ''
  );
}

function trendFromVsLastSwing(vs: string | null | undefined): 'better' | 'same' | 'worse' {
  if (vs == null || typeof vs !== 'string') return 'same';
  const s = vs.toLowerCase();
  if (/\b(better|improved)\b/.test(s)) return 'better';
  if (/\b(worse|declined)\b/.test(s)) return 'worse';
  return 'same';
}

function topDeltaFromAnalysis(
  item: SwingAnalysis,
  previousItem: SwingAnalysis | null
): { label: string; direction: 'up' | 'down' | 'flat' } | null {
  if (!previousItem) return null;
  const keys: Array<{ key: keyof SimilarityBreakdown; label: string }> = [
    { key: 'hip_rotation', label: 'Hip rotation' },
    { key: 'weight_transfer', label: 'Weight transfer' },
    { key: 'bat_path', label: 'Bat path' },
    { key: 'contact_point', label: 'Contact' },
  ];
  const currBreakdown = item.similarity_breakdown;
  const prevBreakdown = previousItem.similarity_breakdown;
  if (!currBreakdown || !prevBreakdown) return null;
  let best: { label: string; direction: 'up' | 'down' | 'flat'; diff: number } | null = null;
  for (const { key, label } of keys) {
    const curr = currBreakdown[key];
    const prev = prevBreakdown[key];
    if (curr == null || prev == null) continue;
    const diff = Math.round(curr - prev);
    if (diff === 0) continue;
    if (!best || Math.abs(diff) > Math.abs(best.diff)) {
      best = { label, direction: diff > 0 ? 'up' : 'down', diff };
    }
  }
  return best ? { label: best.label, direction: best.direction } : null;
}

function formatSwingDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type HistoryNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'History'>,
  NativeStackNavigationProp<MainStackParamList>
>;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HistoryNav>();
  const navigateMainTab = useMainTabBarNav();
  const { user, profile } = useAuth();
  const [swings, setSwings] = useState<SwingAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<{
    summary: string;
    most_improved: string | null;
    focus_next: string;
    swings_analyzed: number;
    best_overall: number;
  } | null>(null);
  const [progressDismissed, setProgressDismissed] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const progressDismissedRef = useRef(false);
  progressDismissedRef.current = progressDismissed;
  const progressUserIdRef = useRef<string | undefined>(undefined);
  const progressFetchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const userId = user?.id;
      if (!userId) {
        if (!cancelled) {
          setSwings([]);
          setLoading(false);
          setProgressData(null);
          setProgressLoading(false);
          progressUserIdRef.current = undefined;
          progressFetchedRef.current = false;
        }
        return;
      }

      if (progressUserIdRef.current !== userId) {
        progressUserIdRef.current = userId;
        if (!cancelled) setProgressDismissed(false);
        progressFetchedRef.current = false;
      }

      if (!cancelled) setLoading(true);
      const list = await getUserAnalyses(userId);
      if (!cancelled) {
        setSwings(list);
        setLoading(false);

        if (
          list.length >= 3 &&
          !progressDismissedRef.current &&
          !progressFetchedRef.current
        ) {
          progressFetchedRef.current = true;
          if (!cancelled) setProgressLoading(true);
          const result = await fetchProgressCoach({
            userId,
            swings: list.slice(0, 5),
            playerProfile: {
              first_name: profile?.first_name,
              age: profile?.age,
              experience_level: profile?.experience_level,
            },
          });
          if (!cancelled && !progressDismissedRef.current) {
            setProgressData(result);
            setProgressLoading(false);
          } else if (!cancelled) {
            setProgressLoading(false);
          }
        } else {
          if (!cancelled) {
            if (list.length < 3) {
              setProgressData(null);
            }
            setProgressLoading(false);
          }
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.first_name, profile?.age, profile?.experience_level]);

  const listBottomPad = useMemo(
    () => bottomTab.height + insets.bottom + spacing.screen,
    [insets.bottom]
  );

  const { headerSubtitle, headerStreak, headerLongestStreak } = useMemo(() => {
    const { currentStreak, longestStreak } = computeStreak(
      swings
        .filter((s) => s.status === 'completed' && s.created_at)
        .map((s) => s.created_at)
    );
    const n = swings.length;
    return {
      headerSubtitle: `${n} ${n === 1 ? 'analysis' : 'analyses'}`,
      headerStreak: currentStreak,
      headerLongestStreak: longestStreak,
    };
  }, [swings]);

  const handleDelete = useCallback(
    async (analysisId: string) => {
      const userId = user?.id;
      if (!userId) return;
      const { error } = await deleteAnalysis(userId, analysisId);
      if (error) {
        console.warn('[HistoryScreen] deleteAnalysis:', error.message);
        return;
      }
      setSwings((prev) => prev.filter((s) => s.id !== analysisId));
    },
    [user?.id]
  );

  const renderItem: ListRenderItem<SwingAnalysis> = useCallback(
    ({ item, index }) => {
      const previousItem = swings[index + 1] ?? null;
      return (
        <SwingListItem
          score={listScore(item)}
          date={formatSwingDate(item.created_at)}
          trend={trendFromVsLastSwing(item.coaching_output?.vs_last_swing)}
          insight={swingInsight(item)}
          topDelta={topDeltaFromAnalysis(item, previousItem)}
          onPress={() => navigation.navigate('Analysis', { analysisId: item.id })}
          onDelete={() => void handleDelete(item.id)}
        />
      );
    },
    [navigation, handleDelete, swings]
  );

  const keyExtractor = useCallback((item: SwingAnalysis) => item.id, []);

  const listEmpty = !loading && swings.length === 0;

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.screen,
            paddingHorizontal: spacing.screen,
          },
        ]}
      >
        <View style={styles.headerSection}>
          <ScreenHeader title="SWING HISTORY" subtitle={headerSubtitle} />
          <View style={styles.streakRow}>
            {headerStreak > 0 ? <StreakPill streak={headerStreak} /> : null}
            {headerLongestStreak > 0 ? (
              <Text style={styles.longestStreak}>
                Best: {headerLongestStreak} day{headerLongestStreak === 1 ? '' : 's'}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.afterHeader}>
          <PrimaryButton
            label="Record New Swing"
            onPress={() => navigation.navigate('UploadTab')}
          />
        </View>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.text.gold} />
          </View>
        ) : listEmpty ? (
          <View style={[styles.emptyWrap, { paddingBottom: listBottomPad }]}>
            <EmptyState
              title="No Swings Yet"
              body="Record or upload your first swing to see your history."
              ctaLabel="Analyze a Swing"
              onCta={() => navigation.navigate('UploadTab')}
            />
          </View>
        ) : (
          <View style={styles.listColumn}>
            {progressLoading ? (
              <ActivityIndicator
                color={colors.text.gold}
                style={styles.progressSpinner}
              />
            ) : null}
            {progressData && !progressDismissed ? (
              <View style={styles.progressCardWrap}>
                <ProgressCoachCard
                  summary={progressData.summary}
                  mostImproved={progressData.most_improved}
                  focusNext={progressData.focus_next}
                  swingsAnalyzed={progressData.swings_analyzed}
                  bestOverall={progressData.best_overall}
                  onDismiss={() => setProgressDismissed(true)}
                />
              </View>
            ) : null}
            <FlatList
              data={swings}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPad }]}
              showsVerticalScrollIndicator={false}
              style={styles.flatList}
            />
          </View>
        )}
      </View>
      <BottomTabBar activeTab="history" onTabPress={navigateMainTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    flex: 1,
  },
  headerSection: {
    marginBottom: spacing.cardGap,
    gap: spacing.iconGap,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.cardGap,
  },
  longestStreak: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
  },
  afterHeader: {
    marginTop: spacing.cardGap,
    marginBottom: spacing.sectionGap,
    alignSelf: 'stretch',
  },
  listContent: {
    gap: spacing.cardGap,
    flexGrow: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120, // 120px loading min height — prevents layout jump while fetching
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  listColumn: {
    flex: 1,
    alignSelf: 'stretch',
  },
  progressSpinner: {
    marginVertical: spacing.cardGap,
  },
  progressCardWrap: {
    marginBottom: spacing.cardGap,
  },
  flatList: {
    flex: 1,
  },
});
