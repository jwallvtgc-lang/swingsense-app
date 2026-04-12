import type { PostHogEventProperties } from '@posthog/core';
import PostHog from 'posthog-react-native';

const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '', {
  host: 'https://us.i.posthog.com',
});

export function identifyUser(
  userId: string,
  properties?: {
    first_name?: string;
    experience_level?: string | null;
    primary_position?: string | null;
    batting_side?: string | null;
    age?: number | null;
  }
) {
  posthog.identify(userId, properties);
}

export function trackEvent(event: string, properties?: PostHogEventProperties) {
  posthog.capture(event, properties);
}

export function resetAnalytics() {
  posthog.reset();
}

export default posthog;
