import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import PrimaryButton from '../components/PrimaryButton';
import TextInput from '../components/TextInput';
import Wordmark from '../components/Wordmark';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AuthStackParamList } from '../navigation/types';
import {
  colors,
  displayTitleProps,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

const OAUTH_ICON_SIZE = 18;

/** Reserve bottom inset for scroll content so it clears the pinned terms footer. */
const TERMS_FOOTER_RESERVE = 88;

/** 18×18 mail icon (matches Google / system icon column width). */
function EmailIcon18({ color }: { color: string }) {
  return (
    <Svg width={OAUTH_ICON_SIZE} height={OAUTH_ICON_SIZE} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
      />
    </Svg>
  );
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateExpand() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

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
        '• If you do not have an account yet, create one below.'
    );
    return;
  }

  Alert.alert('Error', msg);
}

type EmailFormMode = 'none' | 'login' | 'signup';

export default function AuthScreen() {
  const isExpoGo = typeof __DEV__ !== 'undefined' && __DEV__;
  const GoogleSignin = !isExpoGo
    ? require('@react-native-google-signin/google-signin').GoogleSignin
    : null;
  const statusCodes = !isExpoGo
    ? require('@react-native-google-signin/google-signin').statusCodes
    : {};

  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Auth'>>();
  const insets = useSafeAreaInsets();
  const { signUp, signIn } = useAuth();

  const [emailFormMode, setEmailFormMode] = useState<EmailFormMode>('none');
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!GoogleSignin) return;
    GoogleSignin.configure({
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    });
  }, []);

  const openLoginForm = () => {
    animateExpand();
    setEmailFormMode((m) => {
      if (m === 'login') return 'none';
      return 'login';
    });
    setConfirmPasswordValue('');
  };

  const openSignupForm = () => {
    animateExpand();
    setEmailFormMode((m) => {
      if (m === 'signup') return 'none';
      return 'signup';
    });
  };

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
    if (!GoogleSignin) {
      Alert.alert('Not available', 'Please use a TestFlight build to sign in with Google.');
      return;
    }
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

  const handleEmailSignIn = async () => {
    if (!emailValue.trim() || !passwordValue.trim()) {
      Alert.alert('Missing fields', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      const emailTrimmed = emailValue.trim();
      const { error, session: newSession } = await signIn(emailTrimmed, passwordValue);

      if (error) {
        alertAuthError(error, true);
        return;
      }

      if (newSession) {
        return;
      }

      Alert.alert(
        'Could not sign in',
        'No session was returned. Confirm your email in Supabase if required, or try again.'
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[AuthScreen] handleEmailSignIn error:', e);
      Alert.alert('Something went wrong', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!emailValue.trim() || !passwordValue.trim() || !confirmPasswordValue.trim()) {
      Alert.alert('Missing fields', 'Please fill in email, password, and confirm password.');
      return;
    }
    if (passwordValue !== confirmPasswordValue) {
      Alert.alert('Passwords do not match', 'Make sure both password fields match.');
      return;
    }
    setLoading(true);
    try {
      const emailTrimmed = emailValue.trim();
      const { error, session: newSession } = await signUp(emailTrimmed, passwordValue);

      if (error) {
        alertAuthError(error, false);
        return;
      }

      if (newSession) {
        return;
      }

      Alert.alert(
        'Check your email',
        'We sent a confirmation link. Verify your email, then sign in.'
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[AuthScreen] handleEmailSignUp error:', e);
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
        <View style={styles.screenInner}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + spacing.sectionGap * 2,
                paddingBottom:
                  insets.bottom + TERMS_FOOTER_RESERVE + spacing.sectionGap * 2,
                paddingHorizontal: spacing.screen,
                minHeight:
                  Dimensions.get('window').height -
                  insets.top -
                  insets.bottom -
                  TERMS_FOOTER_RESERVE,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.mainColumn}>
              <View style={styles.wordmarkSection}>
                <Wordmark
                  size="md"
                  tagline="AI Feedback for your swing"
                  titleTextProps={displayTitleProps}
                />
              </View>

              <View style={styles.authMiddle}>
                <View style={styles.methodStack}>
                  {Platform.OS === 'ios' ? (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                      cornerRadius={radius.card}
                      style={styles.appleButton}
                      onPress={handleAppleSignIn}
                    />
                  ) : null}

                  <Pressable
                    style={({ pressed }) => [
                      styles.googleButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleGoogleSignIn}
                  >
                    <View style={styles.oauthIconSlot}>
                      <Svg
                        width={OAUTH_ICON_SIZE}
                        height={OAUTH_ICON_SIZE}
                        viewBox="0 0 24 24"
                      >
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
                    </View>
                    <Text style={styles.oauthMethodLabel}>Continue with Google</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.emailOutlineButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={openLoginForm}
                  >
                    <View style={styles.oauthIconSlot}>
                      <EmailIcon18 color={colors.text.primary} />
                    </View>
                    <Text style={[styles.oauthMethodLabel, styles.oauthMethodLabelEmail]}>
                      Log in with Email
                    </Text>
                  </Pressable>
                </View>

                {emailFormMode === 'login' ? (
                  <View style={styles.inlineForm}>
                    <TextInput
                      type="email"
                      placeholder="Email"
                      value={emailValue}
                      onChangeText={setEmailValue}
                    />
                    <TextInput
                      type="password"
                      placeholder="Password"
                      value={passwordValue}
                      onChangeText={setPasswordValue}
                    />
                    <View style={styles.formSubmit}>
                      <PrimaryButton
                        label="Sign In"
                        onPress={() => void handleEmailSignIn()}
                        loading={loading}
                      />
                    </View>
                  </View>
                ) : null}

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.createAccountButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={openSignupForm}
                >
                  <Text style={styles.createAccountLabel}>Create Account with Email</Text>
                </Pressable>

                {emailFormMode === 'signup' ? (
                  <View style={styles.inlineForm}>
                    <TextInput
                      type="email"
                      placeholder="Email"
                      value={emailValue}
                      onChangeText={setEmailValue}
                    />
                    <TextInput
                      type="password"
                      placeholder="Password"
                      value={passwordValue}
                      onChangeText={setPasswordValue}
                    />
                    <TextInput
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPasswordValue}
                      onChangeText={setConfirmPasswordValue}
                    />
                    <View style={styles.formSubmit}>
                      <PrimaryButton
                        label="Create Account"
                        onPress={() => void handleEmailSignUp()}
                        loading={loading}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.termsFooter,
              {
                paddingBottom: Math.max(insets.bottom, spacing.sectionGap) + spacing.sectionGap,
                paddingHorizontal: spacing.screen,
              },
            ]}
          >
            <Text style={styles.terms}>
              By continuing, you agree to our{' '}
              <Text
                style={styles.termsLink}
                onPress={() => navigation.navigate('TermsOfService')}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text
                style={styles.termsLink}
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screenInner: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainColumn: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    width: '100%',
  },
  wordmarkSection: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: spacing.sectionGap * 2,
    paddingTop: spacing.sectionGap,
  },
  authMiddle: {
    flex: 1,
    justifyContent: 'center',
    alignSelf: 'stretch',
    width: '100%',
    marginTop: spacing.sectionGap * 3,
    paddingVertical: spacing.sectionGap * 2,
  },
  methodStack: {
    alignSelf: 'stretch',
    gap: spacing.cardGap,
  },
  appleButton: {
    width: '100%',
    height: spacing.authMethodButton,
  },
  googleButton: {
    width: '100%',
    height: spacing.authMethodButton,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.authGoogle,
    backgroundColor: colors.text.primary,
    paddingHorizontal: spacing.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailOutlineButton: {
    width: '100%',
    height: spacing.authMethodButton,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.authEmail,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthIconSlot: {
    marginRight: spacing.oauthMethodGap,
  },
  oauthMethodLabel: {
    textAlign: 'left',
    fontFamily: typography.body,
    fontSize: fontSizes.oauthMethodLabel,
    fontWeight: fontWeights.bold,
    color: colors.text.onGold,
  },
  oauthMethodLabelEmail: {
    color: colors.text.primary,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  inlineForm: {
    alignSelf: 'stretch',
    marginTop: spacing.cardGap,
    gap: spacing.inputGap,
  },
  formSubmit: {
    marginTop: spacing.cardGap,
    alignSelf: 'stretch',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
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
  createAccountButton: {
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
    height: spacing.authMethodButton,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.card,
  },
  createAccountLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.gold,
  },
  termsFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  terms: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    lineHeight: Math.round(fontSizes.caption * 1.45),
  },
  termsLink: {
    color: colors.text.secondary,
    textDecorationLine: 'underline',
  },
});
