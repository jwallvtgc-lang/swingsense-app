import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import BackNav from '../components/BackNav';
import { DRILLS } from '../data/drillsData';
import { EXPERIENCE_LEVEL_LABELS } from '../constants/drillConstants';
import type { DrillCard, DrillMechanic } from '../types/drill';
import type { MainStackParamList } from '../navigation/types';
import {
  colors,
  displayTitleProps,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

type DrillLibraryNavigationProp = NativeStackNavigationProp<MainStackParamList>;

const MECHANIC_FILTERS: Array<{ key: string; label: string; value: DrillMechanic | 'all' }> = [
  { key: 'all', label: 'All', value: 'all' },
  { key: 'stance', label: 'Stance', value: 'stance' },
  { key: 'load', label: 'Load', value: 'load' },
  { key: 'power_position', label: 'Power Position', value: 'power_position' },
  { key: 'slot', label: 'Slot', value: 'slot' },
  { key: 'balance_at_contact', label: 'Balance at Contact', value: 'balance_at_contact' },
];

interface DrillGridCardProps {
  drill: DrillCard;
  onPress: () => void;
}

function DrillGridCard({ drill, onPress }: DrillGridCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.gridCard, pressed && styles.gridCardPressed]}
      onPress={onPress}
    >
      {/* Mechanic color bar at top */}
      <View style={[styles.gridCardColorBar, { backgroundColor: colors.mechanic[drill.mechanic] }]} />

      {/* Card content */}
      <View style={styles.gridCardContent}>
        {/* Title */}
        <Text style={styles.gridCardTitle} numberOfLines={2}>
          {drill.title}
        </Text>

        {/* Level badge */}
        <View style={styles.gridCardLevelBadge}>
          <Text style={styles.gridCardLevelText}>
            {EXPERIENCE_LEVEL_LABELS[drill.experience_level]}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function DrillLibraryScreen() {
  const navigation = useNavigation<DrillLibraryNavigationProp>();
  const [activeFilter, setActiveFilter] = useState<DrillMechanic | 'all'>('all');

  // Filter drills based on selected mechanic (memoized for performance)
  const filteredDrills = useMemo(() => {
    return activeFilter === 'all'
      ? DRILLS
      : DRILLS.filter(drill => drill.mechanic === activeFilter);
  }, [activeFilter]);

  const handleDrillPress = (drill: DrillCard) => {
    // Navigate to drill detail screen
    navigation.navigate('DrillDetail', { drillId: drill.id });
  };

  const renderDrill = ({ item }: { item: DrillCard }) => (
    <DrillGridCard drill={item} onPress={() => handleDrillPress(item)} />
  );

  const renderFilterTab = (filter: typeof MECHANIC_FILTERS[0]) => {
    const isActive = activeFilter === filter.value;
    return (
      <Pressable
        key={filter.key}
        style={[styles.filterTab, isActive && styles.filterTabActive]}
        onPress={() => setActiveFilter(filter.value)}
      >
        <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
          {filter.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackNav label="Back" onPress={() => navigation.goBack()} />

      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.header} {...displayTitleProps}>
          DRILL LIBRARY
        </Text>

        {/* Filter tabs */}
        <View style={styles.filterContainer}>
          {MECHANIC_FILTERS.map(renderFilterTab)}
        </View>

        {/* Drill grid */}
        <FlatList
          data={filteredDrills}
          renderItem={renderDrill}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyExtractor={item => item.id}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    flex: 1,
    padding: spacing.screen,
  },
  header: {
    fontFamily: typography.displayTitle,
    fontSize: fontSizes.screenTitle,
    color: colors.text.primary,
    marginBottom: spacing.sectionGap,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.iconGap,
    marginBottom: spacing.sectionGap,
  },
  filterTab: {
    paddingHorizontal: spacing.cardSm,
    paddingVertical: spacing.iconGap,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.subCard,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  filterTabActive: {
    backgroundColor: colors.bg.goldDim,
    borderColor: colors.text.gold,
  },
  filterTabText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
  },
  filterTabTextActive: {
    color: colors.text.gold,
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.cardGap,
  },
  gridCard: {
    width: '48%',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    minHeight: 120,
  },
  gridCardPressed: {
    opacity: 0.8,
  },
  gridCardColorBar: {
    height: 4,
    width: '100%',
  },
  gridCardContent: {
    padding: spacing.cardSm,
    flex: 1,
    justifyContent: 'space-between',
  },
  gridCardTitle: {
    fontFamily: typography.body,
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
    lineHeight: Math.round(fontSizes.sectionTitle * 1.2),
    marginBottom: spacing.iconGap,
  },
  gridCardLevelBadge: {
    backgroundColor: colors.bg.input,
    paddingHorizontal: spacing.pillGap,
    paddingVertical: spacing.pillGap * 0.5,
    borderRadius: radius.badge,
    alignSelf: 'flex-start',
  },
  gridCardLevelText: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
  },
});