import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import DrillCard from './DrillCard';
import { useDrills } from '../hooks/useDrills';
import { mapMechanicalIssueToMechanic } from '../constants/drillConstants';
import type { DrillCard as DrillCardType } from '../types/drill';
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
  const { drills: allDrills } = useDrills();

  useEffect(() => {
    if (!user?.id) return;

    async function fetchAnalysis() {
      const analysis = await getLastCompletedAnalysis(user!.id);
      setLastAnalysis(analysis);
    }

    fetchAnalysis();
  }, [user?.id]);

  const carouselDrills = useMemo(() => {
    if (allDrills.length === 0) return [];

    const primaryIssue = lastAnalysis?.coaching_output?.primary_mechanical_issue;
    const targetMechanic = primaryIssue?.title ? mapMechanicalIssueToMechanic(primaryIssue.title) : null;

    const drills: DrillCardType[] = [];

    if (targetMechanic) {
      const mechanicDrills = allDrills.filter(d => d.mechanic === targetMechanic);
      if (mechanicDrills.length > 0) {
        const userLevel = (user as any)?.experience_level || 'beginner';
        const recommended = mechanicDrills.find(d => d.experience_level === userLevel) || mechanicDrills[0];
        drills.push(recommended);
        const others = allDrills.filter(d => d.id !== recommended.id);
        const shuffled = [...others].sort(() => Math.random() - 0.5);
        drills.push(...shuffled.slice(0, 4));
      } else {
        const shuffled = [...allDrills].sort(() => Math.random() - 0.5);
        drills.push(...shuffled.slice(0, 5));
      }
    } else {
      const shuffled = [...allDrills].sort(() => Math.random() - 0.5);
      drills.push(...shuffled.slice(0, 5));
    }

    return drills;
  }, [lastAnalysis, user, allDrills]);

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
            isRecommended={index === 0}
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
