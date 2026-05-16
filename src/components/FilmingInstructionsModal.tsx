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
  letterSpacing,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

interface FilmingInstructionsModalProps {
  visible: boolean;
  cameraType: 'front' | 'back';
  onCameraTypeChange: (type: 'front' | 'back') => void;
  onStartRecording: () => void;
  onClose: () => void;
}

const INSTRUCTIONS = [
  {
    icon: 'camera-outline' as const,
    text: 'Prop your phone against something stable',
  },
  {
    icon: 'body-outline' as const,
    text: 'Step back until your full body is visible',
  },
  {
    icon: 'baseball-outline' as const,
    text: 'Take a full swing when ready',
  },
];

export default function FilmingInstructionsModal({
  visible,
  cameraType,
  onCameraTypeChange,
  onStartRecording,
  onClose,
}: FilmingInstructionsModalProps) {
  console.log(`[FilmingInstructionsModal] Rendered with visible=${visible}`);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Recording Tips</Text>
            <View style={styles.headerControls}>
              <Pressable onPress={() => onCameraTypeChange(cameraType === 'front' ? 'back' : 'front')} style={styles.flipButton}>
                <Ionicons name="camera-reverse-outline" size={20} color={colors.text.primary} />
              </Pressable>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text.muted} />
              </Pressable>
            </View>
          </View>

          <Text style={styles.cameraTypeText}>
            Recording with {cameraType === 'front' ? 'Front' : 'Back'} Camera
          </Text>

          <View style={styles.instructions}>
            {INSTRUCTIONS.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <View style={styles.instructionIcon}>
                  <Ionicons
                    name={instruction.icon}
                    size={24}
                    color={colors.text.gold}
                  />
                </View>
                <Text style={styles.instructionText}>
                  {instruction.text}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.startButton,
              pressed && styles.startButtonPressed,
            ]}
            onPress={onStartRecording}
          >
            <Ionicons name="videocam" size={20} color={colors.text.onGold} />
            <Text style={styles.startButtonText}>Got it, Start Recording</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.authGradientBottom,
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.cardGap,
  },
  title: {
    fontSize: fontSizes.sectionTitle,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
  },
  flipButton: {
    padding: spacing.iconGap,
    borderRadius: radius.badge,
    backgroundColor: colors.bg.goldDim,
    borderWidth: 1,
    borderColor: colors.text.gold,
  },
  closeButton: {
    padding: spacing.iconGap,
  },
  cameraTypeText: {
    fontSize: fontSizes.caption,
    fontFamily: typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.cardGap,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.tight,
  },
  instructions: {
    gap: spacing.cardGap,
    marginBottom: spacing.sectionGap,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.cardGap,
  },
  instructionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.badge,
    backgroundColor: colors.bg.goldDim,
    borderWidth: 1,
    borderColor: colors.text.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    flex: 1,
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    color: colors.text.primary,
    lineHeight: Math.round(fontSizes.body * 1.4),
  },
  startButton: {
    backgroundColor: colors.bg.gold,
    borderRadius: radius.card,
    padding: spacing.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.iconGap,
    shadowColor: colors.bg.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  startButtonPressed: {
    opacity: 0.9,
  },
  startButtonText: {
    fontSize: fontSizes.ctaLabel,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.onGold,
    letterSpacing: letterSpacing.cta,
  },
});