import type { KeyboardTypeOptions, StyleProp, TextStyle } from 'react-native';
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
}: TextInputProps) {
  const secure = type === 'password';
  const keyboardType =
    keyboardTypeProp ?? (type === 'email' ? 'email-address' : 'default');
  const autoCapitalize =
    autoCapitalizeProp ??
    (type === 'email' || type === 'password' ? 'none' : 'sentences');

  return (
    <RNTextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.text.inputPlaceholder}
      style={[styles.input, style]}
      secureTextEntry={secure}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={type !== 'email' && type !== 'password'}
      maxLength={maxLength}
      textAlign={textAlign}
      editable={editable}
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
    paddingVertical: spacing.inputVertical,
    paddingHorizontal: spacing.inputHorizontal,
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.primary,
  },
});
