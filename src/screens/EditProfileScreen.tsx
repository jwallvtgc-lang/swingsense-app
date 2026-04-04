import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import BackNav from '../components/BackNav';
import PrimaryButton from '../components/PrimaryButton';
import TextInput from '../components/TextInput';
import { useAuth } from '../contexts/AuthContext';
import { Position, BattingSide, POSITION_LABELS, BATTING_SIDE_LABELS } from '../types';
import { colors, fontSizes, radius, spacing } from '../../design-system/tokens';

const FONT_INTER = 'Inter_400Regular';

const POSITIONS: Position[] = [
  'catcher',
  'first_base',
  'second_base',
  'shortstop',
  'third_base',
  'outfield',
  'pitcher',
  'dh_utility',
];

const BATTING_SIDES: BattingSide[] = ['left', 'right', 'switch'];

const EXPERIENCE_LEVELS = [
  'Youth',
  'Recreational',
  'Travel Ball',
  'High School',
  'College',
  'Former College or Pro',
  'Coach',
] as const;

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { profile, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [battingSide, setBattingSide] = useState<BattingSide | null>(null);
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setAge(String(profile.age ?? ''));
      setPosition(profile.primary_position ?? null);
      setBattingSide(profile.batting_side ?? null);
      setHeightFeet(profile.height_feet ? String(profile.height_feet) : '');
      setHeightInches(profile.height_inches ? String(profile.height_inches) : '');
      setExperienceLevel(profile.experience_level ?? null);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Missing name', 'Please enter your first name.');
      return;
    }
    if (!age.trim() || isNaN(Number(age)) || Number(age) < 5 || Number(age) > 99) {
      Alert.alert('Invalid age', 'Please enter a valid age (5-99).');
      return;
    }
    if (!position) {
      Alert.alert('Missing position', 'Please select your primary position.');
      return;
    }
    if (!battingSide) {
      Alert.alert('Missing batting side', 'Please select your batting side.');
      return;
    }

    setLoading(true);
    const { error } = await updateProfile({
      first_name: firstName.trim(),
      age: Number(age),
      primary_position: position,
      batting_side: battingSide,
      height_feet: heightFeet ? Number(heightFeet) : null,
      height_inches: heightInches ? Number(heightInches) : null,
      experience_level: experienceLevel,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      navigation.goBack();
    }
  };

  if (!profile) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.top, { paddingTop: insets.top + spacing.pillGap }]}>
        <BackNav label="Back" onPress={() => navigation.goBack()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            placeholder="Your first name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Age *</Text>
          <TextInput
            placeholder="15"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={2}
            style={styles.inputShort}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Primary Position *</Text>
          <View style={styles.chipGrid}>
            {POSITIONS.map((pos) => {
              const selected = position === pos;
              return (
                <Pressable
                  key={pos}
                  onPress={() => setPosition(pos)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected ? styles.chipActive : styles.chipInactive,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text
                    style={[styles.chipLabel, selected ? styles.chipLabelActive : styles.chipLabelInactive]}
                  >
                    {POSITION_LABELS[pos]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Batting Side *</Text>
          <View style={styles.chipRow}>
            {BATTING_SIDES.map((side) => {
              const selected = battingSide === side;
              return (
                <Pressable
                  key={side}
                  onPress={() => setBattingSide(side)}
                  style={({ pressed }) => [
                    styles.chip,
                    styles.chipWide,
                    selected ? styles.chipActive : styles.chipInactive,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text
                    style={[styles.chipLabel, selected ? styles.chipLabelActive : styles.chipLabelInactive]}
                  >
                    {BATTING_SIDE_LABELS[side]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Experience Level</Text>
          <View style={styles.chipGrid}>
            {EXPERIENCE_LEVELS.map((level) => {
              const selected = experienceLevel === level;
              return (
                <Pressable
                  key={level}
                  onPress={() => setExperienceLevel(level)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected ? styles.chipActive : styles.chipInactive,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      selected ? styles.chipLabelActive : styles.chipLabelInactive,
                    ]}
                  >
                    {level}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Height (optional)</Text>
          <View style={styles.heightRow}>
            <TextInput
              placeholder="ft"
              value={heightFeet}
              onChangeText={setHeightFeet}
              keyboardType="number-pad"
              maxLength={1}
              style={styles.heightInput}
              textAlign="center"
            />
            <Text style={styles.heightUnit}>ft</Text>
            <TextInput
              placeholder="in"
              value={heightInches}
              onChangeText={setHeightInches}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.heightInput}
              textAlign="center"
            />
            <Text style={styles.heightUnit}>in</Text>
          </View>
        </View>

        <PrimaryButton label="Save Changes" onPress={handleSave} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  top: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.cardGap,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.cardGap,
    paddingBottom: spacing.sectionGap + 32,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: '400',
    color: colors.text.muted,
    marginBottom: spacing.inputGap,
  },
  inputShort: {
    alignSelf: 'flex-start',
    width: 88,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.pillGap,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.pillGap,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.card,
    paddingVertical: spacing.tabInner,
  },
  chipWide: {
    flex: 1,
    alignItems: 'center',
  },
  chipInactive: {
    backgroundColor: colors.bg.surface,
  },
  chipActive: {
    backgroundColor: colors.bg.gold,
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipLabel: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: '500',
    textAlign: 'center',
  },
  chipLabelInactive: {
    color: colors.text.muted,
  },
  chipLabelActive: {
    color: '#000000',
  },
  heightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.pillGap,
  },
  /** Width only; height matches shared TextInput via minHeight in TextInput.tsx */
  heightInput: {
    width: 72,
    alignSelf: 'center',
  },
  heightUnit: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    color: colors.text.muted,
  },
});
