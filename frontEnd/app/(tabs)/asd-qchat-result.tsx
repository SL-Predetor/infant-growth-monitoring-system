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
  Sparkles,
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';

const C = Colors.light;

const RISK_PALETTE: Record<string, { fg: string; soft: string; border: string }> = {
  green:  { fg: C.success, soft: C.successSoft, border: 'rgba(130,167,136,0.35)' },
  orange: { fg: C.warning, soft: C.warningSoft, border: 'rgba(230,168,85,0.35)' },
  red:    { fg: C.danger,  soft: C.dangerSoft,  border: 'rgba(214,118,118,0.35)' },
};

export default function ASDQChatResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    asd_probability: string;
    label:           string;
    qchat_score:     string;
    score_exceeded:  string;
    confidence:      string;
  }>();

  const probability   = parseFloat(params.asd_probability ?? '0');
  const qchatScore    = parseInt(params.qchat_score ?? '0', 10);
  const scoreExceeded = params.score_exceeded === 'true';
  const confidence    = params.confidence ?? 'Low';

  const isHighRisk = scoreExceeded || probability >= 0.35;
  const isMod      = !isHighRisk && (qchatScore >= 2 || probability >= 0.2);

  const riskLevel    = isHighRisk ? 'High' : isMod ? 'Moderate' : 'Low';
  const riskColorKey = isHighRisk ? 'red'  : isMod ? 'orange'   : 'green';
  const palette      = RISK_PALETTE[riskColorKey];

  const RiskIcon = isHighRisk || isMod ? AlertTriangle : ShieldCheck;

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
        <Text style={styles.headerTitle}>Q-CHAT-10 Result</Text>
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
            <Text style={styles.riskSub}>Q-CHAT-10 questionnaire screening</Text>
          </View>
          <View style={[styles.riskIconWrap, { backgroundColor: palette.fg }]}>
            <RiskIcon size={26} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </View>

        {/* AI probability — main score */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>AI Probability Score</Text>
          <Text style={[styles.fusedValue, { color: palette.fg }]}>
            {(probability * 100).toFixed(1)}%
          </Text>
          <Text style={styles.fusedNote}>
            Confidence · {confidence}
          </Text>
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

          {isHighRisk ? (
            <Text style={styles.recBody}>
              Your child's responses suggest indicators that warrant professional evaluation.{'\n\n'}
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
            {isHighRisk
              ? 'This is a screening tool, not a diagnosis. A qualified clinician must perform a formal evaluation.'
              : 'ASD screening should be repeated periodically as the child develops. This result does not rule out ASD.'}
          </Text>
        </View>

        {/* Done */}
        <Pressable
          style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.replace('/(tabs)/asd-screen' as any)}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>

        {/* Secondary — try full AI screening */}
        <Pressable
          style={({ pressed }) => [styles.researchBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/(tabs)/asd-research' as any)}
        >
          <Sparkles size={16} color={C.primary} strokeWidth={2.2} />
          <Text style={styles.researchBtnText}>Try AI-Powered Screening</Text>
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
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },

  /* Secondary action */
  researchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
  },
  researchBtnText: {
    fontSize: 15,
    color: C.primary,
    fontWeight: '600',
  },
});
