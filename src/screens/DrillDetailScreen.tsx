import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Video, ResizeMode } from 'expo-av';

import BackNav from '../components/BackNav';
import DrillVideoPlaceholder from '../components/DrillVideoPlaceholder';
import DrillStep from '../components/DrillStep';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../contexts/AuthContext';
import { getLastCompletedAnalysis } from '../services/analysis';
import { DRILLS } from '../data/drillsData';
import { EXPERIENCE_LEVEL_LABELS, MECHANIC_LABELS, mapMechanicalIssueToMechanic } from '../constants/drillConstants';
import type { DrillCard } from '../types/drill';
import type { SwingAnalysis } from '../types';
import {
  colors,
  displayTitleProps,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

type DrillDetailRouteParams = {
  DrillDetail: {
    drillId: string;
  };
};

type DrillDetailRouteProp = RouteProp<DrillDetailRouteParams, 'DrillDetail'>;

export default function DrillDetailScreen() {
  const route = useRoute<DrillDetailRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();
  const [drill, setDrill] = useState<DrillCard | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<SwingAnalysis | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showResetButton, setShowResetButton] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const foundDrill = DRILLS.find(d => d.id === route.params.drillId);
    setDrill(foundDrill || null);
  }, [route.params.drillId]);

  useEffect(() => {
    if (user) {
      getLastCompletedAnalysis(user.id)
        .then(analysis => setLastAnalysis(analysis))
        .catch(error => console.warn('[DrillDetailScreen] Failed to get last analysis:', error));
    }
  }, [user]);

  const handleComplete = useCallback(() => {
    setIsCompleted(true);
    setShowResetButton(true);

    // Auto-hide the reset button after 3 seconds
    timeoutRef.current = setTimeout(() => {
      setShowResetButton(false);
    }, 3000);
  }, []);

  const handleReset = useCallback(() => {
    setIsCompleted(false);
    setShowResetButton(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!drill) {
    return (
      <SafeAreaView style={styles.container}>
        <BackNav label="Back" onPress={() => navigation.goBack()} />
        <View style={styles.content}>
          <Text style={styles.errorText}>Drill not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Check if this drill matches the user's last primary mechanical issue
  const isPersonalized = lastAnalysis?.coaching_output?.primary_mechanical_issue &&
    mapMechanicalIssueToMechanic(lastAnalysis.coaching_output.primary_mechanical_issue.title) === drill.mechanic;

  const whyText = isPersonalized
    ? `Based on your last swing analysis, ${drill.whyItHelps.toLowerCase()}`
    : drill.whyItHelps;

  return (
    <SafeAreaView style={styles.container}>
      <BackNav label="Back" onPress={() => navigation.goBack()} />


      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Video section */}
          {drill.videoUrl ? (
            <Video
              source={{ uri: drill.videoUrl }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
            />
          ) : (
            <DrillVideoPlaceholder />
          )}

          {/* Title */}
          <Text style={styles.title} {...displayTitleProps}>
            {drill.title}
          </Text>

          {/* Badges row */}
          <View style={styles.badgesRow}>
            <Text style={styles.mechanicText}>{MECHANIC_LABELS[drill.mechanic]}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{EXPERIENCE_LEVEL_LABELS[drill.experience_level]}</Text>
            </View>
          </View>

          {/* WHY THIS DRILL section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>WHY THIS DRILL</Text>
            <Text style={styles.sectionText}>{whyText}</Text>
          </View>

          {/* WHAT YOU NEED section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>WHAT YOU NEED</Text>
            <Text style={styles.sectionText}>{drill.setup}</Text>
          </View>

          {/* HOW TO DO IT section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>HOW TO DO IT</Text>
            <View style={styles.stepsContainer}>
              {drill.steps.map((step, index) => (
                <DrillStep key={index} step={index + 1} text={step} />
              ))}
            </View>
          </View>

          {/* Reps */}
          <View style={styles.section}>
            <Text style={styles.repsText}>{drill.reps}</Text>
          </View>

          {/* Complete button */}
          {showResetButton ? (
            <View style={styles.completedContainer}>
              <Text style={styles.completedText}>✓ Good work. Consistency is what moves the needle.</Text>
              <PrimaryButton
                label="Reset"
                onPress={handleReset}
              />
            </View>
          ) : (
            <PrimaryButton
              label={isCompleted ? "✓ Completed" : "Mark as complete"}
              onPress={handleComplete}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screen,
    gap: spacing.sectionGap,
  },
  video: {
    width: '100%',
    height: 200,
  },
  title: {
    fontFamily: typography.display,
    fontSize: fontSizes.headline,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.iconGap,
  },
  mechanicText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption, // 11px
    fontWeight: fontWeights.medium,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  levelBadge: {
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.iconGap,
    paddingVertical: spacing.pillGap * 0.67, // ~4px
    borderRadius: radius.badge,
  },
  levelText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  section: {
    gap: spacing.iconGap,
  },
  sectionHeader: {
    fontFamily: typography.body,
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  sectionText: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.body * 1.4),
  },
  stepsContainer: {
    gap: spacing.drillGap,
  },
  repsText: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  completedContainer: {
    gap: spacing.iconGap,
    alignItems: 'center',
  },
  completedText: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.green,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.muted,
    textAlign: 'center',
  },
});