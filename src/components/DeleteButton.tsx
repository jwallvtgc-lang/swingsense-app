import { Alert, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../design-system/tokens';

const SIZE = 20;

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export type DeleteButtonProps = {
  onConfirm: () => void;
};

export default function DeleteButton({ onConfirm }: DeleteButtonProps) {
  const openAlert = () => {
    Alert.alert('Delete swing?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onConfirm(),
      },
    ]);
  };

  return (
    <Pressable
      onPress={openAlert}
      hitSlop={12}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
      accessibilityLabel="Delete swing"
      accessibilityRole="button"
    >
      <TrashIcon color={colors.text.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    padding: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
