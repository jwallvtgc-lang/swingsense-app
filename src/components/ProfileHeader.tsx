import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, spacing } from '../../design-system/tokens';
import AvatarCircle from './AvatarCircle';

const FONT_DISPLAY = 'BebasNeue_400Regular';
const FONT_BODY = 'Inter_400Regular';

export type ProfileHeaderProps = {
  name: string;
  email: string;
  initials: string;
};

export default function ProfileHeader({ name, email, initials }: ProfileHeaderProps) {
  return (
    <View style={styles.root}>
      <AvatarCircle initials={initials} />
      <Text style={styles.name} maxFontSizeMultiplier={1.35}>
        {name}
      </Text>
      <Text style={styles.email} maxFontSizeMultiplier={1.35}>
        {email}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.iconGap,
  },
  name: {
    fontFamily: FONT_DISPLAY,
    fontSize: fontSizes.screenTitle,
    color: colors.text.primary,
    textAlign: 'center',
  },
  email: {
    fontFamily: FONT_BODY,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
