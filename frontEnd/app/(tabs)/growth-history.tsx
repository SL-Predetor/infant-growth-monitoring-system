import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { getApiBaseUrl } from '@/lib/api-config';

const C = Colors.light;
const API_URL = `${getApiBaseUrl()}/api`;

type Log = {
  log_date: string;
  sleep_hours: number;
  feed_type: string;
  f_breast_formula: number;
  f_solid_meal: number;
  f_nutritious_snacks: number;
  feeding_frequency: number;
  daily_calorie_intake: number;
  has_illness: boolean;
  illness_type: string | null;
  recovery_day: boolean;
};

export default function GrowthHistoryScreen() {
  const router  = useRouter();
  const { user } = useAuth();

  const [logs, setLogs]     = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);
  const [filter, setFilter] = useState<'All' | 'Healthy' | 'Sick'>('All');

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true); setError(false);
    try {
      const { data: infantData } = await supabase
        .from('infants').select('id').eq('parent_id', user.id).maybeSingle();
      if (!infantData) { setLoading(false); return; }

      const response = await fetch(`${API_URL}/growth/history/${infantData.id}?days=60`);
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();

      const sortedLogs = Array.isArray(data.logs)
        ? data.logs.sort((a: any, b: any) =>
            new Date(b.log_date).getTime() - new Date(a.log_date).getTime())
        : [];
      setLogs(sortedLogs);
    } catch (err) {
      console.error(err); setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [user]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'All')     return true;
    if (filter === 'Healthy') return !log.has_illness && !log.recovery_day;
    if (filter === 'Sick')    return log.has_illness || log.recovery_day;
    return true;
  });

  const avgSleep = logs.length > 0
    ? (logs.reduce((s, l) => s + (l.sleep_hours || 0), 0) / logs.length).toFixed(1)
    : '0';
  const avgFeeds = logs.length > 0
    ? (logs.reduce((s, l) => s + (l.feeding_frequency || 0), 0) / logs.length).toFixed(1)
    : '0';

  return (
    <View style={s.container}>

      {/* ── TEAL HEADER ── */}
      <LinearGradient
        colors={[C.primary, '#4A8F98']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.headerGradient, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}
      >
        <View style={s.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={20} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Growth History</Text>
            <Text style={s.headerSub}>Last 60 days</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>
      </LinearGradient>

      {/* ── BODY ── */}
      {loading ? (
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.centerHint}>Loading history…</Text>
        </View>
      ) : error ? (
        <View style={s.centerContent}>
          <Text style={s.centerTitle}>Could not load history</Text>
          <Text style={s.centerHint}>Check your connection and try again</Text>
          <Pressable
            style={({ pressed }) => [s.retryBtn, pressed && { opacity: 0.7 }]}
            onPress={fetchHistory}
          >
            <Text style={s.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      ) : logs.length === 0 ? (
        <View style={s.centerContent}>
          <Text style={{ fontSize: 56, marginBottom: Spacing.md }}>📋</Text>
          <Text style={s.centerTitle}>No logs yet</Text>
          <Text style={s.centerHint}>Start logging daily to build your history</Text>
          <Pressable
            style={({ pressed }) => [s.logTodayBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/(tabs)/daily-log' as any)}
          >
            <Text style={s.logTodayBtnText}>Log Today</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── SUMMARY ── */}
          <View style={s.summaryRow}>
            <SummaryCard value={String(logs.length)} label="days logged" />
            <SummaryCard value={avgSleep} label="hrs sleep / night" />
            <SummaryCard value={avgFeeds} label="feeds / day" />
          </View>

          {/* ── FILTERS ── */}
          <View style={s.filterRow}>
            {(['All', 'Healthy', 'Sick'] as const).map(f => {
              const active = filter === f;
              return (
                <Pressable
                  key={f}
                  style={[s.filterPill, active && s.filterPillActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[s.filterPillText, active && s.filterPillTextActive]}>{f}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── TIMELINE ── */}
          {filteredLogs.map(log => {
            let badgeBg = C.successSoft, badgeFg = C.success, badgeLabel = '✓ Healthy';
            if (log.recovery_day) {
              badgeBg = C.warningSoft; badgeFg = C.warning; badgeLabel = '↗ Recovery';
            } else if (log.has_illness) {
              badgeBg = C.dangerSoft; badgeFg = C.danger; badgeLabel = '🤒 Sick';
            }
            const d = new Date(log.log_date + 'T00:00:00');
            const hasExtra = log.f_solid_meal > 0 || log.f_nutritious_snacks > 0 || log.illness_type;

            return (
              <View key={log.log_date} style={s.timelineRow}>
                {/* Date column */}
                <View style={s.dateCol}>
                  <Text style={s.dateMonth}>{d.toLocaleDateString('en-US', { month: 'short' })}</Text>
                  <Text style={s.dateDay}>{d.getDate()}</Text>
                  <Text style={s.dateWeekday}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                </View>

                {/* Content card */}
                <View style={s.logCard}>
                  <View style={[s.healthBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[s.healthBadgeText, { color: badgeFg }]}>{badgeLabel}</Text>
                  </View>

                  <View style={s.statsRow}>
                    <LogStat emoji="😴" value={`${log.sleep_hours} hrs`} label="sleep" />
                    <LogStat emoji="🍼" value={`${log.f_breast_formula}×`} label={log.feed_type || 'milk'} />
                    <LogStat emoji="🔥" value={`${log.daily_calorie_intake}`} label="kcal" />
                  </View>

                  {hasExtra && (
                    <View style={s.extraRow}>
                      {log.f_solid_meal > 0 && (
                        <View style={s.extraPill}>
                          <Text style={s.extraPillText}>🥣 {log.f_solid_meal} meals</Text>
                        </View>
                      )}
                      {log.f_nutritious_snacks > 0 && (
                        <View style={s.extraPill}>
                          <Text style={s.extraPillText}>🍎 {log.f_nutritious_snacks} snacks</Text>
                        </View>
                      )}
                      {log.illness_type && (
                        <View style={[s.extraPill, { backgroundColor: C.dangerSoft }]}>
                          <Text style={[s.extraPillText, { color: C.danger }]}>{log.illness_type}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {filteredLogs.length === 0 && (
            <Text style={s.emptyFilter}>No logs match this filter.</Text>
          )}

          <View style={{ height: 48 }} />
        </ScrollView>
      )}
    </View>
  );
}

/* ── Sub-components ── */
function SummaryCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={[s.summaryCard, Shadows.sm]}>
      <Text style={s.summaryValue}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

function LogStat({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={s.logStatItem}>
      <Text style={{ fontSize: 18, marginBottom: 2 }}>{emoji}</Text>
      <Text style={s.logStatValue}>{value}</Text>
      <Text style={s.logStatLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  /* Header */
  headerGradient: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6 },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  /* Center states */
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 8 },
  centerTitle: { fontSize: 18, fontWeight: '700', color: C.label, textAlign: 'center' },
  centerHint: { fontSize: 13, color: C.labelTertiary, textAlign: 'center', marginTop: 4 },
  retryBtn: {
    marginTop: 16, borderWidth: 1.5, borderColor: C.primary,
    borderRadius: Radius.full, paddingHorizontal: 28, paddingVertical: 10,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },
  logTodayBtn: {
    marginTop: 16, backgroundColor: C.primary,
    borderRadius: Radius.full, paddingHorizontal: 28, paddingVertical: 12,
  },
  logTodayBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xl, paddingBottom: 48 },

  /* Summary */
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  summaryCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    backgroundColor: C.card, borderRadius: Radius.xl,
  },
  summaryValue: { fontSize: 20, fontWeight: '800', color: C.primary, letterSpacing: -0.5 },
  summaryLabel: { fontSize: 10, color: C.labelTertiary, marginTop: 3, textAlign: 'center' },

  /* Filters */
  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  filterPill: {
    paddingHorizontal: Spacing.lg, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.cardSecondary,
  },
  filterPillActive: { borderColor: C.primary, backgroundColor: C.primary },
  filterPillText: { fontSize: 13, fontWeight: '500', color: C.labelTertiary },
  filterPillTextActive: { color: '#FFFFFF', fontWeight: '700' },

  /* Timeline */
  timelineRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 10 },
  dateCol: {
    width: 54, borderRadius: Radius.xl,
    backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 12,
  },
  dateMonth: { fontSize: 10, fontWeight: '700', color: C.primary, textTransform: 'uppercase' },
  dateDay: { fontSize: 22, fontWeight: '800', color: C.primary, lineHeight: 26 },
  dateWeekday: { fontSize: 10, color: C.labelTertiary },

  logCard: {
    flex: 1, backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.md, ...Shadows.sm,
  },
  healthBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, marginBottom: Spacing.sm,
  },
  healthBadgeText: { fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  logStatItem: { alignItems: 'center', flex: 1 },
  logStatValue: { fontSize: 13, fontWeight: '700', color: C.label },
  logStatLabel: { fontSize: 10, color: C.labelTertiary, textTransform: 'capitalize', marginTop: 1 },

  extraRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },
  extraPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full, backgroundColor: C.cardSecondary,
  },
  extraPillText: { fontSize: 11, color: C.labelSecondary },

  emptyFilter: { fontSize: 14, color: C.labelTertiary, textAlign: 'center', marginTop: 32 },
});
