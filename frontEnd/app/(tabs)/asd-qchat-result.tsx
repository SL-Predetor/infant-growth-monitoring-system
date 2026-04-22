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

export default function ASDQChatResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    asd_probability: string;
    label:           string;
    qchat_score:     string;
    score_exceeded:  string;
    confidence:      string;
  }>();

  const probability    = parseFloat(params.asd_probability ?? '0');
  const qchatScore     = parseInt(params.qchat_score ?? '0', 10);
  const scoreExceeded  = params.score_exceeded === 'true';
  const confidence     = params.confidence ?? 'Low';

  const isHighRisk     = scoreExceeded || probability >= 0.35;
  const riskColor      = isHighRisk ? '#FF3B30' : '#34C759';
  const riskLabel      = isHighRisk ? 'Concern Detected' : 'Low Risk';
  const riskBg         = isHighRisk ? '#FFF1F0' : '#F0FFF4';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Q-CHAT-10 Result</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Risk banner */}
        <View style={[styles.riskBanner, { backgroundColor: riskBg, borderColor: riskColor }]}>
          <Text style={[styles.riskLabel, { color: riskColor }]}>{riskLabel}</Text>
          <Text style={[styles.riskEmoji]}>
            {isHighRisk ? '⚠️' : '✅'}
          </Text>
        </View>

        {/* Score card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreCardTitle}>Q-CHAT-10 Score</Text>

          {/* Score boxes */}
          <View style={styles.scoreBoxRow}>
            {Array.from({ length: 10 }, (_, i) => {
              const filled = i < qchatScore;
              const danger = i >= 3;
              return (
                <View
                  key={i}
                  style={[
                    styles.scoreBox,
                    filled && danger  && styles.scoreBoxFilledDanger,
                    filled && !danger && styles.scoreBoxFilledSafe,
                    !filled           && styles.scoreBoxEmpty,
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.scoreNumRow}>
            <Text style={[styles.scoreNum, { color: riskColor }]}>{qchatScore}</Text>
            <Text style={styles.scoreMax}> / 10</Text>
          </View>

          <Text style={styles.scoreThresholdNote}>
            Scores of <Text style={{ fontWeight: '700' }}>3 or above</Text> indicate possible ASD indicators
          </Text>
        </View>

        {/* AI probability card */}
        <View style={styles.probCard}>
          <Text style={styles.probCardTitle}>AI Probability Score</Text>
          <Text style={[styles.probValue, { color: riskColor }]}>
            {(probability * 100).toFixed(1)}%
          </Text>
          <Text style={styles.probConfidence}>Confidence: {confidence}</Text>
        </View>

        {/* Recommendation */}
        {isHighRisk ? (
          <View style={[styles.recCard, styles.recCardDanger]}>
            <Text style={styles.recTitle}>🏥  Consult a Specialist</Text>
            <Text style={styles.recBody}>
              Your child's responses suggest indicators that warrant professional evaluation.
              Please schedule an appointment with a{'\n'}
              <Text style={{ fontWeight: '700' }}>pediatric developmental specialist</Text> or{'\n'}
              <Text style={{ fontWeight: '700' }}>child psychiatrist</Text>.
            </Text>
            <View style={styles.recSteps}>
              {[
                '1. Contact your child\'s pediatrician',
                '2. Request a developmental assessment referral',
                '3. Early intervention is highly effective — act promptly',
              ].map((step, i) => (
                <Text key={i} style={styles.recStep}>{step}</Text>
              ))}
            </View>
            <Text style={styles.disclaimer}>
              This is a screening tool, not a diagnosis. A qualified clinician must perform a formal evaluation.
            </Text>
          </View>
        ) : (
          <View style={[styles.recCard, styles.recCardSafe]}>
            <Text style={styles.recTitle}>✅  No Significant Indicators</Text>
            <Text style={styles.recBody}>
              Your child's responses do not indicate concern at this time.
              Continue monitoring developmental milestones and attend regular pediatric checkups.
            </Text>
            <Text style={styles.disclaimer}>
              ASD screening should be repeated periodically as the child develops. This result does not rule out ASD.
            </Text>
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace('/(tabs)/asd-screen' as any)}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.researchBtn}
          onPress={() => router.push('/(tabs)/asd-research' as any)}
        >
          <Text style={styles.researchBtnText}>Try AI-Powered Screening →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backText:    { fontSize: 16, color: '#007AFF', fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#000' },

  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 16,
  },
  riskLabel: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  riskEmoji: { fontSize: 32 },

  // Score card
  scoreCard: {
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
  scoreCardTitle:  { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  scoreBoxRow:     { flexDirection: 'row', gap: 6, marginBottom: 16 },
  scoreBox:        { flex: 1, height: 10, borderRadius: 5 },
  scoreBoxFilledDanger: { backgroundColor: '#FF3B30' },
  scoreBoxFilledSafe:   { backgroundColor: '#34C759' },
  scoreBoxEmpty:        { backgroundColor: '#E5E5EA' },
  scoreNumRow:     { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  scoreNum:        { fontSize: 48, fontWeight: '700', letterSpacing: -1 },
  scoreMax:        { fontSize: 22, color: '#8E8E93' },
  scoreThresholdNote: { fontSize: 13, color: '#6E6E73', lineHeight: 18 },

  // Prob card
  probCard: {
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
  probCardTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  probValue:     { fontSize: 42, fontWeight: '700', letterSpacing: -1, marginBottom: 4 },
  probConfidence:{ fontSize: 14, color: '#6E6E73' },

  // Recommendation
  recCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  recCardDanger: { backgroundColor: '#FFF1F0', borderWidth: 1, borderColor: '#FFD6D3' },
  recCardSafe:   { backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#C3F0C8' },
  recTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 12 },
  recBody:  { fontSize: 15, color: '#3A3A3C', lineHeight: 24, marginBottom: 16 },
  recSteps: { marginBottom: 16 },
  recStep:  { fontSize: 14, color: '#3A3A3C', lineHeight: 24 },
  disclaimer: { fontSize: 12, color: '#8E8E93', lineHeight: 18, fontStyle: 'italic' },

  doneBtn: {
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  doneBtnText:    { fontSize: 16, fontWeight: '600', color: '#FFF' },
  researchBtn:    { alignItems: 'center', paddingVertical: 8 },
  researchBtnText:{ fontSize: 15, color: '#007AFF', fontWeight: '500' },
});
