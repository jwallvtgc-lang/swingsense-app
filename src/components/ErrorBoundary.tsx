import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, spacing, typography } from '../../design-system/tokens';
import PrimaryButton from './PrimaryButton';

/**
 * Catches render errors from anywhere in the subtree and shows a recoverable
 * fallback instead of unmounting the app to a blank white screen.
 *
 * Must be a class component — function components cannot be error boundaries.
 *
 * Note: this catches errors thrown during render, in lifecycle methods, and in
 * constructors. It does NOT catch errors in event handlers, async callbacks,
 * or promise rejections — those never unmounted the tree to begin with.
 *
 * To verify manually, temporarily add `throw new Error('boundary smoke test')`
 * to the top of any screen's component body, then reload.
 */

export type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // TODO: forward to Sentry once it is wired up (separate ticket).
    console.error('[ErrorBoundary] Uncaught render error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (error === null) {
      return this.props.children;
    }

    return (
      <View style={styles.root}>
        <Text style={styles.title} maxFontSizeMultiplier={1.25}>
          Something went wrong
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.35}>
          The app hit an unexpected error. Tap below to get back to your swings.
        </Text>
        {__DEV__ ? (
          <Text style={styles.devDetail} maxFontSizeMultiplier={1.2}>
            {error.message}
          </Text>
        ) : null}
        <View style={styles.cta}>
          <PrimaryButton label="TRY AGAIN" onPress={this.handleRetry} />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.base,
    paddingHorizontal: spacing.screen,
    gap: spacing.cardGap,
  },
  title: {
    fontFamily: typography.display,
    fontSize: fontSizes.display,
    color: colors.text.primary,
    textAlign: 'center',
  },
  body: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: Math.round(fontSizes.body * 1.45),
    maxWidth: 320,
  },
  devDetail: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    textAlign: 'center',
    maxWidth: 320,
  },
  cta: {
    alignSelf: 'stretch',
    marginTop: spacing.pillGap,
  },
});
