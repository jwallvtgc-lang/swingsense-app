import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import DrillCard from './DrillCard';
import { DRILLS, getDrillForMechanic, getRandomDrillsExcluding } from '../data/drillsData';
import { mapMechanicalIssueToMechanic } from '../constants/drillConstants';
import type { DrillCard as DrillCardType, DrillMechanic } from '../types/drill';
import { getLastCompletedAnalysis } from '../services/analysis';
import { useAuth } from '../contexts/AuthContext';
import type { SwingAnalysis } from '../types';
import type { MainStackParamList } from '../navigation/types';
import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  spacing,
  typography,
} from '../../design-system/tokens';

type Navigation = NativeStackNavigationProp<MainStackParamList>;

interface DrillCarouselProps {
  title?: string;
}


export default function DrillCarousel({ title = 'PRACTICE DRILLS' }: DrillCarouselProps) {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const [lastAnalysis, setLastAnalysis] = useState<SwingAnalysis | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    async function fetchAnalysis() {
      const analysis = await getLastCompletedAnalysis(user!.id);
      setLastAnalysis(analysis);
    }

    fetchAnalysis();
  }, [user?.id]);

  const carouselDrills = useMemo(() => {
    // Get the primary mechanical issue from last analysis
    const primaryIssue = lastAnalysis?.coaching_output?.primary_mechanical_issue;
    const targetMechanic = primaryIssue?.title ? mapMechanicalIssueToMechanic(primaryIssue.title) : null;

    const drills: DrillCardType[] = [];

    if (targetMechanic) {
      // Slot 1: Get recommended drill for the primary issue
      const recommendedDrill = getDrillForMechanic(
        targetMechanic,
        // Use user's experience level from profile, or default to beginner
        (user as any)?.experience_level || 'beginner'
      );
      drills.push(recommendedDrill);

      // Slots 2-5: Get random drills from other mechanics
      const otherDrills = getRandomDrillsExcluding(targetMechanic, 4);
      drills.push(...otherDrills);
    } else {
      // No analysis yet - show 5 random drills
      const shuffled = [...DRILLS].sort(() => Math.random() - 0.5);
      drills.push(...shuffled.slice(0, 5));
    }

    return drills;
  }, [lastAnalysis, user]);

  const handleDrillPress = useCallback((drill: DrillCardType) => {
    navigation.navigate('DrillDetail', { drillId: drill.id });
  }, [navigation]);

  const handleViewAllDrills = useCallback(() => {
    navigation.navigate('DrillLibrary');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={handleViewAllDrills}>
          <Text style={styles.viewAllText}>View all →</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={280} // Card width 260 + 20 gap
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {carouselDrills.map((drill, index) => (
          <DrillCard
            key={drill.id}
            drill={drill}
            isRecommended={index === 0} // First drill is recommended if from analysis
            onPress={() => handleDrillPress(drill)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.cardGap,
  },
  title: {
    fontFamily: typography.body,
    fontSize: fontSizes.label, // 10px
    fontWeight: fontWeights.medium,
    color: colors.text.muted,
    letterSpacing: letterSpacing.label, // 3px
    textTransform: 'uppercase',
  },
  viewAllText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.gold,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingRight: 20, // Show ~20px of next card peeking
  },
});