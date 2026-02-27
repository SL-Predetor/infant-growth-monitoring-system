import React from "react";
import { StyleSheet, View, ScrollView, Pressable, Dimensions } from "react-native";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const shadowColor = useThemeColor({}, 'cardShadow');

  const handleStartAnalysis = () => {
    router.push('/smart-cry-analysis');
  };

  const handleAdvancedTesting = () => {
    router.push('/advanced-testing');
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <ThemedText style={[styles.appTitle, { color: textColor }]}>
          BabySense AI
        </ThemedText>
        <ThemedText style={[styles.tagline, { color: secondaryText }]}>
          Understand your baby's needs instantly
        </ThemedText>
      </View>

      {/* Illustration/Hero Section */}
      <View style={[styles.heroSection, { backgroundColor: cardBackground, shadowColor }]}>
        <View style={styles.heroContent}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.light.primary }]}>
              <ThemedText style={styles.iconText}>👶</ThemedText>
            </View>
          </View>
          
          <ThemedText style={[styles.heroText, { color: secondaryText }]}>
            Advanced AI technology to help you understand{"\n"}what your baby is trying to tell you
          </ThemedText>
        </View>
      </View>

      {/* Main Action Button */}
      <Pressable 
        style={[styles.primaryButton, { shadowColor, backgroundColor: Colors.light.primary }]}
        onPress={handleStartAnalysis}
      >
        <ThemedText style={styles.buttonText}>
          Start Analysis
        </ThemedText>
      </Pressable>

      {/* Advanced Testing Link */}
      <Pressable 
        style={styles.advancedLink}
        onPress={handleAdvancedTesting}
      >
        <ThemedText style={[styles.linkText, { color: Colors.light.primary }]}>
          Advanced Testing →
        </ThemedText>
      </Pressable>

      {/* Feature highlights */}
      <View style={styles.featuresContainer}>
        <View style={[styles.featureItem, { backgroundColor: cardBackground, shadowColor }]}>
          <View style={[styles.featureIcon, { backgroundColor: 'rgba(78, 205, 196, 0.1)' }]}>
            <ThemedText style={styles.featureEmoji}>🎤</ThemedText>
          </View>
          <ThemedText style={[styles.featureTitle, { color: textColor }]}>
            Cry Analysis
          </ThemedText>
          <ThemedText style={[styles.featureDescription, { color: secondaryText }]}>
            AI-powered audio analysis
          </ThemedText>
        </View>

        <View style={[styles.featureItem, { backgroundColor: cardBackground, shadowColor }]}>
          <View style={[styles.featureIcon, { backgroundColor: 'rgba(108, 92, 231, 0.1)' }]}>
            <ThemedText style={styles.featureEmoji}>📸</ThemedText>
          </View>
          <ThemedText style={[styles.featureTitle, { color: textColor }]}>
            Facial Recognition
          </ThemedText>
          <ThemedText style={[styles.featureDescription, { color: secondaryText }]}>
            Visual distress detection
          </ThemedText>
        </View>

        <View style={[styles.featureItem, { backgroundColor: cardBackground, shadowColor }]}>
          <View style={[styles.featureIcon, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
            <ThemedText style={styles.featureEmoji}>🧠</ThemedText>
          </View>
          <ThemedText style={[styles.featureTitle, { color: textColor }]}>
            Smart Insights
          </ThemedText>
          <ThemedText style={[styles.featureDescription, { color: secondaryText }]}>
            Contextual recommendations
          </ThemedText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  appTitle: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  heroSection: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroContent: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 32,
  },
  heroText: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semiBold,
  },
  advancedLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xl,
  },
  linkText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  featureItem: {
    flex: 1,
    minWidth: 100,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  featureEmoji: {
    fontSize: 18,
  },
  featureTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semiBold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    fontSize: Typography.sizes.xs - 1,
    textAlign: 'center',
    lineHeight: 14,
  },
});