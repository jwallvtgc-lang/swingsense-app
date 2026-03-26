import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { COLORS, FONTS, FEEDBACK_EMAIL } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { POSITION_LABELS, BATTING_SIDE_LABELS } from '../types';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
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
          <Pressable
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="pencil" size={18} color={COLORS.accent} />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
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
        <Pressable
          style={({ pressed }) => [styles.upgradeButton, pressed && styles.ctaPressed]}
        >
          <Ionicons name="star" size={18} color={COLORS.black} />
          <Text style={styles.upgradeText}>Upgrade to Pro</Text>
        </Pressable>
      </View>

      <Pressable style={styles.feedbackLink} onPress={openFeedback}>
        <Ionicons name="mail-outline" size={20} color={COLORS.accent} />
        <Text style={styles.feedbackLinkText}>Send Feedback</Text>
      </Pressable>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

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
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accentGlow,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontFamily: FONTS.heading,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  name: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    color: COLORS.text,
    letterSpacing: 1,
  },
  email: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.accent,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textDim,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  upgradeButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  upgradeText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.black,
  },
  feedbackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginTop: 8,
  },
  feedbackLinkText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginTop: 8,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.red,
  },
  version: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 32,
  },
});
