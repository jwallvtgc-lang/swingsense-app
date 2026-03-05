import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { COLORS, SPACING, FONT_SIZE, FEEDBACK_EMAIL } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { POSITION_LABELS, BATTING_SIDE_LABELS } from '../types';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { profile, user, signOut } = useAuth();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const openFeedback = () => {
    const subject = encodeURIComponent('SwingSense Beta Feedback');
    const body = encodeURIComponent(
      'What worked? What didn\'t? (Even one word helps.)'
    );
    Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const heightDisplay = () => {
    if (!profile?.height_feet) return 'Not set';
    return `${profile.height_feet}'${profile.height_inches ?? 0}"`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.first_name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.first_name ?? 'Player'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Player Profile</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="pencil" size={18} color={COLORS.accent} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <ProfileRow label="Age" value={String(profile?.age ?? '—')} />
        <ProfileRow
          label="Position"
          value={profile?.primary_position ? POSITION_LABELS[profile.primary_position] : '—'}
        />
        <ProfileRow
          label="Bats"
          value={profile?.batting_side ? BATTING_SIDE_LABELS[profile.batting_side] : '—'}
        />
        <ProfileRow label="Height" value={heightDisplay()} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription</Text>
        <ProfileRow label="Plan" value="Free" />
        <ProfileRow label="Analyses this month" value="—" />
        <TouchableOpacity style={styles.upgradeButton}>
          <Ionicons name="star" size={18} color={COLORS.black} />
          <Text style={styles.upgradeText}>Upgrade to Pro</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.feedbackLink}
        onPress={openFeedback}
      >
        <Ionicons name="mail-outline" size={20} color={COLORS.accent} />
        <Text style={styles.feedbackLinkText}>Send Feedback</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>SwingSense v{appVersion}</Text>
    </ScrollView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZE.hero,
    fontWeight: '800',
    color: COLORS.white,
  },
  name: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.text,
  },
  email: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  rowLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  upgradeButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  upgradeText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.black,
  },
  feedbackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  feedbackLinkText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.accent,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  signOutText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.error,
  },
  version: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
