import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { Position, BattingSide, POSITION_LABELS, BATTING_SIDE_LABELS } from '../types';

const POSITIONS: Position[] = [
  'catcher', 'first_base', 'second_base', 'shortstop',
  'third_base', 'outfield', 'pitcher', 'dh_utility',
];

const BATTING_SIDES: BattingSide[] = ['left', 'right', 'switch'];

export default function OnboardingScreen() {
  const { createProfile, user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [battingSide, setBattingSide] = useState<BattingSide | null>(null);
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
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
    const { error } = await createProfile({
      first_name: firstName.trim(),
      age: Number(age),
      primary_position: position,
      batting_side: battingSide,
      height_feet: heightFeet ? Number(heightFeet) : null,
      height_inches: heightInches ? Number(heightInches) : null,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Set Up Your Profile</Text>
        <Text style={styles.subtitle}>
          This helps us personalize your coaching feedback
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Your first name"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={[styles.input, styles.shortInput]}
            value={age}
            onChangeText={setAge}
            placeholder="15"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Primary Position *</Text>
          <View style={styles.chipGrid}>
            {POSITIONS.map((pos) => (
              <TouchableOpacity
                key={pos}
                style={[styles.chip, position === pos && styles.chipSelected]}
                onPress={() => setPosition(pos)}
              >
                <Text
                  style={[
                    styles.chipText,
                    position === pos && styles.chipTextSelected,
                  ]}
                >
                  {POSITION_LABELS[pos]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Batting Side *</Text>
          <View style={styles.chipRow}>
            {BATTING_SIDES.map((side) => (
              <TouchableOpacity
                key={side}
                style={[
                  styles.chip,
                  styles.chipWide,
                  battingSide === side && styles.chipSelected,
                ]}
                onPress={() => setBattingSide(side)}
              >
                <Text
                  style={[
                    styles.chipText,
                    battingSide === side && styles.chipTextSelected,
                  ]}
                >
                  {BATTING_SIDE_LABELS[side]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Height (optional)</Text>
          <View style={styles.heightRow}>
            <TextInput
              style={[styles.input, styles.heightInput]}
              value={heightFeet}
              onChangeText={setHeightFeet}
              placeholder="ft"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={1}
            />
            <Text style={styles.heightSeparator}>ft</Text>
            <TextInput
              style={[styles.input, styles.heightInput]}
              value={heightInches}
              onChangeText={setHeightInches}
              placeholder="in"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.heightSeparator}>in</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Start Analyzing</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  shortInput: {
    width: 80,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  chipWide: {
    flex: 1,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  heightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heightInput: {
    width: 60,
    textAlign: 'center',
  },
  heightSeparator: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: SPACING.md + 2,
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.black,
  },
});
