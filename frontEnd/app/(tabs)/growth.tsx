import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, {
  Path,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Typography, Spacing, Radius, Shadows, wazColor } from '@/constants/theme';

const API_URL = 'http://localhost:8000/api';
const screenWidth = Dimensions.get('window').width;

// ── Helpers ──────────────────────────────────────────

const wazLabel = (waz: number | null) => {
  if (waz === null) return '';
  if (waz > -1) return '✓ Healthy Growth';
  if (waz > -2) return '⚠ Monitor Closely';
  return '⚠ At Risk — See Doctor';
};

const formatAge = (days: number) => {
  if (days < 30) return `${days} days old`;
  if (days < 365) return `${Math.round(days / 30)} months old`;
  return `${(days / 365).toFixed(1)} years old`;
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

// Smooth curve generator
const controlPoint = (current: number[], previous: number[], next: number[], reverse?: boolean) => {
  const p = previous || current;
  const n = next || current;
  const smoothing = 0.2;
  const o = [n[0] - p[0], n[1] - p[1]];
  const angle = Math.atan2(o[1], o[0]) + (reverse ? Math.PI : 0);
  const length = Math.sqrt(Math.pow(o[0], 2) + Math.pow(o[1], 2)) * smoothing;
  const x = current[0] + Math.cos(angle) * length;
  const y = current[1] + Math.sin(angle) * length;
  return [x, y];
};

const bezierCommand = (point: number[], i: number, a: number[][]) => {
  const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point);
  const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
  return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`;
};

const svgPath = (points: number[][]) => {
  return points.reduce((acc, point, i, a) => i === 0
    ? `M ${point[0]},${point[1]}`
    : `${acc} ${bezierCommand(point, i, a)}`
    , '');
};

export default function GrowthScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const C = Colors[colorScheme];

  // ── State ──────────────────────────────────────────
  const [infant, setInfant] = useState<any>(null);
  const [ageDays, setAgeDays] = useState(0);
  const [logCount, setLogCount] = useState(0);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [latestMeasurement, setLatestMeasurement] = useState<any>(null);
  const [wazScore, setWazScore] = useState<number | null>(null);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [personalBaseline, setPersonalBaseline] = useState<number | null>(null);
  const [baselineAlert, setBaselineAlert] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [aiReady, setAiReady] = useState(false);
  const [logsNeeded, setLogsNeeded] = useState(7);
  const [prediction, setPrediction] = useState<any>(null);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [riskLevel, setRiskLevel] = useState<string>('unknown');
  const [alertData, setAlertData] = useState<any>(null);

  const [baselineExpanded, setBaselineExpanded] = useState(false);

  // ── Data fetch ─────────────────────────────────────
  useEffect(() => {
    const fetchDashboard = async () => {
      if (!user) { setPageLoading(false); return; }
      try {
        // Get infant_id from Supabase
        const { data: infantData } = await supabase
          .from('infants')
          .select('id, name, date_of_birth, gender')
          .eq('parent_id', user.id)
          .maybeSingle();

        if (!infantData) { setPageLoading(false); return; }
        setInfant(infantData);

        // Fetch everything from backend API
        const response = await fetch(
          `${API_URL}/growth/dashboard/${infantData.id}`
        );
        if (!response.ok) throw new Error('Backend unavailable');
        const data = await response.json();

        // Set state from API response
        setAgeDays(data.age_days ?? 0);
        setLogCount(data.log_count ?? 0);
        setLogsNeeded(data.logs_needed ?? 7);
        setAiReady(data.ai_ready ?? false);
        setMeasurements(data.chart_data ?? []);
        setLatestMeasurement(
          data.chart_data?.length > 0
            ? data.chart_data[data.chart_data.length - 1]
            : null
        );
        setWazScore(data.current_waz ?? null);
        setPersonalBaseline(data.personal_baseline ?? null);
        setBaselineAlert(
          data.personal_baseline !== null &&
          data.current_waz !== null &&
          data.current_waz < data.personal_baseline - 0.5
        );
        setPrediction(data.prediction ?? null);
        setRiskScore(data.risk_score ?? null);
        setRiskLevel(data.risk_level ?? 'unknown');
        setAlertData(data.alert ?? null);

        // Check today's log
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: todayLog } = await supabase
          .from('daily_logs')
          .select('id')
          .eq('infant_id', infantData.id)
          .eq('log_date', todayStr)
          .maybeSingle();
        setHasLoggedToday(!!todayLog);

      } catch (err: any) {
        console.error('Dashboard error:', err.message);
      } finally {
        setPageLoading(false);
      }
    };
    fetchDashboard();
  }, [user]);

  // ── Loading ────────────────────────────────────────
  if (pageLoading) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[{ marginTop: 12, color: C.labelTertiary }, Typography.subheadline]}>Loading…</Text>
      </View>
    );
  }

  // ── Chart helpers ──────────────────────────────────
  const chartW = screenWidth - 64; // width minus screen padding (32) and card padding (32)
  const chartH = 180;
  const pad = { top: 20, bottom: 20, left: 10, right: 10 };

  const validMeas = measurements.filter((m) => m.weight_g);
  const weights = validMeas.map((m) => parseFloat(m.weight_g));
  const minW = weights.length > 0 ? Math.min(...weights) * 0.95 : 0;
  const maxW = weights.length > 0 ? Math.max(...weights) * 1.05 : 1;

  const xScale = (i: number) =>
    pad.left +
    (i / Math.max(validMeas.length - 1, 1)) *
    (chartW - pad.left - pad.right);

  const yScale = (w: number) =>
    chartH -
    pad.bottom -
    ((w - minW) / (maxW - minW || 1)) * (chartH - pad.top - pad.bottom);

  const pointsArr = validMeas.map((m, i) => [xScale(i), yScale(parseFloat(m.weight_g))]);
  const curvePath = pointsArr.length > 0 ? svgPath(pointsArr) : '';
  const areaPath = pointsArr.length > 0
    ? `${curvePath} L ${pointsArr[pointsArr.length - 1][0]},${chartH} L ${pointsArr[0][0]},${chartH} Z`
    : '';

  const currentWazColor = wazColor(wazScore, colorScheme);
  const wazBadgeBg = wazScore === null ? C.cardTertiary :
    wazScore > -1 ? C.successSoft :
      wazScore > -2 ? C.warningSoft : C.dangerSoft;

  // ── Render ─────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Platform.OS === 'ios' ? 60 : 40 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={[Typography.title1, { color: C.label }]}>
              {infant?.name || 'Baby'}
            </Text>
            <Text style={[Typography.footnote, { color: C.labelTertiary, marginTop: 2 }]}>
              {formatAge(ageDays)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/edit-profile' as any)}
            style={[styles.settingsBtn, { backgroundColor: C.cardSecondary }]}
          >
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* ── LOG REMINDER ──────────────────────── */}
        {!hasLoggedToday && (
          <TouchableOpacity
            style={[
              styles.logReminder,
              { backgroundColor: C.primarySoft, borderColor: C.primary, marginBottom: 12 }
            ]}
            onPress={() => router.push('/(tabs)/daily-log' as any)}
          >
            <Text style={[Typography.subheadline, { color: C.primary, flex: 1 }]}>
              📋 Log today's feeding and sleep
            </Text>
            <Text style={[Typography.footnote, { color: C.primary, fontWeight: '700' }]}>
              Log Now →
            </Text>
          </TouchableOpacity>
        )}

        {/* ── CRITICAL ALERT ────────────────────── */}
        {alertData?.alert_fired && (
          <TouchableOpacity
            style={[
              styles.logReminder,
              { backgroundColor: C.dangerSoft, borderColor: C.danger, marginBottom: 12, flexDirection: 'column', alignItems: 'stretch' }
            ]}
            onPress={() => {/* Navigate to alert details if exists */ }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={[Typography.headline, { color: C.danger }]}>🚨 Growth Alert</Text>
              <Text style={[Typography.footnote, { color: C.danger }]}>Tap for details →</Text>
            </View>
            <Text style={[Typography.subheadline, { color: C.label }]}>
              {alertData.alert_message}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── HERO WAZ CARD ─────────────────────── */}
        <View
          style={[
            styles.heroCard,
            Shadows.md,
            { backgroundColor: C.card, borderLeftColor: currentWazColor, marginBottom: 12 }
          ]}
        >
          <Text style={[Typography.caption2, { color: C.labelTertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }]}>
            GROWTH STATUS
          </Text>

          {wazScore !== null ? (
            <>
              <Text style={[{ fontSize: 72, fontWeight: '900', color: currentWazColor, textAlign: 'center', marginBottom: 4 }]}>
                {wazScore.toFixed(2)}
              </Text>
              <Text style={[Typography.footnote, { color: C.labelTertiary, textAlign: 'center', marginBottom: 16 }]}>
                Weight-for-Age Z-Score
              </Text>

              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={[styles.statusBadge, { backgroundColor: wazBadgeBg }]}>
                  <Text style={[Typography.callout, { fontWeight: '600', color: currentWazColor }]}>
                    {wazLabel(wazScore)}
                  </Text>
                </View>

                {riskLevel !== 'unknown' && riskLevel !== null && riskLevel !== undefined && (
                  <View style={[
                    styles.statusBadge,
                    {
                      marginTop: 8,
                      backgroundColor: riskLevel === 'High' ? C.dangerSoft : riskLevel === 'Medium' ? C.warningSoft : C.successSoft
                    }
                  ]}>
                    <Text style={[
                      Typography.caption1,
                      {
                        fontWeight: '600',
                        color: riskLevel === 'High' ? C.danger : riskLevel === 'Medium' ? C.warning : C.success
                      }
                    ]}>
                      {riskLevel === 'High' ? '🚨 High Risk' : riskLevel === 'Medium' ? '⚠️ Medium Risk' : '🛡️ Low Risk'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginBottom: 16 }} />

              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={[Typography.display4, { color: C.label }]}>
                    {latestMeasurement?.weight_g ? (parseFloat(latestMeasurement.weight_g) / 1000).toFixed(2) : '-'}
                    <Text style={[Typography.title3, { color: C.labelTertiary }]}> kg</Text>
                  </Text>
                  <Text style={[Typography.caption1, { color: C.labelTertiary, marginTop: 4 }]}>
                    {latestMeasurement ? formatDate(latestMeasurement.measured_date) : ''}
                  </Text>
                </View>

                <View style={{ width: StyleSheet.hairlineWidth, height: 40, backgroundColor: C.separator }} />

                <View style={styles.statCol}>
                  <Text style={[Typography.display4, { color: C.secondary }]}>
                    {latestMeasurement?.height_cm ? latestMeasurement.height_cm : '-'}
                    <Text style={[Typography.title3, { color: C.labelTertiary }]}> cm</Text>
                  </Text>
                  <Text style={[Typography.caption1, { color: C.labelTertiary, marginTop: 4 }]}>
                    {latestMeasurement ? formatDate(latestMeasurement.measured_date) : ''}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>📏</Text>
              <Text style={[Typography.subheadline, { color: C.labelTertiary, marginBottom: 16 }]}>
                No measurements yet
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: C.primarySoft, borderColor: C.primary, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
                onPress={() => router.push('/(tabs)/update-measurements' as any)}
              >
                <Text style={[Typography.caption1, { color: C.primary, fontWeight: '700' }]}>Add First Measurement</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── AI FORECAST ROW ───────────────────── */}
        {aiReady && prediction && (
          <View style={[styles.forecastRow, { marginBottom: 12 }]}>
            <View style={[styles.forecastCard, Shadows.sm, { backgroundColor: C.card, borderLeftColor: C.primary }]}>
              <Text style={[Typography.caption2, { color: C.labelTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }]}>TOMORROW</Text>
              {(() => {
                const wt = prediction.predicted_weight_change_g;
                const trend = wt > 0 ? '↑' : '↓';
                const label = wt > 20 ? 'Good gain' : wt > 10 ? 'Steady gain' : wt > 0 ? 'Slow gain' : 'Monitor closely';
                return (
                  <>
                    <Text style={[Typography.display4, { color: C.primary }]}>{trend} ~{Math.abs(wt).toFixed(1)}g</Text>
                    <Text style={[Typography.caption1, { color: C.labelTertiary, marginTop: 4 }]}>{label}</Text>
                  </>
                );
              })()}
            </View>

            <View style={[styles.forecastCard, Shadows.sm, { backgroundColor: C.card, borderLeftColor: C.secondary }]}>
              <Text style={[Typography.caption2, { color: C.labelTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }]}>TREND</Text>
              {(() => {
                const ht = prediction.predicted_height_change_cm || 0;
                let trendTitle = '';
                let trendSub = '';
                let titleColor = '';

                if (ht >= 0.5) {
                  trendTitle = '↑ Growing';
                  trendSub = 'good height gain';
                  titleColor = C.secondary; // pink
                } else if (ht >= 0.1) {
                  trendTitle = '↑ Steady';
                  trendSub = 'normal height gain';
                  titleColor = C.secondary; // pink
                } else if (ht >= 0.0) {
                  trendTitle = '→ Stable';
                  trendSub = 'height holding steady';
                  titleColor = C.labelTertiary; // grey
                } else {
                  trendTitle = '↓ Check';
                  trendSub = 'monitor height closely';
                  titleColor = C.warning; // orange
                }

                return (
                  <>
                    <Text style={[Typography.display4, { color: titleColor }]}>{trendTitle}</Text>
                    <Text style={[Typography.caption1, { color: C.labelTertiary, marginTop: 4 }]}>{trendSub}</Text>
                  </>
                );
              })()}
            </View>
          </View>
        )}

        {/* ── AI PROGRESS ───────────────────────── */}
        {!aiReady && (
          <View style={[styles.aiProgressCard, Shadows.sm, { backgroundColor: C.card, marginBottom: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginRight: 12 }}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.headline, { color: C.label }]}>AI needs {logsNeeded} more day{logsNeeded !== 1 ? 's' : ''}</Text>
                <Text style={[Typography.footnote, { color: C.labelTertiary, marginTop: 2 }]}>Log daily to activate predictions</Text>
              </View>
            </View>
            <View style={{ height: 4, backgroundColor: C.cardTertiary, borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
              <View style={{ height: 4, backgroundColor: C.primary, width: `${Math.round(((7 - logsNeeded) / 7) * 100)}%` }} />
            </View>
            <Text style={[Typography.caption2, { color: C.labelTertiary, marginTop: 4 }]}>Day {7 - logsNeeded} of 7</Text>
          </View>
        )}

        {/* ── OLD RISK CARD REMOVED ─────────────────────────── */}

        {/* ── WEIGHT CHART ──────────────────────── */}
        <View style={[styles.chartCard, Shadows.sm, { backgroundColor: C.card, marginBottom: 12 }]}>
          <Text style={[Typography.headline, { color: C.label }]}>Weight Progress</Text>
          <Text style={[Typography.caption1, { color: C.labelTertiary, marginBottom: 16 }]}>Last {validMeas.length} measurements</Text>

          {validMeas.length >= 2 ? (
            <Svg width={chartW} height={chartH}>
              <Defs>
                <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={C.primary} stopOpacity={0.18} />
                  <Stop offset="1" stopColor={C.primary} stopOpacity={0.01} />
                </LinearGradient>
              </Defs>

              <Path
                d={areaPath}
                fill="url(#gradient)"
              />
              <Path
                d={curvePath}
                fill="none"
                stroke={C.primary}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Last data point */}
              {pointsArr.length > 0 && (
                <>
                  <Circle
                    cx={pointsArr[pointsArr.length - 1][0]}
                    cy={pointsArr[pointsArr.length - 1][1]}
                    r={5}
                    fill={C.card}
                    stroke={C.primary}
                    strokeWidth={2.5}
                  />
                  <SvgText
                    x={pointsArr[pointsArr.length - 1][0]}
                    y={pointsArr[pointsArr.length - 1][1] - 12}
                    fontSize={11}
                    fill={C.label}
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {(parseFloat(validMeas[validMeas.length - 1].weight_g) / 1000).toFixed(2)}kg
                  </SvgText>
                </>
              )}

              {/* X-axis date labels */}
              <SvgText x={pad.left} y={chartH - 4} fontSize={10} fill={C.labelTertiary}>
                {formatDate(validMeas[0].measured_date)}
              </SvgText>
              <SvgText x={chartW - pad.right} y={chartH - 4} fontSize={10} fill={C.labelTertiary} textAnchor="end">
                {formatDate(validMeas[validMeas.length - 1].measured_date)}
              </SvgText>

            </Svg>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={[Typography.subheadline, { color: C.labelTertiary, marginBottom: 12 }]}>Add 2+ measurements to see chart</Text>
              <TouchableOpacity
                style={{ backgroundColor: C.primarySoft, borderColor: C.primary, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
                onPress={() => router.push('/(tabs)/update-measurements' as any)}
              >
                <Text style={[Typography.caption1, { color: C.primary, fontWeight: '700' }]}>Add Measurement</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── PERSONAL BASELINE ─────────────────── */}
        {personalBaseline !== null && wazScore !== null && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setBaselineExpanded(!baselineExpanded)}
            style={[
              styles.baselineCard,
              Shadows.sm,
              { backgroundColor: C.card, borderColor: baselineAlert ? C.danger : C.success, marginBottom: 12 }
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[Typography.subheadline, { color: C.label }]}>
                👤 Personal baseline:{' '}
                <Text style={{ color: baselineAlert ? C.danger : C.success }}>
                  {baselineAlert ? 'Below Baseline ⚠' : 'On Track ✓'}
                </Text>
              </Text>
              <Text style={{ color: C.labelTertiary }}>{baselineExpanded ? '▲' : '▼'}</Text>
            </View>

            {baselineExpanded && (
              <>
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginVertical: 12 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[Typography.caption1, { color: C.labelTertiary, marginBottom: 4 }]}>Personal Baseline</Text>
                    <Text style={[Typography.headline, { color: C.label }]}>{personalBaseline.toFixed(2)}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[Typography.caption1, { color: C.labelTertiary, marginBottom: 4 }]}>Current WAZ</Text>
                    <Text style={[Typography.headline, { color: currentWazColor }]}>{wazScore.toFixed(2)}</Text>
                  </View>
                </View>
                <Text style={[Typography.footnote, { color: C.labelTertiary, marginTop: 12, textAlign: 'center' }]}>
                  {baselineAlert
                    ? "WAZ has dropped more than 0.5 below your baby's unique growth pattern."
                    : "Growth is consistent with your baby's personal curve."}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* ── QUICK ACTIONS ─────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtnLeft, { backgroundColor: C.primary }]}
            onPress={() => router.push('/(tabs)/daily-log' as any)}
          >
            <Text style={[Typography.callout, { color: '#FFF', fontWeight: '600' }]}>📋 Log Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnRight, Shadows.sm, { backgroundColor: C.card, borderColor: C.primary }]}
            onPress={() => router.push('/(tabs)/update-measurements' as any)}
          >
            <Text style={[Typography.callout, { color: C.primary, fontWeight: '600' }]}>📏 Update Weight</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[{
            width: '100%',
            height: 44,
            borderRadius: 999,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.border,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 12
          }, Shadows.sm]}
          onPress={() => router.push('/(tabs)/growth-history' as any)}
        >
          <Text style={[Typography.callout, { color: C.labelSecondary }]}>📋 View History →</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // overall gap
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12, // Spatial.md ideally but raw for now
    borderWidth: 1,
    borderRadius: 12, // lg roughly
  },
  heroCard: {
    padding: 20,
    borderRadius: 20,
    borderLeftWidth: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  statCol: {
    alignItems: 'center',
  },
  forecastRow: {
    flexDirection: 'row',
    gap: 8,
  },
  forecastCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 3,
  },
  aiProgressCard: {
    padding: 16,
    borderRadius: 16,
  },
  riskCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  chartCard: {
    padding: 16,
    borderRadius: 16,
  },
  baselineCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnLeft: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnRight: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
