import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPLASH_BACKGROUND, SPLASH_TINT_TOP } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    const action = mode === 'signup' ? signUp : signIn;
    const { error } = await action(email.trim(), password);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  const isSignUp = mode === 'signup';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.tintTop} pointerEvents="none" />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.brandMark}
            resizeMode="contain"
          />
          <Text style={styles.wordmark} accessibilityRole="header">
            <Text style={styles.wordmarkSwing}>Swing</Text>
            <Text style={styles.wordmarkSense}>Sense</Text>
          </Text>
          <Text style={styles.valueProp}>AI feedback for your swing</Text>
        </View>

        <View style={styles.segment}>
          <Pressable
            style={({ pressed }) => [
              styles.segmentHalf,
              mode === 'signin' && styles.segmentHalfActive,
              pressed && styles.segmentPressed,
            ]}
            onPress={() => setMode('signin')}
          >
            <Text
              style={[
                styles.segmentLabel,
                mode === 'signin' && styles.segmentLabelActive,
              ]}
            >
              Sign In
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.segmentHalf,
              mode === 'signup' && styles.segmentHalfActive,
              pressed && styles.segmentPressed,
            ]}
            onPress={() => setMode('signup')}
          >
            <Text
              style={[
                styles.segmentLabel,
                mode === 'signup' && styles.segmentLabelActive,
              ]}
            >
              Sign Up
            </Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {isSignUp && (
            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              loading && styles.buttonDisabled,
              pressed && !loading && styles.buttonPressed,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.black} />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Create account' : 'Sign In'}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
  },
  container: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
  },
  tintTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: SPLASH_TINT_TOP,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandMark: {
    width: 72,
    height: 72,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  wordmark: {
    fontFamily: FONTS.heading,
    fontSize: 44,
    letterSpacing: 1,
    lineHeight: 48,
    marginBottom: 10,
  },
  wordmarkSwing: {
    color: COLORS.text,
  },
  wordmarkSense: {
    color: COLORS.accent,
  },
  valueProp: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  segment: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    padding: 4,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentHalf: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 11,
  },
  segmentHalfActive: {
    backgroundColor: COLORS.surfaceHover,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
  },
  segmentPressed: {
    opacity: 0.9,
  },
  segmentLabel: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
  },
  segmentLabelActive: {
    color: COLORS.text,
  },
  form: {
    gap: 12,
  },
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.black,
    letterSpacing: 0.3,
  },
});
