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
import { useRouter, useLocalSearchParams } from 'expo-router';

type RiskLevel = 'High' | 'Moderate' | 'Low';

const RISK_COLORS: Record<RiskLevel, { bg: string; border: string; text: string }> = {
  High:     { bg: '#FFF1F0', border: '#FF3B30', text: '#FF3B30' },
  Moderate: { bg: '#FFF8F0', border: '#FF9500', text: '#FF9500' },
  Low:      { bg: '#F0FFF4', border: '#34C759', text: '#34C759' },
};

const RISK_EMOJIS: Record<RiskLevel, string> = {
  High:     '⚠️',
  Moderate: '🔶',
  Low:      '✅',
};

function ProbabilityBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${Math.min(value * 100, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { height: 8, backgroundColor: '#E5E5EA', borderRadius: 4, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 4 },
});

export default function ASDResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    p_facial:       string;
    p_qchat:        string;
    qchat_score:    string;
    fused_prob:     string;
    risk_level:     string;
    risk_color:     string;
    recommendation: string;
    qchat_label:    string;
    facial_label:   string;
  }>();

  const p_facial    = parseFloat(params.p_facial    ?? '0');
  const p_qchat     = parseFloat(params.p_qchat     ?? '0');
  const qchat_score = parseInt(params.qchat_score   ?? '0', 10);
  const fused_prob  = parseFloat(params.fused_prob  ?? '0');
  const risk_level  = (params.risk_level ?? 'Low') as RiskLevel;
  const recommendation = params.recommendation ?? '';

  const riskStyle = RISK_COLORS[risk_level] ?? RISK_COLORS['Low'];
  const riskEmoji = RISK_EMOJIS[risk_level] ?? '✅';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Screening Result</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* ── Main risk banner ── */}
        <View style={[styles.riskBanner, { backgroundColor: riskStyle.bg, borderColor: riskStyle.border }]}>
          <View>
            <Text style={styles.riskBannerEyebrow}>Overall Risk</Text>
            <Text style={[styles.riskBannerLevel, { color: riskStyle.text }]}>{risk_level} Risk</Text>
            <Text style={[styles.riskBannerProb, { color: riskStyle.text }]}>
              {(fused_prob * 100).toFixed(1)}% ASD probability
            </Text>
          </View>
          <Text style={styles.riskEmoji}>{riskEmoji}</Text>
        </View>

        {/* ── Signal breakdown ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Signal Breakdown</Text>

          {/* Q-CHAT score bar */}
          <View style={styles.signalRow}>
            <View style={styles.signalHeader}>
              <Text style={styles.signalLabel}>Q-CHAT-10 Score</Text>
              <Text style={[styles.signalValue, {
                color: qchat_score >= 3 ? '#FF3B30' : '#34C759',
              }]}>
                {qchat_score} / 10
              </Text>
            </View>

            {/* Score boxes */}
            <View style={styles.scoreBoxRow}>
              {Array.from({ length: 10 }, (_, i) => {
                const filled = i < qchat_score;
                const danger = i >= 3;
                return (
                  <View
                    key={i}
                    style={[
                      styles.scoreBox,
                      filled && danger  && { backgroundColor: '#FF3B30' },
                      filled && !danger && { backgroundColor: '#34C759' },
                      !filled           && { backgroundColor: '#E5E5EA' },
                    ]}
                  />
                );
              })}
            </View>

            <Text style={styles.signalNote}>Threshold: 3+</Text>
          </View>

          <View style={styles.divider} />

          {/* Q-CHAT AI probability */}
          <View style={styles.signalRow}>
            <View style={styles.signalHeader}>
              <Text style={styles.signalLabel}>Questionnaire AI Score</Text>
              <Text style={styles.signalValue}>{(p_qchat * 100).toFixed(1)}%</Text>
            </View>
            <ProbabilityBar value={p_qchat} color="#007AFF" />
            <Text style={styles.signalNote}>Weight: 85% of final score</Text>
          </View>

          <View style={styles.divider} />

          {/* Facial video probability */}
          <View style={styles.signalRow}>
            <View style={styles.signalHeader}>
              <Text style={styles.signalLabel}>Facial Video AI Score</Text>
              <Text style={styles.signalValue}>{(p_facial * 100).toFixed(1)}%</Text>
            </View>
            <ProbabilityBar value={p_facial} color="#5856D6" />
            <Text style={styles.signalNote}>Weight: 15% of final score</Text>
          </View>

          <View style={styles.divider} />

          {/* Fused score */}
          <View style={styles.signalRow}>
            <View style={styles.signalHeader}>
              <Text style={[styles.signalLabel, { fontWeight: '700' }]}>Fused AI Probability</Text>
              <Text style={[styles.signalValue, { color: riskStyle.text, fontWeight: '700' }]}>
                {(fused_prob * 100).toFixed(1)}%
              </Text>
            </View>
            <ProbabilityBar value={fused_prob} color={riskStyle.text} />
            <Text style={styles.signalNote}>α = 0.15 (facial) + 0.85 (Q-CHAT)</Text>
          </View>
        </View>

        {/* ── Recommendation ── */}
        <View style={[styles.recCard, { backgroundColor: riskStyle.bg, borderColor: riskStyle.border }]}>
          <Text style={[styles.recTitle, { color: riskStyle.text }]}>
            {risk_level === 'High' ? '🏥  Seek Clinical Assessment' :
             risk_level === 'Moderate' ? '👨‍⚕️  Discuss with Pediatrician' :
             '✅  Continue Monitoring'}
          </Text>
          <Text style={styles.recBody}>{recommendation}</Text>

          {risk_level === 'High' && (
            <View style={styles.clinicSteps}>
              {[
                'Contact your child\'s pediatrician today',
                'Request a developmental specialist referral',
                'Early intervention has the highest impact',
              ].map((step, i) => (
                <Text key={i} style={styles.clinicStep}>• {step}</Text>
              ))}
            </View>
          )}
        </View>

        {/* ── Research context ── */}
        <View style={styles.researchNote}>
          <Text style={styles.researchNoteTitle}>About This Model</Text>
          <Text style={styles.researchNoteBody}>
            Facial analysis: VGG-Face CNN (AUC 0.9032) → LogReg probe, trained on clinical datasets.{'\n'}
            Questionnaire: XGBoost (AUC 0.9769), trained on Q-CHAT-10 parent responses.{'\n'}
            Fusion: α-weighted (α=0.15), optimised via Monte-Carlo simulation (fused AUC=0.9994).
          </Text>
        </View>

        {/* ── Disclaimer ── */}
        <Text style={styles.disclaimer}>
          This is a research screening tool, not a clinical diagnosis. Always consult a qualified healthcare professional for formal assessment.
        </Text>

        {/* ── Actions ── */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.push('/(tabs)/behavior')}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => router.push('/asd-research')}
        >
          <Text style={styles.retakeBtnText}>Retake Screening</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#F2F2F7' },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backText:    { fontSize: 16, color: '#007AFF', fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#000' },

  // Risk banner
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 14,
  },
  riskBannerEyebrow: { fontSize: 12, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  riskBannerLevel:   { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginBottom: 2 },
  riskBannerProb:    { fontSize: 15, fontWeight: '500' },
  riskEmoji:         { fontSize: 44 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },

  signalRow:    { marginBottom: 4 },
  signalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  signalLabel:  { fontSize: 15, color: '#3A3A3C', fontWeight: '500' },
  signalValue:  { fontSize: 15, color: '#000', fontWeight: '600' },
  signalNote:   { fontSize: 12, color: '#8E8E93', marginTop: 6 },

  scoreBoxRow: { flexDirection: 'row', gap: 5, marginBottom: 2 },
  scoreBox:    { flex: 1, height: 8, borderRadius: 4 },

  divider: { height: 1, backgroundColor: '#F2F2F7', marginVertical: 14 },

  // Recommendation card
  recCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 14,
  },
  recTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  recBody:  { fontSize: 15, color: '#3A3A3C', lineHeight: 24, marginBottom: 12 },
  clinicSteps: { marginTop: 4 },
  clinicStep:  { fontSize: 14, color: '#3A3A3C', lineHeight: 26 },

  // Research note
  researchNote: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  researchNoteTitle: { fontSize: 13, fontWeight: '700', color: '#6E6E73', marginBottom: 6 },
  researchNoteBody:  { fontSize: 12, color: '#8E8E93', lineHeight: 18 },

  disclaimer: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 4,
    fontStyle: 'italic',
  },

  doneBtn: {
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  doneBtnText:  { fontSize: 16, fontWeight: '600', color: '#FFF' },
  retakeBtn:    { alignItems: 'center', paddingVertical: 8 },
  retakeBtnText:{ fontSize: 15, color: '#007AFF', fontWeight: '500' },
});
