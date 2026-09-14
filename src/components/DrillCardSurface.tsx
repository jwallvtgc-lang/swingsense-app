import type { ReactNode } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors } from '../../design-system/tokens';

interface DrillCardSurfaceProps {
  /** Video-frame thumbnail URL. When absent, renders a plain View — the card's
   * existing backgroundColor shows through, matching pre-thumbnail appearance. */
  thumbnailUrl?: string;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}

export default function DrillCardSurface({ thumbnailUrl, style, children }: DrillCardSurfaceProps) {
  if (!thumbnailUrl) {
    return <View style={style}>{children}</View>;
  }

  return (
    <ImageBackground source={{ uri: thumbnailUrl }} style={style}>
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.bg.thumbnailOverlay,
  },
});
