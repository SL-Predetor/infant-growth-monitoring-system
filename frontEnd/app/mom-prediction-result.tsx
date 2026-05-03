import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

const C = Colors.light;

const PAIN_CONFIG: Record<string, { label: string; emoji: string; color: string; soft: string }> = {
  perineal: {
    label: 'Perineal Pain',
    emoji: '🌸',
    color: '#E88D72',
    soft: '#FAE8E4',
  },
  csection: {
    label: 'Cesarean Wound Pain',
    emoji: '🩹',
    color: C.primary,
    soft: C.primarySoft,
  },
  back_pelvic: {
    label: 'Back & Pelvic Pain',
    emoji: '🌿',
    color: C.success,
    soft: C.successSoft,
  },
};

export default function MomPredictionResultsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const result = params.result ? JSON.parse(params.result as string) : null;
  const input = params.input ? JSON.parse(params.input as string) : null;

  const activePains = Object.entries(result?.predictions || {})
    .map(([type, value]: any) => ({ type, value }))
    .filter(({ value }) => value && value.score !== 0);

  return (
    <View style={s.container}>
      {/* ── Teal Hero Header ── */}
      <LinearGradient
        colors={[C.primary, '#4A8F98']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: Platform.OS === 'ios' ? 56 : 40 }]}
      >
        <SafeAreaView edges={[]} style={s.heroInner}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={20} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <Text style={s.heroTitle}>Recovery Insights</Text>
          <Text style={s.heroSub}>Based on your assessment</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Pain Cards ── */}
        {activePains.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Areas to focus on</Text>
            {activePains.map(({ type, value }) => {
              const cfg = PAIN_CONFIG[type] ?? { label: type, emoji: '📋', color: C.labelSecondary, soft: C.cardSecondary };
              const isHigh = value.risk === 'HIGH';
              const score = Number(value.score) || 0;
              const barPct = Math.min(100, (score / 10) * 100);
              const displayPercent = `${Math.round(barPct)}%`;

              return (
                <View key={type} style={[s.painCard, Shadows.sm]}>
                  <View style={s.painCardTop}>
                    <View style={[s.painIcon, { backgroundColor: cfg.soft }]}>
                      <Text style={{ fontSize: 22 }}>{cfg.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.painLabel}>{cfg.label}</Text>
                      <View style={[s.riskBadge, {
                        backgroundColor: isHigh ? '#FEE2E2' : '#FEF3C7',
                      }]}>
                        <Text style={[s.riskBadgeText, {
                          color: isHigh ? '#D63031' : '#B07D05',
                        }]}>
                          {isHigh ? '● Needs attention' : '● Manageable'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.scoreNum, { color: cfg.color }]}>{displayPercent}</Text>
                  </View>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${barPct}%` as any, backgroundColor: cfg.color }]} />
                  </View>
                </View>
              );
            })}
          </>
        )}

        {activePains.length === 0 && (
          <View style={s.allGoodCard}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🌸</Text>
            <Text style={s.allGoodTitle}>No active discomfort detected</Text>
            <Text style={s.allGoodSub}>Keep taking care of yourself — you're doing great!</Text>
          </View>
        )}

        {/* ── Recovery Actions ── */}
        {result?.guidance?.model_based?.length > 0 && (
          <>
            <Text style={s.sectionTitle}>What to do now</Text>
            <View style={s.guidanceCard}>
              {result.guidance.model_based.map((tip: string, i: number) => (
                <View key={i} style={s.tipRow}>
                  <View style={s.tipDot} />
                  <Text style={s.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Disclaimer ── */}
        <View style={s.disclaimerBox}>
          <Text style={s.disclaimerText}>
            ⚠️ This guidance supports recovery and does not replace professional medical advice. Always consult your doctor if you have concerns.
          </Text>
        </View>

        {/* ── Actions ── */}
        <View style={s.actionsRow}>
          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }]}
            onPress={() =>
              router.push({
                pathname: '/postpartum-dashboard',
                params: {
                  result: JSON.stringify(result),
                  input: JSON.stringify(input),
                },
              } as any)
            }
          >
            <Text style={s.primaryBtnText}>View Dashboard</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.outlineBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Text style={s.outlineBtnText}>New Check-in</Text>
          </Pressable>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  /* Hero */
  hero: {
    paddingHorizontal: Spacing.screenPadding, paddingBottom: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  heroInner: { gap: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6, marginBottom: 8 },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },

  /* Scroll */
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xl },

  /* Section title */
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: C.label,
    letterSpacing: -0.2, marginBottom: Spacing.md,
  },

  /* Pain cards */
  painCard: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.md,
  },
  painCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
  painIcon: { width: 50, height: 50, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  painLabel: { fontSize: 15, fontWeight: '700', color: C.label, marginBottom: 5 },
  riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  riskBadgeText: { fontSize: 11, fontWeight: '700' },
  scoreNum: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  scoreOf: { fontSize: 13, fontWeight: '500', color: C.labelTertiary },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  /* All good */
  allGoodCard: {
    backgroundColor: C.successSoft, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.xl,
  },
  allGoodTitle: { fontSize: 17, fontWeight: '700', color: C.success, marginBottom: 4 },
  allGoodSub: { fontSize: 13, color: C.success, textAlign: 'center' },

  /* Guidance */
  guidanceCard: {
    backgroundColor: C.primarySoft, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.xl,
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 7 },
  tipText: { flex: 1, fontSize: 14, color: C.label, lineHeight: 21 },

  /* Disclaimer */
  disclaimerBox: {
    backgroundColor: C.warningSoft, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.xl,
  },
  disclaimerText: { fontSize: 12, color: C.warning, lineHeight: 18, textAlign: 'center' },

  /* Actions */
  actionsRow: { flexDirection: 'row', gap: 12 },
  primaryBtn: {
    flex: 1, height: 50, borderRadius: Radius.full,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    ...Shadows.sm,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  outlineBtn: {
    flex: 1, height: 50, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: C.primary, justifyContent: 'center', alignItems: 'center',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },
});