import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, radius, spacing } from '../../design-system/tokens';

const FONT_INTER = 'Inter_500Medium';

export type TabSwitcherProps = {
  tabs: string[];
  activeTab: string;
  onChange: (tab: string) => void;
};

export default function TabSwitcher({ tabs, activeTab, onChange }: TabSwitcherProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = tab === activeTab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={({ pressed }) => [
              styles.tab,
              active ? styles.tabActive : styles.tabInactive,
              pressed && !active && styles.tabPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.subCard,
    padding: spacing.tabPad,
    gap: spacing.tabPad,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.tabInner,
    paddingHorizontal: spacing.tabInner,
    borderRadius: radius.tab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.bg.gold,
  },
  tabInactive: {
    backgroundColor: 'transparent',
  },
  tabPressed: {
    opacity: 0.9,
  },
  label: {
    fontFamily: FONT_INTER,
    fontSize: fontSizes.body,
  },
  labelActive: {
    color: colors.text.onGold,
  },
  labelInactive: {
    color: colors.text.muted,
  },
});
