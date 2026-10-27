import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export function AppCard({
  children,
  tone = 'low',
  style,
}: {
  children: ReactNode;
  tone?: 'lowest' | 'low' | 'highest' | 'gradient';
  style?: StyleProp<ViewStyle>;
}) {
  const low = useThemeColor({}, 'surfaceContainerLow');
  const lowest = useThemeColor({}, 'surfaceContainerLowest');
  const highest = useThemeColor({}, 'surfaceContainerHighest');

  const backgroundColor = tone === 'lowest' ? lowest : tone === 'highest' ? highest : low;

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: 24,
          padding: 20,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
