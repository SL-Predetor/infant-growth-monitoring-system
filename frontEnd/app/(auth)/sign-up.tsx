import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

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
    weak: '#FF5252',
    fair: '#FFC107',
    strong: '#4CAF50',
  }[passwordStrength];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <ThemedText type="title" style={styles.title}>
            Create Account
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Join TinySteps to monitor your baby's health
          </ThemedText>
        </View>

        <View style={styles.formSection}>
          {errors.form && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{errors.form}</ThemedText>
            </View>
          )}

          <View style={styles.fieldContainer}>
            <ThemedText style={styles.label}>Full Name *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: '#0f1729' },
                errors.fullName && styles.inputError,
              ]}
              placeholder="Jane Doe"
              placeholderTextColor="#4a5568"
              autoCapitalize="words"
              editable={!loading}
              value={fullName}
              onChangeText={setFullName}
            />
            {errors.fullName && (
              <ThemedText style={styles.fieldError}>{errors.fullName}</ThemedText>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <ThemedText style={styles.label}>Email *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: '#0f1729' },
                errors.email && styles.inputError,
              ]}
              placeholder="jane@example.com"
              placeholderTextColor="#4a5568"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              value={email}
              onChangeText={setEmail}
            />
            {errors.email && (
              <ThemedText style={styles.fieldError}>{errors.email}</ThemedText>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.passwordLabelRow}>
              <ThemedText style={styles.label}>Password *</ThemedText>
              {password && (
                <ThemedText style={[styles.strengthLabel, { color: strengthColor }]}>
                  {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                </ThemedText>
              )}
            </View>
            <View style={[styles.passwordContainer, { backgroundColor: '#0f1729' }]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#4a5568"
                secureTextEntry={!showPassword}
                editable={!loading}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <ThemedText style={styles.toggleText}>
                  {showPassword ? 'Hide' : 'Show'}
                </ThemedText>
              </TouchableOpacity>
            </View>
            {errors.password && (
              <ThemedText style={styles.fieldError}>{errors.password}</ThemedText>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <ThemedText style={styles.label}>Confirm Password *</ThemedText>
            <View style={[styles.passwordContainer, { backgroundColor: '#0f1729' }]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#4a5568"
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                <ThemedText style={styles.toggleText}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </ThemedText>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <ThemedText style={styles.fieldError}>{errors.confirmPassword}</ThemedText>
            )}
          </View>

          <TouchableOpacity
            style={[styles.signUpButton, loading && styles.disabledButton]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.signUpButtonText}>Create Account</ThemedText>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <ThemedText style={styles.dividerText}>or continue with</ThemedText>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, loading && styles.disabledButton]}
          onPress={handleGoogleSignUp}
          disabled={true}
        >
          <ThemedText style={styles.googleButtonText}>G  Available in mobile app</ThemedText>
        </TouchableOpacity>

        <View style={styles.signInContainer}>
          <ThemedText>Already have an account? </ThemedText>
          <TouchableOpacity
            onPress={() => router.back()}
            disabled={loading}
          >
            <ThemedText style={styles.signInLink}>Sign In</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  backButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  formSection: {
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5252',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 13,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#a8b2c1',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2d4e',
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: '#FF5252',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2a2d4e',
    color: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  toggleText: {
    fontSize: 13,
    color: '#6C63FF',
    fontWeight: '600',
  },
  fieldError: {
    color: '#FF5252',
    fontSize: 12,
    marginTop: 4,
  },
  signUpButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    opacity: 0.6,
  },
  googleButton: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#2a2d4e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signInLink: {
    color: '#6C63FF',
    fontWeight: '600',
  },
});
