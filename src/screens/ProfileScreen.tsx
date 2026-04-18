import { useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import BottomTabBar from '../components/BottomTabBar';
import DataRow from '../components/DataRow';
import EditButton from '../components/EditButton';
import PrimaryButton from '../components/PrimaryButton';
import ProfileHeader from '../components/ProfileHeader';
import SectionCard from '../components/SectionCard';
import { useAuth } from '../contexts/AuthContext';
import { displayNameFromUser } from '../utils/displayName';
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
    Linking.openURL(`mailto:swingsenseapp@gmail.com?subject=${subject}&body=${body}`);
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
          <SectionCard title="Membership">
            <DataRow label="Plan" value="Free" valueWeight="normal" />
            <DataRow
              label="Analyses this month"
              value={analysesThisMonth === null ? '—' : String(analysesThisMonth)}
              valueWeight="normal"
            />
            <View style={styles.membershipCta}>
              <PrimaryButton
                label="Upgrade to Pro"
                onPress={() =>
                  Alert.alert(
                    'SwingSense Pro',
                    'Pro features are coming soon — unlimited analyses, advanced metrics, and more. Stay tuned.',
                    [{ text: 'Got it' }]
                  )
                }
                icon={<Ionicons name="star" size={18} color={colors.text.onGold} />}
              />
            </View>
            <DataRow
              label="Manage Plan"
              value="Coming soon"
              valueWeight="normal"
              showChevron
              onPress={() =>
                Alert.alert(
                  'SwingSense Pro',
                  'Pro features are coming soon — unlimited analyses, advanced metrics, and more. Stay tuned.',
                  [{ text: 'Got it' }]
                )
              }
            />
            <DataRow
              label="Notifications"
              showChevron
              last
              onPress={() => Linking.openSettings()}
            />
          </SectionCard>
        </View>

        {/* SUPPORT */}
        <View style={styles.afterCard}>
          <SectionCard title="Support">
            <DataRow label="Send Feedback" showChevron onPress={openFeedback} />
            <DataRow
              label="Contact Us"
              showChevron
              onPress={() => Linking.openURL('mailto:swingsenseapp@gmail.com')}
            />
            <DataRow
              label="About SwingSense"
              value={`Version ${Constants.expoConfig?.version ?? '—'}`}
              valueWeight="normal"
              showChevron
              last
              onPress={() => {}}
            />
          </SectionCard>
        </View>

        {/* LEGAL */}
        <View style={styles.afterCard}>
          <SectionCard title="Legal">
            <DataRow
              label="Privacy Policy"
              showChevron
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
            <DataRow
              label="Terms of Service"
              showChevron
              last
              onPress={() => navigation.navigate('TermsOfService')}
            />
          </SectionCard>
        </View>

        {/* SIGN OUT */}
        <View style={styles.afterCard}>
          <SectionCard>
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
  membershipCta: {
    marginVertical: spacing.cardGap,
    alignSelf: 'stretch',
  },
});
