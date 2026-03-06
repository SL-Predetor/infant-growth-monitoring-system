import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Typography, wazColor, Shadows } from '@/constants/theme';

const API_URL = 'http://localhost:8000/api';

export default function GrowthScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const C = Colors[colorScheme];

  const [infant, setInfant] = useState<any>(null);
  const [ageDays, setAgeDays] = useState(0);
  const [logsNeeded, setLogsNeeded] = useState(7);
  const [aiReady, setAiReady] = useState(false);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [wazScore, setWazScore] = useState<number | null>(null);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [prediction, setPrediction] = useState<any>(null);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [riskLevel, setRiskLevel] = useState<string>('Low');
  const [alertData, setAlertData] = useState<any>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!user) { setPageLoading(false); return; }
      try {
        const { data: infantData } = await supabase.from('infants').select('*').eq('parent_id', user.id).maybeSingle();
        if (!infantData) { setPageLoading(false); return; }
        setInfant(infantData);

        const response = await fetch(`${API_URL}/growth/dashboard/${infantData.id}`);
        if (!response.ok) throw new Error('Backend error');
        const data = await response.json();

        setAgeDays(data.age_days ?? 0);
        setLogsNeeded(data.logs_needed ?? 7);
        setAiReady(data.ai_ready ?? false);
        setMeasurements(data.chart_data ?? []);
        setWazScore(data.current_waz ?? null);
        setPrediction(data.prediction ?? null);
        setRiskScore(data.risk_score ?? null);
        setRiskLevel(data.risk_level ?? 'Low');
        setAlertData(data.alert ?? null);

        const { data: todayLog } = await supabase.from('daily_logs').select('id').eq('infant_id', infantData.id).eq('log_date', new Date().toISOString().split('T')[0]).maybeSingle();
        setHasLoggedToday(!!todayLog);
      } catch (err) { console.error('Dashboard error:', err); } finally { setPageLoading(false); }
    };
    fetchDashboard();
  }, [user]);

  const wazStatus = useMemo(() => {
    if (wazScore === null) return { label: 'No Data', color: C.labelTertiary, icon: '⚪' };
    if (wazScore > -1) return { label: 'Healthy Growth', color: C.success, icon: '✅' };
    if (wazScore > -2) return { label: 'Monitor Growth', color: C.warning, icon: '⚠️' };
    return { label: 'At Risk', color: C.danger, icon: '🚨' };
  }, [wazScore, C]);

  const riskColor = riskLevel === 'High' ? C.danger : riskLevel === 'Medium' ? C.warning : C.success;
  const riskSoft = riskLevel === 'High' ? C.dangerSoft : riskLevel === 'Medium' ? C.warningSoft : C.successSoft;
  const riskPct = riskScore != null ? Math.round(riskScore * 100) : 15;
  const latestMeas = measurements.length > 0 ? measurements[measurements.length - 1] : null;

  if (pageLoading) return <View style={styles.centeredPage}><ActivityIndicator size="large" color={C.primary} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: '#F0F0FA' }]} showsVerticalScrollIndicator={false}>

      {/* ── HEADER STRIP ──────────────────────────────── */}
      <LinearGradient colors={['#5E5CE6', '#7B79FF']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            <Text style={[Typography.title2, { color: '#FFF', fontWeight: '700' }]}>Growth</Text>
            <TouchableOpacity style={styles.logTodayBtn} onPress={() => router.push('/(tabs)/daily-log')}>
              <Text style={{ fontSize: 13, color: '#FFF', fontWeight: '600' }}>Log Today</Text>
            </TouchableOpacity>
          </View>

          {/* WAZ Hero */}
          <View style={styles.wazHero}>
            <Text style={styles.wazValue}>{wazScore !== null ? wazScore.toFixed(2) : '--'}</Text>
            <Text style={styles.wazTitle}>Weight-for-Age Z-Score</Text>
            <View style={[styles.statusPill, { backgroundColor: '#FFF' }]}>
              <Text style={[Typography.caption1, { color: wazStatus.color, fontWeight: '700' }]}>
                {wazStatus.icon} {wazStatus.label}
              </Text>
            </View>
          </View>

          {/* Baby info */}
          <Text style={[Typography.headline, { color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 10 }]}>
            {infant?.name || 'Baby'}
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {latestMeas ? `${(latestMeas.weight_g / 1000).toFixed(2)}kg` : '--'}
              </Text>
              <Text style={styles.statLabel}>Weight</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {latestMeas ? `${latestMeas.height_cm}cm` : '--'}
              </Text>
              <Text style={styles.statLabel}>Height</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(ageDays / 30)}</Text>
              <Text style={styles.statLabel}>Months</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.content}>

        {/* ── LOG REMINDER BANNER ──────────────────────── */}
        {!hasLoggedToday && (
          <TouchableOpacity
            style={[styles.reminderBanner, { backgroundColor: C.warningSoft, borderColor: C.warning }]}
            onPress={() => router.push('/(tabs)/daily-log')}
          >
            <Text style={{ fontSize: 16 }}>📋</Text>
            <Text style={[Typography.subheadline, { color: C.warning, flex: 1, marginHorizontal: 8 }]}>
              You haven't logged today yet
            </Text>
            <Text style={[Typography.caption1, { color: C.warning, fontWeight: '600' }]}>Log →</Text>
          </TouchableOpacity>
        )}

        {/* ── AI PHASES CARD ────────────────────────────── */}
        <Text style={[Typography.subheadline, styles.sectionTitle, { color: C.label }]}>AI Pipeline</Text>
        <View style={[styles.phasesCard, { backgroundColor: C.card }]}>
          {[
            { e: '🧠', p: 'PHASE 1', l: 'LSTM', s: 'Forecast', c: C.primary },
            { e: '🌲', p: 'PHASE 2', l: 'Risk Forest', s: 'Assessment', c: C.warning },
            { e: '⚙️', p: 'PHASE 3', l: 'Rules', s: 'Alert Logic', c: C.success },
          ].map((ph, idx) => (
            <React.Fragment key={idx}>
              <View style={styles.phaseItem}>
                <Text style={{ fontSize: 22 }}>{ph.e}</Text>
                <Text style={[Typography.caption2, { color: ph.c, fontWeight: '700' }]}>{ph.p}</Text>
                <Text style={[Typography.footnote, { color: C.label, fontWeight: '700' }]}>{ph.l}</Text>
                <Text style={[Typography.caption2, { color: C.labelTertiary, textAlign: 'center' }]}>{ph.s}</Text>
              </View>
              {idx < 2 && <View style={[styles.phaseSep, { backgroundColor: C.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── FORECAST CARDS ROW ────────────────────────── */}
        <Text style={[Typography.subheadline, styles.sectionTitle, { color: C.label }]}>7-Day Forecast</Text>
        <View style={styles.row}>
          <View style={[styles.forecastCard, { backgroundColor: C.card }, Shadows.md]}>
            <Text style={styles.cardEmoji}>⚖️</Text>
            <Text style={[Typography.caption2, { color: C.labelTertiary }]}>Weight Change</Text>
            <Text style={[Typography.title2, { color: C.primary }]}>
              {prediction?.predicted_weight_change_g
                ? `+${Math.abs(prediction.predicted_weight_change_g).toFixed(1)}g`
                : '0.0g'}
            </Text>
            <Text style={[Typography.caption1, { color: C.success, fontWeight: '600' }]}>↑ Gaining</Text>
          </View>
          <View style={[styles.forecastCard, { backgroundColor: C.card }, Shadows.md]}>
            <Text style={styles.cardEmoji}>📏</Text>
            <Text style={[Typography.caption2, { color: C.labelTertiary }]}>Height Change</Text>
            <Text style={[Typography.title2, { color: C.label }]}>
              {prediction?.predicted_height_change_cm != null
                ? `+${prediction.predicted_height_change_cm.toFixed(2)}cm`
                : '→ Stable'}
            </Text>
            <Text style={[Typography.caption1, { color: C.labelTertiary }]}>this week</Text>
          </View>
        </View>

        {/* ── RISK ASSESSMENT CARD ─────────────────────── */}
        <Text style={[Typography.subheadline, styles.sectionTitle, { color: C.label }]}>Risk Assessment</Text>
        <View style={[styles.riskCard, { backgroundColor: C.card, borderLeftColor: riskColor }]}>
          <View style={styles.riskHeader}>
            <Text style={[Typography.headline, { color: riskColor }]}>
              {riskLevel === 'High' ? '🚨 High Risk' : riskLevel === 'Medium' ? '⚠️ Medium Risk' : '🛡️ Low Risk'}
            </Text>
            <Text style={[Typography.title2, { color: riskColor }]}>{riskPct}%</Text>
          </View>
          <View style={[styles.riskProgressBg, { backgroundColor: riskSoft }]}>
            <View style={[styles.riskProgressFill, { backgroundColor: riskColor, width: `${riskPct}%` }]} />
          </View>
          <Text style={[Typography.caption1, { color: C.labelTertiary, marginTop: 8 }]}>
            Based on LSTM + Random Forest models
          </Text>
        </View>

        {/* ── ALERT BANNER ──────────────────────────────── */}
        {alertData?.alert_fired === true && (
          <View style={[styles.alertBanner, { backgroundColor: C.dangerSoft, borderColor: C.danger }]}>
            <Text style={{ fontSize: 20, marginRight: 8 }}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.subheadline, { color: C.danger, fontWeight: '700' }]}>Growth Alert</Text>
              <Text style={[Typography.footnote, { color: C.danger }]}>{alertData.alert_message}</Text>
              {!!alertData.recommendation && (
                <Text style={[Typography.footnote, { color: C.labelSecondary, marginTop: 4 }]}>
                  {alertData.recommendation}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── BAR CHART ──────────────────────────────────── */}
        <Text style={[Typography.subheadline, styles.sectionTitle, { color: C.label }]}>Weight History</Text>
        <View style={[styles.chartCard, { backgroundColor: C.card }]}>
          {measurements.length >= 2 ? (
            <WeightBarChart measurements={measurements} color={C.primary} labelColor={C.labelTertiary} />
          ) : (
            <Text style={[Typography.caption1, { color: C.labelTertiary, textAlign: 'center', paddingVertical: 16 }]}>
              Add more measurements to see your chart
            </Text>
          )}
        </View>

        {/* ── AI TRAINING PROGRESS ─────────────────────── */}
        {!aiReady && (
          <View style={[styles.aiReadyCard, { backgroundColor: C.primarySoft, borderColor: C.primary }]}>
            <View style={styles.rowBetween}>
              <Text style={[Typography.subheadline, { color: C.primary, fontWeight: '700' }]}>🤖 AI Training</Text>
              <Text style={[Typography.caption1, { color: C.primary }]}>Day {7 - logsNeeded}/7</Text>
            </View>
            <View style={styles.dotsRow}>
              {[...Array(7)].map((_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: i < (7 - logsNeeded) ? C.primary : `${C.primary}4D` }]} />
              ))}
            </View>
          </View>
        )}

        {/* ── ACTION BUTTONS ────────────────────────────── */}
        <View style={[styles.row, { marginTop: 24 }]}>
          <TouchableOpacity style={[styles.actionBtnSolid, { backgroundColor: C.primary }]} onPress={() => router.push('/(tabs)/daily-log')}>
            <Text style={[Typography.callout, { color: '#FFF', fontWeight: '700' }]}>📋 Log Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnOutline, { borderColor: C.primary }]} onPress={() => router.push('/(tabs)/update-measurements')}>
            <Text style={[Typography.callout, { color: C.primary, fontWeight: '700' }]}>⚖️ Update Weight</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.push('/(tabs)/growth-history')}>
          <Text style={[Typography.callout, { color: C.primary, textAlign: 'center' }]}>📜 View Full History →</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

function WeightBarChart({ measurements, color, labelColor }: any) {
  const data = measurements.slice(-7);
  const weights = data.map((d: any) => parseFloat(d.weight_g));
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 }}>
        {data.map((item: any, i: number) => {
          const barH = ((parseFloat(item.weight_g) - minW) / range) * 80 + 20;
          const isLast = i === data.length - 1;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <View
                style={{
                  width: '100%',
                  height: barH,
                  backgroundColor: color,
                  borderRadius: 6,
                  opacity: isLast ? 1.0 : 0.55,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 10, color: labelColor }}>
          {new Date(data[0].measured_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
        <Text style={{ fontSize: 10, color: labelColor }}>
          {new Date(data[data.length - 1].measured_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredPage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
  },
  logTodayBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  wazHero: { alignItems: 'center', marginTop: 20 },
  wazValue: { fontSize: 52, fontWeight: '800', color: '#FFF' },
  wazTitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: -4 },
  statusPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginTop: 10 },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 4 },
  content: { paddingHorizontal: 20 },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  sectionTitle: { marginTop: 24, marginBottom: 12, fontWeight: '700' },
  phasesCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  phaseItem: { flex: 1, alignItems: 'center', gap: 3 },
  phaseSep: { width: 1, height: 60, marginHorizontal: 4 },
  row: { flexDirection: 'row', gap: 12 },
  forecastCard: { flex: 1, padding: 16, borderRadius: 20, gap: 4 },
  cardEmoji: { fontSize: 20, marginBottom: 4 },
  riskCard: { padding: 20, borderRadius: 20, borderLeftWidth: 4 },
  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  riskProgressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  riskProgressFill: { height: '100%', borderRadius: 3 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  chartCard: { padding: 16, borderRadius: 20 },
  aiReadyCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  actionBtnSolid: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  actionBtnOutline: { flex: 1, height: 50, borderRadius: 25, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
});
