import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import BackNav from '../components/BackNav';
import PrimaryButton from '../components/PrimaryButton';
import TextInput from '../components/TextInput';
import { useAuth } from '../contexts/AuthContext';
import { BattingSide, Position, BATTING_SIDE_LABELS, POSITION_LABELS } from '../types';
import type { MainStackParamList } from '../navigation/types';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  tipRow,
} from '../../design-system/tokens';

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

type Nav = NativeStackNavigationProp<MainStackParamList, 'AddPlayer'>;

export default function AddPlayerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { createProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [battingSide, setBattingSide] = useState<BattingSide | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Phase A: consent gate visible; Phase B: gate confirmed, position fields revealed
  const [coppaConsentConfirmed, setCoppaConsentConfirmed] = useState(false);
  const [coppaConsented, setCoppaConsented] = useState(false);

  const parsedAge = Number(age);
  const isValidAge = age.trim() !== '' && !isNaN(parsedAge) && parsedAge >= 5 && parsedAge <= 99;
  const isUnder13 = isValidAge && parsedAge < 13;

  // Consent gate = phase A: under 13, not yet confirmed
  const showConsentGate = isUnder13 && !coppaConsentConfirmed;

  useEffect(() => {
    if (showConsentGate) Keyboard.dismiss();
  }, [showConsentGate]);

  const validate = useCallback((skipPosition = false) => {
    if (!firstName.trim()) {
      Alert.alert('Missing name', "Please enter the player's first name.");
      return false;
    }
    if (!isValidAge) {
      Alert.alert('Invalid age', 'Please enter a valid age (5-99).');
      return false;
    }
    if (!skipPosition && !position) {
      Alert.alert('Missing position', 'Please select a primary position.');
      return false;
    }
    if (!skipPosition && !battingSide) {
      Alert.alert('Missing batting side', 'Please select a batting side.');
      return false;
    }
    return true;
  }, [firstName, isValidAge, position, battingSide]);

  const handleSubmit = useCallback(async () => {
    // Phase A: validate name+age only, reveal consent checkbox + position fields
    if (isUnder13 && !coppaConsentConfirmed) {
      if (!validate(true)) return;
      setCoppaConsentConfirmed(true);
      return;
    }

    if (!validate()) return;

    setSaving(true);
    const consentPatch = (isUnder13 && coppaConsentConfirmed)
      ? { gave_coppa_consent: true as const, consent_given_at: new Date().toISOString() }
      : {};

    const { error } = await createProfile({
      first_name: firstName.trim(),
      age: parsedAge,
      primary_position: position!,
      batting_side: battingSide!,
      height_feet: null,
      height_inches: null,
      experience_level: experienceLevel,
      onboarding_completed: true,
      ...consentPatch,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    navigation.replace('ManagePlan');
  }, [
    isUnder13,
    coppaConsentConfirmed,
    validate,
    createProfile,
    firstName,
    parsedAge,
    position,
    battingSide,
    experienceLevel,
    navigation,
  ]);

  const buttonLabel = isUnder13 && !coppaConsentConfirmed ? 'Continue' : 'Add Player';
  // Disable Continue button while consent gate is active and checkbox not yet ticked
  const buttonDisabled = showConsentGate && !coppaConsented;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.top, { paddingTop: insets.top + spacing.pillGap }]}>
        <BackNav label="Back" onPress={() => navigation.goBack()} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Add Player</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Player First Name *</Text>
          <TextInput
            placeholder="First name"
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

        {/* COPPA consent gate — phase A: shows when under 13, not yet confirmed */}
        {showConsentGate ? (
          <View style={styles.consentSection}>
            <Text style={styles.consentHeading}>
              Before {firstName.trim() || 'your child'} continues
            </Text>
            <Text style={styles.consentBody}>
              {firstName.trim() || 'This player'} is under 13. Here's exactly what we'll collect and why:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bullet}>• Swing video & movement data, for coaching feedback</Text>
              <Text style={styles.bullet}>• Not shared with any coach or team unless separately enabled</Text>
              <Text style={styles.bullet}>• Not sold or shared for advertising</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('PrivacyPolicy')}
              style={({ pressed }) => pressed && styles.linkPressed}
            >
              <Text style={styles.policyLink}>Read our full Privacy Policy →</Text>
            </Pressable>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setCoppaConsented((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: coppaConsented }}
            >
              <View style={[styles.checkbox, coppaConsented && styles.checkboxChecked]}>
                {coppaConsented ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.checkboxLabel}>
                I am {firstName.trim() || 'this player'}'s parent or legal guardian, and I consent to this data collection.
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Position / batting / experience — visible for 13+ immediately, for under-13 after phase A */}
        {(!isUnder13 || coppaConsentConfirmed) ? (
          <>
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
                      <Text style={[styles.chipLabel, selected ? styles.chipLabelActive : styles.chipLabelInactive]}>
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
                      <Text style={[styles.chipLabel, selected ? styles.chipLabelActive : styles.chipLabelInactive]}>
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
                      <Text style={[styles.chipLabel, selected ? styles.chipLabelActive : styles.chipLabelInactive]}>
                        {level}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.screen }]}>
        <PrimaryButton
          label={buttonLabel}
          onPress={() => void handleSubmit()}
          loading={saving}
          disabled={buttonDisabled}
        />
      </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.cardGap,
    paddingBottom: spacing.sectionGap,
  },
  screenTitle: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sectionGap,
  },
  field: {
    marginBottom: spacing.sectionGap,
  },
  label: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
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
    fontWeight: fontWeights.medium,
    textAlign: 'center',
  },
  chipLabelInactive: {
    color: colors.text.muted,
  },
  chipLabelActive: {
    color: colors.text.onGold,
  },
  consentSection: {
    gap: spacing.cardGap,
    marginBottom: spacing.sectionGap,
  },
  consentHeading: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  consentBody: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
  },
  bulletList: {
    gap: spacing.iconGap,
  },
  bullet: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
  },
  policyLink: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.gold,
  },
  linkPressed: {
    opacity: 0.7,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.iconGap,
    marginTop: spacing.pillGap,
  },
  checkbox: {
    width: tipRow.bullet,
    height: tipRow.bullet,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border.dim,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.bg.gold,
    borderColor: colors.bg.gold,
  },
  checkmark: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: colors.text.onGold,
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
  },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.cardGap,
  },
});
