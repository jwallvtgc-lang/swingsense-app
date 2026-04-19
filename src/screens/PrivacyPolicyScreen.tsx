import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import BackNav from '../components/BackNav';
import {
  colors,
  displayTitleProps,
  fontSizes,
  fontWeights,
  spacing,
  typography,
} from '../../design-system/tokens';

const SECTIONS = [
  {
    heading: '',
    body: 'SwingSense is committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights regarding your data.',
  },
  {
    heading: 'Information We Collect',
    body: 'Account information: email address, first name, age, position, batting side, and experience level provided during signup. Swing videos you upload for analysis. Usage data: swing scores, coaching outputs, and app activity.',
  },
  {
    heading: 'How We Use Your Information',
    body: 'To analyze your swing and provide AI-generated coaching feedback. To track your progress over time. To improve the accuracy of our coaching model. To communicate with you about your account.',
  },
  {
    heading: 'Video Data',
    body: 'Videos you upload are stored securely and used solely to generate your coaching analysis. We do not share your videos with third parties. You can delete your videos and account data at any time by contacting us.',
  },
  {
    heading: "Children's Privacy (COPPA)",
    body: 'SwingSense is intended for use by individuals of all ages including children under 13, with parental supervision. We do not knowingly collect personal information from children under 13 without verifiable parental consent. If you are a parent and believe your child has provided us with personal information without your consent, contact us at swingsenseapp@gmail.com and we will delete it promptly.',
  },
  {
    heading: 'Data Sharing',
    body: "We do not sell your personal information. We use Supabase for secure data storage and Anthropic's Claude API for AI coaching analysis. Both services are bound by their own privacy policies and do not use your data for any purpose other than providing the SwingSense service.",
  },
  {
    heading: 'Data Security',
    body: 'Your data is stored securely using industry-standard encryption. Swing videos are stored in protected cloud storage accessible only to your account.',
  },
  {
    heading: 'Your Rights',
    body: 'You may request deletion of your account and all associated data at any time by contacting swingsenseapp@gmail.com. We will process deletion requests within 30 days.',
  },
  {
    heading: 'Contact Us',
    body: 'SwingSense\nswingsenseapp@gmail.com',
  },
];

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  return (
    <View style={styles.wrapper}>
      <View style={[styles.backNavWrapper, { paddingTop: insets.top }]}>
        <BackNav label="Profile" onPress={() => navigation.goBack()} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.screen },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} {...displayTitleProps}>
          Privacy Policy
        </Text>
        <Text style={styles.updated}>Last updated: April 18, 2026</Text>
        {SECTIONS.map((section) => (
          <View key={section.heading} style={styles.section}>
            {section.heading ? <Text style={styles.heading}>{section.heading}</Text> : null}
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.bg.base },
  backNavWrapper: {
    paddingHorizontal: spacing.screen,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.screen },
  title: {
    fontFamily: typography.displayTitle,
    fontSize: fontSizes.screenTitle,
    color: colors.text.primary,
    marginBottom: spacing.iconGap,
  },
  updated: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    marginBottom: spacing.sectionGap,
  },
  section: { marginBottom: spacing.sectionGap },
  heading: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    marginBottom: spacing.iconGap,
  },
  body: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.body * 1.6),
  },
});
