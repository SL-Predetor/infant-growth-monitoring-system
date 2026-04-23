import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

const C = Colors.light;

export default function CheckEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { resendConfirmation } = useAuth();

  const [resending, setResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    const { error } = await resendConfirmation(email);
    if (error) {
      setErrorMessage(error.message || 'Failed to resend confirmation email');
    } else {
      setSuccessMessage('Confirmation email sent');
    }
    setResending(false);
    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 3000);
  };

  const bodyText = email
    ? `We sent a confirmation link to ${email}. Click it to activate your account, then come back and sign in.`
    : 'We sent a confirmation link to your email. Click it to activate your account, then come back and sign in.';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(auth)/sign-up')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={20} color={C.primary} strokeWidth={2} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Icon Badge */}
        <View style={styles.badgeWrap}>
          <View style={styles.iconBadge}>
            <Mail size={32} color={C.primary} strokeWidth={1.8} />
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.body}>{bodyText}</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
          {successMessage && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* Primary: Go to Sign In */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(auth)/sign-in')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Go to Sign In</Text>
          </TouchableOpacity>

          {/* Secondary: Resend email */}
          <TouchableOpacity
            style={[styles.ghostButton, (resending || !email) && styles.disabledButton]}
            onPress={handleResend}
            disabled={resending || !email}
            activeOpacity={0.85}
          >
            {resending
              ? <ActivityIndicator color={C.primary} />
              : <Text style={styles.ghostButtonText}>Resend email</Text>
            }
          </TouchableOpacity>

          <Text style={styles.hint}>Didn't get it? Check your spam folder.</Text>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Wrong email? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/sign-up')}>
            <Text style={styles.footerLink}>Sign up again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 56,
    paddingBottom: 40,
  },

  // Back Button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backText: {
    color: C.primary,
    fontSize: Typography.body.fontSize,
    fontWeight: '500',
    marginLeft: 2,
  },

  // Icon Badge
  badgeWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    marginBottom: Spacing.xxl,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.h1.fontSize,
    fontWeight: Typography.h1.fontWeight,
    color: C.label,
    marginBottom: Spacing.md,
    letterSpacing: Typography.h1.letterSpacing,
    textAlign: 'center',
  },
  body: {
    fontSize: Typography.body.fontSize,
    color: C.labelTertiary,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Form Card
  formCard: {
    backgroundColor: C.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },

  // Banners
  errorBanner: {
    backgroundColor: C.dangerSoft,
    borderLeftWidth: 3,
    borderLeftColor: C.danger,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: C.danger,
    fontSize: Typography.bodySmall.fontSize,
  },
  successBanner: {
    backgroundColor: C.primarySoft,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  successText: {
    color: C.primary,
    fontSize: Typography.bodySmall.fontSize,
  },

  // Primary Button
  primaryButton: {
    backgroundColor: C.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.sm,
  },
  primaryButtonText: {
    color: C.card,
    fontSize: Typography.button.fontSize,
    fontWeight: Typography.button.fontWeight,
    letterSpacing: Typography.button.letterSpacing,
  },

  // Ghost Button
  ghostButton: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    backgroundColor: C.card,
  },
  ghostButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '500',
    color: C.primary,
  },
  disabledButton: {
    opacity: 0.55,
  },

  // Hint
  hint: {
    fontSize: Typography.caption.fontSize,
    color: C.labelTertiary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: Typography.body.fontSize,
    color: C.labelTertiary,
  },
  footerLink: {
    fontSize: Typography.body.fontSize,
    color: C.primary,
    fontWeight: '600',
  },
});
