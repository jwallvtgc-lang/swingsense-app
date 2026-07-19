import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DrillCard } from '../types/drill';
import type { DrillMechanic } from '../types/drill';
import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';


const MECHANIC_LABELS: Record<DrillMechanic, string> = {
  stance: 'Stance',
  load: 'Load',
  power_position: 'Power Position',
  slot: 'Slot',
  balance_at_contact: 'Balance at Contact',
};

interface DrillDetailModalProps {
  drill: DrillCard | null;
  visible: boolean;
  onClose: () => void;
}

export default function DrillDetailModal({
  drill,
  visible,
  onClose,
}: DrillDetailModalProps) {
  if (!drill) return null;

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
            <View style={styles.headerLeft}>
              <View style={[styles.mechanicBadge, { backgroundColor: drill.mechanic ? colors.mechanic[drill.mechanic] : colors.bg.surface }]}>
                <Text style={styles.mechanicText}>{drill.mechanic ? MECHANIC_LABELS[drill.mechanic] : ''}</Text>
              </View>
              <Text style={styles.level}>{drill.experience_level}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.muted} />
            </Pressable>
          </View>

          <Text style={styles.title}>{drill.title}</Text>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Why It Helps</Text>
              <Text style={styles.sectionText}>{drill.whyItHelps}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Setup</Text>
              <Text style={styles.sectionText}>{drill.setup}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Steps</Text>
              {drill.steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reps</Text>
              <View style={styles.successCue}>
                <Ionicons name="checkmark-circle" size={20} color={colors.text.green} />
                <Text style={styles.successText}>{drill.reps}</Text>
              </View>
            </View>
          </ScrollView>
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
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.card,
    paddingBottom: spacing.iconGap,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerLeft: {
    flex: 1,
    gap: spacing.pillGap,
  },
  mechanicBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.pillGap,
    paddingVertical: 2,
    borderRadius: radius.badge,
  },
  mechanicText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  level: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.tight,
  },
  closeButton: {
    padding: spacing.iconGap,
    marginTop: -spacing.iconGap,
    marginRight: -spacing.iconGap,
  },
  title: {
    fontSize: fontSizes.sectionTitle,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    paddingHorizontal: spacing.card,
    paddingBottom: spacing.iconGap,
    lineHeight: Math.round(fontSizes.sectionTitle * 1.3),
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.card,
  },
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionTitle: {
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    marginBottom: spacing.iconGap,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.tight,
  },
  sectionText: {
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.body * 1.4),
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.iconGap,
    marginBottom: spacing.iconGap,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bg.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: fontSizes.caption,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.onGold,
  },
  stepText: {
    flex: 1,
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.body * 1.4),
  },
  successCue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.iconGap,
    padding: spacing.cardSm,
    backgroundColor: colors.bg.greenDim,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.bg.greenRing,
  },
  successText: {
    flex: 1,
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    color: colors.text.green,
    fontWeight: fontWeights.medium,
    lineHeight: Math.round(fontSizes.body * 1.4),
  },
});