import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoTile from '../components/LogoTile';
import PrimaryButton from '../components/PrimaryButton';
import ScoreRing from '../components/ScoreRing';
import ScreenHeader from '../components/ScreenHeader';
import TextInput from '../components/TextInput';
import { useAuth } from '../contexts/AuthContext';
import {
  BattingSide,
  Position,
  POSITION_LABELS,
  BATTING_SIDE_LABELS,
} from '../types';
import {
  bottomTab,
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  radius,
  spacing,
} from '../../design-system/tokens';

const DISPLAY_FONT = 'BebasNeue_400Regular';
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

const SCORE_CARDS: {
  score: number;
  label: string;
  sublabel: string;
  accentColor: string;
}[] = [
  {
    score: 45,
    label: 'Needs Work',
    sublabel: 'Clear issues to address',
    accentColor: colors.text.red,
  },
  {
    score: 65,
    label: 'On Track',
    sublabel: 'Solid for your age',
    accentColor: colors.text.muted,
  },
  {
    score: 78,
    label: 'Strong',
    sublabel: 'Minor tweaks only',
    accentColor: colors.text.green,
  },
  {
    score: 88,
    label: 'Exceptional',
    sublabel: 'Great mechanics',
    accentColor: colors.text.gold,
  },
];

export default function OnboardingScreen() {
  const { height } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const { profile, hasProfile, createProfile, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [battingSide, setBattingSide] = useState<BattingSide | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? '');
    setAge(String(profile.age ?? ''));
    setPosition(profile.primary_position ?? null);
    setBattingSide(profile.batting_side ?? null);
    setExperienceLevel(profile.experience_level ?? null);
  }, [profile]);

  const validateProfileFields = useCallback(() => {
    if (!firstName.trim()) {
      Alert.alert('Missing name', 'Please enter your first name.');
      return false;
    }
    if (!age.trim() || isNaN(Number(age)) || Number(age) < 5 || Number(age) > 99) {
      Alert.alert('Invalid age', 'Please enter a valid age (5-99).');
      return false;
    }
    if (!position) {
      Alert.alert('Missing position', 'Please select your primary position.');
      return false;
    }
    if (!battingSide) {
      Alert.alert('Missing batting side', 'Please select your batting side.');
      return false;
    }
    return true;
  }, [firstName, age, position, battingSide]);

  const handleProfileContinue = useCallback(async () => {
    if (!validateProfileFields()) return;
    setSaving(true);
    const payload = {
      first_name: firstName.trim(),
      age: Number(age),
      primary_position: position!,
      batting_side: battingSide!,
      height_feet: null,
      height_inches: null,
      experience_level: experienceLevel,
    };
    const { error } =
      !hasProfile || !profile
        ? await createProfile({ ...payload, onboarding_completed: false })
        : await updateProfile({
            first_name: payload.first_name,
            age: payload.age,
            primary_position: payload.primary_position,
            batting_side: payload.batting_side,
            experience_level: payload.experience_level,
          });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setStep(3);
  }, [
    validateProfileFields,
    firstName,
    age,
    position,
    battingSide,
    experienceLevel,
    hasProfile,
    profile,
    createProfile,
    updateProfile,
  ]);

  const handleFinishOnboarding = useCallback(async () => {
    setSaving(true);
    const { error } = await updateProfile({ onboarding_completed: true });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    }
  }, [updateProfile]);

  const footerPaddingBottom = insets.bottom + spacing.screen;

  const primaryAction = () => {
    if (step === 1) setStep(2);
    else if (step === 2) void handleProfileContinue();
    else if (step === 3) setStep(4);
    else void handleFinishOnboarding();
  };

  const primaryLabel =
    step === 1
      ? 'Get Started'
      : step === 2
        ? 'Continue'
        : step === 3
          ? 'Got It'
          : 'Analyze My First Swing';

  const scrollContentStyle = [
    styles.scrollContent,
    step === 1 && styles.scrollContentWelcome,
    step === 4 && styles.scrollContentCta,
  ];

  const scrollInner = (
    <>
      {step === 1 ? (
        <View style={styles.welcomeBlock}>
          <LogoTile size="lg" />
          <Text style={styles.welcomeKicker}>WELCOME TO</Text>
          <Text style={styles.wordmark}>SWINGSENSE</Text>
          <Text style={styles.tagline}>AI coaching for every swing</Text>
        </View>
      ) : null}

      {step === 2 ? (
        <>
          <ScreenHeader
            title="YOUR PROFILE"
            subtitle="We use this to calibrate your scores and coaching"
          />
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
                      style={[
                        styles.chipLabel,
                        selected ? styles.chipLabelActive : styles.chipLabelInactive,
                      ]}
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
                      style={[
                        styles.chipLabel,
                        selected ? styles.chipLabelActive : styles.chipLabelInactive,
                      ]}
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
        </>
      ) : null}

      {step === 4 ? (
        <View style={styles.ctaBlock}>
          <LogoTile size="lg" />
          <Text style={styles.ctaTitle}>READY TO ANALYZE</Text>
          <Text style={styles.ctaBody}>
            Upload your first swing and get your AI coaching report in under 60 seconds.
          </Text>
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {step === 3 ? (
          <View
            style={[
              styles.step3Outer,
              {
                paddingTop: height * 0.18,
                paddingBottom: bottomTab.height + spacing.cardGap,
              },
            ]}
          >
            <View style={styles.step3Inner}>
              <View style={styles.step3HeaderBlock}>
                <ScreenHeader
                  title="YOUR SCORES"
                  subtitle="What the numbers actually mean"
                />
              </View>
              <View style={[styles.grid, styles.step3Grid]}>
                <View style={styles.gridRow}>
                  {SCORE_CARDS.slice(0, 2).map((c) => (
                    <View key={c.label} style={styles.gridCell}>
                      <ScoreRing
                        score={c.score}
                        size="sm"
                        showLabel
                        accentColor={c.accentColor}
                      />
                      <Text style={styles.scoreCardLabel}>{c.label}</Text>
                      <Text style={styles.scoreCardSublabel}>{c.sublabel}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.gridRow}>
                  {SCORE_CARDS.slice(2, 4).map((c) => (
                    <View key={c.label} style={styles.gridCell}>
                      <ScoreRing
                        score={c.score}
                        size="sm"
                        showLabel
                        accentColor={c.accentColor}
                      />
                      <Text style={styles.scoreCardLabel}>{c.label}</Text>
                      <Text style={styles.scoreCardSublabel}>{c.sublabel}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text
                style={[styles.scoreExplainer, { marginTop: spacing.sectionGap }]}
              >
                Scores are calibrated for your age and experience level.
              </Text>
            </View>
          </View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={scrollContentStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {scrollInner}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      <View
        style={
          step === 3
            ? [styles.footerPinned, { bottom: insets.bottom + spacing.screen }]
            : [styles.footer, { paddingBottom: footerPaddingBottom }]
        }
      >
        <PrimaryButton
          label={primaryLabel}
          onPress={primaryAction}
          loading={saving && (step === 2 || step === 4)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  flex: {
    flex: 1,
  },
  step3Outer: {
    flex: 1,
    paddingHorizontal: spacing.screen,
  },
  step3Inner: {
    alignSelf: 'stretch',
  },
  step3HeaderBlock: {
    marginBottom: spacing.cardGap,
    alignSelf: 'stretch',
  },
  step3Grid: {
    marginTop: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
    paddingBottom: spacing.cardGap,
  },
  scrollContentWelcome: {
    justifyContent: 'center',
  },
  scrollContentCta: {
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.cardGap,
  },
  footerPinned: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    paddingTop: spacing.cardGap,
    zIndex: 1,
  },
  welcomeBlock: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  welcomeKicker: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.drillInstruction,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacing.label,
    color: colors.text.muted,
    textTransform: 'uppercase',
    marginTop: spacing.sectionGap,
  },
  wordmark: {
    fontFamily: DISPLAY_FONT,
    fontSize: fontSizes.headline,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.iconGap,
  },
  tagline: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
    marginTop: spacing.pillGap,
    textAlign: 'center',
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
  grid: {
    marginTop: spacing.cardGap,
    gap: spacing.cardGap,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.cardGap,
  },
  gridCell: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  scoreCardLabel: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.pillGap,
  },
  scoreCardSublabel: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.iconGap,
  },
  scoreExplainer: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  ctaBlock: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  ctaTitle: {
    fontFamily: DISPLAY_FONT,
    fontSize: fontSizes.displaySm,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.sectionGap,
  },
  ctaBody: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.cardGap,
  },
});
