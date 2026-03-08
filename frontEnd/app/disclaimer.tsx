import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

export default function DisclaimerScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = () => {
    setIsLoading(true);
    // Direct navigation - disclaimer shown once per session
    router.replace('/(tabs)');
  };

  const handleCancel = () => {
    Alert.alert(
      'Disclaimer Not Accepted',
      'You must accept the medical disclaimer to continue using this app.',
      [
        { text: 'Decline', onPress: () => {}, style: 'cancel' },
        { text: 'Read Again', onPress: () => {} },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.headerIcon}>⚠️</ThemedText>
          <ThemedText style={styles.headerTitle}>Medical AI Disclaimer</ThemedText>
        </View>

        <View style={styles.disclaimerCard}>
          <ThemedText style={styles.disclaimerText}>
            This platform provides AI-assisted developmental screening and health predictions using multimodal data analysis.
          </ThemedText>

          <ThemedText style={[styles.disclaimerText, styles.disclaimerSubText]}>
            The outputs are probabilistic estimates and may contain inaccuracies.
          </ThemedText>

          <ThemedText style={[styles.disclaimerText, styles.disclaimerSubText]}>
            This system does not replace clinical evaluation, diagnostic testing, or professional medical judgment.
          </ThemedText>

          <ThemedText style={[styles.disclaimerText, styles.disclaimerSubText]}>
            Users are strongly advised to consult licensed pediatric or medical professionals before acting on any recommendation.
          </ThemedText>

          <View style={styles.warningBox}>
            <ThemedText style={styles.warningIcon}>⚡</ThemedText>
            <ThemedText style={styles.warningText}>
              This tool is intended for informational and educational purposes only, not for medical diagnosis or treatment.
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.cancelButton, { borderColor: Colors.light.error }]}
          onPress={handleCancel}
          disabled={isLoading}
        >
          <ThemedText style={[styles.cancelButtonText, { color: Colors.light.error }]}>
            Cancel
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.acceptButton, { backgroundColor: Colors.light.success }]}
          onPress={handleAccept}
          disabled={isLoading}
        >
          <ThemedText style={styles.acceptButtonText}>
            {isLoading ? 'Accepting...' : 'Accept & Continue'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: Spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  headerIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: '#1F2933',
    textAlign: 'center',
  },
  disclaimerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  disclaimerText: {
    fontSize: Typography.sizes.md,
    lineHeight: 24,
    color: '#1F2933',
    marginBottom: Spacing.lg,
    fontWeight: Typography.weights.medium,
  },
  disclaimerSubText: {
    fontWeight: Typography.weights.regular,
    color: '#6B7280',
    marginBottom: Spacing.md,
  },
  warningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.error,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  warningIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    color: Colors.light.error,
    fontWeight: Typography.weights.medium,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: '#F8F9FA',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semiBold,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semiBold,
  },
});
