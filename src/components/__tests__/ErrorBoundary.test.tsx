import { Text } from 'react-native';
import type { ReactTestRenderer, ReactTestRendererJSON } from 'react-test-renderer';
import { act, create } from 'react-test-renderer';

import ErrorBoundary from '../ErrorBoundary';

/** Collect every rendered string in the tree so we can assert on visible copy. */
function visibleText(node: ReactTestRendererJSON | ReactTestRendererJSON[] | string | null): string {
  if (node === null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(visibleText).join(' ');
  return visibleText(node.children as ReactTestRendererJSON[] | null);
}

function renderedText(tree: ReactTestRenderer): string {
  return visibleText(tree.toJSON() as ReactTestRendererJSON | null);
}

function HealthyChild() {
  return <Text>swing analysis loaded</Text>;
}

/** Throws on demand so we can flip it between renders to test recovery. */
let shouldThrow = true;
function FlakyChild() {
  if (shouldThrow) {
    throw new Error('kaboom from a screen');
  }
  return <Text>swing analysis loaded</Text>;
}

describe('ErrorBoundary', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    shouldThrow = true;
    // React logs caught boundary errors itself; silence the noise but keep the
    // calls so we can assert our own componentDidCatch logging fired.
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('renders children normally when nothing throws', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <ErrorBoundary>
          <HealthyChild />
        </ErrorBoundary>
      );
    });

    expect(renderedText(tree)).toContain('swing analysis loaded');
    expect(renderedText(tree)).not.toContain('Something went wrong');
  });

  it('renders the fallback when a child throws during render', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <ErrorBoundary>
          <FlakyChild />
        </ErrorBoundary>
      );
    });

    const text = renderedText(tree);
    expect(text).toContain('Something went wrong');
    expect(text).toContain('TRY AGAIN');
    // The crashing child must be gone, not just visually covered.
    expect(text).not.toContain('swing analysis loaded');
  });

  it('logs the caught error via console.error', () => {
    act(() => {
      create(
        <ErrorBoundary>
          <FlakyChild />
        </ErrorBoundary>
      );
    });

    const logged = errorSpy.mock.calls.map((args) => String(args[0]));
    expect(logged).toContain('[ErrorBoundary] Uncaught render error:');
    expect(logged).toContain('[ErrorBoundary] Component stack:');
  });

  it('recovers and re-renders children when retry is pressed', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <ErrorBoundary>
          <FlakyChild />
        </ErrorBoundary>
      );
    });

    expect(renderedText(tree)).toContain('Something went wrong');

    // Whatever made the child throw is now resolved.
    shouldThrow = false;

    const retry = tree.root.findByProps({ label: 'TRY AGAIN' });
    act(() => {
      retry.props.onPress();
    });

    const text = renderedText(tree);
    expect(text).toContain('swing analysis loaded');
    expect(text).not.toContain('Something went wrong');
  });
});
