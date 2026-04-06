import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  bottomTab,
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  typography,
} from '../../design-system/tokens';

const VB = 24;
const APP_ICON = require('../../assets/icon.png');

export type BottomTabId = 'analyze' | 'history' | 'profile';

type TabIconProps = { color: string; active: boolean };

export type BottomTabBarProps = {
  activeTab: BottomTabId;
  onTabPress: (tab: BottomTabId) => void;
};

function TabIconAnalyze({ active }: TabIconProps) {
  return (
    <Image
      source={APP_ICON}
      style={[styles.appTabIcon, { opacity: active ? 1 : 0.5 }]}
      resizeMode="contain"
      accessibilityLabel="Analyze"
    />
  );
}

function TabIconHistory({ color }: TabIconProps) {
  return (
    <Svg width={bottomTab.iconSize} height={bottomTab.iconSize} viewBox={`0 0 ${VB} ${VB}`}>
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.5} fill="none" />
      <Path
        d="M12 7v5l3.5 2"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function TabIconProfile({ color }: TabIconProps) {
  return (
    <Svg width={bottomTab.iconSize} height={bottomTab.iconSize} viewBox={`0 0 ${VB} ${VB}`}>
      <Circle cx={12} cy={9} r={3.25} stroke={color} strokeWidth={1.5} fill="none" />
      <Path
        d="M6 20.25c0-3.45 2.55-6.25 6-6.25s6 2.8 6 6.25"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

const TABS: {
  id: BottomTabId;
  label: string;
  Icon: typeof TabIconAnalyze | typeof TabIconHistory | typeof TabIconProfile;
}[] = [
  { id: 'analyze', label: 'Analyze', Icon: TabIconAnalyze },
  { id: 'history', label: 'History', Icon: TabIconHistory },
  { id: 'profile', label: 'Profile', Icon: TabIconProfile },
];

export default function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.outer,
        {
          paddingBottom: insets.bottom,
          backgroundColor: colors.bg.base,
          borderTopColor: colors.border.subtle,
        },
      ]}
    >
      <View style={[styles.row, { height: bottomTab.height }]}>
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          const tint = active ? colors.text.gold : colors.text.muted;
          return (
            <Pressable
              key={id}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
              onPress={() => onTabPress(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Icon color={tint} active={active} />
              <Text style={[styles.label, { color: tint }]}>{label.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderTopWidth: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabPressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: typography.body,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.label,
    letterSpacing: letterSpacing.bottomTab,
    textTransform: 'uppercase',
  },
  appTabIcon: {
    width: 24,
    height: 24,
  },
});
