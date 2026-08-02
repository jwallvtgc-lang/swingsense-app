import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import ScreenHeader from '../components/ScreenHeader';
import type { OnboardStackParamList } from '../navigation/types';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

type Nav = NativeStackNavigationProp<OnboardStackParamList, 'AccountType'>;

function PersonIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12z"
        fill={colors.text.muted}
      />
      <Path
        d="M12 14.4c-5.04 0-7.2 2.52-7.2 4.8v1.2h14.4v-1.2c0-2.28-2.16-4.8-7.2-4.8z"
        fill={colors.text.muted}
      />
    </Svg>
  );
}

function FamilyIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 12c2.2 0 4-1.8 4-4S11.2 4 9 4 5 5.8 5 8s1.8 4 4 4z"
        fill={colors.text.muted}
      />
      <Path
        d="M9 14c-4 0-6 2-6 3.6V19h12v-1.4c0-1.6-2-3.6-6-3.6z"
        fill={colors.text.muted}
      />
      <Path
        d="M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3"
        stroke={colors.text.muted}
        strokeWidth={1.5}
        fill="none"
      />
      <Path
        d="M19 13c2.4.6 4 2 4 3.6V18h-4"
        stroke={colors.text.muted}
        strokeWidth={1.5}
        fill="none"
      />
    </Svg>
  );
}

type CardProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function TypeCard({ icon, title, subtitle, onPress }: CardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.cardIcon}>{icon}</View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M9 6l6 6-6 6"
          stroke={colors.text.muted}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

export default function AccountTypeScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <ScreenHeader
          title="WHO'S PLAYING?"
          subtitle="We'll set up the profile for the right person"
        />
        <View style={styles.cards}>
          <TypeCard
            icon={<PersonIcon />}
            title="I'm the player"
            subtitle="Setting up my own profile"
            onPress={() => navigation.navigate('Onboarding', { accountType: 'myself' })}
          />
          <TypeCard
            icon={<FamilyIcon />}
            title="I'm a parent"
            subtitle="Setting up a profile for my child"
            onPress={() => navigation.navigate('Onboarding', { accountType: 'parent' })}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
    gap: spacing.sectionGap,
  },
  cards: {
    gap: spacing.cardGap,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    padding: spacing.card,
    gap: spacing.card,
    borderWidth: 1,
    borderColor: colors.border.dim,
  },
  cardPressed: {
    opacity: 0.75,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.card,
    backgroundColor: colors.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: spacing.iconGap,
  },
  cardTitle: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  cardSubtitle: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
  },
});
