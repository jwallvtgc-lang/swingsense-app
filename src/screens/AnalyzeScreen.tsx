import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { displayNameFromUser } from '../utils/displayName';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';

import ActionCard from '../components/ActionCard';
import BottomTabBar from '../components/BottomTabBar';
import SectionCard from '../components/SectionCard';
import TipRow from '../components/TipRow';
import TipsList from '../components/TipsList';
import { useVideoPicker } from '../hooks/useVideoPicker';
import type { MainStackParamList, TabParamList } from '../navigation/types';
import { useMainTabBarNav } from '../navigation/useMainTabBarNav';
import {
  actionCard,
  bottomTab,
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';
import {
  computeStreak,
  getAllCompletedAnalyses,
  getLastCompletedAnalysis,
} from '../services/analysis';
import type { SwingAnalysis } from '../types';

type AnalyzeNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'UploadTab'>,
  NativeStackNavigationProp<MainStackParamList>
>;

const TIP_LINES = [
  'Film from the side, 10-15 feet away — player should fill most of the frame height',
  'Record in regular video mode — not slow motion or cinematic mode',
  'Hold the camera still and keep the full body visible throughout',
  '5-30 seconds, one swing per clip, good natural lighting',
] as const;

export default function AnalyzeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AnalyzeNav>();
  const navigateMainTab = useMainTabBarNav();
  const { user, profile } = useAuth();
  const { pickFromLibrary, recordVideo } = useVideoPicker();
  const [lastAnalysis, setLastAnalysis] = useState<SwingAnalysis | null>(null);
  const [streak, setStreak] = useState(0);
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLastAnalysis(null);
      setStreak(0);
      setThumbUri(null);
      return;
    }
    (async () => {
      const analysis = await getLastCompletedAnalysis(user.id);
      setLastAnalysis(analysis ?? null);
      if (analysis) {
        const allAnalyses = await getAllCompletedAnalyses(user.id);
        const { currentStreak } = computeStreak(
          allAnalyses.map((a) => a.created_at)
        );
        setStreak(currentStreak);
        if (analysis?.video_url) {
          try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(analysis.video_url, {
              time: 500,
            });
            setThumbUri(uri);
          } catch {
            setThumbUri(null);
          }
        } else {
          setThumbUri(null);
        }
      } else {
        setStreak(0);
        setThumbUri(null);
      }
    })();
  }, [user?.id]);

  const greeting = useMemo(() => {
    const fromProfile = profile?.first_name?.trim();
    const name = fromProfile
      ? fromProfile
      : displayNameFromUser(undefined, user);
    return `Hey, ${name}`;
  }, [profile?.first_name, user]);

  const contentBottomPad = useMemo(
    () => spacing.sectionGap + bottomTab.height + insets.bottom,
    [insets.bottom]
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.screen,
            paddingBottom: contentBottomPad,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.headline}>
          ANALYZE YOUR{'\n'}
          <Text style={styles.headlineAccent}>SWING</Text>
        </Text>

        {streak > 0 ? (
          <View style={styles.streakPill}>
            <Text style={styles.streakText}>🔥 {streak} day streak</Text>
          </View>
        ) : null}

        {lastAnalysis ? (
          <Pressable
            style={styles.lastSwingCard}
            onPress={() =>
              navigation.navigate('Analysis', { analysisId: lastAnalysis.id })
            }
          >
            <View style={styles.thumbContainer}>
              {thumbUri ? (
                <Image
                  source={{ uri: thumbUri }}
                  style={styles.thumbVideo}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.thumbPlaceholder} />
              )}
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>
                  {Math.round(lastAnalysis.similarity_score ?? 0)}
                </Text>
              </View>
            </View>
            <View style={styles.swingInfo}>
              <Text style={styles.swingLabel}>
                Last swing ·{' '}
                {new Date(lastAnalysis.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={styles.swingIssue} numberOfLines={2}>
                {lastAnalysis.coaching_output?.primary_mechanical_issue?.title ??
                  'Tap to review'}
              </Text>
            </View>
            <Text style={styles.cardChevron}>›</Text>
          </Pressable>
        ) : (
          <Text style={styles.instruction}>
            Upload a side-angle video to get your first AI coaching report in under 60
            seconds.
          </Text>
        )}

        <View style={styles.actionStack}>
          <ActionCard
            icon={
              <Ionicons
                name="images-outline"
                size={actionCard.iconInner}
                color={colors.text.gold}
              />
            }
            iconBg={colors.bg.actionIconGold}
            title="Upload from Library"
            subtitle="Select a swing video from your camera roll"
            onPress={async () => {
              const uri = await pickFromLibrary();
              if (uri) navigation.navigate('Processing', { videoUri: uri });
            }}
          />
          <ActionCard
            icon={
              <Ionicons
                name="videocam-outline"
                size={actionCard.iconInner}
                color={colors.text.green}
              />
            }
            iconBg={colors.bg.actionIconGreen}
            title="Record Now"
            subtitle="Film your swing with front or back camera"
            onPress={async () => {
              const uri = await recordVideo();
              if (uri) navigation.navigate('Processing', { videoUri: uri });
            }}
          />
        </View>

        {lastAnalysis ? (
          <Pressable
            style={styles.tipsCollapsed}
            onPress={() => setTipsExpanded((v) => !v)}
          >
            <Text style={styles.tipsCollapsedLabel}>TIPS FOR BEST RESULTS</Text>
            <Text style={styles.tipsChevron}>{tipsExpanded ? '▲' : '▼'}</Text>
          </Pressable>
        ) : null}
        {!lastAnalysis || tipsExpanded ? (
          <View style={lastAnalysis ? styles.tipsExpandedCard : styles.afterActions}>
            <SectionCard>
              <TipsList label="TIPS FOR BEST RESULTS">
                {TIP_LINES.map((line) => (
                  <TipRow key={line} text={line} />
                ))}
              </TipsList>
            </SectionCard>
          </View>
        ) : null}
      </ScrollView>
      <BottomTabBar activeTab="analyze" onTabPress={navigateMainTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: spacing.screen,
  },
  greeting: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.muted,
    letterSpacing: letterSpacing.tight,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headline: {
    fontFamily: typography.display,
    fontSize: fontSizes.headline,
    color: colors.text.primary,
    lineHeight: Math.round(fontSizes.headline * 0.95),
    marginBottom: spacing.cardGap,
  },
  headlineAccent: {
    color: colors.text.gold,
  },
  streakPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.goldDim,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.card,
    paddingVertical: spacing.iconGap,
    marginBottom: spacing.cardGap,
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  streakText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.gold,
    fontWeight: fontWeights.medium,
  },
  lastSwingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    padding: spacing.card,
    marginBottom: spacing.sectionGap,
    gap: spacing.cardGap,
  },
  thumbContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.input,
    overflow: 'hidden',
    backgroundColor: colors.bg.base,
    position: 'relative',
    flexShrink: 0,
  },
  thumbVideo: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.bg.surface,
  },
  scoreBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: colors.bg.gold,
    borderRadius: radius.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  scoreBadgeText: {
    fontFamily: typography.display,
    fontSize: fontSizes.body,
    color: colors.text.onGold,
  },
  swingInfo: {
    flex: 1,
    minWidth: 0,
  },
  swingLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.tight,
    marginBottom: spacing.iconGap,
  },
  swingIssue: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.primary,
    fontWeight: fontWeights.medium,
  },
  cardChevron: {
    fontFamily: typography.body,
    fontSize: 18,
    color: colors.text.muted,
  },
  tipsCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.card,
    paddingVertical: spacing.tabInner,
    marginTop: spacing.cardGap,
  },
  tipsCollapsedLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    letterSpacing: letterSpacing.bottomTab,
  },
  tipsChevron: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
  },
  tipsExpandedCard: {
    marginTop: spacing.cardGap,
    alignSelf: 'stretch',
  },
  instruction: {
    marginTop: spacing.cardGap,
    marginBottom: spacing.sectionGap,
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.body * 1.4),
    alignSelf: 'stretch',
  },
  actionStack: {
    marginTop: 0,
    alignSelf: 'stretch',
    gap: spacing.cardGap,
  },
  afterActions: {
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
  },
});
