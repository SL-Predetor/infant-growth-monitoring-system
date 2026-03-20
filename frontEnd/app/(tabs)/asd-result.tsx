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

const RISK_COLOR_MAP: Record<string, string> = {
  green:  '#34C759',
  orange: '#FF9500',
  red:    '#FF3B30',
};

const RISK_BG_MAP: Record<string, string> = {
  green:  '#F0FFF4',
  orange: '#FFF9F0',
  red:    '#FFF1F0',
};

const RISK_BORDER_MAP: Record<string, string> = {
  green:  '#C3F0C8',
  orange: '#FFE0B2',
  red:    '#FFD6D3',
};

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

  const pFacial       = parseFloat(params.p_facial   ?? '0');
  const pQchat        = parseFloat(params.p_qchat    ?? '0');
  const qchatScore    = parseInt(params.qchat_score  ?? '0', 10);
  const fusedProb     = parseFloat(params.fused_prob ?? '0');
  const riskLevel     = params.risk_level     ?? 'Low';
  const riskColorKey  = params.risk_color     ?? 'green';
  const recommendation = params.recommendation ?? '';
  const qchatLabel    = params.qchat_label    ?? 'Low ASD Risk';
  const facialLabel   = params.facial_label   ?? 'Low ASD Risk';

  const accent     = RISK_COLOR_MAP[riskColorKey]  ?? '#34C759';
  const bannerBg   = RISK_BG_MAP[riskColorKey]     ?? '#F0FFF4';
  const bannerBorder = RISK_BORDER_MAP[riskColorKey] ?? '#C3F0C8';

  const isHighRisk = riskLevel === 'High';
  const isMod      = riskLevel === 'Moderate';
  const riskEmoji  = isHighRisk ? '⚠️' : isMod ? '⚠️' : '✅';

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
          <Text style={styles.headerTitle}>AI Screening Result</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Risk banner */}
        <View style={[styles.riskBanner, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
          <View>
            <Text style={[styles.riskLevel, { color: accent }]}>{riskLevel} Risk</Text>
            <Text style={styles.riskSub}>Multi-signal ASD assessment</Text>
          </View>
          <Text style={styles.riskEmoji}>{riskEmoji}</Text>
        </View>

        {/* Fused score — main result */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>FUSED AI SCORE</Text>
          <Text style={[styles.fusedValue, { color: accent }]}>
            {(fusedProb * 100).toFixed(1)}%
          </Text>
          <Text style={styles.fusedNote}>
            Weighted: 15% facial · 85% questionnaire
          </Text>
        </View>

        {/* Two sub-scores */}
        <View style={styles.rowCards}>
          {/* Facial */}
          <View style={[styles.subCard, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.cardLabel}>FACIAL AI</Text>
            <Text style={[styles.subValue, { color: pFacial >= 0.06 ? '#FF3B30' : '#34C759' }]}>
              {(pFacial * 100).toFixed(1)}%
            </Text>
            <Text style={styles.subLabel}>{facialLabel}</Text>
          </View>

          {/* Q-CHAT */}
          <View style={[styles.subCard, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.cardLabel}>Q-CHAT-10</Text>
            <Text style={[styles.subValue, { color: pQchat >= 0.35 ? '#FF3B30' : '#34C759' }]}>
              {(pQchat * 100).toFixed(1)}%
            </Text>
            <Text style={styles.subLabel}>{qchatLabel}</Text>
          </View>
        </View>

        {/* Q-CHAT score boxes */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Q-CHAT-10 SCORE</Text>
          <View style={styles.scoreBoxRow}>
            {Array.from({ length: 10 }, (_, i) => {
              const filled = i < qchatScore;
              const danger = i >= 3;
              return (
                <View
                  key={i}
                  style={[
                    styles.scoreBox,
                    filled && danger  && styles.scoreBoxDanger,
                    filled && !danger && styles.scoreBoxSafe,
                    !filled           && styles.scoreBoxEmpty,
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.scoreNumRow}>
            <Text style={[styles.scoreNum, { color: qchatScore >= 3 ? '#FF3B30' : '#34C759' }]}>
              {qchatScore}
            </Text>
            <Text style={styles.scoreMax}> / 10</Text>
          </View>
          <Text style={styles.scoreNote}>
            Scores of <Text style={{ fontWeight: '700' }}>3 or above</Text> indicate possible ASD indicators
          </Text>
        </View>

        {/* Recommendation */}
        <View style={[styles.recCard, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
          <Text style={styles.recTitle}>
            {isHighRisk ? '🏥  Consult a Specialist' : isMod ? '👨‍⚕️  Discuss with Pediatrician' : '✅  No Significant Indicators'}
          </Text>
          {recommendation ? (
            <Text style={styles.recBody}>{recommendation}</Text>
          ) : isHighRisk ? (
            <Text style={styles.recBody}>
              Your child's multi-signal assessment suggests indicators that warrant professional evaluation.{'\n\n'}
              Please schedule an appointment with a{' '}
              <Text style={{ fontWeight: '700' }}>pediatric developmental specialist</Text> or{' '}
              <Text style={{ fontWeight: '700' }}>child psychiatrist</Text>.
            </Text>
          ) : isMod ? (
            <Text style={styles.recBody}>
              Some indicators were detected. Discuss the results with your child's pediatrician at the next visit and monitor developmental milestones closely.
            </Text>
          ) : (
            <Text style={styles.recBody}>
              Your child's responses do not indicate concern at this time. Continue monitoring developmental milestones and attend regular pediatric checkups.
            </Text>
          )}

          {isHighRisk && (
            <View style={styles.recSteps}>
              {[
                '1. Contact your child\'s pediatrician',
                '2. Request a developmental assessment referral',
                '3. Early intervention is highly effective — act promptly',
              ].map((step, i) => (
                <Text key={i} style={styles.recStep}>{step}</Text>
              ))}
            </View>
          )}

          <Text style={styles.disclaimer}>
            This is a screening tool, not a diagnosis. A qualified clinician must perform a formal evaluation.
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.push('/(tabs)/behavior')}
        >
          <Text style={styles.doneBtnText}>Done</Text>
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
  riskLevel: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  riskSub:   { fontSize: 13, color: '#6E6E73', marginTop: 2 },
  riskEmoji: { fontSize: 32 },

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
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  fusedValue: { fontSize: 52, fontWeight: '700', letterSpacing: -1.5, marginBottom: 4 },
  fusedNote:  { fontSize: 13, color: '#8E8E93' },

  rowCards: { flexDirection: 'row', marginBottom: 14 },
  subCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  subValue: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4 },
  subLabel: { fontSize: 12, color: '#6E6E73' },

  scoreBoxRow:  { flexDirection: 'row', gap: 5, marginBottom: 14 },
  scoreBox:     { flex: 1, height: 10, borderRadius: 5 },
  scoreBoxDanger: { backgroundColor: '#FF3B30' },
  scoreBoxSafe:   { backgroundColor: '#34C759' },
  scoreBoxEmpty:  { backgroundColor: '#E5E5EA' },
  scoreNumRow:  { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  scoreNum:     { fontSize: 42, fontWeight: '700', letterSpacing: -1 },
  scoreMax:     { fontSize: 20, color: '#8E8E93' },
  scoreNote:    { fontSize: 13, color: '#6E6E73', lineHeight: 18 },

  recCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  recTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 12 },
  recBody:  { fontSize: 15, color: '#3A3A3C', lineHeight: 24, marginBottom: 16 },
  recSteps: { marginBottom: 14 },
  recStep:  { fontSize: 14, color: '#3A3A3C', lineHeight: 24 },
  disclaimer: { fontSize: 12, color: '#8E8E93', lineHeight: 18, fontStyle: 'italic' },

  doneBtn: {
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
