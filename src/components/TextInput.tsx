import { useState } from 'react';
import type {
  BlurEvent,
  FocusEvent,
  KeyboardTypeOptions,
  LayoutChangeEvent,
  StyleProp,
  TextStyle,
} from 'react-native';
import { StyleSheet, TextInput as RNTextInput } from 'react-native';

import { colors, fontSizes, radius, spacing, typography } from '../../design-system/tokens';

export type TextInputProps = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  type?: 'email' | 'password' | 'text';
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: StyleProp<TextStyle>;
  textAlign?: 'left' | 'center' | 'right';
  editable?: boolean;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: BlurEvent) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export default function TextInput({
  placeholder,
  value,
  onChangeText,
  type = 'text',
  keyboardType: keyboardTypeProp,
  maxLength,
  autoCapitalize: autoCapitalizeProp,
  style,
  textAlign,
  editable = true,
  onFocus,
  onBlur,
  onLayout,
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const secure = type === 'password';
  const keyboardType =
    keyboardTypeProp ?? (type === 'email' ? 'email-address' : 'default');
  const autoCapitalize =
    autoCapitalizeProp ??
    (type === 'email' || type === 'password' ? 'none' : 'sentences');

  const handleFocus = (event: FocusEvent) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: BlurEvent) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  return (
    <RNTextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.text.inputPlaceholder}
      style={[styles.input, isFocused && styles.inputFocused, style]}
      secureTextEntry={secure}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={type !== 'email' && type !== 'password'}
      maxLength={maxLength}
      textAlign={textAlign}
      editable={editable}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onLayout={onLayout}
    />
  );
}

/** Single-line control height so narrow fields (e.g. ft/in) match full-width inputs. */
const INPUT_MIN_HEIGHT =
  spacing.inputVertical * 2 + Math.ceil(fontSizes.body * 1.35);

const styles = StyleSheet.create({
  input: {
    alignSelf: 'stretch',
    width: '100%',
    minHeight: INPUT_MIN_HEIGHT,
    backgroundColor: colors.bg.input,
    borderRadius: radius.subCard,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: spacing.inputVertical,
    paddingHorizontal: spacing.inputHorizontal,
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.primary,
  },
  inputFocused: {
    borderColor: colors.border.gold,
  },
});
