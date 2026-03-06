/**
 * TinySteps Design Tokens
 * Inspired by Apple Health — light & dark mode
 */

import { useColorScheme } from "react-native";

/* ───────────────────────── COLORS ───────────────────────── */

const light = {
  background: "#F2F2F7",
  card: "#FFFFFF",
  cardSecondary: "#F2F2F7",
  cardTertiary: "#E5E5EA",
  label: "#000000",
  labelSecondary: "#3C3C43",
  labelTertiary: "#8E8E93",
  labelPlaceholder: "#C7C7CC",
  primary: "#5E5CE6",
  primarySoft: "rgba(94,92,230,0.10)",
  secondary: "#FF6B9D",
  secondarySoft: "rgba(255,107,157,0.10)",
  success: "#34C759",
  successSoft: "rgba(52,199,89,0.12)",
  warning: "#FF9F0A",
  warningSoft: "rgba(255,159,10,0.12)",
  danger: "#FF3B30",
  dangerSoft: "rgba(255,59,48,0.12)",
  separator: "#C6C6C8",
  border: "#E5E5EA",
  tabBar: "#FFFFFF",
  tabBarBorder: "#E5E5EA",

  // Backward compatibility
  text: "#000000",
  secondaryText: "#3C3C43",
  cardBackground: "#FFFFFF",
  error: "#FF3B30",
  accent: "#5E5CE6",
  icon: "#8E8E93",
  cardShadow: "#000000",
} as const;

const dark = {
  background: "#000000",
  card: "#1C1C1E",
  cardSecondary: "#2C2C2E",
  cardTertiary: "#3A3A3C",
  label: "#FFFFFF",
  labelSecondary: "#EBEBF5",
  labelTertiary: "#8E8E93",
  labelPlaceholder: "#48484A",
  primary: "#5E5CE6",
  primarySoft: "rgba(94,92,230,0.18)",
  secondary: "#FF6B9D",
  secondarySoft: "rgba(255,107,157,0.15)",
  success: "#30D158",
  successSoft: "rgba(48,209,88,0.15)",
  warning: "#FF9F0A",
  warningSoft: "rgba(255,159,10,0.15)",
  danger: "#FF453A",
  dangerSoft: "rgba(255,69,58,0.15)",
  separator: "#38383A",
  border: "#38383A",
  tabBar: "#1C1C1E",
  tabBarBorder: "#38383A",

  // Backward compatibility
  text: "#FFFFFF",
  secondaryText: "#EBEBF5",
  cardBackground: "#1C1C1E",
  error: "#FF453A",
  accent: "#5E5CE6",
  icon: "#8E8E93",
  cardShadow: "#000000",
} as const;

export type ColorScheme = typeof light | typeof dark;

export const Colors: { light: ColorScheme; dark: ColorScheme } = {
  light,
  dark,
};

/* ──────────────────────── TYPOGRAPHY ─────────────────────── */

export const Typography = {
  largeTitle: { fontSize: 34, fontWeight: "700" as const, letterSpacing: 0.37 },
  title1: { fontSize: 28, fontWeight: "700" as const, letterSpacing: 0.36 },
  title2: { fontSize: 22, fontWeight: "700" as const, letterSpacing: 0.35 },
  title3: { fontSize: 20, fontWeight: "600" as const, letterSpacing: 0.38 },
  headline: { fontSize: 17, fontWeight: "600" as const, letterSpacing: -0.41 },
  body: { fontSize: 17, fontWeight: "400" as const, letterSpacing: -0.41 },
  callout: { fontSize: 16, fontWeight: "400" as const, letterSpacing: -0.32 },
  subheadline: { fontSize: 15, fontWeight: "400" as const, letterSpacing: -0.24 },
  footnote: { fontSize: 13, fontWeight: "400" as const, letterSpacing: -0.08 },
  caption1: { fontSize: 12, fontWeight: "400" as const, letterSpacing: 0 },
  caption2: { fontSize: 11, fontWeight: "400" as const, letterSpacing: 0.07 },
  display1: { fontSize: 72, fontWeight: "800" as const, letterSpacing: -2 },
  display2: { fontSize: 52, fontWeight: "800" as const, letterSpacing: -1.5 },
  display3: { fontSize: 36, fontWeight: "700" as const, letterSpacing: -1 },
  display4: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },

  // Backward compatibility
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    largeTitle: 34,
    title1: 28,
    title2: 24,
    title3: 20,
    headline: 17,
    body: 17,
    callout: 16,
    subheadline: 15,
    footnote: 13,
    caption1: 12,
    caption2: 11,
    display1: 72,
    display2: 52,
    display3: 36,
    display4: 28,
    heading: 20, // alias
  },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    semiBold: "600" as const, // alias
    bold: "700" as const,
    heavy: "800" as const,
  }
} as const;

/* ───────────────────────── SPACING ───────────────────────── */

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenPadding: 16,
} as const;

/* ───────────────────────── RADIUS ────────────────────────── */

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
} as const;

// Backward compatibility
export const BorderRadius = Radius;

/* ───────────────────────── SHADOWS ───────────────────────── */

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

/* ──────────────────────── HELPERS ────────────────────────── */

type Scheme = "light" | "dark";

/** Returns the correct Colors palette based on the device colour scheme. */
export function useTheme(): ColorScheme {
  const scheme = useColorScheme();
  return Colors[scheme === "dark" ? "dark" : "light"];
}

/**
 * WAZ-score → semantic colour.
 *   > -1  → success
 *   > -2  → warning
 *   ≤ -2  → danger
 *   null  → labelTertiary
 */
export function wazColor(
  waz: number | null | undefined,
  scheme: Scheme = "light",
): string {
  const c = Colors[scheme];
  if (waz == null) return c.labelTertiary;
  if (waz > -1) return c.success;
  if (waz > -2) return c.warning;
  return c.danger;
}

/**
 * Risk level → semantic colour.
 *   Low    → success
 *   Medium → warning
 *   High   → danger
 */
export function riskColor(
  level: "Low" | "Medium" | "High",
  scheme: Scheme = "light",
): string {
  const c = Colors[scheme];
  switch (level) {
    case "Low":
      return c.success;
    case "Medium":
      return c.warning;
    case "High":
      return c.danger;
  }
}
