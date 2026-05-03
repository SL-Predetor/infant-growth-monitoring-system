import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Pressable, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { getPostpartumHistory, PostpartumHistoryItem } from '@/services/postpartumService';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

const C = Colors.light;

type PainKey = 'perineal' | 'csection' | 'back_pelvic';

const PAIN_META: Record<PainKey, { label: string; emoji: string; color: string; soft: string }> = {
  perineal:   { label: 'Perineal Discomfort',   emoji: '🌸', color: '#E88D72', soft: '#FAE8E4' },
  csection:   { label: 'C-Section Recovery',    emoji: '🩹', color: C.primary, soft: C.primarySoft },
  back_pelvic:{ label: 'Back & Pelvic Support', emoji: '🌿', color: C.success, soft: C.successSoft },
};

export const options = {
  headerShown: false,
};

export default function PostpartumDashboard() {
  const [history, setHistory]   = useState<PostpartumHistoryItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true); setError(null);
      const response = await getPostpartumHistory(100);
      const sorted = [...response].sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return at - bt;
      });
      setHistory(sorted);
    } catch {
      setError('Unable to load dashboard. Check backend and API URL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const latest = useMemo(() => history[history.length - 1], [history]);

  const activePains = useMemo(() => {
    if (!latest?.predictions) return [] as Array<{ key: PainKey; score: number; risk: string }>;
    const keys: PainKey[] = ['perineal', 'csection', 'back_pelvic'];
    return keys
      .map(key => {
        const entry = latest.predictions?.[key];
        return { key, score: Number(entry?.score ?? 0), risk: String(entry?.risk ?? 'LOW') };
      })
      .filter(item => item.score > 0);
  }, [latest]);

  const overallPainTrend = useMemo(() => {
    const points = history
      .map(entry => ({ date: formatDate(entry.created_at), score: getOverallPainScore(entry) }))
      .filter(p => p.score >= 0);
    if (points.length < 2) return { points, status: 'Stable', delta: 0 };
    const first = points[0].score, last = points[points.length - 1].score;
    const delta = first === 0 ? 0 : ((last - first) / first) * 100;
    let status = 'Stable';
    if (delta <= -8) status = 'Improving';
    if (delta >= 8)  status = 'Needs Attention';
    return { points, status, delta };
  }, [history]);

  const sleepFatiguePoints = useMemo(() =>
    history
      .map(entry => ({
        date: formatDate(entry.created_at),
        sleep: parseSleepHours(entry.input?.sleep_hours),
        fatigue: Number(entry.input?.daytime_fatigue_score ?? 0),
      }))
      .filter(p => p.sleep !== null),
    [history]
  );

  const sleepInsight = useMemo(() => {
    if (sleepFatiguePoints.length < 3)
      return 'Add a few more check-ins to unlock personalized sleep insights.';
    const low = sleepFatiguePoints.filter(p => (p.sleep ?? 0) < 5);
    const ok  = sleepFatiguePoints.filter(p => (p.sleep ?? 0) >= 5);
    if (low.length >= 2 && ok.length >= 2) {
      const rise = ok.length === 0 ? 0 :
        ((average(low.map(p => p.fatigue)) - average(ok.map(p => p.fatigue))) / average(ok.map(p => p.fatigue))) * 100;
      return `On lower-sleep days (<5h), fatigue is ${Math.max(0, rise).toFixed(0)}% higher.`;
    }
    return 'Sleep and fatigue are being tracked. Keep logging to reveal stronger patterns.';
  }, [sleepFatiguePoints]);

  const recoverySupportScore = useMemo(() =>
    latest?.input ? calculateRecoverySupportScore(latest.input) : 0,
    [latest]
  );

  const encouragement = useMemo(() => {
    if (!latest) return '🌸 Complete your first check-in to see your personalized recovery dashboard.';
    const hasHighRisk = activePains.some(p => p.risk.toUpperCase() === 'HIGH');
    const avgSleep = average(sleepFatiguePoints.map(p => p.sleep ?? 0));
    if (hasHighRisk) return '❤️ Your body needs extra care right now. Consider consulting your doctor if pain persists.';
    if (avgSleep > 0 && avgSleep < 5) return '😴 Better sleep could significantly reduce fatigue and support healing.';
    if (overallPainTrend.status === 'Improving') return '🌸 Your recovery is progressing well. Keep going, one day at a time.';
    return '💜 You are doing important recovery work. Keep tracking to unlock stronger insights.';
  }, [latest, activePains, sleepFatiguePoints, overallPainTrend.status]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.centeredHint}>Loading your dashboard…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>{error}</Text>
        <Pressable
          style={({ pressed }) => [s.retryBtn, pressed && { opacity: 0.7 }]}
          onPress={loadDashboard}
        >
          <Text style={s.retryBtnText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (!latest) {
    return (
      <View style={s.centered}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🌷</Text>
        <Text style={s.centeredTitle}>No check-ins yet</Text>
        <Text style={s.centeredHint}>Complete your first assessment to begin tracking your recovery.</Text>
        <Pressable
          style={({ pressed }) => [s.retryBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.back()}
        >
          <Text style={s.retryBtnText}>Start Check-in</Text>
        </Pressable>
      </View>
    );
  }

  const trendStatus = overallPainTrend.status;
  const trendBg  = trendStatus === 'Improving' ? C.successSoft : trendStatus === 'Needs Attention' ? C.warningSoft : C.primarySoft;
  const trendFg  = trendStatus === 'Improving' ? C.success     : trendStatus === 'Needs Attention' ? C.warning     : C.primary;
  const trendTxt = trendStatus === 'Improving' ? '📈 Recovery is progressing'
                 : trendStatus === 'Needs Attention' ? '💗 Extra care may be needed'
                 : '✨ Staying steady';

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[C.primary, '#4A8F98']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}
      >
        <SafeAreaView edges={[]} style={s.heroInner}>
          <View style={s.heroTop}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={20} color="rgba(255,255,255,0.9)" strokeWidth={2} />
              <Text style={s.backText}>Back</Text>
            </Pressable>
            <Text style={s.heroTitle}>Recovery Journey</Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.7 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Plus size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            </Pressable>
          </View>
          <Text style={s.heroSub}>
            {history.length} {history.length === 1 ? 'assessment' : 'assessments'} on record ·{' '}
            Week {latest.input?.weeks_since_delivery ?? '?'} postpartum
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Encouragement ── */}
        <View style={s.encourageCard}>
          <Text style={s.encourageText}>{encouragement}</Text>
        </View>

        {/* ── Recovery Overview ── */}
        <Text style={s.sectionTitle}>Current Comfort</Text>
        {activePains.length === 0 ? (
          <View style={[s.card, { alignItems: 'center', paddingVertical: 24 }]}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🌸</Text>
            <Text style={s.cardGoodText}>No active discomfort detected. Keep caring for yourself.</Text>
          </View>
        ) : (
          activePains.map(pain => {
            const cfg = PAIN_META[pain.key];
            const barPct = Math.min(100, (pain.score / 10) * 100);
            return (
              <View key={pain.key} style={[s.card, Shadows.sm]}>
                <View style={s.painRow}>
                  <View style={[s.painIcon, { backgroundColor: cfg.soft }]}>
                    <Text style={{ fontSize: 20 }}>{cfg.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.painLabel}>{cfg.label}</Text>
                    <Text style={[s.painRisk, { color: pain.risk === 'HIGH' ? C.danger : C.warning }]}>
                      {pain.risk === 'HIGH' ? 'Needs attention' : pain.risk === 'MODERATE' ? 'Manageable' : 'Mild'}
                    </Text>
                  </View>
                  <Text style={[s.painScore, { color: cfg.color }]}>{pain.score.toFixed(1)}</Text>
                </View>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${barPct}%` as any, backgroundColor: cfg.color }]} />
                </View>
              </View>
            );
          })
        )}

        {/* ── Trend badge ── */}
        <View style={[s.trendBadge, { backgroundColor: trendBg }]}>
          <Text style={[s.trendText, { color: trendFg }]}>{trendTxt}</Text>
        </View>

        {/* ── Progress Timeline ── */}
        {overallPainTrend.points.length > 1 && (
          <>
            <Text style={s.sectionTitle}>Progress Over Time</Text>
            <View style={[s.card, Shadows.sm]}>
              {overallPainTrend.points.slice(-6).map((point, i) => (
                <TrendRow
                  key={`${point.date}-${i}`}
                  date={point.date}
                  value={point.score}
                  color={C.primary}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Sleep & Fatigue ── */}
        {sleepFatiguePoints.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Sleep & Energy</Text>
            <View style={[s.card, Shadows.sm]}>
              {sleepFatiguePoints.slice(-6).map((p, i) => (
                <View key={`sf-${i}`} style={s.sleepRow}>
                  <Text style={s.sleepDate}>{p.date}</Text>
                  <Text style={s.sleepHrs}>💤 {p.sleep?.toFixed(1)}h</Text>
                  <Text style={s.fatigueScore}>⚡ {p.fatigue}/10</Text>
                </View>
              ))}
              <View style={s.insightBox}>
                <Text style={s.insightText}>{sleepInsight}</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Lifestyle Support Score ── */}
        <Text style={s.sectionTitle}>Lifestyle Support Score</Text>
        <View style={[s.card, Shadows.sm, { alignItems: 'center' }]}>
          <Text style={s.bigScore}>{recoverySupportScore}</Text>
          <Text style={s.bigScoreOf}>out of 100</Text>
          <Text style={s.bigScoreHint}>
            {recoverySupportScore >= 75
              ? '💚 Excellent! You are giving your body what it needs.'
              : recoverySupportScore >= 50
              ? '💛 Good foundation. Small improvements in nutrition and rest can help.'
              : '💙 Your body needs more support. Focus on sleep, hydration, and nourishing meals.'}
          </Text>
        </View>

        {/* ── New check-in CTA ── */}
        <Pressable
          style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.back()}
        >
          <Text style={s.ctaBtnText}>Start a New Check-in</Text>
        </Pressable>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

/* ── Sub-components ── */
function TrendRow({ date, value, color }: { date: string; value: number; color: string }) {
  const pct = Math.max(4, Math.min(100, (value / 10) * 100));
  return (
    <View style={s2.trendItem}>
      <View style={s2.trendHeader}>
        <Text style={s2.trendDate}>{date}</Text>
        <Text style={[s2.trendValue, { color }]}>{value.toFixed(2)}</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/* ── Pure functions ── */
function getOverallPainScore(entry: PostpartumHistoryItem): number {
  const vals = [
    Number(entry.predictions?.perineal?.score ?? 0),
    Number(entry.predictions?.csection?.score ?? 0),
    Number(entry.predictions?.back_pelvic?.score ?? 0),
  ];
  return Number((vals.reduce((s, v) => s + v, 0) / 3).toFixed(2));
}

function parseSleepHours(value?: string): number | null {
  if (!value) return null;
  const n = value.toLowerCase().trim();
  if (n.includes('<3'))  return 2.5;
  if (n.includes('3-5')) return 4;
  if (n.includes('6-8') || n.includes('6-7')) return 7;
  if (n.includes('>8') || n.includes('>7'))   return 9;
  const nums = n.match(/\d+/g);
  if (!nums) return null;
  return nums.length === 1 ? Number(nums[0]) : (Number(nums[0]) + Number(nums[1])) / 2;
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}

function formatDate(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function calculateRecoverySupportScore(input?: PostpartumHistoryItem['input']): number {
  if (!input) return 0;
  const protein  = ({ daily: 25, sometimes: 15, rare: 5  } as any)[(input.protein_intake  || '').toLowerCase()] ?? 10;
  const iron     = ({ daily: 25, occasionally: 15, never: 5 } as any)[(input.iron_intake   || '').toLowerCase()] ?? 10;
  const fluid    = ({ '2-3l': 25, '1-2l': 15, '<1l': 5  } as any)[(input.fluid_intake    || '').toLowerCase()] ?? 10;
  const activity = ({ '>30mins': 25, '15-30mins': 18, '<15mins': 10, none: 4 } as any)[(input.physical_activity || '').toLowerCase()] ?? 10;
  return Math.max(0, Math.min(100, protein + iron + fluid + activity));
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background, padding: 32, gap: 12 },
  centeredTitle: { fontSize: 20, fontWeight: '700', color: C.label, textAlign: 'center' },
  centeredHint: { fontSize: 13, color: C.labelTertiary, textAlign: 'center' },
  errorText: { fontSize: 14, color: C.danger, textAlign: 'center' },
  retryBtn: {
    marginTop: 8, backgroundColor: C.primary,
    borderRadius: Radius.full, paddingHorizontal: 28, paddingVertical: 12,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  /* Hero */
  hero: {
    paddingHorizontal: Spacing.screenPadding, paddingBottom: 20,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  heroInner: { gap: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6 },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  heroTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  addBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  /* Scroll */
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xl },

  /* Encouragement */
  encourageCard: {
    backgroundColor: C.accentSoft, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.xl,
    borderLeftWidth: 3, borderLeftColor: C.accent,
  },
  encourageText: { fontSize: 14, fontWeight: '500', color: C.label, lineHeight: 21 },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: C.label,
    letterSpacing: -0.2, marginBottom: Spacing.md,
  },

  /* Cards */
  card: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.xl,
  },
  cardGoodText: { fontSize: 14, color: C.success, fontWeight: '500', textAlign: 'center' },

  /* Pain row */
  painRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
  painIcon: { width: 46, height: 46, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  painLabel: { fontSize: 14, fontWeight: '700', color: C.label, marginBottom: 2 },
  painRisk: { fontSize: 12, fontWeight: '600' },
  painScore: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },

  /* Trend badge */
  trendBadge: {
    borderRadius: Radius.xl, padding: Spacing.md,
    alignItems: 'center', marginBottom: Spacing.xl,
  },
  trendText: { fontSize: 14, fontWeight: '700' },

  /* Bars */
  barTrack: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  /* Sleep rows */
  sleepRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  sleepDate: { fontSize: 12, color: C.labelTertiary, flex: 1 },
  sleepHrs: { fontSize: 13, fontWeight: '700', color: C.primary },
  fatigueScore: { fontSize: 13, fontWeight: '700', color: C.danger, marginLeft: 12 },
  insightBox: {
    backgroundColor: C.primarySoft, borderRadius: Radius.md,
    padding: Spacing.md, marginTop: Spacing.md,
  },
  insightText: { fontSize: 13, color: C.primary, fontWeight: '500', lineHeight: 19 },

  /* Big score */
  bigScore: { fontSize: 52, fontWeight: '900', color: C.primary, letterSpacing: -2 },
  bigScoreOf: { fontSize: 14, color: C.labelTertiary, fontWeight: '600', marginBottom: 8 },
  bigScoreHint: { fontSize: 13, color: C.labelSecondary, textAlign: 'center', lineHeight: 19 },

  /* CTA */
  ctaBtn: {
    height: 54, borderRadius: Radius.full,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    ...Shadows.sm,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

const s2 = StyleSheet.create({
  trendItem: { marginBottom: 12 },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  trendDate: { fontSize: 12, color: C.labelTertiary },
  trendValue: { fontSize: 13, fontWeight: '700' },
});