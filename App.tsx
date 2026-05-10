import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import { Righteous_400Regular } from '@expo-google-fonts/righteous';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { logConfig } from './src/config/constants';
import { SPLASH_MIN_MS, SPLASH_T0_MS } from './src/splashClock';

SplashScreen.preventAutoHideAsync();
logConfig();

export default function App() {
  const [nativeSplashDone, setNativeSplashDone] = useState(false);
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Righteous_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Expo hides the native splash as soon as any React view hierarchy mounts (see expo-splash-screen
  // README). So: keep returning null until fonts are ready AND we've called hideAsync after a
  // minimum display time. Do NOT mount SafeAreaProvider before then — that was replacing the PNG.

  useEffect(() => {
    if (!fontsLoaded) return;

    const elapsed = Date.now() - SPLASH_T0_MS;
    const waitMs = Math.max(0, SPLASH_MIN_MS - elapsed);
    let cancelled = false;

    const t = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('[App] SplashScreen.hideAsync:', e);
      } finally {
        if (!cancelled) setNativeSplashDone(true);
      }
    }, waitMs);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [fontsLoaded]);

  if (!fontsLoaded || !nativeSplashDone) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
