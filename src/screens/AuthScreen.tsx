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
import Svg, { Path } from 'react-native-svg';

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
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error('No ID token returned from Google');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) alertAuthError(new Error(error.message), true);
    } catch (e: any) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (e.code === statusCodes.IN_PROGRESS) return;
      Alert.alert('Google Sign In Error', e.message ?? 'Something went wrong');
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
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <Path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <Path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <Path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </Svg>
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
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
    backgroundColor: '#ffffff',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: {
    fontFamily: typography.body,
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
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
