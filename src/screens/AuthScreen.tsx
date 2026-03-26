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
} from 'react-native';
import { COLORS, FONTS } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headline}>
            {isSignUp ? 'Create' : 'Welcome'}{'\n'}
            <Text style={styles.headlineAccent}>{isSignUp ? 'Account' : 'Back'}</Text>
          </Text>
          <Text style={styles.subtext}>
            {isSignUp
              ? 'Sign up to start analyzing your swings'
              : 'Sign in to continue'}
          </Text>
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

          <Pressable
            style={styles.switchLink}
            onPress={() => setMode(isSignUp ? 'signin' : 'signup')}
          >
            <Text style={styles.switchLinkText}>
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  header: {
    marginBottom: 32,
  },
  headline: {
    fontFamily: FONTS.heading,
    fontSize: 48,
    color: COLORS.text,
    letterSpacing: 1,
    lineHeight: 48,
    marginBottom: 10,
  },
  headlineAccent: {
    color: COLORS.accent,
  },
  subtext: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    lineHeight: 20,
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
  switchLink: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  switchLinkText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
});
