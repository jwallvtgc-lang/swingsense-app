import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AvatarCircle from './AvatarCircle';
import type { Profile } from '../types';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

const AVATAR_SIZE = 32;
const CHECKMARK_SIZE = 20;
const ADD_ICON_SIZE = 18;
const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 4;

interface Props {
  visible: boolean;
  profiles: Profile[];
  activeProfileId: string | null;
  onSelect: (profileId: string) => void;
  onClose: () => void;
}

function profileInitials(firstName: string | null | undefined): string {
  const name = (firstName ?? '').trim();
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
}

export default function ProfileSwitcherSheet({
  visible,
  profiles,
  activeProfileId,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Tap-to-close area above the sheet */}
        <Pressable style={styles.backdropHit} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.screen }]}>
          {/* Drag handle */}
          <View style={styles.handle} />

          <Text style={styles.title}>Switch Player</Text>

          {profiles.map((p) => {
            const isActive = p.id === activeProfileId;
            const name = p.first_name ?? '—';
            const ageLabel = p.age != null ? `Age ${p.age}` : null;

            return (
              <Pressable
                key={p.id}
                style={({ pressed }) => [styles.profileRow, pressed && styles.rowPressed]}
                onPress={() => {
                  onSelect(p.id);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <AvatarCircle initials={profileInitials(p.first_name)} size={AVATAR_SIZE} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
                  {ageLabel ? <Text style={styles.rowAge}>{ageLabel}</Text> : null}
                </View>
                {isActive ? (
                  <Ionicons name="checkmark" size={CHECKMARK_SIZE} color={colors.text.gold} />
                ) : (
                  <View style={styles.checkmarkSpacer} />
                )}
              </Pressable>
            );
          })}

          <View style={styles.separator} />

          {/* Add Player — placeholder for next pass, not yet interactive */}
          <Pressable
            style={styles.profileRow}
            disabled
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
          >
            <View style={styles.addIconRing}>
              <Ionicons name="add" size={ADD_ICON_SIZE} color={colors.text.muted} />
            </View>
            <Text style={styles.addLabel}>Add Player</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.bg.modalOverlay,
  },
  backdropHit: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.card,
    paddingTop: spacing.cardSm,
    gap: spacing.iconGap,
  },
  handle: {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.border.dim,
    alignSelf: 'center',
  },
  title: {
    fontFamily: typography.body,
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
    paddingVertical: spacing.cardSm,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  rowAge: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    color: colors.text.muted,
  },
  checkmarkSpacer: {
    width: CHECKMARK_SIZE,
    height: CHECKMARK_SIZE,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.pillGap,
  },
  addIconRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.bg.base,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    color: colors.text.muted,
  },
});
