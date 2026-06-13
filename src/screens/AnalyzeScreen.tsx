import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { displayNameFromUser } from '../utils/displayName';
import { greetingWithName } from '../utils/timeGreeting';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';

import ActionCard from '../components/ActionCard';
import AnalyzeHeader from '../components/AnalyzeHeader';
import BottomTabBar from '../components/BottomTabBar';
import DrillCarousel from '../components/DrillCarousel';
import { supabase } from '../config/supabase';
import { useVideoPicker } from '../hooks/useVideoPicker';
import type { MainStackParamList, TabParamList } from '../navigation/types';
import { useMainTabBarNav } from '../navigation/useMainTabBarNav';
import {
  bottomTab,
  colors,
  drillCardLink,
  fontSizes,
  fontWeights,
  letterSpacing,
  premiumActionCard,
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
import { incrementFilmingInstructionsCount } from '../utils/preferences';

type AnalyzeNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'UploadTab'>,
  NativeStackNavigationProp<MainStackParamList>
>;

export default function AnalyzeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AnalyzeNav>();
  const navigateMainTab = useMainTabBarNav();
  const { user, profile } = useAuth();
  const { pickFromLibrary } = useVideoPicker();
  const [lastAnalysis, setLastAnalysis] = useState<SwingAnalysis | null>(null);
  const [streak, setStreak] = useState(0);
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setLastAnalysis(null);
        setStreak(0);
        setThumbUri(null);
        return;
      }
      let cancelled = false;
      (async () => {
        const analysis = await getLastCompletedAnalysis(user.id);
        if (cancelled) return;
        setLastAnalysis(analysis ?? null);
        if (analysis) {
          const allAnalyses = await getAllCompletedAnalyses(user.id);
          if (cancelled) return;
          const { currentStreak } = computeStreak(
            allAnalyses.map((a) => a.created_at)
          );
          setStreak(currentStreak);
          if (analysis?.video_url) {
            try {
              let videoUrl = analysis.video_url;
              if (videoUrl.includes('supabase')) {
                const path =
                  videoUrl.split('/object/public/')[1] ??
                  videoUrl.split('/object/sign/')[1]?.split('?')[0] ??
                  videoUrl.split('/storage/v1/object/')[1];
                if (path) {
                  const { data } = await supabase.storage
                    .from(path.split('/')[0]!)
                    .createSignedUrl(path.split('/').slice(1).join('/'), 3600);
                  if (data?.signedUrl) videoUrl = data.signedUrl;
                }
              }
              const { uri } = await VideoThumbnails.getThumbnailAsync(videoUrl, {
                time: 500,
              });
              if (!cancelled) setThumbUri(uri);
            } catch {
              if (!cancelled) setThumbUri(null);
            }
          } else {
            setThumbUri(null);
          }
        } else {
          setStreak(0);
          setThumbUri(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.id])
  );

  const dynamicGreeting = useMemo(() => {
    const fullName = displayNameFromUser(profile?.first_name, user);
    const firstName = fullName.split(' ')[0] || fullName; // Get first name only
    return greetingWithName(firstName);
  }, [profile?.first_name, user]);

  const contentBottomPad = useMemo(
    () => spacing.sectionGap + bottomTab.height + insets.bottom,
    [insets.bottom]
  );

  const handleStartRecording = async () => {
    try {
      await incrementFilmingInstructionsCount();
      navigation.navigate('RecordingTips');
    } catch (error) {
      console.error('[AnalyzeScreen] Error incrementing instructions count:', error);
      navigation.navigate('RecordingTips');
    }
  };

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
        <AnalyzeHeader greeting={dynamicGreeting} streak={streak} />

        {/* Last swing card - full width */}
        {lastAnalysis ? (
          <Pressable
            style={({ pressed }) => [
              styles.lastSwingCard,
              pressed && styles.lastSwingCardPressed,
            ]}
            onPress={() =>
              navigation.navigate('Analysis', { analysisId: lastAnalysis.id })
            }
          >
            <View style={styles.lastSwingRow}>
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
                  <Text style={styles.scoreBadgeText} allowFontScaling={false}>
                    {Math.round(lastAnalysis.similarity_score ?? 0)}
                  </Text>
                </View>
              </View>
              <View style={styles.swingInfo}>
                <Text style={styles.swingLabel} allowFontScaling={false}>
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
                {lastAnalysis.coaching_output?.drill && (
                  <View style={styles.recommendationBlock}>
                    <Text style={styles.recommendationLabel} numberOfLines={1} allowFontScaling={false}>
                      Primary Recommendation
                    </Text>
                    <Text style={styles.recommendationDrill} numberOfLines={1}>
                      {lastAnalysis.coaching_output.drill.split('.')[0]}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.viewAnalysisLink} allowFontScaling={false}>View analysis →</Text>
          </Pressable>
        ) : (
          <Text style={styles.instruction}>
            Upload a side-angle video to get your first AI coaching report in under 60
            seconds.
          </Text>
        )}

        {/* Side by side action cards */}
        <View style={styles.actionRow}>
          <ActionCard
            variant="gold"
            icon={
              <Ionicons
                name="images-outline"
                size={22}
                color={colors.text.gold}
              />
            }
            title="Upload Swing"
            subtitle="Analyze from camera roll"
            style={styles.actionCard}
            onPress={async () => {
              const uri = await pickFromLibrary();
              if (uri) navigation.navigate('Processing', { videoUri: uri });
            }}
          />
          <ActionCard
            variant="emerald"
            icon={
              <Ionicons
                name="videocam-outline"
                size={22}
                color={colors.brand.emerald}
              />
            }
            title="Record Swing"
            subtitle="Record in real time"
            style={styles.actionCard}
            onPress={handleStartRecording}
          />
        </View>

        {/* Practice Drills section */}
        <DrillCarousel />
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
  lastSwingCard: {
    position: 'relative',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    padding: spacing.card,
    marginBottom: spacing.sectionGap,
    marginHorizontal: -spacing.cardGap, // Slightly wider
    minHeight: 100,
  },
  lastSwingCardPressed: {
    opacity: drillCardLink.pressOpacity,
  },
  lastSwingRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    bottom: spacing.pillGap / 2,
    right: spacing.pillGap / 2,
    backgroundColor: colors.bg.gold,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.deltaPillInnerGap,
    paddingVertical: spacing.deltaPillInnerGap / 4,
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
  recommendationBlock: {
    marginTop: spacing.iconGap,
    marginBottom: 24,
  },
  recommendationLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.label,
    color: colors.text.gold,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
    marginBottom: spacing.iconGap / 2,
  },
  recommendationDrill: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: fontWeights.bold,
  },
  viewAnalysisLink: {
    position: 'absolute',
    right: spacing.card,
    bottom: spacing.card,
    fontFamily: typography.body,
    fontSize: drillCardLink.fontSize,
    fontWeight: drillCardLink.fontWeight,
    color: drillCardLink.color,
  },
  instruction: {
    marginBottom: spacing.sectionGap,
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.body * 1.4),
    alignSelf: 'stretch',
  },
  actionRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'stretch',
    gap: spacing.cardGap,
    marginBottom: spacing.sectionGap,
    marginHorizontal: -spacing.cardGap, // Match last swing card width
  },
  actionCard: {
    flex: 1,
    height: premiumActionCard.minHeight,
  },
});
