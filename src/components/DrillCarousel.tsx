import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import DrillCard from './DrillCard';
import DrillDetailModal from './DrillDetailModal';
import { DRILLS, getDrillForMechanic, getRandomDrillsExcluding } from '../data/drillsData';
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

// Map primary_mechanical_issue titles to drill mechanics
const ISSUE_TO_MECHANIC: Record<string, DrillMechanic> = {
  // Common issue patterns that might come from coaching output
  stance: 'stance',
  load: 'load',
  'power position': 'power_position',
  slot: 'slot',
  balance: 'balance_at_contact',
  'balance at contact': 'balance_at_contact',
  // Add more mappings as needed based on actual coaching output
};

function mapIssueToMechanic(issueTitle: string | undefined): DrillMechanic | null {
  if (!issueTitle) return null;

  const lowerTitle = issueTitle.toLowerCase();

  // Try exact matches first
  for (const [key, mechanic] of Object.entries(ISSUE_TO_MECHANIC)) {
    if (lowerTitle.includes(key)) {
      return mechanic;
    }
  }

  // Fallback to 'stance' if no match (most basic mechanic)
  return 'stance';
}

export default function DrillCarousel({ title = 'PRACTICE DRILLS' }: DrillCarouselProps) {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const [lastAnalysis, setLastAnalysis] = useState<SwingAnalysis | null>(null);
  const [selectedDrill, setSelectedDrill] = useState<DrillCardType | null>(null);

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
    const targetMechanic = mapIssueToMechanic(primaryIssue?.title);

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
    setSelectedDrill(drill);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

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

      <DrillDetailModal
        drill={selectedDrill}
        visible={selectedDrill !== null}
        onClose={() => setSelectedDrill(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  title: {
    fontFamily: typography.body,
    fontSize: fontSizes.label, // 10px
    fontWeight: fontWeights.medium,
    color: colors.text.muted,
    letterSpacing: letterSpacing.label, // 3px
    textTransform: 'uppercase',
    marginBottom: spacing.cardGap, // 12px
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingRight: 20, // Show ~20px of next card peeking
  },
});