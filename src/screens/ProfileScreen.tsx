import { useCallback, useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AvatarCircle from '../components/AvatarCircle';
import BottomTabBar from '../components/BottomTabBar';
import DataRow from '../components/DataRow';
import EditButton from '../components/EditButton';
import ProfileHeader from '../components/ProfileHeader';
import ProfileSwitcherSheet from '../components/ProfileSwitcherSheet';
import SectionCard from '../components/SectionCard';
import { useAuth } from '../contexts/AuthContext';
import { displayNameFromUser } from '../utils/displayName';
import { getCompletedAnalysesCountThisMonth } from '../services/analysis';
import { useSubscription } from '../hooks/useSubscription';
import { useMainTabBarNav } from '../navigation/useMainTabBarNav';
import type { MainStackParamList, TabParamList } from '../navigation/types';
import { BATTING_SIDE_LABELS, POSITION_LABELS } from '../types';
import { bottomTab, colors, fontSizes, fontWeights, letterSpacing, radius, spacing, typography } from '../../design-system/tokens';

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
  const { user, profile, profiles, activeProfileId, switchProfile, signOut, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [analysesThisMonth, setAnalysesThisMonth] = useState<number | null>(null);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const subscription = useSubscription();
  const planDisplay = subscription != null
    ? subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)
    : 'Free';

  useEffect(() => {
    const profileId = profile?.id;
    if (!profileId) {
      setAnalysesThisMonth(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const n = await getCompletedAnalysesCountThisMonth(profileId);
      if (!cancelled) setAnalysesThisMonth(n);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

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

  const handleAddPlayer = useCallback(() => {
    navigation.navigate('AddPlayer');
  }, [navigation]);

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data:\n\n• All player profiles under this account\n• All swing history and analyses\n• Any active subscription\n\nThis cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Your account and all data will be permanently deleted. This action cannot be reversed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Permanently Delete Account',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    const { error } = await deleteAccount();
                    setDeleting(false);
                    if (error) {
                      Alert.alert(
                        'Deletion Failed',
                        'Something went wrong. Please try again or contact swingsenseapp@gmail.com.',
                      );
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
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

        {/* Profile switcher row — shows active player, opens sheet to switch */}
        <View style={styles.afterHeader}>
          <Text style={styles.switcherLabel}>Player</Text>
          <Pressable
            style={({ pressed }) => [styles.switcherRow, pressed && styles.switcherRowPressed]}
            onPress={() => setSwitcherVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Switch player profile"
          >
            <AvatarCircle initials={initials} size={SWITCHER_AVATAR_SIZE} />
            <Text style={styles.switcherName} numberOfLines={1}>{displayName}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.text.gold} />
          </Pressable>
        </View>

        <View style={styles.afterCard}>
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
            <DataRow label="Plan" value={planDisplay} valueWeight="normal" />
            <DataRow
              label="Analyses this month"
              value={analysesThisMonth === null ? '—' : String(analysesThisMonth)}
              valueWeight="normal"
            />
            <DataRow
              label="Manage Plan"
              valueWeight="normal"
              showChevron
              onPress={() => navigation.navigate('ManagePlan')}
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

        {/* DELETE ACCOUNT — visually separated, clearly destructive */}
        <View style={styles.deleteSection}>
          <Pressable
            style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed, deleting && styles.deleteButtonDisabled]}
            onPress={handleDeleteAccount}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
          >
            <Text style={styles.deleteButtonText}>
              {deleting ? 'Deleting…' : 'Delete Account'}
            </Text>
          </Pressable>
          <Text style={styles.deleteHint}>
            Permanently removes your account and all player data.
          </Text>
        </View>
      </ScrollView>
      <ProfileSwitcherSheet
        visible={switcherVisible}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelect={switchProfile}
        onClose={() => setSwitcherVisible(false)}
        onAddPlayer={handleAddPlayer}
      />
      <BottomTabBar activeTab="profile" onTabPress={navigateMainTab} />
    </View>
  );
}

const SWITCHER_AVATAR_SIZE = 32;

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
    marginTop: spacing.sectionGap + spacing.cardGap,
    gap: spacing.iconGap,
  },
  switcherLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.label,
    fontWeight: fontWeights.medium,
    color: colors.text.muted,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
  },
  switcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.dim,
    paddingVertical: spacing.cardSm,
    paddingHorizontal: spacing.card,
  },
  switcherRowPressed: {
    opacity: 0.7,
  },
  switcherName: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  afterCard: {
    marginTop: spacing.cardGap,
  },
  deleteSection: {
    marginTop: spacing.sectionGap,
    alignItems: 'center',
    gap: spacing.iconGap,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: colors.text.red,
    borderRadius: radius.pill,
    paddingVertical: spacing.cardSm,
    paddingHorizontal: spacing.card,
  },
  deleteButtonPressed: {
    opacity: 0.6,
  },
  deleteButtonDisabled: {
    opacity: 0.4,
  },
  deleteButtonText: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.red,
  },
  deleteHint: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
