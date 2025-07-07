
/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    textSecondary: '#687076',
    backgroundSecondary: '#F5F5F5',
    border: '#E5E5E5',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    warningLight: '#FFF3E0',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    textSecondary: '#9BA1A6',
    backgroundSecondary: '#1C1F21',
    border: '#2C2F31',
    error: '#FF453A',
    success: '#30D158',
    warning: '#FF9F0A',
    warningLight: '#3A2F1A',
  },
};
