import { Image, StyleSheet, View } from 'react-native';

import { colors, logoTile, radius } from '../../design-system/tokens';

export type LogoTileProps = {
  size?: 'lg' | 'md';
};

const ICON_SOURCE = require('../../assets/icon.png');

export default function LogoTile({ size = 'lg' }: LogoTileProps) {
  const isLg = size === 'lg';
  const dim = isLg ? logoTile.sizeLg : logoTile.sizeMd;
  const corner = isLg ? radius.logo : radius.logoMd;
  const imgSize = Math.round(dim * 0.8);

  return (
    <View style={[styles.tile, { width: dim, height: dim, borderRadius: corner }]}>
      <Image
        source={ICON_SOURCE}
        style={{ width: imgSize, height: imgSize }}
        resizeMode="contain"
        accessibilityLabel="SwingSense"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.bg.logoTile,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
