import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import BrandedSplash from '../components/BrandedSplash';
import type { AuthStackParamList } from '../navigation/types';

/** Auth-stack splash route — prefer app-root BrandedSplash in App.tsx for cold start. */
export default function SplashScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Splash'>>();

  return (
    <BrandedSplash
      onComplete={() => {
        console.log('[SplashScreen] navigating to Auth');
        navigation.replace('Auth');
      }}
    />
  );
}
