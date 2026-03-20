import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

const C = Colors.light;

export default function ASDScreen() {
  const router = useRouter();

  return (
    <View style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Choose a{'\n'}Screening Method</Text>
          <Text style={styles.subtitle}>
            Two approaches, pick the one that fits your situation.
          </Text>
        </View>

        {/* ── Option A: AI-Powered (featured) ── */}
        <TouchableOpacity
          style={[styles.card, styles.cardResearch]}
          activeOpacity={0.88}
          onPress={() => router.push('/(tabs)/asd-research' as any)}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.tag, styles.tagResearch]}>
              <Text style={styles.tagText}>Our Research</Text>
            </View>
          </View>

          <Text style={styles.cardTitleResearch}>AI-Powered Screening</Text>

          <Text style={[styles.cardDesc, { color: 'rgba(255,255,255,0.80)' }]}>
            Our deep learning model analyses your child's facial patterns from a
            short video — combined with a quick questionnaire, to deliver a
            multi-signal ASD probability score.
          </Text>

          <View style={styles.bullets}>
            {[
              "A short 10-second video of your child's face",
              'AI looks for early signs in facial expressions',
              'Get results instantly — no waiting',
              'The more you use it, the smarter it gets',
            ].map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bullet}>{b}</Text>
              </View>
            ))}
          </View>

          <View style={styles.startBtn}>
            <Text style={styles.startBtnText}>Begin AI Screening</Text>
          </View>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Option B: Clinical Q-CHAT-10 ── */}
        <TouchableOpacity
          style={[styles.card, styles.cardClinical]}
          activeOpacity={0.88}
          onPress={() => router.push('/(tabs)/asd-qchat' as any)}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.tag, styles.tagClinical]}>
              <Text style={[styles.tagText, { color: C.label }]}>Clinical Standard</Text>
            </View>
          </View>

          <Text style={styles.cardTitleClinical}>Q-CHAT-10 Questionnaire</Text>

          <Text style={styles.cardDesc}>
            The validated clinical screening tool used by pediatricians worldwide.
            10 simple questions answered by a parent or caregiver.
          </Text>

          <View style={styles.clinicalMeta}>
            <Text style={styles.clinicalMetaItem}>✓  Validated globally</Text>
            <Text style={styles.clinicalMetaItem}>✓  Takes ~2 minutes</Text>
            <Text style={styles.clinicalMetaItem}>✓  No camera needed</Text>
          </View>

          <View style={[styles.startBtn, styles.startBtnClinical]}>
            <Text style={[styles.startBtnText, { color: C.primary }]}>Start Questionnaire</Text>
          </View>
        </TouchableOpacity>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Both tools are screening aids only. They do not replace a clinical diagnosis by a qualified healthcare professional.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
    paddingTop: Platform.OS === 'android' ? 0 : 0,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: Platform.OS === 'ios' ? 110 : 88,
  },

  titleSection: { marginBottom: 28 },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: C.label,
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: C.labelTertiary,
    lineHeight: 22,
  },

  // ── Cards ──
  card: {
    borderRadius: Radius.xl,
    padding: 22,
    marginBottom: 16,
    ...Shadows.sm,
  },
  cardResearch: {
    backgroundColor: C.primary,
  },
  cardClinical: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  tag: {
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagResearch: { backgroundColor: C.accent },
  tagClinical: { backgroundColor: C.cardSecondary },
  tagText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  cardTitleResearch: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  cardTitleClinical: {
    fontSize: 22,
    fontWeight: '700',
    color: C.label,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  cardDesc: {
    fontSize: 15,
    lineHeight: 22,
    color: C.labelTertiary,
    marginBottom: 18,
  },

  bullets: { marginBottom: 20 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  bulletDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.70)',
    marginTop: 7, marginRight: 10,
  },
  bullet: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 26,
    flex: 1,
  },

  clinicalMeta: { marginBottom: 20 },
  clinicalMetaItem: {
    fontSize: 14,
    color: C.labelTertiary,
    lineHeight: 26,
  },

  startBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnClinical: {
    backgroundColor: C.primarySoft,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: {
    fontSize: 14,
    color: C.labelTertiary,
    marginHorizontal: 12,
  },

  disclaimer: {
    marginTop: 12,
    fontSize: 12,
    color: C.labelTertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
