import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

const { width: screenWidth } = Dimensions.get('window');

export default function AdvancedTestingScreen() {
  const router = useRouter();
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const shadowColor = useThemeColor({}, 'cardShadow');

  const testingModes = [
    {
      id: 'audio-only',
      title: 'Audio Analysis Only',
      description: 'Analyze cry sounds using audio AI',
      icon: '🎤',
      color: Colors.light.primary,
      route: '/cry-translator-simple',
      features: [
        'Advanced audio processing',
        'Cry pattern recognition',
        'Sound wave analysis',
        'Historical audio data',
      ],
    },
    {
      id: 'face-only',
      title: 'Facial Analysis Only',
      description: 'Detect distress through facial expressions',
      icon: '📸',
      color: Colors.light.accent,
      route: '/cry-translator-simple',
      features: [
        'Facial expression mapping',
        'Pain indicator detection',
        'Visual distress analysis',
        'Face landmark tracking',
      ],
    },
    {
      id: 'fusion',
      title: 'Fusion Analysis',
      description: 'Combined audio and visual analysis',
      icon: '🧠',
      color: Colors.light.warning,
      route: '/cry-translator-simple',
      features: [
        'Multi-modal AI analysis',
        'Cross-validation algorithms',
        'Enhanced accuracy',
        'Comprehensive insights',
      ],
    },
    {
      id: 'research',
      title: 'Research Mode',
      description: 'Detailed analytics and raw data',
      icon: '📊',
      color: Colors.light.error,
      route: '/cry-translator-simple',
      features: [
        'Raw model outputs',
        'Confidence scores',
        'Feature extraction data',
        'Debug information',
      ],
    },
  ];

  const handleModeSelect = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <ThemedText style={[styles.backText, { color: Colors.light.primary }]}>
              ← Back
            </ThemedText>
          </Pressable>

          <ThemedText style={[styles.title, { color: textColor }]}>
            Advanced Testing
          </ThemedText>
          
          <ThemedText style={[styles.subtitle, { color: secondaryText }]}>
            Professional analysis tools for detailed insights
          </ThemedText>
        </View>

        {/* Testing Modes */}
        <View style={styles.modesContainer}>
          {testingModes.map((mode) => (
            <Pressable
              key={mode.id}
              style={[styles.modeCard, { backgroundColor: cardBackground, shadowColor }]}
              onPress={() => handleModeSelect(mode.route)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${mode.color}15` }]}>
                  <ThemedText style={styles.modeIcon}>{mode.icon}</ThemedText>
                </View>
                
                <View style={styles.titleContainer}>
                  <ThemedText style={[styles.modeTitle, { color: textColor }]}>
                    {mode.title}
                  </ThemedText>
                  <ThemedText style={[styles.modeDescription, { color: secondaryText }]}>
                    {mode.description}
                  </ThemedText>
                </View>

                <View style={[styles.chevron, { borderColor: mode.color }]}>
                  <ThemedText style={[styles.chevronText, { color: mode.color }]}>
                    →
                  </ThemedText>
                </View>
              </View>

              <View style={styles.featuresContainer}>
                {mode.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <View style={[styles.featureDot, { backgroundColor: mode.color }]} />
                    <ThemedText style={[styles.featureText, { color: secondaryText }]}>
                      {feature}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimerCard, { backgroundColor: cardBackground, shadowColor }]}>
          <View style={styles.disclaimerHeader}>
            <ThemedText style={styles.disclaimerIcon}>⚠️</ThemedText>
            <ThemedText style={[styles.disclaimerTitle, { color: textColor }]}>
              Research & Development Tools
            </ThemedText>
          </View>
          
          <ThemedText style={[styles.disclaimerText, { color: secondaryText }]}>
            These advanced testing modes are intended for research purposes and professional analysis. 
            For everyday use, we recommend the main Smart Analysis feature which provides the most 
            user-friendly and accurate results.
          </ThemedText>
          
          <ThemedText style={[styles.disclaimerNote, { color: secondaryText }]}>
            Results should not be used as a substitute for professional medical advice.
          </ThemedText>
        </View>

        {/* Technical Info */}
        <View style={[styles.techCard, { backgroundColor: cardBackground, shadowColor }]}>
          <ThemedText style={[styles.techTitle, { color: textColor }]}>
            Technical Specifications
          </ThemedText>
          
          <View style={styles.techSpecs}>
            <View style={styles.specRow}>
              <ThemedText style={[styles.specLabel, { color: secondaryText }]}>
                Audio Processing:
              </ThemedText>
              <ThemedText style={[styles.specValue, { color: textColor }]}>
                44.1kHz, CNN Model
              </ThemedText>
            </View>
            
            <View style={styles.specRow}>
              <ThemedText style={[styles.specLabel, { color: secondaryText }]}>
                Facial Analysis:
              </ThemedText>
              <ThemedText style={[styles.specValue, { color: textColor }]}>
                MediaPipe, 468 landmarks
              </ThemedText>
            </View>
            
            <View style={styles.specRow}>
              <ThemedText style={[styles.specLabel, { color: secondaryText }]}>
                Model Accuracy:
              </ThemedText>
              <ThemedText style={[styles.specValue, { color: textColor }]}>
                87% validation accuracy
              </ThemedText>
            </View>
            
            <View style={styles.specRow}>
              <ThemedText style={[styles.specLabel, { color: secondaryText }]}>
                Processing Time:
              </ThemedText>
              <ThemedText style={[styles.specValue, { color: textColor }]}>
                &lt; 3 seconds average
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  backText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  title: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    lineHeight: 22,
  },
  modesContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  modeCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  modeIcon: {
    fontSize: 22,
  },
  titleContainer: {
    flex: 1,
  },
  modeTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semiBold,
    marginBottom: Spacing.xs,
  },
  modeDescription: {
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 16,
    fontWeight: Typography.weights.semiBold,
  },
  featuresContainer: {
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.md,
  },
  featureText: {
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  disclaimerCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  disclaimerIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  disclaimerTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semiBold,
  },
  disclaimerText: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  disclaimerNote: {
    fontSize: Typography.sizes.xs,
    fontStyle: 'italic',
  },
  techCard: {
    margin: Spacing.lg,
    marginTop: 0,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  techTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semiBold,
    marginBottom: Spacing.lg,
  },
  techSpecs: {
    gap: Spacing.md,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specLabel: {
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  specValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    textAlign: 'right',
  },
});