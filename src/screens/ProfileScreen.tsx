import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import BottomTabBar from '../components/BottomTabBar';
import DataRow from '../components/DataRow';
import EditButton from '../components/EditButton';
import ProfileHeader from '../components/ProfileHeader';
import SectionCard from '../components/SectionCard';
import SubscriptionCard from '../components/SubscriptionCard';
import { FEEDBACK_EMAIL } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { getCompletedAnalysesCountThisMonth } from '../services/analysis';
import { useMainTabBarNav } from '../navigation/useMainTabBarNav';
import type { MainStackParamList, TabParamList } from '../navigation/types';
import { BATTING_SIDE_LABELS, POSITION_LABELS } from '../types';
import { bottomTab, colors, spacing } from '../../design-system/tokens';

type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Profile'>,
  NativeStackNavigationProp<MainStackParamList>
>;

function formatHeight(feet: number | null, inches: number | null): string {
  if (feet == null && inches == null) return '—';
  if (feet != null && inches != null) return `${feet}'${inches}"`;
  if (feet != null) return `${feet}'`;
  return `${inches ?? 0}"`;
}

function displayNameFromUser(
  profileFirstName: string | undefined,
  user: User | null
): string {
  const fromProfile = profileFirstName?.trim();
  if (fromProfile) return fromProfile;
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const full =
    typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
  if (full) return full;
  const name = typeof meta?.name === 'string' ? meta.name.trim() : '';
  if (name) return name;
  const email = user?.email?.trim();
  if (email) {
    const local = email.split('@')[0];
    if (local) return local;
  }
  return 'Player';
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length === 1) {
    return `${parts[0]}?`.toUpperCase();
  }
  return '?';
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ProfileNav>();
  const navigateMainTab = useMainTabBarNav();
  const { user, profile, signOut } = useAuth();
  const [analysesThisMonth, setAnalysesThisMonth] = useState<number | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setAnalysesThisMonth(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const n = await getCompletedAnalysesCountThisMonth(userId);
      if (!cancelled) setAnalysesThisMonth(n);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const displayName = useMemo(
    () => displayNameFromUser(profile?.first_name, user),
    [profile?.first_name, user]
  );
  const emailDisplay = user?.email?.trim() ?? '—';
  const initials = useMemo(() => initialsFromName(displayName), [displayName]);

  const ageDisplay = profile != null ? String(profile.age) : '—';
  const positionDisplay =
    profile != null ? POSITION_LABELS[profile.primary_position] : '—';
  const batsDisplay =
    profile != null ? BATTING_SIDE_LABELS[profile.batting_side] : '—';
  const heightDisplay =
    profile != null
      ? formatHeight(profile.height_feet, profile.height_inches)
      : '—';

  const openFeedback = () => {
    const subject = encodeURIComponent('SwingSense Beta Feedback');
    const body = encodeURIComponent(
      "What worked? What didn't? (Even one word helps.)"
    );
    Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const contentBottomPad = useMemo(
    () => spacing.sectionGap + bottomTab.height + insets.bottom,
    [insets.bottom]
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.screen,
            paddingBottom: contentBottomPad,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          name={displayName}
          email={emailDisplay}
          initials={initials}
        />

        <View style={styles.afterHeader}>
          <SectionCard
            title="Player Profile"
            headerRight={
              <EditButton onPress={() => navigation.navigate('EditProfile')} />
            }
          >
            <DataRow label="Age" value={ageDisplay} valueWeight="normal" />
            <DataRow
              label="Position"
              value={positionDisplay}
              valueWeight="bold"
            />
            <DataRow label="Bats" value={batsDisplay} valueWeight="bold" />
            <DataRow
              label="Height"
              value={heightDisplay}
              valueWeight="normal"
              last={false}
            />
            <DataRow
              label="Experience level"
              value={profile?.experience_level ?? '—'}
              valueWeight="normal"
              last={true}
            />
          </SectionCard>
        </View>

        <View style={styles.afterCard}>
          <SubscriptionCard analysesThisMonth={analysesThisMonth} />
        </View>

        <View style={styles.afterCard}>
          <SectionCard>
            <DataRow
              label="Send Feedback"
              showChevron
              onPress={openFeedback}
            />
            <DataRow
              label="Sign Out"
              labelTone="danger"
              last
              onPress={handleSignOut}
            />
          </SectionCard>
        </View>
      </ScrollView>
      <BottomTabBar activeTab="profile" onTabPress={navigateMainTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    paddingHorizontal: spacing.screen,
  },
  afterHeader: {
    marginTop: spacing.sectionGap,
  },
  afterCard: {
    marginTop: spacing.cardGap,
  },
});
