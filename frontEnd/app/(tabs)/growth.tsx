import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft, ChevronRight, TrendingUp, CalendarDays,
  BarChart3, Scale, Sparkles, AlertTriangle, CheckCircle2,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

const C = Colors.light;
const API_URL = `${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api`;

/* ── WAZ → friendly status ── */
function getWazStatus(waz: number | null): {
  label: string; emoji: string; sub: string;
  color: string; soft: string;
} {
  if (waz === null) return {
    label: 'No Data Yet',
    emoji: '📊',
    sub: 'Add a measurement to see status',
    color: 'rgba(255,255,255,0.7)',
    soft: 'rgba(255,255,255,0.12)',
  };
  if (waz > -1) return {
    label: 'Growing Well',
    emoji: '🌱',
    sub: 'Your baby is on a healthy track',
    color: '#FFFFFF',
    soft: 'rgba(130,167,136,0.35)',
  };
  if (waz > -2) return {
    label: 'Keep an Eye On It',
    emoji: '👀',
    sub: 'Slightly below average — worth monitoring',
    color: '#FFFFFF',
    soft: 'rgba(230,168,85,0.35)',
  };
  return {
    label: 'Needs Attention',
    emoji: '💛',
    sub: 'Talk to your doctor soon',
    color: '#FFFFFF',
    soft: 'rgba(214,118,118,0.35)',
  };
}

/* ── Risk → friendly ── */
function getRiskConfig(riskLevel: string | null): {
  color: string; soft: string; label: string; sub: string;
} {
  if (!riskLevel) return {
    color: C.labelTertiary, soft: C.border,
    label: 'Not yet calculated',
    sub: 'Keep logging to unlock',
  };
  if (riskLevel === 'Low') return {
    color: C.success, soft: C.successSoft,
    label: 'All looks good',
    sub: 'No concerns right now',
  };
  if (riskLevel === 'Medium') return {
    color: C.warning, soft: C.warningSoft,
    label: 'Worth watching',
    sub: 'Keep logging — our AI is tracking this',
  };
  return {
    color: C.danger, soft: C.dangerSoft,
    label: 'Speak to a doctor',
    sub: 'Something may need medical attention',
  };
}

export default function GrowthScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [infant, setInfant]               = useState<any>(null);
  const [ageDays, setAgeDays]             = useState(0);
  const [logsNeeded, setLogsNeeded]       = useState(7);
  const [aiReady, setAiReady]             = useState(false);
  const [measurements, setMeasurements]   = useState<any[]>([]);
  const [wazScore, setWazScore]           = useState<number | null>(null);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [pageLoading, setPageLoading]     = useState(true);
  const [prediction, setPrediction]       = useState<any>(null);
  const [riskLevel, setRiskLevel]         = useState<string | null>(null);
  const [growthAlert, setGrowthAlert]     = useState<any>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user) { setPageLoading(false); return; }
    setPageLoading(true);
    try {
      const { data: infantData } = await supabase
        .from('infants').select('*').eq('parent_id', user.id).maybeSingle();
      if (!infantData) { setPageLoading(false); return; }
      setInfant(infantData);

      const response = await fetch(`${API_URL}/growth/dashboard/${infantData.id}`);
      if (!response.ok) throw new Error('Backend unavailable');
      const data = await response.json();

      setAgeDays(data.age_days ?? 0);
      setLogsNeeded(data.logs_needed ?? 7);
      setAiReady(data.ai_ready ?? false);
      setMeasurements(data.chart_data ?? []);
      setWazScore(data.current_waz ?? null);
      setPrediction(data.prediction ?? null);
      setRiskLevel(data.risk_level ?? null);
      setGrowthAlert(data.alert?.alert_fired ? data.alert : null);

      const { data: todayLog } = await supabase
        .from('daily_logs').select('id')
        .eq('infant_id', infantData.id)
        .eq('log_date', new Date().toISOString().split('T')[0])
        .maybeSingle();
      setHasLoggedToday(!!todayLog);
    } catch (err) {
      console.log('Dashboard error (backend may be offline):', err);
    } finally {
      setPageLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { fetchDashboard(); }, [fetchDashboard]));

  const wazStatus   = useMemo(() => getWazStatus(wazScore), [wazScore]);
  const riskConfig  = useMemo(() => getRiskConfig(riskLevel), [riskLevel]);
  const latestMeas  = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const ageMonths   = Math.round(ageDays / 30);

  if (pageLoading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

      {/* ── HERO HEADER ── */}
      <LinearGradient
        colors={[C.primary, '#4A8F98']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <SafeAreaView edges={['top']}>
          {/* Top bar */}
          <View style={s.heroTop}>
            <Pressable
              style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.replace('/(tabs)/' as any)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={20} color="rgba(255,255,255,0.9)" strokeWidth={2} />
              <Text style={s.backText}>Back</Text>
            </Pressable>
            <Text style={s.heroScreenTitle}>Growth</Text>
            <Pressable
              style={({ pressed }) => [s.updateBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/(tabs)/update-measurements' as any)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Scale size={16} color="rgba(255,255,255,0.9)" strokeWidth={1.8} />
            </Pressable>
          </View>

          {/* Baby name + age */}
          <Text style={s.heroSub}>
            {infant?.name ?? 'Your Baby'}
            {ageMonths > 0 ? `  ·  ${ageMonths} months old` : ''}
          </Text>

          {/* Status pill */}
          <View style={[s.statusPill, { backgroundColor: wazStatus.soft }]}>
            <Text style={[s.statusPillText, { color: wazStatus.color }]}>
              {wazStatus.emoji}  {wazStatus.label}
            </Text>
          </View>
          <Text style={s.statusSub}>{wazStatus.sub}</Text>

          {/* Stats row */}
          <View style={s.statsRow}>
            <StatItem
              label="Weight"
              value={latestMeas ? `${(latestMeas.weight_g / 1000).toFixed(2)} kg` : '--'}
            />
            <View style={s.statDivider} />
            <StatItem
              label="Height"
              value={latestMeas ? `${latestMeas.height_cm} cm` : '--'}
            />
            <View style={s.statDivider} />
            <StatItem
              label="Measured"
              value={latestMeas
                ? new Date(latestMeas.measured_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                : '--'}
            />
          </View>

          {/* Log today pill */}
          {hasLoggedToday ? (
            <View style={s.loggedPill}>
              <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={s.loggedPillText}>All logged today</Text>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [s.logTodayPill, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/(tabs)/daily-log')}
            >
              <CalendarDays size={14} color={C.primary} strokeWidth={2} />
              <Text style={s.logTodayText}>Log today's data →</Text>
            </Pressable>
          )}
        </SafeAreaView>
      </LinearGradient>

      <View style={s.body}>

        {/* ── GROWTH ALERT ── */}
        {growthAlert && (
          <Animated.View entering={FadeInDown.delay(40).springify()}>
            <View style={s.alertCard}>
              <View style={s.alertTop}>
                <View style={s.alertIconWrap}>
                  <AlertTriangle size={18} color={C.danger} strokeWidth={2} />
                </View>
                <Text style={s.alertTitle}>Growth Alert</Text>
              </View>
              <Text style={s.alertMsg}>{growthAlert.alert_message}</Text>
              {!!growthAlert.recommendation && (
                <View style={s.alertRec}>
                  <Text style={s.alertRecText}>💡 {growthAlert.recommendation}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── AI PROGRESS ── */}
        {!aiReady && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <View style={s.aiCard}>
              <View style={s.aiCardTop}>
                <View>
                  <Text style={s.aiCardTitle}>Building your baby's profile</Text>
                  <Text style={s.aiCardSub}>
                    {logsNeeded === 0
                      ? 'AI is ready — check insights below!'
                      : `Log ${logsNeeded} more day${logsNeeded !== 1 ? 's' : ''} to unlock AI predictions`}
                  </Text>
                </View>
                <Text style={s.aiCardCount}>{7 - logsNeeded} / 7</Text>
              </View>
              <View style={s.dotsRow}>
                {[...Array(7)].map((_, i) => (
                  <View
                    key={i}
                    style={[s.dot, { backgroundColor: i < (7 - logsNeeded) ? C.primary : C.border }]}
                  />
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── THIS WEEK'S OUTLOOK ── */}
        {aiReady && (
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <View style={s.sectionHeader}>
              <Sparkles size={14} color={C.primary} strokeWidth={2} />
              <Text style={s.sectionTitle}>This Week's Outlook</Text>
            </View>
            <View style={s.forecastRow}>
              <View style={[s.forecastCard, { borderLeftColor: C.success }]}>
                <TrendingUp size={18} color={C.success} strokeWidth={1.8} />
                <Text style={s.forecastLabel}>Expected weight gain</Text>
                <Text style={[s.forecastValue, { color: C.success }]}>
                  {prediction?.predicted_weight_change_g
                    ? `+${Math.abs(prediction.predicted_weight_change_g).toFixed(0)}g`
                    : '--'}
                </Text>
                <Text style={s.forecastSub}>over next 7 days</Text>
              </View>
              <View style={[s.forecastCard, { borderLeftColor: C.primary }]}>
                <TrendingUp size={18} color={C.primary} strokeWidth={1.8} />
                <Text style={s.forecastLabel}>Expected height gain</Text>
                <Text style={[s.forecastValue, { color: C.primary }]}>
                  {prediction?.predicted_height_change_cm != null
                    ? `+${prediction.predicted_height_change_cm.toFixed(1)}cm`
                    : '--'}
                </Text>
                <Text style={s.forecastSub}>over next 7 days</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── HEALTH CHECK ── */}
        <Animated.View entering={FadeInDown.delay(aiReady ? 180 : 120).springify()}>
          <Text style={s.sectionTitle}>Health Check</Text>
          <View style={[s.riskCard, { borderLeftColor: riskConfig.color }]}>
            <View style={[s.riskBadge, { backgroundColor: riskConfig.soft, marginBottom: 8 }]}>
              <Text style={[s.riskBadgeText, { color: riskConfig.color }]}>
                {riskConfig.label}
              </Text>
            </View>
            <Text style={s.riskSubText}>{riskConfig.sub}</Text>
            {!riskLevel && (
              <Text style={s.riskEmpty}>
                {infant ? 'Available after your first daily log' : 'Add a baby profile to see this'}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* ── WEIGHT HISTORY ── */}
        <Animated.View entering={FadeInDown.delay(aiReady ? 240 : 180).springify()}>
          <Text style={s.sectionTitle}>Weight History</Text>
          <View style={s.chartCard}>
            <WeightChart measurements={measurements} />
          </View>
        </Animated.View>

        {/* ── ACTIONS ── */}
        <Animated.View entering={FadeInDown.delay(aiReady ? 300 : 240).springify()} style={s.actions}>
          {!hasLoggedToday ? (
            <>
              <Pressable
                style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }]}
                onPress={() => router.push('/(tabs)/daily-log')}
              >
                <Text style={s.primaryBtnText}>Log Today</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.outlineBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push('/(tabs)/update-measurements' as any)}
              >
                <Text style={s.outlineBtnText}>Update Weight</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={({ pressed }) => [s.primaryBtn, { flex: 1 }, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/(tabs)/update-measurements' as any)}
            >
              <Text style={s.primaryBtnText}>Update Weight & Height</Text>
            </Pressable>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(aiReady ? 360 : 300).springify()}>
          <View style={s.menuCard}>
            {aiReady && (
              <Pressable
                style={({ pressed }) => [s.menuRow, pressed && { opacity: 0.7 }]}
                onPress={() => router.push('/(tabs)/growth-insights' as any)}
              >
                <View style={s.menuRowLeft}>
                  <BarChart3 size={16} color={C.primary} strokeWidth={2} />
                  <Text style={s.menuRowText}>Full AI Insights</Text>
                </View>
                <ChevronRight size={16} color={C.labelTertiary} strokeWidth={2} />
              </Pressable>
            )}
            {aiReady && <View style={s.menuDivider} />}
            <Pressable
              style={({ pressed }) => [s.menuRow, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/(tabs)/growth-history' as any)}
            >
              <View style={s.menuRowLeft}>
                <CalendarDays size={16} color={C.labelSecondary} strokeWidth={2} />
                <Text style={[s.menuRowText, { color: C.labelSecondary }]}>All Measurements</Text>
              </View>
              <ChevronRight size={16} color={C.labelTertiary} strokeWidth={2} />
            </Pressable>
          </View>
        </Animated.View>

        <View style={{ height: 48 }} />
      </View>
    </ScrollView>
  );
}

/* ── Sub-components ── */
function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>{value}</Text>
      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function WeightChart({ measurements }: { measurements: any[] }) {
  const chartData = useMemo(() => measurements.slice(-7), [measurements]);

  if (chartData.length < 2) {
    return (
      <View style={s.chartEmpty}>
        <TrendingUp size={32} color={C.border} strokeWidth={1.5} />
        <Text style={s.chartEmptyText}>Add 2+ measurements to see your chart</Text>
        <Text style={s.chartEmptyHint}>Each measurement you log shows up here</Text>
      </View>
    );
  }

  const weights = chartData.map(m => m.weight_g);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const H = 100;

  const points = chartData.map((m, i) => ({
    x: (i / (chartData.length - 1)) * 100,
    y: H - ((m.weight_g - minW) / range) * H,
    weight: m.weight_g,
    date: m.measured_date,
  }));

  const firstW = chartData[0].weight_g;
  const lastW  = chartData[chartData.length - 1].weight_g;
  const diff   = lastW - firstW;

  return (
    <View>
      <View style={{ height: 140, position: 'relative' }}>
        <LineRenderer points={points} height={H} color={C.primary} />
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <React.Fragment key={i}>
              <View style={{
                position: 'absolute',
                left: `${p.x}%` as any,
                top: p.y + 10,
                marginLeft: -5,
                width: isLast ? 12 : 8,
                height: isLast ? 12 : 8,
                borderRadius: 6,
                backgroundColor: isLast ? C.primary : C.primarySoft,
                borderWidth: 2,
                borderColor: isLast ? '#FFFFFF' : C.primary,
                zIndex: 10,
              }} />
              <Text style={{
                position: 'absolute',
                left: `${p.x}%` as any,
                marginLeft: -20,
                top: H + 18,
                width: 40,
                textAlign: 'center',
                fontSize: 9,
                color: C.labelTertiary,
              }}>
                {new Date(p.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </Text>
            </React.Fragment>
          );
        })}
      </View>
      <View style={s.chartDiffRow}>
        <Text style={[s.chartDiff, { color: diff >= 0 ? C.success : C.danger }]}>
          {diff >= 0
            ? `↑ +${diff.toFixed(0)}g gained over this period`
            : `↓ ${Math.abs(diff).toFixed(0)}g lost over this period`}
        </Text>
      </View>
    </View>
  );
}

function LineRenderer({ points, height, color }: any) {
  const [w, setW] = useState(0);
  return (
    <View
      style={{ position: 'absolute', left: 0, right: 0, top: 10, height }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && points.map((p1: any, i: number) => {
        if (i === points.length - 1) return null;
        const p2 = points[i + 1];
        const x1 = (p1.x / 100) * w, y1 = p1.y;
        const x2 = (p2.x / 100) * w, y2 = p2.y;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return (
          <View key={i} style={{
            position: 'absolute',
            left: (x1 + x2) / 2 - len / 2,
            top: (y1 + y2) / 2 - 1.5,
            width: len, height: 2.5,
            backgroundColor: color,
            opacity: 0.75,
            borderRadius: 2,
            transform: [{ rotate: `${angle}deg` }],
          }} />
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },

  /* ── Hero ── */
  hero: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    marginBottom: 16,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6 },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  heroScreenTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  updateBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 16 },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full, marginBottom: 6,
  },
  statusPillText: { fontSize: 15, fontWeight: '700' },
  statusSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 20 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg, paddingVertical: 14, marginBottom: 14,
  },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  logTodayPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 8,
    alignSelf: 'center',
  },
  logTodayText: { fontSize: 13, fontWeight: '700', color: C.primary },
  loggedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(130,167,136,0.3)', borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 8,
    alignSelf: 'center',
    borderWidth: 1, borderColor: 'rgba(130,167,136,0.5)',
  },
  loggedPillText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  /* ── Body ── */
  body: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    color: C.label, letterSpacing: -0.2,
    marginBottom: Spacing.md,
  },

  /* ── Growth Alert ── */
  alertCard: {
    backgroundColor: C.dangerSoft, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.xl,
    borderWidth: 1.5, borderColor: C.danger,
  },
  alertTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  alertIconWrap: {
    width: 32, height: 32, borderRadius: Radius.md,
    backgroundColor: C.card, justifyContent: 'center', alignItems: 'center',
  },
  alertTitle: { fontSize: 15, fontWeight: '800', color: C.danger },
  alertMsg: { fontSize: 13, color: C.label, lineHeight: 20, marginBottom: 10 },
  alertRec: {
    backgroundColor: C.card, borderRadius: Radius.md,
    padding: Spacing.md,
  },
  alertRecText: { fontSize: 13, color: C.labelSecondary, lineHeight: 19 },

  /* ── AI Card ── */
  aiCard: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.xl,
    borderLeftWidth: 3, borderLeftColor: C.primary,
    ...Shadows.sm,
  },
  aiCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  aiCardTitle: { fontSize: 14, fontWeight: '700', color: C.label, marginBottom: 3 },
  aiCardSub: { fontSize: 12, color: C.labelTertiary },
  aiCardCount: { fontSize: 18, fontWeight: '800', color: C.primary },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },

  /* ── Forecast ── */
  forecastRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.xl },
  forecastCard: {
    flex: 1, backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, borderLeftWidth: 3, gap: 4,
    ...Shadows.sm,
  },
  forecastLabel: { fontSize: 11, color: C.labelTertiary, fontWeight: '500', marginTop: 6 },
  forecastValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  forecastSub: { fontSize: 11, color: C.labelTertiary },

  /* ── Risk / Health Check ── */
  riskCard: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, borderLeftWidth: 3,
    marginBottom: Spacing.xl, ...Shadows.sm,
  },
  riskBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, alignSelf: 'flex-start' },
  riskBadgeText: { fontSize: 13, fontWeight: '700' },
  riskSubText: { fontSize: 12, color: C.labelTertiary, marginTop: 2 },
  riskEmpty: { fontSize: 13, color: C.labelTertiary, paddingTop: 8 },

  /* ── Chart ── */
  chartCard: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  chartEmpty: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  chartEmptyText: { fontSize: 14, fontWeight: '600', color: C.labelSecondary, textAlign: 'center' },
  chartEmptyHint: { fontSize: 12, color: C.labelTertiary, textAlign: 'center' },
  chartDiffRow: { paddingTop: 12 },
  chartDiff: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

  /* ── Actions ── */
  actions: { flexDirection: 'row', gap: 12, marginBottom: Spacing.lg },
  primaryBtn: {
    flex: 1, backgroundColor: C.primary,
    borderRadius: Radius.full, paddingVertical: 15,
    alignItems: 'center', ...Shadows.sm,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    flex: 1, borderWidth: 1.5, borderColor: C.primary,
    borderRadius: Radius.full, paddingVertical: 15,
    alignItems: 'center',
  },
  outlineBtnText: { color: C.primary, fontSize: 15, fontWeight: '700' },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  linkBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },

  /* ── Menu Card (bottom links) ── */
  menuCard: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    marginBottom: Spacing.xl, overflow: 'hidden',
    ...Shadows.sm,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 16,
  },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuRowText: { fontSize: 14, fontWeight: '600', color: C.label },
  menuDivider: { height: 1, backgroundColor: C.border, marginHorizontal: Spacing.lg },
});
