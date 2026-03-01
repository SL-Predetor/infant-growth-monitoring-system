/**
 * BabySense AI - Modern Health-Tech Design System
 * Minimal, clean, medical-focused color palette
 */

import { Platform } from 'react-native';

const primaryTeal = '#4ECDC4';
const accentPurple = '#6C5CE7';
const softRed = '#FF6B6B';
const backgroundLight = '#F8F9FA';

export const Colors = {
  light: {
    text: '#2D3436',
    secondaryText: '#636E72',
    background: backgroundLight,
    cardBackground: '#FFFFFF',
    tint: primaryTeal,
    icon: '#636E72',
    tabIconDefault: '#B2BEC3',
    tabIconSelected: primaryTeal,
    
    // BabySense AI Health Theme
    primary: primaryTeal,
    accent: accentPurple,
    error: softRed,
    success: '#00B894',
    warning: '#FDCB6E',
    
    // Borders and surfaces
    border: '#DDD6FE',
    shadow: 'rgba(45, 52, 54, 0.1)',
    cardShadow: 'rgba(45, 52, 54, 0.08)',
    overlay: 'rgba(45, 52, 54, 0.6)',
  },
  dark: {
    text: '#ECEDEE',
    secondaryText: '#B2BEC3',
    background: '#2D3436',
    cardBackground: '#636E72',
    tint: primaryTeal,
    icon: '#B2BEC3',
    tabIconDefault: '#74B9FF',
    tabIconSelected: primaryTeal,
    
    // BabySense AI Health Theme
    primary: primaryTeal,
    accent: accentPurple,
    error: softRed,
    success: '#00B894',
    warning: '#FDCB6E',
    
    // Borders and surfaces
    border: '#636E72',
    shadow: 'rgba(0, 0, 0, 0.3)',
    cardShadow: 'rgba(0, 0, 0, 0.2)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
};

// Design tokens for consistent spacing and typography
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    title: 28,
    heading: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
} as const;

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
