import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoTile from '../components/LogoTile';
import PrimaryButton from '../components/PrimaryButton';
import TabSwitcher from '../components/TabSwitcher';
import TextInput from '../components/TextInput';
import Wordmark from '../components/Wordmark';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing } from '../../design-system/tokens';

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
              <Wordmark size="md" tagline="AI Feedback for your swing" />
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
