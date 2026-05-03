import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  ShieldCheck,
  AlertTriangle,
  Stethoscope,
  Hospital,
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';

const C = Colors.light;

/* Map backend risk_color → theme semantic palette */
const RISK_PALETTE: Record<string, { fg: string; soft: string; border: string }> = {
  green:  { fg: C.success, soft: C.successSoft, border: 'rgba(130,167,136,0.35)' },
  orange: { fg: C.warning, soft: C.warningSoft, border: 'rgba(230,168,85,0.35)' },
  red:    { fg: C.danger,  soft: C.dangerSoft,  border: 'rgba(214,118,118,0.35)' },
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

  const pFacial        = parseFloat(params.p_facial   ?? '0');
  const pQchat         = parseFloat(params.p_qchat    ?? '0');
  const qchatScore     = parseInt(params.qchat_score  ?? '0', 10);
  const fusedProb      = parseFloat(params.fused_prob ?? '0');
  const riskLevel      = params.risk_level     ?? 'Low';
  const riskColorKey   = params.risk_color     ?? 'green';
  const recommendation = params.recommendation ?? '';
  const qchatLabel     = params.qchat_label    ?? 'Low ASD Risk';
  const facialLabel    = params.facial_label   ?? 'Low ASD Risk';

  const palette    = RISK_PALETTE[riskColorKey] ?? RISK_PALETTE.green;
  const isHighRisk = riskLevel === 'High';
  const isMod      = riskLevel === 'Moderate';

  const RiskIcon     = isHighRisk || isMod ? AlertTriangle : ShieldCheck;
  const facialDanger = pFacial >= 0.06;
  const qchatDanger  = pQchat  >= 0.35;

  // Android hardware back → return to ASD home, not the previous tab.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace('/(tabs)/asd-screen' as any);
        return true;
      });
      return () => sub.remove();
    }, [router])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.replace('/(tabs)/asd-screen' as any)}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={C.label} />
        </Pressable>
        <Text style={styles.headerTitle}>Screening Result</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Risk banner — hero */}
        <View style={[styles.riskBanner, { backgroundColor: palette.soft, borderColor: palette.border }]}>
          <View style={styles.riskBannerLeft}>
            <Text style={[styles.riskLevel, { color: palette.fg }]}>
              {riskLevel} Risk
            </Text>
            <Text style={styles.riskSub}>Multi-signal ASD assessment</Text>
          </View>
          <View style={[styles.riskIconWrap, { backgroundColor: palette.fg }]}>
            <RiskIcon size={26} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </View>

        {/* Fused — main score */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Fused AI Score</Text>
          <Text style={[styles.fusedValue, { color: palette.fg }]}>
            {(fusedProb * 100).toFixed(1)}%
          </Text>
          <Text style={styles.fusedNote}>
            Weighted blend · 15% facial · 85% questionnaire
          </Text>
        </View>

        {/* Two sub-scores */}
        <View style={styles.rowCards}>
          <View style={[styles.subCard, { marginRight: Spacing.sm }]}>
            <Text style={styles.cardLabel}>Facial AI</Text>
            <Text style={[styles.subValue, { color: facialDanger ? C.danger : C.success }]}>
              {(pFacial * 100).toFixed(1)}%
            </Text>
            <Text style={styles.subLabel}>{facialLabel}</Text>
          </View>

          <View style={[styles.subCard, { marginLeft: Spacing.sm }]}>
            <Text style={styles.cardLabel}>Q-CHAT-10</Text>
            <Text style={[styles.subValue, { color: qchatDanger ? C.danger : C.success }]}>
              {(pQchat * 100).toFixed(1)}%
            </Text>
            <Text style={styles.subLabel}>{qchatLabel}</Text>
          </View>
        </View>

        {/* Q-CHAT score breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Q-CHAT-10 Score</Text>

          <View style={styles.scoreBoxRow}>
            {Array.from({ length: 10 }, (_, i) => {
              const filled = i < qchatScore;
              const danger = i >= 3;
              return (
                <View
                  key={i}
                  style={[
                    styles.scoreBox,
                    !filled           && { backgroundColor: C.cardTertiary },
                    filled && danger  && { backgroundColor: C.danger },
                    filled && !danger && { backgroundColor: C.success },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.scoreNumRow}>
            <Text style={[styles.scoreNum, { color: qchatScore >= 3 ? C.danger : C.success }]}>
              {qchatScore}
            </Text>
            <Text style={styles.scoreMax}> / 10</Text>
          </View>

          <Text style={styles.scoreNote}>
            Scores of <Text style={{ fontWeight: '700', color: C.label }}>3 or above</Text> indicate possible ASD indicators
          </Text>
        </View>

        {/* Recommendation */}
        <View style={[styles.recCard, { backgroundColor: palette.soft, borderColor: palette.border }]}>
          <View style={styles.recTitleRow}>
            <View style={[styles.recIconWrap, { backgroundColor: palette.fg }]}>
              {isHighRisk ? (
                <Hospital size={18} color="#FFFFFF" strokeWidth={2.2} />
              ) : isMod ? (
                <Stethoscope size={18} color="#FFFFFF" strokeWidth={2.2} />
              ) : (
                <ShieldCheck size={18} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </View>
            <Text style={styles.recTitle}>
              {isHighRisk ? 'Consult a Specialist' : isMod ? 'Discuss with Pediatrician' : 'No Significant Indicators'}
            </Text>
          </View>

          {recommendation ? (
            <Text style={styles.recBody}>{recommendation}</Text>
          ) : isHighRisk ? (
            <Text style={styles.recBody}>
              Your child's multi-signal assessment suggests indicators that warrant professional evaluation.{'\n\n'}
              Please schedule an appointment with a{' '}
              <Text style={styles.recEmphasis}>pediatric developmental specialist</Text> or{' '}
              <Text style={styles.recEmphasis}>child psychiatrist</Text>.
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
                "Contact your child's pediatrician",
                'Request a developmental assessment referral',
                'Early intervention is highly effective — act promptly',
              ].map((step, i) => (
                <View key={i} style={styles.recStepRow}>
                  <View style={[styles.recStepDot, { backgroundColor: palette.fg }]}>
                    <Text style={styles.recStepNum}>{i + 1}</Text>
                  </View>
                  <Text style={styles.recStep}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.disclaimer}>
            This is a screening tool, not a diagnosis. A qualified clinician must perform a formal evaluation.
          </Text>
        </View>

        {/* Done */}
        <Pressable
          style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.replace('/(tabs)/asd-screen' as any)}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─────────────────────────── styles ─────────────────────────── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xxxl,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.headline,
    color: C.label,
  },

  /* Risk banner */
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.xxl,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.cardGap,
  },
  riskBannerLeft: { flex: 1 },
  riskLevel: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  riskSub: {
    ...Typography.footnote,
    color: C.labelTertiary,
    marginTop: 2,
  },
  riskIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Cards */
  card: {
    backgroundColor: C.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.cardGap,
    ...Shadows.sm,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.labelTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  fusedValue: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1.8,
    marginBottom: 4,
  },
  fusedNote: {
    ...Typography.footnote,
    color: C.labelTertiary,
  },

  /* Sub-score row */
  rowCards: {
    flexDirection: 'row',
    marginBottom: Spacing.cardGap,
  },
  subCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  subValue: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  subLabel: {
    ...Typography.caption,
    color: C.labelTertiary,
  },

  /* Q-CHAT score */
  scoreBoxRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  scoreBox: {
    flex: 1,
    height: 10,
    borderRadius: 5,
  },
  scoreNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  scoreNum: {
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1,
  },
  scoreMax: {
    fontSize: 20,
    color: C.labelTertiary,
    marginLeft: 2,
  },
  scoreNote: {
    ...Typography.footnote,
    color: C.labelTertiary,
    lineHeight: 18,
  },

  /* Recommendation */
  recCard: {
    borderRadius: Radius.xxl,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  recTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  recIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  recTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.label,
    flex: 1,
  },
  recBody: {
    fontSize: 15,
    color: C.label,
    lineHeight: 23,
    marginBottom: Spacing.lg,
  },
  recEmphasis: {
    fontWeight: '700',
    color: C.label,
  },
  recSteps: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  recStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recStepDot: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: 1,
  },
  recStepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recStep: {
    flex: 1,
    fontSize: 14,
    color: C.label,
    lineHeight: 22,
  },
  disclaimer: {
    fontSize: 12,
    color: C.labelTertiary,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  /* Done button */
  doneBtn: {
    backgroundColor: C.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
});
