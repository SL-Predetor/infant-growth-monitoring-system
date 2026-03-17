import React, { useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export default function FeedbackModal({ visible, onClose, onSubmit }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
      setSubmitted(true);
    } catch {
      // parent handles the error alert
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.card}>
          {submitted ? (
            /* ── Thank-you state ── */
            <View style={styles.thankYouContainer}>
              <ThemedText style={styles.thankYouEmoji}>🎉</ThemedText>
              <ThemedText style={styles.thankYouTitle}>Thank You!</ThemedText>
              <ThemedText style={styles.thankYouBody}>
                Your feedback helps us improve predictions.
              </ThemedText>
              <Pressable style={styles.doneButton} onPress={handleClose}>
                <ThemedText style={styles.doneButtonText}>Done</ThemedText>
              </Pressable>
            </View>
          ) : (
            /* ── Rating form ── */
            <>
              <ThemedText style={styles.title}>Rate This Prediction</ThemedText>
              <ThemedText style={styles.subtitle}>
                How accurate was the analysis?
              </ThemedText>

              {/* Stars */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    hitSlop={8}
                    style={styles.starButton}
                  >
                    <ThemedText
                      style={[
                        styles.starIcon,
                        { color: star <= rating ? '#FFBB38' : '#D1D5DB' },
                      ]}
                    >
                      ★
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {rating > 0 && (
                <ThemedText style={styles.ratingLabel}>
                  {STAR_LABELS[rating - 1]}
                </ThemedText>
              )}

              {/* Comment */}
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment (optional)"
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={500}
                value={comment}
                onChangeText={setComment}
                textAlignVertical="top"
              />

              {/* Buttons */}
              <View style={styles.buttonsRow}>
                <Pressable
                  style={styles.skipButton}
                  onPress={handleClose}
                  disabled={submitting}
                >
                  <ThemedText style={styles.skipButtonText}>Skip</ThemedText>
                </Pressable>

                <Pressable
                  style={[
                    styles.submitButton,
                    rating === 0 && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={rating === 0 || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <ThemedText style={styles.submitButtonText}>
                      Submit
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '88%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: '#1F2937',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: '#6B7280',
    marginBottom: Spacing.lg,
  },

  /* Stars */
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  starButton: {
    padding: 4,
  },
  starIcon: {
    fontSize: 36,
  },
  ratingLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.light.primary,
    marginBottom: Spacing.lg,
  },

  /* Comment */
  commentInput: {
    width: '100%',
    minHeight: 80,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.sm,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    marginBottom: Spacing.lg,
  },

  /* Buttons */
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  skipButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: '#FFFFFF',
  },

  /* Thank-you */
  thankYouContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  thankYouEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  thankYouTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: '#1F2937',
    marginBottom: Spacing.sm,
  },
  thankYouBody: {
    fontSize: Typography.sizes.sm,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  doneButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primary,
  },
  doneButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: '#FFFFFF',
  },
});
