import React, { useCallback, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPLASH_BACKGROUND } from '../config/constants';

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
          borderTopColor: COLORS.surfaceBorder,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
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

const SPLASH_MIN_MS = 1800; // Show splash at least 1.8s so user sees the logo
const SPLASH_ICON_SIZE = 320; // Main focus – branded graphic (icon + SwingSense)

function AnimatedSplashView({ onLayout }: { onLayout?: () => void }) {
  const translateX = useRef(new Animated.Value(-150)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  const animRef = useRef<{ sweep?: Animated.CompositeAnimation; pulse?: Animated.CompositeAnimation }>({});

  useEffect(() => {
    // Delay sweep until native splash typically hides (~1.8s) so user sees the animation
    const t = setTimeout(() => {
      const sweep = Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]);
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.05, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      animRef.current = { sweep, pulse };
      sweep.start(() => pulse.start());
    }, SPLASH_MIN_MS);
    return () => {
      clearTimeout(t);
      animRef.current.sweep?.stop();
      animRef.current.pulse?.stop();
    };
  }, [translateX, scale, pulseScale]);

  return (
    <View style={splashStyles.container} onLayout={onLayout}>
      <Animated.View
        style={[
          splashStyles.iconWrap,
          {
            transform: [
              { translateX },
              { scale: Animated.multiply(scale, pulseScale) },
            ],
          },
        ]}
      >
        <Image
          source={require('../../assets/splash-icon.png')}
          style={[splashStyles.icon, { width: SPLASH_ICON_SIZE, aspectRatio: 512 / 640 }]}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={splashStyles.tagline}>AI-Powered Swing Coaching</Text>
      <ActivityIndicator size="small" color={COLORS.accent} style={splashStyles.spinner} />
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  iconWrap: {
    marginBottom: 8,
  },
  icon: {
    width: SPLASH_ICON_SIZE,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  spinner: {
    marginTop: 24,
  },
});

export default function AppNavigator() {
  const { session, loading, hasProfile } = useAuth();
  const appStartTime = useRef(Date.now());

  const onLayoutReady = useCallback(async () => {
    const elapsed = Date.now() - appStartTime.current;
    const waitMs = Math.max(0, SPLASH_MIN_MS - elapsed);
    if (waitMs > 0) {
      await new Promise((r) => setTimeout(r, waitMs));
    }
    try {
      await SplashScreen.hideAsync();
      console.log('[AppNavigator] Splash hidden');
    } catch (e) {
      console.warn('[AppNavigator] Splash hide error:', e);
    }
  }, []);

  if (loading) {
    console.log('[AppNavigator] Loading auth...');
    return <AnimatedSplashView onLayout={onLayoutReady} />;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutReady}>
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
