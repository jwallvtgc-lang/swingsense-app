import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { rootNavigationRef } from './rootNavigationRef';
import AuthScreen from '../screens/AuthScreen';
import AccountTypeScreen from '../screens/AccountTypeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SplashScreen from '../screens/SplashScreen';
import AnalyzeScreen from '../screens/AnalyzeScreen';
import UploadScreen from '../screens/UploadScreen';
import RecordingTipsScreen from '../screens/RecordingTipsScreen';
import CameraScreen from '../screens/CameraScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import ResultsScreen from '../screens/ResultsScreen';
import PersonalBestScreen from '../screens/PersonalBestScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import DrillDetailScreen from '../screens/DrillDetailScreen';
import DrillLibraryScreen from '../screens/DrillLibraryScreen';
import ManagePlanScreen from '../screens/ManagePlanScreen';

import type { AuthStackParamList, MainStackParamList, OnboardStackParamList, TabParamList } from './types';
import { colors } from '../../design-system/tokens';

const Stack = createNativeStackNavigator<MainStackParamList>();
const SplashAuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardStackParamList>();
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
      initialRouteName="Auth"
      screenOptions={{ headerShown: false }}
    >
      <SplashAuthStack.Screen name="Auth" component={AuthScreen} />
      <SplashAuthStack.Screen name="Splash" component={SplashScreen} />
      <SplashAuthStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <SplashAuthStack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
    </SplashAuthStack.Navigator>
  );
}

function OnboardingNavigator({ showAccountType }: { showAccountType: boolean }) {
  return (
    <OnboardingStack.Navigator
      initialRouteName={showAccountType ? 'AccountType' : 'Onboarding'}
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <OnboardingStack.Screen name="AccountType" component={AccountTypeScreen} />
      <OnboardingStack.Screen name="Onboarding" component={OnboardingScreen} />
    </OnboardingStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg.base },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Upload" component={UploadScreen} />
      <Stack.Screen name="RecordingTips" component={RecordingTipsScreen} />
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="Processing"
        component={ProcessingScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="PersonalBest" component={PersonalBestScreen} />
      <Stack.Screen name="Analysis" component={AnalysisScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <Stack.Screen name="DrillDetail" component={DrillDetailScreen} />
      <Stack.Screen name="DrillLibrary" component={DrillLibraryScreen} />
      <Stack.Screen name="ManagePlan" component={ManagePlanScreen} />
    </Stack.Navigator>
  );
}

/**
 * `session` from `useAuth()` is React state updated by `getSession` and
 * `onAuthStateChange` → `applyAuthSession` in `AuthContext`. Remounting these roots when
 * `session` / `hasProfile` change avoids staying stuck on Auth after sign-in.
 * Signed-in users without a profile still see onboarding before tabs.
 */
function SessionBranchNavigator() {
  const { session, user, hasProfile, profile, profileResolved } = useAuth();
  if (!session) {
    return <AuthNavigator />;
  }
  if (!profileResolved) {
    return <View style={{ flex: 1, backgroundColor: colors.bg.splashBase }} />;
  }
  if (hasProfile && profile?.onboarding_completed === true) {
    return <MainNavigator />;
  }
  // account_type is written to user_metadata when the user selects on AccountTypeScreen.
  // If it's absent AND there's no profile row, the user hasn't chosen yet → AccountTypeScreen.
  // If either is set (account_type OR a profile row exists), skip AccountTypeScreen.
  // This is purely durable state — survives kills, reloads, and Fast Refresh.
  const accountType = user?.user_metadata?.account_type as 'player' | 'parent' | undefined;
  const needsAccountType = !accountType && !hasProfile;
  return <OnboardingNavigator showAccountType={needsAccountType} />;
}

export default function AppNavigator() {
  const { loading } = useAuth();

  if (loading) {
    // Same edge color as native splash so there’s no black flash before the first screen
    return <View style={{ flex: 1, backgroundColor: colors.bg.splashBase }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={rootNavigationRef}>
        <SessionBranchNavigator />
      </NavigationContainer>
    </View>
  );
}
