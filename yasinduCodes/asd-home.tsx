import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function ASDHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Choose a{'\n'}Screening Method</Text>
          <Text style={styles.subtitle}>
            Two approaches, pick the one that fits your situation.
          </Text>
        </View>

        {/* ── Option B: Research (bigger, hook-first) ── */}
        <TouchableOpacity
          style={[styles.card, styles.cardResearch]}
          activeOpacity={0.88}
          onPress={() => router.push('/asd-research')}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.tag, styles.tagResearch]}>
              <Text style={styles.tagText}>Our Research</Text>
            </View>
            <Text style={styles.cardEmoji}> </Text>
          </View>

          <Text style={styles.cardTitleResearch}>AI-Powered Screening</Text>

          <Text style={styles.cardDesc}>
            Our deep learning model analyses your child's facial patterns from a
            short video  combined with a quick questionnaire, to deliver a  
            multi-signal ASD probability score.
          </Text>

          {/* Hook bullets */}
          <View style={styles.bullets}>
            {[
              'A short 10-second video of your child\'s face',
              'AI looks for early signs in facial expressions',
              'Get results instantly — no waiting',
              'The more you use it, the smarter it gets',
            ].map((b, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#007AFF', marginTop: 7, marginRight: 10 }} />
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

        {/* ── Option A: Clinical Q-CHAT-10 ── */}
        <TouchableOpacity
          style={[styles.card, styles.cardClinical]}
          activeOpacity={0.88}
          onPress={() => router.push('/asd-qchat')}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.tag, styles.tagClinical]}>
              <Text style={[styles.tagText, { color: '#3A3A3C' }]}>Clinical Standard</Text>
            </View>
            <Text style={styles.cardEmoji}> </Text>
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
            <Text style={[styles.startBtnText, { color: '#3A3A3C' }]}>Start Questionnaire</Text>
          </View>
        </TouchableOpacity>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Both tools are screening aids only. They do not replace a clinical diagnosis by a qualified healthcare professional.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 40,
  },
  backBtn: { marginBottom: 20 },
  backText: { fontSize: 16, color: '#007AFF', fontWeight: '500' },

  titleSection: { marginBottom: 28 },
  eyebrow: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#646363',
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#3a3a3b',
    lineHeight: 22,
  },

  // ── Cards ──
  card: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#646464',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4,
  },
  cardResearch: {
    backgroundColor: '#101150',
  },
  cardClinical: {
    backgroundColor: '#FFFFFF',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagResearch: { backgroundColor: '#007AFF' },
  tagClinical: { backgroundColor: '#E5E5EA' },
  tagText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  cardEmoji: { fontSize: 26 },

  cardTitleResearch: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e3e3e6',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  cardTitleClinical: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  cardDesc: {
    fontSize: 15,
    lineHeight: 22,
    color: '#AEAEB2',
    marginBottom: 18,
  },

  bullets: { marginBottom: 20 },
  bullet: {
    fontSize: 14,
    color: '#D1D1D6',
    lineHeight: 26,
  },

  clinicalMeta: { marginBottom: 20 },
  clinicalMetaItem: {
    fontSize: 14,
    color: '#6E6E73',
    lineHeight: 26,
  },

  startBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnClinical: {
    backgroundColor: '#F2F2F7',
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
  dividerLine: { flex: 1, height: 1, backgroundColor: '#C6C6C8' },
  dividerText: {
    fontSize: 14,
    color: '#8E8E93',
    marginHorizontal: 12,
  },

  disclaimer: {
    marginTop: 12,
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
