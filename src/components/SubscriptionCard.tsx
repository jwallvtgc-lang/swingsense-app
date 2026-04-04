import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing } from '../../design-system/tokens';
import DataRow from './DataRow';
import PrimaryButton from './PrimaryButton';
import SectionCard from './SectionCard';

export type SubscriptionCardProps = {
  /** `null` while loading; show digit string including `"0"` when loaded. */
  analysesThisMonth?: number | null;
};

function showProPlaceholderAlert() {
  Alert.alert(
    'SwingSense Pro',
    'Pro features are coming soon — unlimited analyses, advanced metrics, and more. Stay tuned.',
    [{ text: 'Got it' }]
  );
}

export default function SubscriptionCard({
  analysesThisMonth = null,
}: SubscriptionCardProps) {
  const analysesLabel =
    analysesThisMonth === null ? '—' : String(analysesThisMonth);

  return (
    <SectionCard title="Subscription">
      <DataRow label="Plan" value="Free" />
      <DataRow label="Analyses this month" value={analysesLabel} last />
      <View style={styles.cta}>
        <PrimaryButton
          label="Upgrade to Pro"
          onPress={showProPlaceholderAlert}
          icon={<Ionicons name="star" size={18} color={colors.text.onGold} />}
        />
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  cta: {
    marginTop: spacing.cardGap,
    alignSelf: 'stretch',
  },
});
