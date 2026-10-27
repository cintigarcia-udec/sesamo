/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const paletteLight = {
  background: '#f6fafa',
  onBackground: '#181c1d',
  surface: '#f6fafa',
  onSurface: '#181c1d',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f0f4f4',
  surfaceContainerHigh: '#e5e9e9',
  surfaceContainerHighest: '#dfe3e3',
  surfaceVariant: '#dfe3e3',
  onSurfaceVariant: '#3f484b',
  outline: '#6f797c',
  outlineVariant: '#bec8cb',
  primary: '#004d5b',
  onPrimary: '#ffffff',
  primaryContainer: '#006778',
  onPrimaryContainer: '#97e3f6',
  inversePrimary: '#86d2e5',
  secondary: '#4d616c',
  onSecondary: '#ffffff',
  secondaryContainer: '#d0e6f3',
  onSecondaryContainer: '#536772',
  tertiary: '#623a47',
  onTertiary: '#ffffff',
  tertiaryContainer: '#7c515f',
  onTertiaryContainer: '#ffc9d8',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  inverseSurface: '#2c3131',
  inverseOnSurface: '#edf2f1',
} as const;

const paletteDark = {
  background: '#0f1415',
  onBackground: '#edf2f1',
  surface: '#0f1415',
  onSurface: '#edf2f1',
  surfaceContainerLowest: '#151b1c',
  surfaceContainerLow: '#1a2122',
  surfaceContainerHigh: '#222a2b',
  surfaceContainerHighest: '#2c3536',
  surfaceVariant: '#2c3536',
  onSurfaceVariant: '#c0cbcd',
  outline: '#8a9598',
  outlineVariant: '#3f484b',
  primary: '#86d2e5',
  onPrimary: '#001f26',
  primaryContainer: '#006778',
  onPrimaryContainer: '#d7f6ff',
  inversePrimary: '#004d5b',
  secondary: '#b4cad6',
  onSecondary: '#081e27',
  secondaryContainer: '#2b3f49',
  onSecondaryContainer: '#d0e6f3',
  tertiary: '#eeb8c8',
  onTertiary: '#31111d',
  tertiaryContainer: '#7c515f',
  onTertiaryContainer: '#ffd9e3',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  inverseSurface: '#edf2f1',
  inverseOnSurface: '#2c3131',
} as const;

export const Colors = {
  light: {
    ...paletteLight,
    text: paletteLight.onSurface,
    tint: paletteLight.primary,
    icon: paletteLight.secondary,
    tabIconDefault: paletteLight.secondary,
    tabIconSelected: paletteLight.primary,
  },
  dark: {
    ...paletteDark,
    text: paletteDark.onSurface,
    tint: paletteDark.primary,
    icon: paletteDark.onSurfaceVariant,
    tabIconDefault: paletteDark.onSurfaceVariant,
    tabIconSelected: paletteDark.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    headline: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    body: "'Manrope', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    label: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
});
