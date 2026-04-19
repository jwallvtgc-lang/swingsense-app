import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoTile from '../components/LogoTile';
import PrimaryButton from '../components/PrimaryButton';
import TabSwitcher from '../components/TabSwitcher';
import TextInput from '../components/TextInput';
import Wordmark from '../components/Wordmark';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  colors,
  displayTitleProps,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

const TAB_SIGN_IN = 'Sign In';
const TAB_SIGN_UP = 'Sign Up';

function alertAuthError(error: Error, isSignIn: boolean) {
  const msg = error.message ?? '';
  const invalidCreds =
    /invalid login credentials/i.test(msg) ||
    /invalid email or password/i.test(msg);

  if (isSignIn && invalidCreds) {
    Alert.alert(
      'Sign in failed',
      'That email and password did not work.\n\n' +
        '• Check the password and Caps Lock.\n' +
        '• If you just signed up, open the confirmation email and verify your address first—Supabase blocks sign-in until then.\n' +
        '• If you do not have an account yet, use Sign Up.'
    );
    return;
  }

  Alert.alert('Error', msg);
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, signIn } = useAuth();
  const [activeTab, setActiveTab] = useState(TAB_SIGN_IN);
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignIn = activeTab === TAB_SIGN_IN;

  useEffect(() => {
    GoogleSignin.configure({
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    });
  }, []);

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        Alert.alert('Apple Sign In', 'Could not get identity token from Apple.');
        return;
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) {
        alertAuthError(new Error(error.message), true);
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign In Error', err.message ?? 'Something went wrong');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return;
      const idToken = response.data.idToken;
      if (!idToken) throw new Error('No ID token returned from Google');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) alertAuthError(new Error(error.message), true);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (err.code === statusCodes.IN_PROGRESS) return;
      Alert.alert('Google Sign In Error', err.message ?? 'Something went wrong');
    }
  };

  const handleSubmit = async () => {
    if (!emailValue.trim() || !passwordValue.trim()) {
      Alert.alert('Missing fields', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      const action = isSignIn ? signIn : signUp;
      const emailTrimmed = emailValue.trim();
      if (isSignIn) {
        console.log(
          `email: ${emailTrimmed}, password length: ${passwordValue.length}`
        );
      }
      const { error, session: newSession } = await action(
        emailTrimmed,
        passwordValue
      );

      if (error) {
        alertAuthError(error, isSignIn);
        return;
      }

      if (newSession) {
        // Session is applied in AuthContext via onAuthStateChange; RootBranchStack remounts
        // (key from session/hasProfile) → MainStack (tabs) or OnboardStack as appropriate.
        return;
      }

      if (!isSignIn) {
        Alert.alert(
          'Check your email',
          'We sent a confirmation link. Verify your email, then sign in.'
        );
      } else {
        Alert.alert(
          'Could not sign in',
          'No session was returned. Confirm your email in Supabase if required, or try again.'
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[AuthScreen] handleSubmit error:', e);
      Alert.alert('Something went wrong', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[
          colors.bg.authGradientTop,
          colors.bg.authGradientBottom,
          colors.bg.authGradientBottom,
        ]}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + spacing.sectionGap,
              paddingBottom: insets.bottom + spacing.sectionGap,
              paddingHorizontal: spacing.screen,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            <LogoTile size="md" />
            <View style={styles.afterLogo}>
              <Wordmark
                size="md"
                tagline="AI Feedback for your swing"
                titleTextProps={displayTitleProps}
              />
            </View>
            <View style={styles.socialButtons}>
              {Platform.OS === 'ios' ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={radius.card}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              ) : null}
              <Pressable style={styles.googleButton} onPress={handleGoogleSignIn}>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </Pressable>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
            <View style={styles.afterWordmark}>
              <TabSwitcher
                tabs={[TAB_SIGN_IN, TAB_SIGN_UP]}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
            </View>
            <View style={styles.form}>
              <TextInput
                type="email"
                placeholder="Email"
                value={emailValue}
                onChangeText={(text) => setEmailValue(text)}
              />
              <TextInput
                type="password"
                placeholder="Password"
                value={passwordValue}
                onChangeText={(text) => setPasswordValue(text)}
              />
              <View style={styles.afterInputs}>
                <PrimaryButton
                  label={isSignIn ? TAB_SIGN_IN : TAB_SIGN_UP}
                  onPress={handleSubmit}
                  loading={loading}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  column: {
    alignSelf: 'stretch',
    alignItems: 'center',
    width: '100%',
  },
  afterLogo: {
    marginTop: spacing.sectionGap,
    alignItems: 'center',
  },
  afterWordmark: {
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
  },
  socialButtons: {
    width: '100%',
    gap: spacing.cardGap,
    marginBottom: spacing.cardGap,
    alignSelf: 'stretch',
    marginTop: spacing.sectionGap,
  },
  appleButton: {
    width: '100%',
    height: 52,
  },
  googleButton: {
    width: '100%',
    height: 52,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.primary,
    fontWeight: fontWeights.medium,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
    marginVertical: spacing.cardGap,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  dividerText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
  },
  form: {
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
    gap: spacing.inputGap,
  },
  afterInputs: {
    marginTop: spacing.cardGap,
    alignSelf: 'stretch',
  },
});
