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
    body: "Email address — collected when you create an account. Player information (first name, age, position, batting side, and experience level) — collected when you complete signup. For players under 13, a parent or guardian's name — collected as part of the required consent process. Swing videos — collected when you upload or record a swing for analysis. Usage data (swing scores, coaching outputs, and app activity) — collected automatically as you use the app.\n\nA parent or guardian account may include profiles for multiple children. The data practices described in this policy apply individually to each child's profile.",
  },
  {
    heading: 'How We Use Your Information',
    body: 'To analyze your swing and provide AI-generated coaching feedback. To track your progress over time. To improve the accuracy of our coaching model. To communicate with you about your account.',
  },
  {
    heading: 'Video Data',
    body: "Videos you upload are stored securely and used solely to generate your coaching analysis. Before your first swing analysis, we ask you to explicitly acknowledge that your video is sent to Anthropic's Claude AI for this purpose. We do not share your videos with any other third party. You can delete your videos and account data at any time by contacting us.",
  },
  {
    heading: "Children's Privacy (COPPA)",
    body: "For players under 13, a parent or legal guardian must create the player's profile and directly provide consent before any swing video or activity data is collected. During setup, we clearly disclose what is collected (swing video and movement data, used to generate coaching feedback) and require an explicit confirmation that you are the child's parent or legal guardian before continuing. We do not collect any personal information from a player under 13 whose profile was set up without this consent.\n\nIf a player identifies themselves as under 13 while setting up their own profile, we do not collect any information and instead direct them to have a parent or guardian complete setup.\n\nWe do not use information collected from children under 13 for advertising, and we do not share it with any coach, team, or other user unless a parent separately enables that sharing.\n\nIf you are a parent and believe your child has provided us with personal information outside of this process, or you'd like to review, correct, or delete your child's data, contact us at swingsenseapp@gmail.com and we will address it promptly.",
  },
  {
    heading: 'Data Sharing',
    body: "We do not sell your personal information. We use Supabase for secure data storage and Anthropic's Claude API for AI coaching analysis — this means your swing video is sent directly to Anthropic to generate your coaching feedback. Both services are bound by their own privacy policies and do not use your data for any purpose other than providing the SwingSense service. We only share data with service providers, including Anthropic, who are contractually and technically required to protect your data to a standard consistent with this policy.",
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
        <Text style={styles.updated}>Last updated: September 3, 2026</Text>
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
