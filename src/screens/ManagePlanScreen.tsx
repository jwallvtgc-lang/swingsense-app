import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import BackNav from '../components/BackNav';
import { useAuth } from '../contexts/AuthContext';
import { getCompletedAnalysesCountThisMonth } from '../services/analysis';
import { displayNameFromUser } from '../utils/displayName';
import { useSubscription } from '../hooks/useSubscription';
import type { MainStackParamList } from '../navigation/types';
import { SILVER_TIER_MONTHLY_LIMIT } from '../config/constants';
import {
  colors,
  displayTitleProps,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

type Nav = NativeStackNavigationProp<MainStackParamList>;

type CheckColor = 'green' | 'gold' | 'muted';

function Checkmark({ color }: { color: CheckColor }) {
  const stroke =
    color === 'green'
      ? colors.text.green
      : color === 'gold'
      ? colors.text.gold
      : colors.text.muted;
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        d="M5 13l4 4L19 7"
        fill="none"
        stroke={stroke}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type FeatureItem =
  | { text: string; check: CheckColor }
  | { includedNote: string };

const FREE_FEATURES: FeatureItem[] = [
  { text: '3 AI-enabled swing analyses / week', check: 'muted' },
  { text: '1 personalized drill tied to a swing / week', check: 'muted' },
  { text: 'Key performance metrics for each swing', check: 'muted' },
];

const SILVER_FEATURES: FeatureItem[] = [
  { includedNote: 'Everything in Free, plus' },
  { text: '60 AI-enabled swing analyses / month', check: 'green' },
  { text: 'Personalized drills tied to every swing', check: 'green' },
  { text: '10 always-available drills tied to core swing mechanics', check: 'green' },
  { text: 'Replayable video walkthroughs for all drills', check: 'green' },
];

const GOLD_FEATURES: FeatureItem[] = [
  { includedNote: 'Everything in Silver, plus' },
  { text: 'Unlimited AI-enabled swing analyses', check: 'gold' },
  { text: '30+ always-available drills tied to core swing mechanics', check: 'gold' },
  { text: 'More innovative and personalized features coming', check: 'gold' },
];

function FeatureList({ items }: { items: FeatureItem[] }) {
  return (
    <View style={styles.featureList}>
      {items.map((item, i) => {
        if ('includedNote' in item) {
          return (
            <Text key={i} style={styles.includedNote}>
              {item.includedNote}
            </Text>
          );
        }
        return (
          <View key={i} style={styles.featureRow}>
            <Checkmark color={item.check} />
            <Text
              style={styles.featureText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {item.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ManagePlanScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user, profile } = useAuth();
  const [analysesThisMonth, setAnalysesThisMonth] = useState<number | null>(null);
  const subscription = useSubscription();

  useEffect(() => {
    const profileId = profile?.id;
    if (!profileId) return;
    let cancelled = false;
    (async () => {
      const n = await getCompletedAnalysesCountThisMonth(profileId);
      if (!cancelled) setAnalysesThisMonth(n);
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  const currentTier = subscription?.tier ?? 'free';
  const playerName = displayNameFromUser(profile?.first_name, user);
  const usageCount = analysesThisMonth ?? 0;
  const usagePct = Math.min(100, Math.round((usageCount / SILVER_TIER_MONTHLY_LIMIT) * 100));

  const usageNote =
    currentTier === 'gold'
      ? "You're on Gold — unlimited analyses."
      : currentTier === 'silver'
      ? `You're on Silver — ${SILVER_TIER_MONTHLY_LIMIT} analyses per month.`
      : `You're on Free. Silver includes ${SILVER_TIER_MONTHLY_LIMIT}/month — Gold is unlimited.`;

  const handleUpgradeSilver = () => {
    Alert.alert(
      'Upgrade to Silver',
      'In-app purchase will be available in the next update. RevenueCat integration is coming soon.',
      [{ text: 'Got it' }]
    );
  };

  const handleRestorePurchases = () => {
    Alert.alert(
      'Restore Purchases',
      'Purchase restoration will be available once in-app purchases are enabled.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.sectionGap * 2 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BackNav label="Profile" onPress={() => navigation.goBack()} />

        <Text style={styles.title} {...displayTitleProps}>
          Manage Plan
        </Text>
        <Text style={styles.subtitle}>
          Plan for <Text style={styles.subtitleBold}>{playerName}</Text>
          {' · '}billed per player profile
        </Text>

        {/* Usage card */}
        <View style={styles.usageCard}>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Analyses this month</Text>
            <Text style={styles.usageValue}>{analysesThisMonth ?? '—'}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${usagePct}%` }]} />
          </View>
          <Text style={styles.usageNote}>{usageNote}</Text>
        </View>

        {/* Plan cards */}
        <View style={styles.planStack}>

          {/* FREE */}
          <View style={[styles.planCard, styles.planCardFree]}>
            {currentTier === 'free' ? (
              <View style={styles.badgeCurrent}>
                <Text style={styles.badgeCurrentText}>Current Plan</Text>
              </View>
            ) : null}
            <View style={styles.planHead}>
              <Text style={styles.planName}>Free</Text>
              <View>
                <Text style={styles.planPrice}>$0</Text>
              </View>
            </View>
            <FeatureList items={FREE_FEATURES} />
            {currentTier === 'free' ? (
              <View style={styles.planBtnCurrentWrap}>
                <Text style={styles.planBtnCurrentLabel}>Current Plan</Text>
              </View>
            ) : null}
          </View>

          {/* SILVER */}
          <View style={[styles.planCard, styles.planCardSilver]}>
            {currentTier === 'silver' ? (
              <View style={styles.badgeCurrent}>
                <Text style={styles.badgeCurrentText}>Current Plan</Text>
              </View>
            ) : null}
            <View style={styles.planHead}>
              <Text style={styles.planName}>Silver</Text>
              <View style={styles.priceBlock}>
                <Text style={styles.planPrice}>$9.99</Text>
                <Text style={styles.planPricePer}>/ month</Text>
              </View>
            </View>
            <FeatureList items={SILVER_FEATURES} />
            {currentTier === 'silver' ? (
              <View style={styles.planBtnCurrentWrap}>
                <Text style={styles.planBtnCurrentLabel}>Current Plan</Text>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.planBtnSilver,
                  pressed && styles.planBtnPressed,
                ]}
                onPress={handleUpgradeSilver}
                accessibilityRole="button"
              >
                <Text style={styles.planBtnSilverLabel}>Upgrade to Silver</Text>
              </Pressable>
            )}
          </View>

          {/* GOLD */}
          <View style={[styles.planCard, styles.planCardGold]}>
            {currentTier === 'gold' ? (
              <View style={styles.badgeCurrent}>
                <Text style={styles.badgeCurrentText}>Current Plan</Text>
              </View>
            ) : (
              <View style={styles.badgeComingSoon}>
                <Text style={styles.badgeComingSoonText}>Coming Soon</Text>
              </View>
            )}
            <View style={styles.planHead}>
              <Text style={[styles.planName, styles.planNameGold]}>Gold</Text>
              <View style={styles.priceBlock}>
                <Text style={styles.planPrice}>$19.99</Text>
                <Text style={styles.planPricePer}>/ month</Text>
              </View>
            </View>
            <FeatureList items={GOLD_FEATURES} />
            {currentTier === 'gold' ? (
              <View style={styles.planBtnCurrentWrap}>
                <Text style={styles.planBtnCurrentLabel}>Current Plan</Text>
              </View>
            ) : (
              <View style={[styles.planBtnCurrentWrap, styles.planBtnComingSoon]}>
                <Text style={styles.planBtnComingSoonLabel}>Coming Soon</Text>
              </View>
            )}
          </View>

        </View>

        {/* Fine print */}
        <Text style={styles.finePrint}>
          {'Plans renew monthly and apply to this player profile only.\nCancel anytime in '}
          <Text
            style={styles.finePrintLink}
            onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
          >
            App Store settings
          </Text>
          .
        </Text>

        {/* Restore Purchases */}
        <Pressable
          onPress={handleRestorePurchases}
          style={({ pressed }) => [styles.restoreWrap, pressed && styles.planBtnPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.restoreLabel}>Restore Purchases</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.iconGap,
  },

  title: {
    fontFamily: typography.displayTitle,
    fontSize: fontSizes.screenTitle,
    color: colors.text.primary,
    marginTop: spacing.iconGap,
    marginBottom: spacing.pillGap,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    marginBottom: spacing.sectionGap,
    lineHeight: 20,
  },
  subtitleBold: {
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },

  // Usage card
  usageCard: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.dim,
    borderRadius: radius.card,
    padding: spacing.card,
    marginBottom: spacing.sectionGap,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.iconGap,
  },
  usageLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
  },
  usageValue: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  barTrack: {
    height: 6,
    backgroundColor: colors.border.dim,
    borderRadius: radius.xs,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.xs,
    backgroundColor: colors.bg.gold,
  },
  usageNote: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    marginTop: spacing.iconGap,
    lineHeight: 16,
  },

  // Plan stack
  planStack: {
    gap: spacing.cardGap,
  },

  // Plan card base
  planCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pill,
    padding: spacing.card + 4,
    paddingBottom: spacing.card,
    position: 'relative',
    marginTop: spacing.cardGap,
  },
  planCardFree: {
    borderWidth: 1.5,
    borderColor: colors.border.medium,
  },
  planCardSilver: {
    borderWidth: 1.5,
    borderColor: colors.border.dim,
  },
  planCardGold: {
    borderWidth: 1.5,
    borderColor: colors.border.gold,
    backgroundColor: colors.bg.goldDim,
    opacity: 0.85,
  },

  // Badges
  badgeCurrent: {
    position: 'absolute',
    top: -11,
    left: spacing.card,
    backgroundColor: colors.bg.surfaceHover,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.oauthMethodGap,
    paddingVertical: spacing.tabPad,
  },
  badgeCurrentText: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro,
    fontWeight: fontWeights.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  badgeComingSoon: {
    position: 'absolute',
    top: -11,
    right: spacing.card,
    backgroundColor: colors.bg.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.oauthMethodGap,
    paddingVertical: spacing.tabPad,
  },
  badgeComingSoonText: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro,
    fontWeight: fontWeights.bold,
    color: colors.text.onGold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Plan head
  planHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sectionGap - 4,
  },
  planName: {
    fontFamily: typography.body,
    fontSize: fontSizes.premiumActionCardTitle,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  planNameGold: {
    color: colors.text.gold,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontFamily: typography.body,
    fontSize: fontSizes.premiumActionCardTitle,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  planPricePer: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.secondary,
    marginTop: 1,
  },

  // Feature list
  featureList: {
    gap: spacing.iconGap,
    marginBottom: spacing.sectionGap - 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.iconGap,
  },
  featureText: {
    fontFamily: typography.body,
    fontSize: fontSizes.drillInstruction,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 18,
  },
  includedNote: {
    fontFamily: typography.body,
    fontSize: fontSizes.drillInstruction,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginLeft: spacing.premiumActionCardPadH,
  },

  // Plan buttons
  planBtnCurrentWrap: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: radius.card,
    paddingVertical: spacing.cardGap,
    alignItems: 'center',
  },
  planBtnCurrentLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.text.secondary,
  },
  planBtnSilver: {
    backgroundColor: colors.text.primary,
    borderRadius: radius.card,
    paddingVertical: spacing.cardGap,
    alignItems: 'center',
  },
  planBtnSilverLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.text.onGold,
  },
  planBtnComingSoon: {
    borderColor: colors.border.subtle,
  },
  planBtnComingSoonLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.text.muted,
  },
  planBtnPressed: {
    opacity: 0.8,
  },

  // Fine print + restore
  finePrint: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: spacing.sectionGap,
  },
  finePrintLink: {
    color: colors.text.secondary,
    textDecorationLine: 'underline',
  },
  restoreWrap: {
    alignItems: 'center',
    marginTop: spacing.sectionGap - 4,
    paddingVertical: spacing.pillGap,
  },
  restoreLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.text.gold,
  },
});
