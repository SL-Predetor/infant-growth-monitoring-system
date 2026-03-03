/**
 * BabySense AI - Modern Health-Tech Design System
 * Minimal, clean, medical-focused color palette
 */

import { Platform } from 'react-native';

// Infant Growth Monitoring Color Palette
const primaryModern = '#6C63FF';     // Trustworthy & Modern (Primary Brand)
const secondaryNurture = '#FF8FB1';  // Soft & Caring (Secondary)
const backgroundLight = '#F8F9FA';   // Clean, Clinical, Minimal
const textDeepGrey = '#2D3436';      // High readability
const successGrowth = '#4CAF50';     // Healthy progression
const warningStagnation = '#FFC107'; // Attention needed

export const Colors = {
  light: {
    text: textDeepGrey,
    secondaryText: '#636E72',
    background: backgroundLight,
    cardBackground: '#FFFFFF',
    tint: primaryModern,
    icon: '#636E72',
    tabIconDefault: '#B2BEC3',
    tabIconSelected: primaryModern,
    
    // Infant Growth Monitoring Health Theme
    primary: primaryModern,
    secondary: secondaryNurture,
    accent: secondaryNurture,
    error: '#E63946',
    success: successGrowth,
    warning: warningStagnation,
    
    // Borders and surfaces
    border: '#E8E8FF',
    shadow: 'rgba(108, 99, 255, 0.08)',
    cardShadow: 'rgba(108, 99, 255, 0.06)',
    overlay: 'rgba(45, 52, 54, 0.6)',
  },
  dark: {
    text: '#ECEDEE',
    secondaryText: '#B2BEC3',
    background: '#1a1a2e',
    cardBackground: '#16213e',
    tint: primaryModern,
    icon: '#B2BEC3',
    tabIconDefault: '#B8A5FF',
    tabIconSelected: primaryModern,
    
    // Infant Growth Monitoring Health Theme
    primary: primaryModern,
    secondary: secondaryNurture,
    accent: secondaryNurture,
    error: '#E63946',
    success: successGrowth,
    warning: warningStagnation,
    
    // Borders and surfaces
    border: '#6C63FF40',
    shadow: 'rgba(108, 99, 255, 0.2)',
    cardShadow: 'rgba(108, 99, 255, 0.15)',
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
