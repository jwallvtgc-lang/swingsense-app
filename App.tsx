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
import BrandedSplash from './src/components/BrandedSplash';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { logConfig } from './src/config/constants';
import { SPLASH_MIN_MS, SPLASH_T0_MS } from './src/splashClock';

SplashScreen.preventAutoHideAsync();
logConfig();

export default function App() {
  const [nativeSplashDone, setNativeSplashDone] = useState(false);
  const [brandedSplashDone, setBrandedSplashDone] = useState(false);
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

  // Hide native splash immediately so animated splash takes over as quickly as possible
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await SplashScreen.hideAsync();
        console.log('[App] native splash hidden immediately');
      } catch (e) {
        console.warn('[App] SplashScreen.hideAsync:', e);
      } finally {
        if (!cancelled) setNativeSplashDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!nativeSplashDone) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        {!brandedSplashDone ? (
          <BrandedSplash
            onComplete={() => {
              console.log('[App] branded splash done — mounting AppNavigator');
              setBrandedSplashDone(true);
            }}
          />
        ) : (
          <>
            <StatusBar style="light" />
            <AppNavigator />
          </>
        )}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
