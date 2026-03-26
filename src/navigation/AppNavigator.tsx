import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../config/constants';

import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import UploadScreen from '../screens/UploadScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import ResultsScreen from '../screens/ResultsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

import type { MainStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 72,
          paddingHorizontal: 28,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tab.Screen
        name="UploadTab"
        component={UploadScreen}
        options={{
          tabBarLabel: 'Analyze',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="baseball" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Auth" component={AuthScreen} />
    </AuthStack.Navigator>
  );
}

function OnboardingNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
    </AuthStack.Navigator>
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
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
}

const SPLASH_MIN_MS = 1800; // Show native splash at least 1.8s

export default function AppNavigator() {
  const { session, loading, hasProfile } = useAuth();
  const appStartTime = useRef(Date.now());

  useEffect(() => {
    if (loading) return;
    const elapsed = Date.now() - appStartTime.current;
    const waitMs = Math.max(0, SPLASH_MIN_MS - elapsed);
    const t = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
        console.log('[AppNavigator] Splash hidden');
      } catch (e) {
        console.warn('[AppNavigator] Splash hide error:', e);
      }
    }, waitMs);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        {!session ? (
          <AuthNavigator />
        ) : !hasProfile ? (
          <OnboardingNavigator />
        ) : (
          <MainNavigator />
        )}
      </NavigationContainer>
    </View>
  );
}
