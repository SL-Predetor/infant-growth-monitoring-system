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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

const C = Colors.light;

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const getPasswordStrength = (password: string): 'weak' | 'fair' | 'strong' => {
  if (password.length < 8) return 'weak';
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  if (password.length >= 12 && hasSpecialChar) return 'strong';
  if (password.length >= 10) return 'fair';
  return 'weak';
};

export default function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }
    if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    const { error } = await signUpWithEmail(email, password, fullName);
    if (error) {
      setErrors({ form: error.message || 'Failed to create account' });
    } else {
      router.replace('/(auth)/add-infant');
    }
    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    setErrors({});
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setErrors({ form: error.message || 'Failed to sign up with Google' });
    } else {
      router.replace('/(auth)/add-infant');
    }
    setLoading(false);
  };

  const passwordStrength = getPasswordStrength(password);

  const strengthColor = {
    weak: C.danger,
    fair: C.warning,
    strong: C.success,
  }[passwordStrength];

  const strengthWidth = {
    weak: '33%',
    fair: '66%',
    strong: '100%',
  }[passwordStrength] as `${number}%`;

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
          onPress={() => router.back()}
          disabled={loading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={20} color={C.primary} strokeWidth={2} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join TinySteps to monitor your baby's health
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {errors.form && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errors.form}</Text>
            </View>
          )}

          {/* Full Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              placeholder="Jane Doe"
              placeholderTextColor={C.labelTertiary}
              autoCapitalize="words"
              editable={!loading}
              value={fullName}
              onChangeText={setFullName}
            />
            {errors.fullName && (
              <Text style={styles.fieldError}>{errors.fullName}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="jane@example.com"
              placeholderTextColor={C.labelTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              value={email}
              onChangeText={setEmail}
            />
            {errors.email && (
              <Text style={styles.fieldError}>{errors.email}</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              {password.length > 0 && (
                <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                  {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                </Text>
              )}
            </View>
            <View style={[styles.passwordRow, errors.password && styles.inputError]}>
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

            {/* Strength Bar */}
            {password.length > 0 && (
              <View style={styles.strengthBar}>
                <View style={[styles.strengthFill, { width: strengthWidth, backgroundColor: strengthColor }]} />
              </View>
            )}

            {errors.password && (
              <Text style={styles.fieldError}>{errors.password}</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.passwordRow, errors.confirmPassword && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={C.labelTertiary}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                style={styles.eyeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showConfirmPassword
                  ? <EyeOff size={18} color={C.labelTertiary} strokeWidth={1.8} />
                  : <Eye size={18} color={C.labelTertiary} strokeWidth={1.8} />
                }
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.primaryButtonText}>Create Account</Text>
            }
          </TouchableOpacity>
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
          onPress={handleGoogleSignUp}
          disabled={true}
          activeOpacity={0.8}
        >
          <Text style={styles.ghostButtonText}>G  Available in mobile app</Text>
        </TouchableOpacity>

        {/* Sign In Link */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()} disabled={loading}>
            <Text style={styles.footerLink}>Sign In</Text>
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

  // Header
  header: {
    marginBottom: 28,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: C.label,
    marginBottom: Spacing.sm,
  },
  strengthLabel: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '600',
  },
  input: {
    backgroundColor: C.cardSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: Typography.body.fontSize,
    color: C.label,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: C.danger,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.cardSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
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
  fieldError: {
    color: C.danger,
    fontSize: Typography.caption.fontSize,
    marginTop: 4,
  },

  // Strength Bar
  strengthBar: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: Radius.full,
    marginTop: 6,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: Radius.full,
  },

  // Primary Button
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
