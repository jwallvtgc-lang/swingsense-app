import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { BottomTabId } from '../components/BottomTabBar';
import type { MainStackParamList, TabParamList } from './types';

const TAB_ID_TO_ROUTE: Record<BottomTabId, keyof TabParamList> = {
  analyze: 'UploadTab',
  history: 'History',
  profile: 'Profile',
};

/** Switch main tabs from tab screens or from stack routes like `Upload`. */
export function useMainTabBarNav() {
  const navigation = useNavigation();
  return (tabId: BottomTabId) => {
    const screen = TAB_ID_TO_ROUTE[tabId];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let nav: any = navigation;
    for (let depth = 0; depth < 8 && nav; depth += 1) {
      const st = nav.getState?.();
      if (st?.type === 'tab') {
        nav.navigate(screen);
        return;
      }
      nav = nav.getParent?.();
    }
    (navigation as unknown as NativeStackNavigationProp<MainStackParamList>).navigate(
      'MainTabs',
      { screen }
    );
  };
}
