import { Image, StyleSheet, Text, View } from 'react-native';

import { avatar, colors, typography } from '../../design-system/tokens';

export type AvatarCircleProps = {
  initials: string;
  size?: number;
  imageUri?: string;
};

export default function AvatarCircle({
  initials,
  size = avatar.size,
  imageUri,
}: AvatarCircleProps) {
  const r = size / 2;
  const showImage = imageUri != null && imageUri.length > 0;

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: r,
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          accessibilityLabel="Profile photo"
        />
      ) : (
        <Text style={[styles.initials, { fontSize: avatar.fontSize }]} maxFontSizeMultiplier={1.35}>
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: avatar.ringWidth,
    borderColor: colors.text.gold,
    backgroundColor: colors.bg.goldDim,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: typography.display,
    color: colors.text.gold,
    textAlign: 'center',
  },
});
