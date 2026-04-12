import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  StyleSheet,
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
import { bottomTab, colors, spacing } from '../../design-system/tokens';

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

function swingBatSpeedMph(analysis: SwingAnalysis): number {
  return (
    analysis.coaching_output?.bat_speed_estimate?.mph ??
    analysis.bat_speed_mph ??
    0
  );
}

function trendFromVsLastSwing(vs: string | null | undefined): 'better' | 'same' | 'worse' {
  if (vs == null || typeof vs !== 'string') return 'same';
  const s = vs.toLowerCase();
  if (/\b(better|improved)\b/.test(s)) return 'better';
  if (/\b(worse|declined)\b/.test(s)) return 'worse';
  return 'same';
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

  const subtitle = useMemo(() => {
    const { currentStreak } = computeStreak(
      swings
        .filter((s) => s.status === 'completed' && s.created_at)
        .map((s) => s.created_at)
    );
    const n = swings.length;
    return `${n} ${n === 1 ? 'analysis' : 'analyses'}${
      currentStreak > 0 ? `  ·  🔥 ${currentStreak} day streak` : ''
    }`;
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
    ({ item }) => {
      return (
        <SwingListItem
          score={listScore(item)}
          date={formatSwingDate(item.created_at)}
          trend={trendFromVsLastSwing(item.coaching_output?.vs_last_swing)}
          insight={swingInsight(item)}
          batSpeed={swingBatSpeedMph(item)}
          onPress={() => navigation.navigate('Analysis', { analysisId: item.id })}
          onDelete={() => void handleDelete(item.id)}
        />
      );
    },
    [navigation, handleDelete]
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
        <ScreenHeader title="SWING HISTORY" subtitle={subtitle} />
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
