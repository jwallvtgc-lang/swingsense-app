import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { displayNameFromUser } from '../utils/displayName';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import ActionCard from '../components/ActionCard';
import BottomTabBar from '../components/BottomTabBar';
import HeroHeader from '../components/HeroHeader';
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
  spacing,
  typography,
} from '../../design-system/tokens';

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

  const greeting = useMemo(() => {
    const name = displayNameFromUser(profile?.first_name, user);
    return `Hey, ${name}`;
  }, [profile?.first_name, user]);

  const contentBottomPad = useMemo(
    () => spacing.sectionGap + bottomTab.height + insets.bottom,
    [insets.bottom]
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.ambient} pointerEvents="none" />
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
        <HeroHeader
          greeting={greeting}
          headline="ANALYZE YOUR SWING"
          accentWord="SWING"
        />

        <Text style={styles.instruction} maxFontSizeMultiplier={1.35}>
          Upload a side-angle video (5–30 sec, full body visible)
        </Text>

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

        <View style={styles.afterActions}>
          <SectionCard>
            <TipsList label="TIPS FOR BEST RESULTS">
              {TIP_LINES.map((line) => (
                <TipRow key={line} text={line} />
              ))}
            </TipsList>
          </SectionCard>
        </View>
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
  ambient: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.bg.ambientCircle,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: spacing.screen,
  },
  instruction: {
    marginTop: spacing.cardGap,
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.body * 1.4), // 1.4 line height — readability tuned for instruction text
    alignSelf: 'stretch',
  },
  actionStack: {
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
    gap: spacing.cardGap,
  },
  afterActions: {
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
  },
});
