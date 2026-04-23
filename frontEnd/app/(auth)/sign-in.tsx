import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

const C = Colors.light;

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { signInWithEmail, signInWithGoogle } = useAuth();

  const handleSignIn = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    const { error: signInError } = await signInWithEmail(email, password);
    if (signInError) {
      const isUnconfirmed = signInError.message?.toLowerCase().includes('not confirmed');
      if (isUnconfirmed) {
        setLoading(false);
        router.replace({ pathname: '/(auth)/check-email', params: { email } });
        return;
      }
      setError(signInError.message || 'Failed to sign in');
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const { error: googleError } = await signInWithGoogle();
    if (googleError) {
      setError(googleError.message || 'Failed to sign in with Google');
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
  };

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
        {/* Logo & Header */}
        <View style={styles.topSection}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to access your baby's health insights
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={C.labelTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={C.labelTertiary}
                secureTextEntry={!showPassword}
                editable={!loading}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={styles.eyeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showPassword
                  ? <EyeOff size={18} color={C.labelTertiary} strokeWidth={1.8} />
                  : <Eye size={18} color={C.labelTertiary} strokeWidth={1.8} />
                }
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.primaryButtonText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Forgot Password */}
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={styles.forgotContainer}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Button */}
        <TouchableOpacity
          style={[styles.ghostButton, loading && styles.disabledButton]}
          onPress={handleGoogleSignIn}
          disabled={true}
          activeOpacity={0.8}
        >
          <Text style={styles.ghostButtonText}>G  Available in mobile app</Text>
        </TouchableOpacity>

        {/* Sign Up Link */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
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
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Header
  topSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: Radius.lg,
    marginBottom: 20,
  },
  title: {
    fontSize: Typography.h1.fontSize,
    fontWeight: Typography.h1.fontWeight,
    color: C.label,
    marginBottom: 6,
    letterSpacing: Typography.h1.letterSpacing,
  },
  subtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: C.labelTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Form Card
  formCard: {
    backgroundColor: C.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  errorBanner: {
    backgroundColor: Colors.light.dangerSoft,
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

  // Fields
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: C.label,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: C.cardSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: Typography.body.fontSize,
    color: C.label,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.cardSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: Typography.body.fontSize,
    color: C.label,
  },
  eyeButton: {
    paddingLeft: Spacing.sm,
  },

  // Primary Button — pill shape
  primaryButton: {
    backgroundColor: C.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadows.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.button.fontSize,
    fontWeight: Typography.button.fontWeight,
    letterSpacing: Typography.button.letterSpacing,
  },
  disabledButton: {
    opacity: 0.55,
  },

  // Forgot Password
  forgotContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  forgotText: {
    color: C.primary,
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '500',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerLabel: {
    marginHorizontal: Spacing.md,
    fontSize: Typography.caption.fontSize,
    color: C.labelTertiary,
  },

  // Ghost Button
  ghostButton: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    backgroundColor: C.card,
  },
  ghostButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '500',
    color: C.labelTertiary,
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
