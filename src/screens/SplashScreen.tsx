import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import LogoTile from '../components/LogoTile';
import Wordmark from '../components/Wordmark';
import type { AuthStackParamList } from '../navigation/types';
import { animation } from '../../design-system/tokens';

/** Pure black splash background (spec: #000). */
const SPLASH_BLACK = '#000000';

export default function SplashScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Splash'>>();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: animation.fadeUpDuration,
      useNativeDriver: true,
    }).start();

    const t = setTimeout(() => {
      navigation.replace('Auth');
    }, animation.splashHold);
    return () => clearTimeout(t);
  }, [navigation, opacity]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.brand, { opacity }]}>
        <LogoTile size="lg" />
        <Wordmark size="lg" tagline="Baseball Analytics" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_BLACK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: {
    alignItems: 'center',
    gap: 20,
  },
});
