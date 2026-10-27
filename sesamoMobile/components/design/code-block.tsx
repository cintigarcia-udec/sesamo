import { ReactNode } from 'react';
import { View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { AppText } from '@/components/design/app-text';

export function CodeBlock({ children }: { children: ReactNode }) {
  const background = useThemeColor({}, 'inverseSurface');
  const foreground = useThemeColor({}, 'inverseOnSurface');

  return (
    <View style={{ backgroundColor: background, borderRadius: 10, padding: 14 }}>
      <AppText variant="mono" style={{ color: foreground }}>
        {children}
      </AppText>
    </View>
  );
}
