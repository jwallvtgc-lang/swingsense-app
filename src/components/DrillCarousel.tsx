import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import DrillCard from './DrillCard';
import { drills, type Drill, type DrillMechanic } from '../data/drills';
import { getLastCompletedAnalysis } from '../services/analysis';
import { useAuth } from '../contexts/AuthContext';
import type { SwingAnalysis } from '../types';
import type { MainStackParamList } from '../navigation/types';
import {
  colors,
  fontSizes,
  fontWeights,
  spacing,
  typography,
} from '../../design-system/tokens';

type Navigation = NativeStackNavigationProp<MainStackParamList>;

interface DrillCarouselProps {
  title?: string;
}

// Map analysis score fields to drill mechanics
const SCORE_TO_MECHANIC: Record<string, DrillMechanic> = {
  stance_score: 'stance',
  load_score: 'load',
  power_position_score: 'power_position',
  slot_score: 'slot',
  balance_at_contact_score: 'balance_at_contact',
};

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

  const recommendedMechanics = useMemo(() => {
    if (!lastAnalysis) return [];

    const scores: Array<{ mechanic: DrillMechanic; score: number }> = [];

    // Check core 5 scores and identify weak areas (scores below 75)
    Object.entries(SCORE_TO_MECHANIC).forEach(([scoreField, mechanic]) => {
      const score = lastAnalysis[scoreField as keyof SwingAnalysis] as number | null;
      if (score !== null && score < 75) {
        scores.push({ mechanic, score });
      }
    });

    // Sort by lowest scores first (worst mechanics need most help)
    return scores
      .sort((a, b) => a.score - b.score)
      .map(item => item.mechanic)
      .slice(0, 3); // Top 3 weakest mechanics
  }, [lastAnalysis]);

  const organizedDrills = useMemo(() => {
    const recommended: Drill[] = [];
    const other: Drill[] = [];

    drills.forEach(drill => {
      if (recommendedMechanics.includes(drill.mechanic)) {
        recommended.push(drill);
      } else {
        other.push(drill);
      }
    });

    // Put recommended drills first, then others
    return [...recommended, ...other];
  }, [recommendedMechanics]);

  const handleDrillPress = useCallback((drill: Drill) => {
    // TODO: Navigate to drill detail screen when implemented
    console.log('Drill pressed:', drill.name);
  }, []);

  if (organizedDrills.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.emptyText}>Loading drills...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={210} // 200px card + 10px gap
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {organizedDrills.map((drill) => (
          <DrillCard
            key={drill.id}
            drill={drill}
            isRecommended={recommendedMechanics.includes(drill.mechanic)}
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
    height: 230,
  },
  title: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.cardGap,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingLeft: spacing.screen,
    paddingRight: spacing.cardGap, // Extra padding at end
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.sectionGap,
  },
});