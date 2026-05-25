import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  SectionListData,
  SectionListRenderItem,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomTabBar from '../components/BottomTabBar';
import EmptyState from '../components/EmptyState';
import { ProgressCoachCard } from '../components/ProgressCoachCard';
import ScreenHeader from '../components/ScreenHeader';
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
import type { SwingAnalysis } from '../types';
import {
  bottomTab,
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

const LOADING_MIN_HEIGHT = 120; // Prevents layout jump while fetching

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

  const keys: Array<{ key: keyof SwingAnalysis; label: string }> = [
    { key: 'stance_score', label: 'Stance' },
    { key: 'load_score', label: 'Load' },
    { key: 'power_position_score', label: 'Power position' },
    { key: 'slot_score', label: 'Slot' },
    { key: 'balance_at_contact_score', label: 'Balance at contact' },
  ];

  let best: { label: string; direction: 'up' | 'down' | 'flat'; diff: number } | null = null;

  for (const { key, label } of keys) {
    const curr = item[key] as number | null | undefined;
    const prev = previousItem[key] as number | null | undefined;
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

function groupSwingsByDate(swings: SwingAnalysis[]): SectionListData<SwingAnalysis>[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isToday = (date: Date) =>
    date.toDateString() === today.toDateString();

  const isYesterday = (date: Date) =>
    date.toDateString() === yesterday.toDateString();

  const formatSectionTitle = (date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });
  };

  const groups = new Map<string, SwingAnalysis[]>();

  for (const swing of swings) {
    try {
      const swingDate = new Date(swing.created_at);
      const title = formatSectionTitle(swingDate);

      if (!groups.has(title)) {
        groups.set(title, []);
      }
      groups.get(title)!.push(swing);
    } catch {
      // If date parsing fails, group under "Unknown"
      if (!groups.has('Unknown')) {
        groups.set('Unknown', []);
      }
      groups.get('Unknown')!.push(swing);
    }
  }

  return Array.from(groups.entries()).map(([title, data]) => ({
    title,
    data,
  }));
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

  useFocusEffect(
    useCallback(() => {
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

      void load();
      return () => {
        cancelled = true;
      };
    }, [user?.id, profile?.first_name, profile?.age, profile?.experience_level])
  );

  const listBottomPad = useMemo(
    () => bottomTab.height + insets.bottom + spacing.screen,
    [insets.bottom]
  );

  const { analysesLabel, headerStreak, headerLongestStreak } = useMemo(() => {
    const { currentStreak, longestStreak } = computeStreak(
      swings
        .filter((s) => s.status === 'completed' && s.created_at)
        .map((s) => s.created_at)
    );
    const n = swings.length;
    return {
      analysesLabel: `${n} ${n === 1 ? 'analysis' : 'analyses'}`,
      headerStreak: currentStreak,
      headerLongestStreak: longestStreak,
    };
  }, [swings]);

  const swingSections = useMemo(() => groupSwingsByDate(swings), [swings]);

  // Create a lookup map for efficient global index calculation
  const swingIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    swings.forEach((swing, index) => {
      map.set(swing.id, index);
    });
    return map;
  }, [swings]);

  const personalBestId = useMemo(() => {
    if (swings.length === 0) return null;

    let bestSwing = swings[0];
    let bestScore = bestSwing.coaching_output?.similarity_scores?.overall ?? bestSwing.similarity_score ?? 0;

    for (const swing of swings) {
      const score = swing.coaching_output?.similarity_scores?.overall ?? swing.similarity_score ?? 0;
      if (score > bestScore) {
        bestScore = score;
        bestSwing = swing;
      }
    }

    return bestSwing.id;
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

  const renderItem: SectionListRenderItem<SwingAnalysis> = useCallback(
    ({ item }) => {
      const globalIndex = swingIndexMap.get(item.id) ?? 0;
      const previousItem = swings[globalIndex + 1] ?? null;

      return (
        <SwingListItem
          score={listScore(item)}
          date={formatSwingDate(item.created_at)}
          trend={trendFromVsLastSwing(item.coaching_output?.vs_last_swing)}
          insight={swingInsight(item)}
          topDelta={topDeltaFromAnalysis(item, previousItem)}
          isPersonalBest={item.id === personalBestId}
          onPress={() => navigation.navigate('Analysis', { analysisId: item.id })}
          onDelete={() => void handleDelete(item.id)}
        />
      );
    },
    [navigation, handleDelete, swings, swingIndexMap, personalBestId]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<SwingAnalysis> }) => (
      <Text style={styles.dateHeader}>{section.title}</Text>
    ),
    []
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
          <ScreenHeader title="SWING HISTORY" />
          <View style={styles.metadataRow}>
            <Text style={styles.compactMetadataLine}>
              <Text style={styles.metadataText}>{analysesLabel}</Text>
              {headerStreak > 0 && (
                <>
                  <Text style={styles.metadataDot}> • </Text>
                  <Text style={styles.metadataText}>🔥 {headerStreak} day streak</Text>
                </>
              )}
              {headerLongestStreak > 0 && (
                <>
                  <Text style={styles.metadataDot}> • </Text>
                  <Text style={styles.metadataText}>
                    Best: {headerLongestStreak} day{headerLongestStreak === 1 ? '' : 's'}
                  </Text>
                </>
              )}
            </Text>
            <Pressable
              style={styles.compactButton}
              onPress={() => navigation.navigate('UploadTab')}
            >
              <Text style={styles.compactButtonText}>+ Record Swing</Text>
            </Pressable>
          </View>
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
            <SectionList
              sections={swingSections}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPad }]}
              showsVerticalScrollIndicator={false}
              style={styles.sectionList}
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
    alignSelf: 'stretch',
    marginBottom: spacing.sectionGap,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.cardGap,
  },
  compactButton: {
    backgroundColor: colors.bg.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.cardSm,
    paddingVertical: spacing.pillGap,
    paddingRight: 16,
    marginRight: 16,
  },
  compactButtonText: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.onGold,
  },
  compactMetadataLine: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    lineHeight: Math.round(fontSizes.body * 1.35),
    marginRight: 8,
  },
  metadataText: {
    color: colors.text.muted,
  },
  metadataDot: {
    color: colors.text.muted,
  },
  listContent: {
    gap: spacing.cardGap,
    flexGrow: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: LOADING_MIN_HEIGHT,
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
  sectionList: {
    flex: 1,
  },
  dateHeader: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    paddingTop: spacing.sectionGap,
    paddingBottom: spacing.cardGap,
  },
});
