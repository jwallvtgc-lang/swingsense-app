import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, FONTS } from '../config/constants';

interface FilmingInstructionsModalProps {
  visible: boolean;
  onStartRecording: () => void;
  onClose: () => void;
}

const INSTRUCTIONS = [
  {
    icon: 'camera-outline' as const,
    text: 'Film from the side',
  },
  {
    icon: 'body-outline' as const,
    text: 'Back up until your full body is visible head to toe',
  },
  {
    icon: 'baseball-outline' as const,
    text: 'Take a full swing',
  },
];

export default function FilmingInstructionsModal({
  visible,
  onStartRecording,
  onClose,
}: FilmingInstructionsModalProps) {
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
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </Pressable>
          </View>

          <View style={styles.instructions}>
            {INSTRUCTIONS.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <View style={styles.instructionIcon}>
                  <Ionicons
                    name={instruction.icon}
                    size={24}
                    color={COLORS.accent}
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
            <Ionicons name="videocam" size={20} color={COLORS.black} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  instructions: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  instructionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.body,
    color: COLORS.text,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  startButtonPressed: {
    opacity: 0.9,
  },
  startButtonText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.black,
    letterSpacing: 0.3,
  },
});