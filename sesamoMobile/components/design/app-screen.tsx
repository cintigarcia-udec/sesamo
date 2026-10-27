import { ReactNode } from 'react';
import { ScrollView, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';

export function AppScreen({
  children,
  header,
  scroll = true,
  contentContainerStyle,
  style,
  safeAreaEdges = ['top', 'right', 'bottom', 'left'],
}: {
  children: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  safeAreaEdges?: Edge[];
}) {
  const backgroundColor = useThemeColor({}, 'surface');

  if (!scroll) {
    return (
      <SafeAreaView
        edges={safeAreaEdges}
        style={[{ flex: 1, backgroundColor }, style]}
      >
        {header}
        {children}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[{ flex: 1, backgroundColor }, style]}
    >
      {header}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[{ paddingBottom: 40 }, contentContainerStyle]}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
