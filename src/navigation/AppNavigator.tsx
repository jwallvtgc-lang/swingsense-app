import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';

import { useAuth } from '../contexts/AuthContext';
import { rootNavigationRef } from './rootNavigationRef';
import { COLORS, SPLASH_BACKGROUND } from '../config/constants';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SplashScreen from '../screens/SplashScreen';
import AnalyzeScreen from '../screens/AnalyzeScreen';
import UploadScreen from '../screens/UploadScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import ResultsScreen from '../screens/ResultsScreen';
import PersonalBestScreen from '../screens/PersonalBestScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

import type { AuthStackParamList, MainStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();
const SplashAuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<{ Onboarding: undefined }>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen name="UploadTab" component={AnalyzeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <SplashAuthStack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      <SplashAuthStack.Screen name="Splash" component={SplashScreen} />
      <SplashAuthStack.Screen name="Auth" component={AuthScreen} />
    </SplashAuthStack.Navigator>
  );
}

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Onboarding" component={OnboardingScreen} />
    </OnboardingStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Upload" component={UploadScreen} />
      <Stack.Screen
        name="Processing"
        component={ProcessingScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="PersonalBest" component={PersonalBestScreen} />
      <Stack.Screen name="Analysis" component={AnalysisScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
}

const SPLASH_MIN_MS = 1800; // Show native splash at least 1.8s

/**
 * `session` from `useAuth()` is React state updated by `getSession` and
 * `onAuthStateChange` → `applyAuthSession` in `AuthContext`. Remounting these roots when
 * `session` / `hasProfile` change avoids staying stuck on Auth after sign-in.
 * Signed-in users without a profile still see onboarding before tabs.
 */
function SessionBranchNavigator() {
  const { session, hasProfile, profileResolved } = useAuth();
  if (!session) {
    return <AuthNavigator />;
  }
  if (!profileResolved) {
    return <View style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND }} />;
  }
  if (!hasProfile) {
    return <OnboardingNavigator />;
  }
  return <MainNavigator />;
}

export default function AppNavigator() {
  const { loading } = useAuth();
  const appStartTime = useRef(Date.now());

  useEffect(() => {
    if (loading) return;
    const elapsed = Date.now() - appStartTime.current;
    const waitMs = Math.max(0, SPLASH_MIN_MS - elapsed);
    const t = setTimeout(async () => {
      try {
        await ExpoSplashScreen.hideAsync();
        console.log('[AppNavigator] Splash hidden');
      } catch (e) {
        console.warn('[AppNavigator] Splash hide error:', e);
      }
    }, waitMs);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    // Same edge color as native splash so there’s no black flash before the first screen
    return <View style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={rootNavigationRef}>
        <SessionBranchNavigator />
      </NavigationContainer>
    </View>
  );
}
