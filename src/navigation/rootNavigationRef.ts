import { createNavigationContainerRef, ParamListBase } from '@react-navigation/native';

/** Root `NavigationContainer` ref (auth vs main tree is switched by remounting, not reset). */
export const rootNavigationRef = createNavigationContainerRef<ParamListBase>();
