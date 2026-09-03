import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

interface AiConsentModalProps {
  visible: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

export default function AiConsentModal({
  visible,
  onAgree,
  onDecline,
}: AiConsentModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={24} color={colors.text.gold} />
          </View>

          <Text style={styles.title}>Before Your First Analysis</Text>

          <Text style={styles.body}>
            Your swing videos are analyzed by Anthropic's Claude AI to generate your personalized coaching feedback. Your video is sent securely for this purpose only.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.agreeButton,
              pressed && styles.agreeButtonPressed,
            ]}
            onPress={onAgree}
          >
            <Text style={styles.agreeButtonText}>I Understand and Agree</Text>
          </Pressable>

          <Pressable onPress={onDecline} style={styles.declineButton}>
            <Text style={styles.declineButtonText}>Not Now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.modalOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screen,
  },
  modal: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    padding: spacing.card,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.badge,
    backgroundColor: colors.bg.goldDim,
    borderWidth: 1,
    borderColor: colors.text.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.cardGap,
  },
  title: {
    fontSize: fontSizes.sectionTitle,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.iconGap,
  },
  body: {
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: Math.round(fontSizes.body * 1.5),
    marginBottom: spacing.sectionGap,
  },
  agreeButton: {
    backgroundColor: colors.bg.gold,
    borderRadius: radius.card,
    padding: spacing.card,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.bg.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  agreeButtonPressed: {
    opacity: 0.9,
  },
  agreeButtonText: {
    fontSize: fontSizes.ctaLabel,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.onGold,
  },
  declineButton: {
    marginTop: spacing.cardGap,
    padding: spacing.iconGap,
  },
  declineButtonText: {
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    color: colors.text.muted,
  },
});
