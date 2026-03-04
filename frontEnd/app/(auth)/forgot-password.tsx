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
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleResetPassword = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
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
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </TouchableOpacity>

        {sent ? (
          <View style={styles.successContainer}>
            <ThemedText type="title" style={styles.successTitle}>
              Check Your Email
            </ThemedText>
            <ThemedText style={styles.successMessage}>
              We've sent a password reset link to {email}. Click the link in the email to reset your password.
            </ThemedText>

            <TouchableOpacity
              style={styles.backToSignInButton}
              onPress={() => router.replace('/(auth)/sign-in')}
            >
              <ThemedText style={styles.backToSignInText}>Back to Sign In</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <ThemedText type="title" style={styles.title}>
              Reset Password
            </ThemedText>
            <ThemedText style={styles.description}>
              Enter your email address and we'll send you a link to reset your password.
            </ThemedText>

            {error && (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            <View style={styles.fieldContainer}>
              <ThemedText style={styles.label}>Email Address</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: '#0f1729' }]}
                placeholder="your@example.com"
                placeholderTextColor="#4a5568"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              style={[styles.resetButton, loading && styles.disabledButton]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.resetButtonText}>Send Reset Email</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        )}
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
    marginBottom: 24,
  },
  backButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#a8b2c1',
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
  resetButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
    lineHeight: 20,
  },
  backToSignInButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  backToSignInText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
