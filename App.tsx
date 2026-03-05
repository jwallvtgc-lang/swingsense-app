import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { logConfig } from './src/config/constants';

SplashScreen.preventAutoHideAsync();
logConfig();

const SPLASH_MAX_MS = 3000;

export default function App() {
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
        console.log('[App] Forced splash hide after 3s timeout');
      } catch (e) {
        console.warn('[App] Splash hide failed:', e);
      }
    }, SPLASH_MAX_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}
