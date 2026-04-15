/**
 * TinySteps Design Tokens
 * Design Direction: "The Digital Nursery" — Calm & Trust
 * Low cognitive load, optimized for sleep-deprived parents at 3AM
 */

import { useColorScheme } from "react-native";

/* ───────────────────────── COLORS ───────────────────────── */

const light = {
  // Backgrounds
  background: "#FCFBFA",       // Off-White — easy on eyes
  card: "#FFFFFF",             // Pure White — cards, inputs, modals
  cardSecondary: "#F4F1EA",    // Warm Sand — secondary surfaces
  cardTertiary: "#EDE9DF",     // Warm Sand darker — tertiary surfaces

  // Text
  label: "#2D3132",            // Charcoal — headings and primary body text
  labelSecondary: "#2D3132",   // Charcoal — high emphasis secondary
  labelTertiary: "#707779",    // Slate Gray — captions, placeholders, disabled
  labelPlaceholder: "#A0A4A6", // Muted — placeholder text

  // Brand
  primary: "#5DA7B1",          // Soft Teal — main CTAs, active states, branding
  primarySoft: "rgba(93,167,177,0.12)",
  secondary: "#F4F1EA",        // Warm Sand — secondary buttons, backgrounds
  secondarySoft: "rgba(244,241,234,0.80)",
  accent: "#E88D72",           // Muted Coral — milestones, highlights, playfulness
  accentSoft: "rgba(232,141,114,0.12)",

  // Semantic
  success: "#82A788",          // Sage Green — healthy growth, completed logs
  successSoft: "rgba(130,167,136,0.14)",
  warning: "#E6A855",          // Amber Glow — reminders, missed logs
  warningSoft: "rgba(230,168,85,0.14)",
  danger: "#D67676",           // Soft Rose — alerts, high temperature
  dangerSoft: "rgba(214,118,118,0.14)",

  // Structure
  separator: "#E8E4DA",
  border: "#E8E4DA",
  tabBar: "#FFFFFF",
  tabBarBorder: "#E8E4DA",

  // Backward compatibility
  text: "#2D3132",
  secondaryText: "#707779",
  cardBackground: "#FFFFFF",
  error: "#D67676",
  icon: "#707779",
  cardShadow: "#2D3132",
} as const;

const dark = {
  // Backgrounds
  background: "#1A1C1D",       // Deep Charcoal — easier than pure black
  card: "#242728",             // Lifted surface
  cardSecondary: "#2E3133",    // Secondary surface
  cardTertiary: "#383C3E",     // Tertiary surface

  // Text
  label: "#F0EDEA",            // Warm White — softer than pure white at night
  labelSecondary: "#C8C4C0",   // Muted warm white
  labelTertiary: "#707779",    // Slate Gray — same as light
  labelPlaceholder: "#4A4E50", // Dark placeholder

  // Brand
  primary: "#6BBDC8",          // Soft Teal brightened for dark bg
  primarySoft: "rgba(107,189,200,0.16)",
  secondary: "#3A3D3F",        // Dark secondary surface
  secondarySoft: "rgba(58,61,63,0.80)",
  accent: "#F0A088",           // Coral brightened for dark bg
  accentSoft: "rgba(240,160,136,0.16)",

  // Semantic
  success: "#95BB9B",          // Sage Green lightened
  successSoft: "rgba(149,187,155,0.16)",
  warning: "#F0BA6A",          // Amber lightened
  warningSoft: "rgba(240,186,106,0.16)",
  danger: "#E08888",           // Rose lightened
  dangerSoft: "rgba(224,136,136,0.16)",

  // Structure
  separator: "#383C3E",
  border: "#383C3E",
  tabBar: "#242728",
  tabBarBorder: "#383C3E",

  // Backward compatibility
  text: "#F0EDEA",
  secondaryText: "#C8C4C0",
  cardBackground: "#242728",
  error: "#E08888",
  accent: "#F0A088",
  icon: "#707779",
  cardShadow: "#000000",
} as const;

export type ColorScheme = typeof light | typeof dark;

export const Colors: { light: ColorScheme; dark: ColorScheme } = {
  light,
  dark,
};

/* ──────────────────────── TYPOGRAPHY ─────────────────────── */
// Font: System default — SF Pro on iOS, Roboto on Android, system-ui on Web
// Do NOT set fontFamily — React Native uses the system font automatically

export const Typography = {
  // Named scale — Gemini design spec
  h1: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: "600" as const, letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: "400" as const, letterSpacing: 0 },
  bodySmall: { fontSize: 14, fontWeight: "500" as const, letterSpacing: 0 },
  caption: { fontSize: 12, fontWeight: "400" as const, letterSpacing: 0.1 },
  button: { fontSize: 16, fontWeight: "600" as const, letterSpacing: 0.1 },

  // Apple-style aliases (backward compatibility)
  largeTitle: { fontSize: 34, fontWeight: "700" as const, letterSpacing: 0.37 },
  title1: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.3 },
  title2: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.2 },
  title3: { fontSize: 20, fontWeight: "600" as const, letterSpacing: -0.2 },
  headline: { fontSize: 17, fontWeight: "600" as const, letterSpacing: -0.41 },
  callout: { fontSize: 16, fontWeight: "400" as const, letterSpacing: -0.32 },
  subheadline: { fontSize: 15, fontWeight: "400" as const, letterSpacing: -0.24 },
  footnote: { fontSize: 13, fontWeight: "400" as const, letterSpacing: -0.08 },
  caption1: { fontSize: 12, fontWeight: "400" as const, letterSpacing: 0 },
  caption2: { fontSize: 11, fontWeight: "400" as const, letterSpacing: 0.07 },
  display1: { fontSize: 72, fontWeight: "800" as const, letterSpacing: -2 },
  display2: { fontSize: 52, fontWeight: "800" as const, letterSpacing: -1.5 },
  display3: { fontSize: 36, fontWeight: "700" as const, letterSpacing: -1 },
  display4: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },

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
    heading: 20,
  },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    semiBold: "600" as const,
    bold: "700" as const,
    heavy: "800" as const,
  },
} as const;

/* ───────────────────────── SPACING ───────────────────────── */
// 4px baseline grid — all multiples of 4

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenPadding: 20,   // Standard gutter for all screens
  cardGap: 16,         // Gap between cards
} as const;

/* ───────────────────────── RADIUS ────────────────────────── */

export const Radius = {
  sm: 8,               // Tags, badges
  md: 12,              // Buttons, input fields
  lg: 16,              // Small cards
  xl: 20,              // Medium cards
  xxl: 24,             // Main feature cards
  full: 999,           // Pills, avatars
} as const;

// Backward compatibility
export const BorderRadius = Radius;

/* ───────────────────────── SHADOWS ───────────────────────── */
// Subtle — shadow color #000 at very low opacity per Gemini spec

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
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
 *   > -1  → success (Sage Green)
 *   > -2  → warning (Amber Glow)
 *   ≤ -2  → danger  (Soft Rose)
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
 *   Low    → success (Sage Green)
 *   Medium → warning (Amber Glow)
 *   High   → danger  (Soft Rose)
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
