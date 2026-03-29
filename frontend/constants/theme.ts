/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

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
  },
});

export const AppTheme = {
  colors: {
    background: '#3C3636',
    surface: '#473F3F',
    elevated: '#4C4545',
    accent: '#D4C26E',
    textPrimary: '#FFFFFF',
    textMuted: '#D9D9D9',
    textAccentSoft: '#E8D89A',
    danger: '#922525',
    actionSecondary: '#6E6BD4',
    surfaceWarm: '#A67560',
    surfaceSubtle: '#353535',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radius: {
    sm: 5,
    md: 8,
    lg: 12,
    pill: 999,
  },
  typography: {
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
    },
    labelSm: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '500',
    },
    labelMd: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '500',
    },
  },
} as const;
