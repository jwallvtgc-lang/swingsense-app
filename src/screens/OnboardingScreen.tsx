import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import BackNav from '../components/BackNav';
import PrimaryButton from '../components/PrimaryButton';
import ScoreRing from '../components/ScoreRing';
import ScreenHeader from '../components/ScreenHeader';
import TextInput from '../components/TextInput';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { trackEvent } from '../services/analytics';
import {
  BattingSide,
  Position,
  POSITION_LABELS,
  BATTING_SIDE_LABELS,
} from '../types';
import type { OnboardStackParamList } from '../navigation/types';
import {
  bottomTab,
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  splashBrand,
  tipRow,
} from '../../design-system/tokens';

const DISPLAY_FONT = 'BebasNeue_400Regular';
const FONT_INTER = 'Inter_400Regular';

const SPLASH_BG_SOURCE = require('../../assets/splash-background.png');
const SPLASH_WORDMARK_SOURCE = require('../../assets/splash-wordmark.png');
const LOGO_VW = 0.66;

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
  { score: 15, label: 'Needs Work', sublabel: 'Clear issues to address',  accentColor: colors.core5.bandLow },
  { score: 40, label: 'On Track',   sublabel: 'Building the basics',       accentColor: colors.core5.bandMid },
  { score: 65, label: 'Strong',     sublabel: 'Solid for your age',        accentColor: colors.core5.bandHigh },
  { score: 85, label: 'Excellent',  sublabel: 'Minor tweaks only',         accentColor: colors.core5.bandExcellent },
  { score: 95, label: 'Legendary',  sublabel: 'Elite, top-tier mechanics', accentColor: colors.core5.bandLegendary },
];

type OnboardingRoute = RouteProp<OnboardStackParamList, 'Onboarding'>;
type Nav = NativeStackNavigationProp<OnboardStackParamList, 'Onboarding'>;

export default function OnboardingScreen() {
  const { width } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<OnboardingRoute>();
  const { user, profile, hasProfile, createProfile, updateProfile } = useAuth();
  // Route param is set when navigating from AccountTypeScreen this session.
  // user_metadata.account_type is the durable fallback (survives kill/reload).
  const accountType: 'player' | 'parent' =
    route.params?.accountType ??
    (user?.user_metadata?.account_type as 'player' | 'parent' | undefined) ??
    'player';

  // step 1 = Player Profile, step 2 = Your Scores, step 3 = CTA
  const [step, setStep] = useState(1);
  const [parentName, setParentName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [battingSide, setBattingSide] = useState<BattingSide | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [coppaConsented, setCoppaConsented] = useState(false);
  const [coppaConsentConfirmed, setCoppaConsentConfirmed] = useState(false);

  const parsedAge = Number(age);
  const isValidAge = age.trim() !== '' && !isNaN(parsedAge) && parsedAge >= 5 && parsedAge <= 99;
  const isUnder13 = isValidAge && parsedAge < 13;

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? '');
    setAge(String(profile.age ?? ''));
    setPosition(profile.primary_position ?? null);
    setBattingSide(profile.batting_side ?? null);
    setExperienceLevel(profile.experience_level ?? null);
  }, [profile]);

  // Dismiss the keyboard as soon as the COPPA consent gate appears so the
  // checkbox and Continue button are immediately visible without manual dismissal.
  useEffect(() => {
    if (isUnder13 && accountType === 'parent' && !coppaConsentConfirmed) {
      Keyboard.dismiss();
    }
  }, [isUnder13, accountType, coppaConsentConfirmed]);

  const validateProfileFields = useCallback((skipPosition = false) => {
    if (!firstName.trim()) {
      Alert.alert('Missing name', "Please enter the player's first name.");
      return false;
    }
    if (!age.trim() || isNaN(Number(age)) || Number(age) < 5 || Number(age) > 99) {
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
  }, [firstName, age, position, battingSide]);

  const handleProfileContinue = useCallback(async () => {
    const parsed = Number(age);
    const validAge = age.trim() !== '' && !isNaN(parsed) && parsed >= 5 && parsed <= 99;
    const under13 = validAge && parsed < 13;

    // Phase A: COPPA consent gate — validate name+age only, then reveal position fields
    if (under13 && accountType === 'parent' && !coppaConsentConfirmed) {
      if (!validateProfileFields(true)) return;
      setCoppaConsentConfirmed(true);
      return;
    }

    // Safety guard for the player-path block (button is hidden, but be defensive)
    if (under13 && accountType === 'player') return;

    // Phase B or normal path: full validation + submit
    if (!validateProfileFields()) return;

    setSaving(true);
    const consentPatch = (under13 && accountType === 'parent' && coppaConsentConfirmed)
      ? { gave_coppa_consent: true as const, consent_given_at: new Date().toISOString() }
      : {};

    const payload = {
      first_name: firstName.trim(),
      age: parsed,
      primary_position: position!,
      batting_side: battingSide!,
      height_feet: null,
      height_inches: null,
      experience_level: experienceLevel,
    };
    const { error } =
      !hasProfile || !profile
        ? await createProfile({ ...payload, onboarding_completed: false, ...consentPatch })
        : await updateProfile({
            first_name: payload.first_name,
            age: payload.age,
            primary_position: payload.primary_position,
            batting_side: payload.batting_side,
            experience_level: payload.experience_level,
            ...consentPatch,
          });
    if (error) {
      setSaving(false);
      Alert.alert('Error', error.message);
      return;
    }
    if (accountType === 'parent' && parentName.trim()) {
      await supabase.auth.updateUser({ data: { parent_name: parentName.trim() } });
    }
    setSaving(false);
    setStep(2);
  }, [
    validateProfileFields,
    age,
    firstName,
    position,
    battingSide,
    experienceLevel,
    hasProfile,
    profile,
    createProfile,
    updateProfile,
    accountType,
    parentName,
    coppaConsentConfirmed,
  ]);

  const handleFinishOnboarding = useCallback(async () => {
    console.log('[handleFinishOnboarding] ENTERED');
    setSaving(true);
    try {
      const { error } = await updateProfile({ onboarding_completed: true });
      console.log('[handleFinishOnboarding] updateProfile resolved — error:', error?.message ?? null);
      if (error) {
        Alert.alert('Error saving progress', error.message);
        return;
      }
      trackEvent('onboarding_completed', {
        experience_level: experienceLevel,
        primary_position: position,
        batting_side: battingSide,
        account_type: accountType,
      });
      console.log('[handleFinishOnboarding] trackEvent done');
    } catch (e) {
      console.log('[handleFinishOnboarding] CAUGHT:', e instanceof Error ? e.message : String(e));
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
      console.log('[handleFinishOnboarding] finally — saving reset');
    }
  }, [updateProfile, experienceLevel, position, battingSide, accountType]);

  const footerPaddingBottom = insets.bottom + spacing.screen;

  const handleShareWithParent = useCallback(async () => {
    const name = firstName.trim();
    // TODO: swap to App Store URL (https://apps.apple.com/app/id6760627870) once the listing goes live
    const appStoreUrl = 'https://testflight.apple.com/join/jrA4Jg74';
    const message = name
      ? `Hey, ${name} wants to use SwingSense for baseball swing coaching — can you set it up? ${appStoreUrl}`
      : `Someone wants to use SwingSense for baseball swing coaching — can you set it up? ${appStoreUrl}`;
    try {
      await Share.share({ message });
    } catch {
      // user dismissed share sheet — no-op
    }
  }, [firstName]);

  const primaryAction = () => {
    console.log('[primaryAction] called — step:', step);
    if (step === 1) void handleProfileContinue();
    else if (step === 2) setStep(3);
    else void handleFinishOnboarding();
  };

  const primaryLabel =
    step === 1
      ? 'Continue'
      : step === 2
        ? 'Got It'
        : 'Analyze My First Swing';

  // Consent gate is active when age < 13, parent path, and consent not yet confirmed
  const showConsentGate = step === 1 && isUnder13 && accountType === 'parent' && !coppaConsentConfirmed;
  // Hard block: player-path, under 13 — no Continue button
  const showPlayerBlock = step === 1 && isUnder13 && accountType === 'player';

  const scrollContentStyle = [
    styles.scrollContent,
    step === 3 && styles.scrollContentCta,
  ];

  if (step === 3) {
    const wordmarkWidth = Math.min(width * LOGO_VW, 340);
    const wordmarkHeight = wordmarkWidth * splashBrand.logoAspect;
    return (
      <ImageBackground
        source={SPLASH_BG_SOURCE}
        style={styles.splashBg}
        resizeMode="cover"
      >
        <View style={styles.splashContent}>
          <Image
            source={SPLASH_WORDMARK_SOURCE}
            style={{ width: wordmarkWidth, height: wordmarkHeight }}
            resizeMode="contain"
          />
          <Text style={styles.ctaTitle}>READY TO ANALYZE</Text>
          <Text style={styles.ctaBody}>
            Upload your first swing and get your AI coaching report in under 60 seconds.
          </Text>
        </View>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.screen }]}>
          <PrimaryButton
            label="Analyze My First Swing"
            onPress={primaryAction}
            loading={saving}
          />
        </View>
      </ImageBackground>
    );
  }

  const scrollInner = (
    <>
      {step === 1 ? (
        <>
          {navigation.canGoBack() ? (
            <BackNav label="Who's Playing?" onPress={() => navigation.goBack()} />
          ) : null}
          <ScreenHeader title="PLAYER PROFILE" />
          {accountType === 'parent' ? (
            <View style={styles.field}>
              <Text style={styles.label}>Parent Name</Text>
              <TextInput
                placeholder="Your first name"
                value={parentName}
                onChangeText={setParentName}
                autoCapitalize="words"
              />
            </View>
          ) : null}
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
          ) : showPlayerBlock ? (
            <View style={styles.blockingSection}>
              <Text style={styles.blockingTitle}>Let's get a parent set up</Text>
              <Text style={styles.blockingBody}>
                {firstName.trim()
                  ? `${firstName.trim()} is under 13, so a parent or guardian needs to create this profile — that's how we keep their info safe.`
                  : `Players under 13 need a parent or guardian to create their profile — that's how we keep their info safe.`}
              </Text>
              <Text style={styles.blockingReassurance}>Nothing has been saved yet.</Text>
              <PrimaryButton
                label="Share with a Parent"
                onPress={() => void handleShareWithParent()}
              />
              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [styles.parentHereLink, pressed && styles.linkPressed]}
                accessibilityRole="button"
              >
                <Text style={styles.parentHereLinkText}>A parent is here with me</Text>
              </Pressable>
            </View>
          ) : (
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
          )}
        </>
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
        {step === 2 ? (
          <View
            style={[
              styles.step2Outer,
              {
                paddingTop: spacing.screen,
                paddingBottom: bottomTab.height + spacing.cardGap,
              },
            ]}
          >
            <View style={styles.step2Inner}>
              <View style={styles.step2HeaderBlock}>
                <ScreenHeader
                  title="YOUR SCORES"
                  subtitle="What the numbers actually mean"
                />
              </View>
              <View style={styles.bandList}>
                {SCORE_CARDS.map((c) => (
                  <View key={c.label} style={styles.bandRow}>
                    <ScoreRing
                      score={c.score}
                      size="sm"
                      showLabel
                      accentColor={c.accentColor}
                    />
                    <View style={styles.bandText}>
                      <Text style={styles.scoreCardLabel}>{c.label}</Text>
                      <Text style={styles.scoreCardSublabel}>{c.sublabel}</Text>
                    </View>
                  </View>
                ))}
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
        {!showPlayerBlock ? (
          <View
            style={
              step === 2
                ? [styles.footerPinned, { bottom: insets.bottom + spacing.screen }]
                : [styles.footer, { paddingBottom: footerPaddingBottom }]
            }
          >
            <PrimaryButton
              label={primaryLabel}
              onPress={primaryAction}
              loading={saving && (step === 1 || step === 3)}
              disabled={showConsentGate && !coppaConsented}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
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
  step2Outer: {
    flex: 1,
    paddingHorizontal: spacing.screen,
  },
  step2Inner: {
    alignSelf: 'stretch',
  },
  step2HeaderBlock: {
    marginBottom: spacing.cardGap,
    alignSelf: 'stretch',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
    paddingBottom: spacing.cardGap,
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
  bandList: {
    gap: spacing.iconGap,
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sectionGap,
  },
  bandText: {
    flex: 1,
    gap: 2,
  },
  scoreCardLabel: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  scoreCardSublabel: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
  },
  scoreExplainer: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
    textAlign: 'center',
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
  blockingSection: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    padding: spacing.card,
    borderWidth: 1,
    borderColor: colors.border.dim,
    marginBottom: spacing.sectionGap,
    gap: spacing.cardGap,
    alignItems: 'center',
  },
  blockingTitle: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  blockingBody: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  blockingReassurance: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    color: colors.text.muted,
    textAlign: 'center',
  },
  parentHereLink: {
    paddingVertical: spacing.pillGap,
  },
  parentHereLinkText: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.gold,
    textAlign: 'center',
  },
  splashBg: {
    flex: 1,
    backgroundColor: colors.bg.splashBase,
  },
  splashContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
    gap: spacing.sectionGap,
  },
  ctaTitle: {
    fontFamily: DISPLAY_FONT,
    fontSize: fontSizes.displaySm,
    color: colors.text.primary,
    textAlign: 'center',
  },
  ctaBody: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
