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
  const [riskLevel, setRiskLevel] = useState<string | null>(null);
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
        setRiskLevel(data.risk_level ?? null);
        setAlertData(data.alert ?? null);

        console.log('[RISK DEBUG] risk_score from API:', data.risk_score);
        console.log('[RISK DEBUG] risk_level from API:', data.risk_level);
        console.log('[RISK DEBUG] full response:', JSON.stringify(data, null, 2));

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

  const displayRiskLevel = riskLevel ?? 'Unknown';
  const riskColor =
    riskLevel === 'Low' ? '#22C55E' :
      riskLevel === 'Medium' ? '#F59E0B' :
        riskLevel === 'High' ? '#EF4444' :
          '#9CA3AF';

  const riskSoft =
    riskLevel === 'Low' ? '#DCFCE7' :
      riskLevel === 'Medium' ? '#FEF3C7' :
        riskLevel === 'High' ? '#FEE2E2' :
          '#F3F4F6';

  const riskEmoji =
    riskLevel === 'Low' ? '🛡️' :
      riskLevel === 'Medium' ? '⚠️' :
        riskLevel === 'High' ? '🚨' :
          '⏳';

  const riskLabel =
    riskLevel !== null
      ? riskEmoji + ' ' + riskLevel + ' Risk'
      : '⏳ No data yet';

  const riskPct = riskScore != null ? Math.round(riskScore * 100) : null;
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
              {measurements.length > 0 && (
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2, textAlign: 'center' }}>
                  Measured {new Date(measurements[measurements.length - 1].measured_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </Text>
              )}
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
          {riskScore !== null ? (
            <>
              <View style={styles.riskHeader}>
                <Text style={[Typography.headline, { color: riskColor }]}>
                  {riskLabel}
                </Text>
                <Text style={[Typography.title2, { color: riskColor }]}>{riskPct}%</Text>
              </View>
              <View style={[styles.riskProgressBg, { backgroundColor: riskSoft }]}>
                <View style={[styles.riskProgressFill, { backgroundColor: riskColor, width: riskPct !== null ? `${riskPct}%` : '0%' }]} />
              </View>
              <Text style={[Typography.caption1, { color: C.labelTertiary, marginTop: 8 }]}>
                Based on LSTM + Random Forest models
              </Text>
            </>
          ) : (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                {infant ? '⏳ Risk assessment available after first daily log' : 'Register a baby to see risk data'}
              </Text>
            </View>
          )}
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

        {/* ── WEIGHT HISTORY CHART ───────────────────────── */}
        <Text style={[Typography.subheadline, styles.sectionTitle, { color: C.label }]}>Weight History</Text>
        <View style={[styles.chartCard, { backgroundColor: C.card }]}>
          <WeightHistoryLineChart measurements={measurements} primaryColor={C.primary} />
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

function WeightHistoryLineChart({ measurements, primaryColor }: { measurements: any[], primaryColor: string }) {
  const chartData = useMemo(() => measurements.slice(-7), [measurements]);

  if (chartData.length < 2) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Text style={{ fontSize: 36, marginBottom: 8 }}>📈</Text>
        <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
          Add at least 2 measurements to see chart
        </Text>
      </View>
    );
  }

  const weights = chartData.map(m => m.weight_g);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const chartHeight = 120;

  const points = chartData.map((m, i) => {
    const x = (i / (chartData.length - 1)) * 100;
    const y = chartHeight - ((m.weight_g - minW) / range) * chartHeight;
    return { x, y, weight: m.weight_g, date: m.measured_date };
  });

  const firstW = chartData[0].weight_g;
  const lastW = chartData[chartData.length - 1].weight_g;
  const diff = lastW - firstW;

  return (
    <View style={{ width: '100%' }}>
      <View style={{ width: '100%', height: 160, paddingTop: 10, paddingBottom: 30, paddingHorizontal: 8, position: 'relative' }}>
        {/* Draw lines */}
        <LineRenderer points={points} height={chartHeight} color={primaryColor} />

        {/* Draw dots and labels */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <React.Fragment key={i}>
              <View style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: p.y,
                marginLeft: isLast ? -15 : -13, // Adjust for horizontal padding/container width
                marginTop: isLast ? -7 : -5,
                width: isLast ? 14 : 10,
                height: isLast ? 14 : 10,
                borderRadius: isLast ? 7 : 5,
                backgroundColor: primaryColor,
                borderWidth: isLast ? 3 : 2,
                borderColor: 'white',
                zIndex: 10,
                shadowColor: isLast ? primaryColor : 'transparent',
                shadowOpacity: 0.4,
                shadowRadius: 4,
                elevation: isLast ? 4 : 0,
              }} />

              <Text style={{
                position: 'absolute',
                left: `${p.x}%`,
                marginLeft: -28, // Center text
                top: chartHeight + 8,
                width: 40,
                textAlign: 'center',
                fontSize: 9,
                color: '#9CA3AF',
              }}>
                {new Date(p.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </Text>

              {isLast && (
                <Text style={{
                  position: 'absolute',
                  left: `${p.x}%`,
                  marginLeft: 5,
                  top: p.y - 18,
                  fontSize: 11,
                  fontWeight: '700',
                  color: primaryColor,
                }}>
                  {(p.weight / 1000).toFixed(2)}kg
                </Text>
              )}
            </React.Fragment>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{(minW / 1000).toFixed(2)}kg</Text>
        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{(maxW / 1000).toFixed(2)}kg</Text>
      </View>

      <Text style={{
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 6,
        color: diff >= 0 ? '#22C55E' : '#EF4444'
      }}>
        {diff >= 0 ? `↑ +${diff.toFixed(0)}g gained` : `↓ ${Math.abs(diff).toFixed(0)}g lost`}
      </Text>
    </View>
  );
}

function LineRenderer({ points, height, color }: any) {
  const [layoutWidth, setLayoutWidth] = useState(0);

  return (
    <View
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height }}
      onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
    >
      {layoutWidth > 0 && points.map((p1: any, i: number) => {
        if (i === points.length - 1) return null;
        const p2 = points[i + 1];

        const x1 = (p1.x / 100) * layoutWidth;
        const y1 = p1.y;
        const x2 = (p2.x / 100) * layoutWidth;
        const y2 = p2.y;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: midX - length / 2,
              top: midY - 1,
              width: length,
              height: 2,
              backgroundColor: color,
              opacity: 0.7,
              transform: [{ rotate: angle + 'deg' }],
            }}
          />
        );
      })}
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
